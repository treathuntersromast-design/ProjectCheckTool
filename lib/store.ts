import fs from "node:fs/promises";
import path from "node:path";

/**
 * JSON データの保存先ディレクトリ。
 * 既定はリポジトリ直下の data/。将来 exe 化でデータ位置を差し替えられるよう
 * PCT_DATA_DIR で上書きできる。
 */
export function dataDir(): string {
  return process.env.PCT_DATA_DIR ?? path.join(process.cwd(), "data");
}

/**
 * data ディレクトリ配下の JSON ファイルを読み込む。
 *
 * fallback を返すのは「ファイルが無い（ENOENT）」か「JSON パースに失敗」した
 * 場合のみ。それ以外の fs エラー（EBUSY 等の一時的失敗）は握りつぶさず rethrow
 * する。握りつぶすと「初回（未生成）」と誤認して seed で既存データを上書きする
 * 経路が生まれ、データ喪失につながるため。
 */
export async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  const filePath = path.join(dataDir(), fileName);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (err) {
    // ファイル未生成のみ fallback。その他の fs エラーは呼び出し元へ伝播。
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      return fallback;
    }
    throw err;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    // JSON 破損は fallback（初回起動相当として扱う）。
    return fallback;
  }
}

/**
 * data ディレクトリ配下に JSON を書き込む。
 * ディレクトリを自動作成し、一時ファイルに書いてから rename することで
 * 書き込み中断による破損を防ぐ。
 */
export async function writeJsonFile(fileName: string, value: unknown): Promise<void> {
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, fileName);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(tmpPath, body, "utf8");
  await fs.rename(tmpPath, filePath);
}

/**
 * ファイル名ごとの直列化用 promise チェーン（プロセス内 mutex）。
 * 同一ファイルへの read-modify-write を直列化し、並行書き込みによる
 * lost update（check-then-act 競合含む）を防ぐ。
 */
const locks = new Map<string, Promise<unknown>>();

/**
 * JSON ファイルの read-modify-write をファイル単位で排他して実行する。
 *
 * mutator は現在値（無ければ fallback）を受け取り、新しい値を返す。
 * 同一 fileName に対する更新は前の更新の完了を待ってから走るため、
 * 409 判定（実行中チェック → 作成）のような check-then-act も mutator 内で
 * 行えば同一ロック内で閉じられる（例外を投げれば書き込みは行われない）。
 *
 * @returns mutator が返した確定後の値
 */
export async function updateJsonFile<T>(
  fileName: string,
  fallback: T,
  mutator: (current: T) => T | Promise<T>,
): Promise<T> {
  const prev = locks.get(fileName) ?? Promise.resolve();
  // 直前の処理の成否に関わらず次を継続する（catch で握って連鎖を切らない）。
  const run = prev.then(
    () => runUpdate(fileName, fallback, mutator),
    () => runUpdate(fileName, fallback, mutator),
  );
  // ロックには「進行中である」ことだけを載せる（値・例外は run 側で解決）。
  locks.set(
    fileName,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

async function runUpdate<T>(
  fileName: string,
  fallback: T,
  mutator: (current: T) => T | Promise<T>,
): Promise<T> {
  const current = await readJsonFile<T>(fileName, fallback);
  const next = await mutator(current);
  await writeJsonFile(fileName, next);
  return next;
}

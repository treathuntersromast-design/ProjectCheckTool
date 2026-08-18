import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import {
  createExecution,
  RunningConflictError,
  updateExecution,
  type Execution,
} from "./executions";
import {
  getRunning,
  registerRunning,
  unregisterRunning,
  type RunningProcess,
} from "./running-registry";
import { resolveManagedRoot, scanProjects } from "./scan";

const execFileAsync = promisify(execFile);

/** script 名として許可する文字。シェル注入を防ぐための厳格なホワイトリスト。 */
const SCRIPT_NAME_RE = /^[A-Za-z0-9:._-]+$/;

/** キャプチャログの上限（文字数）。超過時は末尾を優先して保持する。 */
const LOG_CAP_CHARS = 16_000;
/** logExcerpt に載せるログ末尾の文字数。 */
const EXCERPT_CHARS = 2000;
/** 実行タイムアウト（15 分）。 */
const TIMEOUT_MS = 15 * 60 * 1000;

/** バリデーション失敗を表すエラー（API 側で 400 に対応づける）。 */
export class ValidationError extends Error {}
/** 同一プロジェクト実行中の競合を表すエラー（API 側で 409 に対応づける）。 */
export class ConflictError extends Error {}

/** キャプチャ済みログの現在値を返す（ポーリング用）。実行中でなければ null。 */
export function getLiveLog(id: string): string | null {
  const proc = getRunning(id);
  if (!proc) return null;
  return proc.log.slice(-EXCERPT_CHARS);
}

/** ログを上限内に丸めながら追記する（末尾優先）。 */
function appendCapped(current: string, chunk: string): string {
  const next = current + chunk;
  // 表示用途は末尾のみのため、文字数ベースで簡素に丸める（末尾優先）。
  if (next.length <= LOG_CAP_CHARS) return next;
  return next.slice(-LOG_CAP_CHARS);
}

/**
 * npm script を実際に起動する。
 * - project/script の実在と script 名の安全性を検証する
 * - cwd が managedRoot 配下であることを検証する（パストラバーサル拒否）
 * - 同一プロジェクト実行中の場合は ConflictError
 * - 「実行中」で記録を保存してから spawn し、終了時に記録を更新する
 */
export async function startExecution(
  project: string,
  script: string,
): Promise<Execution> {
  if (typeof project !== "string" || project.trim() === "") {
    throw new ValidationError("プロジェクトは必須です");
  }
  if (typeof script !== "string" || !SCRIPT_NAME_RE.test(script)) {
    throw new ValidationError("script 名が不正です");
  }

  // project は scanProjects() の実在名であること
  const { projects } = await scanProjects();
  const target = projects.find((p) => p.name === project);
  if (!target) {
    throw new ValidationError("存在しないプロジェクトです");
  }
  // script はそのプロジェクトの package.json scripts に定義済みであること
  if (!target.scripts.includes(script)) {
    throw new ValidationError("定義されていない script です");
  }

  // cwd を解決し、managedRoot 配下であることを検証（パストラバーサル拒否）
  const managedRoot = path.resolve(resolveManagedRoot());
  const cwd = path.resolve(managedRoot, project);
  const rel = path.relative(managedRoot, cwd);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new ValidationError("作業ディレクトリが不正です");
  }

  // 「実行中」で記録を保存してから起動する。
  // 同一プロジェクト実行中の 409 判定は createExecution がロック内で行い、
  // 実行中があれば RunningConflictError を投げる（ここで ConflictError へ変換）。
  let execution: Execution;
  try {
    execution = await createExecution({
      project,
      script,
      approver: "オーナー",
    });
  } catch (err) {
    if (err instanceof RunningConflictError) {
      throw new ConflictError(err.message);
    }
    throw err;
  }

  // 記録確定の直後に登録する（この間だけ registry 未登録の窓が空く）。
  const state: RunningProcess = { log: "", pid: undefined };
  registerRunning(execution.id, state);

  const startedAt = Date.now();

  // Windows では npm が .cmd のため shell: true が必要。
  // script 名は SCRIPT_NAME_RE で検証済みのためシェル注入は起こらない。
  const child = spawn("npm", ["run", script], {
    cwd,
    shell: true,
    windowsHide: true,
  });
  state.pid = child.pid;

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    killTree(child.pid);
  }, TIMEOUT_MS);

  const onData = (buf: Buffer) => {
    state.log = appendCapped(state.log, buf.toString("utf8"));
  };
  child.stdout?.on("data", onData);
  child.stderr?.on("data", onData);

  // finalize は複数イベント（close / error）から呼ばれ得るため一度きりにする。
  let finalized = false;

  /**
   * 終了処理。記録の確定（updateExecution）を await してから
   * unregisterRunning する順序にする。逆順だと、確定前に registry から消えた
   * 「実行中」記録を並行ポーリングが孤児と誤認する窓が空くため。
   *
   * @param code 終了コード（起動失敗時は null）
   * @param spawnFailed spawn 自体に失敗した場合 true
   */
  const finalize = async (code: number | null, spawnFailed = false) => {
    if (finalized) return;
    finalized = true;
    clearTimeout(timer);
    const durationSec = Math.round((Date.now() - startedAt) / 1000);
    const success = !timedOut && !spawnFailed && code === 0;
    const tail = state.log.slice(-EXCERPT_CHARS);
    const logExcerpt = spawnFailed
      ? `${tail}\n[プロセスの起動に失敗しました]`
      : timedOut
        ? `${tail}\n[タイムアウト（15分）により強制終了しました]`
        : tail;
    await updateExecution(execution.id, {
      status: success ? "成功" : "失敗",
      exitCode: code,
      durationSec,
      logExcerpt,
    });
    unregisterRunning(execution.id);
  };

  // 起動自体に失敗（npm が見つからない等）。終了処理は finalize に一本化する。
  child.on("error", () => {
    void finalize(null, true);
  });

  child.on("close", (code) => {
    void finalize(code);
  });

  return execution;
}

/**
 * プロセスツリーを強制終了する。
 * Windows は子プロセス（npm -> node）まで巻き込むため taskkill /T /F を使う。
 */
function killTree(pid: number | undefined): void {
  if (pid === undefined) return;
  if (process.platform === "win32") {
    void execFileAsync("taskkill", ["/pid", String(pid), "/T", "/F"], {
      windowsHide: true,
    }).catch(() => {
      // 既に終了済みなどは無視
    });
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // 既に終了済みは無視
      }
    }
  }
}

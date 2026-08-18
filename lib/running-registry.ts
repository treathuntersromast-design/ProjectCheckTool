/**
 * 実行中プロセスのレジストリ（id -> 実行状態）。
 *
 * executor.ts（プロセス起動側）と executions.ts（記録読み取り側）の双方から
 * 参照するため、循環 import を避けて独立モジュールに切り出している。
 * ここが「今このプロセスで実行中の id」の唯一の情報源。
 */

/** レジストリに保持する実行中プロセスの状態。 */
export interface RunningProcess {
  /** 結合キャプチャ済みログ（上限内に丸め済み） */
  log: string;
  /** 起動プロセスの pid（taskkill 用） */
  pid: number | undefined;
}

/** 実行中プロセスをモジュールスコープで管理する（id -> 実行状態）。 */
const running = new Map<string, RunningProcess>();

/** 実行中として登録する。 */
export function registerRunning(id: string, state: RunningProcess): void {
  running.set(id, state);
}

/** 実行中プロセスの状態を取得する（未登録なら undefined）。 */
export function getRunning(id: string): RunningProcess | undefined {
  return running.get(id);
}

/** 登録を解除する（プロセス終了時）。 */
export function unregisterRunning(id: string): void {
  running.delete(id);
}

/**
 * 指定 id が「このプロセスで実際に実行中か」を返す。
 * DB 上の status が「実行中」でも、ここに無ければサーバー再起動などで
 * 孤児化した記録とみなせる。
 */
export function isRunning(id: string): boolean {
  return running.has(id);
}

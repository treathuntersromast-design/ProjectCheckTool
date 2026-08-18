import type { ExecStatus } from "./mock/types";
import { isRunning } from "./running-registry";
import { readJsonFile, updateJsonFile } from "./store";

/** アクション実行記録の実データ型。E-NNN で採番される監査ログ 1 行。 */
export interface Execution {
  /** 実行 ID（E-NNN ゼロ埋め 3 桁） */
  id: string;
  /** 実行開始日時（YYYY-MM-DD HH:mm ローカルタイム） */
  executedAt: string;
  /** 対象プロジェクトのフォルダ名 */
  project: string;
  /** 実行した npm script 名 */
  script: string;
  /** 実行状態 */
  status: ExecStatus;
  /** 終了コード（実行中は null） */
  exitCode: number | null;
  /** 所要時間（秒。実行中は null） */
  durationSec: number | null;
  /** 承認者（UI の承認チェックが承認行為。常に「オーナー」） */
  approver: string | null;
  /** ログ末尾の抜粋（末尾 2000 文字） */
  logExcerpt?: string;
}

interface ExecutionsFile {
  executions: Execution[];
}

const FILE_NAME = "executions.json";
const EMPTY: ExecutionsFile = { executions: [] };

/** 同一プロジェクトが既に実行中の競合を表すエラー（API 側で 409 に対応づける）。 */
export class RunningConflictError extends Error {}

/** 現在日時を YYYY-MM-DD HH:mm で返す（ローカルタイム）。 */
export function nowStamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

/** サーバー再起動で孤児化した記録の logExcerpt に付ける中断理由。 */
const INTERRUPTED_NOTE = "（サーバー再起動により中断）";

/**
 * プロセス起動後、孤児復旧をまだ実行していないことを示すフラグ。
 * 孤児化はサーバー（プロセス）再起動をまたいだ場合しか生じないため、
 * 復旧はプロセス起動後の初回 1 回だけで足りる。毎回の getExecutions で
 * 走らせると、createExecution 直後〜registerRunning 前の正常な新規実行を
 * 並行ポーリングが「失敗」化する競合が生じるため、初回限定にする。
 */
let orphanRecoveryDone = false;

/**
 * 「実行中」のまま孤児化した記録を「失敗」に確定して返す。
 * 変更があった場合のみ true を返す。
 */
function recoverOrphans(executions: Execution[]): boolean {
  let changed = false;
  for (const e of executions) {
    if (e.status === "実行中" && !isRunning(e.id)) {
      e.status = "失敗";
      const base = e.logExcerpt ?? "";
      e.logExcerpt = base === "" ? INTERRUPTED_NOTE : `${base}\n${INTERRUPTED_NOTE}`;
      changed = true;
    }
  }
  return changed;
}

/**
 * プロセス起動後の初回だけ孤児復旧を実行する。
 * ロック内で読み込み→復旧→保存を直列化して競合を避ける。
 */
async function recoverOrphansOnce(): Promise<void> {
  if (orphanRecoveryDone) return;
  orphanRecoveryDone = true;
  await updateJsonFile<ExecutionsFile>(FILE_NAME, EMPTY, (current) => {
    const executions = Array.isArray(current.executions) ? current.executions : [];
    recoverOrphans(executions);
    return { executions };
  });
}

/**
 * 全実行記録を取得する。
 * seed は行わない（実履歴のみ）。ファイル未生成時は空配列を返す。
 * プロセス起動後の初回のみ、孤児化した「実行中」記録を「失敗」へ確定する。
 */
export async function getExecutions(): Promise<Execution[]> {
  await recoverOrphansOnce();
  const file = await readJsonFile<ExecutionsFile | null>(FILE_NAME, null);
  if (file && Array.isArray(file.executions)) {
    return file.executions;
  }
  return [];
}

/** 単体を取得する。存在しない id は null。 */
export async function getExecution(id: string): Promise<Execution | null> {
  const executions = await getExecutions();
  return executions.find((e) => e.id === id) ?? null;
}

/** 既存の E-NNN の最大値 +1 を 3 桁ゼロ埋めで採番する。 */
function nextExecutionId(executions: Execution[]): string {
  let max = 0;
  for (const e of executions) {
    const m = /^E-(\d+)$/.exec(e.id);
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `E-${String(max + 1).padStart(3, "0")}`;
}

export interface CreateExecutionInput {
  project: string;
  script: string;
  approver: string;
}

/**
 * 実行記録を「実行中」で新規作成し、採番した Execution を返す。
 *
 * 「同一プロジェクトが実行中なら拒否」の 409 判定（check-then-act）を
 * 同一ロック内で行い、競合を閉じる。実行中があれば RunningConflictError を投げる
 * （このとき書き込みは行われない）。実際のプロセス起動は executor 側が担う。
 */
export async function createExecution(
  input: CreateExecutionInput,
): Promise<Execution> {
  // 復旧を先に済ませて、孤児化した「実行中」で誤って 409 にしないようにする。
  await recoverOrphansOnce();
  let created: Execution | null = null;
  await updateJsonFile<ExecutionsFile>(FILE_NAME, EMPTY, (current) => {
    const executions = Array.isArray(current.executions) ? current.executions : [];
    // check-then-act をロック内で閉じる
    const running = executions.some(
      (e) => e.project === input.project && e.status === "実行中",
    );
    if (running) {
      throw new RunningConflictError("このプロジェクトは既に実行中です");
    }
    const execution: Execution = {
      id: nextExecutionId(executions),
      executedAt: nowStamp(),
      project: input.project,
      script: input.script,
      status: "実行中",
      exitCode: null,
      durationSec: null,
      approver: input.approver,
      logExcerpt: "",
    };
    created = execution;
    return { executions: [execution, ...executions] };
  });
  // updateJsonFile が正常終了した時点で created は必ず設定済み。
  return created as unknown as Execution;
}

export interface UpdateExecutionPatch {
  status?: ExecStatus;
  exitCode?: number | null;
  durationSec?: number | null;
  logExcerpt?: string;
}

/**
 * 実行記録を部分更新する。存在しない id は null を返す。
 * executedAt/project/script/approver は不変。
 */
export async function updateExecution(
  id: string,
  patch: UpdateExecutionPatch,
): Promise<Execution | null> {
  let updated: Execution | null = null;
  await updateJsonFile<ExecutionsFile>(FILE_NAME, EMPTY, (current) => {
    const executions = Array.isArray(current.executions) ? current.executions : [];
    const index = executions.findIndex((e) => e.id === id);
    if (index === -1) {
      return { executions };
    }
    const next = [...executions];
    next[index] = { ...executions[index], ...patch, id };
    updated = next[index];
    return { executions: next };
  });
  return updated;
}

/** 指定プロジェクトに「実行中」の記録があるか。 */
export async function hasRunningExecution(project: string): Promise<boolean> {
  const executions = await getExecutions();
  return executions.some(
    (e) => e.project === project && e.status === "実行中",
  );
}

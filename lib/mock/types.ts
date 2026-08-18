export type TaskStatus = "未着手" | "進行中" | "完了" | "ブロック";
export type TaskPriority = "高" | "中" | "低";
export type TaskCategory = "衛生" | "停滞" | "規約" | "機能" | "セキュリティ";

export interface MockTask {
  id: string;
  /** フォルダ名。プロジェクト横断のタスクは「（横断）」 */
  project: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  /** 外部プロジェクトの採番（例: Cralia:FT-048） */
  externalRef: string | null;
  assignee: string;
  updatedAt: string;
}

export type ExecStatus = "成功" | "失敗" | "実行中" | "却下";

export interface MockExecution {
  id: string;
  executedAt: string;
  project: string;
  script: string;
  status: ExecStatus;
  exitCode: number | null;
  durationSec: number | null;
  approver: string | null;
  logExcerpt?: string;
}

export type PreflightState = "pass" | "warn" | "fail" | "skip";

export interface PreflightItem {
  label: string;
  state: PreflightState;
  note?: string;
}

export interface MockRelease {
  id: string;
  releasedAt: string;
  project: string;
  fromBranch: string;
  toBranch: string;
  commitCount: number;
  result: "成功" | "承認待ち" | "失敗";
  actor: string;
}

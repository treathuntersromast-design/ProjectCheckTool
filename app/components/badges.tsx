import type {
  ExecStatus,
  PreflightState,
  TaskPriority,
  TaskStatus,
} from "@/lib/mock/types";

const BADGE_BASE =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";

const TASK_STATUS_CLASSES: Record<TaskStatus, string> = {
  未着手: "bg-gray-100 text-gray-600",
  進行中: "bg-blue-50 text-blue-700",
  完了: "bg-emerald-50 text-emerald-700",
  ブロック: "bg-red-50 text-red-700",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`${BADGE_BASE} ${TASK_STATUS_CLASSES[status]}`}>
      {status}
    </span>
  );
}

const EXEC_STATUS_CLASSES: Record<ExecStatus, string> = {
  成功: "bg-emerald-50 text-emerald-700",
  失敗: "bg-red-50 text-red-700",
  実行中: "bg-blue-50 text-blue-700",
  却下: "bg-gray-100 text-gray-500",
};

export function ExecStatusBadge({ status }: { status: ExecStatus }) {
  return (
    <span className={`${BADGE_BASE} ${EXEC_STATUS_CLASSES[status]}`}>
      {status === "実行中" && (
        <span className="size-1.5 rounded-full bg-blue-500 animate-pulse motion-reduce:animate-none" />
      )}
      {status}
    </span>
  );
}

const PRIORITY_CLASSES: Record<TaskPriority, { dot: string; text: string }> = {
  高: { dot: "bg-red-500", text: "text-red-700" },
  中: { dot: "bg-amber-500", text: "text-amber-700" },
  低: { dot: "bg-gray-300", text: "text-gray-500" },
};

export function PriorityLabel({ priority }: { priority: TaskPriority }) {
  const cls = PRIORITY_CLASSES[priority];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${cls.text}`}>
      <span className={`size-2 rounded-full ${cls.dot}`} />
      {priority}
    </span>
  );
}

const PREFLIGHT_STYLES: Record<
  PreflightState,
  { label: string; className: string }
> = {
  pass: { label: "OK", className: "bg-emerald-50 text-emerald-700" },
  warn: { label: "要確認", className: "bg-amber-50 text-amber-700" },
  fail: { label: "NG", className: "bg-red-50 text-red-700" },
  skip: { label: "スキップ", className: "bg-gray-100 text-gray-500" },
};

export function PreflightBadge({ state }: { state: PreflightState }) {
  const style = PREFLIGHT_STYLES[state];
  return (
    <span className={`${BADGE_BASE} ${style.className}`}>{style.label}</span>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "@/lib/mock/types";
import type { Task } from "@/lib/tasks";
import { PriorityLabel } from "../components/badges";
import { PageHeader } from "../components/page-header";

const STATUS_FILTERS: Array<TaskStatus | "すべて"> = [
  "すべて",
  "未着手",
  "進行中",
  "ブロック",
  "完了",
];

const STATUS_OPTIONS: TaskStatus[] = ["未着手", "進行中", "ブロック", "完了"];
const CATEGORY_OPTIONS: TaskCategory[] = [
  "衛生",
  "停滞",
  "規約",
  "機能",
  "セキュリティ",
];
const PRIORITY_OPTIONS: TaskPriority[] = ["高", "中", "低"];

/** 状態ごとの select 配色（既存バッジ体系に合わせる）。 */
const STATUS_SELECT_CLASSES: Record<TaskStatus, string> = {
  未着手: "bg-gray-100 text-gray-600 border-gray-200",
  進行中: "bg-blue-50 text-blue-700 border-blue-200",
  完了: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ブロック: "bg-red-50 text-red-700 border-red-200",
};

const CROSS_PROJECT = "（横断）";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectFilter, setProjectFilter] = useState("すべて");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "すべて">("すべて");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "すべて">("すべて");

  const [modalOpen, setModalOpen] = useState(false);

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { tasks: Task[] };
      setTasks(data.tasks);
    } catch {
      setError("タスクの取得に失敗しました。時間をおいて再読み込みしてください。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  const projectOptions = useMemo(
    () => ["すべて", ...Array.from(new Set(tasks.map((t) => t.project)))],
    [tasks],
  );

  const filtered = tasks.filter(
    (t) =>
      (projectFilter === "すべて" || t.project === projectFilter) &&
      (statusFilter === "すべて" || t.status === statusFilter) &&
      (priorityFilter === "すべて" || t.priority === priorityFilter),
  );

  const counts = {
    未着手: tasks.filter((t) => t.status === "未着手").length,
    進行中: tasks.filter((t) => t.status === "進行中").length,
    ブロック: tasks.filter((t) => t.status === "ブロック").length,
    完了: tasks.filter((t) => t.status === "完了").length,
    高優先度: tasks.filter((t) => t.priority === "高" && t.status !== "完了").length,
  };

  async function handleStatusChange(id: string, status: TaskStatus) {
    // 楽観的更新: 先に画面へ反映し、失敗時は再取得で戻す
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { task: Task };
      setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
    } catch {
      setError("状態の更新に失敗しました。再読み込みします。");
      void loadTasks();
    }
  }

  return (
    <div>
      <PageHeader
        title="課題・進捗"
        description="プロジェクト横断の課題・タスクを一元管理します（F4）。"
        action={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            新規タスク
          </button>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        {(Object.entries(counts) as Array<[string, number]>).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterSelect
          label="プロジェクト"
          value={projectFilter}
          options={projectOptions}
          onChange={setProjectFilter}
        />
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${
                statusFilter === status
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <FilterSelect
          label="優先度"
          value={priorityFilter}
          options={["すべて", "高", "中", "低"]}
          onChange={(value) => setPriorityFilter(value as TaskPriority | "すべて")}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">ID</th>
                <th scope="col" className="px-4 py-2.5 font-medium">タイトル</th>
                <th scope="col" className="px-4 py-2.5 font-medium">プロジェクト</th>
                <th scope="col" className="px-4 py-2.5 font-medium">種別</th>
                <th scope="col" className="px-4 py-2.5 font-medium">優先度</th>
                <th scope="col" className="px-4 py-2.5 font-medium">状態</th>
                <th scope="col" className="px-4 py-2.5 font-medium">連携ID</th>
                <th scope="col" className="px-4 py-2.5 font-medium">更新日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{task.id}</td>
                  <td className="px-4 py-3">{task.title}</td>
                  <td className="px-4 py-3 text-xs">{task.project}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{task.category}</td>
                  <td className="px-4 py-3"><PriorityLabel priority={task.priority} /></td>
                  <td className="px-4 py-3">
                    <StatusSelect
                      value={task.status}
                      onChange={(status) => handleStatusChange(task.id, status)}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {task.externalRef ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{task.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="border-t border-gray-100 p-10 text-center">
            <p className="text-sm text-gray-500">読み込み中…</p>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="border-t border-dashed border-gray-300 p-10 text-center">
            <p className="text-sm font-medium text-gray-900">該当するタスクがありません</p>
            <p className="mt-1 text-xs text-gray-500">フィルタ条件を変更してください。</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <NewTaskModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            void loadTasks();
          }}
        />
      )}
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      aria-label="状態を変更"
      className={`rounded-full border px-2 py-0.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${STATUS_SELECT_CLASSES[value]}`}
    >
      {STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function NewTaskModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(CROSS_PROJECT);
  const [category, setCategory] = useState<TaskCategory>("機能");
  const [priority, setPriority] = useState<TaskPriority>("中");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/projects", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { names: [] }))
      .then((data: { names?: string[] }) => {
        if (active) setProjectNames(data.names ?? []);
      })
      .catch(() => {
        if (active) setProjectNames([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // 実プロジェクト名＋「（横断）」
  const projectSelectOptions = useMemo(
    () => [...projectNames, CROSS_PROJECT],
    [projectNames],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("タイトルを入力してください。");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          project,
          category,
          priority,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      onCreated();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "タスクの作成に失敗しました。",
      );
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="新規タスク"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">新規タスク</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="task-title" className="mb-1 block text-xs font-medium text-gray-600">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
            />
          </div>

          <div>
            <label htmlFor="task-project" className="mb-1 block text-xs font-medium text-gray-600">
              プロジェクト
            </label>
            <select
              id="task-project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
            >
              {projectSelectOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-category" className="mb-1 block text-xs font-medium text-gray-600">
                種別
              </label>
              <select
                id="task-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-priority" className="mb-1 block text-xs font-medium text-gray-600">
                優先度
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-600">{formError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
            >
              {submitting ? "作成中…" : "作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

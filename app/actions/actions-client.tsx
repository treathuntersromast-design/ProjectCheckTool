"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Execution } from "@/lib/executions";
import { ExecStatusBadge } from "../components/badges";
import { PageHeader } from "../components/page-header";

interface RunnableProject {
  name: string;
  scripts: string[];
}

export function ActionsClient({ projects }: { projects: RunnableProject[] }) {
  const [selectedName, setSelectedName] = useState(projects[0]?.name ?? "");
  const [modalScript, setModalScript] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  /** 実行を開始した記録（結果ビューの対象）。null の間は dry-run/承認ビュー。 */
  const [current, setCurrent] = useState<Execution | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [executions, setExecutions] = useState<Execution[]>([]);

  const selected =
    projects.find((p) => p.name === selectedName) ?? projects[0];

  const running = executions.some((e) => e.status === "実行中");

  const loadExecutions = useCallback(async () => {
    try {
      const res = await fetch("/api/executions", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { executions: Execution[] };
      setExecutions(data.executions);
    } catch {
      // 一時的な取得失敗は無視（次のポーリングで回復）
    }
  }, []);

  // 初回ロード
  useEffect(() => {
    void loadExecutions();
  }, [loadExecutions]);

  // 実行中の行がある間は履歴を 3 秒間隔で自動更新
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      void loadExecutions();
    }, 3000);
    return () => clearInterval(timer);
  }, [running, loadExecutions]);

  const openModal = (script: string) => {
    setModalScript(script);
    setApproved(false);
    setCurrent(null);
    setStarting(false);
    setStartError(null);
  };

  const closeModal = () => {
    setModalScript(null);
    setCurrent(null);
    setStartError(null);
  };

  const runNow = async () => {
    if (!selected || !modalScript) return;
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch("/api/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: selected.name, script: modalScript }),
      });
      const data = (await res.json()) as {
        execution?: Execution;
        error?: string;
      };
      if (!res.ok || !data.execution) {
        setStartError(data.error ?? "実行の開始に失敗しました");
        return;
      }
      setCurrent(data.execution);
      void loadExecutions();
    } catch {
      setStartError("実行の開始に失敗しました（通信エラー）");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="アクション実行"
        description="package.json に定義済みの npm scripts のみを、dry-run → 承認 → 実行 の 3 段階で実行します（F5）。実行は E-NNN で監査ログに記録されます。"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="px-2 pt-1 pb-2 text-xs font-medium text-gray-500">
            プロジェクト（scripts あり）
          </p>
          <div className="space-y-0.5">
            {projects.map((project) => (
              <button
                key={project.name}
                type="button"
                onClick={() => setSelectedName(project.name)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${
                  project.name === selectedName
                    ? "bg-gray-900 font-medium text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="truncate">{project.name}</span>
                <span
                  className={`text-xs ${project.name === selectedName ? "text-gray-300" : "text-gray-400"}`}
                >
                  {project.scripts.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {selected.scripts.map((script) => (
                <div
                  key={script}
                  className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <p className="font-mono text-sm font-medium">{script}</p>
                  <p className="font-mono text-xs text-gray-500">
                    npm run {script}
                  </p>
                  <p className="truncate font-mono text-[11px] text-gray-400">
                    実行対象: ../{selected.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => openModal(script)}
                    className="mt-1 self-start rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                  >
                    実行…
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
              <p className="text-sm font-medium text-gray-900">
                実行可能なプロジェクトがありません
              </p>
            </div>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold">実行履歴</h2>
        {executions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">実行履歴はまだありません</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">ID</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">日時</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">プロジェクト</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">script</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">状態</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">exit</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">所要</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">承認者</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {executions.map((exec) => (
                    <ExecutionRows key={exec.id} exec={exec} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {modalScript && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center gap-2">
              <StepCircle index={1} label="dry-run" state="done" />
              <span className="h-px flex-1 bg-gray-200" />
              <StepCircle
                index={2}
                label="承認"
                state={approved ? "done" : "current"}
              />
              <span className="h-px flex-1 bg-gray-200" />
              <StepCircle
                index={3}
                label="実行"
                state={current ? "done" : approved ? "current" : "todo"}
              />
            </div>

            {!current ? (
              <>
                <h2 className="text-base font-semibold">
                  実行内容の確認（dry-run）
                </h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex gap-3">
                    <dt className="w-32 shrink-0 text-xs text-gray-500">コマンド</dt>
                    <dd className="font-mono text-xs">npm run {modalScript}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-32 shrink-0 text-xs text-gray-500">作業ディレクトリ</dt>
                    <dd className="font-mono text-xs">../{selected.name}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-32 shrink-0 text-xs text-gray-500">監査ログ</dt>
                    <dd className="text-xs text-gray-600">
                      実行は E-NNN で採番され監査ログに記録されます
                    </dd>
                  </div>
                </dl>
                <label className="mt-4 flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={approved}
                    onChange={(e) => setApproved(e.target.checked)}
                    className="mt-0.5"
                  />
                  内容を確認し、実行を承認します
                </label>
                {startError && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {startError}
                  </p>
                )}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    disabled={!approved || starting}
                    onClick={runNow}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    {starting ? "起動中…" : "実行する"}
                  </button>
                </div>
              </>
            ) : (
              <ResultView
                executionId={current.id}
                initial={current}
                onFinished={() => void loadExecutions()}
                onClose={closeModal}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** 実行結果ビュー。/api/executions/[id] を 2 秒間隔でポーリングしてライブ表示する。 */
function ResultView({
  executionId,
  initial,
  onFinished,
  onClose,
}: {
  executionId: string;
  initial: Execution;
  onFinished: () => void;
  onClose: () => void;
}) {
  const [exec, setExec] = useState<Execution>(initial);
  const consoleRef = useRef<HTMLDivElement>(null);
  const done = exec.status !== "実行中";

  useEffect(() => {
    if (done) return;
    let stopped = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/executions/${executionId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { execution: Execution };
        if (stopped) return;
        setExec(data.execution);
        if (data.execution.status !== "実行中") {
          onFinished();
        }
      } catch {
        // 一時的な失敗は無視
      }
    };

    void poll();
    const timer = setInterval(poll, 2000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [executionId, done, onFinished]);

  // ログ更新時に末尾へ自動スクロール
  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [exec.logExcerpt]);

  return (
    <>
      <h2 className="flex items-center gap-2 text-base font-semibold">
        実行結果
        <span className="font-mono text-xs text-gray-400">{exec.id}</span>
        <ExecStatusBadge status={exec.status} />
      </h2>
      <div
        ref={consoleRef}
        className="mt-3 h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-900 p-3 font-mono text-xs leading-relaxed text-gray-100"
      >
        {exec.logExcerpt && exec.logExcerpt.length > 0
          ? exec.logExcerpt
          : exec.status === "実行中"
            ? "実行中…"
            : "（ログ出力なし）"}
      </div>
      {done && (
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
          <div className="flex gap-2">
            <dt className="text-gray-400">exit</dt>
            <dd className="tabular-nums">{exec.exitCode ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-400">所要</dt>
            <dd className="tabular-nums">
              {exec.durationSec !== null ? `${exec.durationSec}s` : "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-400">承認者</dt>
            <dd>{exec.approver ?? "—"}</dd>
          </div>
        </dl>
      )}
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={!done}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          {done ? "閉じる" : "実行中…"}
        </button>
      </div>
    </>
  );
}

function ExecutionRows({ exec }: { exec: Execution }) {
  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 font-mono text-xs">{exec.id}</td>
        <td className="px-4 py-3 text-xs text-gray-500">{exec.executedAt}</td>
        <td className="px-4 py-3 text-xs">{exec.project}</td>
        <td className="px-4 py-3 font-mono text-xs">{exec.script}</td>
        <td className="px-4 py-3"><ExecStatusBadge status={exec.status} /></td>
        <td className="px-4 py-3 text-right text-xs tabular-nums">
          {exec.exitCode ?? "—"}
        </td>
        <td className="px-4 py-3 text-right text-xs tabular-nums">
          {exec.durationSec !== null ? `${exec.durationSec}s` : "—"}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{exec.approver ?? "—"}</td>
      </tr>
      {exec.logExcerpt && exec.logExcerpt.trim() !== "" && (
        <tr>
          <td colSpan={8} className="px-4 pb-3">
            <div className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-900 p-3 font-mono text-xs leading-relaxed text-gray-100">
              {exec.logExcerpt}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function StepCircle({
  index,
  label,
  state,
}: {
  index: number;
  label: string;
  state: "done" | "current" | "todo";
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`flex size-6 items-center justify-center rounded-full text-xs ${
          state === "todo"
            ? "border border-gray-300 text-gray-400"
            : "bg-gray-900 text-white"
        }`}
      >
        {index}
      </span>
      <span
        className={`text-xs ${state === "todo" ? "text-gray-400" : "text-gray-700"}`}
      >
        {label}
      </span>
    </span>
  );
}

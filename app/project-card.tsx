import { formatRelativeDate } from "@/lib/format";
import type { ProjectInfo } from "@/lib/types";

const TYPE_LABELS: Record<ProjectInfo["type"], string> = {
  nextjs: "Next.js",
  electron: "Electron",
  node: "Node.js",
  other: "ドキュメント/その他",
};

export function ProjectCard({ project }: { project: ProjectInfo }) {
  const git = project.git;
  const dirtyCount = git ? git.changedCount + git.untrackedCount : 0;
  const isStale = (project.staleDays ?? 0) > 30;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{project.name}</h2>
          {project.displayName !== project.name && (
            <p className="truncate text-xs text-gray-500">
              {project.displayName}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
            {TYPE_LABELS[project.type]}
          </span>
          {project.isSelf && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
              本体
            </span>
          )}
        </div>
      </div>

      {git ? (
        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center gap-2">
            <dt className="w-20 shrink-0 text-xs text-gray-500">ブランチ</dt>
            <dd className="truncate font-mono text-xs">
              {git.branch}
              {git.detached && "（detached）"}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="w-20 shrink-0 text-xs text-gray-500">作業ツリー</dt>
            <dd>
              {dirtyCount === 0 ? (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                  クリーン
                </span>
              ) : (
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                  変更 {git.changedCount}・未追跡 {git.untrackedCount}
                  {git.conflictCount > 0 && `・競合 ${git.conflictCount}`}
                </span>
              )}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="w-20 shrink-0 text-xs text-gray-500">リモート</dt>
            <dd className="text-xs">
              {git.hasUpstream
                ? git.ahead === 0 && git.behind === 0
                  ? "同期済み"
                  : `ahead ${git.ahead} / behind ${git.behind}`
                : "リモートなし"}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="w-20 shrink-0 text-xs text-gray-500">最終コミット</dt>
            <dd className="truncate text-xs">
              {git.lastCommitDate ? (
                <>
                  <span className={isStale ? "font-medium text-red-600" : ""}>
                    {formatRelativeDate(git.lastCommitDate)}
                  </span>
                  <span className="text-gray-500">
                    {" "}
                    — {git.lastCommitMessage}
                  </span>
                </>
              ) : (
                "コミットなし"
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-xs text-gray-400">git 管理外（npm プロジェクト）</p>
      )}

      <div className="mt-auto flex items-center gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
        <span>{project.hasCi ? "CI あり" : "CI なし"}</span>
        <span>{project.hasTests ? "テストあり" : "テストなし"}</span>
        {isStale && (
          <span className="ml-auto font-medium text-red-600">
            ⚠ {project.staleDays}日更新なし
          </span>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { scanProjects } from "@/lib/scan";
import { getTasks } from "@/lib/tasks";
import { ProjectCard } from "./project-card";
import { RefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ managedRoot, scannedAt, projects }, tasks] = await Promise.all([
    scanProjects(),
    getTasks(),
  ]);
  const dirtyCount = projects.filter(
    (p) => p.git && p.git.changedCount + p.git.untrackedCount > 0,
  ).length;
  const staleCount = projects.filter((p) => (p.staleDays ?? 0) > 30).length;
  const openTaskCount = tasks.filter((t) => t.status !== "完了").length;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理対象: <span className="font-mono">{managedRoot}</span>（
            {projects.length} プロジェクト）
          </p>
          <p className="text-xs text-gray-400">
            最終スキャン: {new Date(scannedAt).toLocaleString("ja-JP")}
          </p>
        </div>
        <RefreshButton />
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryTile label="プロジェクト" value={projects.length} />
        <SummaryTile
          label="未コミット変更あり"
          value={dirtyCount}
          highlight={dirtyCount > 0}
        />
        <SummaryTile
          label="30日以上更新なし"
          value={staleCount}
          highlight={staleCount > 0}
        />
        <Link
          href="/tasks"
          className="rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          <p className="text-xs text-gray-500">オープン課題</p>
          <p
            className={`mt-1 text-2xl font-bold ${openTaskCount > 0 ? "text-amber-700" : ""}`}
          >
            {openTaskCount}
          </p>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${highlight ? "text-amber-700" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

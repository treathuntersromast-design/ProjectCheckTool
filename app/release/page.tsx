import { scanProjects } from "@/lib/scan";
import { ReleaseClient } from "./release-client";

export const dynamic = "force-dynamic";

export default async function ReleasePage() {
  const { projects } = await scanProjects();
  const names = projects.map((p) => p.name);

  if (names.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-900">
          対象プロジェクトがありません
        </p>
        <p className="mt-1 text-xs text-gray-500">
          親フォルダにプロジェクトが検出されると、ここからリリースを支援できます。
        </p>
      </div>
    );
  }

  // 既定はプロジェクト一覧の先頭（決め打ちは廃止）
  const defaultName = names[0];

  return <ReleaseClient projectNames={names} defaultName={defaultName} />;
}

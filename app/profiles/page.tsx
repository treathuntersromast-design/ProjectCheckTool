import { getProfiles } from "@/lib/profiles";
import { resolveManagedRoot, scanProjects } from "@/lib/scan";
import type { ProjectType } from "@/lib/types";
import { PageHeader } from "../components/page-header";
import { ProfilesForm } from "./profiles-form";

export const dynamic = "force-dynamic";

const PROJECT_TYPES: ProjectType[] = ["nextjs", "electron", "node", "other"];

const DENY_LIST_DISPLAY = [
  ".env*",
  "*.pem",
  "*.key",
  "*credential*",
  "secret.* / secrets.*",
];

export default async function ProfilesPage() {
  const [{ projects }, profiles] = await Promise.all([
    scanProjects(),
    getProfiles(),
  ]);
  const managedRoot = resolveManagedRoot();

  // 種別ごとの適用中プロジェクト名（フォームの表示用）
  const appliedByType = {} as Record<ProjectType, string[]>;
  for (const type of PROJECT_TYPES) {
    appliedByType[type] = projects
      .filter((p) => p.type === type)
      .map((p) => p.name);
  }

  return (
    <div>
      <PageHeader
        title="プロファイル"
        description="プロジェクト種別ごとの健全性チェック定義と、アプリ全体の設定です（F7）。設定は data/profiles.json に保存されます。"
      />

      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">管理対象ルート</h2>
          <p className="mt-1 text-xs text-gray-500">
            本リポジトリの親フォルダを実行時に動的解決します（絶対パスは設定に保存されません）。
          </p>
          <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs">
            {managedRoot}
          </p>
        </div>

        <ProfilesForm initialProfiles={profiles} appliedByType={appliedByType} />

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">秘密ファイル deny-list</h2>
          <p className="mt-1 text-xs text-gray-500">
            以下に一致するファイルは、どの機能からも読み取りません（lib/security.ts
            にコードレベルで実装済み。この一覧は表示のみで編集不可）。
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DENY_LIST_DISPLAY.map((pattern) => (
              <span
                key={pattern}
                className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600"
              >
                {pattern}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

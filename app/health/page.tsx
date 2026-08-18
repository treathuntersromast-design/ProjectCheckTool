import Link from "next/link";
import { getProfiles, type Profile } from "@/lib/profiles";
import { scanProjects } from "@/lib/scan";
import type { ProjectInfo } from "@/lib/types";
import { PageHeader } from "../components/page-header";

export const dynamic = "force-dynamic";

/** ok=準拠 / warn=非準拠 / na=対象外（種別対象外 or プロファイルで無効） */
type CheckState = "ok" | "warn" | "na";

interface HealthRow {
  project: ProjectInfo;
  checks: {
    ci: CheckState;
    tests: CheckState;
    lint: CheckState;
    readme: CheckState;
    fresh: CheckState;
    branch: CheckState;
  };
  overall: "OK" | "警告";
}

/** ブランチ命名の仮ルール（プロファイル設定で編集できるようになる予定） */
const BRANCH_RULE = /^(develop|master|main)$/;

/**
 * プロファイルで有効なチェックだけを評価する。
 * - プロファイルで無効（false）→「対象外」
 * - 有効なら実データで ok / warn を判定
 */
function evalCheck(enabled: boolean, ok: boolean): CheckState {
  if (!enabled) return "na";
  return ok ? "ok" : "warn";
}

function buildRow(project: ProjectInfo, profile: Profile): HealthRow {
  const { checks: def, staleThresholdDays } = profile;

  const checks = {
    ci: evalCheck(def.ci, project.hasCi),
    tests: evalCheck(def.tests, project.hasTests),
    lint: evalCheck(def.lint, project.scripts.includes("lint")),
    readme: evalCheck(def.readme, project.hasReadme),
    // 停滞: コミット履歴が無い場合は判定不能のため対象外
    fresh:
      project.staleDays === null
        ? ("na" as const)
        : project.staleDays <= staleThresholdDays
          ? ("ok" as const)
          : ("warn" as const),
    branch: !def.branchRule
      ? ("na" as const)
      : project.git
        ? BRANCH_RULE.test(project.git.branch)
          ? ("ok" as const)
          : ("warn" as const)
        : ("na" as const),
  };
  const hasWarn = Object.values(checks).includes("warn");
  return { project, checks, overall: hasWarn ? "警告" : "OK" };
}

function CheckCell({ state }: { state: CheckState }) {
  if (state === "ok")
    return <span className="text-emerald-600" aria-label="OK">✓</span>;
  if (state === "warn")
    return <span className="font-medium text-amber-700" aria-label="警告">!</span>;
  return <span className="text-gray-300" aria-label="対象外">—</span>;
}

const TYPE_LABELS: Record<ProjectInfo["type"], string> = {
  nextjs: "Next.js",
  electron: "Electron",
  node: "Node.js",
  other: "ドキュメント/その他",
};

export default async function HealthPage() {
  const [{ projects }, profiles] = await Promise.all([
    scanProjects(),
    getProfiles(),
  ]);
  const rows = projects.map((p) => buildRow(p, profiles[p.type]));
  const warnCount = rows.filter((r) => r.overall === "警告").length;

  if (projects.length === 0) {
    return (
      <div>
        <PageHeader
          title="健全性チェック"
          description="種別ごとのプロファイル定義に基づく健全性の一覧です。"
        />
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-gray-900">
            対象プロジェクトがありません
          </p>
          <p className="mt-1 text-xs text-gray-500">
            親フォルダにプロジェクトが検出されると、ここに健全性が表示されます。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="健全性チェック"
        description={`種別ごとのプロファイル定義に基づく健全性の一覧。警告 ${warnCount} 件。チェック定義・停滞しきい値はプロファイル設定に連動します（ブランチ規則のみ暫定の正規表現）。`}
        action={
          <Link
            href="/profiles"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            チェック定義を編集
          </Link>
        }
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">プロジェクト</th>
                <th scope="col" className="px-4 py-2.5 font-medium">種別</th>
                <th scope="col" className="px-4 py-2.5 text-center font-medium">CI</th>
                <th scope="col" className="px-4 py-2.5 text-center font-medium">テスト</th>
                <th scope="col" className="px-4 py-2.5 text-center font-medium">lint</th>
                <th scope="col" className="px-4 py-2.5 text-center font-medium">README</th>
                <th scope="col" className="px-4 py-2.5 text-center font-medium">停滞なし</th>
                <th scope="col" className="px-4 py-2.5 text-center font-medium">ブランチ規則（仮）</th>
                <th scope="col" className="px-4 py-2.5 font-medium">総合</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ project, checks, overall }) => (
                <tr key={project.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{project.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {TYPE_LABELS[project.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center"><CheckCell state={checks.ci} /></td>
                  <td className="px-4 py-3 text-center"><CheckCell state={checks.tests} /></td>
                  <td className="px-4 py-3 text-center"><CheckCell state={checks.lint} /></td>
                  <td className="px-4 py-3 text-center"><CheckCell state={checks.readme} /></td>
                  <td className="px-4 py-3 text-center"><CheckCell state={checks.fresh} /></td>
                  <td className="px-4 py-3 text-center"><CheckCell state={checks.branch} /></td>
                  <td className="px-4 py-3">
                    {overall === "OK" ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">OK</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">警告</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        ✓=準拠 ／ !=警告 ／ —=対象外（種別対象外またはプロファイルで無効）。CI・テスト・lint・README・停滞は実データ、ブランチ規則は仮ルール（develop / master / main のみ準拠扱い）です。
      </p>
    </div>
  );
}

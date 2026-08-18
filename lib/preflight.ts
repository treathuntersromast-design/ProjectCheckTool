import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { getExecutions } from "./executions";
import { getGitInfo } from "./git";
import type { PreflightItem } from "./mock/types";
import { resolveManagedRoot, scanProjects } from "./scan";
import { isDeniedFile } from "./security";
import type { ProjectInfo } from "./types";

const execFileAsync = promisify(execFile);

export interface PreflightResult {
  items: PreflightItem[];
  /** fail が 1 つでもあれば「要対応」、なければ「リリース可」。 */
  overall: "要対応" | "リリース可";
  /** warn の件数（overall 表示の補助）。 */
  warnCount: number;
}

/** git を読み取り専用で実行する（lib/git.ts と同じパターン）。 */
async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

/**
 * ステージ済み（--cached）ファイルのうち、deny-list に一致する basename を返す。
 * git が失敗した場合は null（チェック不能）。
 */
async function findStagedSecrets(cwd: string): Promise<string[] | null> {
  let out: string;
  try {
    out = await git(cwd, ["diff", "--cached", "--name-only"]);
  } catch {
    return null;
  }
  const hits: string[] = [];
  for (const line of out.split("\n")) {
    const p = line.trim();
    if (p === "") continue;
    const base = path.basename(p);
    if (isDeniedFile(base)) hits.push(p);
  }
  return hits;
}

/** F5 連動: 指定 script の最新実行記録の状態を返す。記録が無ければ null。 */
function latestScriptStatus(
  executions: Awaited<ReturnType<typeof getExecutions>>,
  project: string,
  script: string,
): { id: string; status: string } | null {
  // getExecutions は新しい順。実行中は判定に使わず、確定した記録を優先する。
  const finished = executions.find(
    (e) =>
      e.project === project &&
      e.script === script &&
      (e.status === "成功" || e.status === "失敗"),
  );
  if (!finished) return null;
  return { id: finished.id, status: finished.status };
}

/**
 * script（build / test）連動の 1 項目を組み立てる。
 * - script 自体が package.json に無い → skip
 * - 記録なし → skip（案内文）
 * - 最新が成功 → pass（note に E-ID）／失敗 → fail
 */
function buildScriptItem(
  label: string,
  project: ProjectInfo,
  executions: Awaited<ReturnType<typeof getExecutions>>,
  script: string,
  noScriptNote: string,
): PreflightItem {
  if (!project.scripts.includes(script)) {
    return { label, state: "skip", note: noScriptNote };
  }
  const latest = latestScriptStatus(executions, project.name, script);
  if (!latest) {
    return {
      label,
      state: "skip",
      note: `アクション実行から ${script} を実行してください`,
    };
  }
  if (latest.status === "成功") {
    return { label, state: "pass", note: latest.id };
  }
  return { label, state: "fail", note: `直近の実行で失敗（${latest.id}）` };
}

/**
 * 指定プロジェクトの実プリフライトを実行する。
 * 存在しないプロジェクト名は null を返す（API 側で 404）。
 */
export async function runPreflight(
  projectName: string,
): Promise<PreflightResult | null> {
  const { projects } = await scanProjects();
  const project = projects.find((p) => p.name === projectName);
  if (!project) return null;

  const managedRoot = path.resolve(resolveManagedRoot());
  const cwd = path.resolve(managedRoot, project.name);

  const git = project.git ?? (await getGitInfo(cwd));
  const executions = await getExecutions();

  const items: PreflightItem[] = [];

  // 1. 作業ツリーがクリーン
  if (!git) {
    items.push({
      label: "作業ツリーがクリーン（未コミット 0）",
      state: "skip",
      note: "git 情報を取得できません",
    });
  } else {
    const dirty = git.changedCount + git.untrackedCount;
    items.push(
      dirty === 0
        ? { label: "作業ツリーがクリーン（未コミット 0）", state: "pass" }
        : {
            label: "作業ツリーがクリーン（未コミット 0）",
            state: "fail",
            note: `未コミット変更 ${dirty} 件（変更 ${git.changedCount} / 未追跡 ${git.untrackedCount}）`,
          },
    );
  }

  // 2. マージ競合なし
  if (!git) {
    items.push({
      label: "マージ競合なし",
      state: "skip",
      note: "git 情報を取得できません",
    });
  } else {
    items.push(
      git.conflictCount === 0
        ? { label: "マージ競合なし", state: "pass" }
        : {
            label: "マージ競合なし",
            state: "fail",
            note: `競合 ${git.conflictCount} 件`,
          },
    );
  }

  // 3. 秘密ファイルがステージされていない
  const stagedSecrets = await findStagedSecrets(cwd);
  if (stagedSecrets === null) {
    items.push({
      label: "秘密ファイルがステージされていない",
      state: "skip",
      note: "ステージ状態を取得できません",
    });
  } else if (stagedSecrets.length === 0) {
    items.push({
      label: "秘密ファイルがステージされていない",
      state: "pass",
    });
  } else {
    items.push({
      label: "秘密ファイルがステージされていない",
      state: "fail",
      note: `deny-list 一致 ${stagedSecrets.length} 件（${stagedSecrets.join("、")}）`,
    });
  }

  // 4. リモート同期（behind 0）
  if (!git) {
    items.push({
      label: "リモート同期（behind 0）",
      state: "skip",
      note: "git 情報を取得できません",
    });
  } else if (!git.hasUpstream) {
    items.push({
      label: "リモート同期（behind 0）",
      state: "warn",
      note: "リモートなし",
    });
  } else {
    items.push(
      git.behind === 0
        ? { label: "リモート同期（behind 0）", state: "pass" }
        : {
            label: "リモート同期（behind 0）",
            state: "fail",
            note: `behind ${git.behind}（取り込み漏れ）`,
          },
    );
  }

  // 5. リリース対象あり（ahead > 0）
  if (!git) {
    items.push({
      label: "リリース対象あり（ahead > 0）",
      state: "skip",
      note: "git 情報を取得できません",
    });
  } else if (!git.hasUpstream) {
    items.push({
      label: "リリース対象あり（ahead > 0）",
      state: "warn",
      note: "リモートなし（ahead を判定できません）",
    });
  } else {
    items.push(
      git.ahead > 0
        ? { label: "リリース対象あり（ahead > 0）", state: "pass", note: `ahead ${git.ahead}` }
        : {
            label: "リリース対象あり（ahead > 0）",
            state: "warn",
            note: "リリース対象なし",
          },
    );
  }

  // 6. build 成功（F5 連動）
  items.push(
    buildScriptItem("build 成功", project, executions, "build", "build script なし"),
  );

  // 7. テスト成功（F5 連動）
  items.push(
    buildScriptItem("テスト成功", project, executions, "test", "テストなし"),
  );

  // 8. CI 最新実行グリーン（Phase 2 以降）
  items.push({
    label: "CI 最新実行グリーン",
    state: "skip",
    note: "GitHub 未連携（Phase 2 以降）",
  });

  const hasFail = items.some((i) => i.state === "fail");
  const warnCount = items.filter((i) => i.state === "warn").length;

  return {
    items,
    overall: hasFail ? "要対応" : "リリース可",
    warnCount,
  };
}

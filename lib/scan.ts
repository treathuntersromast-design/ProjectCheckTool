import fs from "node:fs/promises";
import path from "node:path";
import { getGitInfo } from "./git";
import { isDeniedFile } from "./security";
import type { ProjectInfo, ProjectType, ScanResult } from "./types";

/**
 * 管理対象ルート＝本リポジトリの親フォルダ。
 * npm scripts 経由で起動する限り cwd はリポジトリルートを指す。
 * 別の場所を見たい場合のみ PROJECT_ROOT で上書きできる（非常口）。
 */
export function resolveManagedRoot(): string {
  return process.env.PROJECT_ROOT ?? path.resolve(process.cwd(), "..");
}

const IGNORED_DIRS = new Set(["node_modules"]);

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readPackageJson(dir: string): Promise<Record<string, unknown> | null> {
  const fileName = "package.json";
  if (isDeniedFile(fileName)) return null;
  try {
    const raw = await fs.readFile(path.join(dir, fileName), "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function detectType(pkg: Record<string, unknown> | null): ProjectType {
  if (!pkg) return "other";
  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };
  if ("next" in deps) return "nextjs";
  if ("electron" in deps) return "electron";
  return "node";
}

/** 本ツール自身の package.json name。isSelf 判定は cwd 非依存でこれを使う。 */
const SELF_PKG_NAME = "project-check-tool";

async function buildProjectInfo(
  dir: string,
  name: string,
): Promise<ProjectInfo | null> {
  const hasGit = await exists(path.join(dir, ".git"));
  const pkg = await readPackageJson(dir);
  // git 管理でも npm プロジェクトでもないフォルダは対象外
  if (!hasGit && !pkg) return null;

  const git = hasGit ? await getGitInfo(dir) : null;
  const scripts =
    pkg && typeof pkg.scripts === "object" && pkg.scripts !== null
      ? Object.keys(pkg.scripts as Record<string, string>)
      : [];

  let staleDays: number | null = null;
  if (git?.lastCommitDate) {
    staleDays = Math.floor(
      (Date.now() - new Date(git.lastCommitDate).getTime()) / 86_400_000,
    );
  }

  return {
    name,
    displayName: (pkg?.name as string | undefined) ?? name,
    type: detectType(pkg),
    isSelf: pkg?.name === SELF_PKG_NAME,
    hasGit,
    hasCi: await exists(path.join(dir, ".github", "workflows")),
    hasTests: scripts.includes("test") || scripts.includes("test:e2e"),
    hasReadme: await exists(path.join(dir, "README.md")),
    scripts,
    git,
    staleDays,
  };
}

export async function scanProjects(): Promise<ScanResult> {
  const managedRoot = resolveManagedRoot();
  const entries = await fs.readdir(managedRoot, { withFileTypes: true });

  const candidates = entries.filter(
    (entry) =>
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      !IGNORED_DIRS.has(entry.name),
  );

  const projects = (
    await Promise.all(
      candidates.map((entry) =>
        buildProjectInfo(path.join(managedRoot, entry.name), entry.name),
      ),
    )
  ).filter((project): project is ProjectInfo => project !== null);

  projects.sort((a, b) => a.name.localeCompare(b.name));

  return {
    managedRoot,
    scannedAt: new Date().toISOString(),
    projects,
  };
}

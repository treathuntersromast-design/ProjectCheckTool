export type ProjectType = "nextjs" | "electron" | "node" | "other";

export interface GitInfo {
  branch: string;
  detached: boolean;
  hasUpstream: boolean;
  ahead: number;
  behind: number;
  changedCount: number;
  untrackedCount: number;
  conflictCount: number;
  lastCommitDate: string | null;
  lastCommitMessage: string | null;
}

export interface ProjectInfo {
  /** フォルダ名 */
  name: string;
  /** package.json の name（なければフォルダ名） */
  displayName: string;
  type: ProjectType;
  /** 本アプリ自身かどうか */
  isSelf: boolean;
  hasGit: boolean;
  hasCi: boolean;
  hasTests: boolean;
  /** README.md が存在するか */
  hasReadme: boolean;
  scripts: string[];
  git: GitInfo | null;
  /** 最終コミットからの経過日数 */
  staleDays: number | null;
}

export interface ScanResult {
  managedRoot: string;
  scannedAt: string;
  projects: ProjectInfo[];
}

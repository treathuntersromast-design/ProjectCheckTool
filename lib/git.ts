import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitInfo } from "./types";

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

/** リポジトリの状態を git CLI（--porcelain=v2）から読み取る。読み取り専用。 */
export async function getGitInfo(repoPath: string): Promise<GitInfo | null> {
  let statusOut: string;
  try {
    statusOut = await git(repoPath, ["status", "--porcelain=v2", "--branch"]);
  } catch {
    return null;
  }

  const info: GitInfo = {
    branch: "(不明)",
    detached: false,
    hasUpstream: false,
    ahead: 0,
    behind: 0,
    changedCount: 0,
    untrackedCount: 0,
    conflictCount: 0,
    lastCommitDate: null,
    lastCommitMessage: null,
  };

  for (const line of statusOut.split("\n")) {
    if (line.startsWith("# branch.head ")) {
      const head = line.slice("# branch.head ".length).trim();
      info.detached = head === "(detached)";
      info.branch = head;
    } else if (line.startsWith("# branch.upstream ")) {
      info.hasUpstream = true;
    } else if (line.startsWith("# branch.ab ")) {
      const match = line.match(/\+(\d+) -(\d+)/);
      if (match) {
        info.ahead = Number(match[1]);
        info.behind = Number(match[2]);
      }
    } else if (line.startsWith("1 ") || line.startsWith("2 ")) {
      info.changedCount++;
    } else if (line.startsWith("? ")) {
      info.untrackedCount++;
    } else if (line.startsWith("u ")) {
      info.conflictCount++;
    }
  }

  try {
    const logOut = await git(repoPath, ["log", "-1", "--format=%cI%x09%s"]);
    const [date, ...rest] = logOut.trim().split("\t");
    if (date) {
      info.lastCommitDate = date;
      info.lastCommitMessage = rest.join("\t") || null;
    }
  } catch {
    // コミットが 1 件もないリポジトリでは git log が失敗するため無視
  }

  return info;
}

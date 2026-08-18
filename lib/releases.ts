import { readJsonFile, writeJsonFile } from "./store";

/** リリース履歴の 1 行。MockRelease と同フィールド。 */
export interface Release {
  /** リリース ID（R-NNN ゼロ埋め 3 桁） */
  id: string;
  /** リリース日時（YYYY-MM-DD HH:mm ローカルタイム） */
  releasedAt: string;
  /** 対象プロジェクトのフォルダ名 */
  project: string;
  fromBranch: string;
  toBranch: string;
  commitCount: number;
  result: "成功" | "承認待ち" | "失敗";
  actor: string;
}

interface ReleasesFile {
  releases: Release[];
}

const FILE_NAME = "releases.json";

/**
 * 初回 seed は実績 R-001 のみ。
 * 2026-08-18 18:50 に実際に行った ProjectCheckTool の初回リリース記録。
 */
function seedReleases(): Release[] {
  return [
    {
      id: "R-001",
      releasedAt: "2026-08-18 18:50",
      project: "ProjectCheckTool",
      fromBranch: "develop",
      toBranch: "master",
      commitCount: 3,
      result: "成功",
      actor: "シャチョー",
    },
  ];
}

/**
 * 全リリース履歴を取得する。
 * 初回（ファイル未生成）は R-001 を seed として保存してから返す。
 */
export async function getReleases(): Promise<Release[]> {
  const file = await readJsonFile<ReleasesFile | null>(FILE_NAME, null);
  if (file && Array.isArray(file.releases)) {
    return file.releases;
  }
  const seeded = seedReleases();
  await writeJsonFile(FILE_NAME, { releases: seeded } satisfies ReleasesFile);
  return seeded;
}

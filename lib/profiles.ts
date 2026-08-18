import { readJsonFile, writeJsonFile } from "./store";
import type { ProjectType } from "./types";

/** 種別ごとのチェック定義（すべて必須/任意の boolean）。 */
export interface ProfileChecks {
  ci: boolean;
  tests: boolean;
  lint: boolean;
  readme: boolean;
  branchRule: boolean;
}

/** 1 種別分のプロファイル設定。 */
export interface Profile {
  type: ProjectType;
  checks: ProfileChecks;
  /** 停滞アラートしきい値（日）。 */
  staleThresholdDays: number;
}

interface ProfilesFile {
  profiles: Record<ProjectType, Profile>;
}

const FILE_NAME = "profiles.json";

const PROJECT_TYPES: ProjectType[] = ["nextjs", "electron", "node", "other"];
const CHECK_KEYS: Array<keyof ProfileChecks> = [
  "ci",
  "tests",
  "lint",
  "readme",
  "branchRule",
];

/**
 * 種別ごとのプロファイル初期値。
 * app/profiles/page.tsx の PROFILE_DEFS 相当（nextjs/electron は CI・テスト・
 * README・ブランチ規則が必須〔lint は nextjs のみ〕、node は README・ブランチ規則、
 * other は README のみ・停滞閾値 90、その他は 30）。
 */
function seedProfiles(): Record<ProjectType, Profile> {
  return {
    nextjs: {
      type: "nextjs",
      checks: { ci: true, tests: true, lint: true, readme: true, branchRule: true },
      staleThresholdDays: 30,
    },
    electron: {
      type: "electron",
      checks: { ci: true, tests: true, lint: false, readme: true, branchRule: true },
      staleThresholdDays: 30,
    },
    node: {
      type: "node",
      checks: { ci: false, tests: false, lint: false, readme: true, branchRule: true },
      staleThresholdDays: 30,
    },
    other: {
      type: "other",
      checks: { ci: false, tests: false, lint: false, readme: true, branchRule: false },
      staleThresholdDays: 90,
    },
  };
}

/** 与えられた値が正しい Profile レコードの形かを検証する（PUT の全体置換用）。 */
export function isValidProfilesRecord(
  value: unknown,
): value is Record<ProjectType, Profile> {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  for (const type of PROJECT_TYPES) {
    const profile = record[type];
    if (typeof profile !== "object" || profile === null) return false;
    const p = profile as Record<string, unknown>;
    if (p.type !== type) return false;
    if (
      typeof p.staleThresholdDays !== "number" ||
      !Number.isFinite(p.staleThresholdDays) ||
      p.staleThresholdDays < 0
    ) {
      return false;
    }
    if (typeof p.checks !== "object" || p.checks === null) return false;
    const checks = p.checks as Record<string, unknown>;
    for (const key of CHECK_KEYS) {
      if (typeof checks[key] !== "boolean") return false;
    }
  }
  return true;
}

/** 正しい形の入力を Profile レコードへ正規化する（余計なキーを落とす）。 */
export function normalizeProfilesRecord(
  value: Record<ProjectType, Profile>,
): Record<ProjectType, Profile> {
  const result = {} as Record<ProjectType, Profile>;
  for (const type of PROJECT_TYPES) {
    const p = value[type];
    result[type] = {
      type,
      checks: {
        ci: p.checks.ci,
        tests: p.checks.tests,
        lint: p.checks.lint,
        readme: p.checks.readme,
        branchRule: p.checks.branchRule,
      },
      staleThresholdDays: Math.floor(p.staleThresholdDays),
    };
  }
  return result;
}

/**
 * 全プロファイルを取得する。
 * 初回（ファイル未生成 or 破損）は seed を保存してから返す。
 */
export async function getProfiles(): Promise<Record<ProjectType, Profile>> {
  const file = await readJsonFile<ProfilesFile | null>(FILE_NAME, null);
  if (file && isValidProfilesRecord(file.profiles)) {
    return normalizeProfilesRecord(file.profiles);
  }
  const seeded = seedProfiles();
  await writeJsonFile(FILE_NAME, { profiles: seeded } satisfies ProfilesFile);
  return seeded;
}

/** 全プロファイルを置き換えて保存する（バリデーション済みの値を渡すこと）。 */
export async function saveProfiles(
  profiles: Record<ProjectType, Profile>,
): Promise<void> {
  await writeJsonFile(FILE_NAME, { profiles } satisfies ProfilesFile);
}

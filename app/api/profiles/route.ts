import { NextResponse } from "next/server";
import {
  getProfiles,
  isValidProfilesRecord,
  normalizeProfilesRecord,
  saveProfiles,
} from "@/lib/profiles";

export const dynamic = "force-dynamic";

/** 全プロファイルを返す（初回は seed を保存してから返す）。 */
export async function GET() {
  const profiles = await getProfiles();
  return NextResponse.json({ profiles });
}

/** 全プロファイルを置き換える（全体置換）。 */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON の解析に失敗しました" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const { profiles } = body as { profiles?: unknown };
  if (!isValidProfilesRecord(profiles)) {
    return NextResponse.json(
      { error: "プロファイルの形式が不正です" },
      { status: 400 },
    );
  }

  const normalized = normalizeProfilesRecord(profiles);
  await saveProfiles(normalized);
  return NextResponse.json({ profiles: normalized });
}

import { NextResponse } from "next/server";
import { getReleases } from "@/lib/releases";

export const dynamic = "force-dynamic";

/** 全リリース履歴を返す（初回は R-001 を seed してから返す）。読み取り専用。 */
export async function GET() {
  const releases = await getReleases();
  return NextResponse.json({ releases });
}

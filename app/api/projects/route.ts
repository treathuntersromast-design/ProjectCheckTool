import { NextResponse } from "next/server";
import { scanProjects } from "@/lib/scan";

export const dynamic = "force-dynamic";

/** 管理対象プロジェクトのフォルダ名一覧を返す（読み取り専用）。 */
export async function GET() {
  const { projects } = await scanProjects();
  const names = projects.map((p) => p.name);
  return NextResponse.json({ names });
}

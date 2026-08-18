import { NextResponse } from "next/server";
import { runPreflight } from "@/lib/preflight";

export const dynamic = "force-dynamic";

/** GET ?project=NAME → 実プリフライト結果。存在しないプロジェクトは 404。 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get("project")?.trim() ?? "";

  if (!project) {
    return NextResponse.json({ error: "project は必須です" }, { status: 400 });
  }

  const result = await runPreflight(project);
  if (!result) {
    return NextResponse.json(
      { error: "存在しないプロジェクトです" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}

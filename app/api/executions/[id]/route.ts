import { NextResponse } from "next/server";
import { getExecution } from "@/lib/executions";
import { getLiveLog } from "@/lib/executor";

export const dynamic = "force-dynamic";

/**
 * 単体を返す（ポーリング用）。
 * 実行中はキャプチャ済みログの現在値を logExcerpt に反映して返す。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const execution = await getExecution(id);
  if (!execution) {
    return NextResponse.json({ error: "実行記録が見つかりません" }, { status: 404 });
  }

  if (execution.status === "実行中") {
    const live = getLiveLog(id);
    if (live !== null) {
      execution.logExcerpt = live;
    }
  }

  return NextResponse.json({ execution });
}

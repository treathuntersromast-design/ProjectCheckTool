import { NextResponse } from "next/server";
import { getExecutions } from "@/lib/executions";
import {
  ConflictError,
  startExecution,
  ValidationError,
} from "@/lib/executor";

export const dynamic = "force-dynamic";

/** 全実行記録を新しい順で返す。 */
export async function GET() {
  const executions = await getExecutions();
  return NextResponse.json({ executions });
}

/** {project, script} で実行を開始する。承認は API 呼び出し自体が承認済みを意味する。 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON の解析に失敗しました" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const project = typeof b.project === "string" ? b.project.trim() : "";
  const script = typeof b.script === "string" ? b.script.trim() : "";

  if (!project) {
    return NextResponse.json({ error: "プロジェクトは必須です" }, { status: 400 });
  }
  if (!script) {
    return NextResponse.json({ error: "script は必須です" }, { status: 400 });
  }

  try {
    const execution = await startExecution(project, script);
    return NextResponse.json({ execution }, { status: 201 });
  } catch (err) {
    if (err instanceof ConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "実行の開始に失敗しました" },
      { status: 500 },
    );
  }
}

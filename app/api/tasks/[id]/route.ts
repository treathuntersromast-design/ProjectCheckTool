import { NextResponse } from "next/server";
import { updateTask, type UpdateTaskPatch } from "@/lib/tasks";
import type {
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "@/lib/mock/types";

export const dynamic = "force-dynamic";

const STATUSES: TaskStatus[] = ["未着手", "進行中", "完了", "ブロック"];
const CATEGORIES: TaskCategory[] = [
  "衛生",
  "停滞",
  "規約",
  "機能",
  "セキュリティ",
];
const PRIORITIES: TaskPriority[] = ["高", "中", "低"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
  const patch: UpdateTaskPatch = {};

  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status as TaskStatus)) {
      return NextResponse.json({ error: "状態が不正です" }, { status: 400 });
    }
    patch.status = b.status as TaskStatus;
  }
  if (b.priority !== undefined) {
    if (!PRIORITIES.includes(b.priority as TaskPriority)) {
      return NextResponse.json({ error: "優先度が不正です" }, { status: 400 });
    }
    patch.priority = b.priority as TaskPriority;
  }
  if (b.category !== undefined) {
    if (!CATEGORIES.includes(b.category as TaskCategory)) {
      return NextResponse.json({ error: "種別が不正です" }, { status: 400 });
    }
    patch.category = b.category as TaskCategory;
  }
  if (b.title !== undefined) {
    const title = typeof b.title === "string" ? b.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "タイトルが不正です" }, { status: 400 });
    }
    patch.title = title;
  }
  if (b.project !== undefined) {
    const project = typeof b.project === "string" ? b.project.trim() : "";
    if (!project) {
      return NextResponse.json({ error: "プロジェクトが不正です" }, { status: 400 });
    }
    patch.project = project;
  }
  if (b.externalRef !== undefined) {
    patch.externalRef =
      typeof b.externalRef === "string" && b.externalRef.trim() !== ""
        ? b.externalRef.trim()
        : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "更新項目がありません" }, { status: 400 });
  }

  const updated = await updateTask(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "タスクが見つかりません" }, { status: 404 });
  }
  return NextResponse.json({ task: updated });
}

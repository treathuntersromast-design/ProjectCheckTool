import { NextResponse } from "next/server";
import {
  createTask,
  getTasks,
  type CreateTaskInput,
} from "@/lib/tasks";
import type { TaskCategory, TaskPriority } from "@/lib/mock/types";
import { scanProjects } from "@/lib/scan";

export const dynamic = "force-dynamic";

/** プロジェクト横断のタスクに使う特別値。 */
const CROSS_PROJECT = "（横断）";

const CATEGORIES: TaskCategory[] = [
  "衛生",
  "停滞",
  "規約",
  "機能",
  "セキュリティ",
];
const PRIORITIES: TaskPriority[] = ["高", "中", "低"];

export async function GET() {
  const tasks = await getTasks();
  return NextResponse.json({ tasks });
}

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
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const project = typeof b.project === "string" ? b.project.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
  }
  if (!project) {
    return NextResponse.json({ error: "プロジェクトは必須です" }, { status: 400 });
  }
  if (!CATEGORIES.includes(b.category as TaskCategory)) {
    return NextResponse.json({ error: "種別が不正です" }, { status: 400 });
  }
  if (!PRIORITIES.includes(b.priority as TaskPriority)) {
    return NextResponse.json({ error: "優先度が不正です" }, { status: 400 });
  }

  // project は scanProjects() の実在名、または「（横断）」のみ許可する。
  if (project !== CROSS_PROJECT) {
    const { projects } = await scanProjects();
    if (!projects.some((p) => p.name === project)) {
      return NextResponse.json({ error: "存在しないプロジェクトです" }, { status: 400 });
    }
  }

  const externalRef =
    typeof b.externalRef === "string" && b.externalRef.trim() !== ""
      ? b.externalRef.trim()
      : null;

  const input: CreateTaskInput = {
    title,
    project,
    category: b.category as TaskCategory,
    priority: b.priority as TaskPriority,
    externalRef,
  };

  const task = await createTask(input);
  return NextResponse.json({ task }, { status: 201 });
}

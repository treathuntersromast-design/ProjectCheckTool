import { MOCK_TASKS } from "./mock/tasks";
import type {
  MockTask,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "./mock/types";
import { readJsonFile, updateJsonFile, writeJsonFile } from "./store";

/** 課題・タスクの実データ型。MockTask と同フィールド＋作成日。 */
export interface Task extends MockTask {
  /** 作成日（YYYY-MM-DD） */
  createdAt: string;
}

interface TasksFile {
  tasks: Task[];
}

const FILE_NAME = "tasks.json";
/** MOCK_TASKS は初期サンプルタスクなので初回 seed の作成日をこの日付に揃える。 */
const SEED_CREATED_AT = "2026-08-18";

/** 現在日付を YYYY-MM-DD で返す（ローカルタイム）。 */
function today(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** MOCK_TASKS を初期データ（seed）へ変換する。createdAt を補完する。 */
function seedTasks(): Task[] {
  return MOCK_TASKS.map((t) => ({ ...t, createdAt: SEED_CREATED_AT }));
}

/**
 * 全タスクを取得する。
 * 初回（ファイル未生成）は初期サンプルタスクを seed として保存してから返す。
 */
export async function getTasks(): Promise<Task[]> {
  const file = await readJsonFile<TasksFile | null>(FILE_NAME, null);
  if (file && Array.isArray(file.tasks)) {
    return file.tasks;
  }
  const seeded = seedTasks();
  await writeJsonFile(FILE_NAME, { tasks: seeded } satisfies TasksFile);
  return seeded;
}

/** ロック内で現在のタスク配列を得る。未生成なら seed を初期値とする。 */
function currentTasks(file: TasksFile | null): Task[] {
  if (file && Array.isArray(file.tasks)) return file.tasks;
  return seedTasks();
}

/** 既存の T-NNN の最大値 +1 を 3 桁ゼロ埋めで採番する。 */
function nextTaskId(tasks: Task[]): string {
  let max = 0;
  for (const t of tasks) {
    const m = /^T-(\d+)$/.exec(t.id);
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `T-${String(max + 1).padStart(3, "0")}`;
}

export interface CreateTaskInput {
  project: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  externalRef?: string | null;
}

/**
 * タスクを新規作成する。
 * status は「未着手」、assignee は「シャチョー」、createdAt/updatedAt は現在日付。
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  let created: Task | null = null;
  await updateJsonFile<TasksFile | null>(FILE_NAME, null, (file) => {
    const tasks = currentTasks(file);
    const now = today();
    const task: Task = {
      id: nextTaskId(tasks),
      project: input.project,
      title: input.title,
      category: input.category,
      priority: input.priority,
      status: "未着手",
      externalRef: input.externalRef ?? null,
      assignee: "シャチョー",
      createdAt: now,
      updatedAt: now,
    };
    created = task;
    return { tasks: [...tasks, task] };
  });
  return created as unknown as Task;
}

export interface UpdateTaskPatch {
  title?: string;
  project?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  status?: TaskStatus;
  externalRef?: string | null;
  assignee?: string;
}

/**
 * タスクを部分更新する。updatedAt を現在日付へ更新する。
 * 存在しない id は null を返す。
 */
export async function updateTask(
  id: string,
  patch: UpdateTaskPatch,
): Promise<Task | null> {
  let updated: Task | null = null;
  await updateJsonFile<TasksFile | null>(FILE_NAME, null, (file) => {
    const tasks = currentTasks(file);
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      // 対象なし。seed を確定させて（未生成だった場合の初期化）そのまま返す。
      return { tasks };
    }
    const next = [...tasks];
    next[index] = {
      ...tasks[index],
      ...patch,
      id: tasks[index].id,
      createdAt: tasks[index].createdAt,
      updatedAt: today(),
    };
    updated = next[index];
    return { tasks: next };
  });
  return updated;
}

import { scanProjects } from "@/lib/scan";
import { ActionsClient } from "./actions-client";

export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const { projects } = await scanProjects();
  const runnable = projects
    .filter((p) => p.scripts.length > 0)
    .map((p) => ({ name: p.name, scripts: p.scripts }));

  return <ActionsClient projects={runnable} />;
}

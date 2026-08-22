"use client";

import { use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { TaskDetailDrawer } from "@/components/task/TaskDetailDrawer";
import { tasks } from "@/mocks/data";

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  const taskId = searchParams.get("task");
  const treeNodeId = searchParams.get("treeNode");

  const foundTask = taskId
    ? tasks.find((t) => t.id === taskId && t.workspaceId === id) ?? null
    : null;

  const handleClose = () => {
    const urlParams = new URLSearchParams();
    if (treeNodeId) urlParams.set("treeNode", treeNodeId);
    
    const query = urlParams.toString();
    router.replace(`/workspace/${id}/board${query ? `?${query}` : ""}`);
  };

  return (
    <>
      <KanbanBoard workspaceId={id} />
      <TaskDetailDrawer open={!!foundTask} task={foundTask} onClose={handleClose} />
    </>
  );
}

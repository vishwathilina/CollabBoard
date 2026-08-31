"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { TaskDetailDrawer } from "@/components/task/TaskDetailDrawer";
import { apiFetch, getToken } from "@/lib/api";
import type { Task } from "@/types";

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

  const [foundTask, setFoundTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!taskId) {
      setFoundTask(null);
      return;
    }
    const token = getToken();
    if (!token) return;

    apiFetch<Task>(`/api/tasks/${taskId}`, { token })
      .then(setFoundTask)
      .catch((err) => {
        console.error(err);
        setFoundTask(null);
      });
  }, [taskId]);

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

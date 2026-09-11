"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard, SortableTaskCard } from "./TaskCard";
import { CreateTaskModal } from "./CreateTaskModal";
import { apiFetch, getToken, ApiError } from "@/lib/api";
import { useOptionalWorkspaceRealtime } from "@/components/realtime/WorkspaceRealtimeContext";
import type { TaskColumn, Task, User, TreeNode } from "@/types";

const COLUMNS: { id: TaskColumn; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

interface KanbanBoardProps {
  workspaceId: string;
  onTaskMoved?: (task: Task) => void;
  onTaskCreated?: (task: Task) => void;
}

interface ToastMessage {
  id: number;
  message: string;
  type: "info" | "error" | "conflict";
}

export function KanbanBoard({
  workspaceId,
  onTaskMoved,
  onTaskCreated,
}: KanbanBoardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Quick Task Creation Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState<TaskColumn>("todo");

  // Conflict / Notification Toast
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const treeNodeId = searchParams.get("treeNode");
  const taskId = searchParams.get("task");

  const showToast = useCallback((message: string, type: ToastMessage["type"] = "info") => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4500);
  }, []);

  const loadData = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const query = treeNodeId ? `?treeNode=${treeNodeId}` : "";
      const [fetchedTasks, fetchedUsers, fetchedTree] = await Promise.all([
        apiFetch<Task[]>(`/api/workspaces/${workspaceId}/tasks${query}`, { token }),
        apiFetch<User[]>("/api/users", { token }),
        apiFetch<TreeNode[]>(`/api/workspaces/${workspaceId}/tree`, { token }).catch(() => []),
      ]);

      // Ensure tasks are sorted by order
      const sorted = [...fetchedTasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setTasks(sorted);
      setUsers(fetchedUsers);
      setTreeNodes(fetchedTree);
    } catch (err) {
      console.error("Error loading board data:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, treeNodeId]);

  const realtime = useOptionalWorkspaceRealtime();
  const editingMap = realtime?.editingMap || {};

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to live task events via socket (Member 7A)
  useEffect(() => {
    if (!realtime?.subscribe) return;

    const matchesFilter = (task: Task) => {
      if (!treeNodeId) return true;
      return task.treeNodeId === treeNodeId;
    };

    const unsubMoved = realtime.subscribe("task:moved", (data: { workspaceId: string; task: Task }) => {
      if (data?.task) {
        setTasks((prev) => {
          if (!matchesFilter(data.task)) {
            // Task no longer belongs to filtered tree node, remove from board
            return prev.filter((t) => t.id !== data.task.id);
          }
          const exists = prev.some((t) => t.id === data.task.id);
          if (!exists) return [...prev, data.task].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          return prev.map((t) => (t.id === data.task.id ? data.task : t)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        });
      }
    });

    const unsubCreated = realtime.subscribe("task:created", (data: { workspaceId: string; task: Task }) => {
      if (data?.task) {
        if (!matchesFilter(data.task)) return;
        setTasks((prev) => {
          if (prev.some((t) => t.id === data.task.id)) return prev;
          return [...prev, data.task].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        });
      }
    });

    const unsubUpdated = realtime.subscribe("task:updated", (data: { workspaceId: string; task: Task }) => {
      if (data?.task) {
        setTasks((prev) => {
          if (!matchesFilter(data.task)) {
            return prev.filter((t) => t.id !== data.task.id);
          }
          const exists = prev.some((t) => t.id === data.task.id);
          if (!exists) return [...prev, data.task].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          return prev.map((t) => (t.id === data.task.id ? data.task : t));
        });
      }
    });

    const unsubDeleted = realtime.subscribe("task:deleted", (data: { workspaceId: string; taskId: string }) => {
      if (data?.taskId) {
        setTasks((prev) => prev.filter((t) => t.id !== data.taskId));
      }
    });

    const unsubTree = realtime.subscribe("tree:updated", () => {
      // Reload tree / tasks if tree hierarchy changed
      loadData();
    });

    return () => {
      unsubMoved();
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubTree();
    };
  }, [realtime, loadData, treeNodeId]);

  // Pointer sensor requires 5px movement so simple clicks activate card selection instead
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) return;

    // Check if dragging over another task or a column
    const isOverTask = tasks.some((t) => t.id === overId);
    const isOverColumn = COLUMNS.some((col) => col.id === overId);

    if (isOverTask) {
      const overTaskItem = tasks.find((t) => t.id === overId);
      if (overTaskItem && activeTaskItem.column !== overTaskItem.column) {
        // Move task into target column optimistically during drag over
        setTasks((prev) => {
          const activeIndex = prev.findIndex((t) => t.id === activeId);
          const overIndex = prev.findIndex((t) => t.id === overId);

          const updated = [...prev];
          updated[activeIndex] = {
            ...updated[activeIndex],
            column: overTaskItem.column,
          };
          return arrayMove(updated, activeIndex, overIndex);
        });
      }
    } else if (isOverColumn) {
      const targetColumn = overId as TaskColumn;
      if (activeTaskItem.column !== targetColumn) {
        setTasks((prev) => {
          return prev.map((t) =>
            t.id === activeId ? { ...t, column: targetColumn } : t
          );
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const currentTask = tasks.find((t) => t.id === activeId);
    if (!currentTask) return;

    let targetColumn = currentTask.column;
    let targetIndex = 0;

    const isOverTask = tasks.some((t) => t.id === overId);
    const isOverColumn = COLUMNS.some((col) => col.id === overId);

    if (isOverTask) {
      const overTaskItem = tasks.find((t) => t.id === overId);
      if (overTaskItem) {
        targetColumn = overTaskItem.column;
        const columnTasks = tasks.filter((t) => t.column === targetColumn);
        targetIndex = columnTasks.findIndex((t) => t.id === overId);
      }
    } else if (isOverColumn) {
      targetColumn = overId as TaskColumn;
      const columnTasks = tasks.filter((t) => t.column === targetColumn && t.id !== activeId);
      targetIndex = columnTasks.length;
    }

    // Determine new order inside the column
    const columnTasksAfterMove = tasks.filter((t) => t.column === targetColumn);
    const calculatedOrder = targetIndex >= 0 ? targetIndex : columnTasksAfterMove.length;

    // Apply optimistic reordering
    setTasks((prev) => {
      const activeIdx = prev.findIndex((t) => t.id === activeId);
      const overIdx = prev.findIndex((t) => t.id === overId);

      let nextTasks = [...prev];
      if (activeIdx !== overIdx && overIdx !== -1) {
        nextTasks = arrayMove(nextTasks, activeIdx, overIdx);
      }

      return nextTasks.map((t) =>
        t.id === activeId ? { ...t, column: targetColumn, order: calculatedOrder } : t
      );
    });

    // Send PATCH to API with version
    const token = getToken();
    if (!token) return;

    try {
      const movedTask = await apiFetch<Task>(`/api/tasks/${activeId}/move`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          column: targetColumn,
          order: calculatedOrder,
          version: currentTask.version,
        }),
      });

      // Update task in state with incremented version from server
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? movedTask : t))
      );

      onTaskMoved?.(movedTask);
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.status === 409 || err.code === "CONFLICT")) {
        showToast("Task conflict: This card was modified by someone else. Reloading...", "conflict");
        // Refetch latest tasks to reconcile state
        await loadData();
      } else {
        showToast(err instanceof Error ? err.message : "Failed to move task.", "error");
        await loadData();
      }
    }
  };

  const clearFilter = () => {
    const params = new URLSearchParams();
    if (taskId) params.set("task", taskId);
    router.replace(`?${params.toString()}`);
  };

  const handleOpenCreate = (col: TaskColumn) => {
    setCreateColumn(col);
    setCreateModalOpen(true);
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev) => [...prev, newTask]);
    onTaskCreated?.(newTask);
    showToast(`Task "${newTask.title}" created successfully.`);
  };

  return (
    <div className="flex h-full flex-col relative">
      {treeNodeId && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-surface-2 px-4 py-2 text-sm border border-border">
          <span className="font-medium text-accent">Filtered by work tree node</span>
          <button
            type="button"
            onClick={clearFilter}
            className="ml-auto text-xs text-muted underline hover:text-fg"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl transition-all duration-300 ${
            toast.type === "conflict"
              ? "border-amber-500/50 bg-amber-950/95 text-amber-200"
              : toast.type === "error"
              ? "border-red-500/50 bg-red-950/95 text-red-200"
              : "border-accent/40 bg-surface-2 text-fg"
          }`}
        >
          <span className="text-sm">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted">
          Loading board tasks...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1 items-start gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.column === col.id);
            const taskIds = colTasks.map((t) => t.id);

            return (
              <KanbanColumn
                key={col.id}
                title={col.title}
                column={col.id}
                count={colTasks.length}
                onAddTask={handleOpenCreate}
                canCreateTask={true}
              >
                <SortableContext
                  items={taskIds}
                  strategy={verticalListSortingStrategy}
                >
                  {colTasks.length === 0 ? (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map((t) => {
                      const members = users.filter((u) => t.memberIds.includes(u.id));
                      return (
                        <SortableTaskCard
                          key={t.id}
                          task={t}
                          members={members}
                          highlighted={t.id === taskId}
                          editingUser={editingMap[t.id] || null}
                          onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set("task", t.id);
                            router.replace(`?${params.toString()}`);
                          }}
                        />
                      );
                    })
                  )}
                </SortableContext>
              </KanbanColumn>
            );
          })}
        </div>

        {/* Drag preview overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 scale-105 opacity-90 shadow-2xl">
              <TaskCard
                task={activeTask}
                members={users.filter((u) => activeTask.memberIds.includes(u.id))}
                highlighted={true}
                onClick={() => {}}
                isDragging={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}

      {/* Quick Task Creation Modal */}
      <CreateTaskModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        workspaceId={workspaceId}
        defaultColumn={createColumn}
        defaultTreeNodeId={treeNodeId}
        treeNodes={treeNodes}
        users={users}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}

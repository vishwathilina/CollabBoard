import { KanbanBoard } from "@/components/board/KanbanBoard";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <KanbanBoard workspaceId={id} />;
}

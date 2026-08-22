import { GanttChart } from "@/components/gantt/GanttChart";

export default async function GanttPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GanttChart workspaceId={id} />;
}

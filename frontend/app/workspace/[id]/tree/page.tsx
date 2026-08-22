import { WorkTree } from "@/components/tree/WorkTree";

export default async function TreePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkTree workspaceId={id} />;
}

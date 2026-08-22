import { workspaces, users } from "@/mocks/data";
import { getUsers } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { WorkspaceViewTabs } from "@/components/layout/WorkspaceViewTabs";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = workspaces.find((item) => item.id === id);

  if (!workspace) {
    return (
      <>
        <TopBar title="Workspace" />
        <div className="p-6 text-sm text-muted">Workspace not found</div>
      </>
    );
  }

  const members = getUsers(users, workspace.memberIds);

  return (
    <>
      <TopBar title={workspace.name} members={members} />
      <WorkspaceViewTabs />
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </>
  );
}

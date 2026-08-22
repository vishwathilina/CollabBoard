import { TopBar } from "@/components/layout/TopBar";
import { WorkspaceGrid } from "@/components/dashboard/WorkspaceGrid";
import { workspaces } from "@/mocks/data";

export default function DashboardPage() {
  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex-1 overflow-auto p-6">
        <p className="mb-4 text-sm text-muted">Select a workspace</p>
        <WorkspaceGrid items={workspaces} />
      </div>
    </>
  );
}

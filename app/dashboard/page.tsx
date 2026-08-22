import { TopBar } from "@/components/layout/TopBar";
import { WorkspaceGrid } from "@/components/dashboard/WorkspaceGrid";

export default function DashboardPage() {
  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex-1 overflow-auto p-6">
        <WorkspaceGrid />
      </div>
    </>
  );
}

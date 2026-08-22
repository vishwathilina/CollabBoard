"use client";

import { useRouter } from "next/navigation";
import { treeNodes } from "@/mocks/data";
import { layoutTree } from "./tree-layout";
import { TreeConnectorLines } from "./TreeConnectorLines";
import { TreeNodeCard } from "./TreeNodeCard";
import type { TreeNode } from "@/types";

export function WorkTree({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();

  const nodes = treeNodes.filter((n) => n.workspaceId === workspaceId);

  if (nodes.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">
        No phases or tasks in this workspace yet.
      </div>
    );
  }

  const layout = layoutTree(nodes);

  // Helper to determine if a node is a leaf (no children in this workspace)
  const hasChildren = (id: string) => {
    return nodes.some((n) => n.parentId === id);
  };

  const handleNodeClick = (node: TreeNode) => {
    if (!hasChildren(node.id)) {
      router.push(`/workspace/${workspaceId}/board?treeNode=${node.id}`);
    }
  };

  return (
    <div className="relative overflow-auto min-h-[60vh]">
      <div
        className="relative mx-auto"
        style={{ width: layout.width, height: layout.height }}
      >
        <div className="absolute inset-0 z-0">
          <TreeConnectorLines
            connections={layout.connections}
            width={layout.width}
            height={layout.height}
          />
        </div>
        {layout.nodes.map((box) => {
          const node = nodes.find((n) => n.id === box.id);
          if (!node) return null;
          return (
            <div
              key={box.id}
              className="absolute z-10"
              style={{
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
              }}
            >
              <TreeNodeCard node={node} onClick={() => handleNodeClick(node)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

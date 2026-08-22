import type { TreeNode } from "@/types";

export type LayoutBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutResult = {
  nodes: LayoutBox[];
  connections: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }>;
  width: number;
  height: number;
};

const CARD_WIDTH = 220;
const CARD_HEIGHT = 88;
const HORIZONTAL_GAP = 48;
const VERTICAL_GAP = 56;
const PADDING = 24;

export function layoutTree(nodes: TreeNode[]): LayoutResult {
  if (nodes.length === 0) {
    return { nodes: [], connections: [], width: 0, height: 0 };
  }

  // 1. Build adjacency list
  const childrenMap = new Map<string, TreeNode[]>();
  nodes.forEach((node) => {
    childrenMap.set(node.id, []);
  });

  const roots: TreeNode[] = [];

  nodes.forEach((node) => {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      if (!childrenMap.has(node.parentId)) {
        // Parent might not be in the workspace? Safe guard.
        roots.push(node);
      } else {
        childrenMap.get(node.parentId)!.push(node);
      }
    }
  });

  // Calculate width required for each subtree
  const nodeWidth = new Map<string, number>();

  function calcWidth(node: TreeNode): number {
    const children = childrenMap.get(node.id) || [];
    if (children.length === 0) {
      const w = CARD_WIDTH;
      nodeWidth.set(node.id, w);
      return w;
    }

    let totalChildrenWidth = 0;
    for (let i = 0; i < children.length; i++) {
      totalChildrenWidth += calcWidth(children[i]);
    }
    totalChildrenWidth += (children.length - 1) * HORIZONTAL_GAP;

    // A node's bounding box is the max of its own width and its children's total width
    const w = Math.max(CARD_WIDTH, totalChildrenWidth);
    nodeWidth.set(node.id, w);
    return w;
  }

  roots.forEach((r) => calcWidth(r));

  const layoutNodes: LayoutBox[] = [];
  const connections: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
  }> = [];

  // Assign x, y coordinates
  function assignPosition(node: TreeNode, xLeft: number, y: number) {
    const children = childrenMap.get(node.id) || [];
    const subtreeWidth = nodeWidth.get(node.id) || CARD_WIDTH;

    // Center the node within its subtree width
    const centerX = xLeft + subtreeWidth / 2;
    const nodeX = centerX - CARD_WIDTH / 2;
    const nodeY = y;

    layoutNodes.push({
      id: node.id,
      x: nodeX,
      y: nodeY,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });

    let currentChildX = xLeft;

    for (const child of children) {
      const childSubtreeWidth = nodeWidth.get(child.id) || CARD_WIDTH;

      // Calculate child center for the connection
      const childCenterX = currentChildX + childSubtreeWidth / 2;

      connections.push({
        from: { x: centerX, y: nodeY + CARD_HEIGHT },
        to: { x: childCenterX, y: nodeY + CARD_HEIGHT + VERTICAL_GAP },
      });

      assignPosition(child, currentChildX, nodeY + CARD_HEIGHT + VERTICAL_GAP);
      currentChildX += childSubtreeWidth + HORIZONTAL_GAP;
    }
  }

  let currentRootX = PADDING;
  roots.forEach((r) => {
    const w = nodeWidth.get(r.id) || CARD_WIDTH;
    assignPosition(r, currentRootX, PADDING);
    currentRootX += w + HORIZONTAL_GAP;
  });

  // Find max bounds for width and height
  let maxX = 0;
  let maxY = 0;

  layoutNodes.forEach((node) => {
    if (node.x + node.width > maxX) maxX = node.x + node.width;
    if (node.y + node.height > maxY) maxY = node.y + node.height;
  });

  return {
    nodes: layoutNodes,
    connections,
    width: maxX + PADDING,
    height: maxY + PADDING,
  };
}

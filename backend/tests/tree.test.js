const request = require("supertest");
const app = require("../src/app");
const { reset } = require("../src/store/memory.store");
const { loginAda } = require("./helpers/auth");

beforeEach(() => {
  reset();
});

describe("GET /api/workspaces/:id/tree", () => {
  it("returns 200 with an array of tree nodes for a member", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/tree")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("every node has required fields", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/tree")
      .set("Authorization", `Bearer ${token}`);

    for (const node of res.body.data) {
      expect(typeof node.id).toBe("string");
      expect(node.workspaceId).toBe("ws-website");
      expect(typeof node.name).toBe("string");
      expect(typeof node.completion).toBe("number");
      // parentId may be null or string
      expect(node.parentId === null || typeof node.parentId === "string").toBe(true);
    }
  });

  it("parent nodes appear before their children (sorted)", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/tree")
      .set("Authorization", `Bearer ${token}`);

    const nodes = res.body.data;
    const seen = new Set();
    for (const node of nodes) {
      if (node.parentId !== null) {
        // Parent must have been seen already
        expect(seen.has(node.parentId)).toBe(true);
      }
      seen.add(node.id);
    }
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/workspaces/ws-website/tree");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/workspaces/:id/tree — create node", () => {
  it("creates a root node (parentId omitted)", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .post("/api/workspaces/ws-website/tree")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Phase" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("New Phase");
    expect(res.body.data.parentId).toBeNull();
    expect(res.body.data.workspaceId).toBe("ws-website");
  });

  it("creates a child node with valid parentId", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .post("/api/workspaces/ws-website/tree")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Sub-phase", parentId: "tn-design" });

    expect(res.status).toBe(201);
    expect(res.body.data.parentId).toBe("tn-design");
  });
});

describe("DELETE /api/tree-nodes/:nodeId", () => {
  it("returns 409 when deleting a parent node that has children", async () => {
    const token = await loginAda(app);
    // tn-design has children: tn-wireframes, tn-ui-kit, tn-prototypes
    const res = await request(app)
      .delete("/api/tree-nodes/tn-design")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NODE_HAS_CHILDREN");
  });

  it("deletes a leaf node successfully", async () => {
    const token = await loginAda(app);

    // First move all tasks off tn-wireframes so it's deletable
    // (seed has tasks on tn-wireframes — delete them first)
    const tasksRes = await request(app)
      .get("/api/workspaces/ws-website/tasks?treeNode=tn-wireframes")
      .set("Authorization", `Bearer ${token}`);

    for (const task of tasksRes.body.data) {
      await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set("Authorization", `Bearer ${token}`);
    }

    const res = await request(app)
      .delete("/api/tree-nodes/tn-wireframes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 409 when node has tasks and no children", async () => {
    const token = await loginAda(app);
    // tn-wireframes has tasks but no children — cannot delete without removing tasks first
    const res = await request(app)
      .delete("/api/tree-nodes/tn-wireframes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("NODE_HAS_TASKS");
  });

  it("returns 404 for an unknown node", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .delete("/api/tree-nodes/tn-does-not-exist")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

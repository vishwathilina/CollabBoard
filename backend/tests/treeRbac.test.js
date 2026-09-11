const request = require("supertest");
const app = require("../src/app");
const { clearTestDb, seedTestDb } = require("./helpers/db");
const { loginAda, loginLinus, loginAs } = require("./helpers/auth");

beforeEach(async () => {
  await clearTestDb();
  await seedTestDb();
});

describe("Tree RBAC Filtering — GET /api/workspaces/:id/tree", () => {
  it("Ada (Owner / Senior PM) sees the full tree for ws-website", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/tree")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const nodeIds = res.body.data.map((n) => n.id);
    // Ada should see all 9 nodes in ws-website
    expect(nodeIds).toContain("tn-website");
    expect(nodeIds).toContain("tn-design");
    expect(nodeIds).toContain("tn-wireframes");
    expect(nodeIds).toContain("tn-ui-kit");
    expect(nodeIds).toContain("tn-prototypes");
    expect(nodeIds).toContain("tn-engineering");
    expect(nodeIds).toContain("tn-api");
    expect(nodeIds).toContain("tn-frontend");
    expect(nodeIds).toContain("tn-content");
    expect(nodeIds.length).toBe(9);
  });

  it("Linus (Developer) tree omits Design phase and Content nodes", async () => {
    const token = await loginLinus(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/tree")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const nodeIds = res.body.data.map((n) => n.id);

    // Visible: visibleTreeNodeIds (tn-engineering, tn-api, tn-frontend) + ancestor (tn-website)
    expect(nodeIds).toContain("tn-website");
    expect(nodeIds).toContain("tn-engineering");
    expect(nodeIds).toContain("tn-api");
    expect(nodeIds).toContain("tn-frontend");

    // Omitted: Design phase, wireframes, ui kit, prototypes, content
    expect(nodeIds).not.toContain("tn-design");
    expect(nodeIds).not.toContain("tn-wireframes");
    expect(nodeIds).not.toContain("tn-ui-kit");
    expect(nodeIds).not.toContain("tn-prototypes");
    expect(nodeIds).not.toContain("tn-content");
    expect(nodeIds.length).toBe(4);
  });

  it("returns 403 when user is not a member of the workspace", async () => {
    // Linus is not a member of ws-mobile
    const token = await loginLinus(app);
    const res = await request(app)
      .get("/api/workspaces/ws-mobile/tree")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("Tree Mutations RBAC — POST/PATCH/DELETE", () => {
  it("Linus (Developer) cannot create tree nodes (returns 403)", async () => {
    const token = await loginLinus(app);
    const res = await request(app)
      .post("/api/workspaces/ws-website/tree")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dev Rogue Node", parentId: "tn-engineering" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("Grace (PM) can create a tree node (returns 201)", async () => {
    const token = await loginAs(app, "grace@collabboard.local", "CollabBoard!1");
    const res = await request(app)
      .post("/api/workspaces/ws-website/tree")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Testing Phase", parentId: "tn-website" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Testing Phase");
  });

  it("Linus (Developer) cannot update tree nodes (returns 403)", async () => {
    const token = await loginLinus(app);
    const res = await request(app)
      .patch("/api/tree-nodes/tn-engineering")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Renamed by Dev" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("Ada (Owner) can update tree nodes (returns 200)", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .patch("/api/tree-nodes/tn-engineering")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Core Engineering" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Core Engineering");
  });

  it("Linus (Developer) cannot delete tree nodes (returns 403)", async () => {
    const token = await loginLinus(app);
    const res = await request(app)
      .delete("/api/tree-nodes/tn-api")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("Single Tree Node Access & Task Query RBAC", () => {
  it("Linus can GET visible node tn-engineering (returns 200)", async () => {
    const token = await loginLinus(app);
    const res = await request(app)
      .get("/api/tree-nodes/tn-engineering")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("tn-engineering");
  });

  it("Linus cannot GET out-of-scope node tn-design (returns 403)", async () => {
    const token = await loginLinus(app);
    const res = await request(app)
      .get("/api/tree-nodes/tn-design")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("Linus querying tasks with forbidden treeNode (?treeNode=tn-design) returns 403", async () => {
    const token = await loginLinus(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/tasks?treeNode=tn-design")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("Linus querying tasks with visible treeNode (?treeNode=tn-api) returns 200", async () => {
    const token = await loginLinus(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/tasks?treeNode=tn-api")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

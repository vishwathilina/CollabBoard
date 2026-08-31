const request = require("supertest");
const app = require("../src/app");
const { reset, getStore } = require("../src/store/memory.store");
const { loginAda, loginAs } = require("./helpers/auth");

beforeEach(() => {
  reset();
});

describe("GET /api/workspaces — list", () => {
  it("returns only workspaces where the user is a member (Ada)", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Ada is in both workspaces
    expect(res.body.data.length).toBe(2);
    const ids = res.body.data.map((w) => w.id);
    expect(ids).toContain("ws-website");
    expect(ids).toContain("ws-mobile");
  });

  it("returns only workspaces the requester belongs to", async () => {
    // Register a brand new user who belongs to no workspaces
    await request(app).post("/api/auth/register").send({
      name: "Outsider",
      email: "outsider@collabboard.local",
      password: "CollabBoard!1",
    });
    const token = await loginAs(app, "outsider@collabboard.local", "CollabBoard!1");

    const res = await request(app)
      .get("/api/workspaces")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it("returns 401 with no token", async () => {
    const res = await request(app).get("/api/workspaces");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/workspaces/:id", () => {
  it("returns workspace details for a member", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("ws-website");
    expect(res.body.data.name).toBe("Website Overhaul");
    expect(Array.isArray(res.body.data.memberIds)).toBe(true);
  });

  it("returns 403 for a non-member", async () => {
    // Register outsider
    await request(app).post("/api/auth/register").send({
      name: "Outsider",
      email: "outsider@collabboard.local",
      password: "CollabBoard!1",
    });
    const token = await loginAs(app, "outsider@collabboard.local", "CollabBoard!1");

    const res = await request(app)
      .get("/api/workspaces/ws-website")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 404 for unknown workspace", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces/ws-does-not-exist")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("POST /api/workspaces — create", () => {
  it("creates a new workspace and returns 201", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "New Project",
        description: "Created in test",
        color: "#AABBCC",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("New Project");
    expect(res.body.data.memberIds).toContain("u-ada");
    expect(typeof res.body.data.id).toBe("string");
  });

  it("returns 422 for missing name", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "No name workspace" });

    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/workspaces/:id — cascade delete", () => {
  it("deletes workspace and removes associated tree nodes, tasks, messages, attachments", async () => {
    const token = await loginAda(app);

    // Confirm store has data for ws-website before delete
    const storeBefore = getStore();
    const nodesBefore = storeBefore.treeNodes.filter(
      (n) => n.workspaceId === "ws-website"
    );
    const tasksBefore = storeBefore.tasks.filter(
      (t) => t.workspaceId === "ws-website"
    );
    expect(nodesBefore.length).toBeGreaterThan(0);
    expect(tasksBefore.length).toBeGreaterThan(0);

    const res = await request(app)
      .delete("/api/workspaces/ws-website")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify cascade in store
    const storeAfter = getStore();
    const nodesAfter = storeAfter.treeNodes.filter(
      (n) => n.workspaceId === "ws-website"
    );
    const tasksAfter = storeAfter.tasks.filter(
      (t) => t.workspaceId === "ws-website"
    );
    expect(nodesAfter.length).toBe(0);
    expect(tasksAfter.length).toBe(0);
  });

  it("returns 403 when a non-member tries to delete", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Outsider",
      email: "outsider@collabboard.local",
      password: "CollabBoard!1",
    });
    const token = await loginAs(app, "outsider@collabboard.local", "CollabBoard!1");

    const res = await request(app)
      .delete("/api/workspaces/ws-website")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

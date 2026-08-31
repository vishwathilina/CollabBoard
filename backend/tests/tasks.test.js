const request = require("supertest");
const app = require("../src/app");
const { reset, getStore } = require("../src/store/memory.store");
const { loginAda, loginAs } = require("./helpers/auth");

beforeEach(() => {
  reset();
});

describe("GET /api/workspaces/:id/tasks", () => {
  it("returns all tasks for a workspace member", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/tasks")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const task of res.body.data) {
      expect(task.workspaceId).toBe("ws-website");
    }
  });

  it("filters tasks by ?treeNode=tn-design", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/tasks?treeNode=tn-design")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    for (const task of res.body.data) {
      expect(task.treeNodeId).toBe("tn-design");
    }
  });

  it("returns 403 for non-member", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Outsider",
      email: "outsider@collabboard.local",
      password: "CollabBoard!1",
    });
    const token = await loginAs(app, "outsider@collabboard.local", "CollabBoard!1");

    const res = await request(app)
      .get("/api/workspaces/ws-website/tasks")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/tasks/:taskId/move", () => {
  it("moves a task to a new column and increments version", async () => {
    const token = await loginAda(app);

    // Get initial task
    const storeBefore = getStore();
    const task = storeBefore.tasks.find((t) => t.workspaceId === "ws-website");
    expect(task).toBeDefined();
    
    const initialVersion = task.version;

    const targetColumn =
      task.column === "todo" ? "in_progress" : "todo";

    const res = await request(app)
      .patch(`/api/tasks/${task.id}/move`)
      .set("Authorization", `Bearer ${token}`)
      .send({ column: targetColumn });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.column).toBe(targetColumn);
    expect(res.body.data.version).toBe(initialVersion + 1);
  });

  it("returns 422 for an invalid column value", async () => {
    const token = await loginAda(app);
    const store = getStore();
    const task = store.tasks.find((t) => t.workspaceId === "ws-website");

    const res = await request(app)
      .patch(`/api/tasks/${task.id}/move`)
      .set("Authorization", `Bearer ${token}`)
      .send({ column: "invalid_column" });

    expect(res.status).toBe(422);
  });
});

describe("PATCH /api/tasks/:taskId — version conflict", () => {
  it("returns 409 when version in body does not match current", async () => {
    const token = await loginAda(app);
    const store = getStore();
    const task = store.tasks.find(
      (t) => t.workspaceId === "ws-website" && t.column !== "done"
    );
    expect(task).toBeDefined();

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Conflict update",
        version: 9999, // stale version
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("updates successfully when version matches", async () => {
    const token = await loginAda(app);
    const store = getStore();
    const task = store.tasks.find((t) => t.workspaceId === "ws-website");
    const initialVersion = task.version;

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Updated Title",
        version: initialVersion,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Updated Title");
    expect(res.body.data.version).toBe(initialVersion + 1);
  });
});

describe("POST /api/workspaces/:id/tasks — create", () => {
  it("creates a task in the workspace", async () => {
    const token = await loginAda(app);

    const res = await request(app)
      .post("/api/workspaces/ws-website/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({
        treeNodeId: "tn-wireframes",
        column: "todo",
        title: "New test task",
        description: "Created by test",
        priority: "medium",
        memberIds: ["u-ada"],
        startDate: "2026-09-01T00:00:00.000Z",
        dueDate: "2026-09-15T00:00:00.000Z",
        completion: 0,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("New test task");
    expect(res.body.data.workspaceId).toBe("ws-website");
    expect(res.body.data.version).toBe(1);
  });
});

describe("DELETE /api/tasks/:taskId", () => {
  it("deletes a task and returns 200", async () => {
    const token = await loginAda(app);
    const store = getStore();
    const task = store.tasks.find((t) => t.workspaceId === "ws-website");

    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
    expect(res.body.data.id).toBe(task.id);
  });
});

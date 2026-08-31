const request = require("supertest");
const app = require("../src/app");
const { reset, getStore } = require("../src/store/memory.store");
const { loginAda, loginAs } = require("./helpers/auth");

beforeEach(() => {
  reset();
});

// Helper: get a task that has messages in seed
function getSeededTaskWithMessages() {
  const store = getStore();
  const taskIds = new Set(store.messages.map((m) => m.taskId));
  return store.tasks.find(
    (t) => taskIds.has(t.id) && t.workspaceId === "ws-website"
  );
}

describe("GET /api/tasks/:taskId/messages", () => {
  it("returns 200 with message array for a workspace member", async () => {
    const token = await loginAda(app);
    const task = getSeededTaskWithMessages();
    expect(task).toBeDefined();

    const res = await request(app)
      .get(`/api/tasks/${task.id}/messages`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    for (const msg of res.body.data) {
      expect(msg.taskId).toBe(task.id);
      expect(typeof msg.id).toBe("string");
      expect(typeof msg.text).toBe("string");
      expect(typeof msg.authorId).toBe("string");
      expect(typeof msg.createdAt).toBe("string");
    }
  });

  it("returns 401 with no token", async () => {
    const task = getSeededTaskWithMessages();
    const res = await request(app).get(`/api/tasks/${task.id}/messages`);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/tasks/:taskId/messages", () => {
  it("posts a message and it appears in the list", async () => {
    const token = await loginAda(app);
    const store = getStore();
    const task = store.tasks.find((t) => t.workspaceId === "ws-website");

    const res = await request(app)
      .post(`/api/tasks/${task.id}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Hello from test!" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.text).toBe("Hello from test!");
    expect(res.body.data.authorId).toBe("u-ada");
    expect(res.body.data.taskId).toBe(task.id);

    // Verify it appears in list
    const listRes = await request(app)
      .get(`/api/tasks/${task.id}/messages`)
      .set("Authorization", `Bearer ${token}`);

    const found = listRes.body.data.find(
      (m) => m.text === "Hello from test!"
    );
    expect(found).toBeDefined();
  });

  it("returns 422 for empty text", async () => {
    const token = await loginAda(app);
    const store = getStore();
    const task = store.tasks.find((t) => t.workspaceId === "ws-website");

    const res = await request(app)
      .post(`/api/tasks/${task.id}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "" });

    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/messages/:messageId", () => {
  it("allows the author to delete their own message", async () => {
    const token = await loginAda(app);
    const store = getStore();
    const task = store.tasks.find((t) => t.workspaceId === "ws-website");

    // Post a message as Ada
    const postRes = await request(app)
      .post(`/api/tasks/${task.id}/messages`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Message to be deleted" });
    const messageId = postRes.body.data.id;

    const deleteRes = await request(app)
      .delete(`/api/messages/${messageId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);
    expect(deleteRes.body.data.id).toBe(messageId);
  });

  it("returns 403 when a different user tries to delete", async () => {
    const adaToken = await loginAda(app);
    const store = getStore();
    const task = store.tasks.find((t) => t.workspaceId === "ws-website");

    // Ada posts a message
    const postRes = await request(app)
      .post(`/api/tasks/${task.id}/messages`)
      .set("Authorization", `Bearer ${adaToken}`)
      .send({ text: "Ada's message" });
    const messageId = postRes.body.data.id;

    // Linus tries to delete it
    const linusToken = await loginAs(
      app,
      "linus@collabboard.local",
      "CollabBoard!1"
    );
    const deleteRes = await request(app)
      .delete(`/api/messages/${messageId}`)
      .set("Authorization", `Bearer ${linusToken}`);

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 404 for a non-existent message", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .delete("/api/messages/msg-does-not-exist")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

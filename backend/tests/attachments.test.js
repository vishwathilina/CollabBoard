const request = require("supertest");
const app = require("../src/app");
const { clearTestDb, seedTestDb } = require("./helpers/db");
const { getStore } = require("../src/store/memory.store");
const { loginAda, loginAs } = require("./helpers/auth");

beforeEach(async () => {
  await clearTestDb();
  await seedTestDb();
});

function getSeededTaskWithAttachments() {
  const store = getStore();
  const taskIds = new Set(store.attachments.map((a) => a.taskId));
  return store.tasks.find(
    (t) => taskIds.has(t.id) && t.workspaceId === "ws-website"
  );
}

describe("GET /api/tasks/:taskId/attachments", () => {
  it("returns 200 with attachment array for a workspace member", async () => {
    const token = await loginAda(app);
    const task = getSeededTaskWithAttachments();
    expect(task).toBeDefined();

    const res = await request(app)
      .get(`/api/tasks/${task.id}/attachments`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    for (const att of res.body.data) {
      expect(att.taskId).toBe(task.id);
      expect(typeof att.id).toBe("string");
      expect(typeof att.name).toBe("string");
      expect(typeof att.type).toBe("string");
      expect(typeof att.url).toBe("string");
      expect(typeof att.addedBy).toBe("string");
    }
  });

  it("returns 401 with no token", async () => {
    const task = getSeededTaskWithAttachments();
    const res = await request(app).get(`/api/tasks/${task.id}/attachments`);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/tasks/:taskId/attachments", () => {
  it("creates an attachment with valid fields and fileKey", async () => {
    const token = await loginAda(app);
    const store = getStore();
    const task = store.tasks.find((t) => t.workspaceId === "ws-website");

    const res = await request(app)
      .post(`/api/tasks/${task.id}/attachments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "test-diagram.png",
        type: "image",
        url: "https://utfs.io/f/test-key.png",
        fileKey: "test-key.png",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("test-diagram.png");
    expect(res.body.data.type).toBe("image");
    expect(res.body.data.url).toBe("https://utfs.io/f/test-key.png");
    expect(res.body.data.fileKey).toBe("test-key.png");
    expect(res.body.data.addedBy).toBe("u-ada");

    // Verify it appears in the list
    const listRes = await request(app)
      .get(`/api/tasks/${task.id}/attachments`)
      .set("Authorization", `Bearer ${token}`);

    const found = listRes.body.data.find(
      (a) => a.url === "https://utfs.io/f/test-key.png"
    );
    expect(found).toBeDefined();
  });

  it("returns 422 for invalid type", async () => {
    const token = await loginAda(app);
    const store = getStore();
    const task = store.tasks.find((t) => t.workspaceId === "ws-website");

    const res = await request(app)
      .post(`/api/tasks/${task.id}/attachments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "bad.exe",
        type: "executable",
        url: "http://example.com/bad.exe",
      });

    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/attachments/:attachmentId", () => {
  it("allows uploader to delete own attachment", async () => {
    const token = await loginAda(app);
    const store = getStore();
    const task = store.tasks.find((t) => t.workspaceId === "ws-website");

    // Create attachment as Ada
    const postRes = await request(app)
      .post(`/api/tasks/${task.id}/attachments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "to-delete.pdf",
        type: "pdf",
        url: "https://utfs.io/f/delete-me.pdf",
      });
    const attachmentId = postRes.body.data.id;

    const deleteRes = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);
    expect(deleteRes.body.data.id).toBe(attachmentId);
  });

  it("returns 403 when another non-admin user tries to delete", async () => {
    // Linus creates an attachment
    const linusToken = await loginAs(
      app,
      "linus@collabboard.local",
      "CollabBoard!1"
    );
    const store = getStore();
    const task = store.tasks.find((t) => t.workspaceId === "ws-website");

    const postRes = await request(app)
      .post(`/api/tasks/${task.id}/attachments`)
      .set("Authorization", `Bearer ${linusToken}`)
      .send({
        name: "linus-doc.pdf",
        type: "pdf",
        url: "https://utfs.io/f/linus-doc.pdf",
      });
    const attachmentId = postRes.body.data.id;

    // Alan (another developer) tries to delete it
    const alanToken = await loginAs(
      app,
      "alan@collabboard.local",
      "CollabBoard!1"
    );
    const deleteRes = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("Authorization", `Bearer ${alanToken}`);

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 404 for non-existent attachment", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .delete("/api/attachments/att-does-not-exist")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

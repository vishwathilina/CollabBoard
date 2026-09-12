const request = require("supertest");
const app = require("../src/app");
const { clearTestDb, seedTestDb } = require("./helpers/db");
const { loginAda, loginLinus, loginAs } = require("./helpers/auth");

beforeEach(async () => {
  await clearTestDb();
  await seedTestDb();
});

describe("Workspace Chat API (Member 7B)", () => {
  const workspaceId = "ws-website";

  describe("GET /api/workspaces/:id/chat", () => {
    it("returns 200 and empty list initially for workspace", async () => {
      const token = await loginAda(app);
      const res = await request(app)
        .get(`/api/workspaces/${workspaceId}/chat`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("returns 401 when unauthenticated", async () => {
      const res = await request(app).get(`/api/workspaces/${workspaceId}/chat`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 404 for non-existent workspace", async () => {
      const token = await loginAda(app);
      const res = await request(app)
        .get("/api/workspaces/ws-nonexistent/chat")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/workspaces/:id/chat", () => {
    it("allows a workspace member to post a message", async () => {
      const token = await loginLinus(app);
      const res = await request(app)
        .post(`/api/workspaces/${workspaceId}/chat`)
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "Hello from Linus in workspace chat!" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.text).toBe("Hello from Linus in workspace chat!");
      expect(res.body.data.workspaceId).toBe(workspaceId);
      expect(res.body.data.authorId).toBe("u-linus");
      expect(res.body.data.author).toBeDefined();
      expect(res.body.data.author.name).toBe("Linus Torvalds");

      // Verify it appears in the chat list
      const listRes = await request(app)
        .get(`/api/workspaces/${workspaceId}/chat`)
        .set("Authorization", `Bearer ${token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some((m) => m.text === "Hello from Linus in workspace chat!")).toBe(true);
    });

    it("returns 422 if text is empty or missing", async () => {
      const token = await loginAda(app);
      const res = await request(app)
        .post(`/api/workspaces/${workspaceId}/chat`)
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "" });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it("returns 403 when user with 'viewer' role tries to post", async () => {
      const token = await loginAs(app, "tim@collabboard.local", "CollabBoard!1");

      const res = await request(app)
        .post(`/api/workspaces/${workspaceId}/chat`)
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "I am a viewer trying to post!" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });
});

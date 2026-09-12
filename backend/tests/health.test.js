const request = require("supertest");
const app = require("../src/app");
const { clearTestDb, seedTestDb } = require("./helpers/db");
const { User } = require("../src/models/User");
const { Workspace } = require("../src/models/Workspace");
const { TreeNode } = require("../src/models/TreeNode");
const { Task } = require("../src/models/Task");
const { Message } = require("../src/models/Message");
const { Attachment } = require("../src/models/Attachment");

beforeEach(async () => {
  await clearTestDb();
  await seedTestDb();
});

describe("GET /api/health", () => {
  it("returns 200 with envelope, mongo store, and connected status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(typeof res.body.data.uptime).toBe("number");
    expect(res.body.data.store).toBe("mongo");
    expect(res.body.data.mongo).toBe("connected");
    expect(res.body.data.mongoReadyState).toBe(1);
    expect(new Date(res.body.data.timestamp).toISOString()).toBe(res.body.data.timestamp);
  });

  it("returns 404 envelope for unknown route", async () => {
    const res = await request(app).get("/api/unknown");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("mongo store seed", () => {
  it("loads seed data into MongoDB with expected counts", async () => {
    const [users, workspaces, treeNodes, tasks, messages, attachments] = await Promise.all([
      User.countDocuments(),
      Workspace.countDocuments(),
      TreeNode.countDocuments(),
      Task.countDocuments(),
      Message.countDocuments(),
      Attachment.countDocuments(),
    ]);

    expect(users).toBe(8);
    expect(workspaces).toBe(2);
    expect(treeNodes).toBe(12);
    expect(tasks).toBe(26);
    expect(messages).toBe(17);
    expect(attachments).toBe(11);
  });
});

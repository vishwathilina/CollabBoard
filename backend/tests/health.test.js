const request = require("supertest");
const app = require("../src/app");
const { reset } = require("../src/store/memory.store");

beforeEach(() => {
  reset();
});

describe("GET /api/health", () => {
  it("returns 200 with envelope and memory store", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(typeof res.body.data.uptime).toBe("number");
    expect(res.body.data.store).toBe("memory");
    expect(new Date(res.body.data.timestamp).toISOString()).toBe(res.body.data.timestamp);
  });

  it("returns 404 envelope for unknown route", async () => {
    const res = await request(app).get("/api/unknown");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("store", () => {
  it("seed loaded with expected counts", () => {
    const { getStore } = require("../src/store/memory.store");
    const store = getStore();
    expect(store.users.length).toBe(8);
    expect(store.workspaces.length).toBe(2);
    expect(store.treeNodes.length).toBe(12);
    expect(store.tasks.length).toBe(26);
    expect(store.messages.length).toBe(17);
    expect(store.attachments.length).toBe(11);
  });
});

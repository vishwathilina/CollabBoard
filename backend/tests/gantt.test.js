const request = require("supertest");
const app = require("../src/app");
const { reset } = require("../src/store/memory.store");
const { loginAda } = require("./helpers/auth");

const MIN_BAR_PERCENT = 4;

beforeEach(() => {
  reset();
});

describe("GET /api/workspaces/:id/gantt", () => {
  it("returns 200 with valid gantt structure", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/gantt")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(typeof data.axisStart).toBe("string");
    expect(typeof data.axisEnd).toBe("string");
    expect(Array.isArray(data.ticks)).toBe(true);
    expect(Array.isArray(data.groups)).toBe(true);
    expect(data.groups.length).toBeGreaterThan(0);
  });

  it("axis dates are valid ISO strings", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/gantt")
      .set("Authorization", `Bearer ${token}`);

    const { axisStart, axisEnd } = res.body.data;
    expect(new Date(axisStart).toISOString()).toBe(axisStart);
    expect(new Date(axisEnd).toISOString()).toBe(axisEnd);
    expect(new Date(axisEnd) > new Date(axisStart)).toBe(true);
  });

  it("each group has treeNode and items array", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/gantt")
      .set("Authorization", `Bearer ${token}`);

    for (const group of res.body.data.groups) {
      // treeNode may be null for orphans, otherwise an object
      expect(group.treeNode === null || typeof group.treeNode === "object").toBe(
        true
      );
      expect(Array.isArray(group.items)).toBe(true);
    }
  });

  it("each bar item has leftPercent and widthPercent in valid range", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/gantt")
      .set("Authorization", `Bearer ${token}`);

    for (const group of res.body.data.groups) {
      for (const item of group.items) {
        expect(typeof item.leftPercent).toBe("number");
        expect(typeof item.widthPercent).toBe("number");
        expect(item.leftPercent).toBeGreaterThanOrEqual(0);
        expect(item.leftPercent).toBeLessThanOrEqual(100);
        expect(item.widthPercent).toBeGreaterThanOrEqual(MIN_BAR_PERCENT);
        expect(item.leftPercent + item.widthPercent).toBeLessThanOrEqual(100 + 0.001); // float tolerance
        expect(item.task).toBeDefined();
        expect(typeof item.task.id).toBe("string");
      }
    }
  });

  it("sum logic: leftPercent + widthPercent never exceeds 100 (with float tolerance)", async () => {
    const token = await loginAda(app);
    const res = await request(app)
      .get("/api/workspaces/ws-website/gantt")
      .set("Authorization", `Bearer ${token}`);

    for (const group of res.body.data.groups) {
      for (const item of group.items) {
        const sum = item.leftPercent + item.widthPercent;
        expect(sum).toBeLessThanOrEqual(100.01);
      }
    }
  });

  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/workspaces/ws-website/gantt");
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-member", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Outsider",
      email: "outsider@collabboard.local",
      password: "CollabBoard!1",
    });
    const { loginAs } = require("./helpers/auth");
    const token = await loginAs(app, "outsider@collabboard.local", "CollabBoard!1");

    const res = await request(app)
      .get("/api/workspaces/ws-website/gantt")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

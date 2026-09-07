const request = require("supertest");
const app = require("../src/app");
const { reset, getStore } = require("../src/store/memory.store");
const { loginAda, loginLinus, loginAs } = require("./helpers/auth");
const {
  getMembership,
  assertCan,
  filterTreeNodeIds,
  filterTreeNodes,
  canMoveTask,
} = require("../src/services/rbac.service");

beforeEach(() => {
  reset();
});

describe("RBAC Helper Functions", () => {
  const dummyWorkspace = {
    id: "ws-test",
    ownerId: "u-ada",
    members: [
      { userId: "u-ada", role: "owner" },
      { userId: "u-grace", role: "project_manager" },
      {
        userId: "u-linus",
        role: "developer",
        visibleTreeNodeIds: ["tn-engineering", "tn-api"],
      },
      { userId: "u-dennis", role: "qa" },
      { userId: "u-tim", role: "viewer" },
    ],
  };

  const dummyNodes = [
    { id: "tn-root", parentId: null, name: "Root" },
    { id: "tn-design", parentId: "tn-root", name: "Design" },
    { id: "tn-engineering", parentId: "tn-root", name: "Engineering" },
    { id: "tn-api", parentId: "tn-engineering", name: "API" },
    { id: "tn-frontend", parentId: "tn-engineering", name: "Frontend" },
  ];

  it("getMembership returns correct role for members and owner privileges for SPM", () => {
    const linusMembership = getMembership(dummyWorkspace, "u-linus");
    expect(linusMembership).toBeDefined();
    expect(linusMembership.role).toBe("developer");
    expect(linusMembership.visibleTreeNodeIds).toContain("tn-engineering");

    // Senior PM gets virtual owner
    const spmUser = { id: "u-outsider-spm", orgRole: "senior_project_manager" };
    const spmMembership = getMembership(dummyWorkspace, spmUser);
    expect(spmMembership.role).toBe("owner");

    // Unknown user gets null
    expect(getMembership(dummyWorkspace, "u-unknown")).toBeNull();
  });

  it("assertCan enforces permission matrix", () => {
    const developerUser = { id: "u-linus", orgRole: "developer" };
    const spmUser = { id: "u-ada", orgRole: "senior_project_manager" };
    const viewerUser = { id: "u-tim", orgRole: "viewer" };

    // Developer cannot create workspace
    expect(() => assertCan(developerUser, null, "workspace:create")).toThrow();

    // SPM can create workspace
    expect(() => assertCan(spmUser, null, "workspace:create")).not.toThrow();

    // Developer cannot manage members
    expect(() =>
      assertCan(developerUser, dummyWorkspace, "members:manage")
    ).toThrow();

    // Viewer cannot post chat
    expect(() => assertCan(viewerUser, dummyWorkspace, "chat:post")).toThrow();

    // Developer can post chat
    expect(() =>
      assertCan(developerUser, dummyWorkspace, "chat:post")
    ).not.toThrow();
  });

  it("filterTreeNodeIds includes allowed nodes, ancestors, and descendants for developer", () => {
    const linusMembership = getMembership(dummyWorkspace, "u-linus");
    const visibleIds = filterTreeNodeIds(linusMembership, dummyNodes);

    // Should include allowed nodes
    expect(visibleIds).toContain("tn-engineering");
    expect(visibleIds).toContain("tn-api");

    // Should include ancestor "tn-root"
    expect(visibleIds).toContain("tn-root");

    // Should include descendants under "tn-engineering"
    expect(visibleIds).toContain("tn-frontend");

    // Should NOT include "tn-design"
    expect(visibleIds).not.toContain("tn-design");
  });

  it("filterTreeNodeIds returns all nodes for owner, PM, QA, and Viewer", () => {
    const qaMembership = getMembership(dummyWorkspace, "u-dennis");
    const qaVisibleIds = filterTreeNodeIds(qaMembership, dummyNodes);
    expect(qaVisibleIds.length).toBe(dummyNodes.length);

    const viewerMembership = getMembership(dummyWorkspace, "u-tim");
    const viewerVisibleIds = filterTreeNodeIds(viewerMembership, dummyNodes);
    expect(viewerVisibleIds.length).toBe(dummyNodes.length);
  });

  it("canMoveTask correctly enforces drag restrictions by role", () => {
    const qaUser = { id: "u-dennis", orgRole: "qa" };
    const devUser = { id: "u-linus", orgRole: "developer" };
    const viewerUser = { id: "u-tim", orgRole: "viewer" };
    const ownerUser = { id: "u-ada", orgRole: "senior_project_manager" };

    const scopedTask = {
      id: "t1",
      treeNodeId: "tn-api",
      memberIds: ["u-linus"],
      column: "todo",
    };
    const unscopedTask = {
      id: "t2",
      treeNodeId: "tn-design",
      memberIds: ["u-barbara"],
      column: "todo",
    };

    // Viewer cannot move tasks
    expect(canMoveTask(viewerUser, dummyWorkspace, scopedTask, "in_progress")).toBe(false);

    // QA can only move to review or done
    expect(canMoveTask(qaUser, dummyWorkspace, scopedTask, "in_progress")).toBe(false);
    expect(canMoveTask(qaUser, dummyWorkspace, scopedTask, "review")).toBe(true);
    expect(canMoveTask(qaUser, dummyWorkspace, scopedTask, "done")).toBe(true);

    // Developer can move assigned / scoped task
    expect(canMoveTask(devUser, dummyWorkspace, scopedTask, "in_progress")).toBe(true);
    // Developer cannot move unscoped task
    expect(canMoveTask(devUser, dummyWorkspace, unscopedTask, "in_progress")).toBe(false);

    // Owner can move any task
    expect(canMoveTask(ownerUser, dummyWorkspace, unscopedTask, "in_progress")).toBe(true);
  });
});

describe("RBAC Endpoints Integration", () => {
  it("Ada (SPM) lists all workspaces; Linus lists only assigned workspace", async () => {
    const adaToken = await loginAda(app);
    const adaRes = await request(app)
      .get("/api/workspaces")
      .set("Authorization", `Bearer ${adaToken}`);

    expect(adaRes.status).toBe(200);
    const adaWsIds = adaRes.body.data.map((w) => w.id);
    expect(adaWsIds).toContain("ws-website");
    expect(adaWsIds).toContain("ws-mobile");

    const linusToken = await loginLinus(app);
    const linusRes = await request(app)
      .get("/api/workspaces")
      .set("Authorization", `Bearer ${linusToken}`);

    expect(linusRes.status).toBe(200);
    const linusWsIds = linusRes.body.data.map((w) => w.id);
    expect(linusWsIds).toContain("ws-website");
    expect(linusWsIds).not.toContain("ws-mobile");
  });

  it("Linus GET foreign workspace (ws-mobile) returns 403 FORBIDDEN", async () => {
    const linusToken = await loginLinus(app);
    const res = await request(app)
      .get("/api/workspaces/ws-mobile")
      .set("Authorization", `Bearer ${linusToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("Developer cannot create workspace (returns 403 FORBIDDEN)", async () => {
    const linusToken = await loginLinus(app);
    const res = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${linusToken}`)
      .send({
        name: "Linus Rogue Workspace",
        description: "Should fail",
        color: "#123456",
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("PM / SPM can create workspace (returns 201 Created with owner role)", async () => {
    const adaToken = await loginAda(app);
    const res = await request(app)
      .post("/api/workspaces")
      .set("Authorization", `Bearer ${adaToken}`)
      .send({
        name: "Portfolio Lead WS",
        description: "Created by SPM",
        color: "#C6F135",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ownerId).toBe("u-ada");
    expect(res.body.data.members).toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: "u-ada", role: "owner" })])
    );
  });

  it("PM / SPM can invite member with role and visibleTreeNodeIds", async () => {
    const adaToken = await loginAda(app);
    const res = await request(app)
      .post("/api/workspaces/ws-mobile/members")
      .set("Authorization", `Bearer ${adaToken}`)
      .send({
        userId: "u-linus",
        role: "developer",
        visibleTreeNodeIds: ["tn-ios"],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const members = res.body.data.members;
    const linusMember = members.find((m) => m.userId === "u-linus");
    expect(linusMember).toBeDefined();
    expect(linusMember.role).toBe("developer");
    expect(linusMember.visibleTreeNodeIds).toContain("tn-ios");

    // Linus should now be able to access ws-mobile
    const linusToken = await loginLinus(app);
    const linusAccess = await request(app)
      .get("/api/workspaces/ws-mobile")
      .set("Authorization", `Bearer ${linusToken}`);
    expect(linusAccess.status).toBe(200);
  });

  it("PM / SPM can PATCH member role and visibility", async () => {
    const adaToken = await loginAda(app);
    const res = await request(app)
      .patch("/api/workspaces/ws-website/members/u-linus")
      .set("Authorization", `Bearer ${adaToken}`)
      .send({
        role: "designer",
        visibleTreeNodeIds: ["tn-design", "tn-wireframes"],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const linusMember = res.body.data.members.find((m) => m.userId === "u-linus");
    expect(linusMember.role).toBe("designer");
    expect(linusMember.visibleTreeNodeIds).toContain("tn-wireframes");
  });

  it("Non-PM member cannot invite or PATCH members (403)", async () => {
    const linusToken = await loginLinus(app);

    // Linus tries to invite
    const inviteRes = await request(app)
      .post("/api/workspaces/ws-website/members")
      .set("Authorization", `Bearer ${linusToken}`)
      .send({
        userId: "u-tim",
        role: "developer",
      });
    expect(inviteRes.status).toBe(403);

    // Linus tries to patch
    const patchRes = await request(app)
      .patch("/api/workspaces/ws-website/members/u-grace")
      .set("Authorization", `Bearer ${linusToken}`)
      .send({ role: "developer" });
    expect(patchRes.status).toBe(403);
  });
});

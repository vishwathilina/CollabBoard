const request = require("supertest");
const app = require("../src/app");
const { reset } = require("../src/store/memory.store");
const { loginAs, loginAda } = require("./helpers/auth");

beforeEach(() => {
  reset();
});

describe("POST /api/auth/register", () => {
  it("registers a new user and returns 201 with token", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "testuser@collabboard.local",
      password: "CollabBoard!1",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("testuser@collabboard.local");
    expect(res.body.data.user.name).toBe("Test User");
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("returns 409 when registering a duplicate email", async () => {
    // Ada already exists in seed
    const res = await request(app).post("/api/auth/register").send({
      name: "Ada Clone",
      email: "ada@collabboard.local",
      password: "CollabBoard!1",
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("returns 422 for missing required fields", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "missing@collabboard.local",
    });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in Ada with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "ada@collabboard.local",
      password: "CollabBoard!1",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe("u-ada");
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it("returns 401 for wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "ada@collabboard.local",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 for unknown email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@collabboard.local",
      password: "CollabBoard!1",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/auth/me", () => {
  it("returns current user with valid token", async () => {
    const token = await loginAda(app);

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("u-ada");
    expect(res.body.data.name).toBe("Ada Lovelace");
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it("returns 401 with no token", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 with malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-jwt");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/auth/logout", () => {
  it("returns 200 with valid token", async () => {
    const token = await loginAda(app);

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

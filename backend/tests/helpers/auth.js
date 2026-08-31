/**
 * Auth test helpers for Member 8 Supertest suite.
 * Usage:
 *   const { loginAda, loginAs } = require("./helpers/auth");
 *   const token = await loginAda(app);
 */
const request = require("supertest");

/**
 * Log in with given credentials, return the Bearer token string.
 * Throws if response is not 200 or token is missing.
 */
async function loginAs(app, email, password) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  if (res.status !== 200) {
    throw new Error(
      `loginAs(${email}) failed: ${res.status} ${JSON.stringify(res.body)}`
    );
  }
  const token = res.body?.data?.token;
  if (!token) {
    throw new Error(`loginAs(${email}) got 200 but no token in response`);
  }
  return token;
}

/**
 * Shortcut: log in as Ada Lovelace (the demo admin user).
 */
async function loginAda(app) {
  return loginAs(app, "ada@collabboard.local", "CollabBoard!1");
}

/**
 * Shortcut: log in as Linus Torvalds.
 */
async function loginLinus(app) {
  return loginAs(app, "linus@collabboard.local", "CollabBoard!1");
}

module.exports = { loginAs, loginAda, loginLinus };

const jwt = require("jsonwebtoken");
const env = require("../config/env");

const EXPIRES_IN = "8h";

function signToken(payload) {
  // payload: { sub, email, name }
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: EXPIRES_IN,
    algorithm: "HS256",
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
}

module.exports = { signToken, verifyToken, EXPIRES_IN };

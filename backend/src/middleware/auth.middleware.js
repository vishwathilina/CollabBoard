const { AppError } = require("../utils/AppError");
const { verifyToken } = require("../utils/tokens");
const { getStore } = require("../store/memory.store");

function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "Missing authentication token."));
  }
  const token = header.split(" ")[1];
  if (!token) {
    return next(new AppError(401, "UNAUTHORIZED", "Missing authentication token."));
  }
  try {
    const payload = verifyToken(token);
    // payload: { sub, email, name, iat, exp }
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };
    // Optional: check token deny-list for logout (stateless approach - client discards token)
    // If deny-list were implemented, check here; for this phase we keep JWT stateless.
    return next();
  } catch (err) {
    return next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token."));
  }
}

/**
 * Helper for Members 3-5: checks workspace membership
 * Usage: requireWorkspaceMember((req) => req.params.id)
 */
function requireWorkspaceMember(getWorkspaceId) {
  return (req, res, next) => {
    try {
      const workspaceId = getWorkspaceId(req);
      if (!workspaceId) {
        return next(new AppError(400, "BAD_REQUEST", "Workspace id is required."));
      }
      const { workspaces } = getStore();
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (!workspace) {
        return next(new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`));
      }
      if (!req.user || !workspace.memberIds.includes(req.user.id)) {
        return next(new AppError(403, "FORBIDDEN", "You are not a member of this workspace."));
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { protect, requireWorkspaceMember };

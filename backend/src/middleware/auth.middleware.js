const { AppError } = require("../utils/AppError");
const { verifyToken } = require("../utils/tokens");
const workspaceRepo = require("../repos/workspace.repo");
const userRepo = require("../repos/user.repo");

async function protect(req, res, next) {
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
    // payload: { sub, email, name, orgRole, iat, exp }
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      orgRole: payload.orgRole || "developer",
    };

    // If orgRole was not present in the JWT, look it up
    if (!payload.orgRole) {
      const dbUser = await userRepo.findById(req.user.id);
      if (dbUser && dbUser.orgRole) {
        req.user.orgRole = dbUser.orgRole;
      }
    }

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
  return async (req, res, next) => {
    try {
      const workspaceId = getWorkspaceId(req);
      if (!workspaceId) {
        return next(new AppError(400, "BAD_REQUEST", "Workspace id is required."));
      }

      const workspace = await workspaceRepo.findById(workspaceId);
      if (!workspace) {
        return next(
          new AppError(404, "NOT_FOUND", `Workspace '${workspaceId}' was not found.`)
        );
      }

      // Senior Project Managers and Admins have access to all workspaces
      if (
        req.user &&
        (req.user.orgRole === "senior_project_manager" || req.user.orgRole === "admin")
      ) {
        return next();
      }

      const isMember =
        (workspace.members && workspace.members.some((m) => m.userId === req.user?.id)) ||
        (workspace.memberIds && workspace.memberIds.includes(req.user?.id)) ||
        workspace.ownerId === req.user?.id;

      if (!req.user || !isMember) {
        return next(
          new AppError(403, "FORBIDDEN", "You are not a member of this workspace.")
        );
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { protect, requireWorkspaceMember };

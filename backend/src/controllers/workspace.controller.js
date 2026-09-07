const { sendSuccess } = require("../utils/apiResponse");
const workspaceService = require("../services/workspace.service");

async function listWorkspaces(req, res) {
  const workspaces = await workspaceService.listForUser(req.user);
  return sendSuccess(res, workspaces, 200, { count: workspaces.length });
}

async function getWorkspace(req, res) {
  const { id } = req.params;
  const workspace = await workspaceService.getById(id, req.user);
  return sendSuccess(res, workspace, 200);
}

async function createWorkspace(req, res) {
  const { name, description, color } = req.body;
  const workspace = await workspaceService.create(
    { name, description, color },
    req.user
  );
  return sendSuccess(res, workspace, 201);
}

async function patchWorkspace(req, res) {
  const { id } = req.params;
  const workspace = await workspaceService.patch(id, req.body, req.user);
  return sendSuccess(res, workspace, 200);
}

async function deleteWorkspace(req, res) {
  const { id } = req.params;
  const deleted = await workspaceService.remove(id, req.user);
  return sendSuccess(res, { id: deleted.id, deleted: true }, 200);
}

async function addMember(req, res) {
  const { id } = req.params;
  const workspace = await workspaceService.addMember(id, req.body, req.user);
  return sendSuccess(res, workspace, 200);
}

async function updateMember(req, res) {
  const { id, userId } = req.params;
  const workspace = await workspaceService.updateMember(
    id,
    userId,
    req.body,
    req.user
  );
  return sendSuccess(res, workspace, 200);
}

async function removeMember(req, res) {
  const { id, userId } = req.params;
  const workspace = await workspaceService.removeMember(id, userId, req.user);
  return sendSuccess(res, workspace, 200);
}

module.exports = {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  patchWorkspace,
  deleteWorkspace,
  addMember,
  updateMember,
  removeMember,
};

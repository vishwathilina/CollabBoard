const { sendSuccess } = require("../utils/apiResponse");
const workspaceService = require("../services/workspace.service");

function listWorkspaces(req, res) {
  const workspaces = workspaceService.listForUser(req.user.id);
  return sendSuccess(res, workspaces, 200, { count: workspaces.length });
}

function getWorkspace(req, res) {
  const { id } = req.params;
  const workspace = workspaceService.getById(id, req.user.id);
  return sendSuccess(res, workspace, 200);
}

function createWorkspace(req, res) {
  const { name, description, color } = req.body;
  const workspace = workspaceService.create({ name, description, color }, req.user.id);
  return sendSuccess(res, workspace, 201);
}

function patchWorkspace(req, res) {
  const { id } = req.params;
  const workspace = workspaceService.patch(id, req.body, req.user.id);
  return sendSuccess(res, workspace, 200);
}

function deleteWorkspace(req, res) {
  const { id } = req.params;
  const deleted = workspaceService.remove(id, req.user.id);
  return sendSuccess(res, { id: deleted.id, deleted: true }, 200);
}

function addMember(req, res) {
  const { id } = req.params;
  const { userId } = req.body;
  const workspace = workspaceService.addMember(id, userId, req.user.id);
  return sendSuccess(res, workspace, 200);
}

function removeMember(req, res) {
  const { id, userId } = req.params;
  const workspace = workspaceService.removeMember(id, userId, req.user.id);
  return sendSuccess(res, workspace, 200);
}

module.exports = {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  patchWorkspace,
  deleteWorkspace,
  addMember,
  removeMember,
};

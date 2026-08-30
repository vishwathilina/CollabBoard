const { sendSuccess } = require("../utils/apiResponse");
const treeService = require("../services/tree.service");

function listTree(req, res) {
  const { id } = req.params;
  const nodes = treeService.listTree(id, req.user.id);
  return sendSuccess(res, { nodes }, 200, { count: nodes.length });
}

function createNode(req, res) {
  const { id } = req.params;
  const { parentId, name, completion } = req.body;
  const node = treeService.createNode(id, { parentId, name, completion }, req.user.id);
  return sendSuccess(res, node, 201);
}

function getNode(req, res) {
  const { nodeId } = req.params;
  const node = treeService.getNode(nodeId, req.user.id);
  return sendSuccess(res, node, 200);
}

function patchNode(req, res) {
  const { nodeId } = req.params;
  const node = treeService.updateNode(nodeId, req.body, req.user.id);
  return sendSuccess(res, node, 200);
}

function deleteNode(req, res) {
  const { nodeId } = req.params;
  const deleted = treeService.deleteNode(nodeId, req.user.id);
  return sendSuccess(res, { id: deleted.id, deleted: true }, 200);
}

module.exports = {
  listTree,
  createNode,
  getNode,
  patchNode,
  deleteNode,
};

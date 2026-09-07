const { sendSuccess } = require("../utils/apiResponse");
const treeService = require("../services/tree.service");

async function listTree(req, res) {
  const { id } = req.params;
  const nodes = await treeService.listTree(id, req.user);
  return sendSuccess(res, nodes, 200, { count: nodes.length });
}

async function createNode(req, res) {
  const { id } = req.params;
  const { parentId, name, completion } = req.body;
  const node = await treeService.createNode(id, { parentId, name, completion }, req.user);
  return sendSuccess(res, node, 201);
}

async function getNode(req, res) {
  const { nodeId } = req.params;
  const node = await treeService.getNode(nodeId, req.user);
  return sendSuccess(res, node, 200);
}

async function patchNode(req, res) {
  const { nodeId } = req.params;
  const node = await treeService.updateNode(nodeId, req.body, req.user);
  return sendSuccess(res, node, 200);
}

async function deleteNode(req, res) {
  const { nodeId } = req.params;
  const deleted = await treeService.deleteNode(nodeId, req.user);
  return sendSuccess(res, { id: deleted.id, deleted: true }, 200);
}

module.exports = {
  listTree,
  createNode,
  getNode,
  patchNode,
  deleteNode,
};

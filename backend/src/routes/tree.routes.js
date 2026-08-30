const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { asyncHandler } = require("../middleware/asyncHandler");
const {
  workspaceIdParamSchema,
  treeNodeIdParamSchema,
  treeCreateSchema,
  treePatchSchema,
} = require("../schemas/treeNode.schema");
const treeController = require("../controllers/tree.controller");

const router = express.Router();

// Workspace-scoped tree
router.get(
  "/workspaces/:id/tree",
  protect,
  validate({ params: workspaceIdParamSchema }),
  asyncHandler(treeController.listTree)
);

router.post(
  "/workspaces/:id/tree",
  protect,
  validate({ params: workspaceIdParamSchema, body: treeCreateSchema }),
  asyncHandler(treeController.createNode)
);

// Single node operations (resolve workspace via node)
router.get(
  "/tree-nodes/:nodeId",
  protect,
  validate({ params: treeNodeIdParamSchema }),
  asyncHandler(treeController.getNode)
);

router.patch(
  "/tree-nodes/:nodeId",
  protect,
  validate({ params: treeNodeIdParamSchema, body: treePatchSchema }),
  asyncHandler(treeController.patchNode)
);

router.delete(
  "/tree-nodes/:nodeId",
  protect,
  validate({ params: treeNodeIdParamSchema }),
  asyncHandler(treeController.deleteNode)
);

module.exports = router;

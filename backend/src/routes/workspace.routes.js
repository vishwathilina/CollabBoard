const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { protect } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  workspaceCreateSchema,
  workspacePatchSchema,
  workspaceIdParamSchema,
  memberAddSchema,
  memberPatchSchema,
  memberRemoveParamSchema,
} = require("../schemas/workspace.schema");
const workspaceController = require("../controllers/workspace.controller");
const workspaceChatController = require("../controllers/workspaceChat.controller");
const { workspaceChatMessageSchema } = require("../schemas/workspaceChat.schema");

const router = express.Router();

router.use(protect);

router.get("/", asyncHandler(workspaceController.listWorkspaces));
router.post(
  "/",
  validate({ body: workspaceCreateSchema }),
  asyncHandler(workspaceController.createWorkspace)
);

router.get(
  "/:id",
  validate({ params: workspaceIdParamSchema }),
  asyncHandler(workspaceController.getWorkspace)
);
router.patch(
  "/:id",
  validate({ params: workspaceIdParamSchema, body: workspacePatchSchema }),
  asyncHandler(workspaceController.patchWorkspace)
);
router.delete(
  "/:id",
  validate({ params: workspaceIdParamSchema }),
  asyncHandler(workspaceController.deleteWorkspace)
);

router.post(
  "/:id/members",
  validate({ params: workspaceIdParamSchema, body: memberAddSchema }),
  asyncHandler(workspaceController.addMember)
);
router.patch(
  "/:id/members/:userId",
  validate({ params: memberRemoveParamSchema, body: memberPatchSchema }),
  asyncHandler(workspaceController.updateMember)
);
router.delete(
  "/:id/members/:userId",
  validate({ params: memberRemoveParamSchema }),
  asyncHandler(workspaceController.removeMember)
);

// Workspace live chat (Member 7B)
router.get(
  "/:id/chat",
  validate({ params: workspaceIdParamSchema }),
  asyncHandler(workspaceChatController.listChat)
);
router.post(
  "/:id/chat",
  validate({ params: workspaceIdParamSchema, body: workspaceChatMessageSchema }),
  asyncHandler(workspaceChatController.postChat)
);

module.exports = router;

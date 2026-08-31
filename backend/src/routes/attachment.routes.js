const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { asyncHandler } = require("../middleware/asyncHandler");
const {
  taskIdParamSchema,
  attachmentIdParamSchema,
  attachmentCreateSchema,
} = require("../schemas/attachment.schema");
const attachmentController = require("../controllers/attachment.controller");

const router = express.Router();

router.get(
  "/tasks/:taskId/attachments",
  protect,
  validate({ params: taskIdParamSchema }),
  asyncHandler(attachmentController.listAttachments)
);

router.post(
  "/tasks/:taskId/attachments",
  protect,
  validate({ params: taskIdParamSchema, body: attachmentCreateSchema }),
  asyncHandler(attachmentController.createAttachment)
);

router.delete(
  "/attachments/:attachmentId",
  protect,
  validate({ params: attachmentIdParamSchema }),
  asyncHandler(attachmentController.deleteAttachment)
);

module.exports = router;

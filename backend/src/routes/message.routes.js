const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { asyncHandler } = require("../middleware/asyncHandler");
const {
  taskIdParamSchema,
  messageIdParamSchema,
  messageCreateSchema,
} = require("../schemas/message.schema");
const messageController = require("../controllers/message.controller");

const router = express.Router();

router.get(
  "/tasks/:taskId/messages",
  protect,
  validate({ params: taskIdParamSchema }),
  asyncHandler(messageController.listMessages)
);

router.post(
  "/tasks/:taskId/messages",
  protect,
  validate({ params: taskIdParamSchema, body: messageCreateSchema }),
  asyncHandler(messageController.createMessage)
);

router.delete(
  "/messages/:messageId",
  protect,
  validate({ params: messageIdParamSchema }),
  asyncHandler(messageController.deleteMessage)
);

module.exports = router;

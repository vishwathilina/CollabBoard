const { z } = require("zod");

const taskIdParamSchema = z.object({
  taskId: z.string().min(1, "taskId is required"),
});

const messageIdParamSchema = z.object({
  messageId: z.string().min(1, "messageId is required"),
});

const messageCreateSchema = z.object({
  text: z.string().trim().min(1, "text is required").max(4000, "text must be at most 4000 characters"),
});

module.exports = {
  taskIdParamSchema,
  messageIdParamSchema,
  messageCreateSchema,
};

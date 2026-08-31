const { z } = require("zod");

const taskIdParamSchema = z.object({
  taskId: z.string().min(1, "taskId is required"),
});

const attachmentIdParamSchema = z.object({
  attachmentId: z.string().min(1, "attachmentId is required"),
});

const attachmentCreateSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  type: z.enum(["image", "pdf", "doc", "link"], {
    errorMap: () => ({ message: "type must be one of image, pdf, doc, link" }),
  }),
  url: z.string().min(1, "url is required").trim(),
});

module.exports = {
  taskIdParamSchema,
  attachmentIdParamSchema,
  attachmentCreateSchema,
};

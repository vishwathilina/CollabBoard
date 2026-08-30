const { z } = require("zod");

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "color must be hex like #C6F135");

const workspaceCreateSchema = z.object({
  name: z.string().min(1, "name is required").trim(),
  description: z.string().min(1, "description is required").trim(),
  color: hexColor,
});

const workspacePatchSchema = z
  .object({
    name: z.string().min(1).trim().optional(),
    description: z.string().min(1).trim().optional(),
    color: hexColor.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field (name, description, color) must be provided",
  });

const workspaceIdParamSchema = z.object({
  id: z.string().min(1, "Workspace id is required"),
});

const memberAddSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

const memberRemoveParamSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
});

module.exports = {
  workspaceCreateSchema,
  workspacePatchSchema,
  workspaceIdParamSchema,
  memberAddSchema,
  memberRemoveParamSchema,
};

const { z } = require("zod");

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "color must be hex like #C6F135");

const workspaceRoles = ["owner", "project_manager", "developer", "designer", "qa", "viewer"];

const workspaceCreateSchema = z.object({
  name: z.string().min(1, "name is required").trim(),
  description: z.string().trim().optional().default(""),
  color: hexColor.optional().default("#C6F135"),
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

const memberAddSchema = z
  .object({
    userId: z.string().min(1).optional(),
    email: z.string().email("Invalid email address").optional(),
    role: z.enum(workspaceRoles).optional(),
    visibleTreeNodeIds: z.array(z.string()).optional(),
  })
  .refine((data) => Boolean(data.userId || data.email), {
    message: "Either userId or email must be provided to add a member",
  });

const memberPatchSchema = z
  .object({
    role: z.enum(workspaceRoles).optional(),
    visibleTreeNodeIds: z.array(z.string()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field (role, visibleTreeNodeIds) must be provided",
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
  memberPatchSchema,
  memberRemoveParamSchema,
};

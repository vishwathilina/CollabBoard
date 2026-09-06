const { z } = require("zod");

const userIdParamSchema = z.object({
  id: z.string().min(1, "User id is required"),
});

const updateUserSchema = z.object({
  name: z.string().trim().optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "avatarColor must be a hex color like #C6F135")
    .optional(),
  title: z.string().trim().optional(),
  bio: z.string().trim().optional(),
  avatarUrl: z.string().url("avatarUrl must be a valid URL").optional().or(z.literal("")),
});

module.exports = { userIdParamSchema, updateUserSchema };

const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.string().email("Invalid email").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  avatarColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "avatarColor must be a hex color like #C6F135")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

module.exports = { registerSchema, loginSchema };

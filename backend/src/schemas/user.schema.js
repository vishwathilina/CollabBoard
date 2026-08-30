const { z } = require("zod");

const userIdParamSchema = z.object({
  id: z.string().min(1, "User id is required"),
});

module.exports = { userIdParamSchema };

const { z } = require("zod");

const workspaceChatMessageSchema = z.object({
  text: z.string().min(1, "text is required").max(2000, "text is too long").trim(),
});

module.exports = {
  workspaceChatMessageSchema,
};

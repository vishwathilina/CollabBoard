const mongoose = require("mongoose");
const { applyIdTransform } = require("./transforms");

const workspaceChatMessageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    workspaceId: { type: String, required: true },
    authorId: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

workspaceChatMessageSchema.index({ workspaceId: 1, createdAt: 1 });

applyIdTransform(workspaceChatMessageSchema);

const WorkspaceChatMessage =
  mongoose.models.WorkspaceChatMessage ||
  mongoose.model("WorkspaceChatMessage", workspaceChatMessageSchema);

module.exports = { WorkspaceChatMessage };

const mongoose = require("mongoose");
const { applyIdTransform } = require("./transforms");

const messageSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    taskId: { type: String, required: true },
    authorId: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

messageSchema.index({ taskId: 1, createdAt: 1 });

applyIdTransform(messageSchema);

const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

module.exports = { Message };

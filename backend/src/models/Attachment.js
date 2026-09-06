const mongoose = require("mongoose");
const { applyIdTransform } = require("./transforms");

const ATTACHMENT_TYPES = ["image", "pdf", "doc", "link"];

const attachmentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    taskId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ATTACHMENT_TYPES, required: true },
    url: { type: String, required: true },
    fileKey: { type: String, default: null },
    addedBy: { type: String, required: true },
  },
  { timestamps: true }
);

attachmentSchema.index({ taskId: 1 });

applyIdTransform(attachmentSchema);

const Attachment =
  mongoose.models.Attachment || mongoose.model("Attachment", attachmentSchema);

module.exports = { Attachment, ATTACHMENT_TYPES };

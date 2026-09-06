const mongoose = require("mongoose");
const { applyIdTransform } = require("./transforms");

const activitySchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    workspaceId: { type: String, required: true },
    actorId: { type: String, required: true },
    action: { type: String, required: true },
    taskId: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

activitySchema.index({ workspaceId: 1, createdAt: -1 });

applyIdTransform(activitySchema);

const Activity = mongoose.models.Activity || mongoose.model("Activity", activitySchema);

module.exports = { Activity };

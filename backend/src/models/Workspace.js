const mongoose = require("mongoose");
const { applyIdTransform } = require("./transforms");

const WORKSPACE_ROLES = [
  "owner",
  "project_manager",
  "developer",
  "designer",
  "qa",
  "viewer",
];

const memberSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    role: { type: String, enum: WORKSPACE_ROLES, required: true },
    visibleTreeNodeIds: { type: [String], default: undefined },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    color: { type: String, default: "#C6F135" },
    ownerId: { type: String, required: true },
    members: { type: [memberSchema], default: [] },
  },
  { timestamps: true }
);

applyIdTransform(workspaceSchema);

const Workspace = mongoose.models.Workspace || mongoose.model("Workspace", workspaceSchema);

module.exports = { Workspace, WORKSPACE_ROLES };

const mongoose = require("mongoose");
const { applyIdTransform } = require("./transforms");

const treeNodeSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    workspaceId: { type: String, required: true, index: true },
    parentId: { type: String, default: null },
    name: { type: String, required: true, trim: true },
    completion: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

treeNodeSchema.index({ workspaceId: 1, parentId: 1 });

applyIdTransform(treeNodeSchema);

const TreeNode = mongoose.models.TreeNode || mongoose.model("TreeNode", treeNodeSchema);

module.exports = { TreeNode };

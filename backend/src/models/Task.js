const mongoose = require("mongoose");
const { applyIdTransform } = require("./transforms");

const COLUMNS = ["todo", "in_progress", "review", "done"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const taskSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    workspaceId: { type: String, required: true },
    treeNodeId: { type: String, required: true },
    column: { type: String, enum: COLUMNS, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    priority: { type: String, enum: PRIORITIES, default: "medium" },
    memberIds: { type: [String], default: [] },
    startDate: { type: String, default: null },
    dueDate: { type: String, default: null },
    completion: { type: Number, default: 0, min: 0, max: 100 },
    version: { type: Number, default: 1 },
    order: { type: Number, default: 0 },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ workspaceId: 1, column: 1, order: 1 });
taskSchema.index({ workspaceId: 1, treeNodeId: 1 });

applyIdTransform(taskSchema);

const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);

module.exports = { Task, COLUMNS, PRIORITIES };

const express = require("express");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const workspaceRoutes = require("./workspace.routes");

const treeRoutes = require("./tree.routes");
const taskRoutes = require("./task.routes");
const ganttRoutes = require("./gantt.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/workspaces", workspaceRoutes);
router.use("/", treeRoutes); // Member 4: /workspaces/:id/tree and /tree-nodes/:nodeId
router.use("/", taskRoutes); // Member 5: /workspaces/:id/tasks and /tasks/:taskId
router.use("/", ganttRoutes); // Member 5: /workspaces/:id/gantt
// router.use("/tasks/:taskId/messages", require("./message.routes")); // Member 6
// router.use("/messages", require("./message.routes"));   // Member 6
// router.use("/tasks/:taskId/attachments", require("./attachment.routes")); // Member 6
// router.use("/attachments", require("./attachment.routes")); // Member 6

module.exports = router;

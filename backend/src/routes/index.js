const express = require("express");
const healthRoutes = require("./health.routes");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const workspaceRoutes = require("./workspace.routes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/workspaces", workspaceRoutes);
// router.use("/workspaces/:id/tree", require("./tree.routes")); // Member 4 (mounted via workspace routes)
// router.use("/tree-nodes", require("./tree.routes"));    // Member 4
// router.use("/workspaces/:id/tasks", require("./task.routes")); // Member 5
// router.use("/tasks", require("./task.routes"));         // Member 5
// router.use("/workspaces/:id/gantt", require("./gantt.routes")); // Member 5
// router.use("/tasks/:taskId/messages", require("./message.routes")); // Member 6
// router.use("/messages", require("./message.routes"));   // Member 6
// router.use("/tasks/:taskId/attachments", require("./attachment.routes")); // Member 6
// router.use("/attachments", require("./attachment.routes")); // Member 6

module.exports = router;

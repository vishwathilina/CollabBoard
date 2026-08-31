const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { asyncHandler } = require("../middleware/asyncHandler");
const { workspaceIdParamSchema } = require("../schemas/task.schema");
const ganttController = require("../controllers/gantt.controller");

const router = express.Router();

router.get(
  "/workspaces/:id/gantt",
  protect,
  validate({ params: workspaceIdParamSchema }),
  asyncHandler(ganttController.getGantt),
);

module.exports = router;

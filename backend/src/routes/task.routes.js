const express = require("express");
const { protect } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { asyncHandler } = require("../middleware/asyncHandler");
const {
  workspaceIdParamSchema,
  taskIdParamSchema,
  taskListQuerySchema,
  taskCreateSchema,
  taskPatchSchema,
  taskMoveSchema,
} = require("../schemas/task.schema");
const taskController = require("../controllers/task.controller");

const router = express.Router();

router.get(
  "/workspaces/:id/tasks",
  protect,
  validate({ params: workspaceIdParamSchema, query: taskListQuerySchema }),
  asyncHandler(taskController.listTasks),
);

router.post(
  "/workspaces/:id/tasks",
  protect,
  validate({ params: workspaceIdParamSchema, body: taskCreateSchema }),
  asyncHandler(taskController.createTask),
);

router.get(
  "/tasks/:taskId",
  protect,
  validate({ params: taskIdParamSchema }),
  asyncHandler(taskController.getTask),
);

router.patch(
  "/tasks/:taskId",
  protect,
  validate({ params: taskIdParamSchema, body: taskPatchSchema }),
  asyncHandler(taskController.patchTask),
);

router.patch(
  "/tasks/:taskId/move",
  protect,
  validate({ params: taskIdParamSchema, body: taskMoveSchema }),
  asyncHandler(taskController.moveTask),
);

router.delete(
  "/tasks/:taskId",
  protect,
  validate({ params: taskIdParamSchema }),
  asyncHandler(taskController.deleteTask),
);

module.exports = router;

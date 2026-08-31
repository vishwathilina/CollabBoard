const { sendSuccess } = require("../utils/apiResponse");
const taskService = require("../services/task.service");

function listTasks(req, res) {
  const { id } = req.params;
  const tasks = taskService.listTasks(id, req.query, req.user.id);
  return sendSuccess(res, tasks, 200, { count: tasks.length });
}

function createTask(req, res) {
  const { id } = req.params;
  const task = taskService.createTask(id, req.body, req.user.id);
  return sendSuccess(res, task, 201);
}

function getTask(req, res) {
  const { taskId } = req.params;
  const task = taskService.getTask(taskId, req.user.id);
  return sendSuccess(res, task, 200);
}

function patchTask(req, res) {
  const { taskId } = req.params;
  const task = taskService.updateTask(taskId, req.body, req.user.id);
  return sendSuccess(res, task, 200);
}

function moveTask(req, res) {
  const { taskId } = req.params;
  const task = taskService.moveTask(taskId, req.body, req.user.id);
  return sendSuccess(res, task, 200);
}

function deleteTask(req, res) {
  const { taskId } = req.params;
  const result = taskService.deleteTask(taskId, req.user.id);
  return sendSuccess(res, result, 200);
}

module.exports = {
  listTasks,
  createTask,
  getTask,
  patchTask,
  moveTask,
  deleteTask,
};

const { sendSuccess } = require("../utils/apiResponse");
const taskService = require("../services/task.service");

async function listTasks(req, res) {
  const { id } = req.params;
  const tasks = await taskService.listTasks(id, req.query, req.user);
  return sendSuccess(res, tasks, 200, { count: tasks.length });
}

async function createTask(req, res) {
  const { id } = req.params;
  const task = await taskService.createTask(id, req.body, req.user);
  return sendSuccess(res, task, 201);
}

async function getTask(req, res) {
  const { taskId } = req.params;
  const task = await taskService.getTask(taskId, req.user);
  return sendSuccess(res, task, 200);
}

async function patchTask(req, res) {
  const { taskId } = req.params;
  const task = await taskService.updateTask(taskId, req.body, req.user);
  return sendSuccess(res, task, 200);
}

async function moveTask(req, res) {
  const { taskId } = req.params;
  const task = await taskService.moveTask(taskId, req.body, req.user);
  return sendSuccess(res, task, 200);
}

async function deleteTask(req, res) {
  const { taskId } = req.params;
  const result = await taskService.deleteTask(taskId, req.user);
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

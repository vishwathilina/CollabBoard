const { sendSuccess } = require("../utils/apiResponse");
const ganttService = require("../services/gantt.service");

async function getGantt(req, res) {
  const { id } = req.params;
  const gantt = await ganttService.getGantt(id, req.user);
  return sendSuccess(res, gantt, 200);
}

module.exports = { getGantt };

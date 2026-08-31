const { sendSuccess } = require("../utils/apiResponse");
const ganttService = require("../services/gantt.service");

function getGantt(req, res) {
  const { id } = req.params;
  const gantt = ganttService.getGantt(id, req.user.id);
  return sendSuccess(res, gantt, 200);
}

module.exports = { getGantt };

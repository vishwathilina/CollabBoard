const { sendSuccess } = require("../utils/apiResponse");

function getHealth(req, res) {
  const data = {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    store: "memory",
  };
  return sendSuccess(res, data);
}

module.exports = { getHealth };

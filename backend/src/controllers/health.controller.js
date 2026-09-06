const mongoose = require("mongoose");
const { sendSuccess } = require("../utils/apiResponse");

const READY_STATE_LABELS = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

function getHealth(req, res) {
  const readyState = mongoose.connection.readyState;
  const data = {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    store: "mongo",
    mongo: READY_STATE_LABELS[readyState] || String(readyState),
    mongoReadyState: readyState,
  };
  return sendSuccess(res, data);
}

module.exports = { getHealth };

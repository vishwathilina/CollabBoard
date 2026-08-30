function sendSuccess(res, data, status = 200, meta) {
  const body = { success: true, data };
  if (meta !== undefined) {
    body.meta = meta;
  }
  return res.status(status).json(body);
}

function sendError(res, status, code, message, details = []) {
  return res.status(status).json({
    success: false,
    error: { code, message, details },
  });
}

module.exports = { sendSuccess, sendError };

const { AppError } = require("../utils/AppError");

function notFound(req, res, next) {
  next(new AppError(404, "NOT_FOUND", `Route '${req.originalUrl}' was not found.`));
}

module.exports = { notFound };

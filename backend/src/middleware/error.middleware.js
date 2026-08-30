const env = require("../config/env");

function errorHandler(err, req, res, _next) {
  // Handle invalid JSON parsing
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "Malformed JSON in request body.",
        details: [],
      },
    });
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message = err.message || "An unexpected error occurred.";
  const details = err.details || [];

  // Log server errors
  if (statusCode >= 500) {
    console.error(err);
  }

  const body = {
    success: false,
    error: { code, message, details },
  };

  // Never leak stack in production
  if (env.NODE_ENV !== "production" && err.stack && statusCode >= 500) {
    // In dev, include stack for debugging but still follow envelope - stack not in contract except logs
    // Optionally expose via details? We do not expose; just keep logging.
  }

  return res.status(statusCode).json(body);
}

module.exports = { errorHandler };

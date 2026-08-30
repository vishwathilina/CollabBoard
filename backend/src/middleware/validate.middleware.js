const { AppError } = require("../utils/AppError");

/**
 * Generic Zod validation middleware.
 * @param {Object} schemas - { body, params, query } each a Zod schema (optional)
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      const details = [];

      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          for (const issue of result.error.issues) {
            details.push({ path: `body.${issue.path.join(".")}`, message: issue.message });
          }
        } else {
          req.body = result.data;
        }
      }

      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          for (const issue of result.error.issues) {
            details.push({ path: `params.${issue.path.join(".")}`, message: issue.message });
          }
        } else {
          req.params = result.data;
        }
      }

      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          for (const issue of result.error.issues) {
            details.push({ path: `query.${issue.path.join(".")}`, message: issue.message });
          }
        } else {
          req.query = result.data;
        }
      }

      if (details.length > 0) {
        return next(new AppError(422, "VALIDATION_ERROR", "Request validation failed.", details));
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { validate };

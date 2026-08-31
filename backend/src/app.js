const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const apiRouter = require("./routes");
const { notFound } = require("./middleware/notFound.middleware");
const { errorHandler } = require("./middleware/error.middleware");

const app = express();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: false,
  })
);
app.use(express.json());
app.use(morgan("dev"));

// API routes
app.use("/api", apiRouter);

// Swagger Docs
const setupSwagger = require("./docs/swagger");
setupSwagger(app);

// 404 for unknown routes
app.use(notFound);

// Central error handler
app.use(errorHandler);

module.exports = app;

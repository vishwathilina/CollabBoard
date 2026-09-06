const app = require("./app");
const env = require("./config/env");
const { connectDb } = require("./db/connect");

const PORT = env.PORT;

async function start() {
  await connectDb();

  app.listen(PORT, () => {
    console.log(`CollabBoard API listening on http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`Store: mongo`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

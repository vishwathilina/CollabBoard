const http = require("http");
const app = require("./app");
const env = require("./config/env");
const { connectDb } = require("./db/connect");
const { initSocket } = require("./socket");

const PORT = env.PORT;

async function start() {
  await connectDb();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`CollabBoard API listening on http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`Realtime: Socket.io enabled on port ${PORT}`);
    console.log(`Store: mongo`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

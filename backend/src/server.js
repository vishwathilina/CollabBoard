const app = require("./app");
const env = require("./config/env");

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`CollabBoard API listening on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Store: memory (seed reloads on restart)`);
});

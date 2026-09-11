const { setupTestDb, teardownTestDb, clearTestDb, seedTestDb } = require("./helpers/db");

jest.setTimeout(60000);

beforeAll(async () => {
  await setupTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  await seedTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

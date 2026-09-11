const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { seedMongo } = require("../../src/store/seedMongo");
const { reset: resetMemoryStore } = require("../../src/store/memory.store");

let mongoServer = null;

/**
 * Starts in-memory MongoDB instance and connects Mongoose.
 */
async function setupTestDb() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }

  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

/**
 * Clears all collections in the test database.
 */
async function clearTestDb() {
  resetMemoryStore();

  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

/**
 * Seeds the test database with demo data.
 */
async function seedTestDb() {
  resetMemoryStore();
  if (mongoose.connection.readyState === 1) {
    return await seedMongo();
  }
}

/**
 * Closes the database connection and stops the in-memory MongoDB server.
 */
async function teardownTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

module.exports = {
  setupTestDb,
  clearTestDb,
  seedTestDb,
  teardownTestDb,
};

#!/usr/bin/env node
/**
 * Idempotent Atlas seed. Usage (from backend/):
 *   npm run seed
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDb } = require("../src/db/connect");
const { seedMongo } = require("../src/store/seedMongo");

async function main() {
  await connectDb();
  const counts = await seedMongo();
  console.log("Seed complete (upsert):", counts);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

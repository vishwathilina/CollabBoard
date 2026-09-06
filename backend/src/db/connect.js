const mongoose = require("mongoose");
const env = require("../config/env");

async function connectDb() {
  const uri = env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy it into backend/.env (see .env.example)."
    );
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected:", mongoose.connection.name || "collabboard");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    throw err;
  }
}

module.exports = { connectDb };

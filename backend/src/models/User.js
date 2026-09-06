const mongoose = require("mongoose");
const { applyIdTransform } = require("./transforms");

const ORG_ROLES = [
  "senior_project_manager",
  "project_manager",
  "developer",
  "designer",
  "qa",
  "stakeholder",
  "admin",
];

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    avatarColor: { type: String, default: "#C6F135" },
    orgRole: {
      type: String,
      enum: ORG_ROLES,
      default: "developer",
    },
    title: { type: String, default: "" },
    bio: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

applyIdTransform(userSchema, (_doc, ret) => {
  delete ret.passwordHash;
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = { User, ORG_ROLES };

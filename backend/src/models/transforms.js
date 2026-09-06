/**
 * Shared Mongoose toJSON transform: string _id → id, drop __v.
 * Callers can pass extra transform logic (e.g. strip passwordHash).
 */
function applyIdTransform(schema, extraTransform) {
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      if (typeof extraTransform === "function") {
        extraTransform(doc, ret);
      }
      return ret;
    },
  });
  schema.set("toObject", {
    virtuals: true,
    versionKey: false,
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      if (typeof extraTransform === "function") {
        extraTransform(doc, ret);
      }
      return ret;
    },
  });
}

module.exports = { applyIdTransform };

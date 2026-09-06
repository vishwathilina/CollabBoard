/**
 * Normalize a Mongoose document (or lean object) to a plain API record with string `id`.
 */
function docToRecord(doc) {
  if (!doc) return null;
  if (typeof doc.toJSON === "function") {
    return doc.toJSON();
  }
  const obj = { ...doc };
  if (obj._id !== undefined && obj.id === undefined) {
    obj.id = obj._id;
    delete obj._id;
  }
  delete obj.__v;
  return obj;
}

module.exports = { docToRecord };

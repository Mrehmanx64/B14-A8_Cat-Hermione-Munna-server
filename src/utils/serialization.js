export const serializeEvent = (doc, extra = {}) => ({
  ...doc,
  _id: doc._id.toString(),
  createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
  updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
  ...extra,
});

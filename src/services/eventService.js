import { collections } from "../config/db.js";

/** Groups join counts by event id for a set of event ids. */
export async function getJoinCounts(ids) {
  if (!ids.length) return new Map();
  const rows = await collections
    .joins()
    .aggregate([
      { $match: { eventId: { $in: ids.map((id) => id.toString()) } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ])
    .toArray();

  return new Map(rows.map((r) => [r._id, r.count]));
}

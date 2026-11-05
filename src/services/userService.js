import { collections } from "../config/db.js";

export async function getUserStats(userId) {
  const [created, joined] = await Promise.all([
    collections.events().countDocuments({ createdBy: userId }),
    collections.joins().countDocuments({ userId: userId }),
  ]);
  return { created, joined };
}

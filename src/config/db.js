import { MongoClient } from "mongodb";

let client;
let db;

export async function connectDb() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<<<")) {
    throw new Error(
      "MONGODB_URI is missing or still a placeholder. Fill server/.env before starting."
    );
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.MONGODB_DB_NAME || "shongkolpo");

  // Indexes used by the event listing queries.
  const events = db.collection("events");
  await events.createIndex({ eventDate: 1 });
  await events.createIndex({ createdBy: 1, createdAt: -1 });

  const joins = db.collection("joins");
  await joins.createIndex({ eventId: 1, userId: 1 }, { unique: true });
  await joins.createIndex({ userId: 1, joinedAt: -1 });

  console.log(`[db] connected to "${db.databaseName}"`);
  return db;
}

export function getDb() {
  if (!db) throw new Error("Database not connected. Call connectDb() first.");
  return db;
}

export const collections = {
  events: () => getDb().collection("events"),
  joins: () => getDb().collection("joins"),
};

export async function closeDb() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}

/**
 * Seeds demo events for local UI review. Every row carries `demo: true`, so
 * `node scripts/seed-demo.js --clear` removes exactly what this added and
 * leaves real data alone.
 *
 *   node scripts/seed-demo.js          # add demo events
 *   node scripts/seed-demo.js --clear  # remove them
 */
import "dotenv/config";
import { MongoClient } from "mongodb";

const CLEAR = process.argv.includes("--clear");
const DAY = 86_400_000;

/** Event days are stored at noon UTC (see utils/helpers.js). */
const dayFromNow = (days) => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + days, 12));
};

const DEMO = [
  {
    title: "Winter Clothes Distribution for the Needy",
    description:
      "We are collecting warm jackets, blankets and sweaters for families in Mirpur 10. Volunteers sort donations from 9am and hand them out from 11am. Bring a reusable bag and wear something warm — the morning gets cold on the rooftop.",
    eventType: "Clothing Drive",
    thumbnail: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=1200&q=80",
    location: "Mirpur 10, Dhaka",
    inDays: 3,
  },
  {
    title: "Buriganga Riverside Cleanup",
    description:
      "Join a morning of clearing plastic and debris from the Buriganga riverbank near Sadarghat. Gloves, sacks and drinking water are provided. Wear closed shoes and clothes you do not mind getting muddy. We finish by noon with tea for everyone.",
    eventType: "Cleanup",
    thumbnail: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&q=80",
    location: "Sadarghat, Old Dhaka",
    inDays: 6,
  },
  {
    title: "Ramna Park Plantation Day",
    description:
      "Two hundred saplings, one morning, and a lot of helping hands. We plant native shade trees along the eastern walk and water them afterwards. Bring a trowel if you have one; we supply the rest. Families welcome — children can help with the watering cans.",
    eventType: "Plantation",
    thumbnail: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&q=80",
    location: "Ramna Park, Dhaka",
    inDays: 1,
  },
  {
    title: "Community Iftar for Street Families",
    description:
      "We are preparing and serving 300 iftar meals for families sleeping near Kamalapur station. Volunteers are needed for packing from 3pm and serving from 5pm. Please bring clean hands, a calm manner and a willingness to work quickly once the crowd arrives.",
    eventType: "Food Distribution",
    thumbnail: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&q=80",
    location: "Kamalapur, Dhaka",
    inDays: 9,
  },
  {
    title: "Free Eye Camp for Factory Workers",
    description:
      "A one-day camp offering free vision screening, reading glasses and referrals for workers in the Gazipur industrial belt. We need volunteers to guide queues, fill forms and translate instructions. No medical training required — the doctors handle the examinations.",
    eventType: "Health Camp",
    thumbnail: "https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?w=1200&q=80",
    location: "Gazipur, Dhaka Division",
    inDays: 13,
  },
  {
    title: "Weekend Reading Circle for Kids",
    description:
      "A relaxed Saturday morning of storytelling and reading practice for children at the Dhanmondi community centre. Volunteers read aloud in Bangla and English, then help small groups with their own books. All materials are supplied by the centre.",
    eventType: "Education",
    thumbnail: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=1200&q=80",
    location: "Dhanmondi, Dhaka",
    inDays: 17,
  },
];

const uri = process.env.MONGODB_URI;
if (!uri || uri.includes("<<<")) {
  console.error("MONGODB_URI is missing or still a placeholder. Fill server/.env first.");
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const events = client.db(process.env.MONGODB_DB_NAME || "shongkolpo").collection("events");

if (CLEAR) {
  const { deletedCount } = await events.deleteMany({ demo: true });
  console.log(`Removed ${deletedCount} demo event(s).`);
} else {
  await events.deleteMany({ demo: true }); // idempotent re-run

  const now = new Date();
  const docs = DEMO.map(({ inDays, ...event }) => ({
    ...event,
    eventDate: dayFromNow(inDays),
    createdBy: "demo-seed",
    createdByEmail: "organiser@shongkolpo.demo",
    createdByName: "Shongkolpo Demo Organiser",
    createdByImage: "",
    createdAt: now,
    updatedAt: now,
    demo: true,
  }));

  const { insertedCount } = await events.insertMany(docs);
  console.log(`Inserted ${insertedCount} demo event(s).`);
  console.log("Remove later with: node scripts/seed-demo.js --clear");
}

await client.close();

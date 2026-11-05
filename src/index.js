import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import { connectDb, closeDb } from "./config/db.js";
import eventsRouter from "./routes/events.js";
import profileRouter from "./routes/profile.js";

const app = express();
app.use(helmet());
app.use(morgan("dev"));
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Requests with no Origin (curl, health checks, server-to-server) pass.
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(clean)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "shongkolpo-api", time: new Date().toISOString() });
});

app.use("/api/events", eventsRouter);
app.use("/api/profile", profileRouter);

app.use((req, res) => {
  res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}.` });
});

// Central error handler: turns thrown HttpErrors into clean JSON envelopes.
app.use((err, _req, res, _next) => {
  const status = err.status || 500;

  if (status >= 500) {
    console.error("[error]", err);
  }

  if (err.message?.includes("not allowed by CORS")) {
    return res.status(403).json({ message: "This origin is not allowed to call the API." });
  }

  res.status(status).json({
    message: err.message || "Something went wrong on our side.",
    ...(err.details ? { errors: err.details } : {}),
  });
});

async function start() {
  try {
    await connectDb();
  } catch (err) {
    console.error("[startup] Could not connect to MongoDB:", err.message);
    // Keep serving so /api/health is reachable; DB routes will return 500.
  }

  app.listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`);
  });
}

start();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await closeDb();
    process.exit(0);
  });
}

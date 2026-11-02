import { Router } from "express";
import { ObjectId } from "mongodb";
import { collections } from "../config/db.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import {
  HttpError,
  asyncHandler,
  toEventDate,
  todayEventDate,
  upcomingLowerBound,
  validateEventInput,
} from "../utils/helpers.js";

const router = Router();

/** Converts a Mongo document into the JSON shape the client expects. */
const serialize = (doc, extra = {}) => ({
  ...doc,
  _id: doc._id.toString(),
  createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
  updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
  ...extra,
});

const toId = (id) => {
  if (!ObjectId.isValid(id)) throw new HttpError(400, "That event id is not valid.");
  return new ObjectId(id);
};

/**
 * GET /api/events/upcoming
 * Public. Only events whose date has not passed, soonest first.
 * Home page asks for 6, the Upcoming page passes its own limit.
 */
router.get(
  "/upcoming",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const events = await collections
      .events()
      .find({ eventDate: { $gte: upcomingLowerBound() } })
      .sort({ eventDate: 1 })
      .limit(limit)
      .toArray();

    const counts = await joinCounts(events.map((e) => e._id));

    res.json(
      events.map((e) =>
        serialize(e, { joinCount: counts.get(e._id.toString()) ?? 0 })
      )
    );
  })
);

/**
 * GET /api/events/mine
 * Protected. Events created by the signed-in user, newest first.
 */
router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const events = await collections
      .events()
      .find({ createdBy: req.auth.sub })
      .sort({ createdAt: -1 })
      .toArray();

    const counts = await joinCounts(events.map((e) => e._id));
    res.json(
      events.map((e) =>
        serialize(e, { joinCount: counts.get(e._id.toString()) ?? 0 })
      )
    );
  })
);

/**
 * GET /api/events/joined
 * Protected. Events the signed-in user has joined, sorted by event date.
 */
router.get(
  "/joined",
  requireAuth,
  asyncHandler(async (req, res) => {
    const joins = await collections
      .joins()
      .find({ userId: req.auth.sub })
      .sort({ joinedAt: -1 })
      .toArray();

    if (joins.length === 0) return res.json([]);

    const ids = joins.map((j) => j.eventId).filter(ObjectId.isValid).map((id) => new ObjectId(id));

    const events = await collections.events().find({ _id: { $in: ids } }).toArray();
    const byId = new Map(events.map((e) => [e._id.toString(), e]));

    const counts = await joinCounts(events.map((e) => e._id));

    const ordered = joins
      .map((j) => byId.get(j.eventId))
      .filter(Boolean)
      .map((e) =>
        serialize(e, {
          joinCount: counts.get(e._id.toString()) ?? 0,
          joinedAt: joins.find((j) => j.eventId === e._id.toString())?.joinedAt,
        })
      )
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

    res.json(ordered);
  })
);

/**
 * GET /api/events/:id
 * Public. Returns the event plus the caller's join state when signed in.
 */
router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const _id = toId(req.params.id);
    const event = await collections.events().findOne({ _id });
    if (!event) throw new HttpError(404, "That event no longer exists.");

    const count = await collections.joins().countDocuments({ eventId: req.params.id });
    const joined = req.auth
      ? Boolean(
          await collections
            .joins()
            .findOne({ eventId: req.params.id, userId: req.auth.sub })
        )
      : false;

    res.json(
      serialize(event, {
        joinCount: count,
        joined,
        isOwner: req.auth ? event.createdBy === req.auth.sub : false,
      })
    );
  })
);

/**
 * POST /api/events
 * Protected. Creates an event owned by the signed-in user.
 */
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const errors = validateEventInput(req.body);
    if (Object.keys(errors).length) {
      throw new HttpError(422, "Please fix the highlighted fields.", errors);
    }

    const now = new Date();
    const doc = {
      title: req.body.title.trim(),
      description: req.body.description.trim(),
      eventType: req.body.eventType.trim(),
      thumbnail: req.body.thumbnail.trim(),
      location: req.body.location.trim(),
      eventDate: toEventDate(req.body.eventDate),
      createdBy: req.auth.sub,
      createdByEmail: req.auth.email ?? "",
      createdByName: req.auth.name ?? "",
      createdByImage: req.auth.image ?? "",
      createdAt: now,
      updatedAt: now,
    };

    const { insertedId } = await collections.events().insertOne(doc);
    res
      .status(201)
      .json(serialize({ ...doc, _id: insertedId }, { joinCount: 0, joined: false, isOwner: true }));
  })
);

/**
 * PATCH /api/events/:id
 * Protected. Only the creator may update. Re-validates the date.
 */
router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const _id = toId(req.params.id);
    const existing = await collections.events().findOne({ _id });
    if (!existing) throw new HttpError(404, "That event no longer exists.");
    if (existing.createdBy !== req.auth.sub) {
      throw new HttpError(403, "You can only edit events you created.");
    }

    const errors = validateEventInput(req.body, { partial: true });
    if (Object.keys(errors).length) {
      throw new HttpError(422, "Please fix the highlighted fields.", errors);
    }

    const updates = {};
    for (const key of ["title", "description", "eventType", "thumbnail", "location"]) {
      if (req.body[key] !== undefined) updates[key] = req.body[key].trim();
    }
    if (req.body.eventDate !== undefined) updates.eventDate = toEventDate(req.body.eventDate);
    updates.updatedAt = new Date();

    await collections.events().updateOne({ _id }, { $set: updates });
    const updated = await collections.events().findOne({ _id });

    const count = await collections.joins().countDocuments({ eventId: req.params.id });
    res.json(serialize(updated, { joinCount: count, isOwner: true }));
  })
);

/**
 * DELETE /api/events/:id
 * Protected. Only the creator may delete; also cleans up its joins.
 */
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const _id = toId(req.params.id);
    const existing = await collections.events().findOne({ _id });
    if (!existing) throw new HttpError(404, "That event no longer exists.");
    if (existing.createdBy !== req.auth.sub) {
      throw new HttpError(403, "You can only delete events you created.");
    }

    await collections.joins().deleteMany({ eventId: req.params.id });
    await collections.events().deleteOne({ _id });

    res.json({ deleted: true, id: req.params.id });
  })
);

/**
 * POST /api/events/:id/join
 * Protected. Idempotent: joining twice does not duplicate the record.
 */
router.post(
  "/:id/join",
  requireAuth,
  asyncHandler(async (req, res) => {
    const _id = toId(req.params.id);
    const event = await collections.events().findOne({ _id });
    if (!event) throw new HttpError(404, "That event no longer exists.");

    if (event.createdBy === req.auth.sub) {
      throw new HttpError(400, "You created this event — you are already part of it.");
    }

    if (event.eventDate && new Date(event.eventDate).getTime() < todayEventDate().getTime()) {
      throw new HttpError(400, "This event has already taken place.");
    }

    const existing = await collections
      .joins()
      .findOne({ eventId: req.params.id, userId: req.auth.sub });

    if (existing) {
      const count = await collections.joins().countDocuments({ eventId: req.params.id });
      return res.json({ joined: true, alreadyJoined: true, joinCount: count });
    }

    await collections.joins().insertOne({
      eventId: req.params.id,
      userId: req.auth.sub,
      userName: req.auth.name ?? "",
      userEmail: req.auth.email ?? "",
      userImage: req.auth.image ?? "",
      joinedAt: new Date(),
    });

    const count = await collections.joins().countDocuments({ eventId: req.params.id });
    res.status(201).json({ joined: true, alreadyJoined: false, joinCount: count });
  })
);

/** Groups join counts by event id for a set of event ids. */
async function joinCounts(ids) {
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

export default router;

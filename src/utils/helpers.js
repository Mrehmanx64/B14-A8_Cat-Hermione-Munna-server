/**
 * Express helpers shared by the route modules.
 */

/** Wraps an async route handler so rejected promises reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Throws an error carrying an HTTP status that the error middleware understands. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/**
 * Tiny field validator. Returns an object of { field: message } for anything
 * that fails. An empty object means the payload is valid.
 */
export function validateEventInput(body, { partial = false } = {}) {
  const errors = {};
  const str = (v) => (typeof v === "string" ? v.trim() : "");

  const required = ["title", "description", "eventType", "thumbnail", "location", "eventDate"];

  for (const field of required) {
    if (partial && body[field] === undefined) continue;
    if (!str(body[field])) errors[field] = `${label(field)} is required.`;
  }

  if (!errors.title && str(body.title).length > 120) {
    errors.title = "Title must be 120 characters or fewer.";
  }
  if (!errors.description && str(body.description).length > 2000) {
    errors.description = "Description must be 2000 characters or fewer.";
  }

  if (!errors.thumbnail && body.thumbnail !== undefined && str(body.thumbnail)) {
    try {
      const url = new URL(str(body.thumbnail));
      if (!["http:", "https:"].includes(url.protocol)) {
        errors.thumbnail = "Thumbnail must be a valid http(s) image URL.";
      }
    } catch {
      errors.thumbnail = "Thumbnail must be a valid http(s) image URL.";
    }
  }

  if (body.eventDate !== undefined && str(body.eventDate)) {
    const date = toEventDate(body.eventDate);
    if (!date) {
      errors.eventDate = "Event date is not a valid date.";
    } else if (date.getTime() < todayEventDate().getTime()) {
      errors.eventDate = "Event date must be today or later.";
    }
  }

  return errors;
}

/**
 * Event dates are calendar days, not instants. We store the chosen day at noon
 * UTC so formatting in any timezone from UTC-11 to UTC+11 still lands on the
 * day the organiser picked, and "upcoming" becomes a day-level comparison
 * instead of a race against the current clock time.
 */
export function toEventDate(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12))
    : new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
}

/** Today's calendar day, expressed the same way stored event dates are. */
export function todayEventDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12));
}

/**
 * Inclusive lower bound for "upcoming". Event days are stored at noon UTC, and
 * a day that is "today" in one timezone can already be "yesterday" in another,
 * so we half a day of slack before excluding anything.
 */
export function upcomingLowerBound() {
  return new Date(todayEventDate().getTime() - 12 * 60 * 60 * 1000);
}

const label = (field) =>
  ({
    title: "Title",
    description: "Description",
    eventType: "Event type",
    thumbnail: "Thumbnail image URL",
    location: "Location",
    eventDate: "Event date",
  })[field] ?? field;

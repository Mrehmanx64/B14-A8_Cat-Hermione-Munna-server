import { HttpError } from "../utils/helpers.js";

/**
 * Validates event input data.
 * @param {Object} body The request body.
 * @param {Object} options Options like partial update.
 * @returns {Object} An object of errors, empty if valid.
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

function label(field) {
  return {
    title: "Title",
    description: "Description",
    eventType: "Event type",
    thumbnail: "Thumbnail image URL",
    location: "Location",
    eventDate: "Event date",
  }[field] ?? field;
}

// Helpers needed for validation
function toEventDate(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12))
    : new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date;
}

function todayEventDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12));
}

import { Router } from "express";
import { collections } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError, asyncHandler } from "../utils/helpers.js";

const router = Router();

/**
 * PATCH /api/profile
 * Protected. BetterAuth owns the user collection, so the Express API does not
 * write to it directly — the client calls authClient.updateUser(). This
 * endpoint exists to validate the payload and report how many events and joins
 * the user has, which the profile page shows alongside the form.
 */
router.patch(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, image } = req.body ?? {};
    const errors = {};

    if (name !== undefined) {
      const value = String(name).trim();
      if (value.length < 2) errors.name = "Name must be at least 2 characters.";
      if (value.length > 60) errors.name = "Name must be 60 characters or fewer.";
    }

    if (image !== undefined && String(image).trim() !== "") {
      try {
        const url = new URL(String(image).trim());
        if (!["http:", "https:"].includes(url.protocol)) {
          errors.image = "Profile photo must be a valid http(s) URL.";
        }
      } catch {
        errors.image = "Profile photo must be a valid http(s) URL.";
      }
    }

    if (Object.keys(errors).length) {
      throw new HttpError(422, "Please fix the highlighted fields.", errors);
    }

    res.json({ ok: true });
  })
);

/**
 * GET /api/profile/stats
 * Protected. Counts the caller's created and joined events.
 */
router.get(
  "/stats",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [created, joined] = await Promise.all([
      collections.events().countDocuments({ createdBy: req.auth.sub }),
      collections.joins().countDocuments({ userId: req.auth.sub }),
    ]);

    res.json({ created, joined });
  })
);

export default router;

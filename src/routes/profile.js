import { Router } from "express";
import { collections } from "../config/db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/helpers.js";
import { sendSuccess } from "../utils/response.js";
import { validateProfile } from "../middleware/validateProfile.js";

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
  validateProfile,
  asyncHandler(async (req, res) => {
    sendSuccess(res, { ok: true });
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

    sendSuccess(res, { created, joined });
  })
);

export default router;

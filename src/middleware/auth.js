import { createRemoteJWKSet, jwtVerify } from "jose";
import { HttpError } from "../utils/helpers.js";

/**
 * Verifies BetterAuth-issued JWTs against the client's JWKS endpoint.
 *
 * The client (Next.js) runs the BetterAuth JWT plugin, which publishes public
 * keys at `${BETTER_AUTH_URL}/api/auth/jwks`. Tokens are short-lived (15m by
 * default) and are refreshed by the client immediately before protected calls.
 */

let jwks;
let jwksUrl;

function getJwks() {
  const url = process.env.BETTER_AUTH_JWKS_URL;
  if (!url) {
    throw new Error("BETTER_AUTH_JWKS_URL is not set. Cannot verify tokens.");
  }
  if (!jwks || jwksUrl !== url) {
    jwksUrl = url;
    jwks = createRemoteJWKSet(new URL(url));
  }
  return jwks;
}

function expectedAudience() {
  const url = process.env.BETTER_AUTH_URL || "";
  return url ? url.replace(/\/+$/, "") : undefined;
}

export async function verifyToken(token) {
  const url = process.env.BETTER_AUTH_URL || "";
  const issuer = url ? url.replace(/\/+$/, "") : undefined;

  const { payload } = await jwtVerify(token, getJwks(), {
    issuer,
    audience: expectedAudience(),
  });

  return payload;
}

/** Rejects the request when no valid Bearer token is present. */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new HttpError(401, "You must be signed in to do that.");
    }

    req.auth = await verifyToken(token);
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    // jose throws JWTExpired / JWSSignatureVerificationFailed / etc.
    next(new HttpError(401, "Your session has expired. Please sign in again."));
  }
}

/**
 * Attaches `req.auth` when a valid token is present but never rejects.
 * Used by public endpoints that personalise their response when signed in
 * (e.g. "has this user joined the event?").
 */
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme === "Bearer" && token) {
    try {
      req.auth = await verifyToken(token);
    } catch {
      req.auth = undefined;
    }
  }
  next();
}

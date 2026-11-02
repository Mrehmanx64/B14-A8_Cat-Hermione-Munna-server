# Shongkolpo — Server

Express 5 + MongoDB API for **Shongkolpo**, a community social-service events app. Verifies BetterAuth-issued JWTs from the Next.js client and serves the events, joins and profile endpoints.

> **Client repo:** [B14-A8_Cat-Hermione-Munna-client](https://github.com/Mrehmanx64/B14-A8_Cat-Hermione-Munna-client)
> **API base URL:** _add your deployed URL here once deployed, e.g. https://shongkolpo-api.onrender.com_

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | — | Liveness check |
| `GET` | `/api/events/upcoming` | optional | Upcoming events, soonest first; `?limit=` (default 50, max 100) |
| `GET` | `/api/events/mine` | required | Events created by the caller |
| `GET` | `/api/events/joined` | required | Events the caller has joined |
| `GET` | `/api/events/:id` | optional | Single event, personalised when signed in (`joined`, `isOwner`) |
| `POST` | `/api/events` | required | Create an event |
| `PATCH` | `/api/events/:id` | required (owner) | Update an event |
| `DELETE` | `/api/events/:id` | required (owner) | Delete an event and its joins |
| `POST` | `/api/events/:id/join` | required | Join; idempotent (`alreadyJoined`) |
| `PATCH` | `/api/profile` | required | Validate a profile name / photo change |
| `GET` | `/api/profile/stats` | required | Count of events created and joined |

Search, type filtering and sorting happen on the client over the `upcoming` response. The user records themselves live in BetterAuth, in the client.

Responses are JSON. Errors use a consistent envelope: `{ message, errors? }`.

## Auth model

Auth lives in the **client** (BetterAuth owns users, sessions and OAuth). This server never issues tokens — it only verifies them:

1. The browser mints a 15-minute JWT from `/api/auth/token` on the Next.js side.
2. It is sent as `Authorization: Bearer <jwt>`.
3. `requireAuth` / `optionalAuth` verify it against the JWKS at `BETTER_AUTH_JWKS_URL`, checking both `issuer` and `audience` equal `BETTER_AUTH_URL`.

Because of that, `BETTER_AUTH_URL` here **must** match the value the client signs with, or every token fails.

## Data model

- `events` — one document per event. `eventDate` is stored at **noon UTC** so the calendar day reads the same in every timezone from UTC−11 to UTC+11. Indexes: `{eventDate: 1}`, `{createdBy: 1, createdAt: -1}`.
- `joins` — one document per volunteer per event. Unique index `{eventId: 1, userId: 1}` makes joining idempotent.
- BetterAuth's own `user` / `session` / `account` collections share the same database and are managed by the client.

## Getting started

```bash
npm install
cp .env.example .env     # then fill in the values
npm run dev              # nodemon-free: node --watch, http://localhost:5000
```

Requires **Node 20+**.

```bash
curl http://localhost:5000/api/health
# {"ok":true,"service":"shongkolpo-api","time":"..."}
```

### Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | Listen port (default `5000`) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_DB_NAME` | Database name, shared with the client (default `shongkolpo`) |
| `BETTER_AUTH_URL` | The Next.js app's public URL — JWT issuer **and** audience |
| `BETTER_AUTH_JWKS_URL` | Public keys endpoint, `${BETTER_AUTH_URL}/api/auth/jwks` |
| `CLIENT_URL` | Comma-separated CORS allow-list; the exact deployed client origin |

`.env` is git-ignored. Never commit real credentials.

## Deploying

This is a long-running Express process, so it does **not** go on Vercel as a project of its own (Vercel is for the Next.js client). Host it on a platform that runs a persistent Node server:

| Platform | How |
|---|---|
| **Render** | New → Web Service, build `npm install`, start `npm start`. Free tier sleeps when idle, so the first request after a pause is slow. |
| **Railway** | New Project → Deploy from repo; start command `npm start`. |
| **Fly.io** | `fly launch`, then `fly secrets set` for each variable. |
| **Cyclic / Koyeb / a VPS** | Any Node 20 host works — set the same env vars. |

Whichever you pick:

1. Set every variable from `.env.example`, with `BETTER_AUTH_URL` = your **Vercel** URL and `CLIENT_URL` = the same origin.
2. Deploy and confirm `GET /api/health` returns `{"ok":true}` publicly.
3. Put that public URL into the client's `NEXT_PUBLIC_API_URL` and redeploy the client.

> MongoDB Atlas must allow connections from your host. Either add `0.0.0.0/0` to the Atlas IP access list or the provider's egress IPs; otherwise the API connects but every query times out.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | `node --watch src/index.js` |
| `npm start` | `node src/index.js` |
| `node scripts/seed-demo.js` | Insert six demo events (`demo: true`) for UI review |
| `node scripts/seed-demo.js --clear` | Remove exactly those demo events |

## Project layout

```
src/
  index.js           app setup, CORS, health, error handler
  config/db.js       Mongo connection + index creation
  middleware/auth.js requireAuth / optionalAuth (JWT via JWKS)
  routes/            events.js, profile.js
  utils/helpers.js   asyncHandler, HttpError, toId, serialize, date helpers
scripts/
  seed-demo.js       demo data seeder (idempotent, reversible)
```

## License

Built as an academic assignment (B14 — A8).

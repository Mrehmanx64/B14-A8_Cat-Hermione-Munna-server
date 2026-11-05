# Shongkolpo Server API

Backend API for the Shongkolpo community events application.

## Setup

1. Copy `.env.example` to `.env`.
2. Update `MONGODB_URI` and `CLIENT_URL`.
3. Run `npm install`.
4. Run `npm run dev`.

## API Documentation

- `GET /api/health` - Check API health.
- `GET /api/events/upcoming` - List upcoming events.
- `GET /api/events/mine` - List user-created events.
- `GET /api/events/joined` - List joined events.
- `GET /api/events/:id` - Get event details.
- `POST /api/events` - Create an event.
- `PATCH /api/events/:id` - Update an event.
- `DELETE /api/events/:id` - Delete an event.
- `POST /api/events/:id/join` - Join an event.
- `PATCH /api/profile` - Update profile (validation only).
- `GET /api/profile/stats` - Get user stats.

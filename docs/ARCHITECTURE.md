# Architecture

How WG Buddy is put together, and why it is built this way.

## Overview

WG Buddy is two applications. The **API** is an Express server that owns the database and exposes REST endpoints on port 3000. The **web app** is a React single-page app on port 5173 that never touches the database directly; it only talks to the API over HTTP. Data lives in PostgreSQL, and Prisma maps between database rows and TypeScript objects.

```
┌──────────────┐   fetch('/api/items')   ┌─────────────┐   SQL    ┌────────────┐
│  React app   │ ──────────────────────> │ Express API │ ───────> │ PostgreSQL │
│  (browser)   │ <────────────────────── │  (Node.js)  │ <─────── │            │
└──────────────┘        JSON             └─────────────┘          └────────────┘
```

Keeping them separate forces a real API boundary: the web app cannot reach around the API to query the database, which means the same API could later serve a mobile client unchanged. The cost is running two processes in development and configuring CORS.

## Request lifecycle

Ticking an item off the shopping list:

1. `apps/web/src/pages/Shopping.tsx` - the checkbox calls `toggle(item)`.
2. The item is updated in local state immediately, before the server replies. This **optimistic update** keeps the UI responsive; if the request fails, `reload()` restores the server's version.
3. `apps/web/src/api.ts` - `api.items.update(id, { done: true })` issues `PATCH /api/items/<id>`.
4. `apps/api/src/routes/items.ts` - the route validates the body against a Zod schema, confirms the item exists, and delegates to Prisma.
5. Prisma emits an SQL `UPDATE`; Postgres commits the row.
6. The updated record returns as JSON.

## Project layout

```
apps/api/
  prisma/schema.prisma   Data model - the source of truth for the tables.
  prisma/seed.ts         Demo data for local development.
  src/index.ts           Server startup and route registration.
  src/db.ts              Single shared Prisma client.
  src/schemas.ts         Zod validation rules for every accepted payload.
  src/http.ts            Shared error handling and async route wrapper.
  src/routes/            One module per resource.

apps/web/
  src/api.ts             The only place that knows API URLs.
  src/types.ts           TypeScript shapes mirroring API responses.
  src/hooks.ts           useAsync - loading/error/data for any fetch.
  src/App.tsx            Route table.
  src/components/        Layout shell and shared UI primitives.
  src/pages/             One module per screen.
```

## Design decisions

### No authentication yet

Members are rows in the database with no credentials; the current user is chosen from a dropdown and remembered in `localStorage`. This was deliberate. The goal was to get shared data, relationships and validation working before adding sessions. The `Member` model is the seam that real accounts would attach to.

**Consequence:** anyone who knows a household ID can read and modify it. This is a known limitation rather than an oversight, and it is tracked on the roadmap.

### Validation lives in one module

All request validation is defined in `apps/api/src/schemas.ts` rather than inline in each route, so the rules are discoverable and applied consistently. Failures are converted by `errorHandler` into a `400` with per-field messages, which the frontend renders next to the offending input.

### PATCH rather than PUT

Updates are partial. Ticking a checkbox changes only `done`, so the API accepts `PATCH` with just the changed fields rather than requiring a full replacement.

### Deletion behaviour differs by relationship

| Relationship      | On delete | Rationale                                           |
| ----------------- | --------- | --------------------------------------------------- |
| Household → items | `Cascade` | Deleting a household should remove its contents     |
| Household → tasks | `Cascade` | Same                                                |
| Member → items    | `SetNull` | Losing a flatmate must not delete the shopping list |
| Member → tasks    | `SetNull` | Tasks survive and become unassigned                 |

### Collision-resistant IDs

Records use `cuid()` rather than auto-incrementing integers. Sequential IDs leak volume information and make other records trivially guessable, which matters more than usual here because there is no authorisation layer yet.

### Profile photos are stored in the database

Photos are held on `Member.avatarUrl` as a JPEG data URL rather than as files on disk or in object storage.

| Option           | Assessment                                               |
| ---------------- | -------------------------------------------------------- |
| Local filesystem | Rejected. Many hosts wipe the filesystem on redeploy      |
| S3 / Cloudinary  | Correct at scale, but adds an account, keys and cost      |
| Database column  | **Chosen.** No extra infrastructure, survives redeploys   |

This is viable because `apps/web/src/image.ts` centre-crops and resizes every image to 256x256 in the browser before upload, so a multi-megabyte phone photo becomes roughly 15 kB. At larger scale, object storage would be the right move.

Two safeguards apply. `express.json({ limit: "1mb" })` bounds request size, and the `avatarUrl` rule accepts only `data:image/jpeg|png|webp`. The second one matters: data URLs are rendered directly by the browser, so accepting `data:text/html` would allow stored XSS against other household members.

### The overview endpoint is separate

`routes/overview.ts` is the only endpoint that reads from both shopping items and tasks, so it belongs with neither. It runs its three queries concurrently with `Promise.all` and groups tasks into overdue, this week, and undated.

## Known limitations

- **No authentication or authorisation.** Household IDs are the only barrier.
- **No automated tests.** The highest-value next addition.
- **No live updates.** Two browsers share one database but must refresh to see each other's changes; websockets are not implemented.
- **Lists are refetched whole** rather than cached incrementally. Fine at household scale, wasteful at larger sizes.

## Glossary

- **REST API** - URLs identify resources (`/items/123`), HTTP methods describe the action (`GET`, `POST`, `PATCH`, `DELETE`).
- **ORM** - maps database rows to objects; here, Prisma.
- **Migration** - a recorded, replayable change to database structure.
- **CORS** - the browser rule restricting cross-origin requests. In development the Vite proxy forwards `/api` to port 3000 so both appear same-origin.
- **Optimistic update** - updating the UI before the server confirms, rolling back on failure.
- **Foreign key** - a column referencing another table's row. `Task.assigneeId` referencing `Member.id` is what makes it a relationship.

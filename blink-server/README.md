# Blink backend

Express API backed by MongoDB (using Mongoose), with live sync from Coursera, edX, and Udemy. Secrets stay server-side; the frontend never talks to Coursera/edX/Udemy directly.

## Setup

```bash
npm install
cp .env.example .env        # set MONGODB_URI and ADMIN_API_KEY
npm run migrate             # syncs indexes in MongoDB
npm run seed                # loads the curated fallback list (freeCodeCamp, Khan Academy, MIT OCW, etc.)
npm start
```

Visit `http://localhost:3000/api/courses` — you should see the
seeded curated courses as JSON.

Pull in live Coursera/edX results whenever you like:

```bash
npm run sync
# or a specific topic:
npm run sync -- "machine learning"
```

Coursera works immediately (its Catalog API is public, no key
needed). edX and Udemy stay silent no-ops until you add real
credentials to `.env` — see the comments in `.env.example` for where
to apply.

## Database

MongoDB database configured via `MONGODB_URI` (default `mongodb://127.0.0.1:27017/blink`), managed through Mongoose models:

- **courses** — every listing, whether curated by hand, added
  manually through the API, or pulled from a live sync. `external_id`
  is the dedupe key (e.g. `coursera-12345`, `fcc-rwd`), so re-seeding
  or re-syncing updates existing documents instead of creating duplicates.
- **users** — user authentication, bios, and password hashes.
- **domains** — interactive domain roadmap steps referencing course documents.
- **sync_log** — one entry per sync attempt per source, so you can see
  what succeeded, what failed, and why (`GET /api/status` surfaces
  the last 10).

## API reference

All responses are JSON.

| Method | Path                    | Auth        | Description                                  |
|--------|-------------------------|-------------|-----------------------------------------------|
| GET    | `/api/courses`          | none        | List/search courses. Query params: `platform`, `category`, `q`, `page`, `limit` |
| GET    | `/api/courses/:id`      | none        | Single course by numeric id                   |
| POST   | `/api/courses`          | `x-admin-key` | Add or upsert a course (body: title, platform, url required) |
| PUT    | `/api/courses/:id`      | `x-admin-key` | Edit any subset of fields                     |
| DELETE | `/api/courses/:id`      | `x-admin-key` | Remove a course                               |
| GET    | `/api/courses/platforms`| none        | Distinct platform list                        |
| GET    | `/api/courses/categories`| none       | Distinct category list                        |
| POST   | `/api/sync`             | `x-admin-key` | Pull fresh results from Coursera/edX/Udemy. Optional `?q=` or `{"query": "..."}` |
| GET    | `/api/status`           | none        | Counts by source + recent sync history        |
| POST   | `/api/auth/signup`      | none        | Create an account. Body: `name`, `email`, `password` (8+ chars). Returns `{ token, user }` |
| POST   | `/api/auth/login`       | none        | Body: `email`, `password`. Returns `{ token, user }` |
| GET    | `/api/profile`          | `Bearer` token | Current user's profile                     |
| PUT    | `/api/profile`          | `Bearer` token | Update `name`, `email`, `bio`, or password (send `currentPassword` + `newPassword` together) |
| POST   | `/api/chat`             | none        | Chat with the course-finding assistant. Body: `{ message, history: [{role, content}, ...] }` |
| GET    | `/api/domains`          | none        | List domains (Machine Learning, Web Development, etc.) with step/course counts |
| GET    | `/api/domains/:slug`    | none        | Full roadmap for one domain — ordered steps, each with its real course rows |

User accounts are a separate auth scheme from the admin key above:
courses are managed with `x-admin-key` (one shared secret, for you as
the operator), while signup/login/profile use per-user JWTs sent as
`Authorization: Bearer <token>`, valid for 30 days. Passwords are
hashed with bcrypt before they ever touch the database.

Example — sign up and use the token:

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"correcthorse"}'

curl http://localhost:3000/api/profile \
  -H "Authorization: Bearer <token from the response above>"
```

Example — add a course by hand:

```bash
curl -X POST http://localhost:3000/api/courses \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{
    "title": "Intro to Rust",
    "platform": "Udemy",
    "category": "Programming",
    "level": "Beginner",
    "access": "Free preview",
    "url": "https://www.udemy.com/courses/search/?q=rust%20free"
  }'
```

Example — trigger a live sync:

```bash
curl -X POST "http://localhost:3000/api/sync?q=python" \
  -H "x-admin-key: $ADMIN_API_KEY"
```

## Background sync (optional)

Set `SYNC_INTERVAL_MINUTES` in `.env` to a number greater than 0 and
the server will re-sync on that cadence automatically while it's
running. Leave it at 0 and trigger syncs manually (`npm run sync`,
the `POST /api/sync` endpoint, or your host's own cron/scheduler) if
you'd rather control exactly when it happens.

## Getting the gated credentials

**edX** — apply at https://api.edx.org. Their API is explicitly for
informational use, not affiliate marketing, which fits this project.

**Udemy** — apply to the Affiliate Program first at
https://www.udemy.com/affiliate/ (runs on Impact, ~3–4 business days
to review), then create an API client at
https://www.udemy.com/instructor/api-clients/.

Both require your own account (and for Udemy, payout/tax details) —
not something I can apply for on your behalf.

## Chat assistant

`POST /api/chat` runs a real Claude model (`@anthropic-ai/sdk`), grounded
in your own catalog: before every reply, the server pulls a handful of
courses from the `courses` table that look relevant to the question and
tells Claude to only recommend from that list — so it can't invent a
course, platform, or URL that isn't actually in your database.

To turn it on:

1. Get a key at https://console.anthropic.com → API Keys (under your
   organization's settings).
2. Set `ANTHROPIC_API_KEY` in `.env`.
3. Optionally set `ANTHROPIC_MODEL` — defaults to
   `claude-haiku-4-5-20251001` (fast and cheap, good for this kind of
   Q&A). Swap to `claude-sonnet-5` for noticeably better answers at a
   higher cost per message.
4. Restart the server. `GET /api/status` will show `chatConfigured: true`
   once it's picked up.

Leave `ANTHROPIC_API_KEY` blank and `/api/chat` just returns a clear
503 error instead of crashing — the rest of the site is unaffected
either way.

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to get into machine learning, where do I start?"}'
```

## Domain roadmaps

`GET /api/domains` and `GET /api/domains/:slug` power the "Pick a
domain" feature — click "Machine Learning" and get back an ordered
sequence of steps, each pointing at real courses already in your
`courses` table (never invented, never a dead link).

Three tables make this work: `domains`, `domain_steps`, and
`domain_step_courses` (a step can list more than one course). The
actual roadmap content — which domains exist, what their steps are,
which courses belong to each step — lives in `lib/domainsData.js`,
referencing courses by their stable `external_id` from
`lib/staticCourses.js` (not live-synced courses, since those IDs
change every sync).

To change a roadmap: edit `lib/domainsData.js`, then:

```bash
npm run seed
```

This is safe to re-run any time — each domain's steps are rebuilt
from the data file on every seed, so nothing duplicates or goes
stale. If you reference a course ID that doesn't exist in
`staticCourses.js` yet, the seed script tells you exactly which one:

```
Warning: some roadmap steps referenced course IDs that don't exist yet:
  - machine-learning → "Core machine learning" → coursera-ml-specialization
```

## Deploying

Plain Node + a single SQLite file. Runs on Render, Railway, Fly.io,
or any small VPS with **Node 22.13+** — check your host's Node
version setting, since some default to an older LTS. Two things to
get right on whichever host you pick:

1. **Persistent disk for `blink.db`.** Some free tiers wipe the
   filesystem on every redeploy — if that happens to you, either pay
   for a persistent volume/disk, or point `DB_PATH` at one.
2. **Set `CORS_ORIGIN`** to your real frontend's domain instead of
   `*` once you're live.

## Wiring up the frontend

`blink.html` already fetches from `API_BASE_URL` (near the top of its
`<script>` block) and expects exactly this shape:
`{ count, results: [...] }` — which is what `GET /api/courses`
returns. Point that constant at wherever you deploy this and it just
works; no other frontend changes needed.

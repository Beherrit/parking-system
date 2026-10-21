# Parking system

A parking lot with a fixed number of small and large spots, run by signed-in attendants.

- A small car takes the lowest-numbered free small spot, and a large spot only when no small one is free.
- A large car takes large spots only. It is refused even when small spots are free.
- Parking issues a ticket with the car number, spot number and arrival time.
- The car comes back only with the ticket code and the matching plate. A returned ticket can't be used again.

The full rule set, data model and API are in [docs/CONTRACT.md](docs/CONTRACT.md).

## Stack

Next.js 16 (App Router) on Vercel, Supabase (Postgres and Auth), Vitest, Playwright.

## Run it locally

Needs Node 24 and Docker.

```bash
npm install
npx supabase start      # local Postgres + Auth, applies migrations and seed
npm run env:local       # writes .env.local from the running stack and .env.example
npm run dev             # http://localhost:3000
```

Sign in with a seeded test attendant (`E2E_ATTENDANT_EMAIL` / `E2E_ATTENDANT_PASSWORD` in `.env.example`; local only).

## Tests

| Command | What it covers |
|---|---|
| `npm run test:unit` | Allocation, plate, ticket code and duration rules (pure functions) |
| `npm run test:api` | Black-box HTTP tests, database constraints and RLS, and concurrency races (needs the dev server and Supabase running) |
| `npm run test:e2e` | Playwright journeys through the attendant screens |

The API and E2E suites share one lot, so they run serially and must never overlap against the same database.

CI (`.github/workflows/ci.yml`) runs typecheck, lint and all three levels on every PR, against a local Supabase.

## Design choices

- **Correctness lives in the database.** Large car in a small spot, two cars in one spot, and two active tickets for one plate are all impossible at the database level (check constraint, composite foreign key, partial unique indexes), so a bug or a race in the app can't break them.
- **The allocation rule lives once**, in `src/domain/allocation.ts`. When two attendants race for the same spot, the database rejects the second insert and that request picks again. Every conflict means another car got a spot, so the retry loop always ends with a ticket or "lot full", never a server error.
- **Row-level security:** only signed-in attendants can read or write. Tickets record who issued and who returned them, can't be deleted, and can be returned once.

## Code map

```
src/domain/        pure rules and types: allocation, plate, size, ticket-code, duration, errors
src/server/        services (park, return-car, queries), repositories, HTTP helpers
src/lib/supabase/  browser and request-scoped Supabase clients
src/app/api/       thin route handlers: /api/tickets, /api/tickets/{code}, /api/tickets/{code}/return, /api/spots
src/app/           pages: / (lot), /login, /tickets/{code} (printable)
src/ui/            attendant screen components
src/proxy.ts       session refresh and sign-in redirect
supabase/          migrations (schema, RLS) and local seed
tests/unit|api|e2e test levels; tests/support holds shared env and db helpers
```

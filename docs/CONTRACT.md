# Build contract

The single source of truth that every module is built against. Change this file first, then the code.

## Rules (from the spec, plus decided defaults)

| ID | Rule |
|---|---|
| R1 | One lot, fixed numbered spots, each small or large. Seed: S1..S10 small, L1..L5 large. |
| R2 | Cars are small or large. |
| R3 | Small car: lowest-numbered free small spot; only if none is free, lowest-numbered free large spot. |
| R4 | Large car: lowest-numbered free large spot only. Refused (LOT_FULL) even if small spots are free. |
| R5 | Returning a car frees its spot immediately. Cars are never moved. |
| R6 | Parking issues a ticket: code, plate, spot number, arrival time. |
| R7 | Return requires ticket code AND plate; both must match. Wrong plate is rejected without revealing the real plate; the ticket stays valid. |
| D1 | Plate normalization: upper case, strip spaces and dashes; valid result is `^[A-Z0-9]{2,10}$`. |
| D2 | A plate with an active ticket cannot park again (ALREADY_PARKED). |
| D3 | Ticket code: 8 chars, Crockford base32 alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ`. Input normalization: upper case, strip spaces and dashes. |
| D4 | Returned tickets are kept (history). Returning twice is ALREADY_RETURNED. |
| D5 | Times stored UTC (timestamptz), shown in viewer's local time. Duration = whole minutes, floored. |
| D6 | "Lowest-numbered" is natural order: S2 before S10. Listings show small spots first, then large, each in natural order (S1..S10, L1..L5). |
| D8 | Return input: the plate is normalized like D1. A code that fails D3 is 400 INVALID_INPUT. Checks run in order: not found (404), already returned (409), plate mismatch (422). |
| D7 | Only signed-in attendants can do anything. Tickets record issued_by and returned_by. |

## Domain (`src/domain/`, pure, no I/O)

Types live in `types.ts`, errors in `errors.ts` (already written).

```ts
// plate.ts
normalizePlate(input: unknown): string          // throws ParkingError("INVALID_INPUT")
// size.ts
parseSize(input: unknown): Size                 // throws INVALID_INPUT
// ticket-code.ts
generateTicketCode(randomBytes?: (n: number) => Uint8Array): string
normalizeTicketCode(input: unknown): string     // throws INVALID_INPUT
// allocation.ts
compareSpotNumbers(a: string, b: string): number // natural order
chooseSpot(freeSpots: Spot[], carSize: Size): Spot | null
// duration.ts
durationMinutes(arrivedAtIso: string, returnedAtIso: string): number
```

## Database (`supabase/`)

```sql
create type car_size as enum ('small', 'large');

spots(id uuid pk default gen_random_uuid(), number text unique not null, size car_size not null,
      unique (id, size))

tickets(id uuid pk default gen_random_uuid(),
        code text unique not null check (code ~ '^[0-9A-HJKMNP-TV-Z]{8}$'),
        plate text not null check (plate ~ '^[A-Z0-9]{2,10}$'),
        car_size car_size not null,
        spot_id uuid not null, spot_size car_size not null,
        arrived_at timestamptz not null default now(),
        returned_at timestamptz,
        issued_by uuid references auth.users default auth.uid(),
        returned_by uuid references auth.users,
        foreign key (spot_id, spot_size) references spots (id, size),
        check (car_size = 'small' or spot_size = 'large'),
        check (returned_at is null or returned_at >= arrived_at))

unique index tickets_one_car_per_spot     on tickets (spot_id) where returned_at is null
unique index tickets_one_active_per_plate on tickets (plate)   where returned_at is null
```

The index names are part of the contract: the server maps a 23505 on
`tickets_one_car_per_spot` or `tickets_code_key` to "retry", and on
`tickets_one_active_per_plate` to ALREADY_PARKED.

RLS on both tables. `authenticated` may select spots; select and insert tickets;
update tickets only where `returned_at is null` (USING), and only the columns
`returned_at, returned_by` (column-level grant). No delete for anyone but
service_role. `anon` gets nothing.

Seed (`supabase/seed.sql`, local only): the 15 spots, plus two attendants in
`auth.users` + `auth.identities` whose emails and password are in `.env.example`
(`E2E_ATTENDANT_EMAIL`, `E2E_ATTENDANT_EMAIL_2`, `E2E_ATTENDANT_PASSWORD`).

## Supabase clients (`src/lib/supabase/`)

```ts
env.ts      supabaseUrl(), supabaseAnonKey()   // NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
                                               // (falls back to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
browser.ts  createBrowserSupabase()            // @supabase/ssr createBrowserClient
server.ts   getRequestSupabase(req: Request): Promise<{ db: SupabaseClient; userId: string | null }>
            // Authorization: Bearer <access token> wins (API tests use it); otherwise the cookie session.
```

## Services (`src/server/`, take a client, return domain types, throw ParkingError)

```ts
parkCar(db, input: { plate: unknown; size: unknown }, userId: string): Promise<Ticket>
returnCar(db, input: { code: unknown; plate: unknown }, userId: string): Promise<ReturnResult>
getTicket(db, code: unknown): Promise<Ticket>
listSpots(db): Promise<SpotStatus[]>            // natural order
listActiveTickets(db): Promise<Ticket[]>        // newest first
```

`parkCar`: loop of (read free spots, chooseSpot, null => LOT_FULL, insert).
Retry on spot or code conflict, with a short random backoff (0-25 ms): every
spot conflict means another car got that spot, so the loop always makes
progress and ends in a ticket or LOT_FULL. Safety cap 20 attempts, then
BUSY (503). Plate conflict => ALREADY_PARKED. Many cars parking at once must
never produce a 500.
`returnCar`: unknown code => TICKET_NOT_FOUND; returned => ALREADY_RETURNED;
plate differs => PLATE_MISMATCH; the update is `where returned_at is null` and
zero rows updated => ALREADY_RETURNED.

## HTTP API (`src/app/api/`)

All routes need a session (cookie or Bearer), else 401 `UNAUTHENTICATED`.
Success bodies below; every error is `{ "error": { "code": ParkingErrorCode, "message": string } }`
with the status from `HTTP_STATUS`.

| Method | Path | Body | Success |
|---|---|---|---|
| POST | `/api/tickets` | `{ plate, size }` | 201 `{ ticket }` |
| GET | `/api/tickets?active=true` | | 200 `{ tickets }` |
| GET | `/api/tickets/{code}` | | 200 `{ ticket }` |
| POST | `/api/tickets/{code}/return` | `{ plate }` | 200 `{ ticket, durationMinutes }` |
| GET | `/api/spots` | | 200 `{ spots }` |

Malformed JSON => 400 INVALID_INPUT. Unexpected failures => 500 INTERNAL with a
generic message (detail logged server side only). `GET /api/tickets` without
`active=true` also lists active tickets (only the active listing exists). Route handlers stay thin: parse, call a
service, map errors (one shared helper in `src/server/http.ts`).

## UI

- `/login`: email + password, Supabase Auth. Signed-out visits to any page redirect here (Next 16 `src/proxy.ts`).
- `/`: spot grid, park form (plate, size), return form (code, plate), active tickets list, sign out.
- `/tickets/{code}`: printable ticket.
- Every interactive element and result region has a `data-testid` (listed in `tests/e2e/TESTIDS.md`, owned by the UI author).

## Tests

- `tests/unit/` (Vitest): domain only.
- `tests/api/` (Vitest, serial): black-box HTTP against `BASE_URL` with a local Supabase. Reset with `tests/support/db.ts`.
- `tests/e2e/` (Playwright): page objects in `tests/e2e/pages/`.
- `tests/support/`: shared env and db helpers.

-- Parking lot schema. See docs/CONTRACT.md (Database) for the rules behind each constraint.

create type car_size as enum ('small', 'large');

create table spots (
  id     uuid primary key default gen_random_uuid(),
  number text unique not null,
  size   car_size not null,
  -- Lets tickets reference (id, size) so a ticket's spot_size cannot drift from the spot.
  unique (id, size)
);

create table tickets (
  id          uuid primary key default gen_random_uuid(),
  -- 8 chars, Crockford base32 (no I, L, O, U).
  code        text unique not null check (code ~ '^[0-9A-HJKMNP-TV-Z]{8}$'),
  -- Stored normalized: upper case, letters and digits only.
  plate       text not null check (plate ~ '^[A-Z0-9]{2,10}$'),
  car_size    car_size not null,
  spot_id     uuid not null,
  spot_size   car_size not null,
  arrived_at  timestamptz not null default now(),
  returned_at timestamptz,
  issued_by   uuid references auth.users default auth.uid(),
  returned_by uuid references auth.users,
  foreign key (spot_id, spot_size) references spots (id, size),
  -- A large car never goes in a small spot (small cars may use either).
  check (car_size = 'small' or spot_size = 'large'),
  check (returned_at is null or returned_at >= arrived_at)
);

-- The two races the server relies on: two cars on one spot, one plate parked twice.
-- Partial, so returned tickets (history) never block a spot or a plate.
create unique index tickets_one_car_per_spot     on tickets (spot_id) where returned_at is null;
create unique index tickets_one_active_per_plate on tickets (plate)   where returned_at is null;

-- The lot itself: S1..S10 small, L1..L5 large. Changing the lot means a new migration.
insert into spots (number, size)
select 'S' || n, 'small'::car_size from generate_series(1, 10) n
union all
select 'L' || n, 'large'::car_size from generate_series(1, 5) n;

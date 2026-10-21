-- Local development and test data only. Not real accounts.

-- The lot: S1..S10 small, L1..L5 large.
insert into spots (number, size)
select 'S' || n, 'small'::car_size from generate_series(1, 10) n
union all
select 'L' || n, 'large'::car_size from generate_series(1, 5) n;

-- Two attendants (emails and password match .env.example). Written straight into auth tables,
-- so GoTrue's token columns must be '' rather than null or sign-in fails with a scan error.
with attendants(id, email) as (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid, 'attendant1@parking.test'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 'attendant2@parking.test')
),
new_users as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select
    '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
    crypt('qQNOwH7tBLR1R0Tr', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  from attendants
  returning id, email
)
insert into auth.identities (
  id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), id, 'email', id::text,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  now(), now(), now()
from new_users;

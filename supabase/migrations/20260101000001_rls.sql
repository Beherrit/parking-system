-- Access rules. Only signed-in attendants (role authenticated) can do anything; anon gets nothing.
-- service_role bypasses RLS and keeps its default grants (used by test setup and ops only).

alter table spots   enable row level security;
alter table tickets enable row level security;

-- Supabase grants everything on new public tables to anon and authenticated by default.
-- Start from zero and grant back only what the contract allows.
revoke all on spots   from anon, authenticated;
revoke all on tickets from anon, authenticated;

grant select on spots to authenticated;
grant select, insert on tickets to authenticated;
-- Column-level: a return may set these two columns and nothing else (plate, spot, code stay fixed).
grant update (returned_at, returned_by) on tickets to authenticated;
-- No delete grant: tickets are history.

create policy spots_select on spots
  for select to authenticated using (true);

create policy tickets_select on tickets
  for select to authenticated using (true);

-- issued_by must be the caller (no forging another attendant), and a ticket is born active.
create policy tickets_insert on tickets
  for insert to authenticated
  with check (issued_by = auth.uid() and returned_at is null and returned_by is null);

-- Only active tickets can be updated (USING), and the result must be a return by the caller.
-- WITH CHECK is explicit because the default would reuse USING and forbid setting returned_at.
create policy tickets_return on tickets
  for update to authenticated
  using (returned_at is null)
  with check (returned_at is not null and returned_by = auth.uid());

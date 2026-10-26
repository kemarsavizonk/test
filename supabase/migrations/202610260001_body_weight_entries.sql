-- Private, date-only body-weight measurements. Canonical kilograms prevent unit drift.
begin;
create table public.body_weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(10,4) not null check (weight_kg > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, measured_on)
);
create index body_weight_entries_user_date_idx on public.body_weight_entries(user_id, measured_on desc);
alter table public.body_weight_entries enable row level security;
create policy "Users manage their own body weights" on public.body_weight_entries
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.body_weight_entries to authenticated;
commit;

create table if not exists public.gym_user_states (
  dni text primary key check (dni ~ '^[0-9]{7,8}$'),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.gym_user_states enable row level security;

grant usage on schema public to anon;
grant select, insert, update on public.gym_user_states to anon;

drop policy if exists "Public can read gym user states" on public.gym_user_states;
create policy "Public can read gym user states"
  on public.gym_user_states for select to anon
  using (true);

drop policy if exists "Public can insert gym user states" on public.gym_user_states;
create policy "Public can insert gym user states"
  on public.gym_user_states for insert to anon
  with check (true);

drop policy if exists "Public can update gym user states" on public.gym_user_states;
create policy "Public can update gym user states"
  on public.gym_user_states for update to anon
  using (true)
  with check (true);

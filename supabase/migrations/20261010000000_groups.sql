-- Forkcast group voting tables.
-- Paste this whole file into Supabase > SQL Editor and press Run (SETUP.md, step 3).

create table if not exists public.groups (
  code        text primary key check (code ~ '^[A-Z]{4}$'),
  host_id     uuid not null default auth.uid(),
  status      text not null default 'lobby' check (status in ('lobby', 'swiping', 'results')),
  settings    jsonb not null default '{}'::jsonb,
  deck        jsonb not null default '[]'::jsonb,
  ends_at     timestamptz,
  result      jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.members (
  group_code  text not null references public.groups(code) on delete cascade,
  user_id     uuid not null default auth.uid(),
  name        text not null check (char_length(name) between 1 and 20),
  diets       text[] not null default '{}',
  swipes      text not null default '' check (swipes ~ '^[01]{0,40}$'),
  veto        text,
  done        boolean not null default false,
  joined_at   timestamptz not null default now(),
  primary key (group_code, user_id)
);

alter table public.groups enable row level security;
alter table public.members enable row level security;

-- Anyone signed in (including anonymous guests) can see groups and members.
-- They still need the 4-letter code to find a group.
drop policy if exists "groups readable" on public.groups;
create policy "groups readable" on public.groups for select to authenticated using (true);
drop policy if exists "host creates group" on public.groups;
create policy "host creates group" on public.groups for insert to authenticated with check (host_id = auth.uid());
drop policy if exists "host updates group" on public.groups;
create policy "host updates group" on public.groups for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());
drop policy if exists "host deletes group" on public.groups;
create policy "host deletes group" on public.groups for delete to authenticated using (host_id = auth.uid());

drop policy if exists "members readable" on public.members;
create policy "members readable" on public.members for select to authenticated using (true);
drop policy if exists "join as yourself" on public.members;
create policy "join as yourself" on public.members for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "update your own votes" on public.members;
create policy "update your own votes" on public.members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "leave a group" on public.members;
create policy "leave a group" on public.members for delete to authenticated using (user_id = auth.uid());

-- Live updates for the voting screens.
do $$
begin
  begin alter publication supabase_realtime add table public.groups; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.members; exception when duplicate_object then null; end;
end $$;

-- Optional tidy-up: delete groups after a day.
-- Turn on the pg_cron extension (Database > Extensions), then run:
-- select cron.schedule('forkcast-cleanup', '0 4 * * *',
--   $$delete from public.groups where created_at < now() - interval '1 day'$$);

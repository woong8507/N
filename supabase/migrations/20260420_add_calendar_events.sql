begin;

alter table public.matches
add column if not exists match_start_at timestamptz,
add column if not exists match_end_at timestamptz;

update public.matches
set
  match_start_at = coalesce(match_start_at, match_date),
  match_end_at = coalesce(match_end_at, match_date + interval '1 hour')
where match_start_at is null or match_end_at is null;

alter table public.matches
alter column match_start_at set not null,
alter column match_end_at set not null;

alter table public.matches
drop constraint if exists matches_time_range_check;

alter table public.matches
add constraint matches_time_range_check
check (match_end_at > match_start_at);

create table if not exists public.calendar_events (
  id bigserial primary key,
  season_id bigint references public.seasons(id) on delete set null,
  linked_match_id bigint references public.matches(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  location_floor text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_all_day boolean not null default false,
  source_type text not null default 'manual',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.calendar_events
  drop constraint if exists calendar_events_type_check;
alter table public.calendar_events
  add constraint calendar_events_type_check
  check (event_type in ('holiday', 'match', 'leave', 'business_trip', 'personal'));

alter table public.calendar_events
  drop constraint if exists calendar_events_time_check;
alter table public.calendar_events
  add constraint calendar_events_time_check
  check (end_at > start_at);

alter table public.calendar_events
  drop constraint if exists calendar_events_floor_check;
alter table public.calendar_events
  add constraint calendar_events_floor_check
  check (location_floor is null or location_floor in ('3F', '4F'));

alter table public.calendar_events
  drop constraint if exists calendar_events_source_type_check;
alter table public.calendar_events
  add constraint calendar_events_source_type_check
  check (source_type in ('manual', 'holiday_sync', 'match_sync'));

create index if not exists calendar_events_start_at_idx
  on public.calendar_events(start_at);
create index if not exists calendar_events_type_idx
  on public.calendar_events(event_type);
create index if not exists calendar_events_created_by_idx
  on public.calendar_events(created_by);
create index if not exists calendar_events_season_id_idx
  on public.calendar_events(season_id);
create unique index if not exists calendar_events_linked_match_id_uidx
  on public.calendar_events(linked_match_id);

create or replace function private.sync_match_calendar_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.calendar_events
    where linked_match_id = old.id;
    return old;
  end if;

  insert into public.calendar_events (
    season_id,
    linked_match_id,
    event_type,
    title,
    description,
    location_floor,
    start_at,
    end_at,
    is_all_day,
    source_type,
    created_by
  )
  values (
    new.season_id,
    new.id,
    'match',
    format('1팀(%s) vs 2팀(%s)', coalesce(new.home_players, '-'), coalesce(new.away_players, '-')),
    format('경기장 %s | %s', coalesce(new.place, '-'), coalesce(new.weekday, '')),
    new.place,
    new.match_start_at,
    new.match_end_at,
    false,
    'match_sync',
    new.created_by
  )
  on conflict (linked_match_id)
  do update set
    season_id = excluded.season_id,
    title = excluded.title,
    description = excluded.description,
    location_floor = excluded.location_floor,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    is_all_day = excluded.is_all_day,
    created_by = excluded.created_by;

  return new;
end;
$$;

revoke all on function private.sync_match_calendar_event() from public;
revoke all on function private.sync_match_calendar_event() from anon;
revoke all on function private.sync_match_calendar_event() from authenticated;

drop trigger if exists matches_sync_calendar_events on public.matches;
create trigger matches_sync_calendar_events
after insert or update or delete on public.matches
for each row execute procedure private.sync_match_calendar_event();

insert into public.calendar_events (
  season_id,
  linked_match_id,
  event_type,
  title,
  description,
  location_floor,
  start_at,
  end_at,
  is_all_day,
  source_type,
  created_by
)
select
  m.season_id,
  m.id,
  'match',
  format('1팀(%s) vs 2팀(%s)', coalesce(m.home_players, '-'), coalesce(m.away_players, '-')),
  format('경기장 %s | %s', coalesce(m.place, '-'), coalesce(m.weekday, '')),
  m.place,
  m.match_start_at,
  m.match_end_at,
  false,
  'match_sync',
  m.created_by
from public.matches m
on conflict (linked_match_id)
do update set
  season_id = excluded.season_id,
  title = excluded.title,
  description = excluded.description,
  location_floor = excluded.location_floor,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  is_all_day = excluded.is_all_day,
  created_by = excluded.created_by;

alter table public.calendar_events enable row level security;

drop policy if exists "calendar events read authenticated" on public.calendar_events;
drop policy if exists "calendar events insert own personal" on public.calendar_events;
drop policy if exists "calendar events update own personal" on public.calendar_events;
drop policy if exists "calendar events delete own personal" on public.calendar_events;
drop policy if exists "calendar events insert admin" on public.calendar_events;
drop policy if exists "calendar events update admin" on public.calendar_events;
drop policy if exists "calendar events delete admin" on public.calendar_events;

create policy "calendar events read authenticated" on public.calendar_events
for select
to authenticated
using (true);

create policy "calendar events insert own personal" on public.calendar_events
for insert
to authenticated
with check (
  (created_by = (select auth.uid()))
  and (event_type in ('leave', 'business_trip', 'personal'))
  and (source_type = 'manual')
);

create policy "calendar events update own personal" on public.calendar_events
for update
to authenticated
using (
  (created_by = (select auth.uid()))
  and (event_type in ('leave', 'business_trip', 'personal'))
)
with check (
  (created_by = (select auth.uid()))
  and (event_type in ('leave', 'business_trip', 'personal'))
  and (source_type = 'manual')
);

create policy "calendar events delete own personal" on public.calendar_events
for delete
to authenticated
using (
  (created_by = (select auth.uid()))
  and (event_type in ('leave', 'business_trip', 'personal'))
);

create policy "calendar events insert admin" on public.calendar_events
for insert
to authenticated
with check ((select private.is_admin()));

create policy "calendar events update admin" on public.calendar_events
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "calendar events delete admin" on public.calendar_events
for delete
to authenticated
using ((select private.is_admin()));

commit;

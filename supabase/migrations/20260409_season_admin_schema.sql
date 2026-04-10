begin;

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'super_admin')
  );
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.is_admin() from anon;
revoke all on function private.is_admin() from authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, name, gender, role, avatar_path)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data ->> 'gender' in ('MALE', 'FEMALE', 'OTHER') then new.raw_user_meta_data ->> 'gender'
      else 'OTHER'
    end,
    'member',
    null
  )
  on conflict (id) do update
    set name = excluded.name,
        gender = excluded.gender;

  return new;
end;
$$;

create or replace function private.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.id <> old.id then
    raise exception 'profile id cannot be changed';
  end if;

  if new.role is distinct from old.role and not private.is_admin() then
    raise exception 'only admin can change profile role';
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists profiles_guard_role_change on public.profiles;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user();

create trigger profiles_guard_role_change
before update on public.profiles
for each row execute procedure private.guard_profile_role_change();

alter table public.profiles
add column if not exists avatar_path text;

alter table public.profiles
add column if not exists role text not null default 'member';

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('member', 'admin', 'super_admin'));

alter table public.profiles enable row level security;

drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles delete own" on public.profiles;
drop policy if exists "profiles select own or admin" on public.profiles;
drop policy if exists "profiles insert own row" on public.profiles;
drop policy if exists "profiles update own safe" on public.profiles;
drop policy if exists "profiles update admin" on public.profiles;

create policy "profiles select own or admin" on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
  or (select private.is_admin())
);

create policy "profiles insert own row" on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles update own safe" on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "profiles update admin" on public.profiles
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create table if not exists public.seasons (
  id bigserial primary key,
  name text not null,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  starts_at date,
  ends_at date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.seasons enable row level security;

drop policy if exists "seasons read authenticated" on public.seasons;
drop policy if exists "seasons write admin" on public.seasons;
drop policy if exists "seasons update admin" on public.seasons;
drop policy if exists "seasons delete admin" on public.seasons;

create policy "seasons read authenticated" on public.seasons
for select
to authenticated
using (true);

create policy "seasons write admin" on public.seasons
for insert
to authenticated
with check (
  (select private.is_admin())
  and ((created_by is null) or created_by = (select auth.uid()))
);

create policy "seasons update admin" on public.seasons
for update
to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and ((created_by is null) or created_by = (select auth.uid()))
);

create policy "seasons delete admin" on public.seasons
for delete
to authenticated
using ((select private.is_admin()));

alter table public.teams enable row level security;

drop policy if exists "teams read" on public.teams;
drop policy if exists "teams insert owner" on public.teams;
drop policy if exists "teams update owner" on public.teams;
drop policy if exists "teams delete owner" on public.teams;
drop policy if exists "teams write admin" on public.teams;
drop policy if exists "teams update admin" on public.teams;
drop policy if exists "teams delete admin" on public.teams;

alter table public.teams
drop column if exists created_by;

create policy "teams read" on public.teams
for select
to authenticated
using (true);

create policy "teams write admin" on public.teams
for insert
to authenticated
with check ((select private.is_admin()));

create policy "teams update admin" on public.teams
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "teams delete admin" on public.teams
for delete
to authenticated
using ((select private.is_admin()));

create table if not exists public.season_teams (
  id bigserial primary key,
  season_id bigint not null references public.seasons(id) on delete cascade,
  team_id bigint not null references public.teams(id) on delete cascade,
  display_order int,
  created_at timestamptz not null default now(),
  unique (season_id, team_id)
);

alter table public.season_teams enable row level security;

drop policy if exists "season_teams read authenticated" on public.season_teams;
drop policy if exists "season_teams write admin" on public.season_teams;
drop policy if exists "season_teams update admin" on public.season_teams;
drop policy if exists "season_teams delete admin" on public.season_teams;

create policy "season_teams read authenticated" on public.season_teams
for select
to authenticated
using (true);

create policy "season_teams write admin" on public.season_teams
for insert
to authenticated
with check ((select private.is_admin()));

create policy "season_teams update admin" on public.season_teams
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "season_teams delete admin" on public.season_teams
for delete
to authenticated
using ((select private.is_admin()));

alter table public.matches
add column if not exists season_id bigint references public.seasons(id) on delete cascade,
add column if not exists home_season_team_id bigint references public.season_teams(id) on delete restrict,
add column if not exists away_season_team_id bigint references public.season_teams(id) on delete restrict,
add column if not exists status text not null default 'scheduled',
add column if not exists push_sent_at timestamptz;

alter table public.matches
drop constraint if exists matches_status_check;

alter table public.matches
add constraint matches_status_check
check (status in ('scheduled', 'live', 'finished', 'cancelled'));

alter table public.matches
alter column home_players drop not null,
alter column away_players drop not null;

alter table public.matches enable row level security;

drop policy if exists "matches read all" on public.matches;
drop policy if exists "matches insert owner" on public.matches;
drop policy if exists "matches update owner" on public.matches;
drop policy if exists "matches delete owner" on public.matches;
drop policy if exists "matches read authenticated" on public.matches;
drop policy if exists "matches write admin" on public.matches;
drop policy if exists "matches update admin" on public.matches;
drop policy if exists "matches delete admin" on public.matches;

create policy "matches read authenticated" on public.matches
for select
to authenticated
using (true);

create policy "matches write admin" on public.matches
for insert
to authenticated
with check (
  (select private.is_admin())
  and ((created_by is null) or created_by = (select auth.uid()))
);

create policy "matches update admin" on public.matches
for update
to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and ((created_by is null) or created_by = (select auth.uid()))
);

create policy "matches delete admin" on public.matches
for delete
to authenticated
using ((select private.is_admin()));

create table if not exists public.match_push_logs (
  id bigserial primary key,
  match_id bigint not null references public.matches(id) on delete cascade,
  season_id bigint not null references public.seasons(id) on delete cascade,
  title text not null,
  body text not null,
  target_count int,
  status text not null default 'sent' check (status in ('sent', 'failed', 'partial')),
  sent_by uuid references auth.users(id),
  sent_at timestamptz not null default now()
);

alter table public.match_push_logs enable row level security;

drop policy if exists "match_push_logs read admin" on public.match_push_logs;
drop policy if exists "match_push_logs write admin" on public.match_push_logs;
drop policy if exists "match_push_logs update admin" on public.match_push_logs;
drop policy if exists "match_push_logs delete admin" on public.match_push_logs;

create policy "match_push_logs read admin" on public.match_push_logs
for select
to authenticated
using ((select private.is_admin()));

create policy "match_push_logs write admin" on public.match_push_logs
for insert
to authenticated
with check ((select private.is_admin()));

create policy "match_push_logs update admin" on public.match_push_logs
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "match_push_logs delete admin" on public.match_push_logs
for delete
to authenticated
using ((select private.is_admin()));

alter table public.push_tokens enable row level security;

drop policy if exists "push select own" on public.push_tokens;
drop policy if exists "push insert own" on public.push_tokens;
drop policy if exists "push update own" on public.push_tokens;
drop policy if exists "push delete own" on public.push_tokens;

create policy "push select own" on public.push_tokens
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "push insert own" on public.push_tokens
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "push update own" on public.push_tokens
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "push delete own" on public.push_tokens
for delete
to authenticated
using ((select auth.uid()) = user_id);

create unique index if not exists push_tokens_user_id_token_key
on public.push_tokens (user_id, token);

alter table public.notices enable row level security;

drop policy if exists "notices read" on public.notices;
drop policy if exists "notices insert owner" on public.notices;
drop policy if exists "notices update owner" on public.notices;
drop policy if exists "notices delete owner" on public.notices;
drop policy if exists "notices write admin" on public.notices;
drop policy if exists "notices update admin" on public.notices;
drop policy if exists "notices delete admin" on public.notices;

create policy "notices read" on public.notices
for select
to authenticated
using (true);

create policy "notices write admin" on public.notices
for insert
to authenticated
with check (
  (select private.is_admin())
  and author_id = (select auth.uid())
);

create policy "notices update admin" on public.notices
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "notices delete admin" on public.notices
for delete
to authenticated
using ((select private.is_admin()));

drop policy if exists "team_members read" on public.team_members;
drop policy if exists "team_members insert" on public.team_members;
drop policy if exists "team_members update" on public.team_members;
drop policy if exists "team_members delete" on public.team_members;
drop policy if exists "team_members write admin" on public.team_members;
drop policy if exists "team_members update admin" on public.team_members;
drop policy if exists "team_members delete admin" on public.team_members;

create policy "team_members read" on public.team_members
for select
to authenticated
using (true);

create policy "team_members write admin" on public.team_members
for insert
to authenticated
with check ((select private.is_admin()));

create policy "team_members update admin" on public.team_members
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "team_members delete admin" on public.team_members
for delete
to authenticated
using ((select private.is_admin()));

drop view if exists public.league_table;

create view public.league_table
with (security_invoker = true)
as
select
  row_number() over (
    partition by m.season_id
    order by sum(stats.points) desc, sum(stats.gf - stats.ga) desc, sum(stats.gf) desc
  ) as rank,
  m.season_id,
  s.name as season_name,
  st.team_id,
  t.name as team,
  sum(stats.play) as played,
  sum(stats.win) as wins,
  sum(stats.draw) as draws,
  sum(stats.loss) as losses,
  sum(stats.points) as points,
  sum(stats.gf) as gf,
  sum(stats.ga) as ga,
  sum(stats.gf - stats.ga) as gd
from public.matches m
join public.seasons s on s.id = m.season_id
join (
  select
    m1.id as match_id,
    m1.home_season_team_id as season_team_id,
    1 as play,
    (m1.home_score > m1.away_score)::int as win,
    (m1.home_score = m1.away_score)::int as draw,
    (m1.home_score < m1.away_score)::int as loss,
    case
      when m1.home_score > m1.away_score then 3
      when m1.home_score = m1.away_score then 1
      else 0
    end as points,
    m1.home_score as gf,
    m1.away_score as ga
  from public.matches m1
  where m1.home_score is not null
    and m1.away_score is not null
    and m1.home_season_team_id is not null
    and m1.away_season_team_id is not null

  union all

  select
    m2.id,
    m2.away_season_team_id,
    1,
    (m2.away_score > m2.home_score)::int,
    (m2.away_score = m2.home_score)::int,
    (m2.away_score < m2.home_score)::int,
    case
      when m2.away_score > m2.home_score then 3
      when m2.away_score = m2.home_score then 1
      else 0
    end,
    m2.away_score,
    m2.home_score
  from public.matches m2
  where m2.home_score is not null
    and m2.away_score is not null
    and m2.home_season_team_id is not null
    and m2.away_season_team_id is not null
) stats on stats.match_id = m.id
join public.season_teams st on st.id = stats.season_team_id
join public.teams t on t.id = st.team_id
group by m.season_id, s.name, st.team_id, t.name;

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists season_teams_season_id_idx on public.season_teams(season_id);
create index if not exists season_teams_team_id_idx on public.season_teams(team_id);
create index if not exists matches_season_id_idx on public.matches(season_id);
create index if not exists matches_home_season_team_id_idx on public.matches(home_season_team_id);
create index if not exists matches_away_season_team_id_idx on public.matches(away_season_team_id);
create index if not exists match_push_logs_match_id_idx on public.match_push_logs(match_id);
create index if not exists match_push_logs_season_id_idx on public.match_push_logs(season_id);

commit;

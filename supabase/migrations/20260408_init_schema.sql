begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  gender text check (gender in ('MALE','FEMALE','OTHER')) default 'OTHER',
  department text,
  auto_login boolean default true,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles delete own" on public.profiles;
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles delete own" on public.profiles for delete using (auth.uid() = id);

create table if not exists public.push_tokens (
  id bigserial primary key,
  user_id uuid references auth.users on delete cascade,
  token text not null,
  platform text check (platform in ('ios','android')),
  created_at timestamptz default now()
);
alter table public.push_tokens enable row level security;
drop policy if exists "push select own" on public.push_tokens;
drop policy if exists "push insert own" on public.push_tokens;
drop policy if exists "push update own" on public.push_tokens;
drop policy if exists "push delete own" on public.push_tokens;
create policy "push select own" on public.push_tokens for select using (auth.uid() = user_id);
create policy "push insert own" on public.push_tokens for insert with check (auth.uid() = user_id);
create policy "push update own" on public.push_tokens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push delete own" on public.push_tokens for delete using (auth.uid() = user_id);

create table if not exists public.teams (
  id bigserial primary key,
  name text not null,
  emblem_url text,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);
create table if not exists public.team_members (
  team_id bigint references public.teams on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text check (role in ('PLAYER','MANAGER')) default 'PLAYER',
  primary key (team_id, user_id)
);
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
drop policy if exists "teams read" on public.teams;
drop policy if exists "teams insert owner" on public.teams;
drop policy if exists "teams update owner" on public.teams;
drop policy if exists "teams delete owner" on public.teams;
create policy "teams read" on public.teams for select using (true);
create policy "teams insert owner" on public.teams for insert with check (auth.uid() = created_by);
create policy "teams update owner" on public.teams for update using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "teams delete owner" on public.teams for delete using (auth.uid() = created_by);
drop policy if exists "team_members read" on public.team_members;
drop policy if exists "team_members insert" on public.team_members;
drop policy if exists "team_members update" on public.team_members;
drop policy if exists "team_members delete" on public.team_members;
create policy "team_members read" on public.team_members for select using (true);
create policy "team_members insert" on public.team_members
  for insert
  with check (
    exists (
      select 1
      from public.teams t
      where t.id = team_id and t.created_by = auth.uid()
    )
  );
create policy "team_members update" on public.team_members
  for update
  using (
    exists (
      select 1
      from public.teams t
      where t.id = team_id and t.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.teams t
      where t.id = team_id and t.created_by = auth.uid()
    )
  );
create policy "team_members delete" on public.team_members
  for delete
  using (
    exists (
      select 1
      from public.teams t
      where t.id = team_id and t.created_by = auth.uid()
    )
  );

create table if not exists public.matches (
  id bigserial primary key,
  match_date date not null,
  weekday text not null,
  place text check (place in ('3F','4F')) not null,
  home_team_id bigint references public.teams,
  away_team_id bigint references public.teams,
  home_players text not null,
  away_players text not null,
  home_rating text,
  away_rating text,
  home_score int,
  away_score int,
  pen_adv text,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);
alter table public.matches enable row level security;
drop policy if exists "matches read all" on public.matches;
drop policy if exists "matches insert owner" on public.matches;
drop policy if exists "matches update owner" on public.matches;
drop policy if exists "matches delete owner" on public.matches;
create policy "matches read all" on public.matches for select using (true);
create policy "matches insert owner" on public.matches for insert with check (auth.uid() = created_by);
create policy "matches update owner" on public.matches for update using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "matches delete owner" on public.matches for delete using (auth.uid() = created_by);

create table if not exists public.notices (
  id bigserial primary key,
  title text not null,
  body text,
  file_url text,
  author_id uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.notices enable row level security;
drop policy if exists "notices read" on public.notices;
drop policy if exists "notices insert owner" on public.notices;
drop policy if exists "notices update owner" on public.notices;
drop policy if exists "notices delete owner" on public.notices;
create policy "notices read" on public.notices for select using (true);
create policy "notices insert owner" on public.notices for insert with check (auth.uid() = author_id);
create policy "notices update owner" on public.notices for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "notices delete owner" on public.notices for delete using (auth.uid() = author_id);

create or replace view public.league_table as
select
  row_number() over(order by sum(points) desc, sum(gf - ga) desc, sum(gf) desc) as rank,
  team_id,
  t.name as team,
  sum(play) as played,
  sum(win) as wins,
  sum(draw) as draws,
  sum(loss) as losses,
  sum(points) as points,
  sum(gf) as gf,
  sum(ga) as ga,
  sum(gf - ga) as gd
from (
  select
    home_team_id as team_id,
    1 as play,
    (home_score > away_score)::int as win,
    (home_score = away_score)::int as draw,
    (home_score < away_score)::int as loss,
    case
      when home_score > away_score then 3
      when home_score = away_score then 1
      else 0
    end as points,
    home_score as gf,
    away_score as ga
  from public.matches
  where home_score is not null and away_score is not null

  union all

  select
    away_team_id,
    1,
    (away_score > home_score)::int,
    (away_score = home_score)::int,
    (away_score < home_score)::int,
    case
      when away_score > home_score then 3
      when away_score = home_score then 1
      else 0
    end,
    away_score,
    home_score
  from public.matches
  where home_score is not null and away_score is not null
) s
join public.teams t on t.id = s.team_id
group by team_id, t.name;

create index if not exists matches_match_date_idx on public.matches(match_date);
create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);
create index if not exists team_members_team_id_idx on public.team_members(team_id);

commit;

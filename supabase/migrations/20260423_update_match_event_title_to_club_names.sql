begin;

create or replace function private.sync_match_calendar_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  home_team_name text;
  away_team_name text;
  home_label text;
  away_label text;
begin
  if tg_op = 'DELETE' then
    delete from public.calendar_events
    where linked_match_id = old.id;
    return old;
  end if;

  select t.name
    into home_team_name
  from public.season_teams st
  join public.teams t on t.id = st.team_id
  where st.id = new.home_season_team_id;

  select t.name
    into away_team_name
  from public.season_teams st
  join public.teams t on t.id = st.team_id
  where st.id = new.away_season_team_id;

  home_label := coalesce(nullif(home_team_name, ''), nullif(new.home_players, ''), '홈팀');
  away_label := coalesce(nullif(away_team_name, ''), nullif(new.away_players, ''), '원정팀');

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
    format('%s vs %s', home_label, away_label),
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

update public.calendar_events ce
set title = format(
  '%s vs %s',
  coalesce(nullif(home_team.name, ''), nullif(m.home_players, ''), '홈팀'),
  coalesce(nullif(away_team.name, ''), nullif(m.away_players, ''), '원정팀')
)
from public.matches m
left join public.season_teams home_st on home_st.id = m.home_season_team_id
left join public.teams home_team on home_team.id = home_st.team_id
left join public.season_teams away_st on away_st.id = m.away_season_team_id
left join public.teams away_team on away_team.id = away_st.team_id
where ce.linked_match_id = m.id
  and ce.event_type = 'match';

commit;

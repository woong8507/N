-- Keep existing match status consistent with score data.
-- If both scores exist, the match is considered finished.
update public.matches
set status = 'finished'
where home_score is not null
  and away_score is not null
  and status <> 'finished';

-- If both scores are removed from a finished match, revert to scheduled.
update public.matches
set status = 'scheduled'
where home_score is null
  and away_score is null
  and status = 'finished';

-- Safety fallback for legacy/null rows.
update public.matches
set status = 'scheduled'
where status is null;

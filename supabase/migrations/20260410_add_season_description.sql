begin;

alter table public.seasons
add column if not exists description text;

comment on column public.seasons.description is 'Season summary shown in the admin season management UI.';

commit;

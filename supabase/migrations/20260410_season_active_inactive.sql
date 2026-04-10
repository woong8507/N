begin;

create or replace function private.ensure_single_active_season()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'active' then
    update public.seasons
    set status = 'inactive'
    where id <> coalesce(new.id, -1)
      and status = 'active';
  end if;

  return new;
end;
$$;

alter table public.seasons
drop constraint if exists seasons_status_check;

update public.seasons
set status = case
  when status = 'active' then 'active'
  else 'inactive'
end;

alter table public.seasons
alter column status set default 'inactive';

alter table public.seasons
add constraint seasons_status_check
check (status in ('active', 'inactive'));

drop trigger if exists seasons_single_active_guard on public.seasons;

create trigger seasons_single_active_guard
before insert or update of status on public.seasons
for each row
execute function private.ensure_single_active_season();

create unique index if not exists seasons_single_active_idx
on public.seasons ((true))
where status = 'active';

commit;

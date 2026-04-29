begin;

create table if not exists public.match_attendance (
  id bigserial primary key,
  match_id bigint not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.match_attendance
  drop constraint if exists match_attendance_status_check;
alter table public.match_attendance
  add constraint match_attendance_status_check
  check (status in ('pending', 'attend', 'absent'));

create unique index if not exists match_attendance_match_user_uidx
  on public.match_attendance(match_id, user_id);
create index if not exists match_attendance_match_id_idx
  on public.match_attendance(match_id);
create index if not exists match_attendance_user_id_idx
  on public.match_attendance(user_id);
create index if not exists match_attendance_status_idx
  on public.match_attendance(status);

alter table public.match_attendance enable row level security;

drop policy if exists "match attendance select authenticated" on public.match_attendance;
drop policy if exists "match attendance insert own or admin" on public.match_attendance;
drop policy if exists "match attendance update own or admin" on public.match_attendance;
drop policy if exists "match attendance delete own or admin" on public.match_attendance;

create policy "match attendance select authenticated" on public.match_attendance
for select
to authenticated
using (true);

create policy "match attendance insert own or admin" on public.match_attendance
for insert
to authenticated
with check (
  (user_id = (select auth.uid()))
  or (select private.is_admin())
);

create policy "match attendance update own or admin" on public.match_attendance
for update
to authenticated
using (
  (user_id = (select auth.uid()))
  or (select private.is_admin())
)
with check (
  (user_id = (select auth.uid()))
  or (select private.is_admin())
);

create policy "match attendance delete own or admin" on public.match_attendance
for delete
to authenticated
using (
  (user_id = (select auth.uid()))
  or (select private.is_admin())
);

commit;

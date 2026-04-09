begin;

alter table public.profiles
add column if not exists role text not null default 'member';

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('member', 'admin', 'super_admin'));

commit;

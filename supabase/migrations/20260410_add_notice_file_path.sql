alter table public.notices
add column if not exists file_path text;

comment on column public.notices.file_path is
'Supabase Storage object path inside the notice-files bucket';

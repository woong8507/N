insert into storage.buckets (id, name, public)
values ('notice-files', 'notice-files', true)
on conflict (id) do nothing;

drop policy if exists "notice files read own" on storage.objects;
drop policy if exists "notice files insert own" on storage.objects;
drop policy if exists "notice files delete own" on storage.objects;

create policy "notice files read own" on storage.objects
for select
to authenticated
using (
  bucket_id = 'notice-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "notice files insert own" on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'notice-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "notice files delete own" on storage.objects
for delete
to authenticated
using (
  bucket_id = 'notice-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

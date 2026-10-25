-- Run after assignment7.sql. Private image objects; no public bucket.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('admin-media','admin-media',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Admin media read" on storage.objects;
create policy "Admin media read" on storage.objects for select to authenticated using(bucket_id='admin-media' and (select public.is_admin()));
drop policy if exists "Admin media upload" on storage.objects;
create policy "Admin media upload" on storage.objects for insert to authenticated with check(bucket_id='admin-media' and (select public.is_admin()) and name like 'images/%');
drop policy if exists "Admin media cleanup" on storage.objects;
create policy "Admin media cleanup" on storage.objects for delete to authenticated using(bucket_id='admin-media' and (select public.is_admin()));
commit;

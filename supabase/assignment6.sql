-- Apply AFTER assignment3.sql and assignment4.sql in the SAME Supabase database.
begin;
alter table public.profiles add column if not exists is_superadmin boolean not null default false;
-- Table-level UPDATE/INSERT would allow members to promote themselves.
revoke insert, update on public.profiles from authenticated;
grant insert(id,first_name,last_name,avatar_path) on public.profiles to authenticated;
grant update(first_name,last_name,avatar_path) on public.profiles to authenticated;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
 select coalesce((select p.is_superadmin from public.profiles p where p.id=auth.uid()),false)
 and coalesce(auth.jwt()->'app_metadata'->'providers' ? 'google',false)
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated;
drop policy if exists "Admin read profiles" on public.profiles;
create policy "Admin read profiles" on public.profiles for select to authenticated using ((select public.is_admin()));
drop policy if exists "Admin read generations" on public.generations;
create policy "Admin read generations" on public.generations for select to authenticated using ((select public.is_admin()));
drop policy if exists "Admin read ratings" on public.caption_votes;
create policy "Admin read ratings" on public.caption_votes for select to authenticated using ((select public.is_admin()));
grant update(place,category,experience,caption),delete on public.captions to authenticated;
drop policy if exists "Admin update captions" on public.captions;
create policy "Admin update captions" on public.captions for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Admin delete captions" on public.captions;
create policy "Admin delete captions" on public.captions for delete to authenticated using ((select public.is_admin()));
commit;
-- BOOTSTRAP in SQL Editor only, after verifying the email belongs to you:
-- update public.profiles set is_superadmin=true where id=(select id from auth.users where email='YOUR_VERIFIED_GOOGLE_EMAIL');
-- Never give the frontend a service-role key or grant members UPDATE(is_superadmin).

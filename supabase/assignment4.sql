-- Run AFTER assignment3.sql in the existing project's SQL Editor.
-- All changes are transactional. No seed content is presented as AI-generated.
begin;

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 10 and 5000),
  model text not null check (char_length(model) between 1 and 100),
  created_at timestamptz not null default now()
);
create index if not exists generations_owner_time on public.generations(user_id, created_at desc);

create table if not exists public.captions (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null unique references public.generations(id) on delete cascade,
  place text not null check (char_length(trim(place)) between 2 and 100),
  category text not null check (category in ('Coffee shops', 'Restaurants', 'Landmarks', 'Around campus')),
  experience text not null check (char_length(trim(experience)) between 10 and 500),
  caption text not null check (char_length(trim(caption)) between 1 and 600),
  created_at timestamptz not null default now()
);
create index if not exists captions_latest on public.captions(created_at desc, id);

create table if not exists public.caption_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caption_id uuid not null references public.captions(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique(user_id, caption_id)
);
create index if not exists caption_votes_caption on public.caption_votes(caption_id);

-- Enable RLS on every public application table, including any earlier tables.
-- Tables without policies remain inaccessible to the client roles.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

revoke all on public.generations, public.captions, public.caption_votes from anon, authenticated;
grant select on public.generations to authenticated;
grant insert(user_id, prompt, model) on public.generations to authenticated;
grant select on public.captions to anon, authenticated;
grant insert(generation_id, place, category, experience, caption) on public.captions to authenticated;
grant select on public.caption_votes to authenticated;
grant insert(user_id, caption_id, value) on public.caption_votes to authenticated;
-- No client UPDATE or DELETE grants. IDs and timestamps are database-owned.

drop policy if exists "Read own generations" on public.generations;
create policy "Read own generations" on public.generations for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Create own generations" on public.generations;
create policy "Create own generations" on public.generations for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "Read published captions" on public.captions;
create policy "Read published captions" on public.captions for select to anon, authenticated using (true);
drop policy if exists "Publish own generation" on public.captions;
create policy "Publish own generation" on public.captions for insert to authenticated
  with check (exists (select 1 from public.generations g where g.id = generation_id and g.user_id = (select auth.uid())));
drop policy if exists "Read own votes" on public.caption_votes;
create policy "Read own votes" on public.caption_votes for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Insert own votes" on public.caption_votes;
create policy "Insert own votes" on public.caption_votes for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Prevent racing requests from bypassing limits; failed attempts also count.
create or replace function public.limit_generation_requests()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'Invalid generation owner' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.generations where user_id = new.user_id and created_at > now() - interval '24 hours') >= 10
    or exists (select 1 from public.generations where user_id = new.user_id and created_at > now() - interval '30 seconds') then
    raise exception 'generation_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.limit_generation_requests() from public, anon, authenticated;
drop trigger if exists enforce_generation_limit on public.generations;
create trigger enforce_generation_limit before insert on public.generations
for each row execute function public.limit_generation_requests();
commit;

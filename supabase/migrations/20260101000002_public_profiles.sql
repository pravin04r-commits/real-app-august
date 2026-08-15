-- ═══════════════════════════════════════════════════════════════
-- R.E.A.L. — 003 Public profiles, leaderboard, storage
--
-- Public is OPT-IN and MINIMAL. A public card shows streaks,
-- Sparks and display names — never journal entries, promises,
-- moods, missions or anything a partner marked private.
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- Auto-slug for public couple URLs: /u/<slug>
-- ───────────────────────────────────────────────────────────────
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g')
  );
$$;

create or replace function public.ensure_couple_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  candidate text;
  suffix    integer := 0;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  base_slug := nullif(public.slugify(new.ship_name), '');
  if base_slug is null then
    new.slug := null;
    return new;
  end if;

  candidate := base_slug;
  while exists (select 1 from public.couples c where c.slug = candidate and c.id <> new.id) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix::text;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists trg_ensure_couple_slug on public.couples;
create trigger trg_ensure_couple_slug
  before insert or update of ship_name on public.couples
  for each row execute function public.ensure_couple_slug();

-- ───────────────────────────────────────────────────────────────
-- PUBLIC CARD VIEW — the only couple data anonymous visitors see.
-- security_invoker = on means the couples RLS policy
-- (is_public = true) still applies. Nothing private can escape.
-- ───────────────────────────────────────────────────────────────
create or replace view public.public_couple_cards
with (security_invoker = on) as
select
  c.id,
  c.slug,
  c.ship_name,
  c.aesthetic,
  c.start_date,
  c.streak_count,
  c.longest_streak,
  c.created_at,
  coalesce((
    select sum(u.spark_balance)::integer
    from public.users u where u.couple_id = c.id
  ), 0) as combined_sparks,
  coalesce((
    select count(*)::integer
    from public.milestones m where m.couple_id = c.id
  ), 0) as milestones_hit,
  coalesce((
    select count(*)::integer
    from public.dares d where d.couple_id = c.id and d.status = 'completed'
  ), 0) as dares_completed
from public.couples c
where c.is_public = true;

comment on view public.public_couple_cards is
  'Opt-in public couple summary. No journals, moods, promises or missions.';

-- ───────────────────────────────────────────────────────────────
-- LEADERBOARD — opt-in couples ranked by streak, then Sparks.
-- ───────────────────────────────────────────────────────────────
create or replace view public.leaderboard
with (security_invoker = on) as
select
  rank() over (order by streak_count desc, combined_sparks desc, created_at asc) as rank,
  slug,
  ship_name,
  aesthetic,
  streak_count,
  combined_sparks,
  start_date
from public.public_couple_cards
where slug is not null;

-- ───────────────────────────────────────────────────────────────
-- STORAGE — avatars (public read), proofs + memories (couple only)
-- ───────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('proofs', 'proofs', false),
  ('memories', 'memories', false)
on conflict (id) do nothing;

-- Path convention: <couple_id>/<filename> for proofs and memories,
-- <user_id>/<filename> for avatars.

drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "users manage their own avatar" on storage.objects;
create policy "users manage their own avatar" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "couple reads own private files" on storage.objects;
create policy "couple reads own private files" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('proofs', 'memories')
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

drop policy if exists "couple writes own private files" on storage.objects;
create policy "couple writes own private files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('proofs', 'memories')
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

drop policy if exists "couple deletes own private files" on storage.objects;
create policy "couple deletes own private files" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('proofs', 'memories')
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

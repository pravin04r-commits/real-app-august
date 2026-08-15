-- ═══════════════════════════════════════════════════════════════
-- R.E.A.L. — 001 Initial Schema
-- Relationships · Ex's · Artificial · Language
-- A N.A.I.R. Solutions project
--
-- Design rule that governs this entire file:
--   A couple space holds EXACTLY TWO users. Never three.
--   That rule is enforced at the database level, not in app code.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ───────────────────────────────────────────────────────────────
-- ENUM-LIKE DOMAINS (text + check constraints — easy to extend)
-- ───────────────────────────────────────────────────────────────

-- ───────────────────────────────────────────────────────────────
-- COUPLES
-- ───────────────────────────────────────────────────────────────
create table if not exists public.couples (
  id                 uuid primary key default gen_random_uuid(),
  ship_name          text,
  slug               text unique,
  start_date         date,
  relationship_type  text check (relationship_type in ('dating','committed','engaged','married')),
  distance_type      text check (distance_type in ('same_city','long_distance')),
  how_we_met         text,
  invite_code        text unique,
  invite_expires_at  timestamptz,
  streak_count       integer not null default 0 check (streak_count >= 0),
  streak_last_date   date,
  longest_streak     integer not null default 0 check (longest_streak >= 0),
  is_public          boolean not null default false,
  aesthetic          jsonb not null default '{"color":"#FF2D6B","vibe":"chaotic-soft","emoji":"🔥"}'::jsonb,
  created_at         timestamptz not null default now()
);

comment on table public.couples is 'One shared space per couple. Exactly two users may point at it.';
comment on column public.couples.invite_code is '6-char pairing code. Nulled the moment the second partner joins.';

create index if not exists couples_invite_code_idx on public.couples (invite_code) where invite_code is not null;
create index if not exists couples_public_idx on public.couples (is_public) where is_public = true;

-- ───────────────────────────────────────────────────────────────
-- USERS  (extends auth.users)
-- ───────────────────────────────────────────────────────────────
create table if not exists public.users (
  id               uuid primary key references auth.users (id) on delete cascade,
  display_name     text,
  avatar_url       text,
  love_languages   text[] not null default '{}',
  personality_tag  text,
  couple_id        uuid references public.couples (id) on delete set null,
  spark_balance    integer not null default 0 check (spark_balance >= 0),
  onboarding_done  boolean not null default false,
  created_at       timestamptz not null default now(),
  -- People rarely have exactly one. Store every language they pick,
  -- and reject anything outside the known five.
  constraint users_love_languages_valid check (
    love_languages <@ array['words','acts','gifts','time','touch']::text[]
  )
);

comment on column public.users.love_languages is 'Zero or more of: words, acts, gifts, time, touch.';
comment on column public.users.personality_tag is 'Free text — chosen from suggestions or written by the user.';

comment on column public.users.spark_balance is 'Derived from spark_transactions. Never write this directly — insert a transaction.';

create index if not exists users_couple_idx on public.users (couple_id);

-- ───────────────────────────────────────────────────────────────
-- THE 2-USER RULE — enforced by trigger
-- ───────────────────────────────────────────────────────────────
create or replace function public.enforce_two_user_couple()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_count integer;
begin
  if new.couple_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.couple_id is not distinct from new.couple_id then
    return new;
  end if;

  select count(*) into member_count
  from public.users
  where couple_id = new.couple_id
    and id <> new.id;

  if member_count >= 2 then
    raise exception 'COUPLE_FULL: this couple space already has two partners'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_two_user_couple on public.users;
create trigger trg_enforce_two_user_couple
  before insert or update of couple_id on public.users
  for each row execute function public.enforce_two_user_couple();

-- ───────────────────────────────────────────────────────────────
-- AUTO-PROVISION public.users ON SIGNUP
-- ───────────────────────────────────────────────────────────────
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ───────────────────────────────────────────────────────────────
-- HELPER: the caller's couple_id, without tripping RLS recursion
-- ───────────────────────────────────────────────────────────────
create or replace function public.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.users where id = auth.uid();
$$;

create or replace function public.is_couple_member(target_couple uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_couple is not null
     and target_couple = (select couple_id from public.users where id = auth.uid());
$$;

-- ───────────────────────────────────────────────────────────────
-- REALITY LOGS — daily check-in + journal
-- ───────────────────────────────────────────────────────────────
create table if not exists public.reality_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  couple_id       uuid not null references public.couples (id) on delete cascade,
  log_date        date not null default current_date,
  mood_score      smallint not null check (mood_score between 1 and 5),
  entry_text      text,
  shared_text     text,
  mode            text not null default 'private' check (mode in ('private','shared','ai_prompted')),
  promise_made    text,
  promise_kept    boolean,
  sparks_awarded  integer not null default 0 check (sparks_awarded >= 0),
  created_at      timestamptz not null default now(),
  constraint reality_logs_one_per_day unique (user_id, log_date)
);

create index if not exists reality_logs_couple_date_idx on public.reality_logs (couple_id, log_date desc);

-- ───────────────────────────────────────────────────────────────
-- DARES
-- ───────────────────────────────────────────────────────────────
create table if not exists public.dares (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  prompt_text   text not null,
  category      text,
  spark_reward  integer not null default 40 check (spark_reward >= 0),
  status        text not null default 'active' check (status in ('active','completed','skipped','expired')),
  proof_url     text,
  completed_at  timestamptz,
  expires_at    timestamptz not null default (now() + interval '7 days'),
  week_number   integer not null default 1,
  created_at    timestamptz not null default now()
);

create index if not exists dares_couple_status_idx on public.dares (couple_id, status);
create unique index if not exists dares_one_active_per_couple
  on public.dares (couple_id) where status = 'active';

-- ───────────────────────────────────────────────────────────────
-- MISSIONS — shared goals with money attached
-- ───────────────────────────────────────────────────────────────
create table if not exists public.missions (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references public.couples (id) on delete cascade,
  name           text not null,
  emoji          text default '🎯',
  target_amount  numeric(12,2) not null check (target_amount > 0),
  saved_amount   numeric(12,2) not null default 0 check (saved_amount >= 0),
  currency       text not null default 'INR',
  deadline       date,
  status         text not null default 'active' check (status in ('active','completed','abandoned')),
  bank_link      text,
  created_at     timestamptz not null default now()
);

create index if not exists missions_couple_idx on public.missions (couple_id, status);

-- ───────────────────────────────────────────────────────────────
-- SPARK TRANSACTIONS — the immutable ledger
-- ───────────────────────────────────────────────────────────────
create table if not exists public.spark_transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  couple_id      uuid not null references public.couples (id) on delete cascade,
  amount         integer not null check (amount > 0),
  direction      text not null check (direction in ('earn','spend')),
  source         text not null,
  source_id      uuid,
  note           text,
  balance_after  integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists spark_tx_user_idx on public.spark_transactions (user_id, created_at desc);
create index if not exists spark_tx_couple_idx on public.spark_transactions (couple_id, created_at desc);

-- Ledger is the source of truth. This trigger keeps users.spark_balance in sync
-- and refuses any spend that would push a balance negative.
create or replace function public.apply_spark_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
  next_balance    integer;
begin
  select spark_balance into current_balance
  from public.users where id = new.user_id
  for update;

  if current_balance is null then
    raise exception 'NOT_FOUND: user % does not exist', new.user_id;
  end if;

  if new.direction = 'earn' then
    next_balance := current_balance + new.amount;
  else
    next_balance := current_balance - new.amount;
    if next_balance < 0 then
      raise exception 'INSUFFICIENT_SPARKS: balance % cannot cover spend of %', current_balance, new.amount
        using errcode = 'check_violation';
    end if;
  end if;

  new.balance_after := next_balance;

  update public.users
     set spark_balance = next_balance
   where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_apply_spark_transaction on public.spark_transactions;
create trigger trg_apply_spark_transaction
  before insert on public.spark_transactions
  for each row execute function public.apply_spark_transaction();

-- The ledger is append-only.
create or replace function public.block_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'spark_transactions is append-only';
end;
$$;

drop trigger if exists trg_block_ledger_mutation on public.spark_transactions;
create trigger trg_block_ledger_mutation
  before update or delete on public.spark_transactions
  for each row execute function public.block_ledger_mutation();

-- ───────────────────────────────────────────────────────────────
-- REWARDS + REDEMPTIONS
-- ───────────────────────────────────────────────────────────────
create table if not exists public.rewards (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid references public.couples (id) on delete cascade,
  name         text not null,
  description  text,
  emoji        text not null default '🎁',
  spark_cost   integer not null check (spark_cost >= 0),
  is_preset    boolean not null default false,
  created_at   timestamptz not null default now()
);

comment on column public.rewards.couple_id is 'Null = global preset available to every couple.';

create index if not exists rewards_couple_idx on public.rewards (couple_id);

create table if not exists public.redemptions (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  reward_id     uuid not null references public.rewards (id) on delete restrict,
  redeemed_by   uuid not null references public.users (id) on delete cascade,
  spark_cost    integer not null check (spark_cost >= 0),
  fulfilled     boolean not null default false,
  fulfilled_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists redemptions_couple_idx on public.redemptions (couple_id, created_at desc);

-- ───────────────────────────────────────────────────────────────
-- MILESTONES
-- ───────────────────────────────────────────────────────────────
create table if not exists public.milestones (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references public.couples (id) on delete cascade,
  title           text not null,
  description     text,
  milestone_date  date not null,
  emoji           text not null default '✨',
  is_auto         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists milestones_couple_date_idx on public.milestones (couple_id, milestone_date desc);

-- ───────────────────────────────────────────────────────────────
-- MEMORY WALL
-- ───────────────────────────────────────────────────────────────
create table if not exists public.memories (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  created_by   uuid not null references public.users (id) on delete cascade,
  caption      text not null,
  image_url    text,
  memory_date  date not null default current_date,
  created_at   timestamptz not null default now()
);

create index if not exists memories_couple_idx on public.memories (couple_id, memory_date desc);

-- ───────────────────────────────────────────────────────────────
-- QUIZ RESULTS
-- ───────────────────────────────────────────────────────────────
create table if not exists public.quiz_results (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  kind          text not null check (kind in ('love_language','compatibility','who_is_more')),
  answers       jsonb not null default '{}'::jsonb,
  score         integer,
  result_label  text,
  ai_summary    text,
  created_at    timestamptz not null default now()
);

create index if not exists quiz_results_couple_kind_idx on public.quiz_results (couple_id, kind, created_at desc);

-- ───────────────────────────────────────────────────────────────
-- MONTHLY REPORT CARDS
-- ───────────────────────────────────────────────────────────────
create table if not exists public.report_cards (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  period_start  date not null,
  period_end    date not null,
  grade         text not null,
  headline      text not null,
  body          text not null,
  stats         jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  constraint report_cards_one_per_period unique (couple_id, period_start)
);

-- ───────────────────────────────────────────────────────────────
-- DARE POOL — fallback dares when the AI is unavailable
-- ───────────────────────────────────────────────────────────────
create table if not exists public.dare_pool (
  id            uuid primary key default gen_random_uuid(),
  prompt_text   text not null,
  category      text not null default 'connection',
  spark_reward  integer not null default 40,
  distance_type text check (distance_type in ('same_city','long_distance')),
  created_at    timestamptz not null default now()
);

comment on table public.dare_pool is 'Curated fallback dares. Null distance_type = works for any couple.';

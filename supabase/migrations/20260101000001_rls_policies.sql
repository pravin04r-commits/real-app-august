-- ═══════════════════════════════════════════════════════════════
-- R.E.A.L. — 002 Row Level Security
--
-- Their data, their world. Nothing leaks between couples, ever.
-- Every table below has RLS ON with an explicit deny-by-default posture:
-- if no policy matches, the row is invisible.
--
-- The Express API uses the service role key and bypasses these policies —
-- it enforces the same rules in application code. These policies protect
-- the browser client, which talks to Supabase directly for reads.
-- ═══════════════════════════════════════════════════════════════

alter table public.users              enable row level security;
alter table public.couples            enable row level security;
alter table public.reality_logs       enable row level security;
alter table public.dares              enable row level security;
alter table public.missions           enable row level security;
alter table public.spark_transactions enable row level security;
alter table public.rewards            enable row level security;
alter table public.redemptions        enable row level security;
alter table public.milestones         enable row level security;
alter table public.memories           enable row level security;
alter table public.quiz_results       enable row level security;
alter table public.report_cards       enable row level security;
alter table public.dare_pool          enable row level security;

-- ───────────────────────────────────────────────────────────────
-- USERS — read yourself, read your partner. Write only yourself.
-- ───────────────────────────────────────────────────────────────
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or (couple_id is not null and couple_id = public.current_couple_id())
  );

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert to authenticated
  with check (id = auth.uid());

-- ───────────────────────────────────────────────────────────────
-- COUPLES — only your own space. Plus public cards for everyone.
-- ───────────────────────────────────────────────────────────────
drop policy if exists couples_select_member on public.couples;
create policy couples_select_member on public.couples
  for select to authenticated
  using (id = public.current_couple_id());

drop policy if exists couples_select_public on public.couples;
create policy couples_select_public on public.couples
  for select to anon, authenticated
  using (is_public = true);

drop policy if exists couples_insert on public.couples;
create policy couples_insert on public.couples
  for insert to authenticated
  with check (true);

drop policy if exists couples_update_member on public.couples;
create policy couples_update_member on public.couples
  for update to authenticated
  using (id = public.current_couple_id())
  with check (id = public.current_couple_id());

-- ───────────────────────────────────────────────────────────────
-- REALITY LOGS — private entries stay private.
-- A partner sees your row only when you chose to share it.
-- ───────────────────────────────────────────────────────────────
drop policy if exists reality_logs_select on public.reality_logs;
create policy reality_logs_select on public.reality_logs
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      public.is_couple_member(couple_id)
      and mode = 'shared'
    )
  );

drop policy if exists reality_logs_insert on public.reality_logs;
create policy reality_logs_insert on public.reality_logs
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists reality_logs_update_own on public.reality_logs;
create policy reality_logs_update_own on public.reality_logs
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists reality_logs_delete_own on public.reality_logs;
create policy reality_logs_delete_own on public.reality_logs
  for delete to authenticated
  using (user_id = auth.uid());

-- ───────────────────────────────────────────────────────────────
-- SHARED COUPLE TABLES — both partners read and write.
-- ───────────────────────────────────────────────────────────────
drop policy if exists dares_all on public.dares;
create policy dares_all on public.dares
  for all to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

drop policy if exists missions_all on public.missions;
create policy missions_all on public.missions
  for all to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

drop policy if exists milestones_all on public.milestones;
create policy milestones_all on public.milestones
  for all to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

drop policy if exists memories_all on public.memories;
create policy memories_all on public.memories
  for all to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

drop policy if exists redemptions_select on public.redemptions;
create policy redemptions_select on public.redemptions
  for select to authenticated
  using (public.is_couple_member(couple_id));

drop policy if exists report_cards_select on public.report_cards;
create policy report_cards_select on public.report_cards
  for select to authenticated
  using (public.is_couple_member(couple_id));

-- ───────────────────────────────────────────────────────────────
-- QUIZ RESULTS — you always see yours; your partner's result is
-- visible so the app can cross-map love languages.
-- ───────────────────────────────────────────────────────────────
drop policy if exists quiz_results_select on public.quiz_results;
create policy quiz_results_select on public.quiz_results
  for select to authenticated
  using (public.is_couple_member(couple_id));

drop policy if exists quiz_results_insert on public.quiz_results;
create policy quiz_results_insert on public.quiz_results
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_couple_member(couple_id));

-- ───────────────────────────────────────────────────────────────
-- SPARK TRANSACTIONS — read-only for both partners.
-- Writes happen only through the backend service key.
-- ───────────────────────────────────────────────────────────────
drop policy if exists spark_tx_select on public.spark_transactions;
create policy spark_tx_select on public.spark_transactions
  for select to authenticated
  using (public.is_couple_member(couple_id));

-- ───────────────────────────────────────────────────────────────
-- REWARDS — global presets are readable by all; custom rewards
-- belong to the couple that created them.
-- ───────────────────────────────────────────────────────────────
drop policy if exists rewards_select on public.rewards;
create policy rewards_select on public.rewards
  for select to authenticated
  using (couple_id is null or public.is_couple_member(couple_id));

drop policy if exists rewards_write_own on public.rewards;
create policy rewards_write_own on public.rewards
  for all to authenticated
  using (couple_id is not null and public.is_couple_member(couple_id))
  with check (couple_id is not null and public.is_couple_member(couple_id));

-- ───────────────────────────────────────────────────────────────
-- DARE POOL — read-only reference data.
-- ───────────────────────────────────────────────────────────────
drop policy if exists dare_pool_select on public.dare_pool;
create policy dare_pool_select on public.dare_pool
  for select to authenticated
  using (true);

-- ═══════════════════════════════════════════════════════════════
-- R.E.A.L. — Seed data
-- Run after migrations:  supabase db reset  (local)
--                    or paste into SQL Editor (hosted)
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- PRESET REWARDS (couple_id null = available to every couple)
-- ───────────────────────────────────────────────────────────────
insert into public.rewards (couple_id, name, description, emoji, spark_cost, is_preset) values
  (null, 'Pick the next date night',      'Total dictatorship over one evening. No appeals.',            '🌙', 150, true),
  (null, 'You choose the movie',          'They watch it. Fully. No phone scrolling.',                   '🍿',  80, true),
  (null, 'Silent treatment immunity',     'One free pass. Cannot be used mid-argument. Nice try.',       '🛡️', 300, true),
  (null, 'You handle the chores',         'Twenty-four hours of not being the responsible one.',         '🧹', 120, true),
  (null, 'Breakfast in bed',              'Delivered. Warm. With the good cutlery.',                     '🍳', 100, true),
  (null, 'One uninterrupted rant',        'Ten minutes. No advice given. Just listening.',               '🎤',  60, true),
  (null, 'Aux cord for the whole trip',   'The entire journey. Every single song. Their kingdom.',       '🎧',  90, true),
  (null, 'A handwritten letter',          'Actual paper. Actual pen. Actual feelings.',                  '💌', 200, true),
  (null, 'Weekend plan veto',             'One veto on any plan. Used once, gone forever.',              '🚫', 180, true),
  (null, 'Photoshoot, you direct',        'They pose. You direct. Results will be posted.',              '📸', 140, true)
on conflict do nothing;

-- ───────────────────────────────────────────────────────────────
-- DARE POOL — fallback dares used when the AI is unavailable
-- ───────────────────────────────────────────────────────────────
insert into public.dare_pool (prompt_text, category, spark_reward, distance_type) values
  ('Send them a photo of something that reminded you of them today. No context. Let them guess.', 'connection', 40, null),
  ('Recreate your first date. Same food, same playlist, lower budget.', 'nostalgia', 60, 'same_city'),
  ('Write down three things they did this week that you noticed but never mentioned. Read them out loud.', 'appreciation', 50, null),
  ('Swap phone wallpapers for a week. No editing. No complaining.', 'chaos', 40, null),
  ('Watch the same movie at the same time on a call. Commentary mandatory.', 'connection', 45, 'long_distance'),
  ('Cook the other person''s comfort food. Badly is fine. Effort is the point.', 'care', 55, 'same_city'),
  ('Each of you draws the other from memory. Winner decided by the group chat.', 'chaos', 40, null),
  ('Voice note them a story about a day you never told them about.', 'depth', 50, null),
  ('Plan a fake vacation together. Real budget, real itinerary, zero intention of going.', 'dreaming', 45, null),
  ('Say the thing you have been avoiding saying. Kindly. Today.', 'depth', 70, null),
  ('Ask them the question you are most afraid of the answer to. Then actually listen.', 'depth', 70, null),
  ('Go somewhere neither of you has been. Anywhere. It counts if it is a different street.', 'adventure', 55, 'same_city'),
  ('Send a package. Something small, something stupid, something theirs.', 'care', 60, 'long_distance'),
  ('Compliment them in front of someone else. Watch them malfunction.', 'appreciation', 45, 'same_city'),
  ('No phones for two hours. Both of you. Set a timer. Suffer together.', 'presence', 50, 'same_city'),
  ('Tell them about a time they changed your mind about something.', 'depth', 55, null),
  ('Make a playlist of songs that sound like them. Send it with no explanation.', 'connection', 45, null),
  ('Split a task neither of you wants to do. Do it at the same time on a call.', 'teamwork', 40, 'long_distance'),
  ('Write the story of how you met — but each of you writes it separately first. Then compare.', 'nostalgia', 65, null),
  ('Apologise properly for something small you never apologised for.', 'repair', 60, null)
on conflict do nothing;

-- ───────────────────────────────────────────────────────────────
-- LOCAL DEV ONLY — a test couple
-- Uncomment after creating two auth users via the Supabase dashboard,
-- then paste their UUIDs below.
-- ───────────────────────────────────────────────────────────────
-- do $$
-- declare
--   partner_a uuid := '00000000-0000-0000-0000-000000000001';
--   partner_b uuid := '00000000-0000-0000-0000-000000000002';
--   test_couple uuid;
-- begin
--   insert into public.couples (ship_name, start_date, relationship_type, distance_type, is_public)
--   values ('Test Couple', current_date - 400, 'committed', 'same_city', true)
--   returning id into test_couple;
--
--   update public.users set couple_id = test_couple, display_name = 'Partner A',
--     love_language = 'time', personality_tag = 'The chaotic one', onboarding_done = true
--   where id = partner_a;
--
--   update public.users set couple_id = test_couple, display_name = 'Partner B',
--     love_language = 'words', personality_tag = 'The planner', onboarding_done = true
--   where id = partner_b;
--
--   insert into public.spark_transactions (user_id, couple_id, amount, direction, source, note)
--   values (partner_a, test_couple, 250, 'earn', 'admin_adjustment', 'seed'),
--          (partner_b, test_couple, 180, 'earn', 'admin_adjustment', 'seed');
-- end $$;

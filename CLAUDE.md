# CLAUDE.md — R.E.A.L. technical brain

Claude Code reads this file automatically. Keep it current: an outdated CLAUDE.md means
Claude Code builds against wrong assumptions. Update it before every new sprint.

---

## PART 1: PROJECT CONTEXT

**R.E.A.L.** — Relationships Ex's Artificial Language. A couples-only app for exactly two
users. Part game, part diary, part love-language translator.

- Repo: `https://github.com/pravin04r-commits/real-app`
- Parent brand: N.A.I.R. Solutions (Code2DBug Creative Division), founder Pravin R. Nair
- Web deploys to Vercel, API to Render, database is Supabase

### Stack

| Layer | Tech |
|---|---|
| Monorepo | npm workspaces + Turborepo |
| Frontend | Next.js 14 App Router, TypeScript strict, Tailwind |
| Backend | Node 20 + Express 4, TypeScript strict, built with tsup |
| Database | Supabase PostgreSQL + Auth + Storage |
| State | Zustand (client) + React Query (server cache) |
| Validation | Zod on every API input |
| AI | `@anthropic-ai/sdk`, backend only |

### Environment variables

Public (browser-safe): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`

Backend only: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
`WEB_ORIGIN`, `PORT`, `NODE_ENV`

### Architecture rules — never break these

1. **Exactly two users per couple.** Enforced by DB trigger, middleware, and single-use
   invite codes. Never add a code path that could admit a third.
2. **`SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` never appear in `apps/web`.**
   Not in a component, not in a route handler, not in an env var without the `NEXT_PUBLIC_`
   prefix stripped. AI calls go through the Express API only.
3. **Never write `users.spark_balance` directly.** Insert into `spark_transactions`; the
   trigger computes the balance and refuses negative outcomes.
4. **`spark_transactions` is append-only.** A trigger blocks UPDATE and DELETE.
5. **Every table has RLS enabled.** New tables need policies in the same migration.
6. **Private journal entries never reach the partner.** Only `shared_text` on a `shared`
   entry crosses over — check both the RLS policy and the route handler.
7. **No `any`.** Import shared shapes from `@real/types` rather than redeclaring them.
8. **AI is optional.** Every AI feature has a non-AI fallback. `ANTHROPIC_API_KEY` being
   absent must degrade gracefully, never 500.

---

## PART 2: DATABASE SCHEMA

Migrations live in `supabase/migrations/`, applied in filename order.

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Extends `auth.users` | `couple_id` FK, `spark_balance`, `love_language`, `onboarding_done` |
| `couples` | The shared space | `invite_code` (unique, nulled on pairing), `streak_count`, `longest_streak`, `is_public`, `slug`, `aesthetic` jsonb |
| `reality_logs` | Daily check-in / journal | unique `(user_id, log_date)`, `mood_score` 1–5, `mode`, `promise_made/kept` |
| `dares` | Weekly dares | unique partial index: one `active` per couple |
| `missions` | Shared money goals | `target_amount`, `saved_amount` |
| `spark_transactions` | Append-only ledger | `direction` earn/spend, `balance_after` |
| `rewards` | Market items | `couple_id` null = global preset |
| `redemptions` | Claimed rewards | `fulfilled` |
| `milestones` | Timeline | `is_auto` (seeded, undeletable) |
| `memories` | Memory jar | `caption`, `image_url` |
| `quiz_results` | Quiz answers | `kind`, `answers` jsonb |
| `report_cards` | Monthly grades | unique `(couple_id, period_start)` |
| `dare_pool` | Fallback dares | `distance_type` null = any couple |

### Functions and triggers

- `enforce_two_user_couple()` — blocks a third partner
- `handle_new_auth_user()` — creates the `public.users` row on signup
- `current_couple_id()` / `is_couple_member()` — SECURITY DEFINER, used by RLS without recursion
- `apply_spark_transaction()` — computes `balance_after`, updates the balance, refuses overspend
- `block_ledger_mutation()` — makes the ledger append-only
- `ensure_couple_slug()` — generates unique public slugs

### Views

`public_couple_cards` and `leaderboard` — both `security_invoker = on` so RLS still applies.

---

## PART 3: FOLDER STRUCTURE

```
apps/api/src/
├── index.ts              Server entry, CORS, helmet, rate limits  ← never rewrite wholesale
├── config/env.ts         Zod-validated env; exits on missing config
├── db/supabase.ts        Admin client (service role) — bypasses RLS
├── middleware/
│   ├── auth.ts           Verifies Supabase JWT, loads profile
│   ├── couple-guard.ts   Loads couple + partner, re-asserts 2-user rule
│   ├── validate.ts       Zod validation for body/query/params
│   └── error-handler.ts  Maps AppError to the response envelope
├── services/             Business logic — spark, streak, dare, ai, quiz, report, couple
└── routes/               One module per domain, mounted in routes/index.ts

apps/web/
├── app/
│   ├── (auth)/           login, signup
│   ├── (onboarding)/     profile → pair → setup
│   ├── (app)/            universe, reality, dares, sparks, fun  ← protected shell
│   ├── u/[slug]/         public couple card
│   └── leaderboard/
├── components/ui/        Design system primitives
├── lib/                  supabase clients, api wrapper, zustand store
├── hooks/                useApi, useUniverse, useSparks, useMe
└── middleware.ts         Route protection
```

**Do not rewrite `apps/api/src/index.ts` wholesale.** The CORS config is load-bearing;
overwriting it breaks the whole API. Add route registrations one line at a time.

---

## PART 4: DESIGN TOKENS

```
crimson #C0153A · hot-pink #FF2D6B · gold #FFD700 · purple #7B2FBE
midnight #080810 · charcoal #13131F · slate #1C1C2B · blush #FFE3ED · ash #8A8AA3
```

Fonts: Playfair Display (display), DM Sans (body), Space Mono (numbers).

Component classes in `globals.css`: `.card`, `.card-hover`, `.label`, `.input`,
`.stat-number`, `.divider`. Utilities: `.text-gradient`, `.text-gold-gradient`, `.safe-bottom`.

Animations: `heartbeat`, `spark-pop`, `shimmer`, `fade-up`, `float` — all wrapped in a
`prefers-reduced-motion` guard.

UI copy is playful, never childish; romantic, never cringe. Buttons say what happens.

---

## PART 5: ROUTING TABLE

| Path | Access | Notes |
|---|---|---|
| `/` | public | Landing |
| `/login` `/signup` | public | Redirects to `/universe` when signed in |
| `/profile` `/pair` `/setup` | signed in | Onboarding chain |
| `/universe` `/reality` `/dares` `/sparks` `/fun/*` | signed in + paired | Layout redirects unpaired users to `/pair` |
| `/u/[slug]` `/leaderboard` | public | Only opt-in couples appear |

---

## PART 6: DEVELOPMENT RULES

- One task at a time. Build after every task. Commit after every task.
- Read the existing file before modifying it; follow the patterns already there.
- Deliver complete files, no placeholders or `// ...rest unchanged`.
- Database migrations: generate the SQL, the human runs it in the Supabase dashboard,
  then confirms before you continue. Claude Code cannot reach the database.
- Never run git or deploy commands — those are the human's job.
- Verify visually in the browser. "Build passed" is not the same as "works".

### Commands

```bash
npm run dev          # both apps
npm run type-check   # strict TS everywhere
npm test             # logic checks — streaks, Sparks, pairing, dates
npm run build        # production build of both apps
```

---

## PART 7: CURRENT STATE

**Built and verified (v1.0):**

- Monorepo, shared types and utils, 39 passing logic checks
- Full schema: 13 tables, RLS on all of them, triggers, seed data
- API: auth, couple pairing, check-ins, Sparks ledger + store + redemptions, dares with
  AI generation and curated fallback, missions, milestones, memories, three quizzes,
  report cards, public cards, leaderboard
- Web: landing, auth, onboarding, all five tabs, seven Fun tools, public card, leaderboard
- CI, Dockerfile, `render.yaml`, `vercel.json`

**Not built yet:**

- Supabase Realtime subscriptions (partner mood updates still need a refetch)
- Image upload UI for avatars, dare proof and memory photos (buckets and policies exist)
- Google OAuth (Supabase config is stubbed, disabled)
- Push notifications, PWA manifest
- Payments — the ₹99/month premium tier and Spark packs from the project bible

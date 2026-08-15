# 🔴 R.E.A.L.

**Relationships · Ex's · Artificial · Language**

A couples-only digital universe. Two people — exactly two — build a shared space with
streaks, Sparks, dares, missions, memories and one story they both own.

> Where love meets logic, chaos meets cute, and your relationship becomes its own world.

A [N.A.I.R. Solutions](https://nairsolutions.org) project · Code2DBug Creative Division

---

## The one rule that shapes everything

**A couple space holds exactly two users.** Not three. This is enforced in three places:

1. A database trigger (`enforce_two_user_couple`) that raises before a third row can point at a couple
2. Application middleware (`couple-guard.ts`) that refuses to serve a space in an invalid state
3. The invite code itself, which is nulled the instant the second partner claims it

Scarcity is the product. Design around it, never past it.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router, TS) | SSR, file routing, deploys to Vercel with zero config |
| Backend | Node + Express (TS) | Business logic, Spark ledger, Claude calls |
| Database | Supabase (PostgreSQL) | Managed Postgres + auth + realtime + storage, RLS for couple isolation |
| Auth | Supabase Auth | Email/password. JWT verified server-side |
| AI | Anthropic Claude | Dares, insights, love-language cross-mapping, report cards |
| State | Zustand + React Query | Client state / server cache |
| Styling | Tailwind CSS | Design tokens in `tailwind.config.ts` |
| Motion | Framer Motion | Spark pops, page transitions |
| Monorepo | npm workspaces + Turborepo | One repo, two apps, shared types |

---

## Layout

```
real-app/
├── apps/
│   ├── web/                 Next.js frontend  → Vercel
│   └── api/                 Express backend   → Render
├── packages/
│   ├── types/               Shared TS contracts (single source of truth)
│   └── utils/               Pure helpers: streaks, Sparks, dates + tests
├── supabase/
│   ├── migrations/          SQL schema, RLS, public views
│   ├── seed.sql             Preset rewards + curated dare pool
│   └── config.toml          Local Supabase config
├── .github/workflows/ci.yml Type-check, test, build on every PR
├── render.yaml              API deploy blueprint
└── vercel.json              Web deploy config
```

---

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com), then run the migrations **in order**
via Dashboard → SQL Editor:

```
supabase/migrations/20260101000000_initial_schema.sql
supabase/migrations/20260101000001_rls_policies.sql
supabase/migrations/20260101000002_public_profiles.sql
supabase/seed.sql
```

Or with the Supabase CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

Then copy your URL, anon key and **service role key** from Settings → API.

### 2. Environment

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Fill in the Supabase values. `ANTHROPIC_API_KEY` is optional — without it, dares fall back
to the curated pool and report cards use deterministic local grading. Nothing breaks.

### 3. Run

```bash
npm install
npm run dev
```

- Web → http://localhost:3000
- API → http://localhost:4000/health

### 4. Verify

```bash
npm run type-check   # strict TS across all workspaces
npm test             # 39 logic checks on streaks, Sparks, pairing, dates
npm run build        # production build of both apps
```

---

## The Spark economy

Sparks are earned by showing up and spent on things that actually change a week.

| Action | Sparks |
|---|---|
| Daily check-in | 10 |
| Sharing part of your entry | +5 |
| A promise kept | +15 |
| Every 7-day streak | +25 |
| Dare completed | 30–80 **each** |
| Milestone logged | 20 |
| Memory added | 8 |
| Quiz completed | 15 |
| Mission contribution | 10 |

Two deliberate decisions:

- **Dares pay both partners.** A dare is joint work. Paying only whoever tapped the button
  would quietly turn cooperation into competition.
- **The ledger is the truth.** `users.spark_balance` is derived by a database trigger from
  `spark_transactions`, which is append-only. A spend that would go negative is refused at
  the database, not just in a handler. You cannot desync the balance from its history.

---

## API

Base URL: `NEXT_PUBLIC_API_URL`. All responses use one envelope:

```jsonc
{ "ok": true,  "data": { } }
{ "ok": false, "error": { "code": "INSUFFICIENT_SPARKS", "message": "..." } }
```

Every route except `/health` and `/public/*` requires `Authorization: Bearer <supabase-access-token>`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness |
| `GET PATCH` | `/me` | Your profile |
| `POST` | `/couple` | Create a space, mint an invite code |
| `POST` | `/couple/join` | Claim the second seat |
| `POST` | `/couple/invite/refresh` | New code (only while a seat is free) |
| `GET` | `/couple/universe` | Whole dashboard in one round trip |
| `POST` | `/journal/checkin` | Daily check-in — Sparks + streak |
| `GET` | `/journal/today` | Both partners' status today |
| `GET` | `/journal/mood` | Merged mood timeline |
| `GET` | `/sparks` `/sparks/ledger` `/sparks/store` | Balances, history, market |
| `POST` | `/sparks/redeem` | Spend Sparks |
| `GET POST` | `/dares/active` `/dares/new` | This week's dare |
| `POST` | `/dares/:id/complete` | Completes and pays both partners |
| `GET POST` | `/missions` `/milestones` `/memories` | Goals, timeline, memory jar |
| `GET POST` | `/quiz/:kind` | Love language, compatibility, who-is-more |
| `GET` | `/ai/report-card` | Monthly graded report |
| `GET` | `/public/couple/:slug` | Opt-in public card |
| `GET` | `/public/leaderboard` | Opt-in rankings |

---

## Privacy

Public is **opt-in, reversible, and narrow**. A public card exposes ship name, streak,
combined Sparks, milestone and dare counts, and display names.

It never exposes journal entries (private *or* shared), moods, promises, missions, money,
photos, or dare proof. The `public_couple_cards` view is defined with `security_invoker = on`,
so the RLS policy still applies and nothing private can escape through it.

Within a couple: a journal entry marked `private` is invisible to your partner at the
database level. Only the `shared_text` of an entry marked `shared` crosses over.

---

## Deploying

**Web → Vercel.** Import the repo, set root directory to `apps/web`, add the four
`NEXT_PUBLIC_*` variables. Auto-deploys on push to `main`.

**API → Render.** New → Blueprint, point at this repo (`render.yaml` handles the rest).
Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` and `WEB_ORIGIN`
(your Vercel URL) in the dashboard.

**Database → Supabase.** Run migrations before the first deploy.

Then set `NEXT_PUBLIC_API_URL` in Vercel to the live Render URL and redeploy.

---

## Design language

Never a corporate white-and-blue palette.

```
Crimson  #C0153A     Hot pink #FF2D6B     Gold     #FFD700
Purple   #7B2FBE     Midnight #080810     Charcoal #13131F
```

Display type is Playfair Display, body is DM Sans, numbers are Space Mono.
Everything has a heartbeat — but all motion respects `prefers-reduced-motion`.

Button copy says what happens: *"Hell yeah, we did it 🔥"*, never *"Submit"*.

---

## What R.E.A.L. does not do

No crisis counselling — the AI prompts explicitly drop humour and point toward a
professional if an entry suggests real distress. No fake psychological diagnoses.
No content that mocks or demeans either partner. No harmful comparison between couples.

---

*R.E.A.L. — Where your relationship gets its own universe.*
*N.A.I.R. Solutions · Bhilai, Chhattisgarh · v1.0*

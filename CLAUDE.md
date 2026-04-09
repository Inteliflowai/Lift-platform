# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is LIFT

LIFT (Learning Insight for Transitions) is a non-diagnostic admissions insight platform by Inteliflow AI. It assesses candidate learning and reasoning through interactive tasks for school admissions. The platform serves candidates (students taking assessments), evaluators (teachers reviewing results), interviewers, and school/platform admins.

## Commands

- `npm run dev` — Start Next.js dev server (localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run seed` — Seed database (`tsx scripts/seed.ts`)
- `npm run seed:tasks` — Seed task templates (`tsx scripts/seed-tasks.ts`)
- `npx tsx scripts/seed-existing-tenants.ts` — Seed tasks for tenants missing them
- `npx tsx scripts/get-hl-stages.ts` — Fetch HighLevel pipeline/stage IDs
- `npx tsx scripts/generate-hl-snapshot.ts` — Regenerate HL snapshot JSON

No test framework is configured.

## Tech Stack

- **Next.js 14** (App Router, React 18, TypeScript strict mode)
- **Supabase** — Auth (dashboard users only), PostgreSQL, RLS for tenant isolation
- **Anthropic Claude** (`claude-opus-4-20250514`) — AI scoring pipeline via `@anthropic-ai/sdk`
- **OpenAI** — Whisper (voice transcription), TTS (passage reader)
- **Stripe** — Subscription billing, checkout sessions, customer portal
- **HighLevel** — CRM integration, sales pipeline automation
- **Tailwind CSS 3** — Custom design tokens (primary: indigo #6366f1)
- **Nodemailer** — SMTP email delivery
- **Lucide React** — Icons

## Architecture

### Route Groups

Three route groups under `/app`:

- **`(candidate)`** — Public assessment UI (`/session/*`, `/invite/*`, `/consent/*`). **No Supabase Auth** — access is via invite tokens validated against the `invites` table using `supabaseAdmin`.
- **`(dashboard)`** — Protected admin/evaluator UI (`/admin/*`, `/school/*`, `/evaluator/*`, `/interviewer/*`). Requires Supabase Auth + role check via middleware.
- **`(public)`** — Public pages without auth (`/register`, `/pricing`).

### Authentication Split

Candidates never authenticate via Supabase Auth. All candidate-facing routes use `session_token` (the invite token) validated server-side against the `invites` table. Dashboard users authenticate via Supabase Auth, and roles come from `user_tenant_roles`.

### Middleware & RBAC

`middleware.ts` enforces role-based access on dashboard routes:
- `/admin/*` → `platform_admin`
- `/school/*` → `school_admin` or `platform_admin`
- `/evaluator/*` → `evaluator`, `school_admin`, or `platform_admin`
- `/interviewer/*` → `interviewer` or `platform_admin`

Middleware also checks license status — suspended/cancelled tenants are redirected to `/suspended`.

Multi-role users see a combined sidebar navigation.

### Multi-Tenant Isolation

- Every data table has a `tenant_id` column with RLS policies
- `lib/tenant.ts` exports `getTenantContext()` which returns `{ user, roles, tenantId, isPlatformAdmin, primaryRole }` — used in all dashboard API routes
- Platform admins bypass tenant filters
- Candidate routes resolve tenant via invite token → candidate → tenant_id

### Supabase Clients

Three clients in `lib/supabase/`:
- **`admin.ts`** — Service role key, bypasses RLS. Used in API routes and candidate token validation.
- **`server.ts`** — SSR client with cookie-based auth. Used in dashboard server components.
- **`client.ts`** — Browser client with anon key. Used in client components.

### AI Scoring Pipeline

Orchestrated by `POST /api/pipeline/run`, sequential steps:

1. **Extract** (`/api/pipeline/extract`) — Compute response_features from response_text
2. **Score** (`/api/pipeline/score`) — Claude API call per dimension: reading, writing, reasoning, reflection, persistence, support_seeking
3. **TRI** (`lib/signals/tri.ts`) — Transition Readiness Index: weighted average with confidence adjustments. Labels: emerging/developing/ready/thriving
4. **Narrative** (`/api/pipeline/narrative`) — Generate internal_narrative and family_narrative
5. **Learning Support** (`lib/signals/learningSupport.ts`) — 8 boolean flags. Levels: none / watch / recommend_screening
6. **Briefing** (`/api/pipeline/briefing`) — Evaluator-facing summary
7. **Benchmarks** (`/api/pipeline/benchmarks`) — Cohort percentile placement

AI prompts live in `lib/ai/prompts/`. Model versions tracked in `ai_versions` table.

### Licensing & Feature Gating

`lib/licensing/` implements a 3-tier subscription system (Essentials $4,800/yr, Professional $9,600/yr, Enterprise $18,000/yr) + 30-day trial:

- **`features.ts`** — Tier definitions with session limits, seat limits, and feature flags. Trial gets all Enterprise features, capped at 25 sessions.
- **`gate.ts`** — `checkFeature()`, `requireFeature()`, `checkSessionLimit()` for API route guards
- **`resolver.ts`** — License cache (5-min TTL) via `getLicense()` / `isLicenseActive()`
- **`context.tsx`** — `LicenseProvider` + `useLicense()` React hook for frontend feature checks
- **`apiHandler.ts`** — Standard 402/403 error responses for gated API routes
- **`stripe.ts`** — Full Stripe webhook handler: checkout completed, invoice paid/failed, subscription deleted/updated

Database tables: `tenant_licenses`, `license_usage`, `license_events`, `upgrade_requests` (migrations 011-013). Trial licenses auto-created on tenant signup via DB trigger. `increment_session_usage()` RPC tracks consumption.

### Stripe Integration

`lib/stripe/client.ts` — Lazy-initialized Stripe client (safe when key not set).

- **`/api/stripe/checkout`** — Creates Stripe Checkout session for subscription upgrade
- **`/api/stripe/portal`** — Creates Stripe Customer Portal session for billing management
- **`/api/webhooks/stripe`** — Validates Stripe signature, handles checkout.session.completed, invoice.paid/failed, subscription.deleted/updated

### HighLevel CRM Integration

`lib/highlevel/` handles CRM sync:

- **`client.ts`** — `upsertHLContact()`, `addHLTags()`, `removeHLTags()`, `moveHLPipelineStage()`. All no-op if `HL_API_KEY` not set.
- **`events.ts`** — `syncLicenseEventToHL()` maps license events to HL tags + pipeline stages
- **`/api/integrations/hl-inbound`** — Receives landing page form submissions, creates HL contacts

HL sync fires from `/api/internal/license-notifications` (fire-and-forget) and directly from registration.

`output/lift-hl-snapshot.json` — Complete HL automation snapshot (16 workflows, 18 tags, 11-stage pipeline, 40 emails). Regenerate with `npx tsx scripts/generate-hl-snapshot.ts`.

### Registration & Trial Flow

1. School registers at `/register` (or `/register?plan=essentials` for direct purchase)
2. Registration API creates: auth user, tenant, roles, settings, trial license (DB trigger), task templates, 3 demo candidates
3. HL contact synced with `lift-trial` tag
4. Welcome email sent, redirects to `/school/welcome`
5. If `?plan=` was set, auto-redirects to Stripe checkout after login
6. Trial banner shows countdown in dashboard (dark bar, escalates to amber/rose)
7. Suspended tenants redirected to `/suspended` by middleware

### Admin Data Management

`/admin/tenants/[id]/reset` — Platform admin can:
- Reset all candidate data (FK-safe ordered deletion of 30+ tables)
- Reset license to trial / extend trial / manually activate / suspend
- Delete tenant entirely (with typed name confirmation)
- View reset history log

APIs: `/api/admin/reset/candidates`, `/api/admin/reset/license`, `/api/admin/reset/delete-tenant`

Admin license management at `/admin/licenses/*` (dashboard, per-tenant detail, health monitoring, revenue tracking).

### Candidate Session Flow

1. Admin imports candidates → creates `candidates` + `invites` records
2. Invite email sent with token link → `/invite/{token}`
3. Consent collected → `/consent/{token}` (guardian consent if COPPA)
4. Session starts → `/session/{token}` — loads `SessionClient`
5. Tasks served sequentially (reading_passage, short_response, extended_writing, reflection, scenario, planning, quantitative_reasoning, pattern_logic)
6. Signals captured: keystroke/backspace counts, focus events, timing, hints, voice usage
7. On completion → pipeline runs → insight_profiles created → evaluator notified if flagged

### Voice Features

- **Voice Response** (`VoiceResponseInput.tsx`) — Candidates speak answers on short_response, extended_writing, reflection tasks. Uses MediaRecorder → `/api/session/transcribe` → OpenAI Whisper.
- **Passage Reader** (`PassageReader.tsx`) — TTS playback on reading_passage tasks. Uses `/api/session/tts` → OpenAI TTS (model: tts-1, voice: nova).
- Both gated by `FEATURES.VOICE_RESPONSE` license check and `tenant_settings` toggles.

### Grade Band UX

Session UI adapts by grade band (`6-7`, `8`, `9-11`):
- **6-7**: Larger text, encouraging messages, voice defaults to speak mode, 2-min recording limit
- **8**: Baseline styling, voice defaults to type, 5-min recording limit
- **9-11**: Compact UI, minimal labels, subtle passage reader toolbar

### Signal Types

Three signal tables, all fire-and-forget from client via `POST /api/signals`:
- **interaction_signals** — `focus_lost`, `focus_returned`
- **timing_signals** — `response_latency`, `task_dwell_time`, `time_on_text`, `tts_listen_duration_ms`
- **help_events** — `hint_open`, `voice_response_used`, `passage_read_aloud`

### Database Migrations

SQL files in `supabase/migrations/` numbered sequentially (001-014). Key tables: tenants, candidates, sessions, task_instances, response_text, response_features, insight_profiles, learning_support_signals, evaluator_reviews, final_recommendations, tenant_licenses, license_usage, upgrade_requests, admin_reset_log.

### Automated Notifications

`/api/internal/license-notifications` — Webhook handler for `license_events` table. Sends emails + HL sync for: trial_expiring, trial_expired, tier_changed, suspended, renewal_reminder, session_limit_80pct, data_deletion_warning, upgrade_requested.

`/api/internal/session-limit-check` — Webhook handler for `license_usage` table. Fires events at 80% and 100% session thresholds.

`/api/internal/weekly-digest` — Monday digest email to team with trial/conversion/ARR stats.

### Offline Support

Candidate sessions support offline via PWA service worker (`/public/sw.js`) and IndexedDB queue (`lib/offline-queue.ts`).

### Demo Mode

Tenants with `is_demo = true` get synthetic candidates via `/api/admin/demo/generate`. New trial registrations get 3 demo candidates (Sofia Martinez, James Chen, Amara Okafor) and task templates for all grade bands auto-seeded.

### Marketing Site

`marketing/` is a separate CRA React app (not part of the Next.js platform). Deployed via ReactPress on the Inteliflow WordPress site on SiteGround.

- **Build**: `cd marketing && npm run build` — outputs to `marketing/build/`
- **Deploy**: Upload `marketing/build/` to `/wp-content/reactpress/apps/lift-admissions/build/` on SiteGround
- **Forms**: Submit to HighLevel webhook or to `/api/integrations/hl-inbound`

## Environment

Required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`.

Voice/TTS: `OPENAI_API_KEY`. Email: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`. Pipeline security: `CRON_SECRET`, `INTERNAL_API_SECRET`.

Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_ESSENTIALS`, `STRIPE_PRICE_ID_PROFESSIONAL`, `STRIPE_PRICE_ID_ENTERPRISE`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

HighLevel: `HL_API_KEY`, `HL_LOCATION_ID`, `HL_PIPELINE_ID`, `HL_STAGE_IDS` (JSON), `HL_INBOUND_SECRET`.

Optional: `LIFT_TEAM_EMAIL`, `LIFT_DEV_MODE`.

## Design Tokens

Primary color is indigo (`#6366f1`). All custom colors defined in `tailwind.config.ts`: primary, success (#10b981), warning (#f59e0b), review (#f43f5e), sidebar (#1e1b2e), page-bg (#f8f8fa), surface (#ffffff), lift-border (#e5e5e5), lift-text (#1a1a2e), muted (#6b7280). Fonts: Playfair Display (headings), DM Sans (body). Branding: "Powered by Inteliflow".

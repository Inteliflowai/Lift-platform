# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is LIFT

LIFT (Learning Insight for Transitions) is a non-diagnostic admissions insight platform by Inteliflow AI. It assesses candidate learning and reasoning through interactive tasks for school admissions. The platform serves candidates (students taking assessments), evaluators (teachers reviewing results), interviewers, and school/platform admins.

**Two deployments from one codebase:**
- **LIFT** (`lift.inteliflowai.com`) — English, full pricing/billing, US market
- **EduInsights** (`eduinsights.datanex.ai`) — Portuguese, no pricing, Brazil market, separate Supabase

## Commands

- `npm run dev` — Start Next.js dev server (localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run seed` — Seed database (`tsx scripts/seed.ts`)
- `npm run seed:tasks` — Seed task templates (`tsx scripts/seed-tasks.ts`)
- `npx tsx scripts/seed-existing-tenants.ts` — Seed tasks for tenants missing them
- `npx tsx scripts/seed-pt-tasks.ts` — Seed Portuguese task templates (uses `.env.pt`)
- `npx tsx scripts/get-hl-stages.ts` — Fetch HighLevel pipeline/stage IDs
- `npx tsx scripts/generate-hl-snapshot.ts` — Regenerate HL snapshot JSON

- `npm test` — Run Vitest test suite
- `npm run test:watch` — Run tests in watch mode

## Tech Stack

- **Next.js 14** (App Router, React 18, TypeScript strict mode)
- **Supabase** — Auth (dashboard users only), PostgreSQL, RLS for tenant isolation
- **Anthropic Claude** (`claude-opus-4-20250514`) — AI scoring pipeline via `@anthropic-ai/sdk`
- **OpenAI** — Whisper (voice transcription), TTS (passage reader)
- **Stripe** — Subscription billing, checkout sessions, customer portal
- **HighLevel** — CRM integration, sales pipeline automation
- **Tailwind CSS 3** — Custom design tokens (primary: teal #14b8a6, matches LIFT logo)
- **Resend** — Email delivery via API (`RESEND_API_KEY`, sends from `lift@inteliflowai.com`)
- **Archiver** — ZIP generation for FERPA data exports
- **Lucide React** — Icons
- **Sentry** — Error monitoring and performance tracking (`@sentry/nextjs`)
- **PostHog** — Product analytics + session replay on marketing surfaces only (`posthog-js`, shared Inteliflow project token)
- **Google Analytics 4** — Marketing pageview tracking (ID `G-GW73K8W8NP`, marketing routes only)
- **LinkedIn Insight Tag** — B2B retargeting on marketing surfaces (partner ID `9004938`, shared across Inteliflow)
- **Vitest** — Unit test framework (303 tests + 1 skipped integration, covering encryption, features, TRI, pricing, Stripe webhooks, licensing gate, rate limiting, token resolution, HL webhooks, trial intelligence, marketing-path allow-list, defensible-language guardrails/cache/L2 persistence, stale-language detection, committee plan+commit, committee orphan sessions, enrollment-readiness flag planner/catalog). Integration test behind `RUN_AI_TESTS=1`.

### Toast Notifications

`components/ui/Toast.tsx` — `ToastProvider` wraps the dashboard layout, `useToast()` hook returns `toast(message, type?)`. Types: `success` (green), `error` (red), `info` (indigo). Auto-dismiss after 3.5s. Used across settings save, invite send, bulk send, committee brief export, application data save, observation note save.

## Architecture

### Route Groups

Three route groups under `/app`:

- **`(candidate)`** — Public assessment UI (`/session/*`, `/invite/*`, `/consent/*`). **No Supabase Auth** — access is via invite tokens validated against the `invites` table using `supabaseAdmin`.
- **`(dashboard)`** — Protected admin/evaluator UI (`/admin/*`, `/school/*`, `/evaluator/*`, `/interviewer/*`). Requires Supabase Auth + role check via middleware.
- **`(public)`** — Public pages without auth (`/register`, `/pricing`, `/forgot-password`, `/reset-password`, `/confirm`).

### Authentication & Account Management

Candidates never authenticate via Supabase Auth — they use invite tokens. Dashboard users authenticate via Supabase Auth with roles from `user_tenant_roles`.

- **Password reset**: `/forgot-password` → Supabase sends reset email → `/reset-password` exchanges hash token
- **Account settings**: `/settings/account` — profile edit, password change (with re-auth), account deletion (with sole-admin safety check)
- **Email confirmation**: `/confirm` handles email_change, signup verification, recovery redirects

### Middleware & RBAC

`middleware.ts` enforces role-based access on dashboard routes:
- `/admin/*` → `platform_admin`
- `/school/*` → `school_admin` or `platform_admin`
- `/evaluator/*` → `evaluator`, `school_admin`, or `platform_admin`
- `/interviewer/*` → `interviewer` or `platform_admin`

Middleware also:
- `/support/*` → `grade_dean`, `learning_specialist`, `school_admin`, or `platform_admin`
- Forces password change: redirects to `/settings/account` when `must_change_password` user metadata is set
- Checks license status — suspended/cancelled tenants redirected to `/suspended`
- Blocks `/register` and `/pricing` when `LIFT_HIDE_PRICING=true` (Portuguese deployment)
- Public routes (no auth): `/session`, `/invite`, `/consent`, `/register`, `/buy`, `/demo`

**Important**: All API routes that use `getTenantContext()` or `createClient` from supabase/server must have `export const dynamic = "force-dynamic"` to prevent Vercel build-time crashes.

### Internationalization (i18n)

`lib/i18n/` provides full English/Portuguese localization:

- **`en.json`** / **`pt.json`** — ~450 translation keys each
- **`LocaleProvider.tsx`** — Client-side context with `useLocale()` hook returning `{ t, brandName, brandTagline, hidePricing, locale }`
- **`config.ts`** — `getLocale()`, `getBrand()` from env vars. Server-side `t()` available via `useLocale.ts`
- **Root layout** wraps everything in `<LocaleProvider>` with locale from `LIFT_LOCALE` env var

Locale-controlled behavior:
- `LIFT_LOCALE=pt` → all UI in Portuguese
- `LIFT_BRAND_NAME=EduInsights` → brand name throughout
- `LIFT_HIDE_PRICING=true` → hides register, pricing, trial links; blocks routes in middleware

### Multi-Tenant Isolation

- Every data table has a `tenant_id` column with RLS policies
- `lib/tenant.ts` exports `getTenantContext()` — used in all dashboard API routes
- Platform admins bypass tenant filters
- Candidate routes resolve tenant via invite token → candidate → tenant_id

### Supabase Clients

Three clients in `lib/supabase/`:
- **`admin.ts`** — Service role key, bypasses RLS. Used in API routes and candidate token validation.
- **`server.ts`** — SSR client with cookie-based auth. **Must be dynamically imported** in API routes to avoid build crashes.
- **`client.ts`** — Browser client with anon key. Used in client components.

### AI Scoring Pipeline

Orchestrated by `POST /api/pipeline/run`, with graceful failure chain (per-step try/catch):

1. **Extract** (`/api/pipeline/extract`) — Compute response_features from response_text
2. **Score** (`/api/pipeline/score`) — Claude API call per dimension: reading, writing, reasoning, math, reflection, persistence, support_seeking (7 dimensions)
3. **TRI** (`lib/signals/tri.ts`) — Transition Readiness Index: weighted average (all 7 at 0.15 each, advocacy at 0.10) with confidence adjustments
4. **Narrative** (`/api/pipeline/narrative`) — Generate internal_narrative and family_narrative (fallback text on failure)
5. **Learning Support** (`lib/signals/learningSupport.ts`) — 8 boolean flags. Levels: none / watch / recommend_screening
5b. **Enriched Signals** (`lib/signals/enrichedSignals.ts`) — 9 behavioral detectors saved as JSONB
6. **Briefing** (`/api/pipeline/briefing`) — Evaluator-facing summary
7. **Benchmarks** (`/api/pipeline/benchmarks`) — Cohort percentile placement

Pipeline failures never prevent session completion. Partial completions tracked via `pipeline_partial`, `pipeline_errors` columns. `lib/ai/retry.ts` provides `withRetry()` with exponential backoff for AI API calls.

### Licensing & Feature Gating

`lib/licensing/` implements a 2-tier subscription system (Professional $12,000/yr, Enterprise $18,000/yr) + 30-day trial (all Enterprise features minus white label):

- **`features.ts`** — Trial gets all Enterprise features EXCEPT white label/custom branding, capped at 25 sessions. No Essentials tier — removed in favor of 2-tier model. Professional features include: cohort_view, committee_report, application_data, observation_notes, class_builder, prediction_trends, defensible_language, enrollment_readiness_flags. Enterprise-only: core_bridge, institutional_memory. Math dimension is not feature-gated — available to all tiers.
- **`gate.ts`** — `checkFeature()`, `requireFeature()`, `checkSessionLimit()`
- **`resolver.ts`** — License cache (5-min TTL) via `getLicense()` / `isLicenseActive()`
- **`context.tsx`** — `LicenseProvider` + `useLicense()` hook
- **`stripe.ts`** — Full Stripe webhook handler with license activation, renewal, cancellation

### Stripe Integration

`lib/stripe/client.ts` — Lazy-initialized Stripe client (safe when key not set).

- **`/api/stripe/checkout`** — Creates Stripe Checkout session
- **`/api/stripe/portal`** — Creates Stripe Customer Portal session
- **`/api/webhooks/stripe`** — Validates Stripe signature, handles all subscription lifecycle events

### HighLevel CRM Integration

`lib/highlevel/` handles CRM sync (all no-op if `HL_API_KEY` not set):

- **`client.ts`** — `upsertHLContact()`, `addHLTags()`, `removeHLTags()`, `moveHLPipelineStage()`. Auto-detects v1 (legacy location key) vs v2 (PIT key starting with `pit-`) and switches base URL / payload shape accordingly. v2 payloads strip the v1-only `customField` key (v2 rejects unknown top-level fields with 422). On non-2xx, logs status + response body before returning null.
- **`events.ts`** — `syncLicenseEventToHL()` maps license events to HL tags + pipeline stages
- **`capture.ts`** — `captureHLLead()` shared capture logic (upsert + tags + pipeline stage + internal notification email). Called by both the landing-page endpoint and the inbound webhook so they stay in lockstep.
- **`/api/lift/lead`** — Public endpoint called by the marketing landing-page form. Protected by: origin allowlist (`lift.inteliflowai.com` + localhost), rate limit (5/IP/hr via `lib/rateLimit/middleware`), honeypot `website` field. **No shared secret** — the browser never holds an HL-capture secret.
- **`/api/integrations/hl-inbound`** — External webhook endpoint for HighLevel (or other third-parties) to push leads into LIFT. **HMAC-only**: verifies `x-hl-signature` header against `HL_INBOUND_SECRET` using `timingSafeEqual`. The legacy plain-secret header is no longer accepted.

`output/lift-hl-snapshot.json` — Complete HL automation snapshot (16 workflows, 18 tags, 11-stage pipeline, 40 emails).

### Registration & Trial Flow

1. School registers at `/register` (or buys directly via `/buy?tier=professional`)
2. Registration API creates: auth user, tenant, roles, settings, trial license (DB trigger), task templates, 3 demo candidates
3. HL contact synced with `lift-trial` tag
4. Welcome email sent, redirects to `/school/welcome`
5. Onboarding banner guides 5-step checklist (auto-completes from API routes)
6. Trial banner shows countdown (dark bar, escalates to amber/rose)
7. Suspended tenants redirected to `/suspended` by middleware

### White Label (Enterprise)

`lib/theming/TenantTheme.tsx` injects custom CSS properties. `/school/settings/branding` page:
- Logo upload (light/dark), favicon, custom primary color with live preview
- Custom domain with DNS CNAME verification (`/api/admin/wl/verify-domain`)
- Email branding (sender name, reply-to)
- "Powered by LIFT" toggle, hide all LIFT branding toggle

### Email System

`lib/emails/` — Branded HTML template system:
- **`templates/base.ts`** — 600px responsive card layout with indigo top bar, school logo support, proper footer
- **`send.ts`** — `sendLiftEmail()` loads tenant branding, wraps in template, sends via Nodemailer
- All 14 email functions in `lib/email.ts` use the branded template
- Email preview: `/api/admin/email-preview/[template]` (platform admin only)

### Production Hardening

- **Error system**: `lib/errors/` — LiftError hierarchy, `logError()` writes to audit_logs in prod, `isRetryable()`
- **Rate limiting**: `lib/rateLimit/middleware.ts` — in-memory sliding window on transcribe (10/hr), TTS (20/hr), signals (200/hr), register (5/IP/hr)
- **Database resilience**: `lib/db/withDb.ts` — non-critical DB wrapper with fallback
- **Health check**: `/api/health` — checks DB, AI keys, email config
- **Vercel config**: `vercel.json` — `buildCommand: "npm test && npm run build"` (tests gate every deploy), 60s timeout for AI routes, 30s for voice

### School Analytics

`/school/analytics` — Dedicated analytics page with:
- 6 stat cards with tooltips, SVG donut chart (TRI distribution), grade band breakdown table
- Dimension score bars, Learning Support Signal summary, 12-week sparkline chart
- Cycle selector for filtering. API: `/api/analytics/school`

### FERPA Data Export

`/school/settings/data` — Self-service data export:
- Async ZIP generation (archiver): candidates.csv, sessions.csv, profiles.csv, evaluations.csv, audit_log.csv, README.txt
- Upload to Supabase Storage with 7-day signed URLs
- Email notification on completion. Export history with download links.

### Admin Data Management

`/admin/tenants/[id]/reset` — Platform admin can:
- Reset all candidate data (FK-safe ordered deletion of 30+ tables)
- Reset license to trial / extend trial / manually activate / suspend
- Delete tenant entirely (with typed name confirmation)

`/admin/reports` — System-wide stats: ARR/MRR, pipeline health, AI error rates, recent errors
`/admin/settings` — Env var status, feature flags, AI model versions, deployment info

### In-App Help System

`/help/school_admin`, `/help/evaluator`, `/help/interviewer`, `/help/admin` — Role-specific guides with:
- Collapsible sections, step-by-step instructions, breadcrumbs
- Stat explainer cards, tip/warning callout boxes, table of contents
- Titles and subtitles translated to Portuguese via i18n

### Onboarding

`components/onboarding/OnboardingBanner.tsx` — 5-step guided checklist:
1. Create cycle → 2. Invite evaluator → 3. Invite candidate → 4. Complete session → 5. Review report
Steps auto-complete from API routes. Progress bar, celebration on completion. Fully translated. Banner refetches progress on `pathname` change and window focus (not just mount), so navigation away and back always shows current state. **Note: this banner is queued for quieting per the trial-conversion plan** (visible activation rails patronize senior B2B buyers — see `feedback_b2b_buyer_nudge_channel` memory). Don't expand it; do not propose visible activation panels for trial users.

**Welcome page** (`/school/welcome`): renders three action cards. The third card is **"See a sample candidate's report"** linking directly to a seeded demo candidate's evaluator detail page (resolved server-side from `is_demo = true` candidates with a completed session). Sessions-available figure reads from `useLicense().sessionsLimit` (LicenseProvider context — there is no `sessions_limit` column on `tenant_licenses`; the effective limit is computed from `session_limit_override` + tier defaults).

### Candidate Session Flow

1. Admin imports candidates → creates `candidates` + `invites` records
2. Invite email sent with token link → `/invite/{token}`
3. Consent collected → `/consent/{token}` (guardian consent if COPPA)
4. Session starts → `/session/{token}` — loads `SessionClient`
5. Tasks served sequentially (8 task types across 3 grades: 6-7, 8, 9-11)
6. Signals captured: keystroke/backspace counts, focus events, timing, hints, voice usage
7. On completion → pipeline runs → insight_profiles created → evaluator notified if flagged

### Database Migrations

SQL files in `supabase/migrations/` numbered sequentially (001-028). Key additions beyond 018:
- 019: gender column, 020: waitlist/reapplication, 021: outcomes, 022: assignments
- 023: support_plans + support_resources, 024: SIS integrations, 025: trial intelligence
- 026: Ravenna SIS provider, 027: enriched signals, 028: email_logs
- 029: tooltip_dismissals, 030: demo_sessions
- 031: auto_invite (invitation_log table, auto_invite_on_import + invite_deadline_days on tenant_settings)
- 032: application_data (candidate_application_data table)
- 033: observation_notes (interviewer_observation_notes table)
- 034: class_compositions (class_compositions table for Class Builder)
- 035: math_dimension (math_score column on insight_profiles, math_problem task type)
- 036: longitudinal (evaluator_calibration table, avg_math on cohort_benchmarks)
- 037: defensible_language (defensible_language_cache jsonb + defensible_language_updated_at + signal_snapshot_hash + defensible_language_model on candidates; mission_statement on tenant_settings)
- 038: stage2_upgrades (signal_snapshot_vector jsonb on candidates, mission_statement_updated_at on tenant_settings + DB trigger, idx_candidates_briefing_readiness)
- 039: committee_sessions (committee_sessions, committee_votes tables; partial unique index on active session per cycle)
- 040: enrollment_readiness_flags (candidate_flags table + post_admit_silence_days on tenant_settings)
- 041: security_hardening (RLS on demo_sessions, security_invoker on trial_health view, search_path pinned on 7 SECURITY DEFINER functions — per Supabase database linter)
- 042: tenant_delete_cascades (fixes 3 FKs that referenced tenants(id) without ON DELETE — task_templates → CASCADE, audit_logs → SET NULL, demo_sessions → CASCADE)
- 043: tenant_delete_cascade_sweep (DO-block dynamic sweep of every NO ACTION FK in public schema where the target table has a tenant_id column — converts to CASCADE if NOT NULL, SET NULL if nullable; required because 042 only fixed direct children of tenants but the cascade then 23503'd on grandchildren)
- 044: candidates_is_demo (is_demo + hidden_from_default_view boolean columns on candidates; backfill marks the legacy "(Demo)"-suffixed Stripe placeholders. Powers the SamplePill and the soft-archive-on-first-real-invite flow.)
- 045: expected_tier (tenants.expected_tier text + tenant_settings.nurture_tags_fired text[]. Drives tier-aware TrialBanner CTA and the daily /api/cron/trial-nurture idempotency ledger.)
`FULL_MIGRATION_PT.sql` is the concatenated bootstrap bundle for **fresh** Supabase instances **only** — do NOT run on an existing populated DB. The 001-018 portion uses bare `CREATE TABLE` and will fail with `42P07: relation already exists` on re-run, leaving the DB in an unknown partial state. For catch-up on an existing instance, identify missing migrations via a schema-readiness probe and apply individual migration files (in numeric order), not the bundle.

### Demo Mode

New trial registrations get 3 demo candidates and task templates auto-seeded. Demo candidates auto-removed when school invites their first real candidate. `scripts/seed-pt-tasks.ts` seeds Portuguese task templates.

**Locale-aware demo seeding:** `lib/demo/seedDemoSchool.ts:ensureDemoCandidates()` dispatches to `lib/demo/seedDemoSchoolPt.ts:ensureDemoCandidatesPt()` when `getLocale() === "pt"`. PT candidates are Pedro Oliveira (8º, ready, TRI 74), Mariana Tanaka (10º, watch with reading-pace + writing-revision signals, TRI 61), Helena Costa (7º, thriving, TRI 88). EN candidates remain Jamie Rivera, Alex Chen, Sofia Okafor. PT task responses align with actual PT task templates (reference "A Decisão de Rio Verde", "A Escola Ideal", etc. from `seed-pt-tasks.ts`). Active cycle name also localized ("Processo Seletivo" vs "Admissions").

**Sample marking + soft-archive (migration 044):** All three demo seeders (`seedDemoSchool.ts`, `seedDemoSchoolPt.ts`, and the Stripe guest-purchase seeder in `lib/licensing/stripe.ts`) set `candidates.is_demo = true`. The migration backfilled legacy `(Demo)`-suffixed names. `components/ui/SamplePill.tsx` renders next to demo candidate names on the candidates list (`CandidateListClient`) and on the evaluator detail header (`candidate-detail-client.tsx`). The candidates page banner trigger is `is_demo && !hidden_from_default_view`, not the legacy `last_name LIKE '%(Demo)%'`. **Soft-archive on first real invite:** `lib/invitations/softArchiveDemos.ts:softArchiveDemoCandidates(tenantId)` sets `hidden_from_default_view = true` on every still-visible `is_demo` row in the tenant. Called from both `lib/invitations/trigger.ts` (resends, bulk-send, SIS-inbound — guarded by `!candidate.is_demo` so demo resends like the self-invite don't archive themselves) and `app/api/school/candidates/invite/route.ts` (UI-created candidate — always real, no guard). Idempotent. Never deletes. The "Show sample candidates (N)" toggle on `/school/candidates` surfaces them again. Pre-existing trial tenants (seeded before commit 5fd1e92) won't get `is_demo` flagged retroactively unless run manually with a one-line UPDATE; the dashboard self-heal won't re-seed because they already have ≥3 insight_profiles.

**Standalone PT seeder:** `npx tsx scripts/seed-pt-demo.ts` runs `ensureDemoCandidatesPt()` against `.env.pt` credentials. Useful when the dashboard auto-load hasn't fired, or for re-seeding after manual cleanup. Loads `.env.pt` with `override: true` BEFORE importing any module that reads `process.env` at import time (since `lib/supabase/admin.ts` creates the client at module-load).

**Migration catch-up for existing PT instances:** `supabase/migrations/FULL_MIGRATION_PT.sql` is **fresh-bootstrap only** — do not run on a populated DB (001-018 uses bare `CREATE TABLE` and fails with `42P07`). For catch-up on an existing instance, use `supabase/migrations/CATCH_UP_PT_022_040.sql` which wraps each migration 022-040 in `BEGIN; ... COMMIT;` for atomic safety. Identify the starting point via a schema-readiness probe (check `to_regclass()` for distinctive tables per migration) before deciding which catch-up to use. Note: Supabase SQL editor surfaces the first error as red but continues executing subsequent BEGIN/COMMIT blocks — trust the post-run probe over the editor's error display.

### Support Plan Generator

`/api/pipeline/support-plan` — When a candidate is admitted (via final_recommendations), LIFT generates a 90-day onboarding plan via Claude API. Plans include: week 1-2 actions, month 1 priorities, month 2-3 checkpoints, recommended resources (mapped to school's configured `support_resources`), academic accommodations, social integration notes, plan narrative, family welcome note. Interactive checklist with completion tracking. Plans can be finalized and shared with grade deans/learning specialists via email.

### Outcome Tracking

`OutcomesTab` on candidate detail — records academic year, term, GPA, standing, support services, retention. Shows LIFT prediction alongside actual outcomes for comparison. DB: `student_outcomes` table.

### SIS Integrations (Enterprise)

`lib/integrations/` — Adapter pattern for 5 SIS providers: Veracross (OAuth 2.0), Blackbaud (SKY API + auto token refresh), PowerSchool (REST), Ravenna (API key), Webhook (HMAC-SHA256). Generic CSV export/import fallback. Credentials encrypted via AES-256-GCM (`lib/crypto/encrypt.ts`, requires `ENCRYPTION_KEY` env var). Auto-syncs on admit decision. Settings UI at `/school/settings/integrations` with setup instructions per provider.

### Cohort Comparison View

`/school/cohort` — Side-by-side candidate comparison across an admissions cycle. Accessible to school_admin and evaluator roles (feature-gated: `cohort_view`).

- **Insight banner** (not stat cards): One actionable sentence like "18 candidates completed — 3 have support signals worth reviewing before your next committee meeting." Secondary line shows avg TRI + distribution breakdown.
- **Table view**: Candidate name, mini TRI arc gauge with readiness label, 6-bar dimension sparkline, top strength pill, signal badge, completion %, date, "View →" link. TRI/Signals headers have tooltips.
- **Card view**: 3-column responsive grid with TRI gauge, strength/signal pills, sparkline.
- **Filters**: Cycle selector (auto-selects active), grade band, sort (5 options), flag filter, name search.
- API: `GET /api/school/cohort` — fetches `candidates` → `sessions` → `insight_profiles` → `learning_support_signals` via separate queries (not nested joins).

### Automated Invitation Triggers

`lib/invitations/trigger.ts` — `sendCandidateInvite()` sends invites for already-created candidates with unsent invites. Logs to `invitation_log` table.

- **Bulk send**: `POST /api/school/candidates/bulk-send` — sends invites for multiple candidates, 150ms delay between sends.
- **SIS inbound webhook**: `POST /api/integrations/sis-inbound` — receives candidate data from external SIS, creates candidate + invite, auto-sends if `auto_invite_on_import` enabled. Auth via HMAC signature or direct secret key against `sis_integrations` config. Also populates `candidate_application_data` if `payload.application_data` is present.
- **Candidate list UI**: Checkbox selection, floating bulk action bar, per-row "Send Invite" button for unsent invites, "Not sent" badge, toast notifications.
- **Settings**: `tenant_settings.auto_invite_on_import` + `invite_deadline_days` — toggle + deadline selector in `/school/settings`.
- DB: `invitation_log` table (migration 031), `auto_invite_on_import` + `invite_deadline_days` columns on `tenant_settings`.

### Committee-Ready Report

`/api/exports/committee` — AI-generated one-page printable brief for admissions committee. Feature-gated: `committee_report`.

- `lib/ai/committeeNarrative.ts` — 3-paragraph committee brief (Readiness Summary, Areas for Consideration, Committee Consideration). Uses `getAnthropicClient()` + `AI_MODEL` + `withRetry()`. Incorporates interview synthesis and rubric recommendation when available. Handles re-applicant TRI comparison.
- HTML report: school branding header, "Confidential — Committee Use Only" bar, candidate section with TRI gauge, two-column layout (dimension bars + strengths/signals/interview score), AI narrative, FERPA/non-diagnostic footer. Print-optimized CSS.
- Accessed via "Committee Brief" button in evaluator workspace `ExportButtons` component. Opens in new tab, triggers print dialog. Toast confirms generation.

### Application Data Unified View

"Application" tab in evaluator candidate detail — shows school-side application info alongside LIFT session data. Feature-gated: `application_data`.

- **Left panel**: LIFT summary (TRI score, signal count, completion %, grade band, SIS sync status).
- **Right panel**: Editable form — Academic (GPA, trend, school), Standardized Tests (ISEE/SSAT + other), Recommendations (3 slots with sentiment dropdown + notes, tooltip on sentiment), Interview Notes, Flags (application complete, financial aid). SIS-synced fields are read-only.
- **Empty state**: Icon + "No application data yet" + "Add Application Data" button when no record exists.
- API: `GET/POST /api/school/candidates/application-data` — upsert with allowed-fields whitelist, audit logged.
- DB: `candidate_application_data` table (migration 032), unique on `(candidate_id, cycle_id)`.

### Interviewer Observation Notes

Structured note-taking linked to LIFT briefing observations and interview questions. Renders in the Interview tab below rubric submissions. Feature-gated: `observation_notes`.

- **LIFT Observations section**: Each briefing observation shown with guided prompt "Did the interview confirm this?". Inline sentiment selector ("How did the interview compare?") with 4 options: Confirms / Contradicts / Expands / Unclear — each with tooltip definition. Textarea for note. Saved notes display with sentiment badge, edit/delete.
- **Interview Questions section**: Each briefing question with dimension + rationale, "+ Response" button.
- **Free Notes section**: Standalone textarea for general observations.
- **Empty state**: Shown when no briefing data exists yet (session not completed).
- **Synthesis integration**: `/api/pipeline/synthesize` fetches `interviewer_observation_notes` and formats them in the AI prompt as `RE: "observation..." → CONFIRMS: note text`.
- API: `GET/POST/PATCH/DELETE /api/school/candidates/observation-notes`.
- DB: `interviewer_observation_notes` table (migration 033). Distinct from legacy `interviewer_notes` (simple text).

### Class Composition Builder

"Build Class" mode inside the Cohort View (`/school/cohort`). Feature-gated: `class_builder` (Professional). Lets admissions directors select candidates and see live composition stats.

- **Toggle**: "Build Class" button in cohort header appears when feature is enabled + cycle selected + candidates loaded.
- **Left panel**: Candidate table with checkboxes, initials, TRI score, signal indicator. Click row to toggle. Select-all checkbox.
- **Right panel** (sticky, live-updating as selection changes):
  - At a Glance: total students + avg TRI (color-coded)
  - Readiness Distribution: animated bars for strong/developing/emerging with counts + percentages
  - By Grade: breakdown when multiple grade bands present
  - Class Dimension Profile: 6 bars with "STRENGTH" callout on top 2 dimensions
  - Support Load: amber warning when selected students have learning support signals
  - CORE Readiness Preview: shows upgrade prompt when `core_bridge` feature not available, or readiness message when it is
- **Actions**: Save Draft (toast), Export CSV (toast), Confirm Class (modal with confirmation)
- **Empty state**: "Select candidates on the left" when nothing selected
- `lib/cohort/computeComposition.ts` — pure function (no DB calls) computing `ClassComposition` from `CohortRowForComposition[]`
- API: `GET/POST/PATCH /api/school/cohort/composition` — CRUD on `class_compositions` table (draft/confirmed/archived), audit logged
- DB: `class_compositions` table (migration 034) — `tenant_id`, `cycle_id`, `candidate_ids` (uuid[]), `composition_snapshot` (JSONB), `status`, `confirmed_at`

### LIFT→CORE Bridge

Enriches the existing core-handoff flow with predicted mastery band and learning style. Activates automatically when a school has both LIFT and CORE licenses (`core_integration_enabled` on tenant + `CORE_BRIDGE` feature gate on Enterprise tier).

- **LIFT side** (`app/api/integrations/core-handoff/route.ts`): Maps LIFT dimensions to CORE's actual values:
  - Band: `reteach` (TRI <50 or weak reading/reasoning), `grade_level` (50-89), `advanced` (90+ with strong dimensions)
  - Style: `text` (reading/writing dominant), `kinesthetic` (reasoning/persistence), `auditory` (reflection/advocacy), `visual` (default when no clear winner)
- **CORE side** (`app/api/import/lift-inbound/route.ts`): Stores `predicted_mastery_band` and `predicted_learning_style` in `users.lift_data` JSONB. Teacher student detail page renders LIFT Admissions Profile card (TRI, predicted band, predicted style, signal count) when `lift_data` exists.
- **No separate toggle needed**: Platform admin enables `core_integration_enabled` on the LIFT tenant. Predictions auto-included in admit handoff. CORE shows the data when present, hides when not.

### Mathematical Reasoning Dimension

7th scoring dimension added to the pipeline. `lib/ai/prompts/math.ts` evaluates accuracy, problem setup, pattern recognition, number sense, and ability to explain mathematical thinking — scored at grade level. `math_score` column on `insight_profiles` (migration 035). TRI weights rebalanced: all 7 dimensions at 0.15, advocacy at 0.10.

Math task templates (3 variants per grade band, 9 total):
- Grade 6-7: Field Trip Budget, Bake Sale, Garden Plot
- Grade 8: School Store, Pizza Party, Track Meet
- Grade 9-11: Scholarship Fund, Population Model, Ticket Pricing

Task selection randomized: session start picks one template per task type from the pool (Fisher-Yates shuffle). Candidates in the same grade band get different math problems.

### Longitudinal Analytics

Two tiers of multi-year intelligence:

**Professional — Trends** (`/school/reports/trends`, feature: `prediction_trends`):
- Year-over-year avg TRI across cycles, readiness distribution table, dimension averages with trend arrows (↑↓→), prediction accuracy over time
- API: `GET /api/analytics/trends`

**Enterprise — Institutional Memory** (`/school/reports/institutional`, feature: `institutional_memory`):
- Multi-year summary (years active, total candidates, sessions, overall accuracy), evaluator calibration table (reviews, admits, thrived vs struggled, accuracy % per evaluator — requires 3+ outcomes), board-ready insight paragraph
- DB: `evaluator_calibration` table (migration 036)
- API: `GET /api/analytics/institutional`

### Defensible Decision Language

Generates three parent-safe rationale versions (admit/waitlist/decline) per decision-eligible candidate using Claude Sonnet 4.6. Never LLM judgment on the recommendation itself — language only. Feature-gated: `defensible_language` (Professional+ and trial).

- **Engine**: `lib/ai/defensibleLanguage.ts` — generates all three versions in one call.
- **Guardrail**: `lib/ai/forbiddenPhrases.ts` — 30+ pattern forbidden-phrase check. Rejection triggers regeneration; after 3 rejections, falls back to deterministic safe-template text.
- **Cache key**: `lib/ai/signalHash.ts` — SHA-256 over a canonical 16-element vector (7 dimension scores + 9 enriched-signal severity codes) plus the raw vector stored as `signal_snapshot_vector` jsonb for L2 drift checks.
- **Drift**: `lib/director/staleLanguageDetection.ts` — normalized-L2 distance vs stored vector, 10% threshold. Replaces prior hash-equality check (Stage 2 upgrade). Also stale if mission-statement `mission_statement_updated_at` changed after generation, or if language is template-fallback.
- **Persistence**: `lib/director/defensibleLanguagePersist.ts` — cached directly on the `candidates` row as `defensible_language_cache` jsonb + `defensible_language_updated_at` + `signal_snapshot_hash` + `defensible_language_model` + `signal_snapshot_vector` (migrations 037 + 038). No separate table.
- **Role split**: evaluator sees read-only draft (calibration); `school_admin` + `platform_admin` get copy/edit/download/regenerate. Pre-committee banner warns against external use before deliberation.
- **Surfaces**: "Decision Language" tab on candidate detail (`components/director/DefensibleLanguageCard.tsx`); three-version panel appended to committee export HTML.
- **Mission statement**: `tenant_settings.mission_statement` + `mission_statement_updated_at` (DB trigger — single source of truth, catches direct DB/migration updates too). `MissionStatementBanner` on school dashboard nudges empty-mission tenants, dismissible, re-nudges every 14 days.
- **Audit**: every generate/reject/fallback/copy/edit/regenerate writes to `audit_logs` with `defensible_language.*` action types. Auto-regen on pipeline run when hash drifts; manual regen via admin button.
- **API**: `GET/POST /api/school/candidates/[id]/defensible-language`, `POST /api/school/candidates/[id]/defensible-language/edit`, `POST /api/school/candidates/[id]/defensible-language/copy`.

### Morning Briefing & Interviewer Prep

Two surfaces that consume Defensible Language output.

- **`/school/briefing`** (`school_admin` + `platform_admin`) — Morning Briefing. Table of decision-eligible candidates with language-readiness pills: **Ready** (hash + L2 match, mission current, not fallback) / **Stale** (drift or mission changed) / **Missing** (no row) / **Template** (fallback text, needs regen). Cycle + status filters. "Regenerate all stale" with dry-run preview → confirmation dialog (count + estimated time) → server-side batches of 10 via `Promise.allSettled` with 500ms inter-batch sleep. Rate limit: 1 bulk-regen per tenant per 60s (429 returns `retry_after_seconds`). API: `GET /api/school/briefing`, `POST /api/school/briefing/regenerate-stale`.
- **Interviewer workspace** (`/interviewer`) — was a 9-line stub; now surfaces candidates where `candidate_assignments.assignment_type IN ('interview', 'both')`. Uses a compact `BriefingCard` variant (top-3 observations + top-3 questions) with inline "Expand full briefing" disclosure (`aria-expanded`/`aria-controls`). Mobile-first: single column below md, min-44px tap targets. API: `GET /api/interviewer/assigned`. Components: `components/interviewer/InterviewerPrepList.tsx`, `components/evaluator/BriefingCard.tsx`.

### Committee Decision-Support Tool

Live committee deliberation surface — stage-then-commit flow. Feature-gated: `defensible_language` (same gate as Stage 1).

- **`/school/briefing/session/[id]`** — host records votes that live in `committee_votes` during deliberation (decisions: `admit`/`waitlist`/`decline`/`defer`; statuses: `staged`/`committed`/`held`). Commit writes each to `final_recommendations`, firing existing per-candidate CORE handoff + support plan + SIS sync. Commit uses bounded concurrency of 5 (`Promise.allSettled`) to avoid downstream saturation. `lib/committee/commitStagedVotes.ts`, `lib/committee/planCommitExecution.ts`.
- **Single-host model**: only `school_admin` starts a session; other tenant admins observe read-only. Partial unique index enforces one active session per cycle. Host transfer callable by current host, another tenant admin (sick-host case), or `platform_admin`. `current_host_id` mutable; `started_by` immutable for provenance.
- **`CandidateDeliberationCard`** — 3-column desktop layout (admit/waitlist/decline language side-by-side) with stale-language warning + one-click regenerate. `EndSessionDialog` previews staged decisions with per-candidate "Hold for next session" toggle; summary view after commit shows outcome + failure detail per vote.
- **Polling**: 5s interval, auto-paused when `document.visibilityState !== 'visible'` via new `lib/hooks/useVisibilityAwarePolling.ts`. No Realtime plumbing.
- **Rate limit**: 10 votes per 10s per host (catches double-clicks), 429 with `retry_after_seconds`. Overwriting a staged vote preserves prior in audit. Removing a candidate mid-session is blocked if any staged vote exists.
- **Orphan-session cron**: daily at 09:00 UTC, emails hosts of sessions active >14 days with staged votes. 7-day re-warn cooldown. `/api/cron/committee-orphan-check`. `lib/committee/staleSessionCheck.ts`. First cron in LIFT — conventions documented in `CRONS.md`.
- **Migration 039**. `vercel.json` includes the commit route (`maxDuration: 180`) and the cron entry.
- **API**: `POST /api/school/committee/sessions` (start), `GET/PATCH/DELETE /api/school/committee/sessions/[id]`, `POST /api/school/committee/sessions/[id]/vote`, `POST /api/school/committee/sessions/[id]/transfer-host`, `POST /api/school/committee/sessions/[id]/commit`.

### Enrollment Readiness Flags

Seven **deterministic observation-based** flags on eligible candidates (completed through offered status). **Not predictions, not risk scores, not probabilities** — observations against real data sources. Feature-gated: `enrollment_readiness_flags` (Professional+ and trial). See `docs/enrollment-readiness-flags.md` for per-flag spec (every flag documents what it does NOT mean).

- **Flags**: `consent_not_captured`, `invite_expired_unopened`, `assessment_abandoned`, `low_completion`, `late_cycle_admit`, `post_admit_silence`, `interviewer_unresponsive`.
- **Three-layer observation-not-prediction enforcement**: (1) `candidate_flags` table comment in migration 040, (2) allowlist-backed grep over Stage 4 code (ship-gate), (3) user-exposed per-flag spec in `docs/enrollment-readiness-flags.md`. Feature was originally named "Withdrawal Risk Flags" — renamed during reconciliation; naming holds observation framing throughout.
- **Planner**: `lib/flags/planner.ts` — pure function (fully unit-tested, 28 determinism tests: 7 flags × 4 scenarios — raise, resolve-on-clear, snooze-respect, escalation-re-raise).
- **Evaluator**: `lib/flags/evaluator.ts` — emits audit on state-change only (raised/escalated/resolved/auto_resolved), NOT on stable daily refresh. Keeps `audit_logs` forensically useful over long-lived flags.
- **Table**: `candidate_flags` (migration 040) preserves active + resolved history for year-two ML validation against `student_outcomes.withdrawal_reason`. Partial unique index on active rows. `computed_from` jsonb captures observational evidence at detection time.
- **Manual resolution**: required reason + 1–90 day snooze (default 30). Escalation bypasses snooze. CORE handoff auto-resolves `consent_not_captured` with `resolution_type = auto_core_handoff`.
- **Surfaces**: `/school/flags` triage page (admin-only), Flags column on `/school/briefing` with `FlagPill` + `FlagDetailDrawer`, flag pill on committee `CandidateDeliberationCard`. Interviewers do NOT see the `interviewer_unresponsive` flag pointed at their own work.
- **Settings**: `tenant_settings.post_admit_silence_days` (default 14, range 1–90).
- **Cron**: daily at 10:00 UTC (1-hour stagger from committee-orphan-check — stagger convention documented in `CRONS.md`). `maxDuration: 300`. `/api/cron/enrollment-readiness-flags-evaluate` calls `checkFeature()` per tenant and skips those without `ENROLLMENT_READINESS_FLAGS` in their license; `tenants_skipped` in the `evaluator_run` audit payload.
- **API**: `GET/POST /api/school/flags`, `POST /api/school/flags/[id]/resolve`.

### Role Editors

**Platform admin** (`/admin/tenants/[id]` → Users & Roles): Dropdown per user with all roles including platform_admin/school_admin. Remove button. API: `PATCH/DELETE /api/admin/roles`.

**School admin** (`/school/team`): Role dropdown limited to evaluator/interviewer/grade_dean/learning_specialist. Cannot assign platform_admin or school_admin. API: `PATCH /api/school/team/[id]` with `new_role` field.

### Task Selection Logic

`app/api/session/start/route.ts` — for task types with multiple templates, picks one randomly per type before shuffling order. This applies to ALL task types, not just math. Templates are grouped by `task_type`, one selected per group, then the selected set is shuffled for presentation order.

### Trial Intelligence

`lib/trial/` — Tracks trial school engagement events (first-occurrence-only via unique index on `trial_events`). 9 event types tracked: day1_login, first_candidate_invited, first_candidate_completed, evaluator_workspace_opened, tri_report_viewed, pdf_downloaded, support_plan_viewed, cohort_export_downloaded, evaluator_intelligence_opened. `trial_health` DB view computes health_status (healthy/at_risk), feature_depth_score (0-7), days_remaining. Auto-tags HL contacts on risk signals. Admin dashboard at `/admin/trials` with nudge button.

### Enriched Learning Support Signals

`lib/signals/enrichedSignals.ts` — 9 behavioral detectors run after existing boolean flags in pipeline Step 4b: Extended Reading Time, Repeated Passage Re-reading, High Written Expression Revision, Reasoning-Expression Gap, Limited Written Output, Variable Task Pacing, Task Completion Difficulty, Low Support-Seeking Under Challenge, Limited Metacognitive Expression. Each signal has severity (advisory/notable), category, description, evidence, recommendation. Stored as JSONB on `learning_support_signals.enriched_signals`. Therapeutic schools see additional disclaimer.

### Guest Checkout (Direct Purchase)

`/buy?tier=professional` — Public page that collects name/email/school, creates Stripe Checkout session without auth. On payment, webhook (`handleGuestPurchase`) creates: auth user with temp password, tenant, settings, task templates, license (active, not trial), demo candidates. Sends branded email with credentials. `must_change_password` flag in user metadata forces password change on first login (middleware redirect).

### Mobile-Responsive Dashboard

Sidebar is hidden on mobile with hamburger toggle button. Overlay + close button. Nav links close sidebar on tap. Main content uses `md:ml-60` for responsive layout.

### Error Monitoring

Sentry (`@sentry/nextjs`) configured for client, server, and edge. Global error page at `app/global-error.tsx` reports to Sentry. Requires `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` env vars.

### Marketing Analytics

Three trackers — GA4, LinkedIn Insight Tag, PostHog — fire **only on public marketing paths**. Never on authenticated dashboard surfaces, candidate assessment routes, or auth/credential flows. Privacy posture driven by FERPA/COPPA: authenticated URLs include candidate UUIDs and sometimes minor PII.

- **`lib/analytics/marketingPaths.ts`** — `isPublicMarketingPath(pathname)` is the **single source of truth**. Allow-list (fails closed), not deny-list. Current allow-list: `/lift`, `/pricing`, `/register`, `/buy`, `/buy/success`, `/demo/new`, `/demo/expired`, `/legal/*`. Everything else is OFF — including `/`, `/login`, `/forgot-password`, `/reset-password`, `/confirm`, `/demo/[token]`, and all `(dashboard)` / `(candidate)` routes.
- **`__tests__/marketing-paths.test.ts`** — 37 tests gate the predicate. Adding a marketing route requires both editing the predicate and adding tests; `npm test` runs via `vercel.json` `buildCommand` so CI catches regressions.
- **PostHog wiring**: `app/providers.tsx` exports `PHProvider`, always wraps `<PostHogProvider>` (so `usePostHog()` works on any route) but only calls `posthog.init()` inside a `useEffect` gated by the predicate. Config: `person_profiles: 'identified_only'`, `autocapture: true`, `capture_pageview: false` (manual), `capture_pageleave: true`, `session_recording.maskAllInputs: true`.
- **Manual `$pageview`**: `app/PostHogPageView.tsx` — Suspense-wrapped because inner component uses `useSearchParams` (would otherwise opt every page out of static generation). Duplicates the allow-list check inside the effect as defense-in-depth.
- **GA4 / LinkedIn**: `components/GoogleAnalytics.tsx`, `components/LinkedInInsightTag.tsx` — both client components that render `next/script` tags only when the predicate returns true. Mounted in root layout.
- **`components/analytics/AnalyticsHealthCard.tsx`** — diagnostic component reading PostHog via `usePostHog()` (NOT `window.posthog`). Two variants:
  - **overlay**: mounted on `/lift`, renders only when `?debug=1` is present. Floating bottom-right panel.
  - **card**: mounted inside `/admin/api-test`, always visible.
  - Shows per-tracker ON/OFF + match-vs-expected (expected auto-derived from pathname). Green border = everything matches expected state. On dashboard routes OFF is the success state.
- **Route-group isolation deviation**: the canonical CORE pattern mounts GA4/LinkedIn inside an `app/(public)/layout.tsx` for compile-time isolation. LIFT deliberately uses component-level gating instead because `(public)` mixes marketing pages (`/register`, `/pricing`, `/buy`) with credential flows (`/forgot-password`, `/reset-password`, `/confirm`) that must not fire analytics. The allow-list predicate gives the same privacy guarantee at runtime. See comment block at top of `lib/analytics/marketingPaths.ts`.

### API & Tag Diagnostics

`/admin/api-test` (platform admin only) — runs live probes against external APIs and reports analytics-tag state for the current browser.

- **Server-side probes**: `GET /api/admin/api-test?service=<name>` or `?service=all`. Services: Supabase (tenants read), Anthropic (1-token Claude ping ~$0.00003), OpenAI (models.list), Stripe (balance.retrieve), HighLevel (location lookup, auto-detects v1/v2 API), Resend (domains list). All read-only where possible. Returns `{ service, status, latency_ms, detail }`.
- **Client-side tag card**: `AnalyticsHealthCard` (card variant) reads `usePostHog().__loaded`, `window._linkedin_data_partner_ids`, `window.dataLayer`/`gtag`. Expected state on this page is OFF for all three — green border + "OFF / OK" badges indicates everything is working correctly.
- Nav: platform sidebar → "API Test" (FlaskConical icon) under System Audit.

### Email Delivery Logging

`email_logs` table records every email sent via `sendLiftEmail` — recipient, subject, status (sent/failed), error message. Platform admins can query for delivery issues.

### Admin System Audit

`/admin/audit` — Cross-tenant audit log viewer for platform admins. Shows all actions with school name, user, action type, payload. Searchable + filterable by action type.

### Demo Candidate Seeding (Registration)

Registration calls `ensureDemoCandidates()` from `lib/demo/seedDemoSchool.ts` to seed 3 demo candidates with full profiles (Jamie Rivera TRI 74, Alex Chen TRI 61 with signals, Sofia Okafor TRI 88). The dashboard page also calls `ensureDemoCandidates()` on load as a self-healing check for tenants that registered before the full seeder was wired in. The function only creates demo data if fewer than 3 insight_profiles exist for the tenant, and only deletes candidates with zero sessions (never real candidates).

### One-Click Live Demo

`/demo/new` creates a 30-minute demo session and redirects to `/demo/[token]`. No registration needed. `demo_sessions` table tracks token, expiry, UTM params, conversion. `lib/demo/seedDemoSchool.ts` ensures 3 synthetic candidates exist (Jamie Rivera TRI 74, Alex Chen TRI 61 with signals, Sofia Okafor TRI 88) with full insight profiles and learning support signals for the `lift-demo` tenant. Demo workspace shows real evaluator experience: candidate list, dimension scores, evaluator intelligence (dynamic briefing based on TRI), learning support signals, and reports tab (locked with trial CTA). Floating countdown timer, upgrade prompt at 5 min, expired modal at 0:00. Conversion tracked via `demo_token` query param on `/register`. Rate limited: 20 demos/IP/hour.

**Important**: Demo queries use **separate queries** (not Supabase nested joins) because PostgREST schema cache can cause joins to return empty results silently. The `lift-demo` tenant must exist with `slug = 'lift-demo'`.

### Contextual Tooltip System

`lib/tooltips/content.ts` — 35+ centralized tooltip definitions covering TRI, dimensions, signals, evaluator intelligence, rubric, cycles, session tokens, grades, support plans, outcome tracking, cohort view (avg TRI, signals), observation note sentiments (confirms/contradicts/expands/unclear), application data, recommendation sentiment, committee report, and 3 trial-specific banners. `components/ui/Tooltip.tsx` — 3 modes: icon (hover popover with auto-flip positioning), inline (dotted underline), banner (dismissible bar). DB-backed dismissals via `tooltip_dismissals` table + `/api/tooltips/dismiss` route + `useTooltips()` hook. Role-aware filtering.

### Back Buttons

`components/ui/BackButton.tsx` — Reusable back navigation with arrow icon and hover animation. Accepts optional `href` (navigates to specific page) or falls back to `router.back()`. Added to: candidate detail, cycle detail, invite/import candidate forms, settings sub-pages (branding, integrations, data), help guide.

### Email Editing

**Team members** (`/school/team`): Hover over email reveals inline "Edit" link. PATCH `/api/school/team/[id]` updates `users` table + Supabase Auth email. Audit logged.

**Candidate invites** (evaluator candidate detail → Overview tab): Email from `invites.sent_to_email` now displayed with inline edit. PATCH `/api/school/candidates/[id]/update-email` updates the invite record. Audit logged.

### Status Badges

`components/ui/StatusBadge.tsx` — Reusable status pill with per-status icons and colors: invited (✉ indigo), consent_pending (⏳ amber), active (⏳ amber), completed (✓ green), flagged (⚠ rose), reviewed (✓ gray), waitlisted (⏸ purple), admitted (🎓 green).

### Grade Display

UI always shows individual grades (Grade 6, Grade 7, Grade 8, etc.), never grade bands (6-7, 9-11). The `grade_band` field is internal-only for task routing. All filters, summary pills, table rows, and candidate details use `grade_applying_to`. The cohort API filter still uses `grade_band` for the backend query, but grade dropdowns show individual grade labels.

### Visual Polish

`globals.css` additions: `animate-page` (fadeInUp on dashboard content), `card-hover` (2px lift + shadow on hover), `accent-left-*` colored left borders, `stat-hero` (36px bold monospace numbers). Dashboard stat cards have icons, colored borders, hero numbers. Analytics page sections have emoji icons, dimension icons, learning support definition banner. Report buttons visually distinct: Internal (🏛 indigo), Family (👨‍👩‍👧 green), Committee (📋 purple).

### Guided Tours & Feature Discovery

`components/ui/GuidedTour.tsx` — Step-by-step tour engine with element targeting via CSS selectors, highlight ring overlay, progress dots, localStorage persistence. `components/tours/SchoolAdminTour.tsx` — 7-step welcome tour. `components/tours/EvaluatorTour.tsx` — 7-step tour. `components/ui/FeatureBadge.tsx` — "New" pulsing dot on sidebar items (Support Plans, Prediction Accuracy, Trial Health), auto-dismisses on click via localStorage. Trial banner tooltips (`components/tooltips/TrialBannerTooltips.tsx`) show on school dashboard for trial accounts.

### Marketing Landing Page

`app/lift/page.tsx` — LIFT landing page served at `lift.inteliflowai.com/lift`. No WordPress dependency — deployed via Vercel on git push.

- **Positioning**: "Learning Intelligence for Admissions. Built on pedagogy. Powered by AI."
- **Structure**: Single `'use client'` page (~1350 lines), inline styles, `@ts-nocheck` (converted from CRA)
- **Images**: `public/marketing/` (lift-logo, founders, hero images, compliance logos)
- **Brand palette**: `BRAND` constant — teal-forward (`#0a1419` bg, `#14b8a6` primary, `#2dd4bf` accent)
- **Sections**: Hero + animated demo, stats bar, how it works, 7 dimensions, 9 signals, enterprise features, year-round, founders, pricing (Professional $12k / Enterprise $18k), FAQ, contact forms, footer
- **Lead capture**: HighLevel webhook + mailto fallback
- **Animation**: 4-screen animated demo, 7s per slide, auto-loops
- **Mobile**: Responsive at 1024px and 720px breakpoints. Grids → single column, nav → hamburger, animation visible below hero text
- **Legacy**: `marketing/` CRA folder still exists but is no longer the primary deployment path

### Legal Pages

- **`/legal/privacy`** — Full privacy policy (13 sections: scope, data collection, AI disclosure, behavioral signals disclaimer, service providers, FERPA/COPPA/CCPA/GDPR, retention, children's privacy)
- **`/legal/terms`** — Full terms of service (17 sections: subscription tiers, acceptable use, AI outputs disclaimer, IP, indemnification, limitation of liability, governing law Wyoming)
- Both pages use LIFT teal dark theme, "← Back to LIFT" navigation, server components with metadata

### Animated Product Demo (Marketing)

`AnimatedDemo` component in `marketing/src/App.js` — 4-screen looping animation in the hero section (replaces static image). Screen 1: candidate profile with animated TRI gauge (0→74). Screen 2: 6 dimension bars animating staggered. Screen 3: evaluator intelligence briefing with fade-up observations. Screen 4: report buttons + family report preview. 12-second loop, fade transitions, screen indicator dots.

### Remotion Video Export

Standalone project at `C:\Users\Inteliflow\lift-demo-video\`. Renders the animated demo as MP4 video for social ads. Two compositions: square (1080x1080 for Instagram/Facebook) and landscape (1920x1080 for LinkedIn/YouTube). 12 seconds, 30fps, H.264. Render: `cd lift-demo-video && node render.mjs`. Output in `out/`.

## Environment

Required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`.

Voice/TTS: `OPENAI_API_KEY`. Email: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`. Pipeline security: `CRON_SECRET`, `INTERNAL_API_SECRET`.

Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PROFESSIONAL`, `STRIPE_PRICE_ID_ENTERPRISE`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

HighLevel: `HL_API_KEY`, `HL_LOCATION_ID`, `HL_PIPELINE_ID`, `HL_STAGE_IDS` (JSON), `HL_INBOUND_SECRET`.

Locale/Branding: `LIFT_LOCALE` (en|pt), `LIFT_BRAND_NAME`, `LIFT_BRAND_TAGLINE`, `LIFT_HIDE_PRICING` (true|false).

Sentry: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`.

Marketing analytics: `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` (shared Inteliflow PostHog project). GA4 ID and LinkedIn partner ID are hardcoded in `components/GoogleAnalytics.tsx` and `components/LinkedInInsightTag.tsx`. Vercel env vars must be scoped to Production (and Preview if preview builds need tracking); `NEXT_PUBLIC_*` vars are inlined at build time, not runtime — a new deploy is required after adding them.

Encryption: `ENCRYPTION_KEY` (32-byte hex for AES-256-GCM, used by SIS credential encryption).

Optional: `LIFT_TEAM_EMAIL`, `LIFT_DEV_MODE`.

## Evaluator Candidate Detail

`app/(dashboard)/evaluator/candidates/[id]/` — The main review page. 7 dimensions scored (reading, writing, reasoning, math, reflection, persistence, advocacy). 9 tabs (some conditional):

- **Overview**: TRI gauge with explanation card, radar chart, dimension scores, briefing card, learning support panel. Shows candidate email (from invites) with inline edit capability.
- **Responses**: Task-by-task display of candidate's written responses, word counts, revision depth. Joined via `task_instances → response_text → response_features` (nested join — do NOT join response_features directly to task_instances)
- **Signals**: Behavioral data with descriptions — avg time per task, reading time, hints, focus loss, session duration. Time-per-task bar chart. Session timeline with color-coded events. Info banner explaining what signals are.
- **Evaluator Review**: AI Recommendation shown FIRST (dimension score bars, placement guidance, confidence) — only if `ai_recommendation_snapshot` is non-empty. Then evaluator's own notes + tier selection (colored buttons). Text adapts: "Review the AI recommendation above" when AI exists, "Provide your assessment" when it doesn't. Override rationale only asked when tier actually differs from AI.
- **Interview Notes**: Rubric scoring + interview synthesis + observation notes (linked to LIFT briefing observations/questions with sentiment tagging)
- **Application** (feature-gated: `application_data`): LIFT summary + editable application data form (GPA, test scores, recommendations, interview notes). Empty state when no data exists.
- **Outcomes** (visible when candidate is completed/reviewed/admitted): Record GPA, standing, support services, retention
- **Support Plan** (visible when candidate is admitted): AI-generated 90-day plan with interactive checklists

The `ai_recommendation_snapshot` on `evaluator_reviews` contains dimension scores + `placement_guidance` text (not a structured tier/rationale format). The Review tab renders both formats.

## Known Patterns & Gotchas

- **All API routes using `getTenantContext()` or `createClient` from supabase/server MUST have `export const dynamic = "force-dynamic"`** — otherwise Vercel build crashes on `cookies()` access during data collection
- **`response_text` has no unique constraint on `task_instance_id`** — use simple `insert`, NOT `upsert` with `onConflict`
- **`response_features` references `response_text_id`**, not `task_instance_id` — Supabase joins must go through `response_text`
- **Pipeline timeout**: orchestrator (`/api/pipeline/run`) set to 120s in `vercel.json`. Still tight for 6 sequential Claude API calls. Requires Vercel Pro plan. Briefing step errors are logged and recorded in `pipeline_errors`. If briefing fails, evaluator sees a "Generate Briefing" button instead of infinite spinner.
- **Briefing regeneration**: `/api/pipeline/briefing/regenerate` allows evaluators to manually trigger briefing generation from the candidate detail page when the pipeline didn't create one.
- **TTS (PassageReader)**: NOT shown on `reading_passage` tasks (reading comprehension — candidate must read). IS shown on `scenario` and `quantitative_reasoning`.
- **Hydration errors** (#418/#423/#425): Console-only warnings from `LocaleProvider` wrapping server-rendered content. Don't break functionality. Do NOT use raw `<head>` tags in nested layouts — use Next.js `metadata`/`viewport` exports instead (raw `<head>` causes #329 scheduler crash).
- **Task templates**: Must have full content (passage text, scenario text). Original seed script had broken templates with empty content for some grade bands. Use `lib/seed-task-templates.ts` or `scripts/seed-existing-tenants.ts` for proper seeding.
- **Sidebar feature gating**: Nav items with a `feature` property are filtered by `useLicense().hasFeature()`. Enterprise-only features (waitlist, re-app, etc.) hidden for Professional users.
- **Candidate assignments**: School admins can assign candidates to evaluators/interviewers via `candidate_assignments` table. Evaluators see assigned candidates in their queue.
- **Final recommendations**: When decision is "admit", automatically triggers: CORE handoff, support plan generation, SIS sync (all fire-and-forget).
- **Guest purchase idempotency**: Stripe webhook checks `license_events` for existing `stripe_session_id` to prevent duplicate tenant creation on webhook retry.
- **Demo candidate cleanup is soft-archive, not delete**: The first non-demo invite for a tenant flips `hidden_from_default_view = true` on every `is_demo` row via the shared helper `lib/invitations/softArchiveDemos.ts`. Both invite paths use it: `lib/invitations/trigger.ts` (resends, bulk, SIS) and `app/api/school/candidates/invite/route.ts` (UI new-candidate). Demos never get deleted — `/school/candidates` has a "Show sample candidates (N)" toggle that surfaces them again. Idempotent, so resends and bulk imports after the first real invite are no-ops here. Migration 044 is required for both columns. Do NOT reintroduce the legacy `last_name LIKE '%(Demo)%'` hard-delete that lived in candidates/invite/route.ts before commit a69fb37 — that pattern only matched legacy Stripe-seeded placeholders and silently skipped the new clean-name seeded demos (Jamie/Alex/Sofia, Pedro/Mariana/Helena), so the soft-archive helper is the one source of truth.
- **Sentry auth token**: `SENTRY_AUTH_TOKEN` env var needed for source map uploads (readable stack traces).
- **Supabase nested joins unreliable**: PostgREST schema cache can cause `.select("table(columns)")` joins to return empty silently. Use separate queries for critical paths (see demo page, evaluator candidate detail team members).
- **Demo tenant**: Must exist with `slug = 'lift-demo'`. Seed creates candidates on first demo session. If candidates exist without profiles, delete all demo tenant data and let seed recreate.
- **Tooltip dismissals**: DB-backed (not localStorage) — persist across devices. Tours and feature badges use localStorage (per-browser only).
- **Tooltip positioning**: `Tooltip.tsx`, `InfoTooltip.tsx`, and `GuidedTour.tsx` all auto-flip position when near viewport edges. Tooltips detect available space and render above/below accordingly.
- **Terminology**: User-facing text says "Grade" (not "Grade Band"). Internal code still uses `grade_band` for DB columns, types, and variable names — only display text was changed.
- **Voice transcription default**: Both page (`voiceEnabled` prop) and API (`/api/session/transcribe`) must agree on the default when `tenant_settings` is null. Both default to enabled (voice allowed). The API only rejects when settings explicitly exist with `voice_mode_enabled = false`.
- **Candidate layout metadata**: Uses Next.js `metadata`/`viewport` exports for PWA meta tags (manifest, theme-color, apple-web-app). Do NOT use raw `<head>` elements in nested layouts.
- **`interviewer_observation_notes` vs `interviewer_notes`**: Two separate tables, **by design — not a cleanup candidate**. `interviewer_notes` (mig 001) holds rubric form submissions (`rubric_scores` jsonb) + free-text `notes`, consumed by the rubric form, the AI synthesis pipeline, and the evaluator detail page. `interviewer_observation_notes` (mig 033) holds structured sentiment-tagged notes that link to specific LIFT briefing observations/questions — different shape, different consumers. Unifying them would require restructuring the synthesis pipeline + rubric form to handle a merged shape with no clear upside; the existing split works. Do NOT propose a merge migration.
- **`candidate_application_data` unique constraint**: `UNIQUE(candidate_id, cycle_id)` — upsert must use `onConflict: "candidate_id,cycle_id"`.
- **Cohort view queries**: Uses 4 separate queries (`candidates` → `sessions` → `insight_profiles` → `learning_support_signals`), not nested joins. Same pattern as analytics and demo pages.
- **Committee report route**: Lives at `/api/exports/committee` (not `/api/reports/`). Uses GET with `?candidate_id=` param, returns HTML (not JSON). Opens in new tab for print.
- **SIS inbound webhook auth**: Validates via HMAC signature (`x-sis-signature` header) or direct key match (`x-sis-secret` header) against decrypted `sis_integrations.config`. Requires `x-tenant-id` header.
- **Toast provider**: `ToastProvider` wraps dashboard layout inside `LicenseProvider`. `useToast()` hook available in all dashboard client components. Do NOT wrap candidate/public routes — they don't have it.
- **Class Builder data flow**: ClassBuilder receives `CohortRowForComposition[]` (same shape as cohort API `sessions` response). The `computeComposition()` function is a pure client-side calculator — no API calls. Compositions are saved to `class_compositions` table via `/api/school/cohort/composition`.
- **Grade display vs grade_band**: UI always shows `grade_applying_to` (individual grade: 6, 7, 8, etc.). The `grade_band` field (6-7, 8, 9-11) is internal only — used for task routing and API filtering, never shown to users. Candidate list, cohort view, dashboard, and candidate detail all display individual grades.
- **Terminology changes (Barb feedback)**: "Task Count" → "Session Tasks", "Hint Density" → "Hint Usage Level", "UX Mode" → "Session Experience" (Simple→Focused, Advanced→Extended), "Save Config" → "Save Settings", "Evaluator Review" tab → "My Review", "My Cases" → "My Interviews".
- **Demo seeding self-heal**: Dashboard page calls `ensureDemoCandidates()` on every load (fire-and-forget). Only creates demo data if <3 insight_profiles exist. Only deletes candidates with zero sessions. Safe for tenants with real data.
- **Settings auto-create**: If `tenant_settings` record is missing (registration insert failed), the settings page auto-creates one with defaults instead of showing "No settings found".
- **CORE bridge prediction mapping**: LIFT uses `reteach`/`grade_level`/`advanced` (CORE's actual band values, not "On Track"/"Reteach"/"Advanced"). Learning styles map to CORE's 5 styles: `visual`, `auditory`, `kinesthetic`, `text`, `emerging`. Math dimension maps to `kinesthetic`. The mapping is in `core-handoff/route.ts` — not a shared lib.
- **TRI label display mapping**: DB stores `emerging`/`developing`/`ready`/`thriving`. UI displays "Emerging Readiness"/"Developing Readiness"/"Strong Readiness" via `lib/utils/triLabel.ts`. The file exports two functions: `displayTriLabel(dbLabel)` for surfaces that have the band string, and `triScoreToLabel(score: number)` for surfaces that only have the numeric TRI score (same 75/50 thresholds, same long-form output). Do NOT use `capitalize` on raw DB labels and do NOT define a local short-form bucketer — `school/cohort/cohort-client.tsx` did this previously and produced "Strong"/"Developing"/"Emerging" while the rest of the app showed "Strong Readiness" / etc. Fixed in commit a99e477.
- **Email delivery**: Uses Resend API (not Nodemailer SMTP). Single env var `RESEND_API_KEY`. Sends from `lift@inteliflowai.com`. Domain verified in Resend dashboard.
- **Brand colors**: Platform uses teal (`#14b8a6`) matching the LIFT logo — NOT indigo. Do not introduce `#6366f1` or `#818cf8` as primary colors. Use `bg-primary`, `text-primary`, `border-primary` Tailwind classes which resolve to teal via tokens.
- **Cycle creation**: Academic year dropdown + term selector (Full Year/Fall/Winter/Spring/Summer). Auto-generates name like "2026-2027 Fall Admissions". No open/close dates.
- **Cycle deletion**: Only allowed when cycle has zero candidates. DELETE `/api/school/cycles/[id]` deletes grade_band_templates first (FK constraint).
- **Session pause intervals**: Options are 1hr/2hr/4hr/12hr/24hr/48hr (stored as int hours in `session_pause_limit_hours`).
- **Support plan tier labels**: "No Plan" → "No additional support", "Independent" → "Monitor (30-day check-in)", "Standard" → "Light support (monthly)", "Enhanced" → "Structured (weekly)", "Intensive" → "Intensive (daily)".
- **Waitlist fit notes**: Editable "Fit Notes" column on waitlist table (uses existing `internal_notes` field via PATCH). For school-specific factors (pitcher, legacy, musician, etc.).
- **Role editing**: Platform admin can assign any role via `/api/admin/roles`. School admin can only assign evaluator/interviewer/grade_dean/learning_specialist via `/api/school/team/[id]` PATCH. Cannot assign platform_admin or school_admin from school team page.
- **Math task randomization**: Session start picks one template per task_type from the pool. 3 math variants per grade band = different candidates get different problems. This applies to ALL task types with multiple templates.
- **HL API v1 vs v2 payload shape**: v2 (PIT keys) rejects the v1-only `customField` top-level key with 422. `lib/highlevel/client.ts` auto-strips it on v2. If you ever need custom fields on v2, use `customFields` (plural) as an array of `{id, field_value}` with the HL field IDs.
- **Landing-page lead capture**: Browser posts to `/api/lift/lead` — no shared secret, gated by origin allowlist + rate limit + honeypot. The prior flow shipped `HL_INBOUND_SECRET` to the client via a hardcoded fallback in `app/lift/page.tsx`; do not reintroduce any `NEXT_PUBLIC_*` lead-capture secret. `/api/integrations/hl-inbound` is now HMAC-only for external callers.
- **Analytics allow-list is authoritative**: `lib/analytics/marketingPaths.ts` is the **only** place that decides which routes fire GA4/LinkedIn/PostHog. Adding a new marketing page means editing that file AND `__tests__/marketing-paths.test.ts`. Do NOT introduce a separate deny-list or per-component path check — it creates two sources of truth that will drift.
- **PostHog detection uses `usePostHog()`, not `window.posthog`**: `posthog-js >= 1.369` does not attach itself to `window` as a side effect of `init()`. Reading `window.posthog` falsely reports "not loaded" even when PostHog is firing. `AnalyticsHealthCard` and any future tracker diagnostics must use the React hook from `posthog-js/react`.
- **`NEXT_PUBLIC_*` env vars are inlined at build time**: adding PostHog/GA4/analytics vars to Vercel after a deploy requires a new build for them to be present in the client bundle. The PHProvider silently no-ops if the token is missing — check Vercel env scope (Production + Preview if needed) after any credential rotation.
- **PostHog `$pageview` is captured manually**: `app/providers.tsx` sets `capture_pageview: false`. `app/PostHogPageView.tsx` fires `posthog.capture('$pageview')` on pathname/searchParams change. Do NOT re-enable `capture_pageview` — it will double-fire with the manual capture, and the automatic version doesn't fire reliably on Next.js App Router client navigations anyway.
- **Defensible Language is language only, never judgment**: `lib/ai/defensibleLanguage.ts` generates rationale text for admit/waitlist/decline — it does NOT pick the recommendation. The forbidden-phrase guardrail (`lib/ai/forbiddenPhrases.ts`) + deterministic safe-template fallback (after 3 rejections) exist specifically so the committee never sees unsafe/diagnostic/predictive language. Do not bypass either.
- **Staleness uses L2, not hash equality**: Stage 2 replaced hash-equality with normalized-L2 distance over the 16-element signal vector (10% threshold). Every persist writes both the hash AND `signal_snapshot_vector` jsonb — drift checks read the vector directly. Do not revert to hash-only comparison; it masks meaningful drift.
- **Committee sessions are single-host**: one active session per cycle (partial unique index on `committee_sessions`). `current_host_id` is mutable (host transfer); `started_by` is immutable for provenance. Other tenant admins observe read-only. Commit triggers CORE handoff + support plan + SIS sync per vote with bounded concurrency of 5 — do not raise concurrency without testing downstream rate limits.
- **Committee polling uses visibility-aware hook**: `lib/hooks/useVisibilityAwarePolling.ts` pauses polling when `document.visibilityState !== 'visible'`. 5s interval. Do not replace with naive `setInterval` — it will hammer the API when tabs are backgrounded.
- **Enrollment Readiness Flags are OBSERVATIONS, not predictions**: per the three-layer enforcement (migration table comment, ship-gate grep check, `docs/enrollment-readiness-flags.md`), all naming and copy must reinforce observed-not-predicted framing. Do not introduce `predict|risk|likely|probability` into Stage 4 code paths. The feature was renamed from "Withdrawal Risk Flags" during reconciliation specifically to hold this line.
- **Flag evaluator audits state-changes only**: `lib/flags/evaluator.ts` writes audit rows only on raise/escalate/resolve/auto_resolve transitions, NOT on daily stable refresh. This keeps `audit_logs` forensically useful over long-lived flags. The daily cron still runs end-to-end — it just doesn't log no-op passes.
- **Flag cron skips unlicensed tenants**: `/api/cron/enrollment-readiness-flags-evaluate` calls `checkFeature(tenant_id, ENROLLMENT_READINESS_FLAGS)` per tenant — skipped tenants show up in `tenants_skipped` in the `evaluator_run` audit payload. Prevents flag rows from being created in tenants whose UI doesn't surface them (e.g. post-downgrade).
- **Cron stagger convention**: crons are staggered by ≥1 hour to avoid compute bursts. committee-orphan-check 09:00 UTC, enrollment-readiness-flags-evaluate 10:00 UTC. See `CRONS.md` before adding new crons.
- **`audit_logs` uses `occurred_at`, not `created_at`**: unlike nearly every other table in the schema, `audit_logs` timestamps with `occurred_at` (set in migration 001). Any probe / ORDER BY / MAX() on audit_logs must use `occurred_at`. Trips up diagnostic queries and SDK calls; confirmed with Postgres error `42703: column "created_at" does not exist`. Fixed once in `/admin/api-test` — don't reintroduce the typo.
- **PT deployment topology**: one git repo (`Inteliflowai/Lift-platform`), **two Vercel projects** both watching `master` — LIFT (lift.inteliflowai.com) and Lift-Platform-Brasil (eduinsights.datanex.ai). Any push to master redeploys both. Locale differences are env-based per project (`LIFT_LOCALE`, `LIFT_BRAND_NAME`, `LIFT_HIDE_PRICING`). When a push breaks one, it breaks both — test accordingly.
- **Local verification before push must include `npm run build`, not just `tsc + vitest`**: Vercel's `next build` runs ESLint with `no-unused-vars` as an **error** (not a warning). `npx tsc --noEmit` catches type errors but not ESLint. A refactor that leaves an unused import passes tsc + vitest locally and then fails BOTH LIFT and Brasil Vercel builds simultaneously.
- **Tenant cascade-delete needed two migrations, not one**: 042 fixed the three direct FKs into `tenants(id)` (task_templates, audit_logs, demo_sessions) but the cascade then 23503'd on grandchildren whose own FKs into `candidates`/`sessions`/`application_cycles` etc. were also NO ACTION. 043 does a dynamic sweep over `pg_constraint` filtered by `confdeltype='a'` AND target table has a `tenant_id` column. Going forward: any new table whose FK target is tenant-owned data must declare `ON DELETE CASCADE` (NOT NULL columns) or `ON DELETE SET NULL` (nullable) — Postgres's NO ACTION default will silently re-break tenant deletion.
- **Risky API routes need defensive try/catch + structured error responses**: `app/api/admin/reset/delete-tenant/route.ts` originally only checked the error from the final `tenants` delete — `admin_reset_log` insert and the post-delete audit_log write threw silently and Next returned a blank 500. Hardened version wraps the whole handler in try/catch, checks `{error}` on every supabase call, and returns `{error, detail, code}` so future failures put the Postgres message in the Network response body. Apply the same pattern to any route that does multi-step writes.
- **Platform admins should never see tenant-scoped banners**: TrialBanner suppresses on `pathname.startsWith("/admin")` (component-level), DemoBanner now suppresses on `primaryRole === "platform_admin"` globally (layout-level). The reasoning is identical to the original /admin suppression: platform admins navigate cross-tenant, so a banner pulled from whichever tenant context happens to load is misleading. Same logic should apply to any future tenant-scoped banner.
- **Storage bucket-public flag is separate from RLS policies**: For `getPublicUrl()` to return a URL that resolves under `/storage/v1/object/public/<bucket>/...`, the bucket row in `storage.buckets` must have `public = true` AND the relevant `storage.objects` RLS SELECT policy must exist. Having only the policy returns `{"error": "Bucket not found"}` from public reads (confusing — it's not actually missing, just not public). Toggle in Supabase dashboard or `UPDATE storage.buckets SET public = true WHERE id = '<bucket>'`.
- **`next/image` requires `*.supabase.co` (single asterisk) in `images.remotePatterns`**: `**.supabase.co` doesn't match in Next 14 — hostname wildcards are single-segment only. Supabase project hostnames are `<projectref>.supabase.co` (one segment), so the single-asterisk form covers both LIFT and EduInsights deployments. Without this entry, `/_next/image` returns 400 INVALID_IMAGE_OPTIMIZE_REQUEST and the browser shows alt text instead of the image.
- **Circular avatars need an `overflow-hidden` wrapper, not `rounded-full` on the Image**: `next/image` with `width`/`height` + `className="rounded-full object-cover"` doesn't clip reliably — non-square source images poke outside the circle. Use the canonical pattern: a fixed-size `relative overflow-hidden rounded-full` wrapper containing `<Image fill ... className="object-cover" />`. Applies in three spots: profile page (96px), TopBar button (32px), TopBar dropdown header (40px).
- **Avatar uploads need the `lift-reports` bucket public + 3 RLS policies on storage.objects**: INSERT for authenticated users where `bucket_id='lift-reports'` and `(storage.foldername(name))[1]='avatars'` and filename starts with `auth.uid()`; UPDATE with the same predicate; SELECT open to anon+authenticated for reads. Bucket and policies are created via Supabase dashboard / SQL — there is no migration that defines them.
- **`tenant_licenses` has `session_limit_override`, NOT `sessions_limit`**: The effective sessions limit shown to school admins is computed from `session_limit_override` (admin override) + the tier's `sessions_per_year` default. The camelCase `sessionsLimit` on `LicenseContextValue` is computed in `app/(dashboard)/layout.tsx` from a session-info helper. A server query `select("sessions_limit")` will fail at runtime with `42703 column does not exist` (tsc won't catch — Supabase JS is untyped). For surfaces under `(dashboard)`, prefer `useLicense().sessionsLimit` from a client component over re-fetching server-side.
- **Migrations on dual-deploy: apply to BOTH Supabase instances before pushing code that references new columns**: A push to `master` triggers both Vercel projects (LIFT + Lift-Platform-Brasil) to redeploy simultaneously. If either Supabase instance lacks the migration, code that references the new column fails with `42703` — and for seeders called from registration (`lib/demo/seedDemoSchool*.ts`, `lib/licensing/stripe.ts` guest-purchase webhook), this means **registration breaks** on whichever side lags. Workflow: commit locally → apply migration to LIFT prod and EduInsights/Brasil → verify each with `SELECT column_name FROM information_schema.columns WHERE table_name = '...'` → then push.
- **Trial banner CTA softens above 14 days**: `components/licensing/TrialBanner.tsx` renders an underline-link "See pricing" when `daysRemaining > 14` (low-emphasis, day-1 trial users don't want to be sold to) and the original "Upgrade Now" button below. Don't reintroduce a single all-caps button across all tiers — the early window matters for skeptic conversion.
- **Trial banner is also tier-aware**: same component reads `useLicense().expectedTier`. Enterprise (Boarding/Therapeutic schools or 400+ applicants per `lib/licensing/expectedTier.ts`) routes to a `mailto:sales@inteliflowai.com` "Schedule a call" CTA — no Stripe self-serve. Professional gets the existing Stripe self-serve path plus a "Need an invoice?" mailto for finance ops that can't process cards. `expected_tier` is written at registration (`app/api/auth/register/route.ts`); pre-mig-045 tenants have NULL → treated as `professional`.
- **Registration auto-logs in**: `app/(public)/register/page.tsx` calls `supabase.auth.signInWithPassword` immediately after the POST returns and pushes to `/school/welcome` directly — no `/login?redirect=` bounce. If sign-in fails (rare, since we just created the user), falls back to the `/login` redirect path so the user is never stranded. Light implementation; true passwordless `signInWithOtp` deferred until password-reset volume justifies the rearchitecture.
- **Registration auto-creates an active cycle**: same route inserts a `{year}-{year+1} Full Year Admissions` cycle with `status='active'` plus the three default grade-band templates, and marks `cycle_created` in `onboarding_steps_completed`. Status MUST stay `'active'` — the candidate-invite route filters cycles on `status='active'` to attach a `cycle_id`. The standalone `/api/school/cycles` POST still creates `status='draft'` cycles for explicit user-initiated cycle creation; they're a different flow.
- **Self-invite flow**: `/api/school/self-invite` (POST, school_admin) creates a candidate flagged `is_demo=true` with the admin's name, default grade 8, and an invite. Returns `{token}`; the welcome-page button navigates the admin straight to `/invite/{token}` — no email sent. The `is_demo=true` flag means the self-invite candidate gets soft-archived alongside seeded demos on the first real invite.
- **OnboardingBanner is quiet for trial users**: `components/onboarding/OnboardingBanner.tsx` reads `useLicense().status`. If `'trialing'`, renders a single one-line "Next: invite a candidate" hint that auto-disappears once `candidate_invited` is in `onboarding_steps_completed` (also dismissible via `lift-trial-invite-hint-dismissed` localStorage). Paid tenants still see the full 5-step rail. Per `feedback_b2b_buyer_nudge_channel` — visible activation rails patronize senior B2B buyers; nurture goes through HL email instead.
- **HL trial nurture**: `/api/cron/trial-nurture` runs daily at 11:00 UTC. Finds trial tenants 3-7 days old that have NOT fired `first_candidate_invited` in `trial_events`, fires `lift-trial-no-invite-day3` (day 3) or `lift-trial-walkthrough-offer-day7` (day 7) HL tags. Idempotent via `tenant_settings.nurture_tags_fired` text[]. Email content lives in HL workflows wired to those tags, NOT in LIFT.
- **Mobile soft-warn**: `components/onboarding/MobileSoftWarn.tsx` renders a one-line dismissible "LIFT works best on desktop or tablet" banner on viewports <768px. Mounted on `/register` and `/school/welcome`. Soft-warn only — never blocks the flow. Dismissal persists in localStorage (`lift-mobile-warn-dismissed`).

## Design Tokens

Primary color is teal (`#14b8a6`), matching the LIFT logo. Customizable per-tenant via white label (`wl_primary_color`). Dark theme: page-bg (#0d1117), surface (#161b22), lift-border (#2d333b), lift-text (#f1f5f9), muted (#94a3b8), sidebar (#0a1419). Signal colors: success (#34d399), warning (#f59e0b), review (#f87171). Fonts: Plus Jakarta Sans (headings), DM Sans (body). Branding: "Powered by Inteliflow".

Brand family: Inteliflow (purple #2b1460), LIFT (teal #14b8a6), Spark (orange #f97316), CORE (indigo #6366f1).

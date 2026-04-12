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
- **Tailwind CSS 3** — Custom design tokens (primary: indigo #6366f1)
- **Nodemailer** — SMTP email delivery (branded HTML templates)
- **Archiver** — ZIP generation for FERPA data exports
- **Lucide React** — Icons
- **Sentry** — Error monitoring and performance tracking (`@sentry/nextjs`)
- **Vitest** — Unit test framework (26 tests covering encryption, features, TRI, pricing)

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
- Checks license status — suspended/cancelled tenants redirected to `/suspended`
- Blocks `/register` and `/pricing` when `LIFT_HIDE_PRICING=true` (Portuguese deployment)

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
2. **Score** (`/api/pipeline/score`) — Claude API call per dimension: reading, writing, reasoning, reflection, persistence, support_seeking
3. **TRI** (`lib/signals/tri.ts`) — Transition Readiness Index: weighted average with confidence adjustments
4. **Narrative** (`/api/pipeline/narrative`) — Generate internal_narrative and family_narrative (fallback text on failure)
5. **Learning Support** (`lib/signals/learningSupport.ts`) — 8 boolean flags. Levels: none / watch / recommend_screening
6. **Briefing** (`/api/pipeline/briefing`) — Evaluator-facing summary
7. **Benchmarks** (`/api/pipeline/benchmarks`) — Cohort percentile placement

Pipeline failures never prevent session completion. Partial completions tracked via `pipeline_partial`, `pipeline_errors` columns. `lib/ai/retry.ts` provides `withRetry()` with exponential backoff for AI API calls.

### Licensing & Feature Gating

`lib/licensing/` implements a 2-tier subscription system (Professional $12,000/yr, Enterprise $18,000/yr) + 30-day trial (all Enterprise features minus white label):

- **`features.ts`** — Trial gets all Enterprise features EXCEPT white label/custom branding, capped at 25 sessions. No Essentials tier — removed in favor of 2-tier model
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

- **`client.ts`** — `upsertHLContact()`, `addHLTags()`, `removeHLTags()`, `moveHLPipelineStage()`
- **`events.ts`** — `syncLicenseEventToHL()` maps license events to HL tags + pipeline stages
- **`/api/integrations/hl-inbound`** — Receives landing page form submissions

`output/lift-hl-snapshot.json` — Complete HL automation snapshot (16 workflows, 18 tags, 11-stage pipeline, 40 emails).

### Registration & Trial Flow

1. School registers at `/register` (or `/register?plan=essentials` for direct purchase)
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
- **Vercel config**: `vercel.json` — 60s timeout for AI routes, 30s for voice

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
Steps auto-complete from API routes. Progress bar, celebration on completion. Fully translated.

### Candidate Session Flow

1. Admin imports candidates → creates `candidates` + `invites` records
2. Invite email sent with token link → `/invite/{token}`
3. Consent collected → `/consent/{token}` (guardian consent if COPPA)
4. Session starts → `/session/{token}` — loads `SessionClient`
5. Tasks served sequentially (8 task types across 3 grade bands)
6. Signals captured: keystroke/backspace counts, focus events, timing, hints, voice usage
7. On completion → pipeline runs → insight_profiles created → evaluator notified if flagged

### Database Migrations

SQL files in `supabase/migrations/` numbered sequentially (001-018). `FULL_MIGRATION_PT.sql` contains all migrations concatenated for new Supabase instances.

### Demo Mode

New trial registrations get 3 demo candidates and task templates auto-seeded. Demo candidates auto-removed when school invites their first real candidate. `scripts/seed-pt-tasks.ts` seeds Portuguese task templates.

### Support Plan Generator

`/api/pipeline/support-plan` — When a candidate is admitted (via final_recommendations), LIFT generates a 90-day onboarding plan via Claude API. Plans include: week 1-2 actions, month 1 priorities, month 2-3 checkpoints, recommended resources (mapped to school's configured `support_resources`), academic accommodations, social integration notes, plan narrative, family welcome note. Interactive checklist with completion tracking. Plans can be finalized and shared with grade deans/learning specialists via email.

### Outcome Tracking

`OutcomesTab` on candidate detail — records academic year, term, GPA, standing, support services, retention. Shows LIFT prediction alongside actual outcomes for comparison. DB: `student_outcomes` table.

### SIS Integrations (Enterprise)

`lib/integrations/` — Adapter pattern for 5 SIS providers: Veracross (OAuth 2.0), Blackbaud (SKY API + auto token refresh), PowerSchool (REST), Ravenna (API key), Webhook (HMAC-SHA256). Generic CSV export/import fallback. Credentials encrypted via AES-256-GCM (`lib/crypto/encrypt.ts`, requires `ENCRYPTION_KEY` env var). Auto-syncs on admit decision. Settings UI at `/school/settings/integrations` with setup instructions per provider.

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

### Email Delivery Logging

`email_logs` table records every email sent via `sendLiftEmail` — recipient, subject, status (sent/failed), error message. Platform admins can query for delivery issues.

### Admin System Audit

`/admin/audit` — Cross-tenant audit log viewer for platform admins. Shows all actions with school name, user, action type, payload. Searchable + filterable by action type.

## Environment

Required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`.

Voice/TTS: `OPENAI_API_KEY`. Email: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`. Pipeline security: `CRON_SECRET`, `INTERNAL_API_SECRET`.

Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PROFESSIONAL`, `STRIPE_PRICE_ID_ENTERPRISE`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

HighLevel: `HL_API_KEY`, `HL_LOCATION_ID`, `HL_PIPELINE_ID`, `HL_STAGE_IDS` (JSON), `HL_INBOUND_SECRET`.

Locale/Branding: `LIFT_LOCALE` (en|pt), `LIFT_BRAND_NAME`, `LIFT_BRAND_TAGLINE`, `LIFT_HIDE_PRICING` (true|false).

Sentry: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

Encryption: `ENCRYPTION_KEY` (32-byte hex for AES-256-GCM, used by SIS credential encryption).

Optional: `LIFT_TEAM_EMAIL`, `LIFT_DEV_MODE`.

## Evaluator Candidate Detail

`app/(dashboard)/evaluator/candidates/[id]/` — The main review page. 7 tabs (some conditional):

- **Overview**: TRI gauge with explanation card, radar chart, dimension scores, briefing card, learning support panel
- **Responses**: Task-by-task display of candidate's written responses, word counts, revision depth. Joined via `task_instances → response_text → response_features` (nested join — do NOT join response_features directly to task_instances)
- **Signals**: Behavioral data with descriptions — avg time per task, reading time, hints, focus loss, session duration. Time-per-task bar chart. Session timeline with color-coded events. Info banner explaining what signals are.
- **Evaluator Review**: AI Recommendation shown FIRST (dimension score bars, placement guidance, confidence). Then evaluator's own notes + tier selection (colored buttons). Override rationale only asked when tier actually differs from AI.
- **Interview Notes**: Rubric scoring + interview synthesis
- **Outcomes** (visible when candidate is completed/reviewed/admitted): Record GPA, standing, support services, retention
- **Support Plan** (visible when candidate is admitted): AI-generated 90-day plan with interactive checklists

The `ai_recommendation_snapshot` on `evaluator_reviews` contains dimension scores + `placement_guidance` text (not a structured tier/rationale format). The Review tab renders both formats.

## Known Patterns & Gotchas

- **All API routes using `getTenantContext()` or `createClient` from supabase/server MUST have `export const dynamic = "force-dynamic"`** — otherwise Vercel build crashes on `cookies()` access during data collection
- **`response_text` has no unique constraint on `task_instance_id`** — use simple `insert`, NOT `upsert` with `onConflict`
- **`response_features` references `response_text_id`**, not `task_instance_id` — Supabase joins must go through `response_text`
- **Pipeline timeout**: orchestrator (`/api/pipeline/run`) set to 120s in `vercel.json`. Still tight for 6 sequential Claude API calls. Requires Vercel Pro plan.
- **TTS (PassageReader)**: NOT shown on `reading_passage` tasks (reading comprehension — candidate must read). IS shown on `scenario` and `quantitative_reasoning`.
- **Hydration errors** (#418/#423): Console-only warnings from `LocaleProvider` wrapping server-rendered content. Don't break functionality.
- **Task templates**: Must have full content (passage text, scenario text). Original seed script had broken templates with empty content for some grade bands. Use `lib/seed-task-templates.ts` or `scripts/seed-existing-tenants.ts` for proper seeding.

## Design Tokens

Primary color is indigo (`#6366f1`), customizable per-tenant via white label (`wl_primary_color`). All custom colors defined in `tailwind.config.ts`: primary, success (#10b981), warning (#f59e0b), review (#f43f5e), sidebar (#1e1b2e), page-bg (#f8f8fa), surface (#ffffff), lift-border (#e5e5e5), lift-text (#1a1a2e), muted (#6b7280). Fonts: Playfair Display (headings), DM Sans (body). Branding: "Powered by Inteliflow".

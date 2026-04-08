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

No test framework is configured.

## Tech Stack

- **Next.js 14** (App Router, React 18, TypeScript strict mode)
- **Supabase** — Auth (dashboard users only), PostgreSQL, RLS for tenant isolation
- **Anthropic Claude** (`claude-opus-4-20250514`) — AI scoring pipeline via `@anthropic-ai/sdk`
- **OpenAI** — Whisper (voice transcription), TTS (passage reader)
- **Tailwind CSS 3** — Custom design tokens (primary: indigo #6366f1)
- **Nodemailer** — SMTP email delivery
- **Lucide React** — Icons

## Architecture

### Route Groups

Two route groups under `/app`:

- **`(candidate)`** — Public assessment UI (`/session/*`, `/invite/*`, `/consent/*`). **No Supabase Auth** — access is via invite tokens validated against the `invites` table using `supabaseAdmin`.
- **`(dashboard)`** — Protected admin/evaluator UI (`/admin/*`, `/school/*`, `/evaluator/*`, `/interviewer/*`). Requires Supabase Auth + role check via middleware.

### Authentication Split

This is critical: candidates never authenticate via Supabase Auth. All candidate-facing routes use `session_token` (the invite token) validated server-side against the `invites` table. Dashboard users authenticate via Supabase Auth, and roles come from `user_tenant_roles`.

### Middleware & RBAC

`middleware.ts` enforces role-based access on dashboard routes:
- `/admin/*` → `platform_admin`
- `/school/*` → `school_admin` or `platform_admin`
- `/evaluator/*` → `evaluator`, `school_admin`, or `platform_admin`
- `/interviewer/*` → `interviewer` or `platform_admin`

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

1. **Extract** (`/api/pipeline/extract`) — Compute response_features from response_text (sentence count, lexical diversity, revision depth, evidence markers)
2. **Score** (`/api/pipeline/score`) — Claude API call per dimension: reading, writing, reasoning, reflection, persistence, support_seeking. Returns score 0-100 + confidence + rationale.
3. **TRI** (`lib/signals/tri.ts`) — Transition Readiness Index: weighted average of dimension scores with confidence and support signal adjustments. Labels: emerging/developing/ready/thriving.
4. **Narrative** (`/api/pipeline/narrative`) — Generate internal_narrative (for admissions staff) and family_narrative
5. **Learning Support** (`lib/signals/learningSupport.ts`) — 8 boolean flags detecting patterns (high revision depth, low reading dwell, short output, etc.). Levels: none / watch / recommend_screening.
6. **Briefing** (`/api/pipeline/briefing`) — Evaluator-facing summary
7. **Benchmarks** (`/api/pipeline/benchmarks`) — Cohort percentile placement

AI prompts live in `lib/ai/prompts/`. Model versions tracked in `ai_versions` table. All pipeline runs logged via `lib/ai/logger.ts` to `ai_runs` table.

### Candidate Session Flow

1. Admin imports candidates → creates `candidates` + `invites` records
2. Invite email sent with token link → `/invite/{token}`
3. Consent collected → `/consent/{token}` (guardian consent if COPPA)
4. Session starts → `/session/{token}` — loads `SessionClient`
5. Tasks served sequentially from `task_instances` (sorted by `sequence_order`)
6. Each task type renders differently in `TaskRenderer` (reading_passage, short_response, extended_writing, reflection, scenario, planning, quantitative_reasoning, pattern_logic)
7. Signals captured throughout: keystroke/backspace counts, focus events, timing, hints, voice usage
8. On completion → pipeline runs → insight_profiles created → evaluator notified if flagged

### Voice Features

- **Voice Response** (`VoiceResponseInput.tsx`) — Candidates speak answers on short_response, extended_writing, reflection tasks. Uses MediaRecorder API → `/api/session/transcribe` → OpenAI Whisper. Audio deleted after transcription by default.
- **Passage Reader** (`PassageReader.tsx`) — TTS playback on reading_passage tasks. Uses `/api/session/tts` → OpenAI TTS (model: tts-1, voice: nova). Includes sentence highlighting, speed control, grade-band-specific UX.
- Both features have independent admin toggles in tenant_settings (`voice_mode_enabled`, `passage_reader_enabled`).

### Grade Band UX

Session UI adapts by grade band (`6-7`, `8`, `9-11`):
- **6-7**: Larger text, encouraging messages, voice defaults to speak mode, 2-min recording limit, transcript read-back, passage reader label "Have this read to you"
- **8**: Baseline styling, voice defaults to type, 5-min recording limit
- **9-11**: Compact UI, minimal labels, subtle passage reader toolbar

### Signal Types

Three signal tables, all fire-and-forget from client via `POST /api/signals`:
- **interaction_signals** — `focus_lost`, `focus_returned`
- **timing_signals** — `response_latency`, `task_dwell_time`, `time_on_text`, `tts_listen_duration_ms`
- **help_events** — `hint_open`, `voice_response_used`, `passage_read_aloud`

### Database Migrations

SQL files in `supabase/migrations/` numbered sequentially (001-010). Applied in order. Key tables: tenants, candidates, sessions, task_instances, response_text, response_features, insight_profiles, learning_support_signals, evaluator_reviews, final_recommendations.

### Offline Support

Candidate sessions support offline via PWA service worker (`/public/sw.js`) and IndexedDB queue (`lib/offline-queue.ts`) that syncs pending submissions on reconnect.

### Demo Mode

Tenants with `is_demo = true` get synthetic candidates generated via `/api/admin/demo/generate`. Demo data profiles are in `lib/demo/` (varied response quality per grade band). Sidebar shows invite links with copy-to-clipboard for live walkthroughs.

## Environment

Required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`. For voice/TTS: `OPENAI_API_KEY`. For email: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`. For pipeline security: `CRON_SECRET`, `INTERNAL_API_SECRET`.

## Design Tokens

Primary color is indigo (`#6366f1`). All custom colors defined in `tailwind.config.ts`: primary, success (#10b981), warning (#f59e0b), review (#f43f5e), sidebar (#1e1b2e), page-bg (#f8f8fa), surface (#ffffff), lift-border (#e5e5e5), lift-text (#1a1a2e), muted (#6b7280). Fonts: Playfair Display (headings), DM Sans (body).

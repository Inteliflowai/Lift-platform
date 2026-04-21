# Scheduled Jobs (Vercel Cron)

This project uses [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) for scheduled background work. Requires a Pro plan (already enabled for this project).

## Pattern

1. Add a route under `app/api/cron/<job-name>/route.ts` that exports a `GET` handler.
2. Declare the schedule in `vercel.json` under `"crons"` with the standard cron expression.
3. Authenticate via the `CRON_SECRET` env var — Vercel automatically includes `Authorization: Bearer <CRON_SECRET>` on cron invocations. Verify it at the top of the handler.
4. Keep cron handlers **idempotent** — Vercel may retry, and an admin may manually invoke the route to test.
5. Every run should write at least one audit row so behavior is reconstructible from `audit_logs`.

## Minimal skeleton

```ts
// app/api/cron/example-job/route.ts
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    const provided = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    if (provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  // ...work...
  return NextResponse.json({ ok: true });
}
```

```json
// vercel.json — add to the crons array
{
  "crons": [
    { "path": "/api/cron/example-job", "schedule": "0 9 * * *" }
  ]
}
```

## Active crons

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/committee-orphan-check` | `0 9 * * *` (daily 09:00 UTC) | Emails committee hosts when a session has been active with staged votes for >14 days. 7-day re-warn cooldown. |

## Testing a cron locally

```bash
curl -H "authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/committee-orphan-check
```

## When to add a new cron

- Scheduled cleanup (stale data, orphaned records)
- Scheduled aggregations (weekly rollups, monthly reports)
- Scheduled notifications (deadline reminders, engagement nudges)

Prefer cron over "check-on-read" patterns for maintenance work — keeps user-request paths fast and keeps the maintenance behavior easy to reason about (one schedule, one handler, one audit trail).

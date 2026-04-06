/**
 * Manually trigger the AI pipeline for a session
 * Usage: npx tsx scripts/run-pipeline.ts [session_id]
 * If no session_id, finds Jamie's completed session.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SECRET = process.env.INTERNAL_API_SECRET!;

async function run() {
  let sessionId = process.argv[2];

  if (!sessionId) {
    // Find Jamie's completed session
    const { createClient } = await import("@supabase/supabase-js");
    const s = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: cand } = await s
      .from("candidates")
      .select("id")
      .eq("first_name", "Jamie")
      .eq("last_name", "Rivera")
      .single();

    if (!cand) { console.log("Jamie not found"); return; }

    const { data: sess } = await s
      .from("sessions")
      .select("id")
      .eq("candidate_id", cand.id)
      .eq("status", "completed")
      .limit(1)
      .single();

    if (!sess) { console.log("No completed session found"); return; }
    sessionId = sess.id;
  }

  console.log(`Running pipeline for session: ${sessionId}`);
  console.log(`Calling ${APP_URL}/api/pipeline/run ...\n`);

  const res = await fetch(`${APP_URL}/api/pipeline/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": SECRET,
    },
    body: JSON.stringify({ session_id: sessionId }),
  });

  const data = await res.json();
  console.log(`Status: ${res.status}`);
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);

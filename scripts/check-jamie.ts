import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data: cands } = await s
    .from("candidates")
    .select("id, first_name, last_name, status")
    .eq("first_name", "Jamie");
  console.log("Candidates named Jamie:", cands);

  for (const c of cands ?? []) {
    const { data: sessions } = await s
      .from("sessions")
      .select("id, status, completion_pct")
      .eq("candidate_id", c.id);
    console.log(`  Sessions for ${c.id}:`, sessions);

    for (const sess of sessions ?? []) {
      const { data: tasks } = await s
        .from("task_instances")
        .select("id, status, task_templates(title, task_type)")
        .eq("session_id", sess.id)
        .order("sequence_order");
      console.log(`    Tasks:`, tasks);
    }

    const { data: invites } = await s
      .from("invites")
      .select("token, status")
      .eq("candidate_id", c.id);
    console.log(`  Invites:`, invites);
  }

  // Check task templates
  const { data: templates } = await s
    .from("task_templates")
    .select("id, title, task_type, grade_band")
    .eq("grade_band", "8")
    .eq("is_active", true);
  console.log("\nGrade 8 task templates:", templates?.length, templates);
}

check().catch(console.error);

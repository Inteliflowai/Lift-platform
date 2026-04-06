import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function createAiRun(params: {
  session_id: string;
  tenant_id: string;
  ai_version_id: string;
  run_type: string;
  inputs: unknown;
}) {
  const inputHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(params.inputs))
    .digest("hex");

  const { data, error } = await supabaseAdmin
    .from("ai_runs")
    .insert({
      session_id: params.session_id,
      tenant_id: params.tenant_id,
      ai_version_id: params.ai_version_id,
      run_type: params.run_type,
      input_hash: inputHash,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeAiRun(
  runId: string,
  rawOutput: string,
  status: "complete" | "failed" = "complete"
) {
  const { error } = await supabaseAdmin
    .from("ai_runs")
    .update({
      raw_output: rawOutput,
      status,
      ran_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) throw error;
}

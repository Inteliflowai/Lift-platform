import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getLatestVersion(dimension: string) {
  const { data } = await supabaseAdmin
    .from("ai_versions")
    .select("*")
    .eq("dimension", dimension)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function createVersion(params: {
  version_tag: string;
  dimension: string;
  model: string;
  prompt_template: string;
  config?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin
    .from("ai_versions")
    .insert({
      version_tag: params.version_tag,
      dimension: params.dimension,
      model: params.model,
      prompt_template: params.prompt_template,
      config: params.config ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

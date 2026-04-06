import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DIMENSIONS = [
  "reading",
  "writing",
  "reasoning",
  "reflection",
  "persistence",
  "support_seeking",
];

async function seed() {
  console.log("Seeding ai_versions...\n");

  for (const dim of DIMENSIONS) {
    const tag = `v1.0.0-${dim}`;
    const { data: existing } = await s
      .from("ai_versions")
      .select("id")
      .eq("version_tag", tag)
      .single();

    if (existing) {
      console.log(`  Skipping ${tag} (exists)`);
      continue;
    }

    const { error } = await s.from("ai_versions").insert({
      version_tag: tag,
      dimension: dim,
      model: "claude-opus-4-20250514",
      prompt_template: `lib/ai/prompts/${dim}.ts`,
      config: { temperature: 0.3, max_tokens: 1024 },
    });

    if (error) console.error(`  Failed ${tag}:`, error.message);
    else console.log(`  Created ${tag}`);
  }

  console.log("\nDone!");
}

seed().catch(console.error);

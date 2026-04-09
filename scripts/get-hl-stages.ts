/**
 * Helper script to get HighLevel pipeline and stage IDs.
 * Usage: npx tsx scripts/get-hl-stages.ts
 *
 * Requires HL_API_KEY in .env.local
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function getStageIds() {
  const apiKey = process.env.HL_API_KEY;
  if (!apiKey) {
    console.error("HL_API_KEY not set in .env.local");
    process.exit(1);
  }

  const res = await fetch("https://rest.gohighlevel.com/v1/pipelines/", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    console.error("Failed to fetch pipelines:", res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const liftPipeline = data.pipelines?.find(
    (p: { name: string }) => p.name.toLowerCase().includes("lift")
  );

  if (!liftPipeline) {
    console.log("Available pipelines:");
    data.pipelines?.forEach((p: { name: string; id: string }) =>
      console.log(`  "${p.name}" → ${p.id}`)
    );
    console.log('\n"LIFT Sales" pipeline not found. Create it in HL first.');
    process.exit(1);
  }

  console.log("Pipeline ID:", liftPipeline.id);
  console.log("\nStage IDs:");

  const stageMap: Record<string, string> = {};
  for (const s of liftPipeline.stages ?? []) {
    console.log(`  "${s.name}": "${s.id}"`);
    stageMap[s.name] = s.id;
  }

  console.log("\n--- Add these to your Vercel env vars ---\n");
  console.log(`HL_PIPELINE_ID=${liftPipeline.id}`);
  console.log(`HL_STAGE_IDS=${JSON.stringify(stageMap)}`);
}

getStageIds().then(() => process.exit());

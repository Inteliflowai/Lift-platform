/**
 * One-time script: seed task templates for existing tenants that have none.
 * Usage: npx tsx scripts/seed-existing-tenants.ts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function buildTemplates(tenantId: string) {
  return [
    { tenant_id: tenantId, grade_band: "8", task_type: "reading_passage", title: "The River City Decision", language: "en", difficulty_level: 1, estimated_minutes: 8, dimension_targets: ["reading","reasoning"], content: { passage: "River City sits at the junction of two waterways that have shaped its identity for over a century. The older residents remember when the textile mills lined the banks, employing nearly half the town. When the mills closed in the 1990s, many families left. Storefronts emptied. The river, once a source of livelihood, became a reminder of what was lost.\n\nThen, five years ago, a group of young entrepreneurs proposed converting the abandoned mill buildings into a mixed-use community space — part maker lab, part co-working hub, part community kitchen. The town council was divided. Some saw it as exactly the fresh start River City needed. Others worried it would attract outsiders, raise property taxes, and push out the families who had stayed through the hard years.\n\nThe project went ahead. Today, the converted mills house 40 small businesses, a weekend farmers market, and a free after-school program for local kids. Property values have risen 22%. But so have rents. Three longtime businesses on Main Street have closed, unable to afford new leases. The debate continues: Is River City being revitalized — or is it being replaced?", prompt: "Based on the passage, explain the main tension in River City. What evidence from the text supports both sides of the debate?", hints: ["Think about what different groups of people in River City might want.", "Look for specific numbers or facts in the passage that support each viewpoint.", "Consider whether revitalization and replacement could both be true at the same time."] }, is_active: true },
    { tenant_id: tenantId, grade_band: "8", task_type: "short_response", title: "A Different Perspective", language: "en", difficulty_level: 1, estimated_minutes: 5, dimension_targets: ["reasoning","reflection"], content: { prompt: "Think of a time when you changed your mind about something after hearing a different point of view. What happened, and what made you reconsider?", hints: ["It can be something small — like changing your opinion about a movie, a food, or a school rule."] }, is_active: true },
    { tenant_id: tenantId, grade_band: "8", task_type: "extended_writing", title: "The Ideal School", language: "en", difficulty_level: 2, estimated_minutes: 10, dimension_targets: ["writing","reasoning"], content: { prompt: "If you could design the perfect school, what would it look like?", hints: ["You might start by thinking about what you enjoy most — and least — about school now."] }, is_active: true },
    { tenant_id: tenantId, grade_band: "8", task_type: "reflection", title: "How You Learn Best", language: "en", difficulty_level: 1, estimated_minutes: 5, dimension_targets: ["reflection","persistence"], content: { prompt: "When you're trying to understand something difficult, what do you usually do?" }, is_active: true },
    { tenant_id: tenantId, grade_band: "8", task_type: "scenario", title: "The Group Project", language: "en", difficulty_level: 2, estimated_minutes: 7, dimension_targets: ["reasoning","support_seeking"], content: { scenario: "You're working on a group project with three classmates. The project is due in one week. One group member has done almost no work. Another disagrees with the direction. The third wants to divide everything up and work separately.", prompts: ["What would you do in this situation?", "What's the most important thing to get right when working with a group under pressure?"] }, is_active: true },
    { tenant_id: tenantId, grade_band: "8", task_type: "quantitative_reasoning", title: "The Fundraiser", language: "en", difficulty_level: 2, estimated_minutes: 6, dimension_targets: ["reasoning","persistence"], content: { problem: "The 8th grade class is selling candles. Each costs $12 and sells for $20. Booth rental: $150. Sold 35 candles.", prompt: "How much profit so far?", choices: ["$130","$280","$130 loss","$550"] }, is_active: true },
    { tenant_id: tenantId, grade_band: "8", task_type: "pattern_logic", title: "Number Pattern", language: "en", difficulty_level: 1, estimated_minutes: 4, dimension_targets: ["reasoning"], content: { pattern: "2, 6, 18, 54, ___, ___", prompt: "What are the next two numbers?" }, is_active: true },
    { tenant_id: tenantId, grade_band: "6-7", task_type: "reading_passage", title: "The New Playground", language: "en", difficulty_level: 1, estimated_minutes: 7, dimension_targets: ["reading","reasoning"], content: { passage: "Last spring, the town of Maple Grove decided to rebuild the old playground. The equipment was rusty. The town held a meeting.\n\nSome parents wanted a simple design — swings, a slide, monkey bars. Others wanted a climbing wall, splash pad, and nature trail.\n\nThe town had $50,000. Simple: $30,000. Big: $75,000. They chose a middle option for $48,000 with the climbing wall and new swings but no splash pad.", prompt: "Why did the town choose the middle option? Was it a good decision?" }, is_active: true },
    { tenant_id: tenantId, grade_band: "6-7", task_type: "short_response", title: "A Surprising Moment", language: "en", difficulty_level: 1, estimated_minutes: 5, dimension_targets: ["writing","reflection"], content: { prompt: "Tell us about a time something surprised you. What happened and why was it surprising?" }, is_active: true },
    { tenant_id: tenantId, grade_band: "6-7", task_type: "extended_writing", title: "My Perfect Day", language: "en", difficulty_level: 1, estimated_minutes: 8, dimension_targets: ["writing","reasoning"], content: { prompt: "Describe your perfect day from morning to night. Where are you? Who is with you? What do you do?" }, is_active: true },
    { tenant_id: tenantId, grade_band: "6-7", task_type: "reflection", title: "When Things Are Hard", language: "en", difficulty_level: 1, estimated_minutes: 5, dimension_targets: ["reflection","persistence"], content: { prompt: "Think about a time you had to do something that felt really hard. What made it hard? What did you do to get through it?" }, is_active: true },
    { tenant_id: tenantId, grade_band: "9-11", task_type: "reading_passage", title: "The Automation Question", language: "en", difficulty_level: 2, estimated_minutes: 10, dimension_targets: ["reading","reasoning"], content: { passage: "In 2023, a logistics company replaced 60% of warehouse staff with automation. Productivity up 35%. Of 200 displaced workers, 45 enrolled in retraining, 30 completed it at 15% higher wages. The other 155 got 3 months severance. Six months later: 40% found comparable work, 25% took lower-paying jobs, 35% remained unemployed. Stock price rose 18%.", prompt: "Evaluate the claim that automation was a net positive. Consider multiple stakeholders." }, is_active: true },
    { tenant_id: tenantId, grade_band: "9-11", task_type: "extended_writing", title: "A System You Would Change", language: "en", difficulty_level: 2, estimated_minutes: 12, dimension_targets: ["writing","reasoning","reflection"], content: { prompt: "Identify a system that isn't working well. Describe the problem, explain why it persists, and propose a realistic change." }, is_active: true },
    { tenant_id: tenantId, grade_band: "9-11", task_type: "reflection", title: "Intellectual Growth", language: "en", difficulty_level: 2, estimated_minutes: 6, dimension_targets: ["reflection","persistence"], content: { prompt: "Describe a belief you held that changed significantly. What caused the shift?" }, is_active: true },
    { tenant_id: tenantId, grade_band: "9-11", task_type: "scenario", title: "The Ethics Committee", language: "en", difficulty_level: 3, estimated_minutes: 8, dimension_targets: ["reasoning","support_seeking"], content: { scenario: "A student used AI to write part of their college essay. 40% overlap with AI output. Honor code says no submitting work that isn't your own but doesn't mention AI.", prompts: ["What recommendation would you make?", "How should the honor code be updated?"] }, is_active: true },
  ];
}

async function run() {
  // Get all tenants that have zero task templates
  const { data: tenants } = await supabase.from("tenants").select("id, name");

  for (const t of tenants ?? []) {
    const { count } = await supabase
      .from("task_templates")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", t.id);

    if (count && count > 0) {
      console.log(`${t.name}: already has ${count} templates, skipping`);
      continue;
    }

    const templates = buildTemplates(t.id);
    const { error } = await supabase.from("task_templates").insert(templates);
    if (error) {
      console.error(`${t.name}: ERROR — ${error.message}`);
    } else {
      console.log(`${t.name}: seeded ${templates.length} templates`);
    }
  }
}

run().then(() => process.exit());

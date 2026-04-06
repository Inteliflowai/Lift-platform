/**
 * Seed task templates for all grade bands
 * Usage: npx tsx scripts/seed-tasks.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedTasks() {
  console.log("Seeding task templates...\n");

  // Get hillside tenant
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", "hillside")
    .single();

  if (!tenant) throw new Error("Hillside tenant not found. Run seed.ts first.");

  const templates = [
    // === GRADE BAND 8 (standard) ===
    {
      tenant_id: tenant.id,
      grade_band: "8",
      task_type: "reading_passage",
      title: "The River City Decision",
      language: "en",
      difficulty_level: 1,
      estimated_minutes: 8,
      dimension_targets: ["reading", "reasoning"],
      content: {
        passage:
          "River City sits at the junction of two waterways that have shaped its identity for over a century. The older residents remember when the textile mills lined the banks, employing nearly half the town. When the mills closed in the 1990s, many families left. Storefronts emptied. The river, once a source of livelihood, became a reminder of what was lost.\n\nThen, five years ago, a group of young entrepreneurs proposed converting the abandoned mill buildings into a mixed-use community space — part maker lab, part co-working hub, part community kitchen. The town council was divided. Some saw it as exactly the fresh start River City needed. Others worried it would attract outsiders, raise property taxes, and push out the families who had stayed through the hard years.\n\nThe project went ahead. Today, the converted mills house 40 small businesses, a weekend farmers market, and a free after-school program for local kids. Property values have risen 22%. But so have rents. Three longtime businesses on Main Street have closed, unable to afford new leases. The debate continues: Is River City being revitalized — or is it being replaced?",
        prompt:
          "Based on the passage, explain the main tension in River City. What evidence from the text supports both sides of the debate?",
        hints: [
          "Think about what different groups of people in River City might want.",
          "Look for specific numbers or facts in the passage that support each viewpoint.",
          "Consider whether revitalization and replacement could both be true at the same time.",
        ],
      },
      is_active: true,
    },
    {
      tenant_id: tenant.id,
      grade_band: "8",
      task_type: "short_response",
      title: "A Different Perspective",
      language: "en",
      difficulty_level: 1,
      estimated_minutes: 5,
      dimension_targets: ["reasoning", "reflection"],
      content: {
        prompt:
          "Think of a time when you changed your mind about something after hearing a different point of view. What happened, and what made you reconsider?",
        hints: [
          "It can be something small — like changing your opinion about a movie, a food, or a school rule.",
        ],
      },
      is_active: true,
    },
    {
      tenant_id: tenant.id,
      grade_band: "8",
      task_type: "extended_writing",
      title: "The Ideal School",
      language: "en",
      difficulty_level: 2,
      estimated_minutes: 10,
      dimension_targets: ["writing", "reasoning"],
      content: {
        prompt:
          "If you could design the perfect school, what would it look like? Think about the schedule, the subjects, how learning happens, and how students and teachers interact. Write a detailed description.",
        hints: [
          "You might start by thinking about what you enjoy most — and least — about school now.",
          "Consider how different students learn best. Does your ideal school work for everyone?",
          "Think about what the building itself looks like, not just the classes.",
        ],
      },
      is_active: true,
    },
    {
      tenant_id: tenant.id,
      grade_band: "8",
      task_type: "reflection",
      title: "How You Learn Best",
      language: "en",
      difficulty_level: 1,
      estimated_minutes: 5,
      dimension_targets: ["reflection", "persistence"],
      content: {
        prompt:
          "When you're trying to understand something difficult, what do you usually do? Describe your approach — do you re-read, ask questions, try examples, take a break, or something else?",
      },
      is_active: true,
    },
    {
      tenant_id: tenant.id,
      grade_band: "8",
      task_type: "scenario",
      title: "The Group Project",
      language: "en",
      difficulty_level: 2,
      estimated_minutes: 7,
      dimension_targets: ["reasoning", "support_seeking"],
      content: {
        scenario:
          "You're working on a group project with three classmates. The project is due in one week. One group member has done almost no work and isn't responding to messages. Another member disagrees with the direction the group chose and wants to start over. The third member is stressed and wants to just divide everything up and work separately.",
        prompts: [
          "What would you do in this situation? Walk through your thinking step by step.",
          "What's the most important thing to get right when working with a group under pressure?",
        ],
        hints: [
          "There's no single right answer. Think about what approach would actually work, not just what sounds good.",
        ],
      },
      is_active: true,
    },
    // === QUANTITATIVE REASONING (Grade 8) ===
    {
      tenant_id: tenant.id,
      grade_band: "8",
      task_type: "quantitative_reasoning",
      title: "The Fundraiser",
      language: "en",
      difficulty_level: 2,
      estimated_minutes: 6,
      dimension_targets: ["reasoning", "persistence"],
      content: {
        problem:
          "The 8th grade class is selling candles to raise money for a field trip. Each candle costs $12 to buy from the supplier and is sold for $20. The class also paid a one-time booth rental fee of $150.\n\nThey've sold 35 candles so far.",
        prompt: "How much profit has the class made so far? Select your answer, then show your work below.",
        choices: ["$130", "$280", "$130 loss", "$550"],
        hints: [
          "Profit = Revenue - Total Costs. Remember to include both the candle costs and the booth fee.",
          "Revenue = 35 × $20. Costs = (35 × $12) + $150.",
        ],
      },
      is_active: true,
    },
    {
      tenant_id: tenant.id,
      grade_band: "8",
      task_type: "quantitative_reasoning",
      title: "The Schedule Problem",
      language: "en",
      difficulty_level: 2,
      estimated_minutes: 7,
      dimension_targets: ["reasoning", "reflection"],
      content: {
        problem:
          "Maya has 4 classes to schedule on Monday: Math, English, Science, and Art.\n\nConstraints:\n• Math must come before Science\n• Art cannot be first or last\n• English must be either first or last",
        prompt: "How many valid schedules can Maya make? Select your answer and explain your reasoning.",
        choices: ["2", "3", "4", "6"],
        hints: [
          "Start by placing English — it can only go in two spots.",
          "Try listing out the possibilities. There are fewer than you think.",
        ],
      },
      is_active: true,
    },

    // === PATTERN LOGIC (Grade 8) ===
    {
      tenant_id: tenant.id,
      grade_band: "8",
      task_type: "pattern_logic",
      title: "Number Pattern",
      language: "en",
      difficulty_level: 1,
      estimated_minutes: 4,
      dimension_targets: ["reasoning"],
      content: {
        pattern: "2,  6,  18,  54,  ___,  ___",
        prompt: "What are the next two numbers in this sequence?",
        hints: [
          "Look at the relationship between each number and the one before it.",
        ],
      },
      is_active: true,
    },
    {
      tenant_id: tenant.id,
      grade_band: "8",
      task_type: "pattern_logic",
      title: "Shape Logic",
      language: "en",
      difficulty_level: 2,
      estimated_minutes: 5,
      dimension_targets: ["reasoning", "reflection"],
      content: {
        pattern: "△ ○ □ △ △ ○ □ □ △ △ △ ○ ___ ___ ___",
        prompt: "What are the next three shapes in this pattern?",
        hints: [
          "Count how many triangles appear before each circle. Is that number changing?",
          "The squares also follow a pattern — how many squares appear after each circle?",
        ],
      },
      is_active: true,
    },
  ];

  for (const t of templates) {
    // Check if already exists
    const { data: existing } = await supabase
      .from("task_templates")
      .select("id")
      .eq("tenant_id", t.tenant_id)
      .eq("title", t.title)
      .eq("grade_band", t.grade_band)
      .single();

    if (existing) {
      console.log(`  Skipping "${t.title}" (already exists)`);
      continue;
    }

    const { error } = await supabase.from("task_templates").insert(t);
    if (error) {
      console.error(`  Failed: ${t.title}`, error.message);
    } else {
      console.log(`  Created: ${t.title} (${t.task_type}, grade ${t.grade_band})`);
    }
  }

  console.log("\nTask template seed complete!");
}

seedTasks().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

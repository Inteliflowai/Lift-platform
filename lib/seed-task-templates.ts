import { supabaseAdmin } from "@/lib/supabase/admin";

/** Seed standard task templates for a tenant. Skips if templates already exist. */
export async function seedTaskTemplatesForTenant(tenantId: string) {
  // Check if this tenant already has templates
  const { count } = await supabaseAdmin
    .from("task_templates")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (count && count > 0) return; // already seeded

  const templates = buildTemplates(tenantId);

  const { error } = await supabaseAdmin
    .from("task_templates")
    .insert(templates);

  if (error) {
    console.error("Failed to seed task templates:", error.message);
  }
}

function buildTemplates(tenantId: string) {
  return [
    // === GRADE BAND 8 ===
    {
      tenant_id: tenantId,
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
      tenant_id: tenantId,
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
      tenant_id: tenantId,
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
      tenant_id: tenantId,
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
      tenant_id: tenantId,
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
    {
      tenant_id: tenantId,
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
        prompt:
          "How much profit has the class made so far? Select your answer, then show your work below.",
        choices: ["$130", "$280", "$130 loss", "$550"],
        hints: [
          "Profit = Revenue - Total Costs. Remember to include both the candle costs and the booth fee.",
          "Revenue = 35 × $20. Costs = (35 × $12) + $150.",
        ],
      },
      is_active: true,
    },
    {
      tenant_id: tenantId,
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
    // === GRADE BAND 6-7 ===
    {
      tenant_id: tenantId,
      grade_band: "6-7",
      task_type: "reading_passage",
      title: "The New Playground",
      language: "en",
      difficulty_level: 1,
      estimated_minutes: 7,
      dimension_targets: ["reading", "reasoning"],
      content: {
        passage:
          "Last spring, the town of Maple Grove decided to rebuild the old playground near the elementary school. The equipment was rusty and some swings were broken. The town held a meeting to decide what the new playground should look like.\n\nSome parents wanted a simple design with swings, a slide, and monkey bars — like the old one. They said kids just need fresh air and room to run. Other parents wanted something bigger with a climbing wall, a splash pad, and a nature trail. They argued that kids today need more stimulation to put down their screens.\n\nThe town had $50,000 to spend. The simple design cost $30,000 and the bigger design cost $75,000. In the end, they chose a middle option for $48,000 that included the climbing wall and new swings but not the splash pad.",
        prompt:
          "Why did the town choose the middle option? Use details from the passage to explain whether you think it was a good decision.",
        hints: [
          "Think about what each group of parents wanted.",
          "Look at the budget numbers to understand the choice.",
        ],
      },
      is_active: true,
    },
    {
      tenant_id: tenantId,
      grade_band: "6-7",
      task_type: "short_response",
      title: "A Surprising Moment",
      language: "en",
      difficulty_level: 1,
      estimated_minutes: 5,
      dimension_targets: ["writing", "reflection"],
      content: {
        prompt:
          "Tell us about a time something surprised you — maybe something you learned, saw, or experienced that you didn't expect. What happened and why was it surprising?",
        hints: [
          "It doesn't have to be a big event. Small surprises count too!",
        ],
      },
      is_active: true,
    },
    {
      tenant_id: tenantId,
      grade_band: "6-7",
      task_type: "extended_writing",
      title: "My Perfect Day",
      language: "en",
      difficulty_level: 1,
      estimated_minutes: 8,
      dimension_targets: ["writing", "reasoning"],
      content: {
        prompt:
          "Describe your perfect day from morning to night. Where are you? Who is with you? What do you do? Be as detailed as you can — help us picture it!",
        hints: [
          "Use your five senses — what do you see, hear, smell, taste, and feel?",
          "It can be realistic or imaginary.",
        ],
      },
      is_active: true,
    },
    {
      tenant_id: tenantId,
      grade_band: "6-7",
      task_type: "reflection",
      title: "When Things Are Hard",
      language: "en",
      difficulty_level: 1,
      estimated_minutes: 5,
      dimension_targets: ["reflection", "persistence"],
      content: {
        prompt:
          "Think about a time you had to do something that felt really hard. What made it hard? What did you do to get through it?",
      },
      is_active: true,
    },
    // === GRADE BAND 9-11 ===
    {
      tenant_id: tenantId,
      grade_band: "9-11",
      task_type: "reading_passage",
      title: "The Automation Question",
      language: "en",
      difficulty_level: 2,
      estimated_minutes: 10,
      dimension_targets: ["reading", "reasoning"],
      content: {
        passage:
          "In 2023, a mid-sized logistics company in Ohio replaced 60% of its warehouse sorting staff with automated systems. Productivity increased 35% and error rates dropped to near zero. The company reinvested savings into higher wages for remaining workers and a retraining program.\n\nOf the 200 workers displaced, 45 enrolled in the retraining program. Of those, 30 completed it and were placed in new roles — mostly in system maintenance and quality oversight — at wages 15% higher than their previous positions. The remaining 155 workers received severance packages averaging 3 months' pay.\n\nA follow-up study six months later found that 40% of the displaced workers had found comparable employment elsewhere, 25% had taken lower-paying jobs, and 35% remained unemployed. The company's stock price rose 18% in the same period.\n\nCritics argue this case study is often cited selectively — the 30 retrained workers are highlighted while the 155 others are footnoted. Supporters counter that the alternative was the company closing entirely due to competitive pressure from fully automated rivals.",
        prompt:
          "Evaluate the claim that automation in this case was a net positive. Consider the evidence for multiple stakeholders and identify what information would strengthen or weaken the argument.",
        hints: [
          "Consider workers, the company, shareholders, and the broader community as separate stakeholders.",
          "What data is missing from this account?",
        ],
      },
      is_active: true,
    },
    {
      tenant_id: tenantId,
      grade_band: "9-11",
      task_type: "extended_writing",
      title: "A System You Would Change",
      language: "en",
      difficulty_level: 2,
      estimated_minutes: 12,
      dimension_targets: ["writing", "reasoning", "reflection"],
      content: {
        prompt:
          "Identify a system, process, or institution that you believe is not working as well as it could (this could be at your school, in your community, or in society). Describe the problem clearly, explain why it persists, and propose a realistic change. Consider potential objections to your proposal.",
        hints: [
          "Be specific — a focused critique is stronger than a broad one.",
          "The best proposals acknowledge trade-offs.",
        ],
      },
      is_active: true,
    },
    {
      tenant_id: tenantId,
      grade_band: "9-11",
      task_type: "reflection",
      title: "Intellectual Growth",
      language: "en",
      difficulty_level: 2,
      estimated_minutes: 6,
      dimension_targets: ["reflection", "persistence"],
      content: {
        prompt:
          "Describe a belief or assumption you held that changed significantly over time. What caused the shift? How do you think about that topic differently now?",
      },
      is_active: true,
    },
    {
      tenant_id: tenantId,
      grade_band: "9-11",
      task_type: "scenario",
      title: "The Ethics Committee",
      language: "en",
      difficulty_level: 3,
      estimated_minutes: 8,
      dimension_targets: ["reasoning", "support_seeking"],
      content: {
        scenario:
          "You serve on a student ethics committee. A fellow student has been caught using an AI tool to write a significant portion of their college application essay. The student argues that they used AI as a starting point and edited it substantially. The original AI-generated text and the final submission show about 40% overlap. The school's honor code prohibits 'submitting work that is not your own' but does not specifically mention AI tools.",
        prompts: [
          "What recommendation would you make to the committee, and why?",
          "How should the school update its honor code to address this kind of situation?",
        ],
      },
      is_active: true,
    },
  ];
}

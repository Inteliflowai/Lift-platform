import { supabaseAdmin } from "@/lib/supabase/admin";
import { getLocale } from "@/lib/i18n/config";
import { ensureDemoCandidatesPt } from "./seedDemoSchoolPt";

const DEMO_SLUG = "lift-demo";

// ── 3 synthetic candidates at different readiness levels ──

const DEMO_CANDIDATES = [
  {
    first_name: "Jamie",
    last_name: "Rivera",
    grade_band: "8" as const,
    grade_applying_to: "8",
    tri_score: 74,
    tri_label: "ready",
    tri_confidence: "high",
    reading: 81, writing: 68, reasoning: 74, math: 72, reflection: 62, persistence: 78, support_seeking: 71,
    overall_confidence: 82,
    support_level: "none" as const,
    enriched_signals: [] as { id: string; label: string; severity: string; category: string; description: string; recommendation: string; evidenceSummary: string }[],
    tasks: [
      { type: "reading_passage", title: "The River City Decision", response: "The article presents a difficult choice between building a new community center and preserving the historic riverfront. I think the city council should consider a compromise that maintains the natural beauty while still providing community resources. The author mentions that 72% of residents want more gathering spaces, but the riverfront provides flood protection and habitat for wildlife. A better solution might be to renovate the abandoned warehouse on Third Street, which would cost less and preserve the riverfront. The strongest argument in the article is about environmental impact — once the riverfront is developed, it cannot be restored.", wordCount: 98, timeMs: 420000, revisionDepth: 2 },
      { type: "extended_writing", title: "The Ideal School", response: "My ideal school would focus on real-world problem solving rather than memorizing facts. Every week, students would work on a project that connects to their community — like designing a solution for the school's food waste problem or creating a budget for a local nonprofit.\n\nThe building itself would have flexible spaces instead of traditional classrooms. Some areas would be quiet for reading and reflection, while others would encourage collaboration and discussion. There would be a maker space with tools and technology, and outdoor learning areas.\n\nTeachers would act more like coaches than lecturers. They would guide students through challenges rather than just giving answers. Assessment would be based on portfolios and presentations, not just tests.\n\nThe most important thing would be that every student feels they belong. My ideal school would celebrate different ways of thinking and learning, because the world needs all kinds of problem solvers.", wordCount: 152, timeMs: 540000, revisionDepth: 4 },
      { type: "reflection", title: "How You Learn Best", response: "I learn best when I can connect new ideas to things I already understand. When we studied the water cycle in science, I didn't really get it until my teacher compared it to the way my mom makes soup — the steam rising is like evaporation, and the drops on the lid are like condensation. After that, I could explain it to anyone.\n\nI also need time to think before I answer questions. Sometimes in class, the teacher calls on people right away and I haven't finished processing yet. When I have time to write my thoughts first, my answers are much better.", wordCount: 108, timeMs: 360000, revisionDepth: 1 },
      { type: "scenario", title: "The Group Project", response: "If my group member wasn't contributing, I would first talk to them privately to understand what's going on. Maybe they're confused about the assignment or dealing with something at home. I'd ask them which part of the project interests them most and offer to help them get started. If they still aren't participating after our conversation, I would talk to the teacher — not to get them in trouble, but to get advice on how to make the group work better. It's important to try to solve problems yourself first before involving an adult.", wordCount: 96, timeMs: 300000, revisionDepth: 2 },
    ],
    briefing: {
      key_observations: [
        "Jamie demonstrates strong reading comprehension, identifying key arguments and synthesizing multiple perspectives in the River City passage.",
        "Written responses show thoughtful structure but moderate revision — Jamie's initial drafts are solid, suggesting confident thinking.",
        "The reflection task reveals metacognitive awareness: Jamie can articulate how they learn and what conditions help them succeed.",
        "Scenario response shows emotional intelligence and a preference for direct communication before escalation.",
      ],
      interview_questions: [
        { question: "Tell me about a time you had to make a decision where there was no clear right answer.", rationale: "Jamie's River City response shows comfort with ambiguity — explore this further.", dimension: "reasoning" },
        { question: "How do you usually prepare for a challenging assignment or test?", rationale: "Jamie's reflection mentioned needing processing time — understand their study strategies.", dimension: "reflection" },
        { question: "Describe a group project that went well and one that didn't. What made the difference?", rationale: "Scenario response suggests strong interpersonal skills — verify with real examples.", dimension: "support_seeking" },
      ],
      areas_to_explore: ["Written expression could be more developed — explore whether Jamie writes more in low-pressure settings", "Reflection score is the lowest dimension — may benefit from structured journaling"],
      strengths_to_confirm: ["Reading comprehension appears strong", "Problem-solving approach is mature for grade level"],
      confidence_explanation: "High confidence in this profile. Jamie's responses are internally consistent and the behavioral signals align with the dimension scores.",
    },
  },
  {
    first_name: "Alex",
    last_name: "Chen",
    grade_band: "9-11" as const,
    grade_applying_to: "9",
    tri_score: 61,
    tri_label: "ready",
    tri_confidence: "moderate",
    reading: 58, writing: 55, reasoning: 69, math: 63, reflection: 48, persistence: 52, support_seeking: 44,
    overall_confidence: 64,
    support_level: "watch" as const,
    enriched_signals: [
      { id: "slow_reading_pace", label: "Extended Reading Time", severity: "notable", category: "reading", description: "Spent significantly more time than expected on reading passages across multiple tasks.", recommendation: "Consider whether extended time on assessments might be appropriate.", evidenceSummary: "Observed on 3 of 4 reading passages." },
      { id: "high_writing_deletion", label: "High Written Expression Revision", severity: "advisory", category: "writing", description: "Deleted and rewrote a significant portion of written responses.", recommendation: "Written expression support may benefit this student.", evidenceSummary: "Observed across 2 writing tasks." },
    ],
    tasks: [
      { type: "reading_passage", title: "The Automation Question", response: "The article talks about how AI and automation are changing jobs. Some people think it will be bad because workers will lose their jobs, and other people think new jobs will be created. I think both sides have good points. The article says that 47% of jobs could be automated, which is a lot of people. But it also says that every industrial revolution created more jobs than it destroyed. I'm not sure which side is right but I think the government should help workers learn new skills.", wordCount: 82, timeMs: 660000, revisionDepth: 5 },
      { type: "extended_writing", title: "A System You Would Change", response: "If I could change one system, I would change how schools grade students. Right now, grades are mostly based on tests and homework, which doesn't show everything a student can do. Some people are bad at tests but really smart.\n\nI think schools should use more projects and presentations. When I did a science fair project last year, I worked harder on it than any test because I actually cared about the topic. My grade on it was better than my test grades too.\n\nAlso, grades should show improvement not just final scores. If someone starts the year with a D and ends with a B, that's amazing but their average might still be low.", wordCount: 118, timeMs: 720000, revisionDepth: 7 },
      { type: "reflection", title: "Intellectual Growth", response: "I used to think that being smart meant knowing a lot of facts and getting good grades. But now I think being smart is more about how you deal with things you don't understand yet. My math teacher last year showed me that making mistakes is part of learning and now I'm less afraid to try hard problems even if I get them wrong at first.", wordCount: 63, timeMs: 480000, revisionDepth: 3 },
      { type: "scenario", title: "The Ethics Committee", response: "If a student used AI to help write their essay, I think it depends on how they used it. If they used it to generate the whole essay and just put their name on it, that's clearly cheating. But if they used it to brainstorm ideas or check their grammar, I think that's more like using a tool. The hard part is figuring out where to draw the line. I would ask the student to explain their essay to me — if they can explain their ideas and reasoning, they probably did most of the thinking themselves even if they got some help.", wordCount: 101, timeMs: 390000, revisionDepth: 4 },
    ],
    briefing: {
      key_observations: [
        "Alex shows a significant gap between reasoning ability (strongest dimension) and written expression. Ideas are often stronger than the writing that conveys them.",
        "Reading passages required substantially more time than expected, and Alex re-read sections multiple times. This pattern appeared consistently across tasks.",
        "High revision depth in writing tasks — Alex frequently deleted and rewrote sentences, suggesting difficulty with first-draft expression rather than lack of ideas.",
        "Support-seeking score is the lowest dimension. Alex did not use available hints on any task, even when spending extended time. This may indicate reluctance to ask for help.",
      ],
      interview_questions: [
        { question: "When you're reading something difficult, what strategies do you use to understand it?", rationale: "Reading pace signals suggest Alex may benefit from explicit comprehension strategies.", dimension: "reading" },
        { question: "Tell me about your writing process. How do you get from an idea to a finished piece?", rationale: "High revision depth suggests a non-linear writing process — understanding it will help with support planning.", dimension: "writing" },
        { question: "When you're stuck on a problem in class, what do you usually do?", rationale: "Low support-seeking score needs investigation — is this independence or avoidance?", dimension: "support_seeking" },
      ],
      areas_to_explore: ["Reading processing speed — may benefit from extended time accommodations", "Writing support — the gap between ideas and expression warrants attention", "Help-seeking behavior — determine if this is strength (independence) or concern (avoidance)"],
      strengths_to_confirm: ["Strong reasoning and ethical thinking", "Growth mindset evident in reflection response", "Genuine engagement with complex topics"],
      confidence_explanation: "Moderate confidence. The reading pace signals are consistent but could reflect deep engagement rather than difficulty. The interview should clarify.",
    },
  },
  {
    first_name: "Sofia",
    last_name: "Okafor",
    grade_band: "6-7" as const,
    grade_applying_to: "7",
    tri_score: 88,
    tri_label: "thriving",
    tri_confidence: "high",
    reading: 91, writing: 84, reasoning: 87, math: 85, reflection: 82, persistence: 93, support_seeking: 88,
    overall_confidence: 91,
    support_level: "none" as const,
    enriched_signals: [],
    tasks: [
      { type: "reading_passage", title: "The New Playground", response: "The school board has $50,000 and needs to decide between a new playground and upgrading the library computers. I think they should upgrade the computers because more students use the library every day than use the playground. The article says 340 students use the library weekly but only about 120 use the playground regularly. Also, the computers are 8 years old and can't run the programs teachers need. However, the playground is important for younger students who need physical activity. Maybe they could do a fundraiser for one project and use the budget for the other.", wordCount: 102, timeMs: 300000, revisionDepth: 2 },
      { type: "extended_writing", title: "My Perfect Day", response: "My perfect day would start early, before the sun comes up. I'd ride my bike to the lake near our house and watch the mist lift off the water. There's something about being outside when the world is still quiet that makes me feel like anything is possible.\n\nAfter breakfast with my family — my mom makes the best plantain pancakes — I'd spend the morning at my art table. I'm working on a graphic novel about a girl who discovers she can talk to trees. The trees tell her stories about what the neighborhood used to look like hundreds of years ago.\n\nIn the afternoon, I'd go to my friend Amara's house. We're building a robot for the science fair that can sort recycling. We've been working on the code for weeks and we're so close to getting it right. Amara handles the wiring and I do the programming.\n\nMy perfect day would end with my whole family watching a movie together, probably something funny, and falling asleep on the couch knowing tomorrow will be good too.", wordCount: 176, timeMs: 480000, revisionDepth: 3 },
      { type: "reflection", title: "When Things Are Hard", response: "Last year I tried out for the school play and didn't get a part. I was really sad because I had practiced my audition for two weeks. At first I wanted to quit drama completely, but my dad said sometimes the things we're most disappointed about teach us the most.\n\nSo I asked the director if I could help with set design instead. I ended up painting the whole forest backdrop and I discovered I'm actually really good at creating things visually. Now I'm thinking about combining my love of art and storytelling into animation someday.\n\nThe hardest part wasn't the rejection — it was deciding to stay involved instead of walking away. I'm glad I did.", wordCount: 124, timeMs: 360000, revisionDepth: 2 },
      { type: "short_response", title: "A Surprising Moment", response: "The most surprising thing I learned this year was that octopuses have three hearts and blue blood. My science teacher showed us a video of an octopus solving a puzzle to get food, and it changed the way I think about intelligence. Just because something looks different from us doesn't mean it's not smart. Now I wonder what other animals are solving problems in ways we haven't noticed yet.", wordCount: 67, timeMs: 240000, revisionDepth: 1 },
    ],
    briefing: {
      key_observations: [
        "Sofia demonstrates exceptional task persistence — she engaged deeply with every task and showed consistent effort across the full session.",
        "Written expression is vivid and personal. Sofia uses specific details (plantain pancakes, graphic novel about trees) that show genuine voice and creativity.",
        "Strong evidence of metacognitive awareness in the reflection task. Sofia can trace the emotional arc of a setback and identify what she learned from it.",
        "Reading comprehension is the strongest dimension — Sofia identified the key trade-off in the playground passage and proposed a creative solution unprompted.",
      ],
      interview_questions: [
        { question: "Tell me about your graphic novel. What inspired the idea of a girl who talks to trees?", rationale: "Sofia mentioned this project unprompted — it's a window into her creative thinking and initiative.", dimension: "writing" },
        { question: "You mentioned building a robot with your friend Amara. What's been the hardest part of that project?", rationale: "This reveals how Sofia handles technical challenges and collaborates.", dimension: "reasoning" },
        { question: "If you could design one class that doesn't exist at your school, what would it be?", rationale: "Sofia shows creative and divergent thinking — this question lets her demonstrate it in an interview setting.", dimension: "reflection" },
      ],
      areas_to_explore: ["Academic self-advocacy is strong but verify — does Sofia seek help when genuinely stuck, or does she tend to figure things out alone?"],
      strengths_to_confirm: ["Exceptional persistence and resilience", "Creative voice in writing", "Genuine intellectual curiosity"],
      confidence_explanation: "High confidence. Sofia's session data is internally consistent, her behavioral signals show sustained engagement, and there are no patterns of concern.",
    },
  },
];

export async function getDemoTenantId(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("slug", DEMO_SLUG)
    .single();

  if (!data) throw new Error("Demo tenant not found. Create it first.");
  return data.id;
}

export async function ensureDemoCandidates(tenantId: string): Promise<void> {
  // Locale dispatch: PT deployments get PT-localized demo content (Brazilian
  // names, PT task responses matching seed-pt-tasks.ts templates, PT briefings
  // and narratives). The shape and downstream tables are identical to the EN
  // path, so the dashboard auto-load behavior is preserved.
  if (getLocale() === "pt") {
    return ensureDemoCandidatesPt(tenantId);
  }

  // Check if demo candidates with full data already exist
  const { count: profileCount } = await supabaseAdmin
    .from("insight_profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const { count: taskCount } = await supabaseAdmin
    .from("task_instances")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  // If we have 3+ profiles AND task instances, demo data is complete
  if ((profileCount ?? 0) >= 3 && (taskCount ?? 0) >= 6) return;

  // Only clear candidates that have no real sessions (bare demo stubs)
  const { data: existingCandidates } = await supabaseAdmin
    .from("candidates")
    .select("id, sessions(id)")
    .eq("tenant_id", tenantId);

  // Delete candidates with zero sessions OR whose sessions have no task_instances
  for (const c of existingCandidates ?? []) {
    const sessions = c.sessions as unknown as { id: string }[];
    if (!sessions || sessions.length === 0) {
      await supabaseAdmin.from("candidates").delete().eq("id", c.id);
      continue;
    }
    // Check if sessions have task instances
    const { count: tiCount } = await supabaseAdmin
      .from("task_instances")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessions[0].id);
    if ((tiCount ?? 0) === 0) {
      // This is an incomplete demo candidate — delete cascade handles sessions/profiles
      await supabaseAdmin.from("candidates").delete().eq("id", c.id);
    }
  }

  console.log("[demo] Seeding comprehensive demo data for tenant:", tenantId);

  // Find or create an active cycle so demo candidates show in analytics/cohort
  let cycleId: string | null = null;
  const { data: activeCycle } = await supabaseAdmin
    .from("application_cycles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .limit(1)
    .single();

  if (activeCycle) {
    cycleId = activeCycle.id;
  } else {
    const year = new Date().getFullYear();
    const { data: newCycle } = await supabaseAdmin
      .from("application_cycles")
      .insert({
        tenant_id: tenantId,
        name: `${year}-${year + 1} Admissions`,
        academic_year: `${year}-${year + 1}`,
        status: "active",
      })
      .select("id")
      .single();
    cycleId = newCycle?.id ?? null;
  }

  for (const c of DEMO_CANDIDATES) {
    // Create candidate
    const { data: candidate, error: candErr } = await supabaseAdmin
      .from("candidates")
      .insert({
        tenant_id: tenantId,
        cycle_id: cycleId,
        first_name: c.first_name,
        last_name: c.last_name,
        grade_band: c.grade_band,
        grade_applying_to: c.grade_applying_to,
        status: "completed",
      })
      .select("id")
      .single();

    if (candErr || !candidate) { console.error("[demo] candidate error:", c.first_name, candErr); continue; }

    // Create session
    const completedAt = new Date(Date.now() - (1 + Math.random() * 3) * 24 * 60 * 60 * 1000);
    const sessionDurationMs = c.tasks.reduce((sum, t) => sum + t.timeMs, 0);
    const startedAt = new Date(completedAt.getTime() - sessionDurationMs);

    const { data: session, error: sessErr } = await supabaseAdmin
      .from("sessions")
      .insert({
        candidate_id: candidate.id,
        tenant_id: tenantId,
        cycle_id: cycleId,
        grade_band: c.grade_band,
        status: "completed",
        completion_pct: 100,
        completed_at: completedAt.toISOString(),
        started_at: startedAt.toISOString(),
        last_activity_at: completedAt.toISOString(),
      })
      .select("id")
      .single();

    if (sessErr || !session) { console.error("[demo] session error:", c.first_name, sessErr); continue; }

    // Create task instances + responses + features + signals
    let taskTime = startedAt.getTime();
    for (let i = 0; i < c.tasks.length; i++) {
      const task = c.tasks[i];
      const taskStarted = new Date(taskTime);
      const taskCompleted = new Date(taskTime + task.timeMs);
      taskTime = taskCompleted.getTime() + 10000; // 10s gap between tasks

      // Task instance (no template — demo tasks don't need real templates)
      const { data: ti } = await supabaseAdmin
        .from("task_instances")
        .insert({
          session_id: session.id,
          tenant_id: tenantId,
          sequence_order: i + 1,
          status: "completed",
          started_at: taskStarted.toISOString(),
          completed_at: taskCompleted.toISOString(),
        })
        .select("id")
        .single();

      if (!ti) continue;

      // Response text
      const { data: rt } = await supabaseAdmin
        .from("response_text")
        .insert({
          task_instance_id: ti.id,
          session_id: session.id,
          tenant_id: tenantId,
          response_body: task.response,
          word_count: task.wordCount,
          submitted_at: taskCompleted.toISOString(),
        })
        .select("id")
        .single();

      // Response features
      if (rt) {
        await supabaseAdmin.from("response_features").insert({
          response_text_id: rt.id,
          session_id: session.id,
          tenant_id: tenantId,
          sentence_count: Math.ceil(task.wordCount / 15),
          avg_sentence_length: 15 + Math.random() * 5,
          lexical_diversity: 0.55 + Math.random() * 0.2,
          evidence_marker_count: Math.floor(Math.random() * 4),
          revision_depth: task.revisionDepth,
        });
      }

      // Timing signals
      await supabaseAdmin.from("timing_signals").insert([
        { session_id: session.id, task_instance_id: ti.id, tenant_id: tenantId, signal_type: "task_duration", value_ms: task.timeMs, occurred_at: taskCompleted.toISOString() },
        { session_id: session.id, task_instance_id: ti.id, tenant_id: tenantId, signal_type: "reading_time", value_ms: Math.floor(task.timeMs * (0.2 + Math.random() * 0.15)), occurred_at: taskStarted.toISOString() },
      ]);

      // Help events (Alex uses none, Sofia uses 1-2, Jamie uses 1)
      const hintChance = c.support_seeking > 70 ? 0.5 : c.support_seeking > 50 ? 0.3 : 0.05;
      if (Math.random() < hintChance) {
        await supabaseAdmin.from("help_events").insert({
          session_id: session.id, task_instance_id: ti.id, tenant_id: tenantId,
          event_type: "hint_requested",
          occurred_at: new Date(taskStarted.getTime() + task.timeMs * 0.6).toISOString(),
        });
      }

      // Interaction signals
      await supabaseAdmin.from("interaction_signals").insert([
        { session_id: session.id, task_instance_id: ti.id, tenant_id: tenantId, signal_type: "keystroke_count", payload: { count: task.wordCount * 5 + Math.floor(Math.random() * 50) }, occurred_at: taskCompleted.toISOString() },
        { session_id: session.id, task_instance_id: ti.id, tenant_id: tenantId, signal_type: "backspace_count", payload: { count: task.revisionDepth * 8 + Math.floor(Math.random() * 20) }, occurred_at: taskCompleted.toISOString() },
      ]);

      // Session events
      await supabaseAdmin.from("session_events").insert([
        { session_id: session.id, tenant_id: tenantId, event_type: "task_started", task_instance_id: ti.id, occurred_at: taskStarted.toISOString() },
        { session_id: session.id, tenant_id: tenantId, event_type: "task_completed", task_instance_id: ti.id, occurred_at: taskCompleted.toISOString() },
      ]);
    }

    // Insight profile
    const { data: profile } = await supabaseAdmin
      .from("insight_profiles")
      .insert({
        session_id: session.id,
        candidate_id: candidate.id,
        tenant_id: tenantId,
        reading_score: c.reading,
        writing_score: c.writing,
        reasoning_score: c.reasoning,
        math_score: c.math,
        reflection_score: c.reflection,
        persistence_score: c.persistence,
        support_seeking_score: c.support_seeking,
        overall_confidence: c.overall_confidence,
        tri_score: c.tri_score,
        tri_label: c.tri_label,
        tri_confidence: c.tri_confidence,
        is_final: true,
        requires_human_review: c.support_level === "watch",
        internal_narrative: `${c.first_name} demonstrated ${c.tri_label === "thriving" ? "strong" : c.tri_label === "ready" ? "solid" : "developing"} readiness across the six assessed dimensions. ${c.enriched_signals.length > 0 ? `${c.enriched_signals.length} behavioral pattern(s) were flagged for professional review.` : "No behavioral patterns of concern were detected."}`,
        family_narrative: `${c.first_name} completed a set of reading, writing, and reasoning activities as part of the admissions process. The results suggest ${c.tri_label === "thriving" ? "strong preparation" : c.tri_label === "ready" ? "solid preparation" : "areas where additional support may be helpful"} for the transition to a new school environment.`,
      })
      .select("id")
      .single();

    // Learning support signals
    if (profile) {
      const { data: lss } = await supabaseAdmin.from("learning_support_signals").insert({
        session_id: session.id,
        candidate_id: candidate.id,
        tenant_id: tenantId,
        signal_count: c.enriched_signals.length,
        support_indicator_level: c.support_level,
        enriched_signals: c.enriched_signals,
        enriched_signal_count: c.enriched_signals.length,
        has_notable_signals: c.enriched_signals.some((s) => s.severity === "notable"),
        high_revision_depth: c.writing < 60,
        low_reading_dwell: c.support_level === "watch",
        short_written_output: false,
        high_response_latency: false,
        task_abandonment_pattern: false,
        hint_seeking_high: false,
        planning_task_difficulty: false,
        reasoning_writing_gap: c.reasoning > c.writing + 15,
      }).select("id").single();

      // Link signal to profile
      if (lss) {
        await supabaseAdmin.from("insight_profiles")
          .update({ learning_support_signal_id: lss.id })
          .eq("id", profile.id);
      }
    }

    // Evaluator briefing
    await supabaseAdmin.from("evaluator_briefings").insert({
      candidate_id: candidate.id,
      tenant_id: tenantId,
      key_observations: c.briefing.key_observations,
      interview_questions: c.briefing.interview_questions,
      areas_to_explore: c.briefing.areas_to_explore,
      strengths_to_confirm: c.briefing.strengths_to_confirm,
      confidence_explanation: c.briefing.confidence_explanation,
    });

    console.log("[demo] Seeded:", c.first_name, "—", c.tasks.length, "tasks,", c.briefing.key_observations.length, "observations");
  }
}

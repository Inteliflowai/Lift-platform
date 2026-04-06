// Coherent score profiles per type
export type ProfileType = "thriving" | "ready" | "developing" | "emerging_support";

export const PROFILES: Record<ProfileType, {
  reading: number; writing: number; reasoning: number; reflection: number;
  persistence: number; support_seeking: number; tri: number; confidence: number;
  tri_label: string; tri_confidence: string;
  learning_support: boolean; support_level: string;
  briefing_observations: string[];
  briefing_questions: { question: string; rationale: string; dimension: string }[];
}> = {
  thriving: {
    reading: 82, writing: 79, reasoning: 84, reflection: 76, persistence: 88, support_seeking: 71,
    tri: 83, confidence: 87, tri_label: "thriving", tri_confidence: "high",
    learning_support: false, support_level: "none",
    briefing_observations: [
      "Strong comprehension with evidence-based reasoning across all reading tasks",
      "Written responses show sophisticated vocabulary and structural variety",
      "Consistent engagement throughout the session with high revision behavior",
      "Demonstrates mature metacognitive awareness in reflection tasks",
    ],
    briefing_questions: [
      { question: "Tell me about a project you worked on that you're really proud of. What made it meaningful?", rationale: "Validates persistence and intrinsic motivation signals from session", dimension: "persistence" },
      { question: "When you disagree with a teacher or classmate, how do you usually handle it?", rationale: "Explores reasoning and communication skills in interpersonal context", dimension: "reasoning" },
      { question: "What kind of support do you think helps you learn best?", rationale: "Probes self-awareness and support-seeking patterns", dimension: "support_seeking" },
    ],
  },
  ready: {
    reading: 68, writing: 64, reasoning: 71, reflection: 65, persistence: 72, support_seeking: 68,
    tri: 68, confidence: 74, tri_label: "ready", tri_confidence: "moderate",
    learning_support: false, support_level: "none",
    briefing_observations: [
      "Solid comprehension with room for deeper analysis on complex texts",
      "Writing is clear and organized but could develop more nuance",
      "Good persistence indicators — maintained effort throughout session",
      "Reflection shows developing self-awareness",
    ],
    briefing_questions: [
      { question: "Can you walk me through how you approach a reading assignment when the text is challenging?", rationale: "Explores reading strategies to validate moderate reading score", dimension: "reading" },
      { question: "If you could improve one thing about how you write, what would it be?", rationale: "Probes writing self-awareness and growth mindset", dimension: "writing" },
      { question: "Tell me about a time you asked for help with something academic. How did it go?", rationale: "Validates support-seeking behavior", dimension: "support_seeking" },
    ],
  },
  developing: {
    reading: 52, writing: 48, reasoning: 58, reflection: 54, persistence: 49, support_seeking: 61,
    tri: 52, confidence: 62, tri_label: "developing", tri_confidence: "moderate",
    learning_support: false, support_level: "none",
    briefing_observations: [
      "Basic comprehension present but struggles with inferential thinking",
      "Written output is brief — may reflect writing fluency challenges or disengagement",
      "Session pacing shows some difficulty sustaining focus across tasks",
      "Shows willingness to seek hints which is a positive adaptive behavior",
    ],
    briefing_questions: [
      { question: "What subjects do you enjoy most? What makes them interesting to you?", rationale: "Identifies engagement drivers to contextualize lower persistence", dimension: "persistence" },
      { question: "When you're writing and you get stuck, what do you usually do?", rationale: "Explores writing process and strategies", dimension: "writing" },
      { question: "Tell me about something you learned recently outside of school.", rationale: "Separates school-specific challenges from general learning capacity", dimension: "reasoning" },
    ],
  },
  emerging_support: {
    reading: 38, writing: 31, reasoning: 61, reflection: 42, persistence: 35, support_seeking: 77,
    tri: 41, confidence: 48, tri_label: "emerging", tri_confidence: "low",
    learning_support: true, support_level: "recommend_screening",
    briefing_observations: [
      "Notable gap between verbal reasoning signals and written expression",
      "Written output is significantly below grade-band expectations",
      "High revision behavior suggests effortful processing during writing tasks",
      "Strong support-seeking signals — appropriately uses available resources",
      "Session data confidence is low — additional context recommended",
    ],
    briefing_questions: [
      { question: "Do you prefer explaining ideas by talking or by writing? Why?", rationale: "Directly probes the reasoning-writing gap observed in session", dimension: "writing" },
      { question: "Tell me about a time learning felt really easy. What was different about that experience?", rationale: "Identifies conditions where the student thrives", dimension: "reflection" },
      { question: "If you could have any kind of help with schoolwork, what would be most useful?", rationale: "Explores support needs and self-awareness", dimension: "support_seeking" },
      { question: "What do you do when you're reading something and realize you've lost track of what it's about?", rationale: "Probes reading comprehension strategies", dimension: "reading" },
    ],
  },
};

// 6 candidates per band: 2 thriving, 2 ready/developing, 1 developing, 1 emerging_support
export const BAND_DISTRIBUTION: ProfileType[] = [
  "thriving", "thriving", "ready", "developing", "developing", "emerging_support",
];

// Stage per position: 3 completed, 1 in-progress, 1 invited, 1 consent_pending
export type DemoStage = "completed" | "in_progress" | "invited" | "consent_pending";
export const STAGE_DISTRIBUTION: DemoStage[] = [
  "completed", "completed", "completed", "in_progress", "invited", "consent_pending",
];

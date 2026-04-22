"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { VoiceResponseInput } from "@/components/session/VoiceResponseInput";
import { PassageReader } from "@/components/session/PassageReader";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type TaskTemplate = {
  id: string;
  task_type: string;
  title: string;
  content: {
    passage?: string;
    prompt?: string;
    prompts?: string[];
    scenario?: string;
    stages?: { label: string; prompt: string }[];
    problem?: string;
    choices?: string[];
    pattern?: string;
    hint?: string;
    hints?: string[];
  };
  estimated_minutes?: number;
};

type TaskInstance = {
  id: string;
  sequence_order: number;
  status: string;
  task_templates: TaskTemplate;
};

type Session = {
  id: string;
  status: string;
  completion_pct: number;
};

// UX config — labels/encouragement are resolved at render time via t() so
// they respect the current locale. Keeping the shape the same as before
// so callers don't need to change.
type UxEntry = {
  textClass: string;
  padding: string;
  progressLabel: (cur: number, total: number) => string;
  maxHints: number;
  hintLabel: string;
  encouragement: string[];
};

function buildUxConfig(t: (key: string) => string): Record<"6-7" | "8" | "9-11", UxEntry> {
  return {
    "6-7": {
      textClass: "text-lg",
      padding: "p-6",
      progressLabel: (cur, total) => {
        const pct = Math.round((cur / total) * 100);
        if (pct >= 50) return t("session_ui.progress_halfway");
        if (pct >= 25) return t("session_ui.progress_keep_going");
        return t("session_ui.progress_got_this");
      },
      maxHints: 2,
      hintLabel: t("session_ui.hint_need"),
      encouragement: [
        t("session_ui.encouragement_nice"),
        t("session_ui.encouragement_great"),
        t("session_ui.encouragement_keep"),
        t("session_ui.encouragement_awesome"),
      ],
    },
    "8": {
      textClass: "text-base",
      padding: "p-5",
      progressLabel: (cur, total) =>
        t("session_ui.question_of_total")
          .replace("{current}", String(cur))
          .replace("{total}", String(total)),
      maxHints: 3,
      hintLabel: t("session_ui.hint_label"),
      encouragement: [],
    },
    "9-11": {
      textClass: "text-sm",
      padding: "p-4",
      progressLabel: () => "",
      maxHints: 3,
      hintLabel: t("session_ui.hint_label"),
      encouragement: [],
    },
  };
}

export function SessionClient({
  token,
  candidateEmail,
  gradeBand,
  tenantId,
  pauseAllowed,
  voiceEnabled,
  passageReaderEnabled,
  existingSession,
}: {
  token: string;
  candidateEmail: string;
  gradeBand: "6-7" | "8" | "9-11";
  tenantId: string;
  pauseAllowed: boolean;
  voiceEnabled: boolean;
  passageReaderEnabled: boolean;
  existingSession: Session | null;
}) {
  const { t } = useLocale();
  const ux = buildUxConfig(t)[gradeBand];
  const [session, setSession] = useState<Session | null>(existingSession);
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState<string | null>(null);

  // Signal tracking
  const taskStartTime = useRef(Date.now());
  const keystrokeCount = useRef(0);
  const backspaceCount = useRef(0);

  // Initialize session
  useEffect(() => {
    async function init() {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      setSession(data.session);

      const sorted = (data.taskInstances as TaskInstance[]).sort(
        (a, b) => a.sequence_order - b.sequence_order
      );
      setTasks(sorted);

      // Find first incomplete task
      const firstPending = sorted.findIndex((t) => t.status !== "completed");
      setCurrentIdx(firstPending >= 0 ? firstPending : 0);
      setLoading(false);

      // Update session status if needed
      if (data.session.status === "not_started" || data.session.status === "paused") {
        await fetch("/api/session/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: data.session.id }),
        });
      }
    }
    init();
  }, [token]);

  // Heartbeat every 30s
  useEffect(() => {
    if (!session || paused) return;
    const interval = setInterval(() => {
      const currentTask = tasks[currentIdx];
      fetch("/api/session/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          task_instance_id: currentTask?.id,
        }),
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [session, currentIdx, tasks, paused]);

  // Focus tracking
  useEffect(() => {
    if (!session) return;
    function handleBlur() {
      fireSignal("interaction", {
        signal_type: "focus_lost",
      });
    }
    function handleFocus() {
      fireSignal("interaction", {
        signal_type: "focus_returned",
      });
    }
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [session]);

  const fireSignal = useCallback(
    (
      type: "interaction" | "timing" | "help",
      data: Record<string, unknown>
    ) => {
      if (!session) return;
      const currentTask = tasks[currentIdx];
      fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          session_id: session.id,
          task_instance_id: currentTask?.id,
          tenant_id: tenantId,
          ...data,
        }),
      }).catch(() => {}); // fire-and-forget
    },
    [session, tasks, currentIdx, tenantId]
  );

  function handleTaskStart() {
    taskStartTime.current = Date.now();
    keystrokeCount.current = 0;
    backspaceCount.current = 0;
    fireSignal("timing", {
      signal_type: "response_latency",
      value_ms: 0,
    });
  }

  async function handlePause() {
    if (!session) return;
    setPaused(true);
    await fetch("/api/session/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.id,
        candidate_email: candidateEmail,
      }),
    });
  }

  async function handleSubmitTask(responseBody: string) {
    if (!session || submitting) return;
    setSubmitting(true);

    // Record timing
    const dwellMs = Date.now() - taskStartTime.current;
    fireSignal("timing", {
      signal_type: "task_dwell_time",
      value_ms: dwellMs,
    });

    const revisionDepth =
      keystrokeCount.current > 0
        ? Math.round((backspaceCount.current / keystrokeCount.current) * 100)
        : 0;

    const res = await fetch("/api/session/submit-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.id,
        task_instance_id: tasks[currentIdx].id,
        response_body: responseBody,
        revision_depth: revisionDepth,
      }),
    });

    if (!res.ok) {
      console.error("Submit failed:", res.status);
      setSubmitting(false);
      return;
    }

    const data = await res.json();

    if (data.all_done) {
      // Complete session
      await fetch("/api/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id }),
      });
      // Use hard navigation to ensure redirect works
      window.location.href = `/session/done/${token}`;
      return;
    }

    // Show encouragement for grade 6-7
    if (ux.encouragement.length > 0) {
      const msg = ux.encouragement[currentIdx % ux.encouragement.length];
      setShowEncouragement(msg);
      setTimeout(() => setShowEncouragement(null), 2000);
    }

    // Move to next task
    setCurrentIdx((prev) => prev + 1);
    handleTaskStart();
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-muted">{t("session.loading")}</p>
        </div>
      </div>
    );
  }

  if (paused) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <h1 className="text-2xl font-bold">{t("session.paused")}</h1>
        <p className="mt-3 text-muted">
          {t("session.paused_desc")}
        </p>
        <p className="mt-1 text-sm text-muted">
          {t("session_ui.check_inbox_at")} {candidateEmail}.
        </p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">{t("session.no_tasks")}</h1>
        <p className="mt-2 text-muted">
          {t("session.no_tasks_desc")}
        </p>
      </div>
    );
  }

  const currentTask = tasks[currentIdx];
  const template = currentTask?.task_templates;
  const total = tasks.length;
  const progressPct = Math.round(((currentIdx) / total) * 100);

  return (
    <div className="relative">
      {/* Header bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex-1">
          {/* Progress */}
          {gradeBand === "9-11" ? (
            <div className="flex gap-1">
              {tasks.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    i < currentIdx
                      ? "bg-primary"
                      : i === currentIdx
                      ? "bg-primary/50"
                      : "bg-lift-border"
                  }`}
                />
              ))}
            </div>
          ) : (
            <div>
              <div className="h-2 rounded-full bg-lift-border">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">
                {ux.progressLabel(currentIdx + 1, total)}
              </p>
            </div>
          )}
        </div>
        {pauseAllowed && (
          <button
            onClick={handlePause}
            className="ml-4 rounded-md border border-lift-border px-3 py-1.5 text-xs text-muted hover:text-lift-text"
          >
            {t("session_ui.pause")}
          </button>
        )}
      </div>

      {/* Encouragement toast */}
      {showEncouragement && (
        <div className="mb-4 rounded-lg bg-success/10 p-3 text-center text-sm font-medium text-success">
          {showEncouragement}
        </div>
      )}

      {/* Task renderer */}
      {template && (
        <TaskRenderer
          key={currentTask.id}
          template={template}
          ux={ux}
          onSubmit={handleSubmitTask}
          onKeyStroke={() => keystrokeCount.current++}
          onBackspace={() => backspaceCount.current++}
          onTaskStart={handleTaskStart}
          onHint={() => fireSignal("help", { event_type: "hint_open" })}
          onReadingDwell={(ms) =>
            fireSignal("timing", {
              signal_type: "time_on_text",
              value_ms: ms,
            })
          }
          onTtsListenDuration={(ms) =>
            fireSignal("timing", {
              signal_type: "tts_listen_duration_ms",
              value_ms: ms,
            })
          }
          submitting={submitting}
          voiceEnabled={voiceEnabled}
          passageReaderEnabled={passageReaderEnabled}
          gradeBand={gradeBand}
          sessionToken={token}
          taskInstanceId={currentTask.id}
        />
      )}
    </div>
  );
}

function TaskRenderer({
  template,
  ux,
  onSubmit,
  onKeyStroke,
  onBackspace,
  onTaskStart,
  onHint,
  onReadingDwell,
  onTtsListenDuration,
  submitting,
  voiceEnabled,
  passageReaderEnabled,
  gradeBand,
  sessionToken,
  taskInstanceId,
}: {
  template: TaskTemplate;
  ux: UxEntry;
  onSubmit: (response: string) => void;
  onKeyStroke: () => void;
  onBackspace: () => void;
  onTaskStart: () => void;
  onHint: () => void;
  onReadingDwell: (ms: number) => void;
  onTtsListenDuration: (ms: number) => void;
  submitting: boolean;
  voiceEnabled: boolean;
  passageReaderEnabled: boolean;
  gradeBand: "6-7" | "8" | "9-11";
  sessionToken: string;
  taskInstanceId: string;
}) {
  const { t } = useLocale();
  const [response, setResponse] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [hintsShown, setHintsShown] = useState(0);
  const readStartRef = useRef(Date.now());

  useEffect(() => {
    onTaskStart();
    readStartRef.current = Date.now();
  }, [template.id]);

  const hints = template.content.hints ?? (template.content.hint ? [template.content.hint] : []);

  function showHint() {
    if (hintsShown < Math.min(hints.length, ux.maxHints)) {
      setHintsShown((h) => h + 1);
      onHint();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Backspace") onBackspace();
    else onKeyStroke();
  }

  function handleSubmit() {
    // Record reading dwell if passage
    if (template.task_type === "reading_passage") {
      onReadingDwell(Date.now() - readStartRef.current);
    }

    if (template.task_type === "planning") {
      const combined = Object.values(responses).join("\n\n---\n\n");
      onSubmit(combined);
    } else {
      onSubmit(response);
    }
  }

  const wordCount = response.trim().split(/\s+/).filter(Boolean).length;

  switch (template.task_type) {
    case "reading_passage":
      return (
        <div className={`space-y-4 ${ux.textClass}`}>
          <h2 className="text-xl font-bold">{template.title}</h2>
          {/* Reading comprehension — NO audio reader. Candidate must read. */}
          <div
            className={`max-h-80 overflow-y-auto rounded-lg border border-lift-border bg-surface ${ux.padding}`}
          >
            <p className="whitespace-pre-wrap leading-relaxed">
              {template.content.passage}
            </p>
          </div>
          {template.content.prompt && (
            <p className="font-medium">{template.content.prompt}</p>
          )}
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("session_ui.placeholder_response")}
            className="w-full min-h-[80px] rounded-lg border border-lift-border bg-surface p-4 text-lift-text outline-none focus:border-primary resize-y"
          />
          <WordCountAndSubmit
            hints={hints}
            hintsShown={hintsShown}
            maxHints={ux.maxHints}
            hintLabel={ux.hintLabel}
            onHint={showHint}
            onSubmit={handleSubmit}
            disabled={response.trim().length === 0 || submitting}
            submitting={submitting}
          />
        </div>
      );

    case "short_response":
      return (
        <div className={`space-y-4 ${ux.textClass}`}>
          <h2 className="text-xl font-bold">{template.title}</h2>
          {template.content.prompt && (
            <p className="text-muted">{template.content.prompt}</p>
          )}
          <VoiceResponseInput
            taskType="short_response" gradeBand={gradeBand} voiceEnabled={voiceEnabled}
            sessionToken={sessionToken} taskInstanceId={taskInstanceId}
            value={response} onChange={setResponse} onKeyDown={handleKeyDown}
            placeholder={t("session_ui.placeholder_short")} minHeight="80px"
          />
          <p className="text-xs text-muted">
            {wordCount} {t("session_ui.word_count_suffix")}{" "}
            <span className="text-muted/60">{t("session_ui.word_count_hint_sentences")}</span>
          </p>
          <WordCountAndSubmit
            hints={hints}
            hintsShown={hintsShown}
            maxHints={ux.maxHints}
            hintLabel={ux.hintLabel}
            onHint={showHint}
            onSubmit={handleSubmit}
            disabled={response.trim().length === 0 || submitting}
            submitting={submitting}
          />
        </div>
      );

    case "extended_writing":
      return (
        <div className={`space-y-4 ${ux.textClass}`}>
          <h2 className="text-xl font-bold">{template.title}</h2>
          {template.content.prompt && (
            <p className="text-muted">{template.content.prompt}</p>
          )}
          <VoiceResponseInput
            taskType="extended_writing" gradeBand={gradeBand} voiceEnabled={voiceEnabled}
            sessionToken={sessionToken} taskInstanceId={taskInstanceId}
            value={response} onChange={setResponse} onKeyDown={handleKeyDown}
            placeholder={t("session_ui.placeholder_extended")} minHeight="200px"
          />
          <p className="text-xs text-muted">{wordCount} {t("session_ui.word_count_suffix")}</p>
          <WordCountAndSubmit
            hints={hints}
            hintsShown={hintsShown}
            maxHints={ux.maxHints}
            hintLabel={ux.hintLabel}
            onHint={showHint}
            onSubmit={handleSubmit}
            disabled={response.trim().length === 0 || submitting}
            submitting={submitting}
          />
        </div>
      );

    case "reflection":
      return (
        <div className={`space-y-4 ${ux.textClass}`}>
          <h2 className="text-xl font-bold">{template.title}</h2>
          {template.content.prompt && (
            <p className="text-muted">{template.content.prompt}</p>
          )}
          <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
            <p className="text-xs text-primary">
              {t("session_ui.reflection_encouragement")}
            </p>
          </div>
          <VoiceResponseInput
            taskType="reflection" gradeBand={gradeBand} voiceEnabled={voiceEnabled}
            sessionToken={sessionToken} taskInstanceId={taskInstanceId}
            value={response} onChange={setResponse} onKeyDown={handleKeyDown}
            placeholder={t("session_ui.placeholder_reflect")} minHeight="120px"
          />
          <WordCountAndSubmit
            hints={hints}
            hintsShown={hintsShown}
            maxHints={ux.maxHints}
            hintLabel={ux.hintLabel}
            onHint={showHint}
            onSubmit={handleSubmit}
            disabled={response.trim().length === 0 || submitting}
            submitting={submitting}
          />
        </div>
      );

    case "scenario":
      return (
        <div className={`space-y-4 ${ux.textClass}`}>
          <h2 className="text-xl font-bold">{template.title}</h2>
          {passageReaderEnabled && template.content.scenario ? (
            <PassageReader
              passageText={template.content.scenario}
              sessionToken={sessionToken}
              gradeBand={gradeBand}
              padding={ux.padding}
              onListenDuration={onTtsListenDuration}
            />
          ) : (
            <div
              className={`rounded-lg border border-lift-border bg-surface ${ux.padding}`}
            >
              <p className="whitespace-pre-wrap">{template.content.scenario}</p>
            </div>
          )}
          {(template.content.prompts ?? [template.content.prompt]).map(
            (p, i) =>
              p && (
                <div key={i} className="space-y-2">
                  <p className="font-medium">{p}</p>
                  {i === 0 && (
                    <VoiceResponseInput
                      taskType="scenario" gradeBand={gradeBand} voiceEnabled={voiceEnabled}
                      sessionToken={sessionToken} taskInstanceId={taskInstanceId}
                      value={response} onChange={setResponse} onKeyDown={handleKeyDown}
                      placeholder={t("session_ui.placeholder_scenario")} minHeight="80px"
                    />
                  )}
                </div>
              )
          )}
          <WordCountAndSubmit
            hints={hints}
            hintsShown={hintsShown}
            maxHints={ux.maxHints}
            hintLabel={ux.hintLabel}
            onHint={showHint}
            onSubmit={handleSubmit}
            disabled={response.trim().length === 0 || submitting}
            submitting={submitting}
          />
        </div>
      );

    case "planning":
      const stages = template.content.stages ?? [];
      return (
        <div className={`space-y-4 ${ux.textClass}`}>
          <h2 className="text-xl font-bold">{template.title}</h2>
          {template.content.prompt && (
            <p className="text-muted">{template.content.prompt}</p>
          )}
          {stages.map((stage, i) => (
            <div key={i} className="space-y-2">
              <p className="font-medium">
                {t("session_ui.step_prefix")} {i + 1}: {stage.label}
              </p>
              <p className="text-sm text-muted">{stage.prompt}</p>
              <textarea
                value={responses[`stage_${i}`] ?? ""}
                onChange={(e) =>
                  setResponses((prev) => ({
                    ...prev,
                    [`stage_${i}`]: e.target.value,
                  }))
                }
                onKeyDown={handleKeyDown}
                placeholder={`${stage.label}...`}
                className="w-full min-h-[80px] rounded-lg border border-lift-border bg-surface p-4 text-lift-text outline-none focus:border-primary resize-y"
              />
            </div>
          ))}
          <WordCountAndSubmit
            hints={hints}
            hintsShown={hintsShown}
            maxHints={ux.maxHints}
            hintLabel={ux.hintLabel}
            onHint={showHint}
            onSubmit={handleSubmit}
            disabled={
              Object.values(responses).every((v) => v.trim() === "") ||
              submitting
            }
            submitting={submitting}
          />
        </div>
      );

    case "quantitative_reasoning":
      return (
        <div className={`space-y-4 ${ux.textClass}`}>
          <h2 className="text-xl font-bold">{template.title}</h2>
          {template.content.problem && (
            passageReaderEnabled ? (
              <PassageReader
                passageText={template.content.problem}
                sessionToken={sessionToken}
                gradeBand={gradeBand}
                padding={ux.padding}
                onListenDuration={onTtsListenDuration}
              />
            ) : (
              <div
                className={`rounded-lg border border-lift-border bg-surface ${ux.padding}`}
              >
                <p className="whitespace-pre-wrap leading-relaxed font-mono">
                  {template.content.problem}
                </p>
              </div>
            )
          )}
          {template.content.prompt && (
            <p className="font-medium">{template.content.prompt}</p>
          )}
          {template.content.choices && (
            <div className="space-y-2">
              {template.content.choices.map((choice: string, i: number) => (
                <label
                  key={i}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    response === choice
                      ? "border-primary bg-primary/10"
                      : "border-lift-border hover:bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name="choice"
                    checked={response === choice}
                    onChange={() => setResponse(choice)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span>{choice}</span>
                </label>
              ))}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-muted">
              {t("session_ui.show_your_work_label")}
            </label>
            <textarea
              value={responses["work"] ?? ""}
              onChange={(e) =>
                setResponses((prev) => ({ ...prev, work: e.target.value }))
              }
              onKeyDown={handleKeyDown}
              placeholder={t("session_ui.placeholder_work")}
              className="w-full min-h-[100px] rounded-lg border border-lift-border bg-surface p-4 text-lift-text outline-none focus:border-primary resize-y"
            />
          </div>
          <WordCountAndSubmit
            hints={hints}
            hintsShown={hintsShown}
            maxHints={ux.maxHints}
            hintLabel={ux.hintLabel}
            onHint={showHint}
            onSubmit={() => {
              const combined = `Answer: ${response}\n\nWork:\n${responses["work"] ?? ""}`;
              onSubmit(combined);
            }}
            disabled={
              (response.trim() === "" && (responses["work"] ?? "").trim() === "") ||
              submitting
            }
            submitting={submitting}
          />
        </div>
      );

    case "pattern_logic":
      return (
        <div className={`space-y-4 ${ux.textClass}`}>
          <h2 className="text-xl font-bold">{template.title}</h2>
          {template.content.pattern && (
            <div
              className={`rounded-lg border border-lift-border bg-surface ${ux.padding} text-center`}
            >
              <p className="text-2xl font-mono tracking-widest">
                {template.content.pattern}
              </p>
            </div>
          )}
          {template.content.prompt && (
            <p className="font-medium">{template.content.prompt}</p>
          )}
          <div>
            <label className="mb-1 block text-sm text-muted">{t("session_ui.your_answer_label")}</label>
            <input
              type="text"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("session_ui.placeholder_pattern_answer")}
              className="w-full rounded-lg border border-lift-border bg-surface p-3 text-lift-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">
              {t("session_ui.explain_figure_out_label")}
            </label>
            <textarea
              value={responses["explanation"] ?? ""}
              onChange={(e) =>
                setResponses((prev) => ({
                  ...prev,
                  explanation: e.target.value,
                }))
              }
              onKeyDown={handleKeyDown}
              placeholder={t("session_ui.placeholder_pattern_explain")}
              className="w-full min-h-[80px] rounded-lg border border-lift-border bg-surface p-4 text-lift-text outline-none focus:border-primary resize-y"
            />
          </div>
          <WordCountAndSubmit
            hints={hints}
            hintsShown={hintsShown}
            maxHints={ux.maxHints}
            hintLabel={ux.hintLabel}
            onHint={showHint}
            onSubmit={() => {
              const combined = `Answer: ${response}\n\nExplanation:\n${responses["explanation"] ?? ""}`;
              onSubmit(combined);
            }}
            disabled={
              response.trim() === "" || submitting
            }
            submitting={submitting}
          />
        </div>
      );

    default:
      return (
        <div className="py-8 text-center">
          <p className="text-muted">{t("session_ui.unknown_task_type")} {template.task_type}</p>
        </div>
      );
  }
}

function WordCountAndSubmit({
  hints,
  hintsShown,
  maxHints,
  hintLabel,
  onHint,
  onSubmit,
  disabled,
  submitting,
}: {
  hints: string[];
  hintsShown: number;
  maxHints: number;
  hintLabel: string;
  onHint: () => void;
  onSubmit: () => void;
  disabled: boolean;
  submitting: boolean;
}) {
  const { t } = useLocale();
  return (
    <div>
      {/* Show revealed hints */}
      {hintsShown > 0 && (
        <div className="mb-3 space-y-2">
          {hints.slice(0, hintsShown).map((h, i) => (
            <div
              key={i}
              className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm text-muted"
            >
              {h}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {hints.length > 0 && hintsShown < Math.min(hints.length, maxHints) && (
            <button
              onClick={onHint}
              className="text-sm text-warning hover:text-warning/80"
            >
              {hintLabel}
            </button>
          )}
        </div>
        <button
          onClick={onSubmit}
          disabled={disabled}
          className="rounded-lg bg-primary px-6 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? t("session_ui.saving") : t("session_ui.continue")}
        </button>
      </div>
    </div>
  );
}

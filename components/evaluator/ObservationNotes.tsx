"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { TOOLTIPS } from "@/lib/tooltips/content";
import { MessageSquarePlus } from "lucide-react";

interface ObsNote {
  id: string;
  note_type: string;
  linked_observation_text: string | null;
  linked_question_text: string | null;
  note_text: string;
  sentiment: string | null;
  created_at: string;
}

interface Question {
  question: string;
  rationale: string;
  dimension: string;
}

interface Props {
  candidateId: string;
  observations: string[];
  interviewQuestions: Question[];
}

const SENTIMENT_OPTIONS = [
  { value: "confirms", label: "✓ Confirms", color: "text-success", bg: "bg-success/10 border-success/30" },
  { value: "contradicts", label: "✗ Contradicts", color: "text-review", bg: "bg-review/10 border-review/30" },
  { value: "expands", label: "+ Expands", color: "text-primary", bg: "bg-primary/10 border-primary/30" },
  { value: "unclear", label: "? Unclear", color: "text-muted", bg: "bg-muted/10 border-muted/30" },
] as const;

function sentimentStyle(s: string | null) {
  return SENTIMENT_OPTIONS.find((o) => o.value === s) ?? SENTIMENT_OPTIONS[3];
}

export function ObservationNotes({ candidateId, observations, interviewQuestions }: Props) {
  const [notes, setNotes] = useState<ObsNote[]>([]);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [freeNote, setFreeNote] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`/api/school/candidates/observation-notes?candidate_id=${candidateId}`)
      .then((r) => r.json())
      .then(({ notes: n }) => setNotes(n ?? []))
      .catch(() => {});
  }, [candidateId]);

  function getNoteForItem(text: string): ObsNote | undefined {
    return notes.find(
      (n) => n.linked_observation_text === text || n.linked_question_text === text
    );
  }

  async function saveNote(noteType: string, linkedText: string | null, isQuestion: boolean) {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/school/candidates/observation-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          note_type: noteType,
          linked_observation_text: !isQuestion ? linkedText : null,
          linked_question_text: isQuestion ? linkedText : null,
          note_text: noteText.trim(),
          sentiment: sentiment || null,
        }),
      });
      const { note } = await res.json();
      if (note) {
        setNotes((prev) => [
          ...prev.filter(
            (n) =>
              n.linked_observation_text !== linkedText &&
              n.linked_question_text !== linkedText
          ),
          note,
        ]);
        toast("Note saved — it will feed into the synthesis");
      }
      setNoteText("");
      setSentiment("");
      setActiveItem(null);
    } finally {
      setSaving(false);
    }
  }

  async function saveFreeNote() {
    if (!freeNote.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/school/candidates/observation-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          note_type: "free_note",
          note_text: freeNote.trim(),
        }),
      });
      const { note } = await res.json();
      if (note) {
        setNotes((prev) => [...prev, note]);
        toast("Note added");
      }
      setFreeNote("");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    await fetch(`/api/school/candidates/observation-notes?note_id=${noteId}`, {
      method: "DELETE",
    });
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  const questionTexts = interviewQuestions.map((q) => q.question);

  // Empty state when no briefing data exists yet
  if (observations.length === 0 && questionTexts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-lift-border bg-surface py-14 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <MessageSquarePlus size={28} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-lift-text">No briefing available yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Once this candidate completes their LIFT session, an AI briefing will appear here with observations and interview questions. You can then add notes on each one during the interview.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* LIFT Observations */}
      {observations.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">
            LIFT Observations — Add Your Notes
          </p>
          <div className="space-y-2.5">
            {observations.map((obs, i) => {
              const existing = getNoteForItem(obs);
              const isActive = activeItem === `obs:${obs}`;
              return (
                <div
                  key={i}
                  className={`rounded-lg border bg-surface p-3 ${
                    existing
                      ? `border-${sentimentStyle(existing.sentiment).color.replace("text-", "")}/20`
                      : "border-lift-border"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <p className="flex-1 text-sm leading-relaxed text-muted">{obs}</p>
                    {!existing && !isActive && (
                      <button
                        onClick={() => {
                          setActiveItem(`obs:${obs}`);
                          setNoteText("");
                          setSentiment("");
                        }}
                        className="shrink-0 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
                      >
                        Did the interview confirm this?
                      </button>
                    )}
                  </div>

                  {/* Existing note display */}
                  {existing && !isActive && (
                    <div
                      className={`ml-4 mt-2.5 flex items-start justify-between gap-2 rounded-lg border p-2.5 ${sentimentStyle(existing.sentiment).bg}`}
                    >
                      <div>
                        {existing.sentiment && (
                          <span
                            className={`mb-1 block text-[10px] font-bold uppercase tracking-widest ${sentimentStyle(existing.sentiment).color}`}
                          >
                            {sentimentStyle(existing.sentiment).label}
                          </span>
                        )}
                        <p className="text-sm leading-relaxed text-lift-text">
                          {existing.note_text}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => {
                            setActiveItem(`obs:${obs}`);
                            setNoteText(existing.note_text);
                            setSentiment(existing.sentiment || "");
                          }}
                          className="text-xs text-muted hover:text-lift-text"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteNote(existing.id)}
                          className="text-xs text-review hover:text-review/80"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Note input */}
                  {isActive && (
                    <div className="ml-4 mt-2.5 space-y-2">
                      <div className="mb-1">
                        <p className="mb-1.5 text-[10px] font-semibold text-muted">How did the interview compare?</p>
                        <div className="flex flex-wrap gap-1.5">
                          {SENTIMENT_OPTIONS.map((opt) => (
                            <span key={opt.value} className="inline-flex items-center">
                              <button
                                onClick={() =>
                                  setSentiment(sentiment === opt.value ? "" : opt.value)
                                }
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                  sentiment === opt.value
                                    ? `${opt.bg} ${opt.color}`
                                    : "bg-page-bg text-muted hover:text-lift-text"
                                }`}
                              >
                                {opt.label}
                              </button>
                              <Tooltip content={TOOLTIPS[`sentiment_${opt.value}`]} />
                            </span>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="What did you observe in the interview about this..."
                        rows={2}
                        className="w-full resize-y rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveNote("observation_response", obs, false)}
                          disabled={saving || !noteText.trim()}
                          className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save Note"}
                        </button>
                        <button
                          onClick={() => {
                            setActiveItem(null);
                            setNoteText("");
                            setSentiment("");
                          }}
                          className="rounded-md border border-lift-border px-4 py-1.5 text-xs text-muted hover:text-lift-text"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interview Questions */}
      {questionTexts.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-warning">
            Interview Questions — Record Responses
          </p>
          <div className="space-y-2">
            {interviewQuestions.map((q, i) => {
              const existing = getNoteForItem(q.question);
              const isActive = activeItem === `q:${q.question}`;
              return (
                <div
                  key={i}
                  className={`rounded-lg border bg-surface p-3 ${
                    existing ? "border-success/20" : "border-lift-border"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0 text-sm font-bold text-warning">
                      Q{i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm italic leading-relaxed text-muted">
                        {q.question}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted/60">
                        {q.dimension} — {q.rationale}
                      </p>
                    </div>
                    {!existing && !isActive && (
                      <button
                        onClick={() => {
                          setActiveItem(`q:${q.question}`);
                          setNoteText("");
                        }}
                        className="shrink-0 rounded-md border border-warning/20 bg-warning/5 px-2.5 py-1 text-[11px] font-medium text-warning hover:bg-warning/10"
                      >
                        + Response
                      </button>
                    )}
                  </div>

                  {existing && !isActive && (
                    <div className="ml-7 mt-2.5 flex items-start justify-between gap-2 rounded-lg border border-success/20 bg-success/5 p-2.5">
                      <p className="text-sm leading-relaxed text-lift-text">
                        {existing.note_text}
                      </p>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => {
                            setActiveItem(`q:${q.question}`);
                            setNoteText(existing.note_text);
                          }}
                          className="text-xs text-muted hover:text-lift-text"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteNote(existing.id)}
                          className="text-xs text-review hover:text-review/80"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {isActive && (
                    <div className="ml-7 mt-2.5 space-y-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="How did they respond to this question..."
                        rows={2}
                        className="w-full resize-y rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveNote("question_response", q.question, true)}
                          disabled={saving || !noteText.trim()}
                          className="rounded-md bg-warning px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save Response"}
                        </button>
                        <button
                          onClick={() => {
                            setActiveItem(null);
                            setNoteText("");
                          }}
                          className="rounded-md border border-lift-border px-4 py-1.5 text-xs text-muted hover:text-lift-text"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Free notes */}
      <div>
        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted">
          Additional Notes
        </p>
        <div className="flex gap-2.5">
          <textarea
            value={freeNote}
            onChange={(e) => setFreeNote(e.target.value)}
            placeholder="Any additional observations from the interview..."
            rows={3}
            className="flex-1 resize-y rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
          />
          <button
            onClick={saveFreeNote}
            disabled={saving || !freeNote.trim()}
            className="self-start rounded-md bg-[#0a1419] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {notes
          .filter((n) => n.note_type === "free_note")
          .map((note) => (
            <div
              key={note.id}
              className="mt-2 flex items-start justify-between gap-2 rounded-lg border border-lift-border bg-surface p-3"
            >
              <p className="text-sm leading-relaxed text-muted">{note.note_text}</p>
              <button
                onClick={() => deleteNote(note.id)}
                className="shrink-0 text-sm text-muted hover:text-review"
              >
                ✕
              </button>
            </div>
          ))}
      </div>

      {/* Summary badge */}
      {notes.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-medium text-primary">
            ✦ {notes.length} note{notes.length !== 1 ? "s" : ""} captured —
            these will be incorporated into the post-interview synthesis
          </p>
        </div>
      )}
    </div>
  );
}

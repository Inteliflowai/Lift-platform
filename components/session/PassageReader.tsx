"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";

type Props = {
  passageText: string;
  sessionToken: string;
  gradeBand: "6-7" | "8" | "9-11";
  padding: string;
  onListenDuration?: (ms: number) => void;
};

const SPEED_OPTIONS = [0.75, 1, 1.25];

const GRADE_CONFIG = {
  "6-7": {
    label: "Have this read to you",
    defaultSpeed: 0.9,
    prominent: true,
  },
  "8": {
    label: "Listen to the passage",
    defaultSpeed: 1,
    prominent: false,
  },
  "9-11": {
    label: "",
    defaultSpeed: 1,
    prominent: false,
  },
};

/** Split passage into sentences for highlight sync. */
function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+\s*/g) ?? [text];
}

export function PassageReader({
  passageText,
  sessionToken,
  gradeBand,
  padding,
  onListenDuration,
}: Props) {
  const config = GRADE_CONFIG[gradeBand];
  const [status, setStatus] = useState<
    "idle" | "loading" | "playing" | "paused" | "done"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(config.defaultSpeed);
  const [activeSentence, setActiveSentence] = useState(-1);
  const [failed, setFailed] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const sentences = useRef(splitSentences(passageText));
  const progressBarRef = useRef<HTMLDivElement>(null);
  const listenStartRef = useRef<number | null>(null);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      // Report listen duration on unmount
      if (listenStartRef.current && onListenDuration) {
        onListenDuration(Date.now() - listenStartRef.current);
      }
    };
  }, []);

  const fetchAudio = useCallback(async () => {
    if (blobUrlRef.current) return blobUrlRef.current;

    setStatus("loading");
    try {
      const res = await fetch("/api/session/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: passageText,
          session_token: sessionToken,
        }),
      });

      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      return url;
    } catch (err) {
      console.error("PassageReader TTS error:", err);
      setFailed(true);
      setStatus("idle");
      return null;
    }
  }, [passageText, sessionToken]);

  async function handlePlay() {
    if (!listenStartRef.current) {
      listenStartRef.current = Date.now();
    }

    const url = await fetchAudio();
    if (!url) return;

    if (!audioRef.current) {
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.playbackRate = speed;

      audio.addEventListener("timeupdate", () => {
        if (audio.duration) {
          const pct = audio.currentTime / audio.duration;
          setProgress(pct);

          // Estimate which sentence is being read based on progress
          const idx = Math.min(
            Math.floor(pct * sentences.current.length),
            sentences.current.length - 1
          );
          setActiveSentence(idx);
        }
      });

      audio.addEventListener("ended", () => {
        setStatus("done");
        setProgress(1);
        setActiveSentence(-1);
      });

      audio.addEventListener("error", () => {
        console.error("Audio playback error");
        setFailed(true);
        setStatus("idle");
      });
    }

    audioRef.current.playbackRate = speed;
    await audioRef.current.play();
    setStatus("playing");
  }

  function handlePause() {
    audioRef.current?.pause();
    setStatus("paused");
  }

  function handleReplay() {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = speed;
      audioRef.current.play();
      setStatus("playing");
      setProgress(0);
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current?.duration || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct);
  }

  function handleSpeedChange() {
    const currentIdx = SPEED_OPTIONS.indexOf(
      SPEED_OPTIONS.find((s) => Math.abs(s - speed) < 0.01) ?? 1
    );
    const nextSpeed = SPEED_OPTIONS[(currentIdx + 1) % SPEED_OPTIONS.length];
    setSpeed(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  }

  // If TTS failed, render passage without the player
  if (failed) {
    return (
      <div
        className={`max-h-80 overflow-y-auto rounded-lg border border-lift-border bg-surface ${padding}`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{passageText}</p>
      </div>
    );
  }

  const sentenceList = sentences.current;

  return (
    <div className="space-y-0">
      {/* Player bar */}
      <div className="flex items-center gap-3 rounded-t-lg border border-primary/20 bg-primary/5 px-3 py-2">
        {/* Play/Pause button */}
        <button
          type="button"
          onClick={
            status === "playing"
              ? handlePause
              : status === "done"
              ? handleReplay
              : handlePlay
          }
          disabled={status === "loading"}
          aria-label="Listen to passage"
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0"
        >
          {status === "loading" ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
              <span>Loading audio...</span>
            </>
          ) : status === "playing" ? (
            <>
              <Pause size={12} />
              <span>Pause</span>
            </>
          ) : status === "done" ? (
            <>
              <RotateCcw size={12} />
              <span>Listen again</span>
            </>
          ) : (
            <>
              <Play size={12} />
              <span>
                {config.label ||
                  (status === "paused" ? "Resume" : "Listen")}
              </span>
            </>
          )}
        </button>

        {/* Grade 6-7 prominent label */}
        {config.prominent && status === "idle" && (
          <span className="text-xs text-primary font-medium hidden sm:inline">
            {config.label}
          </span>
        )}

        {/* Progress bar */}
        {status !== "idle" && (
          <div
            ref={progressBarRef}
            onClick={handleSeek}
            className="flex-1 h-1.5 rounded-full bg-primary/20 cursor-pointer relative"
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}

        {/* Speed selector */}
        {status !== "idle" && (
          <button
            type="button"
            onClick={handleSpeedChange}
            className="shrink-0 rounded-md border border-primary/20 px-2 py-0.5 text-[10px] font-mono font-medium text-primary hover:bg-primary/10"
          >
            {speed}x
          </button>
        )}

        {/* Volume icon for subtle mode (grade 9-11 idle) */}
        {!config.prominent && status === "idle" && gradeBand === "9-11" && (
          <Volume2 size={14} className="text-primary/50" />
        )}
      </div>

      {/* Passage text with sentence highlighting */}
      <div
        className={`max-h-80 overflow-y-auto rounded-b-lg border border-t-0 border-lift-border bg-surface ${padding}`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">
          {status === "playing" && activeSentence >= 0
            ? sentenceList.map((sentence, i) => (
                <span
                  key={i}
                  className={
                    i === activeSentence
                      ? "underline decoration-primary/40 decoration-2 underline-offset-2"
                      : ""
                  }
                >
                  {sentence}
                </span>
              ))
            : passageText}
        </p>
      </div>
    </div>
  );
}

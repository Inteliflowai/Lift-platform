"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, RotateCcw } from "lucide-react";

type Props = {
  taskType: string;
  gradeBand: "6-7" | "8" | "9-11";
  voiceEnabled: boolean;
  sessionToken: string;
  taskInstanceId: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  minHeight?: string;
};

const MAX_SECONDS: Record<string, number> = {
  "6-7": 120,
  "8": 300,
  "9-11": 300,
};

const VOICE_ALLOWED = [
  "short_response",
  "extended_writing",
  "reflection",
];

export function VoiceResponseInput({
  taskType,
  gradeBand,
  voiceEnabled,
  sessionToken,
  taskInstanceId,
  value,
  onChange,
  onKeyDown,
  placeholder,
  minHeight = "80px",
}: Props) {
  // CRITICAL: Never show voice on reading_passage
  const canVoice =
    voiceEnabled &&
    taskType !== "reading_passage" &&
    VOICE_ALLOWED.includes(taskType);

  const [mode, setMode] = useState<"type" | "voice">(
    canVoice && gradeBand === "6-7" ? "voice" : "type"
  );
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [supported, setSupported] = useState(true);
  const [bars, setBars] = useState([0.3, 0.5, 0.7, 0.5, 0.3]);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const maxSec = MAX_SECONDS[gradeBand] ?? 300;

  // Check browser support
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder
    ) {
      setSupported(false);
      setMode("type");
    }
  }, []);

  // Auto-stop at max time
  useEffect(() => {
    if (recording && seconds >= maxSec) {
      stopRecording();
    }
  }, [seconds, recording, maxSec]);

  const startRecording = useCallback(async () => {
    setError(null);
    chunks.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        handleTranscribe();
      };

      recorder.start(250);
      setRecording(true);
      setSeconds(0);

      // Timer
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);

      // Waveform animation
      animRef.current = setInterval(() => {
        setBars((prev) =>
          prev.map(() => 0.2 + Math.random() * 0.8)
        );
      }, 150);
    } catch {
      setError("Microphone access denied. Please allow microphone access.");
    }
  }, []);

  function stopRecording() {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animRef.current) clearInterval(animRef.current);
    setRecording(false);
    setBars([0.3, 0.5, 0.7, 0.5, 0.3]);
  }

  async function handleTranscribe() {
    setTranscribing(true);
    setError(null);

    const blob = new Blob(chunks.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", blob);
    formData.append("task_instance_id", taskInstanceId);
    formData.append("session_token", sessionToken);
    formData.append("task_type", taskType);

    try {
      const res = await fetch("/api/session/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Transcription failed");
      }

      const { transcript } = await res.json();
      onChange(transcript);

      // Grade 6-7: read transcript back
      if (gradeBand === "6-7" && "speechSynthesis" in window && transcript) {
        const utterance = new SpeechSynthesisUtterance(transcript);
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message === "transcription_failed"
            ? "We couldn't hear that clearly — try again or switch to typing."
            : err.message
          : "Transcription failed"
      );
    }

    setTranscribing(false);
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const remaining = maxSec - seconds;

  // If voice not available, render typed only
  if (!canVoice || !supported) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-lift-border bg-surface p-4 text-lift-text outline-none focus:border-primary resize-y`}
        style={{ minHeight }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex rounded-lg border border-lift-border bg-surface p-0.5">
        <button
          type="button"
          onClick={() => setMode("type")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "type"
              ? "bg-primary text-white"
              : "text-muted hover:text-lift-text"
          }`}
        >
          Type your response
        </button>
        <button
          type="button"
          onClick={() => setMode("voice")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "voice"
              ? "bg-primary text-white"
              : "text-muted hover:text-lift-text"
          }`}
        >
          Speak your response
        </button>
      </div>

      {/* Type mode */}
      {mode === "type" && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-lift-border bg-surface p-4 text-lift-text outline-none focus:border-primary resize-y`}
          style={{ minHeight }}
        />
      )}

      {/* Voice mode */}
      {mode === "voice" && (
        <div className="flex flex-col items-center rounded-lg border border-lift-border bg-surface p-6">
          {/* Grade 6-7 encouragement */}
          {gradeBand === "6-7" && !recording && !transcribing && !value && (
            <p className="mb-4 text-center text-sm text-muted">
              Just talk like you&apos;re telling a friend. There&apos;s no wrong
              answer.
            </p>
          )}

          {/* Microphone button */}
          {!transcribing && (
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className="relative flex h-20 w-20 items-center justify-center rounded-full transition-all"
            >
              {/* Pulsing ring when recording */}
              {recording && (
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
              )}
              <span
                className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full ${
                  recording
                    ? "bg-[#f43f5e] hover:bg-[#e11d48]"
                    : "bg-primary hover:bg-[#818cf8]"
                } text-white transition-colors`}
              >
                {recording ? <MicOff size={28} /> : <Mic size={28} />}
              </span>
            </button>
          )}

          {/* Status text */}
          {!recording && !transcribing && !value && (
            <p className="mt-3 text-xs text-muted">Tap to start recording</p>
          )}

          {recording && (
            <div className="mt-4 flex flex-col items-center gap-2">
              {/* Waveform */}
              <div className="flex items-end gap-1 h-8">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-primary transition-all duration-150"
                    style={{ height: `${h * 32}px` }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted">
                Recording... tap to stop
              </p>
              <p className={`text-xs font-mono ${remaining <= 30 ? "text-[#f43f5e] font-bold" : "text-muted"}`}>
                {formatTime(seconds)} / {formatTime(maxSec)}
              </p>
            </div>
          )}

          {/* Transcribing */}
          {transcribing && (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-muted">Transcribing...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 w-full rounded-lg border border-[#f43f5e]/30 bg-[#f43f5e]/5 p-3 text-center">
              <p className="text-xs text-[#f43f5e]">{error}</p>
              <div className="mt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <RotateCcw size={12} /> Try again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("type");
                    setError(null);
                  }}
                  className="text-xs text-muted hover:underline"
                >
                  Switch to typing
                </button>
              </div>
            </div>
          )}

          {/* Transcript result */}
          {value && !recording && !transcribing && (
            <div className="mt-4 w-full space-y-2">
              <p className="text-xs text-muted">
                We transcribed what you said. Feel free to edit before
                submitting.
              </p>
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                className="w-full rounded-lg border border-lift-border bg-page-bg p-3 text-sm text-lift-text outline-none focus:border-primary resize-y"
                style={{ minHeight: "80px" }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

export interface TourStep {
  target?: string;        // CSS selector to highlight (optional — if omitted, shows centered)
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

export function GuidedTour({
  tourId,
  steps,
  onComplete,
}: {
  tourId: string;
  steps: TourStep[];
  onComplete?: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Check if tour already completed
    const completed = localStorage.getItem(`tour_${tourId}`);
    if (!completed) {
      // Delay slightly so page renders first
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [tourId]);

  const updateTargetRect = useCallback(() => {
    const step = steps[currentStep];
    if (step?.target) {
      const el = document.querySelector(step.target);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    setTargetRect(null);
  }, [currentStep, steps]);

  useEffect(() => {
    if (visible) {
      updateTargetRect();
      window.addEventListener("resize", updateTargetRect);
      return () => window.removeEventListener("resize", updateTargetRect);
    }
  }, [visible, currentStep, updateTargetRect]);

  function dismiss() {
    localStorage.setItem(`tour_${tourId}`, "true");
    setVisible(false);
    onComplete?.();
  }

  function next() {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  function prev() {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }

  if (!visible || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  // Position the tooltip near the target or center screen
  const tooltipStyle: React.CSSProperties = targetRect
    ? {
        position: "fixed",
        top: step.position === "top" ? targetRect.top - 12 : targetRect.bottom + 12,
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 360)),
        transform: step.position === "top" ? "translateY(-100%)" : "none",
        zIndex: 10001,
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 10001,
      };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[10000] bg-black/50 transition-opacity"
        onClick={dismiss}
      />

      {/* Highlight ring around target */}
      {targetRect && (
        <div
          className="fixed z-[10000] rounded-lg border-2 border-primary shadow-[0_0_0_4000px_rgba(0,0,0,0.5)]"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="w-[340px] rounded-xl border border-lift-border bg-white p-5 shadow-2xl"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-bold text-lift-text">{step.title}</h3>
          <button onClick={dismiss} className="text-muted hover:text-lift-text -mt-1 -mr-1">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-muted leading-relaxed mb-4">{step.content}</p>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted">
            {currentStep + 1} of {steps.length}
          </span>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1 rounded-lg border border-lift-border px-3 py-1.5 text-xs text-muted hover:bg-gray-50"
              >
                <ChevronLeft size={12} /> Back
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
            >
              {isLast ? "Done" : "Next"} {!isLast && <ChevronRight size={12} />}
            </button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1 mt-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === currentStep ? "bg-primary" : i < currentStep ? "bg-primary/40" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * Hook to check if a tour has been completed.
 */
export function useTourCompleted(tourId: string): boolean {
  const [completed, setCompleted] = useState(true); // default true to avoid flash
  useEffect(() => {
    setCompleted(!!localStorage.getItem(`tour_${tourId}`));
  }, [tourId]);
  return completed;
}

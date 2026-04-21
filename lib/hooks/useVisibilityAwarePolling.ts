"use client";

import { useEffect, useRef, useState } from "react";

// Runs `callback` every `intervalMs` while the tab is visible. Pauses when
// document.visibilityState !== 'visible' and resumes immediately on return.
// Prevents hammering the API when no one is looking — committee-mode admins
// often have multiple tabs open.

export function useVisibilityAwarePolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
) {
  const savedCallback = useRef(callback);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof document === "undefined") return;

    let timer: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (timer) return;
      timer = setInterval(() => {
        void savedCallback.current();
      }, intervalMs);
      setIsActive(true);
    }
    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      setIsActive(false);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        // Immediate fetch on return so the UI catches up fast.
        void savedCallback.current();
        start();
      } else {
        stop();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    // Start only if currently visible.
    if (document.visibilityState === "visible") {
      start();
    } else {
      setIsActive(false);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, [intervalMs, enabled]);

  return { isActive };
}

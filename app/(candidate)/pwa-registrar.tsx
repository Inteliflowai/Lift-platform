"use client";

import { useEffect, useState } from "react";

export function PWARegistrar() {
  const [offline, setOffline] = useState(false);
  const [backOnline, setBackOnline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("SW registration failed:", err);
      });
    }

    // Online/offline detection
    function handleOffline() {
      setOffline(true);
      setBackOnline(false);
    }
    async function handleOnline() {
      setOffline(false);
      setBackOnline(true);

      // Flush offline queue
      try {
        const { flushQueue, queueSize } = await import("@/lib/offline-queue");
        const size = await queueSize();
        if (size > 0) {
          await flushQueue();
        }
        setQueueCount(0);
      } catch {
        // IndexedDB not available
      }

      setTimeout(() => setBackOnline(false), 3000);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // Check initial state
    if (!navigator.onLine) setOffline(true);

    // Check queue size periodically
    const interval = setInterval(async () => {
      try {
        const { queueSize } = await import("@/lib/offline-queue");
        setQueueCount(await queueSize());
      } catch {
        // ignore
      }
    }, 5000);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      {/* Offline banner */}
      {offline && (
        <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center bg-[#f59e0b] px-4 py-2 text-center text-[13px] font-medium text-[#78350f]"
          style={{ paddingTop: "max(env(safe-area-inset-top), 8px)" }}>
          You appear to be offline — your responses are saved and will submit when your connection returns
          {queueCount > 0 && <span className="ml-1">({queueCount} queued)</span>}
        </div>
      )}

      {/* Back online banner */}
      {backOnline && (
        <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center bg-[#6366f1] px-4 py-2 text-center text-[13px] font-medium text-white"
          style={{ paddingTop: "max(env(safe-area-inset-top), 8px)" }}>
          Back online — submitting your responses...
        </div>
      )}
    </>
  );
}

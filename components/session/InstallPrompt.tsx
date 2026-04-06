"use client";

import { useEffect, useState, useRef } from "react";
import { X, Share } from "lucide-react";

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Only show once per session
    if (sessionStorage.getItem("lift-install-shown")) return;

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after a delay
      const timer = setTimeout(() => {
        if (!sessionStorage.getItem("lift-install-shown")) {
          setShow(true);
          sessionStorage.setItem("lift-install-shown", "1");
        }
      }, 5000);
      return () => clearTimeout(timer);
    }

    // Chrome/Android: capture beforeinstallprompt
    function handlePrompt(e: Event) {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShow(true);
      sessionStorage.setItem("lift-install-shown", "1");
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  async function handleInstall() {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      await deferredPrompt.current.userChoice;
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
      <div className="mx-auto max-w-md rounded-2xl border border-[#e8e4df] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[#1c1917]">
              Add LIFT to your home screen
            </p>
            <p className="mt-1 text-[13px] text-[#78716c]">
              {isIOS
                ? "For a better experience, add LIFT to your home screen."
                : "Install LIFT for quick access and a better experience."}
            </p>
          </div>
          <button onClick={() => setShow(false)} className="ml-3 rounded-full p-1 text-[#9ca3af] hover:text-[#1c1917]">
            <X size={18} />
          </button>
        </div>

        {isIOS ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#faf8f5] p-3 text-[12px] text-[#57534e]">
            <Share size={16} className="shrink-0 text-[#6366f1]" />
            <span>Tap the <strong>Share</strong> button, then <strong>&ldquo;Add to Home Screen&rdquo;</strong></span>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 rounded-xl bg-[#6366f1] py-2.5 text-sm font-semibold text-white"
            >
              Install
            </button>
            <button
              onClick={() => setShow(false)}
              className="rounded-xl border border-[#e8e4df] px-4 py-2.5 text-sm text-[#78716c]"
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

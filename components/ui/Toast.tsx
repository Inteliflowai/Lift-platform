"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      const id = ++nextId;
      setItems((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      {items.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-200 ${
                item.type === "success"
                  ? "border-success/30 bg-[#0a1f15]/95 text-success"
                  : item.type === "error"
                    ? "border-review/30 bg-[#1f0a0a]/95 text-review"
                    : "border-primary/30 bg-[#0a0f1f]/95 text-primary"
              }`}
            >
              {item.type === "success" ? (
                <CheckCircle2 size={16} className="shrink-0" />
              ) : item.type === "error" ? (
                <AlertCircle size={16} className="shrink-0" />
              ) : (
                <CheckCircle2 size={16} className="shrink-0" />
              )}
              <span className="text-sm font-medium">{item.message}</span>
              <button
                onClick={() => dismiss(item.id)}
                className="ml-2 shrink-0 text-current opacity-60 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

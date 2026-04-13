"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useTooltips() {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoaded(true); return; }
      supabase
        .from("tooltip_dismissals")
        .select("tooltip_id")
        .eq("user_id", user.id)
        .then(({ data }) => {
          setDismissedIds((data ?? []).map((d) => d.tooltip_id));
          setLoaded(true);
        });
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => [...prev, id]);
    fetch("/api/tooltips/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tooltipId: id }),
    }).catch(() => {});
  }, []);

  const isDismissed = useCallback((id: string) => dismissedIds.includes(id), [dismissedIds]);

  return { dismissedIds, loaded, dismiss, isDismissed };
}

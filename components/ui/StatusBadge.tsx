"use client";

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
  invited:         { bg: "bg-primary/10 border-primary/20", text: "text-primary", icon: "✉" },
  consent_pending: { bg: "bg-warning/10 border-warning/20", text: "text-warning", icon: "⏳" },
  active:          { bg: "bg-warning/10 border-warning/20", text: "text-warning", icon: "⏳" },
  completed:       { bg: "bg-success/10 border-success/20", text: "text-success", icon: "✓" },
  flagged:         { bg: "bg-review/10 border-review/20",   text: "text-review",  icon: "⚠" },
  reviewed:        { bg: "bg-muted/10 border-muted/20",     text: "text-muted",   icon: "✓" },
  archived:        { bg: "bg-muted/10 border-muted/20",     text: "text-muted",   icon: "○" },
  waitlisted:      { bg: "bg-[#8b5cf6]/10 border-[#8b5cf6]/20", text: "text-[#8b5cf6]", icon: "⏸" },
  admitted:        { bg: "bg-success/10 border-success/20", text: "text-success", icon: "🎓" },
  offered:         { bg: "bg-success/10 border-success/20", text: "text-success", icon: "🎓" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    bg: "bg-muted/10 border-muted/20",
    text: "text-muted",
    icon: "○",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className="text-[10px]">{config.icon}</span>
      {status.replace(/_/g, " ")}
    </span>
  );
}

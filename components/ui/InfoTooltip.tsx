"use client";

import { useState } from "react";
import { Info } from "lucide-react";

export function InfoTooltip({
  text,
  width = 260,
  position = "top",
  iconSize = 14,
  className = "",
}: {
  text: string;
  width?: number;
  position?: "top" | "bottom" | "left" | "right";
  iconSize?: number;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  };

  return (
    <span
      className={`relative inline-flex cursor-help ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <Info size={iconSize} className="text-muted/60 hover:text-primary transition-colors" />
      {show && (
        <div
          className="absolute z-50 rounded-lg border border-lift-border bg-white px-3 py-2.5 text-xs leading-relaxed text-muted shadow-lg"
          style={{ width, ...positionStyles[position] }}
        >
          {text}
        </div>
      )}
    </span>
  );
}

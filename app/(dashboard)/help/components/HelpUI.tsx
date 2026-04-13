"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Section wrapper with collapsible content
export function HelpSection({
  id,
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div id={id} className="scroll-mt-20 rounded-xl border border-lift-border bg-surface overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 p-5 text-left hover:bg-page-bg transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon size={18} className="text-primary" />
        </div>
        <h2 className="flex-1 text-base font-semibold text-lift-text">{title}</h2>
        {open ? (
          <ChevronDown size={18} className="text-muted" />
        ) : (
          <ChevronRight size={18} className="text-muted" />
        )}
      </button>
      {open && <div className="border-t border-lift-border p-5 space-y-4">{children}</div>}
    </div>
  );
}

// Step-by-step instructions
export function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2 ml-1">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-lift-text">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {i + 1}
          </span>
          <span className="pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}

// Navigation breadcrumb showing where to find something
export function WhereToFind({ path }: { path: string[] }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted">
      <MapPin size={12} className="shrink-0 text-primary" />
      {path.map((p, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={10} />}
          <span className="font-medium">{p}</span>
        </span>
      ))}
    </div>
  );
}

// Callout boxes
export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <Lightbulb size={16} className="mt-0.5 shrink-0 text-primary" />
      <div className="text-xs text-lift-text leading-relaxed">{children}</div>
    </div>
  );
}

export function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/5 p-3">
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-warning" />
      <div className="text-xs text-lift-text leading-relaxed">{children}</div>
    </div>
  );
}

export function Success({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 p-3">
      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
      <div className="text-xs text-lift-text leading-relaxed">{children}</div>
    </div>
  );
}

// Stat explanation card
export function StatExplainer({
  label,
  example,
  description,
}: {
  label: string;
  example: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-lift-border p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold text-lift-text">{label}</p>
        <p className="text-xs font-mono text-primary">{example}</p>
      </div>
      <p className="mt-1 text-[11px] text-muted leading-relaxed">{description}</p>
    </div>
  );
}

// UI mockup card showing a section layout
export function UIPreview({
  title,
  sections,
}: {
  title: string;
  sections: { label: string; color: string }[];
}) {
  return (
    <div className="rounded-lg border border-lift-border bg-page-bg p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {title}
      </p>
      <div className="space-y-1.5">
        {sections.map((s) => (
          <div
            key={s.label}
            className={`rounded-md px-3 py-2 text-xs font-medium ${s.color}`}
          >
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Table of contents for a help page
export function TableOfContents({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  return (
    <div className="rounded-xl border border-lift-border bg-surface p-4 print:hidden">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">
          On this page
        </p>
        <button
          onClick={() => window.print()}
          className="text-[10px] font-medium text-primary hover:underline"
        >
          Print / PDF
        </button>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="block rounded-md px-2 py-1.5 text-sm text-muted hover:text-primary hover:bg-primary/5 transition-colors"
          >
            {item.label}
          </a>
        ))}
      </div>
    </div>
  );
}

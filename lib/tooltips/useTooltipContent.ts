"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { TOOLTIPS } from "./content";
import { TOOLTIPS_PT } from "./content.pt";
import type { TooltipContent } from "./content";

// Locale-aware accessor for the tooltip content dictionary.
//
// Consumers call useTooltipContent() instead of importing TOOLTIPS
// directly so PT deployments render PT tooltip content on the
// evaluator / cohort / reports / candidate-detail / class-builder
// surfaces without each call site needing its own locale check.
//
// Distinct from useTooltips() (same directory) which handles DB-backed
// dismissal state — two different concerns, both still needed at call
// sites: useTooltips() for "has the user dismissed this?", and
// useTooltipContent() for "what does this tooltip say in the current
// locale?".
//
// Dictionary shape is identical in EN and PT — same keys, same ids,
// same learnMoreHref and roles values. Only `title` and `body` differ.

export function useTooltipContent(): Record<string, TooltipContent> {
  const { locale } = useLocale();
  return locale === "pt" ? TOOLTIPS_PT : TOOLTIPS;
}

// Non-hook variant for code paths that already have the locale in hand
// (e.g. server components pulling locale from env).
export function getTooltipsForLocale(locale: "en" | "pt"): Record<string, TooltipContent> {
  return locale === "pt" ? TOOLTIPS_PT : TOOLTIPS;
}

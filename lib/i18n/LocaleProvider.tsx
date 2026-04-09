"use client";

import { createContext, useContext } from "react";
import en from "./en.json";
import pt from "./pt.json";

type Locale = "en" | "pt";

interface LocaleContextValue {
  locale: Locale;
  brandName: string;
  brandTagline: string;
  hidePricing: boolean;
  t: (key: string) => string;
}

const translations: Record<Locale, Record<string, string>> = { en, pt };

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  brandName: "LIFT",
  brandTagline: "Learning Insight for Transitions",
  hidePricing: false,
  t: (key) => en[key as keyof typeof en] ?? key,
});

export function LocaleProvider({
  locale,
  brandName,
  brandTagline,
  hidePricing,
  children,
}: {
  locale: Locale;
  brandName: string;
  brandTagline: string;
  hidePricing: boolean;
  children: React.ReactNode;
}) {
  const dict = translations[locale] ?? translations.en;

  function t(key: string): string {
    return dict[key as keyof typeof dict] ?? en[key as keyof typeof en] ?? key;
  }

  return (
    <LocaleContext.Provider
      value={{ locale, brandName, brandTagline, hidePricing, t }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

import en from "./en.json";
import pt from "./pt.json";
import { getLocale, type Locale } from "./config";

const translations: Record<Locale, Record<string, string>> = { en, pt };

export function t(key: string): string {
  const locale = getLocale();
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}

// Client-side hook version (reads from a global)
let _clientLocale: Locale | null = null;

export function setClientLocale(locale: Locale) {
  _clientLocale = locale;
}

export function useT() {
  const locale = _clientLocale ?? getLocale();
  const dict = translations[locale] ?? translations.en;

  return function translate(key: string): string {
    return dict[key] ?? translations.en[key] ?? key;
  };
}

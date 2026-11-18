import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import it from "./it.json";

export const languages = ["en", "it"] as const;
export type Language = (typeof languages)[number];

export const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, it: { translation: it } },
  lng: "en",
  fallbackLng: "en",
  supportedLngs: languages,
  keySeparator: false,
  nsSeparator: false,
  initAsync: false,
  interpolation: { escapeValue: false },
});

export const translate = i18n.t.bind(i18n);

export function dateLocale(language = i18n.resolvedLanguage): string {
  return language === "it" ? "it-IT" : "en-GB";
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(dateLocale(), options).format(value);
}

export function dateLabel(date: string): string {
  return new Intl.DateTimeFormat(dateLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date.slice(0, 10)}T12:00:00`));
}

export function numberLabel(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 2 });
}

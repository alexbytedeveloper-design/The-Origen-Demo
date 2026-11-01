import { es, type Dict } from "./es";
import { en } from "./en";
import { fr } from "./fr";
import { ru } from "./ru";

export const locales = ["es", "en", "fr", "ru"] as const;
export type Locale = (typeof locales)[number];

export const dictionaries: Record<Locale, Dict> = { es, en, fr, ru };

export const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  ru: "Русский",
};

export const localeShort: Record<Locale, string> = {
  es: "ES",
  en: "EN",
  fr: "FR",
  ru: "RU",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dict {
  return dictionaries[locale] ?? es;
}

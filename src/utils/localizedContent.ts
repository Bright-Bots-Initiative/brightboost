import { TFunction } from "i18next";
import i18n from "../i18n";

/**
 * Translation map for module and activity names from the database.
 * Keys are the English names stored in the DB; values are Spanish translations.
 */
const CONTENT_NAME_ES: Record<string, string> = {
  // Module names
  "Bounce & Buds": "Rebota y Amigos",
  "Gotcha Gears": "Engranajes Gotcha",
  "Rhyme & Ride": "Rima y Viaje",
  "Fix the Order": "Ordena los Pasos",
  "Build a Bot": "Construye un Robot",
  // Activity names
  "Story: Meet Buddy": "Historia: Conoce a Buddy",
  "Story: Meet Rhymo": "Historia: Conoce a Rhymo",
  "Story: Meet Gearbot": "Historia: Conoce a Gearbot",
  // Module titles
  "Module 1: Rhyme & Ride": "Módulo 1: Rima y Viaje",
  "Module 2: Bounce & Buds": "Módulo 2: Rebota y Amigos",
  "Module 3: Gotcha Gears": "Módulo 3: Engranajes Gotcha",
};

/**
 * Translate a database-sourced content name based on the current language.
 * Returns the original name if no translation is available or if language is English.
 */
export function translateContentName(name: string): string {
  if (i18n.language === "en") return name;
  return CONTENT_NAME_ES[name] ?? name;
}

export type LocalizedField = string | { i18nKey: string } | undefined | null;

export function resolveText(
  t: TFunction,
  field: LocalizedField,
  fallback: string = "",
): string {
  if (typeof field === "string") {
    return field;
  }
  if (field && typeof field === "object" && "i18nKey" in field) {
    return t(field.i18nKey);
  }
  return fallback;
}

export function resolveChoiceList(
  t: TFunction,
  fields: LocalizedField[],
  fallback: string[] = [],
): string[] {
  if (!Array.isArray(fields)) return fallback;
  return fields.map((f) => resolveText(t, f));
}

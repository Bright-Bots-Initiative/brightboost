import { TFunction } from "i18next";
import i18n from "../i18n";

/**
 * Translation map for module and activity names from the database.
 * Keys are the English names stored in the DB; values are Spanish translations.
 */
const CONTENT_NAME_ES: Record<string, string> = {
  // Game / activity names
  "Bounce & Buds": "Rebota y Amigos",
  "Gotcha Gears": "Engranajes Gotcha",
  "Rhyme & Ride": "Rima y Viaje",
  "Fix the Order": "Ordena los Pasos",
  "Build a Bot": "Construye un Robot",
  // Story activity names
  "Story: Meet Buddy": "Historia: Conoce a Buddy",
  "Story: Meet Rhymo": "Historia: Conoce a Rhymo",
  "Story: Meet Gearbot": "Historia: Conoce a Gearbot",
  // Module titles (various seed formats)
  "Module 1: Rhyme & Ride": "Módulo 1: Rima y Viaje",
  "Module 2: Bounce & Buds": "Módulo 2: Rebota y Amigos",
  "Module 3: Gotcha Gears": "Módulo 3: Engranajes Gotcha",
  "Module 1 — Rhyme & Ride": "Módulo 1 — Rima y Viaje",
  "Module 2 — Bounce & Buds": "Módulo 2 — Rebota y Amigos",
  "Module 3 — Gotcha Gears": "Módulo 3 — Engranajes Gotcha",
  "STEM-1: Introduction to Tech": "STEM-1: Introducción a la Tecnología",
  "STEM-1: Module 2 — Rhyme & Ride": "STEM-1: Módulo 2 — Rima y Viaje",
  "STEM-1: Module 3 — Bounce & Buds": "STEM-1: Módulo 3 — Rebota y Amigos",
  "STEM-1: Module 4 — Gotcha Gears": "STEM-1: Módulo 4 — Engranajes Gotcha",
  // Module descriptions
  "K-2 Intro to AI, Quantum, and Bio": "Intro K-2 a IA, Cuántica y Bio",
  "Discover the tiny particles that power the future! Coming Soon.":
    "¡Descubre las partículas que impulsan el futuro! Próximamente.",
  "Put steps in order to help Boost bake! 🥣🔥🧁":
    "¡Pon los pasos en orden para ayudar a Boost a hornear! 🥣🔥🧁",
  "Shoot the rhyme fast! 🎵🚲": "¡Dispara la rima rápido! 🎵🚲",
  "Find the rhyming word! 🎵🚲": "¡Encuentra la palabra que rima! 🎵🚲",
  "Bounce through the right gate to answer clues!":
    "¡Rebota por la puerta correcta para responder pistas!",
  "Catch the right gear to solve AI thinking puzzles! ⚙️🤖":
    "¡Atrapa el engranaje correcto para resolver rompecabezas de IA! ⚙️🤖",
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

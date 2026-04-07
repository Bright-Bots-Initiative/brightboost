import { TFunction } from "i18next";
import i18n from "../i18n";

/**
 * Per-locale translation maps for module and activity names from the database.
 * Keys are the English names stored in the DB; values are localized translations.
 */
const CONTENT_NAMES: Record<string, Record<string, string>> = {
  es: {
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
  },
  vi: {
    "Bounce & Buds": "Nảy và Bạn Bè",
    "Gotcha Gears": "Bánh Răng Gotcha",
    "Rhyme & Ride": "Vần và Đi",
    "Fix the Order": "Sắp Xếp Thứ Tự",
    "Build a Bot": "Xây Dựng Robot",
    "Story: Meet Buddy": "Câu chuyện: Gặp Buddy",
    "Story: Meet Rhymo": "Câu chuyện: Gặp Rhymo",
    "Story: Meet Gearbot": "Câu chuyện: Gặp Gearbot",
    "STEM-1: Introduction to Tech": "STEM-1: Giới Thiệu Công Nghệ",
    "STEM-1: Module 2 — Rhyme & Ride": "STEM-1: Bài 2 — Vần và Đi",
    "STEM-1: Module 3 — Bounce & Buds": "STEM-1: Bài 3 — Nảy và Bạn Bè",
    "STEM-1: Module 4 — Gotcha Gears": "STEM-1: Bài 4 — Bánh Răng Gotcha",
    "K-2 Intro to AI, Quantum, and Bio": "K-2 Giới thiệu AI, Lượng tử và Sinh học",
    "Put steps in order to help Boost bake! 🥣🔥🧁":
      "Sắp xếp các bước để giúp Boost nướng bánh! 🥣🔥🧁",
    "Find the rhyming word! 🎵🚲": "Tìm từ có vần! 🎵🚲",
    "Bounce through the right gate to answer clues!":
      "Nảy qua cổng đúng để trả lời câu đố!",
    "Catch the right gear to solve AI thinking puzzles! ⚙️🤖":
      "Bắt bánh răng đúng để giải câu đố AI! ⚙️🤖",
  },
  "zh-CN": {
    "Bounce & Buds": "弹跳小伙伴",
    "Gotcha Gears": "齿轮大作战",
    "Rhyme & Ride": "韵律骑行",
    "Fix the Order": "排列顺序",
    "Build a Bot": "制造机器人",
    "Story: Meet Buddy": "故事：认识Buddy",
    "Story: Meet Rhymo": "故事：认识Rhymo",
    "Story: Meet Gearbot": "故事：认识Gearbot",
    "STEM-1: Introduction to Tech": "STEM-1：科技入门",
    "STEM-1: Module 2 — Rhyme & Ride": "STEM-1：第2课 — 韵律骑行",
    "STEM-1: Module 3 — Bounce & Buds": "STEM-1：第3课 — 弹跳小伙伴",
    "STEM-1: Module 4 — Gotcha Gears": "STEM-1：第4课 — 齿轮大作战",
    "K-2 Intro to AI, Quantum, and Bio": "K-2 人工智能、量子与生物入门",
    "Put steps in order to help Boost bake! 🥣🔥🧁":
      "按顺序排列步骤，帮助Boost烘焙！🥣🔥🧁",
    "Find the rhyming word! 🎵🚲": "找到押韵的词！🎵🚲",
    "Bounce through the right gate to answer clues!":
      "弹进正确的门来回答线索！",
    "Catch the right gear to solve AI thinking puzzles! ⚙️🤖":
      "抓住正确的齿轮来解决AI思维谜题！⚙️🤖",
  },
};

/**
 * Translate a database-sourced content name based on the current language.
 * Returns the original name if no translation is available or if language is English.
 */
export function translateContentName(name: string): string {
  const lang = i18n.resolvedLanguage ?? i18n.language;
  if (lang === "en") return name;
  return CONTENT_NAMES[lang]?.[name] ?? name;
}

/**
 * Generic locale-aware content picker.
 * Given an object with per-locale values, returns the value for the current language.
 */
export function pickLocale<T>(map: Partial<Record<string, T>>, fallback: T): T {
  const lang = i18n.resolvedLanguage ?? i18n.language;
  return map[lang] ?? map.en ?? fallback;
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

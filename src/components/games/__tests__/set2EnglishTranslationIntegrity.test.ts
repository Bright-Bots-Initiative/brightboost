import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import en from "../../../locales/en/common.json";

const GAME_FILES = [
  "src/components/games/MazeMapsGame.tsx",
  "src/components/games/MoveMeasureGame.tsx",
  "src/components/games/SkyShieldGame.tsx",
  "src/components/games/FastLaneGame.tsx",
  "src/components/games/QualifyTuneRaceGame.tsx",
];

function hasKey(obj: unknown, key: string): boolean {
  let current: unknown = obj;

  for (const part of key.split(".")) {
    if (current === null || typeof current !== "object" || !(part in current)) {
      return false;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return true;
}

function extractKeys(source: string): string[] {
  const keys = new Set<string>();

  // Matches: t("games.xxx.key")
  const tRegex = /\bt\s*\(\s*["'`]([^"'`]+)["'`]/g;

  // Matches: T("patternLabel")
  const TRegex = /\bT\s*\(\s*["'`]([^"'`]+)["'`]/g;

  // Matches: labelKey: "games.mazeMaps.xxx"
  const labelKeyRegex = /labelKey\s*:\s*["'`]([^"'`]+)["'`]/g;

  let match: RegExpExecArray | null;

  while ((match = labelKeyRegex.exec(source)) !== null) {
    const key = match[1];

    if (key.includes(".")) {
      keys.add(key);
    }
  }

  while ((match = tRegex.exec(source)) !== null) {
    const key = match[1];

    // Skip template strings like `games.skyShield.${k}`
    if (key.includes("${")) {
      continue;
    }

    if (key.includes(".")) {
      keys.add(key);
    }
  }

  while ((match = TRegex.exec(source)) !== null) {
    const key = match[1];

    if (key.includes("${")) {
      continue;
    }

    keys.add(`games.skyShield.${key}`);
  }

  return [...keys];
}

describe("Set 2 English translation integrity", () => {
  const missing: string[] = [];

  for (const file of GAME_FILES) {
    const source = fs.readFileSync(path.resolve(file), "utf8");

    for (const key of extractKeys(source)) {
      if (!hasKey(en, key)) {
        missing.push(`${file}: ${key}`);
      }
    }
  }

  it("contains every translation key referenced by the Set 2 games", () => {
    if (missing.length > 0) {
      throw new Error(
        `Missing English translation keys:\n\n${missing.join("\n")}`,
      );
    }
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  GAME_KEY_ALIASES,
  declaredGameKey,
  isCompatibleGameKey,
} from "../gameSpecific";

/**
 * #876 — the backend's alias table is a guarded duplicate of the frontend
 * registry (docs/architecture/shared-code.md: similar data used for a
 * different purpose stays duplicated, but guarded). The registry maps every
 * key an activity's content may declare to a component, and the component
 * reports its own key in `result.gameKey`; two keys are aliases exactly when
 * the registry routes them to the same component.
 */
const REGISTRY = path.resolve(
  __dirname,
  "../../../../src/components/games/gameRegistry.ts",
);

function registryAliasGroups(): string[][] {
  const source = fs.readFileSync(REGISTRY, "utf8");
  const byComponent = new Map<string, string[]>();
  for (const m of source.matchAll(/^\s*([a-z][a-z0-9_]*):\s*([A-Z]\w*),/gm)) {
    const [, key, component] = m;
    byComponent.set(component, [...(byComponent.get(component) ?? []), key]);
  }
  return [...byComponent.values()]
    .filter((keys) => keys.length > 1)
    .map((keys) => [...keys].sort());
}

describe("#876 game key aliases", () => {
  it("ALIAS-1: every alias group in the frontend registry is known to the backend, and nothing else is", () => {
    const fromRegistry = registryAliasGroups().sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const fromBackend = GAME_KEY_ALIASES.map((g) => [...g].sort()).sort(
      (a, b) => a[0].localeCompare(b[0]),
    );
    expect(fromRegistry.length).toBeGreaterThan(0);
    expect(fromBackend).toEqual(fromRegistry);
  });

  it("ALIAS-2: compatibility is identity or same group, in either direction", () => {
    expect(isCompatibleGameKey("tank_trek", "tank_trek")).toBe(true);
    expect(
      isCompatibleGameKey("boost_path_planner", "sequence_drag_drop"),
    ).toBe(true);
    expect(
      isCompatibleGameKey("sequence_drag_drop", "boost_path_planner"),
    ).toBe(true);
    expect(isCompatibleGameKey("tank_trek", "quantum_quest")).toBe(false);
    expect(isCompatibleGameKey("rhymo_rhyme_rocket", "bounce_buds_unity")).toBe(
      false,
    );
  });

  it("ALIAS-3: the declared key comes from the activity's content and nothing else", () => {
    expect(declaredGameKey(JSON.stringify({ gameKey: "maze_maps" }))).toBe(
      "maze_maps",
    );
    expect(declaredGameKey("{}")).toBeUndefined();
    expect(declaredGameKey(null)).toBeUndefined();
    expect(declaredGameKey("not json")).toBeUndefined();
    expect(declaredGameKey(JSON.stringify({ gameKey: 42 }))).toBeUndefined();
  });
});

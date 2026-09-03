/**
 * Sprite determinism + accessibility (design §8, invariant 7): the SVG is a
 * pure function of the closed-enum recipe, and its art never blocks input.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import BuddySprite, { spriteKey } from "../BuddySprite";
import {
  BIOMES,
  PATTERNS,
  TRAIT_OPTIONS,
  starterRecipe,
  type BuddyRecipe,
} from "../biomeBuddyModel";

/** Strip React's per-instance ids so two renders can be compared. */
function normalize(svg: SVGSVGElement): string {
  return svg.outerHTML.replace(/bb-(body|title)-[^"]+/g, "bb-$1-X");
}

function renderSprite(
  recipe: BuddyRecipe,
  props: Partial<Parameters<typeof BuddySprite>[0]> = {},
) {
  const { container, unmount } = render(
    <BuddySprite recipe={recipe} {...props} />,
  );
  const svg = container.querySelector("svg") as SVGSVGElement;
  return { svg, unmount };
}

describe("BuddySprite", () => {
  it("same recipe → identical markup across separate renders", () => {
    const recipe = starterRecipe("water");
    recipe.traits.nose = "gills";
    recipe.pattern = "stripes";
    const a = renderSprite(recipe);
    const html1 = normalize(a.svg);
    a.unmount();
    const b = renderSprite({ ...recipe, traits: { ...recipe.traits } });
    expect(normalize(b.svg)).toBe(html1);
    expect(b.svg.getAttribute("data-sprite")).toBe(spriteKey(recipe));
  });

  it("every option of every category and every pattern/biome changes the drawing", () => {
    const base = starterRecipe("earth");
    const baseline = normalize(renderSprite(base).svg);
    const seen = new Set<string>([baseline]);
    for (const category of Object.keys(
      TRAIT_OPTIONS,
    ) as (keyof typeof TRAIT_OPTIONS)[])
      for (const option of TRAIT_OPTIONS[category]) {
        if (base.traits[category] === option) continue;
        const recipe = {
          ...base,
          traits: { ...base.traits, [category]: option },
        };
        const html = normalize(renderSprite(recipe).svg);
        expect(seen.has(html), `${category}:${option} drew nothing new`).toBe(
          false,
        );
        seen.add(html);
      }
    for (const pattern of PATTERNS) {
      if (pattern === base.pattern) continue;
      const html = normalize(renderSprite({ ...base, pattern }).svg);
      expect(seen.has(html), `pattern:${pattern}`).toBe(false);
      seen.add(html);
    }
    for (const biome of BIOMES) {
      if (biome === base.biome) continue;
      const html = normalize(renderSprite({ ...base, biome }).svg);
      expect(seen.has(html), `biome:${biome}`).toBe(false);
      seen.add(html);
    }
  });

  it("renders every layer group in a fixed order for every recipe", () => {
    const order = [
      "ring",
      "movement-behind",
      "body",
      "pattern",
      "covering",
      "movement",
      "head",
      "ears",
      "eyes",
      "nose",
      "accent",
    ];
    for (const biome of BIOMES) {
      const { svg } = renderSprite(starterRecipe(biome));
      const layers = Array.from(svg.querySelectorAll("[data-layer]")).map(
        (el) => el.getAttribute("data-layer"),
      );
      expect(layers).toEqual(order);
    }
  });

  it("supports sm / md / lg sizes", () => {
    expect(
      renderSprite(starterRecipe(), { size: "sm" }).svg.getAttribute("width"),
    ).toBe("64");
    expect(
      renderSprite(starterRecipe(), { size: "md" }).svg.getAttribute("width"),
    ).toBe("128");
    expect(
      renderSprite(starterRecipe(), { size: "lg" }).svg.getAttribute("width"),
    ).toBe("224");
  });

  it("is decorative without a label, an image WITH one; inner layers are always aria-hidden", () => {
    const decorative = renderSprite(starterRecipe()).svg;
    expect(decorative.getAttribute("aria-hidden")).toBe("true");
    expect(decorative.getAttribute("role")).toBeNull();
    const named = renderSprite(starterRecipe(), {
      label: "Sunny Roamer, an Earth Buddy",
    }).svg;
    expect(named.getAttribute("role")).toBe("img");
    expect(named.querySelector("title")?.textContent).toBe(
      "Sunny Roamer, an Earth Buddy",
    );
    expect(named.getAttribute("aria-labelledby")).toBe(
      named.querySelector("title")?.id,
    );
    expect(
      named.querySelector(".bb-sprite-body")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("never blocks interaction (pointer-events none) and drops the bob class under animate=false", () => {
    const still = renderSprite(starterRecipe(), { animate: false }).svg;
    expect(still.style.pointerEvents).toBe("none");
    expect(still.classList.contains("bb-sprite--bob")).toBe(false);
    const moving = renderSprite(starterRecipe()).svg;
    expect(moving.classList.contains("bb-sprite--bob")).toBe(true);
  });

  it("contains no external references (no <image>, no href, no url() outside the clip-path)", () => {
    for (const biome of BIOMES) {
      const recipe = starterRecipe(biome);
      recipe.pattern = "warning";
      const html = renderSprite(recipe).svg.outerHTML;
      expect(html).not.toMatch(/<image/i);
      expect(html).not.toMatch(/href=/i);
      expect(html.replace(/url\(#bb-body-[^)]+\)/g, "")).not.toMatch(/url\(/);
    }
  });
});

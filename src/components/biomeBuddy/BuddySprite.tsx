/**
 * Biome Buddy — deterministic layered SVG organism (design §8).
 *
 * The sprite is a PURE function of the closed-enum recipe: same validated
 * recipe → same markup, everywhere it is drawn (Create scene, Test & Learn,
 * gallery cards, share page, remix). No images, no uploads, no URLs — every
 * layer comes from an allowlist below, so the art is child-safe by
 * construction.
 *
 * Layer order (back → front):
 *   biome ring · wings/fins behind · body (by covering) · pattern overlay
 *   (clipped to the body) · covering detail · feet/paws · head · ears ·
 *   eyes · nose/breathing · biome accent
 *
 * Accessibility: pass `label` to expose the sprite as an image with an
 * accessible name; omit it when adjacent text already says what the Buddy
 * is (the sprite is then decorative, aria-hidden). Inner layers are always
 * aria-hidden. Motion is a CSS bob that honours prefers-reduced-motion and
 * the `animate` prop. Pointer events are off so art never blocks controls.
 */
import { useId } from "react";
import type { Biome, BuddyRecipe, Pattern } from "./biomeBuddyModel";

export type SpriteSize = "sm" | "md" | "lg";

const SIZE_PX: Record<SpriteSize, number> = { sm: 64, md: 128, lg: 224 };

interface Palette {
  body: string;
  dark: string;
  light: string;
  ring: string;
}

const BIOME_PALETTE: Record<Biome, Palette> = {
  earth: {
    body: "#8ec06c",
    dark: "#4f7d38",
    light: "#d9f0c4",
    ring: "#cfe8b8",
  },
  water: {
    body: "#63b9e6",
    dark: "#2b6f9c",
    light: "#d6f0fb",
    ring: "#bfe4f7",
  },
  fire: { body: "#efa65e", dark: "#a6561e", light: "#ffe4c2", ring: "#ffd9a8" },
  air: { body: "#a8b8d8", dark: "#5c6f99", light: "#e9eef8", ring: "#dfe9f5" },
};

const CAMO: Record<Biome, string> = {
  earth: "#a39a6a",
  water: "#7fa39a",
  fire: "#d9b98a",
  air: "#b8bcc4",
};

function palette(biome: Biome, pattern: Pattern): Palette {
  const base = BIOME_PALETTE[biome];
  if (pattern === "warning")
    return { ...base, body: "#ffd23f", dark: "#2b2b2b", light: "#fff3b0" };
  if (pattern === "camouflage") return { ...base, body: CAMO[biome] };
  return base;
}

export type SpriteRecipe = Pick<BuddyRecipe, "biome" | "traits" | "pattern">;

/** Visual identity: everything the sprite depends on, nothing else. */
export function spriteKey(recipe: SpriteRecipe): string {
  const t = recipe.traits;
  return [
    recipe.biome,
    t.eyes,
    t.ears,
    t.nose,
    t.movement,
    t.covering,
    recipe.pattern,
  ].join("|");
}

// ── Geometry constants (viewBox 0 0 200 200) ───────────────────────────────
const BODY = { cx: 100, cy: 122, rx: 54, ry: 44 };
const HEAD = { cx: 100, cy: 72, r: 32 };

function BodyShape({
  covering,
  fill,
  stroke,
}: {
  covering: string;
  fill: string;
  stroke: string;
}) {
  if (covering === "hard_shell") {
    // dome shell over a small under-body
    return (
      <>
        <ellipse
          cx={BODY.cx}
          cy={BODY.cy + 18}
          rx={40}
          ry={22}
          fill={fill}
          stroke={stroke}
          strokeWidth={3}
        />
        <path
          d={`M ${BODY.cx - 56} ${BODY.cy + 8} A 56 50 0 0 1 ${BODY.cx + 56} ${BODY.cy + 8} Z`}
          fill={stroke}
          stroke={stroke}
          strokeWidth={3}
        />
        <path
          d={`M ${BODY.cx - 48} ${BODY.cy + 6} A 48 42 0 0 1 ${BODY.cx + 48} ${BODY.cy + 6} Z`}
          fill={fill}
        />
      </>
    );
  }
  return (
    <ellipse
      cx={BODY.cx}
      cy={BODY.cy}
      rx={BODY.rx}
      ry={BODY.ry}
      fill={fill}
      stroke={stroke}
      strokeWidth={3}
    />
  );
}

function CoveringDetail({
  covering,
  dark,
  light,
}: {
  covering: string;
  dark: string;
  light: string;
}) {
  switch (covering) {
    case "short_fur":
      return (
        <g fill={dark} opacity={0.55}>
          {[-40, -20, 0, 20, 40].map((dx) => (
            <path
              key={dx}
              d={`M ${BODY.cx + dx - 4} ${BODY.cy - 40} l 4 -9 l 4 9 z`}
            />
          ))}
        </g>
      );
    case "long_fur":
      return (
        <g fill={dark} opacity={0.6}>
          {[-48, -36, -24, -12, 0, 12, 24, 36, 48].map((dx) => (
            <path
              key={dx}
              d={`M ${BODY.cx + dx - 6} ${BODY.cy - 36} l 6 -22 l 6 22 z`}
            />
          ))}
          {[-50, -30, -10, 10, 30, 50].map((dx) => (
            <path
              key={`b${dx}`}
              d={`M ${BODY.cx + dx - 6} ${BODY.cy + 36} l 6 20 l 6 -20 z`}
            />
          ))}
        </g>
      );
    case "smooth_scales":
      return (
        <g fill="none" stroke={dark} strokeWidth={2} opacity={0.55}>
          {[0, 1, 2].map((row) =>
            [-30, -10, 10, 30].map((dx) => (
              <path
                key={`${row}-${dx}`}
                d={`M ${BODY.cx + dx + (row % 2 ? 10 : 0) - 10} ${BODY.cy - 18 + row * 16} q 10 12 20 0`}
              />
            )),
          )}
        </g>
      );
    case "keeled_scales":
      return (
        <g fill={dark} opacity={0.65}>
          {[-36, -18, 0, 18, 36].map((dx) => (
            <path
              key={dx}
              d={`M ${BODY.cx + dx} ${BODY.cy - 46} l 7 10 l -7 10 l -7 -10 z`}
            />
          ))}
          {[-27, -9, 9, 27].map((dx) => (
            <path
              key={`r${dx}`}
              d={`M ${BODY.cx + dx} ${BODY.cy - 24} l 6 9 l -6 9 l -6 -9 z`}
            />
          ))}
        </g>
      );
    case "hard_shell":
      return (
        <g fill="none" stroke={dark} strokeWidth={2.5} opacity={0.8}>
          <path
            d={`M ${BODY.cx - 20} ${BODY.cy + 4} l 10 -18 l 20 0 l 10 18 l -10 18 l -20 0 z`}
          />
          <path d={`M ${BODY.cx - 44} ${BODY.cy + 4} l 12 -14 l 12 -4`} />
          <path d={`M ${BODY.cx + 44} ${BODY.cy + 4} l -12 -14 l -12 -4`} />
        </g>
      );
    case "feathers":
      return (
        <g fill={light} stroke={dark} strokeWidth={1.5} opacity={0.85}>
          {[-30, -10, 10, 30].map((dx) => (
            <path
              key={dx}
              d={`M ${BODY.cx + dx} ${BODY.cy - 34} q 8 12 0 30 q -8 -18 0 -30 z`}
            />
          ))}
          {[-20, 0, 20].map((dx) => (
            <path
              key={`f${dx}`}
              d={`M ${BODY.cx + dx} ${BODY.cy - 8} q 8 12 0 30 q -8 -18 0 -30 z`}
            />
          ))}
        </g>
      );
    default:
      return null;
  }
}

function PatternOverlay({
  pattern,
  clipId,
  dark,
  light,
}: {
  pattern: Pattern;
  clipId: string;
  dark: string;
  light: string;
}) {
  switch (pattern) {
    case "stripes":
      return (
        <g clipPath={`url(#${clipId})`} fill={dark} opacity={0.5}>
          {[-36, -12, 12, 36].map((dx) => (
            <rect
              key={dx}
              x={BODY.cx + dx - 5}
              y={BODY.cy - 60}
              width={10}
              height={120}
            />
          ))}
        </g>
      );
    case "spots":
      return (
        <g clipPath={`url(#${clipId})`} fill={dark} opacity={0.45}>
          {[
            [-30, -12],
            [-8, -24],
            [18, -10],
            [36, 8],
            [-20, 16],
            [6, 14],
            [24, 26],
          ].map(([dx, dy]) => (
            <circle
              key={`${dx}${dy}`}
              cx={BODY.cx + dx}
              cy={BODY.cy + dy}
              r={7}
            />
          ))}
        </g>
      );
    case "countershading":
      return (
        <g clipPath={`url(#${clipId})`}>
          <rect
            x={BODY.cx - 70}
            y={BODY.cy - 60}
            width={140}
            height={60}
            fill={dark}
            opacity={0.45}
          />
          <rect
            x={BODY.cx - 70}
            y={BODY.cy + 8}
            width={140}
            height={60}
            fill={light}
            opacity={0.7}
          />
        </g>
      );
    case "warning":
      return (
        <g clipPath={`url(#${clipId})`} fill={dark}>
          {[-30, 0, 30].map((dx) => (
            <rect
              key={dx}
              x={BODY.cx + dx - 7}
              y={BODY.cy - 60}
              width={14}
              height={120}
            />
          ))}
        </g>
      );
    case "camouflage":
      return (
        <g clipPath={`url(#${clipId})`} fill={dark} opacity={0.22}>
          <ellipse cx={BODY.cx - 22} cy={BODY.cy - 8} rx={16} ry={10} />
          <ellipse cx={BODY.cx + 18} cy={BODY.cy + 12} rx={20} ry={11} />
          <ellipse cx={BODY.cx + 8} cy={BODY.cy - 22} rx={12} ry={7} />
        </g>
      );
    default:
      return null;
  }
}

function MovementBehind({
  movement,
  body,
  dark,
}: {
  movement: string;
  body: string;
  dark: string;
}) {
  if (movement === "wings")
    return (
      <g fill={body} stroke={dark} strokeWidth={3}>
        <path
          d={`M ${BODY.cx - 40} ${BODY.cy - 10} q -55 -60 -40 -100 q 10 40 40 50 q 20 -30 30 -10 q -10 40 -30 60 z`}
        />
        <path
          d={`M ${BODY.cx + 40} ${BODY.cy - 10} q 55 -60 40 -100 q -10 40 -40 50 q -20 -30 -30 -10 q 10 40 30 60 z`}
        />
      </g>
    );
  if (movement === "fins")
    return (
      <g fill={body} stroke={dark} strokeWidth={3}>
        <path
          d={`M ${BODY.cx + 48} ${BODY.cy + 8} l 34 -26 l -4 26 l 4 26 z`}
        />
        <path d={`M ${BODY.cx - 10} ${BODY.cy - 40} l 10 -26 l 14 26 z`} />
      </g>
    );
  return null;
}

function MovementFront({
  movement,
  body,
  dark,
  light,
}: {
  movement: string;
  body: string;
  dark: string;
  light: string;
}) {
  switch (movement) {
    case "fins":
      return (
        <g fill={body} stroke={dark} strokeWidth={3}>
          <path d={`M ${BODY.cx - 30} ${BODY.cy + 22} l -26 26 l 34 -6 z`} />
          <path d={`M ${BODY.cx + 26} ${BODY.cy + 24} l 22 26 l -34 -8 z`} />
        </g>
      );
    case "webbed_feet":
      return (
        <g fill={body} stroke={dark} strokeWidth={3} strokeLinejoin="round">
          <path
            d={`M ${BODY.cx - 34} ${BODY.cy + 36} l -20 26 l 12 -4 l 6 8 l 6 -8 l 12 4 z`}
          />
          <path
            d={`M ${BODY.cx + 34} ${BODY.cy + 36} l 20 26 l -12 -4 l -6 8 l -6 -8 l -12 4 z`}
          />
        </g>
      );
    case "claws":
      return (
        <g stroke={dark} strokeWidth={3} strokeLinecap="round">
          <g fill={body}>
            <rect
              x={BODY.cx - 40}
              y={BODY.cy + 30}
              width={16}
              height={30}
              rx={7}
            />
            <rect
              x={BODY.cx + 24}
              y={BODY.cy + 30}
              width={16}
              height={30}
              rx={7}
            />
          </g>
          <g fill="none">
            {[-40, -32, -24].map((dx) => (
              <path key={dx} d={`M ${BODY.cx + dx} ${BODY.cy + 60} l 0 10`} />
            ))}
            {[24, 32, 40].map((dx) => (
              <path key={dx} d={`M ${BODY.cx + dx} ${BODY.cy + 60} l 0 10`} />
            ))}
          </g>
        </g>
      );
    case "padded_paws":
      return (
        <g stroke={dark} strokeWidth={3}>
          <g fill={body}>
            <ellipse cx={BODY.cx - 30} cy={BODY.cy + 48} rx={16} ry={12} />
            <ellipse cx={BODY.cx + 30} cy={BODY.cy + 48} rx={16} ry={12} />
          </g>
          <g fill={light} stroke="none">
            {[-38, -30, -22, 22, 30, 38].map((dx) => (
              <circle key={dx} cx={BODY.cx + dx} cy={BODY.cy + 44} r={3} />
            ))}
            <ellipse cx={BODY.cx - 30} cy={BODY.cy + 52} rx={6} ry={4} />
            <ellipse cx={BODY.cx + 30} cy={BODY.cy + 52} rx={6} ry={4} />
          </g>
        </g>
      );
    case "wings":
      return (
        <g fill={dark}>
          <path
            d={`M ${BODY.cx - 12} ${BODY.cy + 42} l -6 16 l 4 0 l 2 -6 l 2 6 l 4 0 z`}
          />
          <path
            d={`M ${BODY.cx + 12} ${BODY.cy + 42} l 6 16 l -4 0 l -2 -6 l -2 6 l -4 0 z`}
          />
        </g>
      );
    default:
      return null;
  }
}

function Ears({
  ears,
  body,
  dark,
  light,
}: {
  ears: string;
  body: string;
  dark: string;
  light: string;
}) {
  switch (ears) {
    case "pinna":
      return (
        <g fill={body} stroke={dark} strokeWidth={3} strokeLinejoin="round">
          <path d={`M ${HEAD.cx - 24} ${HEAD.cy - 18} l -18 -40 l 30 22 z`} />
          <path d={`M ${HEAD.cx + 24} ${HEAD.cy - 18} l 18 -40 l -30 22 z`} />
          <path
            d={`M ${HEAD.cx - 22} ${HEAD.cy - 20} l -10 -24 l 18 14 z`}
            fill={light}
            stroke="none"
          />
          <path
            d={`M ${HEAD.cx + 22} ${HEAD.cy - 20} l 10 -24 l -18 14 z`}
            fill={light}
            stroke="none"
          />
        </g>
      );
    case "hidden_ears":
      return (
        <g fill={dark} opacity={0.7}>
          <circle cx={HEAD.cx - 27} cy={HEAD.cy + 2} r={2.5} />
          <circle cx={HEAD.cx + 27} cy={HEAD.cy + 2} r={2.5} />
        </g>
      );
    case "tympanum":
      return (
        <g fill={light} stroke={dark} strokeWidth={2.5}>
          <circle cx={HEAD.cx - 24} cy={HEAD.cy + 6} r={8} />
          <circle cx={HEAD.cx + 24} cy={HEAD.cy + 6} r={8} />
        </g>
      );
    case "jaw_vibration":
      return (
        <g fill="none" stroke={dark} strokeWidth={2.5} strokeLinecap="round">
          <path d={`M ${HEAD.cx - 26} ${HEAD.cy + 16} q 26 14 52 0`} />
          <path
            d={`M ${HEAD.cx - 40} ${HEAD.cy + 24} q -6 6 0 12`}
            opacity={0.6}
          />
          <path
            d={`M ${HEAD.cx + 40} ${HEAD.cy + 24} q 6 6 0 12`}
            opacity={0.6}
          />
        </g>
      );
    default:
      return null;
  }
}

function Eyes({
  eyes,
  dark,
  light,
}: {
  eyes: string;
  dark: string;
  light: string;
}) {
  switch (eyes) {
    case "no_eyes":
      return (
        <g fill="none" stroke={dark} strokeWidth={2} opacity={0.5}>
          <circle
            cx={HEAD.cx - 12}
            cy={HEAD.cy - 2}
            r={6}
            strokeDasharray="3 3"
          />
          <circle
            cx={HEAD.cx + 12}
            cy={HEAD.cy - 2}
            r={6}
            strokeDasharray="3 3"
          />
        </g>
      );
    case "rotating_eyes":
      return (
        <g stroke={dark} strokeWidth={2.5}>
          <g fill={light}>
            <circle cx={HEAD.cx - 16} cy={HEAD.cy - 8} r={11} />
            <circle cx={HEAD.cx + 16} cy={HEAD.cy - 8} r={11} />
          </g>
          <g fill={dark} stroke="none">
            <circle cx={HEAD.cx - 20} cy={HEAD.cy - 12} r={4} />
            <circle cx={HEAD.cx + 21} cy={HEAD.cy - 4} r={4} />
          </g>
        </g>
      );
    case "wide_set_eyes":
      return (
        <g stroke={dark} strokeWidth={2.5}>
          <g fill="#ffffff">
            <ellipse cx={HEAD.cx - 24} cy={HEAD.cy - 4} rx={8} ry={10} />
            <ellipse cx={HEAD.cx + 24} cy={HEAD.cy - 4} rx={8} ry={10} />
          </g>
          <g fill={dark} stroke="none">
            <circle cx={HEAD.cx - 25} cy={HEAD.cy - 3} r={4} />
            <circle cx={HEAD.cx + 25} cy={HEAD.cy - 3} r={4} />
          </g>
        </g>
      );
    case "compound_eyes":
      return (
        <g stroke={dark} strokeWidth={2.5}>
          <g fill={light}>
            <ellipse cx={HEAD.cx - 15} cy={HEAD.cy - 4} rx={13} ry={14} />
            <ellipse cx={HEAD.cx + 15} cy={HEAD.cy - 4} rx={13} ry={14} />
          </g>
          <g fill={dark} stroke="none" opacity={0.6}>
            {[-15, 15].map((cx) =>
              [
                [0, 0],
                [-5, -5],
                [5, -5],
                [-5, 5],
                [5, 5],
                [0, -9],
                [0, 9],
              ].map(([dx, dy]) => (
                <circle
                  key={`${cx}${dx}${dy}`}
                  cx={HEAD.cx + cx + dx}
                  cy={HEAD.cy - 4 + dy}
                  r={2}
                />
              )),
            )}
          </g>
        </g>
      );
    default:
      return null;
  }
}

function Nose({ nose, dark }: { nose: string; dark: string }) {
  switch (nose) {
    case "gills":
      return (
        <g fill="none" stroke={dark} strokeWidth={2.5} strokeLinecap="round">
          {[0, 6, 12].map((dy) => (
            <path
              key={dy}
              d={`M ${HEAD.cx - 30} ${HEAD.cy + 18 + dy} q 6 3 12 0`}
            />
          ))}
          {[0, 6, 12].map((dy) => (
            <path
              key={`r${dy}`}
              d={`M ${HEAD.cx + 18} ${HEAD.cy + 18 + dy} q 6 3 12 0`}
            />
          ))}
        </g>
      );
    case "nose_lungs":
      return (
        <g fill={dark}>
          <ellipse cx={HEAD.cx} cy={HEAD.cy + 14} rx={7} ry={5} />
          <circle
            cx={HEAD.cx - 3}
            cy={HEAD.cy + 14}
            r={1.5}
            fill="#fff"
            opacity={0.6}
          />
        </g>
      );
    case "forked_tongue":
      return (
        <g fill="none" stroke="#d94a6a" strokeWidth={3} strokeLinecap="round">
          <path d={`M ${HEAD.cx} ${HEAD.cy + 22} l 0 14 l -6 8`} />
          <path d={`M ${HEAD.cx} ${HEAD.cy + 36} l 6 8`} />
        </g>
      );
    case "spiracles":
      return (
        <g fill={dark} opacity={0.8}>
          {[-30, -18, -6, 6, 18, 30].map((dx) => (
            <circle key={dx} cx={BODY.cx + dx} cy={BODY.cy + 2} r={2.5} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

function BiomeAccent({ biome, dark }: { biome: Biome; dark: string }) {
  switch (biome) {
    case "earth":
      return (
        <path
          d="M 160 176 q 12 -18 26 -4 q -14 2 -26 4 z"
          fill="#4f7d38"
          opacity={0.9}
        />
      );
    case "water":
      return (
        <g fill="none" stroke="#2b6f9c" strokeWidth={2} opacity={0.8}>
          <circle cx={166} cy={40} r={4} />
          <circle cx={176} cy={28} r={2.5} />
        </g>
      );
    case "fire":
      return (
        <circle
          cx={170}
          cy={34}
          r={10}
          fill="#ffb347"
          stroke="#e08a2b"
          strokeWidth={2}
        />
      );
    case "air":
      return (
        <path
          d="M 150 32 q 8 -10 18 -2 q 10 -8 16 4 q -8 6 -34 -2 z"
          fill="#ffffff"
          stroke={dark}
          strokeWidth={1.5}
          opacity={0.9}
        />
      );
    default:
      return null;
  }
}

export interface BuddySpriteProps {
  recipe: SpriteRecipe;
  size?: SpriteSize;
  /** Accessible name. Omit to mark the sprite decorative (aria-hidden). */
  label?: string;
  animate?: boolean;
  className?: string;
}

export default function BuddySprite({
  recipe,
  size = "md",
  label,
  animate = true,
  className = "",
}: BuddySpriteProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clipId = `bb-body-${uid}`;
  const titleId = `bb-title-${uid}`;
  const px = SIZE_PX[size];
  const p = palette(recipe.biome, recipe.pattern);
  const { traits } = recipe;
  const decorative = !label;

  return (
    <svg
      viewBox="0 0 200 200"
      width={px}
      height={px}
      className={`bb-sprite bb-sprite--${size} ${animate ? "bb-sprite--bob" : ""} ${className}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-labelledby={decorative ? undefined : titleId}
      data-sprite={spriteKey(recipe)}
      focusable="false"
      style={{ pointerEvents: "none", display: "block" }}
    >
      {!decorative && <title id={titleId}>{label}</title>}
      <defs>
        <clipPath id={clipId}>
          {traits.covering === "hard_shell" ? (
            <path
              d={`M ${BODY.cx - 48} ${BODY.cy + 6} A 48 42 0 0 1 ${BODY.cx + 48} ${BODY.cy + 6} Z`}
            />
          ) : (
            <ellipse cx={BODY.cx} cy={BODY.cy} rx={BODY.rx} ry={BODY.ry} />
          )}
        </clipPath>
      </defs>
      <g aria-hidden="true" className="bb-sprite-body">
        <circle
          data-layer="ring"
          cx={100}
          cy={112}
          r={88}
          fill={p.ring}
          opacity={0.9}
        />
        <g data-layer="movement-behind">
          <MovementBehind
            movement={traits.movement}
            body={p.body}
            dark={p.dark}
          />
        </g>
        <g data-layer="body">
          <BodyShape covering={traits.covering} fill={p.body} stroke={p.dark} />
        </g>
        <g data-layer="pattern">
          <PatternOverlay
            pattern={recipe.pattern}
            clipId={clipId}
            dark={p.dark}
            light={p.light}
          />
        </g>
        <g data-layer="covering">
          <CoveringDetail
            covering={traits.covering}
            dark={p.dark}
            light={p.light}
          />
        </g>
        <g data-layer="movement">
          <MovementFront
            movement={traits.movement}
            body={p.body}
            dark={p.dark}
            light={p.light}
          />
        </g>
        <g data-layer="head">
          <circle
            cx={HEAD.cx}
            cy={HEAD.cy}
            r={HEAD.r}
            fill={p.body}
            stroke={p.dark}
            strokeWidth={3}
          />
        </g>
        <g data-layer="ears">
          <Ears
            ears={traits.ears}
            body={p.body}
            dark={p.dark}
            light={p.light}
          />
        </g>
        <g data-layer="eyes">
          <Eyes eyes={traits.eyes} dark={p.dark} light={p.light} />
        </g>
        <g data-layer="nose">
          <Nose nose={traits.nose} dark={p.dark} />
        </g>
        <g data-layer="accent">
          <BiomeAccent biome={recipe.biome} dark={p.dark} />
        </g>
      </g>
    </svg>
  );
}

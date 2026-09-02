/**
 * Biome Buddy — original SVG biome backdrops (design §6: no stock art,
 * reduced-motion-safe, purely decorative). Children render on top.
 */
import type { ReactNode } from "react";
import type { Biome } from "./biomeBuddyModel";

function EarthScene() {
  return (
    <>
      <rect width="400" height="240" fill="#dff1c7" />
      <rect y="150" width="400" height="90" fill="#8b6b43" />
      <rect y="140" width="400" height="16" fill="#6f9a48" />
      {[30, 110, 250, 340].map((x) => (
        <g key={x}>
          <rect x={x - 5} y="80" width="10" height="70" fill="#7a5230" />
          <circle cx={x} cy="72" r="34" fill="#4f9a3a" />
          <circle cx={x - 18} cy="88" r="22" fill="#5fae45" />
          <circle cx={x + 18} cy="90" r="22" fill="#5fae45" />
        </g>
      ))}
      {[60, 150, 210, 290, 370].map((x, i) => (
        <ellipse
          key={x}
          cx={x}
          cy={170 + (i % 2) * 20}
          rx="12"
          ry="5"
          fill="#c98a4b"
          opacity="0.7"
        />
      ))}
    </>
  );
}

function WaterScene() {
  return (
    <>
      <rect width="400" height="240" fill="#d7f0fb" />
      <circle cx="340" cy="44" r="22" fill="#ffe27a" />
      <rect y="110" width="400" height="130" fill="#5db8e6" />
      <rect y="110" width="400" height="10" fill="#8fd2f2" />
      {[40, 130, 230, 320].map((x, i) => (
        <ellipse
          key={x}
          cx={x}
          cy={150 + i * 18}
          rx="34"
          ry="5"
          fill="none"
          stroke="#bfe6f8"
          strokeWidth="3"
        />
      ))}
      {[20, 34, 380, 366].map((x) => (
        <g key={x}>
          <rect x={x - 2} y="60" width="4" height="60" fill="#5f8f3a" />
          <ellipse cx={x} cy="60" rx="5" ry="12" fill="#7a5a2a" />
        </g>
      ))}
    </>
  );
}

function FireScene() {
  return (
    <>
      <rect width="400" height="240" fill="#ffe1b3" />
      <circle cx="80" cy="50" r="26" fill="#ff9c4a" />
      <path
        d="M 0 150 Q 100 100 200 150 T 400 150 V 240 H 0 Z"
        fill="#f0b565"
      />
      <path
        d="M 0 180 Q 120 140 240 185 T 400 175 V 240 H 0 Z"
        fill="#e39a45"
      />
      <path d="M 250 160 l 30 -60 l 40 60 z" fill="#5a4038" />
      <path d="M 274 118 l 6 -18 l 10 18 z" fill="#ff6a3d" />
      {[60, 150, 330].map((x) => (
        <path
          key={x}
          d={`M ${x} 200 l 0 -22 M ${x - 8} 192 l 8 -6 M ${x + 8} 190 l -8 -6`}
          stroke="#3f7a3a"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </>
  );
}

function AirScene() {
  return (
    <>
      <rect width="400" height="240" fill="#dbe9f9" />
      <rect width="400" height="120" fill="#c5dcf5" />
      {[
        [70, 50, 26],
        [110, 44, 32],
        [150, 54, 22],
        [300, 90, 24],
        [335, 84, 30],
      ].map(([x, y, r]) => (
        <circle
          key={`${x}${y}`}
          cx={x}
          cy={y}
          r={r}
          fill="#ffffff"
          opacity="0.95"
        />
      ))}
      <path
        d="M 0 240 V 120 l 40 -30 l 30 40 l 30 -20 l 20 40 V 240 Z"
        fill="#7d8aa3"
      />
      <path
        d="M 400 240 V 140 l -50 -40 l -30 50 l -20 -10 V 240 Z"
        fill="#8e9bb3"
      />
      <path d="M 0 240 V 200 Q 200 170 400 210 V 240 Z" fill="#a7b4c8" />
    </>
  );
}

const SCENES: Record<Biome, () => JSX.Element> = {
  earth: EarthScene,
  water: WaterScene,
  fire: FireScene,
  air: AirScene,
};

export interface BiomeSceneProps {
  biome: Biome;
  children?: ReactNode;
  className?: string;
  /** Height in CSS; the SVG covers it (xMidYMid slice). */
  minHeight?: number | string;
}

export default function BiomeScene({
  biome,
  children,
  className = "",
  minHeight = 220,
}: BiomeSceneProps) {
  const Scene = SCENES[biome];
  return (
    <div
      className={`bb-scene relative overflow-hidden rounded-3xl ${className}`}
      style={{ minHeight }}
      data-biome={biome}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 240"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <Scene />
      </svg>
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}

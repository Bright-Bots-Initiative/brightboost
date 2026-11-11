import type { Signals } from "./model";

/** Original code-drawn characters; signals never rely on color alone. */
export function Bot({
  pose = "wide",
  partner = false,
}: {
  pose?: Signals["pose"];
  partner?: boolean;
}) {
  const handY = pose === "up" ? 40 : pose === "wide" ? 94 : 146;
  return (
    <svg className="sparbot" viewBox="0 0 220 220" aria-hidden="true">
      <ellipse cx="110" cy="199" rx="74" ry="10" fill="#263449" opacity=".1" />
      <g
        stroke="#263449"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={`M65 102 31 ${handY} M155 102 189 ${handY}`} fill="none" />
        <circle
          cx="29"
          cy={handY}
          r="12"
          fill={partner ? "#77c6c1" : "#ffae92"}
        />
        <circle
          cx="191"
          cy={handY}
          r="12"
          fill={partner ? "#77c6c1" : "#ffae92"}
        />
        <path d="M86 157 80 187 M134 157 140 187 M68 190H88 M132 190H152" />
        <rect
          x="64"
          y="88"
          width="92"
          height="77"
          rx="27"
          fill={partner ? "#77c6c1" : "#ee7962"}
        />
        <path d="M110 47V28" />
        <circle cx="110" cy="22" r="8" fill="#f5c868" />
        <rect
          x="49"
          y="44"
          width="122"
          height="67"
          rx={partner ? 20 : 30}
          fill="#fff9eb"
        />
        <path d="M80 73v7 M140 73v7 M99 87q11 10 22 0" fill="none" />
        {partner ? (
          <path d="m110 125 12 19H98Z" fill="#fff9eb" strokeWidth="3" />
        ) : (
          <circle cx="110" cy="138" r="13" fill="#fff9eb" strokeWidth="3" />
        )}
      </g>
    </svg>
  );
}
export function Light({ shape }: { shape: Signals["light"] }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      {shape === "triangle" ? (
        <path d="M14 3 26 25H2Z" fill="#ad3729" />
      ) : shape === "circle" ? (
        <circle cx="14" cy="14" r="11" fill="#1b7483" />
      ) : (
        <rect x="3" y="3" width="22" height="22" rx="2" fill="#7650a3" />
      )}
    </svg>
  );
}

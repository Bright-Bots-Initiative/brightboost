import type { Draft, Move, Signals } from "./model";

type Motion = Move | Draft["finish"] | "idle" | "wave" | "train";

/** Original code-drawn characters; signals never rely on color alone. */
export function Bot({
  pose = "wide",
  partner = false,
  motion = "idle",
}: {
  pose?: Signals["pose"];
  partner?: boolean;
  motion?: Motion;
}) {
  const handY = pose === "up" ? 40 : pose === "wide" ? 94 : 146;
  return (
    <svg
      className="sparbot"
      viewBox="0 0 220 220"
      aria-hidden="true"
      data-motion={motion}
      data-partner={partner}
    >
      <ellipse
        className="sparbot-shadow"
        cx="110"
        cy="199"
        rx="74"
        ry="10"
        fill="#263449"
        opacity=".1"
      />
      <g className="sparbot-motion" key={motion}>
        <g
          className="sparbot-body"
          stroke="#263449"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g className="sparbot-arm sparbot-arm-left">
            <path d={`M65 102 31 ${handY}`} fill="none" />
            <circle
              cx="29"
              cy={handY}
              r="12"
              fill={partner ? "#77c6c1" : "#ffae92"}
            />
          </g>
          <g className="sparbot-arm sparbot-arm-right">
            <path d={`M155 102 189 ${handY}`} fill="none" />
            <circle
              cx="191"
              cy={handY}
              r="12"
              fill={partner ? "#77c6c1" : "#ffae92"}
            />
          </g>
          <path d="M86 157 80 187 M134 157 140 187 M68 190H88 M132 190H152" />
          <rect
            x="64"
            y="88"
            width="92"
            height="77"
            rx="27"
            fill={partner ? "#77c6c1" : "#ee7962"}
          />
          <g className="sparbot-antenna">
            <path d="M110 47V28" />
            <circle cx="110" cy="22" r="8" fill="#f5c868" />
          </g>
          <rect
            x="49"
            y="44"
            width="122"
            height="67"
            rx={partner ? 20 : 30}
            fill="#fff9eb"
          />
          <path className="sparbot-eyes" d="M80 73v7 M140 73v7" fill="none" />
          <path d="M99 87q11 10 22 0" fill="none" />
          {partner ? (
            <path d="m110 125 12 19H98Z" fill="#fff9eb" strokeWidth="3" />
          ) : (
            <circle cx="110" cy="138" r="13" fill="#fff9eb" strokeWidth="3" />
          )}
        </g>
      </g>
      {(motion === "tap" || motion === "spin" || motion === "block") && (
        <g
          key={`effect-${motion}`}
          className="sparbot-move-effect"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
        >
          {motion === "block" && (
            <path
              d="m110 92 49 18v29q0 36-49 50-49-14-49-50v-29Z"
              fill="#d4f3ec"
              fillOpacity=".65"
              stroke="#28796e"
            />
          )}
          {motion === "spin" && (
            <path
              d="M31 155q-18 31 72 32m84-42q26 30-55 39m-39-8 12 11-14 9"
              stroke="#92531b"
            />
          )}
          {motion === "tap" && (
            <path
              d={
                partner
                  ? "M18 78 8 69m10 26H5m13 17-10 9"
                  : "m202 78 10-9m-10 26h13m-13 17 10 9"
              }
              stroke="#aa342b"
            />
          )}
        </g>
      )}
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

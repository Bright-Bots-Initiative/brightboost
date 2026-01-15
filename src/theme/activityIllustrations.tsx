import React from "react";

export type ImageKey =
  | "module_sequencing"
  | "mission_cake"
  | "mission_hands"
  | "type_story"
  | "type_quiz"
  | "type_game"
  | "step_pour"
  | "step_bake"
  | "step_frost"
  | "step_eat"
  | "step_water_on"
  | "step_wash"
  | "step_soap"
  | "step_rinse"
  | "step_dry";

const DefaultSvg = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const ILLUSTRATIONS: Record<
  ImageKey,
  React.FC<React.SVGProps<SVGSVGElement>>
> = {
  module_sequencing: (props) => (
    <svg viewBox="0 0 100 60" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="10" y="10" width="20" height="40" rx="4" className="fill-brightboost-blue/20" />
      <path d="M35 30H45" strokeDasharray="4 4" />
      <rect x="50" y="10" width="20" height="40" rx="4" className="fill-brightboost-yellow/20" />
      <path d="M75 30H85" strokeDasharray="4 4" />
      <rect x="90" y="10" width="20" height="40" rx="4" className="fill-brightboost-green/20" />
    </svg>
  ),
  mission_cake: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" className="fill-brightboost-yellow/20" />
      <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
      <path d="M2 21h20" />
      <path d="M7 8v3" />
      <path d="M12 8v3" />
      <path d="M17 8v3" />
      <path d="M7 4h.01" strokeWidth="3" className="text-brightboost-yellow" />
      <path d="M12 4h.01" strokeWidth="3" className="text-brightboost-yellow" />
      <path d="M17 4h.01" strokeWidth="3" className="text-brightboost-yellow" />
    </svg>
  ),
  mission_hands: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M18 6L6 18" className="text-brightboost-blue/40" />
      <path d="M6 6l12 12" className="text-brightboost-blue/40" />
      <path
        d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"
        className="fill-brightboost-lightblue/20"
      />
      <path d="M8 12c0 3 2 5 4 5s4-2 4-5" />
    </svg>
  ),
  type_story: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
        className="fill-brightboost-lightblue/20"
      />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
        className="fill-brightboost-lightblue/10"
      />
    </svg>
  ),
  type_quiz: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="10" className="fill-brightboost-yellow/10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  ),
  type_game: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" className="fill-brightboost-green/20" />
    </svg>
  ),
  step_pour: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M16 4h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
      <path d="M12 2L8 10h8L12 2z" className="fill-brightboost-lightblue/20" />
    </svg>
  ),
  step_bake: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="6" width="18" height="14" rx="2" className="fill-brightboost-yellow/10" />
      <path d="M3 10h18" />
      <path d="M12 14v2" />
      <path d="M8 14v2" />
      <path d="M16 14v2" />
    </svg>
  ),
  step_frost: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path
        d="M12 2C9 2 7 4 7 7c0 1.5.5 3 2 4v7h6v-7c1.5-1 2-2.5 2-4 0-3-2-5-5-5z"
        className="fill-brightboost-yellow/20"
      />
    </svg>
  ),
  step_eat: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="10" className="fill-brightboost-green/10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </svg>
  ),
  step_water_on: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M20 6h-6V4a2 2 0 0 0-2-2h-1" />
      <path d="M8 6h5v12c0 2 2 4 4 4" />
      <path d="M12 12l-2 8" className="stroke-brightboost-blue" />
      <path d="M10 14l-2 6" className="stroke-brightboost-blue" />
    </svg>
  ),
  step_wash: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="9" className="fill-brightboost-lightblue/10" />
      <path d="M12 8c-2 0-3 2-3 4s1 4 3 4 3-2 3-4-1-4-3-4z" />
    </svg>
  ),
  step_soap: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="6" y="10" width="12" height="8" rx="2" className="fill-brightboost-yellow/20" />
      <path d="M12 6v4" />
      <path d="M8 10v-1a2 2 0 0 1 4 0" />
    </svg>
  ),
  step_rinse: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 2v20" className="stroke-brightboost-blue" />
      <path d="M8 10l-2 10" className="stroke-brightboost-blue" />
      <path d="M16 10l2 10" className="stroke-brightboost-blue" />
    </svg>
  ),
  step_dry: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="5" y="4" width="14" height="16" rx="2" className="fill-slate-100" />
      <path d="M9 20V4" />
      <path d="M15 20V4" />
    </svg>
  ),
};

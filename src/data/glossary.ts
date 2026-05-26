/**
 * Glossary catalog — registry of slug + category for every cyber-vocab term
 * surfaced across Pathways. Translatable content (term, shortDef, longDef,
 * examples) lives in `src/locales/<lang>/pathways.json` under
 * `pathways.glossary.terms.<slug>.*`.
 *
 * UI components (GlossaryTerm, GlossaryPage) resolve the display fields via
 * the i18n `t()` function so adding a translation never touches this file.
 *
 * Adding a new term:
 *   1. Add `{ slug, category }` here.
 *   2. Add `pathways.glossary.terms.<slug>.{term,shortDef,longDef?,examples?}`
 *      to en/pathways.json (mirror to es/vi/zh-CN with placeholder English).
 *   3. Reference it via `[[slug|inline label]]` in module content or
 *      `<GlossaryTerm term="slug">label</GlossaryTerm>`.
 *
 * The badge thresholds (25/50/100 views) are count-based and don't care
 * about which terms a student has seen.
 */
export type GlossaryCategory =
  | "foundations"
  | "identity"
  | "networks"
  | "threats"
  | "grc"
  | "tools";

export interface GlossaryEntry {
  slug: string;
  category: GlossaryCategory;
}

export const GLOSSARY: GlossaryEntry[] = [
  // ─── Foundations ───────────────────────────────────────────────────────
  { slug: "cybersecurity", category: "foundations" },
  { slug: "cia-triad", category: "foundations" },
  { slug: "threat", category: "foundations" },
  { slug: "vulnerability", category: "foundations" },
  { slug: "risk", category: "foundations" },
  { slug: "exploit", category: "foundations" },
  { slug: "patch", category: "foundations" },

  // ─── Identity & Access ─────────────────────────────────────────────────
  { slug: "mfa", category: "identity" },
  { slug: "2fa", category: "identity" },
  { slug: "authentication", category: "identity" },
  { slug: "authorization", category: "identity" },
  { slug: "password-manager", category: "identity" },

  // ─── Networks ──────────────────────────────────────────────────────────
  { slug: "ip-address", category: "networks" },
  { slug: "dns", category: "networks" },
  { slug: "packet", category: "networks" },
  { slug: "firewall", category: "networks" },
  { slug: "vpn", category: "networks" },
  { slug: "http-https", category: "networks" },
  { slug: "port", category: "networks" },

  // ─── Threats ───────────────────────────────────────────────────────────
  { slug: "phishing", category: "threats" },
  { slug: "smishing", category: "threats" },
  { slug: "vishing", category: "threats" },
  { slug: "ransomware", category: "threats" },
  { slug: "malware", category: "threats" },
  { slug: "social-engineering", category: "threats" },
  { slug: "breach", category: "threats" },
  { slug: "ddos", category: "threats" },

  // ─── GRC ───────────────────────────────────────────────────────────────
  { slug: "grc", category: "grc" },
  { slug: "governance", category: "grc" },
  { slug: "compliance", category: "grc" },
  { slug: "audit", category: "grc" },
  { slug: "hipaa", category: "grc" },
  { slug: "pci-dss", category: "grc" },
  { slug: "gdpr", category: "grc" },
  { slug: "nist-csf", category: "grc" },
  { slug: "control", category: "grc" },

  // ─── Tools ─────────────────────────────────────────────────────────────
  { slug: "log", category: "tools" },
  { slug: "soc", category: "tools" },
  { slug: "siem", category: "tools" },
  { slug: "sandbox", category: "tools" },
  { slug: "encryption", category: "tools" },
  { slug: "hash", category: "tools" },
];

/**
 * Ordered list of categories used for rendering the glossary page. Source of
 * truth for the page order — keep in sync with GlossaryCategory.
 */
export const CATEGORY_ORDER: GlossaryCategory[] = [
  "foundations",
  "identity",
  "networks",
  "threats",
  "grc",
  "tools",
];

export function findTerm(slug: string): GlossaryEntry | undefined {
  return GLOSSARY.find((t) => t.slug === slug);
}

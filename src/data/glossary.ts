/**
 * Glossary catalog — short, accessible definitions for cyber vocabulary
 * that appears across Pathways content.
 *
 * Each term has:
 *   slug      — stable id used in <GlossaryTerm term="..." />, DB rows
 *   term      — display form (whatever the student sees)
 *   shortDef  — one-sentence definition pitched at K-2/Pathways reading level
 *   longDef   — optional fuller explanation, shown below shortDef
 *   category  — bucket for the glossary browser page
 *   examples  — optional list of real-world examples
 *
 * Add new terms freely. The badge thresholds (25/50/100 views) are
 * count-based and don't care about which terms a student has seen.
 */
export type GlossaryCategory =
  | "foundations"
  | "identity"
  | "networks"
  | "threats"
  | "grc"
  | "tools";

export interface GlossaryTermDef {
  slug: string;
  term: string;
  shortDef: string;
  longDef?: string;
  category: GlossaryCategory;
  examples?: string[];
}

export const GLOSSARY: GlossaryTermDef[] = [
  // ─── Foundations ───────────────────────────────────────────────────────
  {
    slug: "cybersecurity",
    term: "cybersecurity",
    shortDef:
      "The practice of protecting computers, networks, and data from attacks.",
    category: "foundations",
  },
  {
    slug: "cia-triad",
    term: "CIA Triad",
    shortDef:
      "The three goals of security: Confidentiality, Integrity, Availability.",
    category: "foundations",
  },
  {
    slug: "threat",
    term: "threat",
    shortDef: "Anything that could harm a system or its data.",
    category: "foundations",
  },
  {
    slug: "vulnerability",
    term: "vulnerability",
    shortDef: "A weakness in a system that an attacker could exploit.",
    category: "foundations",
  },
  {
    slug: "risk",
    term: "risk",
    shortDef:
      "The chance that something bad happens, multiplied by how bad it would be.",
    category: "foundations",
  },
  {
    slug: "exploit",
    term: "exploit",
    shortDef:
      "A method or tool that uses a vulnerability to attack a system.",
    category: "foundations",
  },
  {
    slug: "patch",
    term: "patch",
    shortDef: "A fix released by software makers to close a vulnerability.",
    category: "foundations",
  },

  // ─── Identity & Access ─────────────────────────────────────────────────
  {
    slug: "mfa",
    term: "MFA",
    shortDef:
      "Multi-Factor Authentication — using two or more things to prove who you are.",
    longDef:
      "Examples: a password PLUS a code from your phone, or a password PLUS a fingerprint.",
    category: "identity",
    examples: [
      "Bank login asking for a text code",
      "Snapchat asking for a code from an authenticator app",
    ],
  },
  {
    slug: "2fa",
    term: "2FA",
    shortDef:
      "Two-Factor Authentication — same as MFA but specifically two factors.",
    category: "identity",
  },
  {
    slug: "authentication",
    term: "authentication",
    shortDef: "Proving you are who you claim to be.",
    category: "identity",
  },
  {
    slug: "authorization",
    term: "authorization",
    shortDef:
      "Deciding what you're allowed to do once we know who you are.",
    category: "identity",
  },
  {
    slug: "password-manager",
    term: "password manager",
    shortDef:
      "An app that stores all your passwords safely so you don't have to remember them.",
    longDef: "We recommend Bitwarden — free and trustworthy.",
    category: "identity",
  },

  // ─── Networks ──────────────────────────────────────────────────────────
  {
    slug: "ip-address",
    term: "IP address",
    shortDef:
      "A number that identifies a device on a network. Like a street address for computers.",
    category: "networks",
    examples: ["192.168.1.1", "8.8.8.8"],
  },
  {
    slug: "dns",
    term: "DNS",
    shortDef:
      "Domain Name System — translates website names (google.com) into IP addresses computers can use.",
    category: "networks",
  },
  {
    slug: "packet",
    term: "packet",
    shortDef:
      "A small piece of data that travels across a network. Like a digital envelope.",
    category: "networks",
  },
  {
    slug: "firewall",
    term: "firewall",
    shortDef:
      "A digital gate that decides what traffic is allowed in and out of a network.",
    category: "networks",
  },
  {
    slug: "vpn",
    term: "VPN",
    shortDef:
      "Virtual Private Network — a secure tunnel for your internet traffic.",
    category: "networks",
  },
  {
    slug: "http-https",
    term: "HTTP vs HTTPS",
    shortDef:
      "HTTP sends data in plain text. HTTPS encrypts it. The S means secure.",
    category: "networks",
  },
  {
    slug: "port",
    term: "port",
    shortDef:
      'A numbered "door" on a computer where different services run. Like apartment numbers in a building.',
    category: "networks",
    examples: [
      "Port 80 = web (HTTP)",
      "Port 443 = secure web (HTTPS)",
      "Port 22 = SSH",
    ],
  },

  // ─── Threats ───────────────────────────────────────────────────────────
  {
    slug: "phishing",
    term: "phishing",
    shortDef:
      "A fake message (email, text, call) trying to trick you into giving up info or clicking a bad link.",
    category: "threats",
    examples: [
      'Fake "your account is locked" email',
      'Text from "FedEx" about a delivery',
    ],
  },
  {
    slug: "smishing",
    term: "smishing",
    shortDef: "Phishing via SMS text message.",
    category: "threats",
  },
  {
    slug: "vishing",
    term: "vishing",
    shortDef:
      "Phishing via voice call. The attacker calls and impersonates someone.",
    category: "threats",
  },
  {
    slug: "ransomware",
    term: "ransomware",
    shortDef: "Malware that locks your files until you pay the attacker.",
    category: "threats",
  },
  {
    slug: "malware",
    term: "malware",
    shortDef:
      'Any software designed to harm or steal from a computer. Short for "malicious software".',
    category: "threats",
  },
  {
    slug: "social-engineering",
    term: "social engineering",
    shortDef:
      "Tricking people instead of hacking computers. Pretending to be IT support to get a password is social engineering.",
    category: "threats",
  },
  {
    slug: "breach",
    term: "breach",
    shortDef:
      "When attackers successfully access data they shouldn't have.",
    category: "threats",
  },
  {
    slug: "ddos",
    term: "DDoS",
    shortDef:
      "Distributed Denial of Service — overwhelming a server with traffic to take it offline.",
    category: "threats",
  },

  // ─── GRC ───────────────────────────────────────────────────────────────
  {
    slug: "grc",
    term: "GRC",
    shortDef:
      "Governance, Risk, and Compliance — the rules-and-rules-following side of cybersecurity.",
    longDef:
      "GRC professionals make sure organizations follow laws, manage risks, and have policies that work. Most accessible entry path in cyber.",
    category: "grc",
  },
  {
    slug: "governance",
    term: "governance",
    shortDef:
      "The rules and decision-making structure for how an organization handles security.",
    category: "grc",
  },
  {
    slug: "compliance",
    term: "compliance",
    shortDef:
      "Proving you follow specific rules — laws, industry standards, internal policies.",
    category: "grc",
  },
  {
    slug: "audit",
    term: "audit",
    shortDef:
      "A formal review to check if security controls actually work.",
    category: "grc",
  },
  {
    slug: "hipaa",
    term: "HIPAA",
    shortDef:
      "US law protecting health information. Applies to doctors, hospitals, insurance.",
    category: "grc",
  },
  {
    slug: "pci-dss",
    term: "PCI-DSS",
    shortDef:
      "Rules for any business that handles credit card payments.",
    category: "grc",
  },
  {
    slug: "gdpr",
    term: "GDPR",
    shortDef:
      "European law protecting personal data. Applies to anyone serving EU residents.",
    category: "grc",
  },
  {
    slug: "nist-csf",
    term: "NIST CSF",
    shortDef:
      "A US government framework: Identify, Protect, Detect, Respond, Recover.",
    category: "grc",
  },
  {
    slug: "control",
    term: "control",
    shortDef:
      "A specific measure put in place to reduce risk. Examples: passwords, firewalls, training.",
    category: "grc",
  },

  // ─── Tools ─────────────────────────────────────────────────────────────
  {
    slug: "log",
    term: "log",
    shortDef:
      "A record of what happened on a system — who logged in, what they did, when.",
    category: "tools",
  },
  {
    slug: "soc",
    term: "SOC",
    shortDef:
      "Security Operations Center — the team that watches for and responds to attacks.",
    category: "tools",
  },
  {
    slug: "siem",
    term: "SIEM",
    shortDef:
      "A system that collects logs from across an organization to spot attacks.",
    category: "tools",
  },
  {
    slug: "sandbox",
    term: "sandbox",
    shortDef:
      "A safe, isolated environment where you can test things without affecting real systems.",
    category: "tools",
  },
  {
    slug: "encryption",
    term: "encryption",
    shortDef:
      "Scrambling data so only someone with the right key can read it.",
    category: "tools",
  },
  {
    slug: "hash",
    term: "hash",
    shortDef:
      "A one-way scramble. You can hash a password, but you can't un-hash it back.",
    category: "tools",
  },
];

export const CATEGORY_META: Record<
  GlossaryCategory,
  { label: string; description: string }
> = {
  foundations: {
    label: "Foundations",
    description: "Core ideas every cyber person uses every day.",
  },
  identity: {
    label: "Identity & Access",
    description: "How systems decide who you are and what you can do.",
  },
  networks: {
    label: "Networks",
    description: "How data moves between devices, and how attackers try to listen in.",
  },
  threats: {
    label: "Threats",
    description: "Specific attacks you'll learn to recognize and defend against.",
  },
  grc: {
    label: "GRC",
    description: "Governance, risk, and compliance — the rules-and-policies side of cyber.",
  },
  tools: {
    label: "Tools",
    description: "Concepts and systems analysts and engineers work with day to day.",
  },
};

export function findTerm(slug: string): GlossaryTermDef | undefined {
  return GLOSSARY.find((t) => t.slug === slug);
}

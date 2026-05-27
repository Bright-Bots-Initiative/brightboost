#!/usr/bin/env node
/**
 * Idempotent deep-merge of new translation keys into all locale pathways.json.
 *
 * For en: writes values verbatim.
 * For es: writes only NEW keys with English placeholder values, preserving
 *         every existing Spanish translation.
 * For vi/zh-CN: writes only NEW keys with English placeholder values
 *               (bootstrapped from en — locale will fall back to en at runtime
 *               for any missing key anyway).
 */
const fs = require("fs");
const path = require("path");

const NEW_KEYS = {
  pathways: {
    gamification: {
      level: "Level {{n}}",
      xpProgress: "{{current}}/{{needed}} XP",
      streak: "Streak",
      streakDayOne: "{{count}} day",
      streakDayPlural: "{{count}} days",
      streakFreezeOne: "{{count}} freeze",
      streakFreezePlural: "{{count}} freezes",
      bestStreak: "best: {{count}}",
      badges: "Badges",
    },
    dailyGoals: {
      heading: "Today's Goals",
      bonus: "+{{xp}} XP bonus ✓",
    },
    celebration: {
      levelUpEyebrow: "Level Up!",
      levelLabel: "Level {{n}}",
      badgeEyebrow: "Badge Earned",
      dismiss: "Nice",
    },
    labs: {
      shell: {
        backToTrack: "Back",
        labLabel: "Lab",
        beforeYouStart: "Before You Start",
        timeLabel: "Time",
        timeValue: "~{{minutes}} minutes",
        assumesLabel: "Assumes you know",
        outputLabel: "You'll produce",
        startCta: "Start lab →",
      },
      ethics: {
        eyebrow: "Before You Start",
        title: "Ethics & Authorization",
        body: "Everything you do in this lab runs in our sandbox — there are no real targets and no real victims. The skills are real. Using them on systems you don't have permission to test is illegal, no matter how curious you are. We're training defenders, not attackers.",
        rules: {
          one: "Only test systems you own or have written permission to test.",
          two: "Never share credentials or attack tools casually — context matters.",
          three: "If in doubt, ask a facilitator.",
        },
        ackCta: "I understand — start the lab",
      },
    },
    challenges: {
      toolboxIntro: {
        heading: "Meet Your Toolbox",
        close: "Close",
        intro:
          "Real cybersecurity professionals don't memorize ciphers or compute hex by hand. They use tools — and so will you.",
        toolboxTitle: "Toolbox",
        toolboxBody:
          "Every challenge has tools designed for it — cipher decoders, hex converters, port references, network calculators, and more. They live in a panel on the right (on mobile, tap the {{toolsButton}} button in the bottom corner).",
        toolsButton: "Tools",
        scratchPadTitle: "Scratch Pad",
        scratchPadBody:
          "A notepad for your work. Notes, attempts, partial answers — anything. Auto-saves while you work. It sits right below the Toolbox.",
        hintsTitle: "Hints",
        hintsBody:
          "Stuck? Every challenge has 3 progressive hints. Using them doesn't cost you any XP — it just helps your facilitator see where group instruction might help.",
        outro:
          "The challenge isn't to do everything in your head. The challenge is to recognize problems and use the right tool.",
        ackCta: "Got it — let's solve some puzzles",
      },
    },
    onboarding: {
      layout: {
        stepLabel: "Step {{current}} of {{total}}",
        stepCurrentAria: "Step {{n}} (current)",
        stepDoneAria: "Step {{n}} (done)",
        stepDefaultAria: "Step {{n}}",
        skipToDashboard: "Skip to dashboard",
        back: "Back",
        continue: "Continue →",
      },
    },
    glossary: {
      page: {
        title: "Glossary",
        subtitle:
          "Every term you'll see across Pathways, with plain-language definitions. Open a term anywhere in the platform and we'll mark it viewed here.",
        progressFooter: "terms learned",
        seenLabel: "viewed",
      },
      term: {
        unknownSlug: 'Unknown glossary slug "{{slug}}"',
        examplesHeading: "Examples",
      },
      categories: {
        foundations: {
          label: "Foundations",
          description: "Core ideas every cyber person uses every day.",
        },
        identity: {
          label: "Identity & Access",
          description:
            "How systems decide who you are and what you can do.",
        },
        networks: {
          label: "Networks",
          description:
            "How data moves between devices, and how attackers try to listen in.",
        },
        threats: {
          label: "Threats",
          description:
            "Specific attacks you'll learn to recognize and defend against.",
        },
        grc: {
          label: "GRC",
          description:
            "Governance, risk, and compliance — the rules-and-policies side of cyber.",
        },
        tools: {
          label: "Tools",
          description:
            "Concepts and systems analysts and engineers work with day to day.",
        },
      },
      terms: {
        // ─── Foundations ──────────────────────────────────────────────────
        cybersecurity: {
          term: "cybersecurity",
          shortDef:
            "The practice of protecting computers, networks, and data from attacks.",
        },
        "cia-triad": {
          term: "CIA Triad",
          shortDef:
            "The three goals of security: Confidentiality, Integrity, Availability.",
        },
        threat: {
          term: "threat",
          shortDef: "Anything that could harm a system or its data.",
        },
        vulnerability: {
          term: "vulnerability",
          shortDef:
            "A weakness in a system that an attacker could exploit.",
        },
        risk: {
          term: "risk",
          shortDef:
            "The chance that something bad happens, multiplied by how bad it would be.",
        },
        exploit: {
          term: "exploit",
          shortDef:
            "A method or tool that uses a vulnerability to attack a system.",
        },
        patch: {
          term: "patch",
          shortDef:
            "A fix released by software makers to close a vulnerability.",
        },

        // ─── Identity & Access ────────────────────────────────────────────
        mfa: {
          term: "MFA",
          shortDef:
            "Multi-Factor Authentication — using two or more things to prove who you are.",
          longDef:
            "Examples: a password PLUS a code from your phone, or a password PLUS a fingerprint.",
          examples: [
            "Bank login asking for a text code",
            "Snapchat asking for a code from an authenticator app",
          ],
        },
        "2fa": {
          term: "2FA",
          shortDef:
            "Two-Factor Authentication — same as MFA but specifically two factors.",
        },
        authentication: {
          term: "authentication",
          shortDef: "Proving you are who you claim to be.",
        },
        authorization: {
          term: "authorization",
          shortDef:
            "Deciding what you're allowed to do once we know who you are.",
        },
        "password-manager": {
          term: "password manager",
          shortDef:
            "An app that stores all your passwords safely so you don't have to remember them.",
          longDef: "We recommend Bitwarden — free and trustworthy.",
        },

        // ─── Networks ─────────────────────────────────────────────────────
        "ip-address": {
          term: "IP address",
          shortDef:
            "A number that identifies a device on a network. Like a street address for computers.",
          examples: ["192.168.1.1", "8.8.8.8"],
        },
        dns: {
          term: "DNS",
          shortDef:
            "Domain Name System — translates website names (google.com) into IP addresses computers can use.",
        },
        packet: {
          term: "packet",
          shortDef:
            "A small piece of data that travels across a network. Like a digital envelope.",
        },
        firewall: {
          term: "firewall",
          shortDef:
            "A digital gate that decides what traffic is allowed in and out of a network.",
        },
        vpn: {
          term: "VPN",
          shortDef:
            "Virtual Private Network — a secure tunnel for your internet traffic.",
        },
        "http-https": {
          term: "HTTP vs HTTPS",
          shortDef:
            "HTTP sends data in plain text. HTTPS encrypts it. The S means secure.",
        },
        port: {
          term: "port",
          shortDef:
            'A numbered "door" on a computer where different services run. Like apartment numbers in a building.',
          examples: [
            "Port 80 = web (HTTP)",
            "Port 443 = secure web (HTTPS)",
            "Port 22 = SSH",
          ],
        },

        // ─── Threats ──────────────────────────────────────────────────────
        phishing: {
          term: "phishing",
          shortDef:
            "A fake message (email, text, call) trying to trick you into giving up info or clicking a bad link.",
          examples: [
            'Fake "your account is locked" email',
            'Text from "FedEx" about a delivery',
          ],
        },
        smishing: {
          term: "smishing",
          shortDef: "Phishing via SMS text message.",
        },
        vishing: {
          term: "vishing",
          shortDef:
            "Phishing via voice call. The attacker calls and impersonates someone.",
        },
        ransomware: {
          term: "ransomware",
          shortDef:
            "Malware that locks your files until you pay the attacker.",
        },
        malware: {
          term: "malware",
          shortDef:
            'Any software designed to harm or steal from a computer. Short for "malicious software".',
        },
        "social-engineering": {
          term: "social engineering",
          shortDef:
            "Tricking people instead of hacking computers. Pretending to be IT support to get a password is social engineering.",
        },
        breach: {
          term: "breach",
          shortDef:
            "When attackers successfully access data they shouldn't have.",
        },
        ddos: {
          term: "DDoS",
          shortDef:
            "Distributed Denial of Service — overwhelming a server with traffic to take it offline.",
        },

        // ─── GRC ──────────────────────────────────────────────────────────
        grc: {
          term: "GRC",
          shortDef:
            "Governance, Risk, and Compliance — the rules-and-rules-following side of cybersecurity.",
          longDef:
            "GRC professionals make sure organizations follow laws, manage risks, and have policies that work. Most accessible entry path in cyber.",
        },
        governance: {
          term: "governance",
          shortDef:
            "The rules and decision-making structure for how an organization handles security.",
        },
        compliance: {
          term: "compliance",
          shortDef:
            "Proving you follow specific rules — laws, industry standards, internal policies.",
        },
        audit: {
          term: "audit",
          shortDef:
            "A formal review to check if security controls actually work.",
        },
        hipaa: {
          term: "HIPAA",
          shortDef:
            "US law protecting health information. Applies to doctors, hospitals, insurance.",
        },
        "pci-dss": {
          term: "PCI-DSS",
          shortDef:
            "Rules for any business that handles credit card payments.",
        },
        gdpr: {
          term: "GDPR",
          shortDef:
            "European law protecting personal data. Applies to anyone serving EU residents.",
        },
        "nist-csf": {
          term: "NIST CSF",
          shortDef:
            "A US government framework: Identify, Protect, Detect, Respond, Recover.",
        },
        control: {
          term: "control",
          shortDef:
            "A specific measure put in place to reduce risk. Examples: passwords, firewalls, training.",
        },

        // ─── Tools ────────────────────────────────────────────────────────
        log: {
          term: "log",
          shortDef:
            "A record of what happened on a system — who logged in, what they did, when.",
        },
        soc: {
          term: "SOC",
          shortDef:
            "Security Operations Center — the team that watches for and responds to attacks.",
        },
        siem: {
          term: "SIEM",
          shortDef:
            "A system that collects logs from across an organization to spot attacks.",
        },
        sandbox: {
          term: "sandbox",
          shortDef:
            "A safe, isolated environment where you can test things without affecting real systems.",
        },
        encryption: {
          term: "encryption",
          shortDef:
            "Scrambling data so only someone with the right key can read it.",
        },
        hash: {
          term: "hash",
          shortDef:
            "A one-way scramble. You can hash a password, but you can't un-hash it back.",
        },
      },
    },
  },
};

/** Deep-merge `source` into `target`, leaving existing leaf values untouched. */
function mergePreserve(target, source) {
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    if (
      srcVal !== null &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal)
    ) {
      if (
        target[key] === null ||
        typeof target[key] !== "object" ||
        Array.isArray(target[key])
      ) {
        target[key] = {};
      }
      mergePreserve(target[key], srcVal);
    } else if (!(key in target)) {
      target[key] = srcVal;
    }
  }
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
}

const root = path.resolve(__dirname, "..");
const files = {
  en: path.join(root, "src/locales/en/pathways.json"),
  es: path.join(root, "src/locales/es/pathways.json"),
  vi: path.join(root, "src/locales/vi/pathways.json"),
  "zh-CN": path.join(root, "src/locales/zh-CN/pathways.json"),
};

for (const [loc, p] of Object.entries(files)) {
  const data = loadJson(p);
  mergePreserve(data, NEW_KEYS);
  writeJson(p, data);
  console.log(`merged into ${loc}`);
}

/**
 * CTF Challenges — backend validation mirror.
 *
 * Only the validation-essential fields are mirrored here: slug, category,
 * difficulty, flag, hints, xpReward. Full content (scenario, materials,
 * etc.) lives in the frontend catalog at src/constants/ctfChallenges.ts.
 *
 * If a challenge's slug, flag, hints, category, difficulty, or xpReward
 * changes on the frontend, update this file too. (Both files are authored
 * by hand for now; revisit when the catalog grows past ~50 challenges.)
 */
export type CtfCategory = "cryptography" | "web" | "forensics" | "networks";
export type CtfDifficulty = "easy" | "medium" | "hard" | "expert";

export interface CtfServerChallenge {
  slug: string;
  category: CtfCategory;
  difficulty: CtfDifficulty;
  flag: string;
  hints: [string, string, string];
  xpReward: number;
}

export const CTF_CHALLENGES_SERVER: CtfServerChallenge[] = [
  // Cryptography
  {
    slug: "caesars-secret",
    category: "cryptography",
    difficulty: "easy",
    flag: "theflagisautumnleaves",
    xpReward: 10,
    hints: [
      "Caesar ciphers shift each letter by a fixed amount. Try shifting back by 3.",
      "Start with 'W' — if you shift it back 3 positions, what letter do you get?",
      "Shift each letter back by 3. W→T, K→H, H→E… continue the pattern.",
    ],
  },
  {
    slug: "backwards-mind",
    category: "cryptography",
    difficulty: "easy",
    flag: "ifireversethesewordsthentheflagisstoredcode",
    xpReward: 5,
    hints: [
      "Try reading the message right to left.",
      "Reverse the entire string character by character.",
      "The decoded message starts with 'If I reverse these words…'",
    ],
  },
  {
    slug: "base64-buddy",
    category: "cryptography",
    difficulty: "easy",
    flag: "theflagissilverlining",
    xpReward: 10,
    hints: [
      "This is base64-encoded text. Most browsers can decode it via DevTools.",
      "Open browser DevTools console and try: atob('VGhlZmxhZ2lzc2lsdmVybGluaW5n')",
      "The decoded value starts with 'The flag is…'",
    ],
  },
  {
    slug: "hex-hunt",
    category: "cryptography",
    difficulty: "easy",
    flag: "the flag is cipherspace.",
    xpReward: 10,
    hints: [
      "Hex pairs (two characters at a time) represent ASCII codes.",
      "Try a hex-to-ASCII converter. Browser DevTools: parseInt('74', 16) = 116, then String.fromCharCode(116) = 't'.",
      "The decoded text begins with 'the flag is…'",
    ],
  },
  {
    slug: "layered-mystery",
    category: "cryptography",
    difficulty: "hard",
    flag: "theflagisdeeplyhidden",
    xpReward: 50,
    hints: [
      "Start by base64-decoding the message. The result will still look scrambled.",
      "Then reverse the string. It'll look like a single Caesar cipher.",
      "Finally, Caesar-decode with the toolbox set to shift = 7.",
    ],
  },
  {
    slug: "vigenere-visit",
    category: "cryptography",
    difficulty: "hard",
    flag: "theflagisrivermouth",
    xpReward: 50,
    hints: [
      "Vigenère shifts each letter by the corresponding letter of the keyword (A=0, B=1, etc), repeating the keyword as needed.",
      "Keyword NILE means shifts of N(13), I(8), L(11), E(4), then repeat. First letter G shifted back by 13 = T.",
      "Use an online Vigenère decoder with key 'NILE'. The plaintext starts with 'theflagis…'",
    ],
  },
  {
    slug: "rsa-rookie",
    category: "cryptography",
    difficulty: "expert",
    flag: "65",
    xpReward: 100,
    hints: [
      "Find d: the modular inverse of e (17) modulo φ(n) (3120). Hint: d × 17 ≡ 1 (mod 3120).",
      "d = 2753. (Verify: 17 × 2753 = 46801 = 15 × 3120 + 1, so 17 × 2753 ≡ 1 mod 3120.)",
      "Now compute m = c^d mod n = 2790^2753 mod 3233 = 65.",
    ],
  },
  // Web
  {
    slug: "hidden-in-plain-sight",
    category: "web",
    difficulty: "easy",
    flag: "hidden_treasure_2026",
    xpReward: 10,
    hints: [
      "HTML comments start with <!-- and end with -->. Look carefully.",
      "Check inside the <head> tag.",
      "The flag is inside the comment in the <head> section.",
    ],
  },
  {
    slug: "robots-reveals",
    category: "web",
    difficulty: "easy",
    flag: "/private/secret_keys_2026",
    xpReward: 10,
    hints: [
      "Look at the lines starting with 'Disallow:'",
      "One of the paths is more specific than the others.",
      "The flag is the path that mentions 'secret_keys'.",
    ],
  },
  {
    slug: "cookie-crumbs",
    category: "web",
    difficulty: "medium",
    flag: "flag_decoded_via_cookies",
    xpReward: 25,
    hints: [
      "Look at the cookies table. Find the one labeled 'auth_token'.",
      "The flag is the value column for auth_token.",
      "Auth tokens are sensitive — the cookie value IS the flag.",
    ],
  },
  {
    slug: "path-traversal",
    category: "web",
    difficulty: "medium",
    flag: "/files/..backup/flag.txt",
    xpReward: 25,
    hints: [
      "Web servers can expose hidden directories. Look at the curl listing — what extra directory appears?",
      "The directory is named '..backup/'. What file should be inside if there's a flag?",
      "Build the path: /files/ + the hidden directory + flag.txt",
    ],
  },
  {
    slug: "form-field-sleuth",
    category: "web",
    difficulty: "medium",
    flag: "hidden_field_treasure",
    xpReward: 25,
    hints: [
      "Look for input fields with type='hidden'.",
      "There are two hidden fields. One is for CSRF protection; the other contains the flag.",
      "The flag is the value of the 'form_flag' hidden field.",
    ],
  },
  {
    slug: "api-investigation",
    category: "web",
    difficulty: "expert",
    flag: "api_response_treasure_unlocked",
    xpReward: 100,
    hints: [
      "The response is JSON. Navigate the nested structure.",
      "Look inside user.metadata. There are 3 fields there.",
      "The flag is the value of user.metadata.deprecated_flag.",
    ],
  },
  // Forensics
  {
    slug: "image-metadata",
    category: "forensics",
    difficulty: "easy",
    flag: "metadata_revealed_the_truth",
    xpReward: 10,
    hints: [
      "Look at the EXIF metadata fields. One of them is a text comment.",
      "The Comment field often contains user-added text.",
      "The flag is the value of the Comment field.",
    ],
  },
  {
    slug: "file-type-confusion",
    category: "forensics",
    difficulty: "easy",
    flag: "png",
    xpReward: 10,
    hints: [
      "Look at the first bytes in hex.",
      "Match the first 4 bytes against the file signatures table.",
      "The signature 89 50 4E 47 matches PNG.",
    ],
  },
  {
    slug: "log-file-hunt",
    category: "forensics",
    difficulty: "medium",
    flag: "bob",
    xpReward: 25,
    hints: [
      "Look at the country codes (in parentheses) for each login.",
      "Most logins are from US. One is not.",
      "The user with the foreign login (NG = Nigeria) is the answer.",
    ],
  },
  {
    slug: "email-header-detective",
    category: "forensics",
    difficulty: "medium",
    flag: "scammydomain.net",
    xpReward: 25,
    hints: [
      "The 'From:' line can be spoofed. The 'Received:' chain shows actual mail servers.",
      "Read the Received chain bottom-up. The first received line shows the original sender.",
      "The earliest 'Received:' line shows mail-out.scammydomain.net — that's the actual sender's domain.",
    ],
  },
  {
    slug: "packet-capture-pursuit",
    category: "forensics",
    difficulty: "hard",
    flag: "plaintext_in_the_wire",
    xpReward: 50,
    hints: [
      "Look at the HTTP POST request body. The form data has username and password fields.",
      "The body is URL-encoded: field=value&field=value.",
      "The password field value is the flag.",
    ],
  },
  {
    slug: "steganography-surprise",
    category: "forensics",
    difficulty: "expert",
    flag: "flagiss",
    xpReward: 100,
    hints: [
      "Look at the first letter of each line.",
      "Read them in order top to bottom: F, L, A, G, I, S, S.",
      "Combining: 'flagiss' — that's the flag.",
    ],
  },
  // Networks
  {
    slug: "ping-the-pattern",
    category: "networks",
    difficulty: "easy",
    flag: "192.168.1.7",
    xpReward: 10,
    hints: [
      "Look at the response times. Most are 1-5ms.",
      "One value is much higher than the rest.",
      "192.168.1.7 has a 312ms response — orders of magnitude slower.",
    ],
  },
  {
    slug: "port-scan-read",
    category: "networks",
    difficulty: "easy",
    flag: "6666",
    xpReward: 10,
    hints: [
      "Web servers normally use ports 80, 443, and sometimes 8080.",
      "One port is for a chat protocol (IRC).",
      "Port 6666 (IRC) is unusual for a web server.",
    ],
  },
  {
    slug: "dns-detective",
    category: "networks",
    difficulty: "medium",
    flag: "dns_records_tell_stories",
    xpReward: 25,
    hints: [
      "Look at the TXT records.",
      "There are two TXT records. One is for email authentication (SPF). The other contains a flag.",
      "The TXT record starting with 'flag=' contains the answer.",
    ],
  },
  {
    slug: "firewall-find",
    category: "networks",
    difficulty: "easy",
    flag: "10.0.5.0/24",
    xpReward: 10,
    hints: [
      "Look for ALLOW rules with port 22 (SSH).",
      "Rule 1 specifies the source subnet for SSH access.",
      "The source CIDR in rule 1 is the flag.",
    ],
  },
  {
    slug: "subnet-sleuth",
    category: "networks",
    difficulty: "hard",
    flag: "192.168.11.50",
    xpReward: 50,
    hints: [
      "The subnet is 192.168.10.0/24. The /24 means the first 3 octets must match (192.168.10).",
      "Look at the third octet of each device IP.",
      "Device E has 192.168.11.x — that 11 doesn't match 10.",
    ],
  },
  {
    slug: "routing-riddle",
    category: "networks",
    difficulty: "expert",
    flag: "router d",
    xpReward: 100,
    hints: [
      "Trace the packet from 10.1.1.5 step by step. Router A's default goes to Router B.",
      "Router B forwards 192.168.x.x traffic to Router C.",
      "Router C has a specific rule for 192.168.50.0/24 — it goes to Router D.",
    ],
  },
];

const BY_SLUG = new Map(CTF_CHALLENGES_SERVER.map((c) => [c.slug, c]));

export function getServerChallenge(slug: string): CtfServerChallenge | undefined {
  return BY_SLUG.get(slug);
}

/** Compare submitted flag with the canonical answer (case-insensitive, trim). */
export function flagsMatch(submitted: string, canonical: string): boolean {
  return submitted.trim().toLowerCase() === canonical.trim().toLowerCase();
}

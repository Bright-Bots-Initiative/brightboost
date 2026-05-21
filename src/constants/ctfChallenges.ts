/**
 * CTF Challenges 2.0 — frontend catalog.
 *
 * All challenge content lives here; the backend keeps a minimal mirror of
 * (slug, flag, hints, category, difficulty, xpReward) for validation and
 * badge logic. Edit content in this file; if the validation-essential
 * fields change for an existing challenge, sync `backend/src/data/ctfChallenges.ts`
 * (regenerate from this catalog).
 */
export type CtfCategory = "cryptography" | "web" | "forensics" | "networks";
export type CtfDifficulty = "easy" | "medium" | "hard" | "expert";

export interface CtfMaterial {
  type: "text" | "code" | "image" | "table" | "file_download";
  content: string;
  language?: string;
  caption?: string;
}

export interface CtfChallenge {
  slug: string;
  category: CtfCategory;
  difficulty: CtfDifficulty;
  title: string;
  description: string;
  scenario: string;
  prompt: string;
  materials: CtfMaterial[];
  flag: string;
  flagFormat: string;
  hints: [string, string, string];
  skills: string[];
  estimatedMinutes: number;
  xpReward: number;
  beforeYouStart: string[];
}

// ─── Cryptography (6) ──────────────────────────────────────────────────────

export const CRYPTOGRAPHY_CHALLENGES: CtfChallenge[] = [
  {
    slug: "caesars-secret",
    category: "cryptography",
    difficulty: "easy",
    title: "Caesar's Secret",
    description:
      "A general's message has been scrambled with one of the oldest ciphers in history.",
    scenario:
      "You've intercepted a message that appears to be encoded. The pattern looks familiar — letters shifted by a fixed amount. Can you decode it and find the flag?",
    prompt: "Decode the message below. The flag is the decoded text.",
    materials: [
      {
        type: "code",
        content: "WKHIODJLVDXWXPQOHDYHV",
        caption: "Encoded message — shift each letter back to find the flag",
      },
      {
        type: "text",
        content:
          "Hint: A Caesar cipher shifts every letter by the same number of positions in the alphabet.",
      },
    ],
    flag: "theflagisautumnleaves",
    flagFormat: "all lowercase, no spaces",
    hints: [
      "Caesar ciphers shift each letter by a fixed amount. Try shifting back by 3.",
      "Start with 'W' — if you shift it back 3 positions, what letter do you get?",
      "Shift each letter back by 3. W→T, K→H, H→E… continue the pattern.",
    ],
    skills: ["pattern recognition", "cryptography basics"],
    estimatedMinutes: 5,
    xpReward: 10,
    beforeYouStart: [
      "Understanding the alphabet has 26 letters that wrap around (Z+1 = A)",
    ],
  },
  {
    slug: "backwards-mind",
    category: "cryptography",
    difficulty: "easy",
    title: "Backwards Mind",
    description: "Sometimes the simplest puzzles are right in front of you.",
    scenario:
      "A note found at a crime scene reads backwards. The flag is hidden in the reversed text.",
    prompt: "Reverse the message to find the flag.",
    materials: [
      {
        type: "code",
        content: "edocderotsihgalfehtnehtsdrowesehtesreverfI",
        caption: "Encrypted message",
      },
    ],
    flag: "ifireversethesewordsthentheflagisstoredcode",
    flagFormat: "all lowercase, no spaces",
    hints: [
      "Try reading the message right to left.",
      "Reverse the entire string character by character.",
      "The decoded message starts with 'If I reverse these words…'",
    ],
    skills: ["observation", "string manipulation"],
    estimatedMinutes: 3,
    xpReward: 5,
    beforeYouStart: ["Ability to read text carefully"],
  },
  {
    slug: "base64-buddy",
    category: "cryptography",
    difficulty: "easy",
    title: "Base64 Buddy",
    description:
      "Base64 is everywhere on the web — emails, images, tokens. Time to decode some.",
    scenario:
      "You're auditing a system and find a config file with an oddly-formatted value. It looks like base64. Decode it to find the flag.",
    prompt: "Decode the base64 string below to find the flag.",
    materials: [
      {
        type: "code",
        content: "VGhlZmxhZ2lzc2lsdmVybGluaW5n",
        caption: "Base64-encoded flag",
      },
    ],
    flag: "theflagissilverlining",
    flagFormat: "all lowercase, no spaces",
    hints: [
      "This is base64-encoded text. Most browsers can decode it via DevTools.",
      "Open browser DevTools console and try: atob('VGhlZmxhZ2lzc2lsdmVybGluaW5n')",
      "The decoded value starts with 'The flag is…'",
    ],
    skills: ["encoding awareness", "browser DevTools"],
    estimatedMinutes: 8,
    xpReward: 10,
    beforeYouStart: [
      "Knowing how to open browser DevTools (F12 in most browsers)",
    ],
  },
  {
    slug: "hex-hunt",
    category: "cryptography",
    difficulty: "easy",
    title: "Hex Hunt",
    description:
      "Hexadecimal is how computers represent data. Today, you're the human decoder.",
    scenario:
      "A memory dump contains a hex-encoded message. Convert to ASCII to find the flag.",
    prompt: "Convert the hex string to ASCII text. The result is the flag.",
    materials: [
      {
        type: "code",
        content: "74686520666c61672069732063697068657273706163652e",
        caption: "Hex-encoded ASCII",
      },
    ],
    flag: "the flag is cipherspace.",
    flagFormat: "as decoded (includes spaces)",
    hints: [
      "Hex pairs (two characters at a time) represent ASCII codes.",
      "Try a hex-to-ASCII converter. Browser DevTools: parseInt('74', 16) = 116, then String.fromCharCode(116) = 't'.",
      "The decoded text begins with 'the flag is…'",
    ],
    skills: ["hex understanding", "ASCII"],
    estimatedMinutes: 10,
    xpReward: 10,
    beforeYouStart: [
      "Understanding that computers store text as numbers (ASCII codes)",
    ],
  },
  {
    slug: "layered-mystery",
    category: "cryptography",
    difficulty: "hard",
    title: "Layered Mystery",
    description: "Sometimes secrets hide behind multiple walls.",
    scenario:
      "A message was wrapped in three layers of encoding before being passed on. Peel them off one at a time using the toolbox.",
    prompt:
      "Decode this message. The flag is the final readable text. You'll need to chain three tools.",
    materials: [
      {
        type: "code",
        content: "dWxra3BvZnN3bGxrenBuaHNtbG9h",
        caption: "Triple-encoded message",
      },
      {
        type: "text",
        content:
          "The sender applied these steps in order to ENCODE:\n  1. Caesar cipher (shift +7)\n  2. Reverse the string\n  3. Base64 encode\n\nTo DECODE, undo them in reverse: base64 first, then reverse, then Caesar shift back by 7.",
      },
    ],
    flag: "theflagisdeeplyhidden",
    flagFormat: "all lowercase, no spaces",
    hints: [
      "Start by base64-decoding the message. The result will still look scrambled.",
      "Then reverse the string. It'll look like a single Caesar cipher.",
      "Finally, Caesar-decode with the toolbox set to shift = 7.",
    ],
    skills: ["multi-step decoding", "tool chaining"],
    estimatedMinutes: 15,
    xpReward: 50,
    beforeYouStart: [
      "Comfort with the Base64, Reverse, and Caesar tools individually",
      "Patience to undo encodings in the right order",
    ],
  },
  {
    slug: "vigenere-visit",
    category: "cryptography",
    difficulty: "hard",
    title: "Vigenère Visit",
    description:
      "A polyalphabetic cipher — but you have a hint about the keyword.",
    scenario:
      "You've recovered a ciphertext from a vintage diplomatic cable. The encryption is Vigenère, and intelligence suggests the keyword is the name of a famous river.",
    prompt: 'Decrypt the message using a Vigenère cipher with the keyword "NILE".',
    materials: [
      {
        type: "code",
        content: "GVRNDTQTQRJSPDSSIWWMTBQVF",
        caption: "Vigenère ciphertext, keyword: NILE",
      },
    ],
    flag: "theflagisrivermouth",
    flagFormat: "all lowercase, no spaces",
    hints: [
      "Vigenère shifts each letter by the corresponding letter of the keyword (A=0, B=1, etc), repeating the keyword as needed.",
      "Keyword NILE means shifts of N(13), I(8), L(11), E(4), then repeat. First letter G shifted back by 13 = T.",
      "Use an online Vigenère decoder with key 'NILE'. The plaintext starts with 'theflagis…'",
    ],
    skills: ["classical ciphers", "modular arithmetic"],
    estimatedMinutes: 15,
    xpReward: 50,
    beforeYouStart: [
      "Basic understanding of Caesar cipher (a Vigenère is a 'shifting Caesar')",
    ],
  },
  {
    slug: "rsa-rookie",
    category: "cryptography",
    difficulty: "expert",
    title: "RSA Rookie",
    description: "Modern encryption, simplified for learning. Small primes only.",
    scenario:
      "Your colleague used baby RSA with small primes for a school project. Recover the message — and learn why small primes are never used in production.",
    prompt:
      "Given p=61, q=53, e=17, ciphertext c=2790, recover the message m (a single number) as the flag.",
    materials: [
      {
        type: "text",
        content:
          "p = 61\nq = 53\nn = p×q = 3233\nφ(n) = (p-1)×(q-1) = 3120\ne = 17\nc = 2790",
      },
      {
        type: "text",
        content:
          "RSA decryption: m = c^d mod n, where d is the modular inverse of e mod φ(n).",
      },
    ],
    flag: "65",
    flagFormat: "single number",
    hints: [
      "Find d: the modular inverse of e (17) modulo φ(n) (3120). Hint: d × 17 ≡ 1 (mod 3120).",
      "d = 2753. (Verify: 17 × 2753 = 46801 = 15 × 3120 + 1, so 17 × 2753 ≡ 1 mod 3120.)",
      "Now compute m = c^d mod n = 2790^2753 mod 3233 = 65.",
    ],
    skills: ["modular arithmetic", "RSA fundamentals"],
    estimatedMinutes: 30,
    xpReward: 100,
    beforeYouStart: [
      "Comfort with modular arithmetic (a mod n)",
      "A calculator that handles big exponents (Wolfram Alpha works)",
    ],
  },
];

// ─── Web Security (6) ──────────────────────────────────────────────────────

export const WEB_CHALLENGES: CtfChallenge[] = [
  {
    slug: "hidden-in-plain-sight",
    category: "web",
    difficulty: "easy",
    title: "Hidden in Plain Sight",
    description:
      "Web developers leave comments everywhere. Sometimes a little too revealing.",
    scenario:
      "A site looks empty. But web pages have more than what's visible. View the source.",
    prompt: "Inspect the HTML below. The flag is hidden in an HTML comment.",
    materials: [
      {
        type: "code",
        content: `<!DOCTYPE html>
<html>
<head>
  <title>Welcome</title>
  <!-- flag: hidden_treasure_2026 -->
</head>
<body>
  <h1>Nothing to see here.</h1>
  <p>Or is there?</p>
</body>
</html>`,
        language: "html",
        caption: "HTML source of a mysterious page",
      },
    ],
    flag: "hidden_treasure_2026",
    flagFormat: "all lowercase, underscores, no spaces",
    hints: [
      "HTML comments start with <!-- and end with -->. Look carefully.",
      "Check inside the <head> tag.",
      "The flag is inside the comment in the <head> section.",
    ],
    skills: ["HTML basics", "source code inspection"],
    estimatedMinutes: 3,
    xpReward: 10,
    beforeYouStart: ["Knowing HTML uses tags like <html>, <head>, <body>"],
  },
  {
    slug: "robots-reveals",
    category: "web",
    difficulty: "easy",
    title: "Robots.txt Reveals",
    description:
      "robots.txt tells search engines what NOT to crawl. Sometimes it's where the secrets are.",
    scenario:
      "Every public website can have a robots.txt file. Site admins use it to hide pages from search engines — but anyone can read it.",
    prompt: "Read the simulated robots.txt below. The disallowed path is the flag.",
    materials: [
      {
        type: "code",
        content: `User-agent: *
Disallow: /admin/
Disallow: /private/secret_keys_2026
Disallow: /test/`,
        language: "text",
        caption: "Simulated robots.txt",
      },
    ],
    flag: "/private/secret_keys_2026",
    flagFormat: "path starting with /",
    hints: [
      "Look at the lines starting with 'Disallow:'",
      "One of the paths is more specific than the others.",
      "The flag is the path that mentions 'secret_keys'.",
    ],
    skills: ["web reconnaissance", "robots.txt basics"],
    estimatedMinutes: 3,
    xpReward: 10,
    beforeYouStart: ["Knowing what a URL path looks like"],
  },
  {
    slug: "cookie-crumbs",
    category: "web",
    difficulty: "medium",
    title: "Cookie Crumbs",
    description: "Browser cookies store small bits of data. Sometimes too much.",
    scenario:
      "A web app sets several cookies. One of them contains an authentication token. Find the flag in the cookie dump.",
    prompt:
      "Examine the cookie dump below. The value of the auth_token cookie is the flag.",
    materials: [
      {
        type: "table",
        content: `Cookie Name | Value | Domain
session_id | abc123 | example.com
preferences | dark_mode=true | example.com
auth_token | flag_decoded_via_cookies | example.com
timestamp | 1715900000 | example.com`,
        caption: "Browser cookies for example.com",
      },
    ],
    flag: "flag_decoded_via_cookies",
    flagFormat: "all lowercase, underscores",
    hints: [
      "Look at the cookies table. Find the one labeled 'auth_token'.",
      "The flag is the value column for auth_token.",
      "Auth tokens are sensitive — the cookie value IS the flag.",
    ],
    skills: ["cookie awareness", "web security basics"],
    estimatedMinutes: 5,
    xpReward: 25,
    beforeYouStart: ["Knowing browsers store cookies for sites you visit"],
  },
  {
    slug: "path-traversal",
    category: "web",
    difficulty: "medium",
    title: "Path Traversal",
    description:
      "URLs can hide more than you think. Walking the path might reveal secrets.",
    scenario:
      "A web app organizes files by path. The flag is in a directory that the developer forgot to hide.",
    prompt:
      "Examine the URL pattern below. Guess the path that contains the flag based on the directory listing.",
    materials: [
      {
        type: "code",
        content: `Base URL: https://example.com/files/
Visible directories: public/, images/, docs/
Curl listing of /files/ showed an extra "..backup/" with the flag inside.

URL pattern: https://example.com/files/[directory]/[file]`,
        caption: "Directory information",
      },
    ],
    flag: "/files/..backup/flag.txt",
    flagFormat: "path starting with /",
    hints: [
      "Web servers can expose hidden directories. Look at the curl listing — what extra directory appears?",
      "The directory is named '..backup/'. What file should be inside if there's a flag?",
      "Build the path: /files/ + the hidden directory + flag.txt",
    ],
    skills: ["URL structure", "directory enumeration"],
    estimatedMinutes: 8,
    xpReward: 25,
    beforeYouStart: ["Understanding URL paths and file extensions"],
  },
  {
    slug: "form-field-sleuth",
    category: "web",
    difficulty: "medium",
    title: "Form Field Sleuth",
    description:
      "Forms have visible fields and invisible ones. The flag is in the latter.",
    scenario:
      "A login page has a normal-looking form. But the HTML reveals a hidden field that contains the flag.",
    prompt:
      "Inspect the HTML below. The value of the hidden input field is the flag.",
    materials: [
      {
        type: "code",
        content: `<form action="/login" method="POST">
  <label>Username</label>
  <input type="text" name="username" />

  <label>Password</label>
  <input type="password" name="password" />

  <input type="hidden" name="csrf_token" value="abc123xyz" />
  <input type="hidden" name="form_flag" value="hidden_field_treasure" />

  <button type="submit">Sign In</button>
</form>`,
        language: "html",
        caption: "Login form source",
      },
    ],
    flag: "hidden_field_treasure",
    flagFormat: "all lowercase, underscores",
    hints: [
      "Look for input fields with type='hidden'.",
      "There are two hidden fields. One is for CSRF protection; the other contains the flag.",
      "The flag is the value of the 'form_flag' hidden field.",
    ],
    skills: ["form inspection", "HTML", "hidden field discovery"],
    estimatedMinutes: 8,
    xpReward: 25,
    beforeYouStart: [
      "Understanding HTML forms have input fields with names and values",
    ],
  },
  {
    slug: "api-investigation",
    category: "web",
    difficulty: "expert",
    title: "API Investigation",
    description: "APIs return JSON. Sometimes more than the UI shows.",
    scenario:
      "A web app calls an API that returns user data. The flag is in a field the UI never displays.",
    prompt:
      "Examine the API response below. Find the value of the deprecated_flag field.",
    materials: [
      {
        type: "code",
        content: `{
  "user": {
    "id": 42,
    "username": "alice",
    "email": "alice@example.com",
    "preferences": {
      "theme": "dark",
      "language": "en"
    },
    "metadata": {
      "joined": "2024-01-15",
      "deprecated_flag": "api_response_treasure_unlocked",
      "active": true
    }
  }
}`,
        language: "json",
        caption: "Raw API response from /api/user/me",
      },
    ],
    flag: "api_response_treasure_unlocked",
    flagFormat: "all lowercase, underscores",
    hints: [
      "The response is JSON. Navigate the nested structure.",
      "Look inside user.metadata. There are 3 fields there.",
      "The flag is the value of user.metadata.deprecated_flag.",
    ],
    skills: ["JSON parsing", "API response analysis", "data structure navigation"],
    estimatedMinutes: 10,
    xpReward: 100,
    beforeYouStart: [
      "Understanding JSON structure (objects and nested values)",
    ],
  },
];

// ─── Forensics (6) ─────────────────────────────────────────────────────────

export const FORENSICS_CHALLENGES: CtfChallenge[] = [
  {
    slug: "image-metadata",
    category: "forensics",
    difficulty: "easy",
    title: "Image Metadata",
    description:
      "Every photo carries hidden data — camera info, GPS, timestamps. And sometimes secrets.",
    scenario:
      "A suspect uploaded a photo. The flag is in the image metadata.",
    prompt:
      "Examine the EXIF data dump below. The Comment field contains the flag.",
    materials: [
      {
        type: "code",
        content: `File: evidence_photo.jpg
File Size: 245 KB
File Type: JPEG

EXIF Metadata:
  Camera Make: Canon
  Camera Model: EOS R6
  Date/Time: 2025-03-15 14:32:17
  GPS Latitude: 41.8781 N
  GPS Longitude: 87.6298 W
  Aperture: f/2.8
  Shutter: 1/200
  ISO: 400
  Comment: metadata_revealed_the_truth
  Software: Adobe Photoshop 2025`,
        caption: "EXIF metadata extracted via exiftool",
      },
    ],
    flag: "metadata_revealed_the_truth",
    flagFormat: "all lowercase, underscores",
    hints: [
      "Look at the EXIF metadata fields. One of them is a text comment.",
      "The Comment field often contains user-added text.",
      "The flag is the value of the Comment field.",
    ],
    skills: ["metadata awareness", "EXIF basics"],
    estimatedMinutes: 4,
    xpReward: 10,
    beforeYouStart: [
      "Knowing photos can contain hidden data beyond the visible pixels",
    ],
  },
  {
    slug: "file-type-confusion",
    category: "forensics",
    difficulty: "easy",
    title: "File Type Confusion",
    description:
      "A file's extension can lie. The 'magic number' inside the file tells the truth.",
    scenario:
      "An attacker disguised a file. It's named .txt but the magic bytes say otherwise.",
    prompt: "Examine the file dump below. The actual file format is the flag.",
    materials: [
      {
        type: "code",
        content: `File name: notes.txt
File size: 1.2 MB

First 8 bytes (hex):
89 50 4E 47 0D 0A 1A 0A

Decoded ASCII of first bytes:
. P N G . . . .`,
        caption: 'Hex dump of "notes.txt"',
      },
      {
        type: "text",
        content:
          "File signatures (magic numbers):\n- PNG: 89 50 4E 47\n- JPEG: FF D8 FF\n- ZIP: 50 4B 03 04\n- PDF: 25 50 44 46",
      },
    ],
    flag: "png",
    flagFormat: "three letters, lowercase",
    hints: [
      "Look at the first bytes in hex.",
      "Match the first 4 bytes against the file signatures table.",
      "The signature 89 50 4E 47 matches PNG.",
    ],
    skills: ["file forensics", "magic numbers"],
    estimatedMinutes: 4,
    xpReward: 10,
    beforeYouStart: [
      "Knowing files have headers that identify their true format",
    ],
  },
  {
    slug: "log-file-hunt",
    category: "forensics",
    difficulty: "medium",
    title: "Log File Hunt",
    description:
      "Logs tell stories. The story today: a user logged in from an impossible place.",
    scenario:
      "Review the login log. One user account had a successful login from a location it never normally accesses from. That user is the flag.",
    prompt:
      "Find the user with a successful login from a country not in their usual pattern.",
    materials: [
      {
        type: "code",
        content: `2025-05-15 08:12:33 LOGIN alice from 192.168.1.45 (US) SUCCESS
2025-05-15 08:34:12 LOGIN bob from 192.168.1.67 (US) SUCCESS
2025-05-15 09:02:18 LOGIN charlie from 192.168.1.89 (US) SUCCESS
2025-05-15 09:15:44 LOGIN alice from 192.168.1.45 (US) SUCCESS
2025-05-15 11:33:21 LOGIN bob from 41.215.93.12 (NG) SUCCESS
2025-05-15 11:34:02 LOGIN bob from 192.168.1.67 (US) FAILED
2025-05-15 12:01:55 LOGIN charlie from 192.168.1.89 (US) SUCCESS
2025-05-15 12:45:33 LOGIN alice from 192.168.1.45 (US) SUCCESS`,
        caption: "Authentication log (last 4 hours)",
      },
    ],
    flag: "bob",
    flagFormat: "username, all lowercase",
    hints: [
      "Look at the country codes (in parentheses) for each login.",
      "Most logins are from US. One is not.",
      "The user with the foreign login (NG = Nigeria) is the answer.",
    ],
    skills: ["log analysis", "anomaly detection"],
    estimatedMinutes: 8,
    xpReward: 25,
    beforeYouStart: ["Reading timestamps and IP addresses in logs"],
  },
  {
    slug: "email-header-detective",
    category: "forensics",
    difficulty: "medium",
    title: "Email Header Detective",
    description:
      "Email headers reveal the true sender. The 'From' field can lie; the 'Received' chain can't easily.",
    scenario:
      "An email claims to be from the CEO. Examine the headers to find what domain actually sent it.",
    prompt:
      'Read the headers below. The domain in the first "Received:" line (the actual sender) is the flag.',
    materials: [
      {
        type: "code",
        content: `From: CEO <ceo@bigcompany.com>
To: employees@bigcompany.com
Subject: Urgent: Wire Transfer Required
Date: Wed, 15 May 2025 09:32:00 -0500

Received: from mail.bigcompany.com (10.0.0.5) by company.local; 09:32:01
Received: from mail-out.scammydomain.net ([45.123.45.67]) by mail.bigcompany.com; 09:31:58
Return-Path: <attacker@scammydomain.net>
Reply-To: ceo.urgent@gmail.com

[email body…]`,
        caption: "Email headers",
      },
    ],
    flag: "scammydomain.net",
    flagFormat: "domain name, lowercase, includes TLD",
    hints: [
      "The 'From:' line can be spoofed. The 'Received:' chain shows actual mail servers.",
      "Read the Received chain bottom-up. The first received line shows the original sender.",
      "The earliest 'Received:' line shows mail-out.scammydomain.net — that's the actual sender's domain.",
    ],
    skills: ["email forensics", "header analysis", "spoofing detection"],
    estimatedMinutes: 10,
    xpReward: 25,
    beforeYouStart: [
      "Knowing emails have hidden headers beyond what shows in your inbox",
    ],
  },
  {
    slug: "packet-capture-pursuit",
    category: "forensics",
    difficulty: "hard",
    title: "Packet Capture Pursuit",
    description:
      "Network packets carry data — and sometimes secrets in unencrypted protocols.",
    scenario:
      "A packet capture shows HTTP traffic (unencrypted). Find the credentials being sent in plaintext.",
    prompt:
      "Examine the packet dump below. The password sent in the HTTP POST is the flag.",
    materials: [
      {
        type: "code",
        content: `Packet 1: TCP SYN from 10.0.0.5 to 10.0.0.10:80
Packet 2: TCP SYN-ACK from 10.0.0.10:80 to 10.0.0.5
Packet 3: TCP ACK
Packet 4: HTTP POST /login HTTP/1.1
         Host: vulnerable-site.local
         Content-Type: application/x-www-form-urlencoded
         Content-Length: 47

         username=admin&password=plaintext_in_the_wire&remember=1
Packet 5: HTTP 302 Found (redirect to /dashboard)`,
        caption: "PCAP excerpt — HTTP traffic",
      },
    ],
    flag: "plaintext_in_the_wire",
    flagFormat: "all lowercase, underscores",
    hints: [
      "Look at the HTTP POST request body. The form data has username and password fields.",
      "The body is URL-encoded: field=value&field=value.",
      "The password field value is the flag.",
    ],
    skills: ["packet analysis", "HTTP basics", "form data parsing"],
    estimatedMinutes: 12,
    xpReward: 50,
    beforeYouStart: [
      "Understanding that HTTP (not HTTPS) sends data unencrypted",
      "Reading key=value URL-encoded form data",
    ],
  },
  {
    slug: "steganography-surprise",
    category: "forensics",
    difficulty: "expert",
    title: "Steganography Surprise",
    description:
      "Hidden in plain sight — a flag concealed in the bits of an image.",
    scenario:
      "A whistleblower hid a message inside an image. The first letter of each line in the image's description is the flag.",
    prompt:
      "Examine the image description below. The first letter of each line spells out the flag.",
    materials: [
      {
        type: "code",
        content: `Image Description (extracted):

Find the truth in every layer
Look beyond the visible bytes
Always question what you see
Gathering clues from text patterns
Sometimes secrets hide in plain words
Inside the most ordinary places
Search again with fresh eyes`,
        caption: "Description text from steganographically-modified image",
      },
    ],
    flag: "flagiss",
    flagFormat: "all lowercase, no spaces",
    hints: [
      "Look at the first letter of each line.",
      "Read them in order top to bottom: F, L, A, G, I, S, S.",
      "Combining: 'flagiss' — that's the flag.",
    ],
    skills: ["steganography", "acrostic patterns", "observation"],
    estimatedMinutes: 8,
    xpReward: 100,
    beforeYouStart: ["Patience to look for non-obvious patterns"],
  },
];

// ─── Networks (6) ──────────────────────────────────────────────────────────

export const NETWORK_CHALLENGES: CtfChallenge[] = [
  {
    slug: "ping-the-pattern",
    category: "networks",
    difficulty: "easy",
    title: "Ping the Pattern",
    description: "Network responses have patterns. Spot the one that doesn't fit.",
    scenario:
      "You ping a series of hosts. Most respond quickly. One response time is suspicious.",
    prompt:
      "Find the host with the suspiciously different ping time. The IP address is the flag.",
    materials: [
      {
        type: "code",
        content: `Ping results (50 hosts on subnet 192.168.1.x):

192.168.1.1  - 2ms
192.168.1.2  - 3ms
192.168.1.3  - 1ms
192.168.1.4  - 2ms
192.168.1.5  - 4ms
192.168.1.6  - 2ms
192.168.1.7  - 312ms  ← much slower
192.168.1.8  - 1ms
192.168.1.9  - 3ms
… (rest 1-5ms range)`,
        caption: "Ping sweep of local subnet",
      },
    ],
    flag: "192.168.1.7",
    flagFormat: "IPv4 address (x.x.x.x)",
    hints: [
      "Look at the response times. Most are 1-5ms.",
      "One value is much higher than the rest.",
      "192.168.1.7 has a 312ms response — orders of magnitude slower.",
    ],
    skills: ["network basics", "ping interpretation", "anomaly spotting"],
    estimatedMinutes: 3,
    xpReward: 10,
    beforeYouStart: ["Knowing that ping measures network response time"],
  },
  {
    slug: "port-scan-read",
    category: "networks",
    difficulty: "easy",
    title: "Port Scan Read",
    description:
      "Ports are doors. Most should be locked. One open door might be a problem.",
    scenario:
      "A port scan reveals services running on a server. One port is unusual for a web server. Find it.",
    prompt:
      "Identify the unusual open port on this web server. The port number is the flag.",
    materials: [
      {
        type: "code",
        content: `Server: web-server.example.com
Scan results (nmap-style):

PORT     STATE    SERVICE
22/tcp   open     ssh        # standard for admin
80/tcp   open     http       # web traffic
443/tcp  open     https      # secure web
6666/tcp open     irc        # ?? not typical for web server
8080/tcp open     http-proxy # alt http port`,
        caption: "Port scan results",
      },
    ],
    flag: "6666",
    flagFormat: "port number",
    hints: [
      "Web servers normally use ports 80, 443, and sometimes 8080.",
      "One port is for a chat protocol (IRC).",
      "Port 6666 (IRC) is unusual for a web server.",
    ],
    skills: ["port awareness", "service identification"],
    estimatedMinutes: 3,
    xpReward: 10,
    beforeYouStart: ["Knowing different services use different port numbers"],
  },
  {
    slug: "dns-detective",
    category: "networks",
    difficulty: "medium",
    title: "DNS Detective",
    description:
      "DNS records map domains to data. Some records reveal more than you'd expect.",
    scenario:
      "A domain has several DNS records. One contains a hidden message in plain sight.",
    prompt: "Examine the DNS records. The TXT record value is the flag.",
    materials: [
      {
        type: "code",
        content: `Domain: mysteriousdomain.example
DNS records:

mysteriousdomain.example.        A      203.0.113.42
mysteriousdomain.example.        AAAA   2001:db8::42
mysteriousdomain.example.        MX     10 mail.mysteriousdomain.example.
mysteriousdomain.example.        TXT    "v=spf1 include:_spf.google.com ~all"
mysteriousdomain.example.        TXT    "flag=dns_records_tell_stories"
mysteriousdomain.example.        NS     ns1.example.com.`,
        caption: "DNS records (dig output)",
      },
    ],
    flag: "dns_records_tell_stories",
    flagFormat: "all lowercase, underscores",
    hints: [
      "Look at the TXT records.",
      "There are two TXT records. One is for email authentication (SPF). The other contains a flag.",
      "The TXT record starting with 'flag=' contains the answer.",
    ],
    skills: ["DNS records", "TXT record analysis"],
    estimatedMinutes: 8,
    xpReward: 25,
    beforeYouStart: [
      "Understanding domains have multiple types of DNS records",
    ],
  },
  {
    slug: "firewall-find",
    category: "networks",
    difficulty: "easy",
    title: "Firewall Find",
    description:
      "Firewall rules decide what gets through. Reading them well is half the battle.",
    scenario:
      "A firewall has rules that allow some traffic and block others. Find the rule that allows SSH from a specific subnet.",
    prompt:
      "Identify the source subnet allowed to SSH (port 22). The subnet CIDR is the flag.",
    materials: [
      {
        type: "code",
        content: `Firewall rules (priority order):

1. ALLOW from 10.0.5.0/24 to any port 22 (SSH)
2. ALLOW from any to any port 80 (HTTP)
3. ALLOW from any to any port 443 (HTTPS)
4. DENY from any to any port 22
5. DENY from any to any port 23 (Telnet)
6. ALLOW outbound from any to any port 53 (DNS)`,
        caption: "Firewall ruleset",
      },
    ],
    flag: "10.0.5.0/24",
    flagFormat: "CIDR notation (x.x.x.x/y)",
    hints: [
      "Look for ALLOW rules with port 22 (SSH).",
      "Rule 1 specifies the source subnet for SSH access.",
      "The source CIDR in rule 1 is the flag.",
    ],
    skills: ["firewall rules", "CIDR notation", "rule order"],
    estimatedMinutes: 8,
    xpReward: 10,
    beforeYouStart: [
      "Knowing what a subnet looks like in CIDR notation (e.g., 10.0.0.0/24)",
    ],
  },
  {
    slug: "subnet-sleuth",
    category: "networks",
    difficulty: "hard",
    title: "Subnet Sleuth",
    description:
      "Find the rogue device that doesn't belong to the corporate subnet.",
    scenario:
      "Your corporate network is 192.168.10.0/24. You see several devices. One is outside the subnet — that's the rogue.",
    prompt:
      "Find the IP that is NOT in the subnet 192.168.10.0/24. That IP is the flag.",
    materials: [
      {
        type: "code",
        content: `Corporate subnet: 192.168.10.0/24
Valid IPs in this subnet: 192.168.10.1 through 192.168.10.254

Devices observed:
- Device A: 192.168.10.45
- Device B: 192.168.10.78
- Device C: 192.168.10.112
- Device D: 192.168.10.205
- Device E: 192.168.11.50
- Device F: 192.168.10.89`,
        caption: "Network discovery results",
      },
    ],
    flag: "192.168.11.50",
    flagFormat: "IPv4 address",
    hints: [
      "The subnet is 192.168.10.0/24. The /24 means the first 3 octets must match (192.168.10).",
      "Look at the third octet of each device IP.",
      "Device E has 192.168.11.x — that 11 doesn't match 10.",
    ],
    skills: ["subnetting", "CIDR", "network organization"],
    estimatedMinutes: 8,
    xpReward: 50,
    beforeYouStart: [
      "Understanding /24 means the first 3 octets are the network portion",
    ],
  },
  {
    slug: "routing-riddle",
    category: "networks",
    difficulty: "expert",
    title: "Routing Riddle",
    description:
      "Trace a packet across a network with multiple routers. Find where it ends up.",
    scenario:
      "A packet starts at Router A. Following the routing table, trace where it lands.",
    prompt:
      "Given the routing tables below, trace a packet sent from 10.1.1.5 destined to 192.168.50.100. What is the next hop after Router C?",
    materials: [
      {
        type: "code",
        content: `Router A (10.1.1.1):
  10.1.1.0/24 → directly connected
  default → Router B (10.1.1.254)

Router B (10.1.1.254 / 172.16.0.1):
  172.16.0.0/16 → directly connected
  10.1.1.0/24 → Router A
  192.168.0.0/16 → Router C (172.16.0.5)

Router C (172.16.0.5 / 192.168.0.1):
  192.168.0.0/24 → directly connected
  192.168.50.0/24 → Router D (192.168.0.99)
  default → Router B

Router D (192.168.0.99 / 192.168.50.1):
  192.168.50.0/24 → directly connected`,
        caption: "Multi-router network configuration",
      },
    ],
    flag: "router d",
    flagFormat: 'router letter (e.g., "router a") all lowercase',
    hints: [
      "Trace the packet from 10.1.1.5 step by step. Router A's default goes to Router B.",
      "Router B forwards 192.168.x.x traffic to Router C.",
      "Router C has a specific rule for 192.168.50.0/24 — it goes to Router D.",
    ],
    skills: ["routing", "network paths", "routing tables"],
    estimatedMinutes: 15,
    xpReward: 100,
    beforeYouStart: [
      "Understanding routers forward packets based on destination",
      "CIDR notation",
    ],
  },
];

export const ALL_CTF_CHALLENGES: CtfChallenge[] = [
  ...CRYPTOGRAPHY_CHALLENGES,
  ...WEB_CHALLENGES,
  ...FORENSICS_CHALLENGES,
  ...NETWORK_CHALLENGES,
];

export const CATEGORIES: Array<{
  slug: CtfCategory;
  label: string;
  description: string;
  accent: string;
}> = [
  {
    slug: "cryptography",
    label: "Cryptography",
    description: "Ciphers, encoding, classical and modern crypto.",
    accent: "indigo",
  },
  {
    slug: "web",
    label: "Web Security",
    description: "HTML, cookies, forms, APIs — where most attacks start.",
    accent: "cyan",
  },
  {
    slug: "forensics",
    label: "Forensics",
    description: "Reading clues from files, logs, packets, and metadata.",
    accent: "amber",
  },
  {
    slug: "networks",
    label: "Networks",
    description: "Ports, DNS, firewalls, routing, packet flow.",
    accent: "emerald",
  },
];

export function getChallengeBySlug(slug: string): CtfChallenge | undefined {
  return ALL_CTF_CHALLENGES.find((c) => c.slug === slug);
}

export function getChallengesByCategory(category: CtfCategory): CtfChallenge[] {
  // Stable order: easy → expert as authored.
  return ALL_CTF_CHALLENGES.filter((c) => c.category === category);
}

export const DIFFICULTY_ORDER: CtfDifficulty[] = [
  "easy",
  "medium",
  "hard",
  "expert",
];

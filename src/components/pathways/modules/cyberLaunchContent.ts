/**
 * Cyber Launch — module content data.
 *
 * Each of the 7 Cyber Launch modules is structured as a 60-minute learning
 * experience built around a 6-section flow:
 *
 *   1. Hook      — short scene/story that frames why the module matters
 *                  (rendered to the student as "Why It Matters" — the schema
 *                  field stays `hookCompleted` for backward compatibility)
 *   2. Reading   — substantive written content with sections + citations
 *   3. Lesson    — interactive walkthrough or guided scenes
 *   4. Practice  — low-stakes attempts with immediate feedback
 *   5. Homework  — a real-world task submitted as free text
 *   6. Quiz      — the existing assessment, repositioned at the end
 *
 * Content here is intentionally separated from React components so the prose
 * can be reviewed/edited without touching JSX, and so i18n can pick it up in
 * a future pass. Citations point to current, publicly verifiable sources.
 *
 * Stories framed as "Imagine…" or "Picture…" are illustrative composites,
 * not real individuals. Named real-world incidents (Equifax 2017, Colonial
 * Pipeline 2021, WannaCry 2017, Target 2013) are well-documented public
 * events. Statistics are cited to NIST CyberSeek, the U.S. Bureau of Labor
 * Statistics (BLS) Occupational Outlook Handbook, and ISC2 — these numbers
 * shift year over year so the prose uses approximate ranges where useful.
 */

export interface ReadingSection {
  heading: string;
  paragraphs: string[];
  callout?: string;
  keyTerms?: Array<{ term: string; definition: string }>;
  /**
   * GRC Lens callout — a visually distinct amber block that surfaces the
   * Governance/Risk/Compliance angle on the surrounding material. Appears
   * after the paragraphs of the section it belongs to.
   */
  grcLens?: { title?: string; body: string };
}

export interface LessonScene {
  title: string;
  body: string;
  /**
   * Career Map roles flag this when the path into the role doesn't require
   * a CS degree — paralegal, audit, business, communications backgrounds
   * are common entry points. Surfaces as a small "Accessible Entry Path"
   * chip next to the scene title.
   */
  accessibleEntry?: boolean;
  choice?: {
    prompt: string;
    options: Array<{ label: string; feedback: string }>;
  };
}

export interface PracticeItem {
  prompt: string;
  detail?: string;
  options: Array<{ label: string; correct: boolean; feedback: string }>;
}

export interface ModuleContent {
  slug: string;
  title: string;
  totalMinutes: number;
  hook: {
    estMinutes: number;
    title: string;
    paragraphs: string[];
    closer: string;
  };
  reading: {
    estMinutes: number;
    sections: ReadingSection[];
    citations: string[];
  };
  lesson: {
    estMinutes: number;
    intro: string;
    scenes: LessonScene[];
  };
  practice: {
    estMinutes: number;
    intro: string;
    items: PracticeItem[];
  };
  homework: {
    estMinutes: number;
    title: string;
    prompt: string;
    instructions: string[];
    placeholder: string;
  };
  /** Module 7 is the capstone — the deliverable is the assessment, no quiz follows. */
  skipQuiz?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Module 1 — Cyber Foundations
// ────────────────────────────────────────────────────────────────────────────

const CYBER_FOUNDATIONS: ModuleContent = {
  slug: "cyber-foundations",
  title: "Cyber Foundations",
  totalMinutes: 60,
  hook: {
    estMinutes: 4,
    title: "Why this matters",
    paragraphs: [
      "In 2017, attackers stole personal information on about 147 million people from Equifax — names, Social Security numbers, birth dates, addresses. Equifax was one of the three largest credit-reporting companies in the United States. They were supposed to be experts at protecting personal data.",
      "The attackers got in through a known software flaw that the company had been warned about for more than two months. The patch existed. Nobody applied it.",
      "The people whose job it is to catch problems like that — and the people who clean it up when they aren't caught — are cybersecurity professionals. That's the field you're about to learn about.",
    ],
    closer: "Cybersecurity is a real job, with a real shortage of people, and a real path in. Let's get into the foundations.",
  },
  reading: {
    estMinutes: 12,
    sections: [
      {
        heading: "What cybersecurity actually is",
        paragraphs: [
          "**Cybersecurity** is the practice of protecting digital systems, networks, and data from people who shouldn't have access. That's the short version. The longer version is that cybersecurity professionals work to keep four things true about every important system: it stays private when it should, it stays accurate, it stays available, and only the right people get to use it.",
          "Those four properties are sometimes called the **CIA triad** plus authentication: **Confidentiality** (only authorized people see the data), **Integrity** (the data hasn't been tampered with), **Availability** (the system is there when you need it), and **Authentication** (the system can prove who you are). Almost every defense you'll learn about maps back to one of these four.",
          "You already use cybersecurity every day without thinking about it. The password on your phone is confidentiality. The little lock icon next to a website's URL is integrity and authentication. When TikTok keeps working through a holiday weekend, that's availability — and there's a team behind it keeping it that way.",
        ],
        callout: "Almost every defense you'll learn maps back to one of four ideas: Confidentiality, Integrity, Availability, Authentication.",
        keyTerms: [
          { term: "CIA triad", definition: "Confidentiality, Integrity, Availability — the three classic goals of information security." },
          { term: "Authentication", definition: "Verifying that a person or system is who they claim to be." },
        ],
        grcLens: {
          body: "Every CIA Triad decision is a **GRC** decision. Companies don't just want security — they need to **prove it** to auditors, regulators, and their boards. That proof is what GRC (Governance, Risk, and Compliance) people produce.",
        },
      },
      {
        heading: "Why the field is growing fast",
        paragraphs: [
          "The U.S. Bureau of Labor Statistics projects employment of **information security analysts** to grow about 33% from 2023 to 2033 — much faster than the average for all jobs. NIST's CyberSeek tool, which tracks live cyber job postings, has shown hundreds of thousands of open cybersecurity roles in the United States at any given time.",
          "Why does the demand keep growing? Three reasons. First, there are more devices to defend every year — phones, laptops, smart TVs, doorbells, cars. Second, attackers have gotten more organized. Ransomware, where criminals lock up a company's files and demand payment, is now run like a business. Third, there aren't enough trained people to fill the open roles, so companies compete for the ones who exist.",
          "Entry-level cybersecurity roles in the U.S. commonly start in the $60,000–$80,000 range, with bigger metro areas and specialized roles paying more. Two years of experience plus a recognized certification often pushes that higher.",
        ],
        callout: "Hundreds of thousands of open cyber roles. ~33% projected growth this decade. The shortage is the opportunity.",
      },
      {
        heading: "Who actually works in cyber",
        paragraphs: [
          "Cybersecurity isn't one job. It's a family of jobs. A **security analyst** in a Security Operations Center (SOC) spends the day watching alerts and investigating suspicious activity. A **penetration tester** gets paid to break into systems — legally — and write reports about what they found. A **GRC analyst** (Governance, Risk, and Compliance) translates security requirements into policies and audits. An **incident responder** is the person you call at 3 AM when something has already gone wrong.",
          "The people doing these jobs got there from different places. Some have computer science degrees. Some came up through IT help desk. Some came from the military. Some are self-taught through free coursework and home labs. The field cares more about whether you can do the work than where you learned it.",
        ],
        keyTerms: [
          { term: "SOC", definition: "Security Operations Center — the team that monitors security alerts in real time." },
          { term: "GRC", definition: "Governance, Risk, and Compliance — the policy, audit, and risk-management side of security." },
          { term: "Pen test", definition: "Penetration test — authorized attempt to break into a system to find weaknesses." },
        ],
        grcLens: {
          body: "**GRC roles are some of the most accessible entry points into cyber.** Many GRC professionals come from legal, business, or audit backgrounds — not computer science. GRC analyst median salary in the U.S. typically falls in the **$85K–$110K** range, comparable to technical roles.",
        },
      },
      {
        heading: "The threats you'll hear about most",
        paragraphs: [
          "**Phishing** is the single most common starting point for a successful attack. An email or text pretends to be from a bank, a delivery service, or a coworker, and tries to get the target to click a link or hand over a password. Industry breach reports consistently put the share of breaches that started with phishing or social engineering above 70%.",
          "**Ransomware** locks up a victim's files and demands payment for the decryption key. The 2017 WannaCry attack shut down hospitals across the UK. The 2021 Colonial Pipeline attack disrupted fuel supply across the U.S. East Coast for several days.",
          "**Insider threats** include both malicious employees and well-meaning ones who click the wrong link. **Data breaches** like Equifax in 2017 and Target in 2013 lose huge volumes of personal data at once, often because of a single missed update or a stolen vendor login.",
        ],
        callout: "Most breaches start with a person, not a machine. Defending people is most of the job.",
      },
    ],
    citations: [
      "U.S. Bureau of Labor Statistics, Occupational Outlook Handbook: Information Security Analysts — https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm",
      "NIST CyberSeek — https://www.cyberseek.org/heatmap.html",
      "ISC2 Cybersecurity Workforce Study — https://www.isc2.org/research",
      "Equifax 2017 data breach: U.S. Government Accountability Office report (GAO-18-559)",
      "Verizon Data Breach Investigations Report — https://www.verizon.com/business/resources/reports/dbir/",
    ],
  },
  lesson: {
    estMinutes: 18,
    intro: "Walk through a day in the life of a Security Operations Center analyst. Each scene shows what the work actually looks like — and gives you a small choice. There are no wrong answers; the feedback explains what an experienced analyst would weigh.",
    scenes: [
      {
        title: "7:00 AM — Reviewing the overnight queue",
        body: "You open your laptop and a SIEM dashboard fills the screen. There are 412 alerts from the overnight shift. About 380 are routine — failed logins from people who fat-fingered their password. A handful look more interesting: repeated authentication failures from one IP, followed by a success.",
        choice: {
          prompt: "Where do you focus first?",
          options: [
            { label: "Start with the oldest alerts, work forward", feedback: "Methodical, but you'll burn the morning on noise. Most SOC analysts triage by severity, not chronology." },
            { label: "The 'failed, failed, success' pattern from one IP", feedback: "Strong choice. That pattern is consistent with a password-guessing attack that eventually got in. It belongs at the top of the queue." },
            { label: "Ignore all the failed logins — they happen all day", feedback: "Risky. Failed logins are noisy, but a successful login at the end of a series of failures is a classic indicator of compromise." },
          ],
        },
      },
      {
        title: "9:00 AM — A flagged email",
        body: "A user forwarded an email to the abuse@ inbox: 'Looks weird, can you check?' The email claims to be from the company's CFO and asks the recipient to buy gift cards for a client appreciation event, urgently, and reply with the codes.",
        choice: {
          prompt: "What do you do first?",
          options: [
            { label: "Reply telling the user it's almost certainly fake", feedback: "Good instinct, but reply too fast and you'll miss verifying. Confirm first." },
            { label: "Look up whether the email actually came from the CFO's account", feedback: "Right. The 'From' line can be spoofed. Check the email headers and the actual sending domain before doing anything else." },
            { label: "Forward it to the CFO directly to ask", feedback: "Avoid this — if the CFO's account is compromised, you've just tipped off the attacker. Verify through a separate channel." },
          ],
        },
      },
      {
        title: "11:00 AM — Vulnerability briefing",
        body: "A new vulnerability was published overnight in a piece of software your company uses on dozens of servers. The vendor has released a patch. Your job is to brief the engineering team.",
        choice: {
          prompt: "What does the team most need from you?",
          options: [
            { label: "The technical details of the bug", feedback: "Some of them want that, but not all. Start with what they actually need: how bad it is, what they have to do, and by when." },
            { label: "A risk rating and a deadline for patching", feedback: "Yes. The job is to translate the vulnerability into a decision the team can act on." },
            { label: "A complete copy of the vendor advisory", feedback: "They can read that themselves. Your value is making it short and clear." },
          ],
        },
      },
      {
        title: "1:00 PM — Firewall rule change request",
        body: "An engineer wants to open a port through the firewall so a new service can talk to a payment provider. They sent you a ticket with the source IP, destination IP, and port. They want it done today.",
        choice: {
          prompt: "What do you ask before approving?",
          options: [
            { label: "Nothing — they own the service, just open it", feedback: "Too fast. Firewall changes are reviewed because they widen the attack surface." },
            { label: "Whether the destination is on an allowlist and what the service does", feedback: "Right. Least privilege and traceability — those are the questions every change should answer." },
            { label: "Whether the change can wait until next month", feedback: "Maybe, but you don't have grounds to delay it without understanding the request." },
          ],
        },
      },
      {
        title: "3:00 PM — Writing an incident report",
        body: "Yesterday's phishing investigation is closed. The user clicked, but the attacker didn't get further than a single account, which you locked within 20 minutes. You're writing the after-action report.",
        choice: {
          prompt: "What's the single most valuable thing to include?",
          options: [
            { label: "A long technical timeline of every action you took", feedback: "Useful for the file, but not what makes the report valuable." },
            { label: "The lesson learned and one change you'd recommend", feedback: "Right. Incident reports that don't change anything aren't worth writing." },
            { label: "Quotes from the user about how it happened", feedback: "Helpful context, but secondary to the recommendation." },
          ],
        },
      },
      {
        title: "5:00 PM — Handoff to the evening shift",
        body: "You're about to leave. The evening analyst is just signing in. They ask: 'Anything I need to know?'",
        choice: {
          prompt: "What do you say?",
          options: [
            { label: "Nothing major, have a good shift", feedback: "Almost never the right answer. There's always context worth passing." },
            { label: "The two open investigations and what's expected to come in tonight", feedback: "Right. Good handoffs are why incidents don't fall through the cracks." },
            { label: "A long verbal recap of the whole day", feedback: "Too much. Hand off what's still open and what to watch for; the rest is in tickets." },
          ],
        },
      },
    ],
  },
  practice: {
    estMinutes: 12,
    intro: "Match each person to the cyber role that fits them best. There are no single right answers — the feedback explains what an experienced mentor would say. Take multiple attempts; this is about pattern recognition, not a test.",
    items: [
      {
        prompt: '"I love puzzles. I notice patterns nobody else does. I want to work from home and not have to be on calls all day."',
        options: [
          { label: "Threat Hunter / SOC Analyst", correct: true, feedback: "Strong match. Threat hunting is heavy pattern-recognition work and remote-friendly at many companies." },
          { label: "Sales Engineer (cyber tools)", correct: false, feedback: "Sales engineers spend a lot of time on calls — probably not the right fit." },
          { label: "Penetration Tester", correct: true, feedback: "Also a good fit. Pen testers solve puzzles for a living, and a lot of the work is remote." },
        ],
      },
      {
        prompt: '"I\'m a strong writer and a strong communicator. I like translating tech for people who don\'t live in it."',
        options: [
          { label: "GRC Analyst", correct: true, feedback: "Yes. GRC roles translate technical risk into policy and decisions for non-technical leaders." },
          { label: "Reverse Engineer / Malware Analyst", correct: false, feedback: "Communication matters, but this role is deeply technical with less writing." },
          { label: "Security Awareness Trainer", correct: true, feedback: "Strong fit. Half the job is writing and presenting." },
        ],
      },
      {
        prompt: '"I\'m into infrastructure. I want to build secure systems, not just monitor them."',
        options: [
          { label: "Security Engineer / Cloud Security Engineer", correct: true, feedback: "Right match. These roles design and build the defenses other people use." },
          { label: "Incident Responder", correct: false, feedback: "Incident response is reactive — focused on what's already gone wrong, not on building." },
          { label: "Identity & Access Management (IAM) Engineer", correct: true, feedback: "Also a strong fit. IAM is a core piece of system design." },
        ],
      },
      {
        prompt: '"I want a job where I respond to real emergencies. I do well under pressure."',
        options: [
          { label: "Incident Responder / DFIR", correct: true, feedback: "Exactly. Digital forensics and incident response is built around emergencies." },
          { label: "Compliance Auditor", correct: false, feedback: "Important work, but slower-paced and process-driven." },
          { label: "SOC Tier-2/Tier-3 Analyst", correct: true, feedback: "Tier-2 and Tier-3 SOC roles handle live incidents that the front-line couldn't resolve." },
        ],
      },
      {
        prompt: '"I have a non-technical background. I want to get into cyber but I don\'t know where to start."',
        options: [
          { label: "Start with ISC2 Certified in Cybersecurity (CC) — free, 16+ eligible", correct: true, feedback: "Yes. ISC2 CC is the most accessible starting credential, and the first year is free under their One Million pledge." },
          { label: "Get a four-year degree first", correct: false, feedback: "Some people do, but it isn't required. Certifications and home-lab work can get you to entry-level faster." },
          { label: "Start with IT help desk or technical support", correct: true, feedback: "Also a real path. Many SOC analysts came from help desk." },
        ],
      },
      {
        prompt: '"I want to break things. Legally."',
        options: [
          { label: "Penetration Tester / Red Team", correct: true, feedback: "Exact match. Pen testers are paid to break in legally and write up what they found." },
          { label: "Bug Bounty Hunter", correct: true, feedback: "Also a fit. Bug bounty platforms let you do this on a freelance basis." },
          { label: "Compliance Auditor", correct: false, feedback: "Auditors check whether controls exist, not whether they hold up against an attacker." },
        ],
      },
    ],
  },
  homework: {
    estMinutes: 10,
    title: "Cyber in your world",
    prompt: "For the next week, notice how often cybersecurity touches your daily life. Then come back to this module and submit your reflection.",
    instructions: [
      "Keep a running count: every time a system asks you to log in, every 2FA code you get, every 'this site is not secure' warning, every app update — count it.",
      "List 3 specific examples that stood out to you.",
      "Write one thing that surprised you. Was it more often than you expected? Less?",
    ],
    placeholder: "Example: I noticed I unlocked my phone 67 times in one day. The most surprising one was the school portal asking for 2FA every time — I usually just click through it without thinking.",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Module 2 — Digital Safety Sim
// ────────────────────────────────────────────────────────────────────────────

const DIGITAL_SAFETY: ModuleContent = {
  slug: "digital-safety-sim",
  title: "Digital Safety Sim",
  totalMinutes: 60,
  hook: {
    estMinutes: 4,
    title: "It doesn't happen to dumb people",
    paragraphs: [
      "Picture this: it's a Tuesday afternoon. You're between classes. Your phone buzzes with a text from what looks like your bank: 'Suspicious login detected. Verify your account at the link below to keep access.' The link looks right. The logo looks right. You're in a hurry.",
      "You tap. You log in. Twenty minutes later, your account is empty.",
      "This is not a story about a person who didn't know better. It's a story about a person who was busy. That's how almost every successful attack works — not by outsmarting you, but by catching you while you're not paying attention.",
    ],
    closer: "The good news: a handful of habits stop most of these attacks cold. Let's build them.",
  },
  reading: {
    estMinutes: 12,
    sections: [
      {
        heading: "How attackers actually think",
        paragraphs: [
          "When you picture a hacker, you probably picture someone typing furiously, breaking through a firewall. That's a movie. The real version is more boring and a lot more effective.",
          "Real attackers don't usually break in. They get invited in. Their main tool is **social engineering** — the art of manipulating people into giving up information or access. It works because humans are predictable. We trust messages that look familiar, we respond to urgency, we want to help, and we don't want to look stupid.",
          "An attacker who can get one person on the inside to click one link almost always gets further than one who tries to brute-force their way through the technical defenses.",
        ],
        callout: "Most attacks don't break in. They get invited in.",
        keyTerms: [
          { term: "Social engineering", definition: "Manipulating people to disclose information or perform actions, instead of attacking systems directly." },
        ],
      },
      {
        heading: "The big five attacks aimed at you",
        paragraphs: [
          "**Phishing** is a fake message — usually email — that tries to get you to click, log in, or pay. Industry breach reports consistently find that the majority of breaches involve a human element, and phishing is the most common entry point.",
          "**Smishing** is the same idea, by text message. People tend to be less skeptical of texts than email, which makes smishing more dangerous, not less.",
          "**Vishing** is phone-based. A caller claims to be from the IRS, your bank, or your school's tech support. The urgency feels real because it's a live human voice on the other end.",
          "**Credential stuffing** is when an attacker takes a list of passwords leaked from one site and tries them on every other site. It works because most people reuse passwords. If your email/password combination has ever appeared in a breach, someone has tried it on a hundred other services.",
          "**MFA fatigue** is newer. An attacker who already has your password spams login attempts at 2 AM. The push notification keeps buzzing. Eventually, half-asleep, you tap Approve. They're in.",
        ],
        grcLens: {
          body: "Most companies are **legally required** to train employees on phishing. Compliance frameworks like **SOC 2**, **ISO 27001**, and the **HIPAA Security Rule** mandate annual security-awareness training. GRC analysts plan those trainings, document the rosters, and verify completion when an auditor asks.",
        },
      },
      {
        heading: "Your defense layers",
        paragraphs: [
          "**Long, unique passwords on every account.** The current NIST guidance (SP 800-63B) is that length beats complexity — a 16-character passphrase is stronger and easier to remember than 'P@ssw0rd1!'. The most important rule is uniqueness: never reuse passwords across accounts that matter.",
          "**Use a password manager.** You cannot keep track of 80 unique passwords in your head. Free options that work well: Bitwarden, KeePassXC, and the password manager built into your browser. Pick one and start with your most important accounts.",
          "**Turn on multi-factor authentication everywhere it's offered.** Especially for email — your email is the recovery channel for everything else. An attacker who controls your email can reset most of your other passwords.",
          "**Develop a healthy skepticism.** If a message feels urgent — 'act now,' 'verify immediately,' 'your account will be closed' — that urgency is the attack. Real institutions don't demand instant action through unverified links.",
          "**Verify out-of-band.** If your bank texts you, don't tap the link. Open the bank's app or type the URL yourself. If your boss emails you urgently, message them on a separate channel before you act.",
        ],
        callout: "Length beats complexity. Uniqueness beats both. A password manager makes both possible.",
        grcLens: {
          body: "**NIST SP 800-63B** is the federal guideline for password rules. It's why your bank stopped forcing you to change your password every 90 days — research showed forced rotation made security **worse**, not better, because people picked weaker passwords. GRC people read these guidelines so companies don't have to guess.",
        },
      },
      {
        heading: "When you slip up anyway",
        paragraphs: [
          "Everyone slips eventually. The difference between a small incident and a bad one is what you do in the first hour.",
          "Don't panic. Change the password on the compromised account immediately, then change it on every other account where you reused that password. Turn on MFA if it wasn't already on. Check **Have I Been Pwned** to see if your email has appeared in known breaches. Monitor financial accounts and your inbox for the next 30 days for suspicious activity.",
          "If a school, work, or government account is affected, report it through the proper channel. Reporting matters even if nothing visibly bad happened — your report is what helps the security team catch the next attempt.",
        ],
      },
    ],
    citations: [
      "NIST SP 800-63B Digital Identity Guidelines — https://pages.nist.gov/800-63-3/sp800-63b.html",
      "Verizon Data Breach Investigations Report — https://www.verizon.com/business/resources/reports/dbir/",
      "Have I Been Pwned — https://haveibeenpwned.com/",
      "CISA Phishing Guidance — https://www.cisa.gov/news-events/news/avoiding-social-engineering-and-phishing-attacks",
    ],
  },
  lesson: {
    estMinutes: 18,
    intro: "Five scenarios. In each one, you're the person being targeted. Pick the move that an experienced person would make. Feedback explains the reasoning.",
    scenes: [
      {
        title: "The 'bank' text",
        body: "It's lunch break. Your phone buzzes: 'CHASE ALERT: A $480 charge was attempted on your card. If this wasn't you, verify at chase-secure-verify.com/login within 30 minutes.'",
        choice: {
          prompt: "What do you do?",
          options: [
            { label: "Tap the link and log in to check", feedback: "This is the trap. The domain isn't actually Chase's. Once you log in, your credentials are in attacker hands." },
            { label: "Open the Chase app yourself and check your account", feedback: "Right. Always verify through the channel you trust, not the channel that contacted you." },
            { label: "Ignore it — it's probably nothing", feedback: "Risky. The right move is to verify, not to ignore. But the verification path should be your own." },
          ],
        },
      },
      {
        title: "The new password",
        body: "You're setting up a new account. The site asks for a password. You usually pick one of three passwords you've memorized.",
        choice: {
          prompt: "What do you pick?",
          options: [
            { label: "One of your three usual passwords", feedback: "If any of those passwords has ever appeared in a breach, this new account is already at risk." },
            { label: "A long passphrase generated by your password manager", feedback: "Best move. Unique per account, long enough to resist guessing, and you don't have to remember it." },
            { label: "Your dog's name with a number on the end", feedback: "Common pattern, easy to guess from your social media. Skip it." },
          ],
        },
      },
      {
        title: "The 'IT help desk' call",
        body: "A caller says they're from your school's IT help desk and need your login to clear a problem with your account. They sound professional and have your name.",
        choice: {
          prompt: "What do you say?",
          options: [
            { label: "Give them your login — they're from the school", feedback: "Real IT will not ask for your password over the phone. This is vishing." },
            { label: "Hang up and call the school's IT line yourself", feedback: "Right. Verify through a channel you initiate. Real IT will be unsurprised by a callback." },
            { label: "Tell them to email you instead", feedback: "Better than handing over your password, but you've left the door open. End the call and verify on your terms." },
          ],
        },
      },
      {
        title: "The coffee-shop WiFi",
        body: "You sit down at a café. There are three open WiFi networks: 'CafeGuest_Free', 'Cafe-WiFi', and 'CafeFreeFastWiFi'. None ask for a password.",
        choice: {
          prompt: "What do you do?",
          options: [
            { label: "Pick whichever has the strongest signal", feedback: "Risky. One of these is probably the real café network, but the others could be attacker hotspots watching your traffic." },
            { label: "Ask the staff which network is theirs, then use it", feedback: "Right. Confirm the actual network name. Avoid the imposters." },
            { label: "Use your phone's hotspot instead", feedback: "Also right. Cellular data is encrypted between your phone and the carrier — a fine fallback." },
          ],
        },
      },
      {
        title: "The 2 AM MFA spam",
        body: "It's 2 AM. Your phone keeps buzzing with login approval requests for your school email account. You're half-asleep. Tapping Approve would make it stop.",
        choice: {
          prompt: "What do you do?",
          options: [
            { label: "Tap Approve so you can sleep", feedback: "Don't. This is MFA fatigue — the attacker already has your password and is hoping you'll cave. Approving lets them in." },
            { label: "Deny each request and change your password immediately", feedback: "Exactly right. The fact that you're getting prompts at all means someone else knows your password." },
            { label: "Turn the phone on silent and deal with it tomorrow", feedback: "You'll stop the buzzing, but the attacker is still trying. Change the password now." },
          ],
        },
      },
    ],
  },
  practice: {
    estMinutes: 12,
    intro: "Six phishing-style messages. For each one, pick the red flag that should make you slow down. Multiple flags can be correct — the feedback explains the call.",
    items: [
      {
        prompt: "From: amaz0n-orders@account-verify.net — Subject: ⚠️ Your order has been suspended — verify now",
        options: [
          { label: "The sender domain is wrong", correct: true, feedback: "Right. Real Amazon emails come from @amazon.com, not @account-verify.net." },
          { label: "The urgency language", correct: true, feedback: "Right. 'Verify now' urgency is a classic phishing pressure tactic." },
          { label: "The emoji in the subject line", correct: false, feedback: "Real companies use emoji sometimes. Not by itself a red flag." },
        ],
      },
      {
        prompt: "From: principal@your-school.edu — Subject: Urgent — student aid forms — please pay $50 by 5pm",
        options: [
          { label: "Schools don't ask for payment through email links", correct: true, feedback: "Right. Verify through the school portal, not an email link." },
          { label: "The principal would not send this personally", correct: true, feedback: "Often true. Even if the address looks right, the request pattern is the suspicious part." },
          { label: "The subject line is in all caps", correct: false, feedback: "It isn't actually in all caps here. The real flags are the payment request and the urgency." },
        ],
      },
      {
        prompt: "Text from +1-555-019-3344: 'USPS: Your package could not be delivered. Update address: usps-redelivery.info/update'",
        options: [
          { label: "The URL is not a USPS domain", correct: true, feedback: "Right. Real USPS messages link to usps.com, not lookalike domains." },
          { label: "USPS doesn't text you out of the blue", correct: true, feedback: "Right. If you didn't sign up for tracking texts, you shouldn't receive them." },
          { label: "The phone number isn't formatted nicely", correct: false, feedback: "Many real messages come from short codes or odd numbers. That alone isn't the flag." },
        ],
      },
      {
        prompt: "From: cfo@company-name.com — Subject: Quick favor — need you to buy gift cards for client thank-yous",
        options: [
          { label: "Gift card requests are a classic scam pattern", correct: true, feedback: "Right. Any request to buy gift cards and send codes is almost always a scam." },
          { label: "An executive would normally route this through accounting", correct: true, feedback: "Right. The shortcut around process is part of the scam." },
          { label: "It's friendly and casual", correct: false, feedback: "Casual tone is normal. The red flags are the request type and the urgency." },
        ],
      },
      {
        prompt: "From: hr-benefits@yourcompany-mail.com — Subject: Re-confirm your direct deposit by EOD",
        options: [
          { label: "Sender domain is a lookalike, not the real company domain", correct: true, feedback: "Right. 'yourcompany-mail.com' ≠ 'yourcompany.com'." },
          { label: "Direct deposit changes are an attacker's payday", correct: true, feedback: "Right. Payroll fraud is a major theme of business-email-compromise attacks." },
          { label: "The deadline is the same day", correct: true, feedback: "Right. Urgency is the pressure tactic." },
        ],
      },
      {
        prompt: "DM from a 'recruiter' on LinkedIn: 'We have a $90K junior cyber role, fully remote. Please send your resume and SSN to confirm identity for the background check.'",
        options: [
          { label: "Legitimate recruiters never ask for an SSN before an interview", correct: true, feedback: "Right. SSN at first contact is identity theft, not recruiting." },
          { label: "The salary is suspiciously high for entry-level remote", correct: true, feedback: "Right. 'Too good to be true' is itself a red flag." },
          { label: "Recruiters reach out on LinkedIn all the time", correct: false, feedback: "True, but the ask is the problem, not the channel." },
        ],
      },
    ],
  },
  homework: {
    estMinutes: 10,
    title: "Account audit",
    prompt: "Pick the 5 most important accounts in your life. For each one, walk through this checklist and bring back the results.",
    instructions: [
      "Account name (just initials are fine if you'd rather not name it).",
      "Is the password unique to this account? (Yes / No)",
      "Is MFA turned on? (Yes / No / Not available)",
      "Is the recovery email/phone current? (Yes / No)",
      "One action you'll take in the next 7 days to make this account safer.",
    ],
    placeholder: "Example: 1) School email — password is unique, MFA on, recovery up to date — action: nothing needed. 2) Personal email — password reused, MFA off — action: turn on MFA this weekend.",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Module 3 — Network Basics
// ────────────────────────────────────────────────────────────────────────────

const NETWORK_BASICS: ModuleContent = {
  slug: "network-basics",
  title: "Network Basics",
  totalMinutes: 60,
  hook: {
    estMinutes: 4,
    title: "Fifty milliseconds, a dozen systems",
    paragraphs: [
      "You tap a TikTok video. About fifty milliseconds later, the video starts playing. In that fifty milliseconds, your request travels through more than a dozen separate systems — your phone's WiFi chip, your home router, your internet provider, a DNS server, transit networks, a content delivery network, and the actual TikTok servers. Each one is a place where things can go right or wrong.",
      "Almost every cybersecurity job comes back to this picture. The SOC analyst watching for attacks reads logs from these systems. The penetration tester finds gaps between them. The network engineer designs and defends them.",
    ],
    closer: "If you understand how data actually moves, the rest of cybersecurity gets simpler. Let's trace the path.",
  },
  reading: {
    estMinutes: 13,
    sections: [
      {
        heading: "What is a network?",
        paragraphs: [
          "A **network** is a group of computers that can talk to each other. Your home is a small network: your phone, laptop, smart TV, and game console all connect to the same router. Your school is a bigger one. The internet is the network of all networks.",
          "Networks come in two main flavors. A **LAN** (Local Area Network) is contained — your house, your school, an office. A **WAN** (Wide Area Network) connects LANs across distance, usually through internet provider infrastructure. The path your TikTok request takes is mostly WAN.",
          "Within any network, devices play different roles. A **client** is a device that asks for something — your phone asking for a video. A **server** is a device that provides something — TikTok's machines holding the video. The same device can play both roles, but at any given moment, one side is asking and the other is answering.",
        ],
        keyTerms: [
          { term: "LAN", definition: "Local Area Network — devices in one physical location (a home, school, office)." },
          { term: "WAN", definition: "Wide Area Network — connects networks across geographic distance, including the public internet." },
        ],
      },
      {
        heading: "How data actually travels",
        paragraphs: [
          "When you tap that video, your phone doesn't send 'play this video' as one big message. It breaks the request into **packets** — small numbered envelopes — and sends them out one at a time. Each packet has a header (where it's going, where it came from, what number it is in the sequence) and a payload (the actual data).",
          "Each device on a network has an **IP address** — a numeric label like 192.168.1.42 or an IPv6 equivalent. IP addresses work like street addresses for the internet. Without them, packets wouldn't know where to go.",
          "But you don't type IP addresses. You type tiktok.com. That's what **DNS** (the Domain Name System) is for. DNS is the internet's phone book: it translates human-readable names into the IP addresses computers actually use. Most of the time you never notice DNS — until it breaks, and then nothing works.",
          "All of this happens according to **protocols** — agreed-upon rules. **TCP** is the protocol that makes sure packets arrive in order and complete (your TikTok video can't have missing frames). **UDP** is faster but doesn't guarantee delivery (good for live video calls where 'now' beats 'perfect'). **HTTP** and **HTTPS** are the protocols that web traffic rides on top of TCP.",
        ],
        callout: "Packets, addresses, names, rules. Almost every network problem is one of these four things misbehaving.",
        keyTerms: [
          { term: "Packet", definition: "A small piece of data with addressing info — the basic unit networks move around." },
          { term: "IP address", definition: "Numeric identifier for a device on a network." },
          { term: "DNS", definition: "Domain Name System — translates names like tiktok.com into IP addresses." },
          { term: "TCP / UDP", definition: "Transport protocols. TCP is reliable and ordered. UDP is fast and best-effort." },
        ],
      },
      {
        heading: "HTTP vs HTTPS — and why the lock matters",
        paragraphs: [
          "**HTTP** is the original protocol for the web. It's plain text. Anyone who can see the network traffic — your roommate on the same WiFi, the coffee shop's router operator, an attacker who set up a fake hotspot — can read everything you send and receive.",
          "**HTTPS** is HTTP wrapped in **TLS** (Transport Layer Security), which encrypts the traffic. That's what the lock icon in your browser means. With HTTPS, even someone watching the network can see that you talked to a server, but not what you said.",
          "This is why every login page should be HTTPS. If you ever see a site asking for a password over plain HTTP, walk away. Modern browsers will mark those sites with 'Not Secure.'",
        ],
        callout: "The 'S' in HTTPS is the difference between a postcard and a sealed envelope.",
      },
      {
        heading: "Network security devices",
        paragraphs: [
          "**Firewalls** are filters that decide which traffic gets through. A firewall sits between your network and the rest of the internet and enforces rules: this kind of traffic to that destination is allowed, this other kind is blocked. Almost every business network has firewalls.",
          "**VPNs** (Virtual Private Networks) create an encrypted tunnel between two endpoints. When you connect to your school's VPN, your laptop acts as if it were physically inside the school's network, even if you're at home. VPNs are how remote workers get safe access to internal systems.",
          "**IDS** (Intrusion Detection Systems) watch network traffic and raise alerts when something looks suspicious. **IPS** (Intrusion Prevention Systems) do the same thing but also block the traffic automatically. SOC analysts spend a lot of time reviewing IDS alerts.",
        ],
        grcLens: {
          body: "Firewall rules aren't just security best practice — they're often **legal requirements**. **PCI-DSS**, the standard for any business that handles credit cards, mandates specific firewall configurations. GRC teams audit those configs and produce the evidence regulators ask for.",
        },
      },
      {
        heading: "Logging — and how long to keep it",
        paragraphs: [
          "Every device on the network can produce logs — records of who connected, from where, when, and what they did. Most networks generate far more log data than any human could read in real time, which is why SIEM tools exist to collect and search across all of it.",
          "But there's a second reason logs matter: **regulations require them**. If your company handles health data, payment data, or financial records, you don't get to choose whether to keep logs. You don't even get to choose how long.",
        ],
        grcLens: {
          body: "Most regulations require logs to be **retained for years**. **HIPAA: 6 years.** **SOX: 7 years.** **PCI-DSS: 1 year minimum, with 3 months immediately accessible.** GRC people figure out what to log, where to store it, and how to prove the retention policy actually held when an auditor asks.",
        },
      },
    ],
    citations: [
      "Cisco Networking Basics — https://www.cisco.com/c/en/us/solutions/small-business/resource-center/networking/networking-basics.html",
      "IETF RFC 9110 (HTTP Semantics) — https://datatracker.ietf.org/doc/rfc9110/",
      "Mozilla MDN — How the Web Works — https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/How_the_Web_works",
      "NIST SP 800-41 (Guidelines on Firewalls) — https://csrc.nist.gov/publications/detail/sp/800-41/rev-1/final",
    ],
  },
  lesson: {
    estMinutes: 18,
    intro: "Trace a single web request from your laptop to a server and back. Each scene is one hop in the journey. Pick what you think happens at that hop — the feedback fills in what's actually going on.",
    scenes: [
      {
        title: "You type the URL",
        body: "You open a browser and type 'tiktok.com' in the address bar.",
        choice: {
          prompt: "What does the browser need to do first?",
          options: [
            { label: "Send a packet to tiktok.com", feedback: "Almost — but the browser doesn't yet know where tiktok.com is. It needs an IP address first." },
            { label: "Ask a DNS server to look up the IP address for tiktok.com", feedback: "Right. DNS resolution happens before any actual data is sent." },
            { label: "Encrypt the URL", feedback: "Encryption comes later, once the connection is being set up." },
          ],
        },
      },
      {
        title: "DNS responds",
        body: "The DNS server returns an IP address, like 142.250.190.78. Your laptop now knows where to send packets.",
        choice: {
          prompt: "What happens if DNS is slow or wrong?",
          options: [
            { label: "Pages fail to load even though your network is fine", feedback: "Right. Most 'the internet is broken' calls are actually DNS problems." },
            { label: "Your IP address changes", feedback: "DNS doesn't change your IP — it just tells you the IP of where you're trying to reach." },
            { label: "Your password is exposed", feedback: "DNS issues don't directly leak passwords — though attackers do try to poison DNS to redirect you somewhere malicious." },
          ],
        },
      },
      {
        title: "Setting up HTTPS",
        body: "Your laptop opens a TCP connection to the TikTok server, then begins the TLS handshake — agreeing on encryption keys with the server.",
        choice: {
          prompt: "Why does this handshake matter for security?",
          options: [
            { label: "It encrypts everything that comes after, so the network can't read it", feedback: "Right. Once the handshake is done, attackers on the network see noise, not your traffic." },
            { label: "It makes the connection faster", feedback: "It actually adds a small delay — the trade-off is worth it for security." },
            { label: "It hides your IP address", feedback: "TLS doesn't hide your IP. A VPN can, but TLS is about content encryption." },
          ],
        },
      },
      {
        title: "Through the router",
        body: "Your packets leave your laptop and hit your home router, which forwards them out to your internet provider.",
        choice: {
          prompt: "What does the router do at this point?",
          options: [
            { label: "Inspect the contents of every packet", feedback: "Most home routers don't inspect contents — they just route. Some business firewalls do deeper inspection." },
            { label: "Add its own address so return packets know where to come back", feedback: "Right. This is called NAT (Network Address Translation) — it's how multiple devices share one public IP." },
            { label: "Slow the packets down on purpose", feedback: "Not intentionally. Routers add a small amount of latency but they're trying to forward as fast as they can." },
          ],
        },
      },
      {
        title: "Hitting a firewall",
        body: "Somewhere between you and TikTok, packets pass through one or more firewalls — at your ISP, at TikTok's data center, or both.",
        choice: {
          prompt: "What does a firewall actually do?",
          options: [
            { label: "Lets through traffic that matches its allowed rules and blocks the rest", feedback: "Right. Firewalls enforce a policy — what's permitted, in which direction, on which port." },
            { label: "Encrypts traffic", feedback: "That's TLS, not a firewall. Firewalls filter; they don't usually encrypt." },
            { label: "Speeds up the connection", feedback: "Firewalls add a small overhead. They don't speed traffic up." },
          ],
        },
      },
      {
        title: "Server responds",
        body: "The TikTok server processes your request and sends back the video data, packet by packet.",
        choice: {
          prompt: "What ensures all the packets arrive in the right order?",
          options: [
            { label: "TCP", feedback: "Right. TCP handles ordering, retransmission of lost packets, and confirmation of receipt." },
            { label: "DNS", feedback: "DNS is for name lookups, not data delivery." },
            { label: "The firewall", feedback: "Firewalls filter — they don't reorder packets." },
          ],
        },
      },
      {
        title: "Video plays",
        body: "Your phone reassembles the packets and starts the video. The whole journey took about 50 milliseconds.",
        choice: {
          prompt: "Looking back at the path — where could an attacker most easily insert themselves?",
          options: [
            { label: "Between you and the WiFi router (e.g., on a public hotspot)", feedback: "Right. The closer to you, the easier to intercept — especially on open WiFi without HTTPS." },
            { label: "Inside the TikTok data center", feedback: "Possible but far harder. Big cloud operators have heavy defenses inside their perimeter." },
            { label: "Inside the DNS server's hard drive", feedback: "Not the typical attack — DNS attacks usually intercept the queries in flight or poison the cache, not the disk." },
          ],
        },
      },
    ],
  },
  practice: {
    estMinutes: 12,
    intro: "Six network scenarios. For each one, identify what is happening and what could go wrong. The feedback explains a defender's read.",
    items: [
      {
        prompt: "A laptop joins an open coffee-shop WiFi network with no password.",
        options: [
          { label: "Anyone on the same network can potentially see plain-text traffic", correct: true, feedback: "Right. Open WiFi means no link-layer encryption. HTTPS still protects HTTPS traffic, but DNS and other plain protocols leak." },
          { label: "The laptop is automatically encrypted by the WiFi", correct: false, feedback: "Open WiFi doesn't encrypt — that's the definition of 'open.'" },
          { label: "A VPN would mitigate most of the eavesdropping risk", correct: true, feedback: "Right. A VPN tunnels everything through an encrypted connection, so the local network can't read it." },
        ],
      },
      {
        prompt: "A user clicks a link to 'paypa1.com' (with a number 1 instead of a letter L).",
        options: [
          { label: "This is a typosquat — a fake domain that looks like the real one", correct: true, feedback: "Right. Attackers register lookalike domains to catch fast-moving readers." },
          { label: "DNS will refuse to resolve it because it's misspelled", correct: false, feedback: "DNS happily resolves any registered domain, including lookalikes." },
          { label: "The browser will block it automatically", correct: false, feedback: "Sometimes a browser will flag a known phishing site, but it can't catch every new lookalike." },
        ],
      },
      {
        prompt: "A company server is getting 8,000 failed login attempts per minute from many different IP addresses.",
        options: [
          { label: "This looks like a distributed credential-stuffing or brute-force attack", correct: true, feedback: "Right. The 'many different IPs' part is the signature of a botnet trying to spread the attack." },
          { label: "It is probably a single user typing fast", correct: false, feedback: "No human types 8,000 attempts per minute, especially not from many IPs at once." },
          { label: "Rate-limiting and MFA would help mitigate", correct: true, feedback: "Right. Lock out IPs that fail repeatedly, and require MFA so a leaked password alone isn't enough." },
        ],
      },
      {
        prompt: "A DNS request that normally returns in 30 milliseconds is taking 8 seconds tonight.",
        options: [
          { label: "It could be a benign DNS server outage", correct: true, feedback: "Right. DNS slowness is often infrastructure trouble." },
          { label: "It could be a sign of DNS-based attack or poisoning", correct: true, feedback: "Right — sometimes the attacker is in the way. A SOC analyst would check both possibilities." },
          { label: "It means TikTok specifically is down", correct: false, feedback: "DNS slowness affects many sites, not just one." },
        ],
      },
      {
        prompt: "An employee's laptop is trying to send a 4 GB file to an external IP at 3 AM.",
        options: [
          { label: "This pattern matches data exfiltration", correct: true, feedback: "Right. Large outbound transfers at off-hours are a classic exfil indicator." },
          { label: "It is probably a normal backup", correct: false, feedback: "Possible — but the SOC should verify, not assume. Backups should be documented." },
          { label: "An IDS or DLP system should raise an alert", correct: true, feedback: "Right. Data Loss Prevention (DLP) and IDS are designed for exactly this pattern." },
        ],
      },
      {
        prompt: "A user sees 'Not Secure' in the browser address bar on the school portal login page.",
        options: [
          { label: "The page is being served over HTTP, not HTTPS", correct: true, feedback: "Right. Modern browsers flag any password field on plain HTTP." },
          { label: "Entering credentials here exposes them on the network", correct: true, feedback: "Right. Any login over HTTP can be captured by anyone in the middle." },
          { label: "It's safe — schools always use 'Not Secure' internally", correct: false, feedback: "Not true. Real internal portals use HTTPS. Report this to IT." },
        ],
      },
    ],
  },
  homework: {
    estMinutes: 10,
    title: "Map your home network",
    prompt: "On paper or digitally, draw your home (or family-permitted) network. The goal is to build the habit of seeing infrastructure you normally ignore.",
    instructions: [
      "Identify the router. Brand and model if you can read the label.",
      "List every device connected to it: phones, laptops, TVs, game consoles, doorbells, smart speakers, anything online.",
      "Pick the device you think is the highest security risk and explain why in one sentence.",
      "One concrete change you would make to improve the network's security (e.g., change a default password, segment guest WiFi, update firmware).",
    ],
    placeholder: "Example: Router is a Netgear R6700. Connected devices: 4 phones, 2 laptops, smart TV, Ring doorbell, 2 smart bulbs, gaming console. Highest risk: the smart bulbs — they're old and haven't been updated. Change I'd make: move all smart-home devices to the guest WiFi to keep them off the main network.",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Module 4 — Threat Detective
// ────────────────────────────────────────────────────────────────────────────

const THREAT_DETECTIVE: ModuleContent = {
  slug: "threat-detective",
  title: "Threat Detective",
  totalMinutes: 60,
  hook: {
    estMinutes: 4,
    title: "It's 3:47 AM",
    paragraphs: [
      "It's 3:47 AM. An on-call SOC analyst's pager goes off. The SIEM dashboard shows a successful login from an IP address geolocated in a country where the company has no employees. The user account is a senior engineer's.",
      "The analyst has fifteen minutes to make a call. Is it an employee traveling on vacation who forgot to tell IT? Is the engineer's password sitting on a credential dump from a breach last year? Is this the first move of a coordinated intrusion?",
      "This is the job. Reading clues fast and well, with limited information, and making a defensible decision.",
    ],
    closer: "Threat detection is part discipline, part pattern matching, part curiosity. Let's build the muscle.",
  },
  reading: {
    estMinutes: 13,
    sections: [
      {
        heading: "What threat detection actually looks like",
        paragraphs: [
          "Inside almost every medium or large company is a **Security Operations Center**. It might be a physical room with screens, or a virtual team scattered across time zones — either way, the job is the same: watch the systems, find the bad activity, raise the alarm.",
          "SOCs are organized in tiers. **Tier 1** triages alerts as they come in — most are false positives, some get escalated. **Tier 2** investigates the escalations. **Tier 3** handles the hard cases and contributes to detection engineering. Getting hired into Tier 1 is a common entry point into the field.",
          "The challenge isn't a lack of data. The challenge is too much data. A typical SOC sees thousands to millions of events per day. The job is **signal versus noise** — separating what matters from what doesn't, fast.",
        ],
        callout: "The job isn't 'find every alert.' The job is 'find the ones that matter — fast.'",
      },
      {
        heading: "Reading the logs",
        paragraphs: [
          "Almost every defense generates **logs** — records of what happened, when, and who or what was involved. Logs come from authentication systems, firewalls, applications, endpoints, cloud services, and more.",
          "A typical log line looks like: '2026-05-14 03:47:12 user=jchen action=login src_ip=185.94.111.23 result=success geo=RO ua=Mozilla/5.0...'. Timestamp, user, action, source IP, outcome, sometimes geography, sometimes user-agent. Once you can read this pattern, you can read most logs.",
          "Logs are useful as a stream (watching events in real time) and as history (searching back for evidence of an incident). SIEM (Security Information and Event Management) tools collect logs from many sources, normalize them, and let analysts query and correlate across them.",
        ],
        keyTerms: [
          { term: "SIEM", definition: "Security Information and Event Management — central system that collects, correlates, and lets analysts query security logs." },
          { term: "Endpoint", definition: "An individual computer (laptop, server, phone) — as opposed to network infrastructure." },
        ],
      },
      {
        heading: "Indicators of compromise",
        paragraphs: [
          "**Indicators of compromise (IOCs)** are observable signs that something bad has happened — or is about to. Some classics every analyst learns to look for:",
          "**Impossible travel.** A user logs in from New York at 2 PM, then from Romania at 2:15 PM. Unless they have a time machine, one of those is not them.",
          "**Failed-then-successful logins.** Lots of failures followed by a success suggest password guessing that worked.",
          "**Off-hours activity.** A normally 9–5 user logging in at 3 AM is worth a second look — especially if they're touching unusual systems.",
          "**Lateral movement.** A compromised laptop suddenly trying to reach servers it never normally talks to.",
          "**Data exfiltration patterns.** Large outbound transfers, especially to file-sharing services or unusual destinations.",
          "**Privilege escalation.** A regular user account suddenly running admin commands.",
        ],
        callout: "Most attacks don't look 'wrong.' They look 'unusual.' Knowing 'normal' is half the job.",
      },
      {
        heading: "The incident response process",
        paragraphs: [
          "When an alert turns out to be real, it becomes an **incident**, and there's a process for handling it. NIST's framework (SP 800-61) has four phases:",
          "**Preparation** — the work you do before anything happens: building playbooks, training the team, making sure logs exist.",
          "**Detection and Analysis** — recognizing that an incident is in progress, scoping it, understanding what's affected.",
          "**Containment, Eradication, and Recovery** — stopping the spread, removing the attacker's access, getting systems back to normal.",
          "**Post-Incident Activity** — writing the after-action report, updating playbooks, fixing the root cause so the same thing doesn't happen again.",
          "Most of an analyst's day is in the first two phases. The third is where adrenaline runs high. The fourth is where the real learning happens.",
        ],
        grcLens: {
          body: "Every breach triggers **compliance obligations**. Most U.S. states have breach-notification laws with hard deadlines — usually 30 to 60 days, sometimes as little as **72 hours** (GDPR in the EU; some state laws for specific data types). GRC people own those notification workflows and the legal-language drafting that goes with them. When the FBI shows up after a breach, they talk to **GRC and legal first** — because that's where the documentation lives.",
        },
      },
    ],
    citations: [
      "NIST SP 800-61 Rev. 2 — Computer Security Incident Handling Guide — https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final",
      "MITRE ATT&CK Framework — https://attack.mitre.org/",
      "SANS Reading Room — Incident Handling — https://www.sans.org/white-papers/",
      "CISA Incident Reporting — https://www.cisa.gov/topics/cyber-threats-and-advisories/incident-detection-response",
    ],
  },
  lesson: {
    estMinutes: 18,
    intro: "Work through a single investigation, scene by scene. The 3:47 AM alert from the hook is real, and you're the analyst.",
    scenes: [
      {
        title: "The alert fires",
        body: "Login success for user 'mchen' from IP 185.94.111.23 (geolocated: Romania). User normally logs in from Austin, TX. This is your first signal.",
        choice: {
          prompt: "What's your first move?",
          options: [
            { label: "Immediately disable the user's account", feedback: "Aggressive — and sometimes right — but you don't yet know if this is an attack or a vacationing employee. Investigate before you act." },
            { label: "Check the user's other recent activity for 'impossible travel'", feedback: "Right. Look for a prior login from a normal location close in time. If both exist, the new one is suspicious." },
            { label: "Ignore it — Romania isn't a high-risk country", feedback: "Geography matters less than the pattern. Plenty of legitimate users travel; plenty of attackers route through 'safe' countries." },
          ],
        },
      },
      {
        title: "Pull the user's history",
        body: "You search the past 24 hours for this user. You see: 09:14 login from Austin. 17:42 logout. 20:15 logout (from a different device). 03:47 login from Romania.",
        choice: {
          prompt: "What stands out?",
          options: [
            { label: "Two different logouts and then a foreign login", feedback: "Right. The pattern doesn't match a coherent travel story. This looks more like account use by someone else." },
            { label: "The user works late", feedback: "20:15 isn't late by tech standards. The 03:47 foreign login is the signal." },
            { label: "Nothing — perfectly normal", feedback: "It's not. Two device logouts and then a Romania login at 3:47 AM is not a clean story." },
          ],
        },
      },
      {
        title: "What did they do after logging in?",
        body: "Post-login activity for mchen at 03:47 shows: opened the engineering wiki, downloaded three internal documents, then queried the company directory for 'CFO'.",
        choice: {
          prompt: "How do you read this?",
          options: [
            { label: "Looks like reconnaissance — mapping the environment and looking for valuable targets", feedback: "Right. Downloads of internal docs plus searches for high-value people is a classic post-compromise recon pattern." },
            { label: "Probably just catching up on work", feedback: "At 3:47 AM from Romania, having logged out twice earlier, querying for the CFO — no. This is recon." },
            { label: "Engineering wiki access is normal — ignore", feedback: "Access is normal in isolation. In this context it isn't." },
          ],
        },
      },
      {
        title: "Containment decision",
        body: "Twelve minutes in. You have to make a call.",
        choice: {
          prompt: "What do you do?",
          options: [
            { label: "Disable the account, kill active sessions, and escalate to Tier 2", feedback: "Right. The evidence is strong enough to act. Containment first, full investigation in parallel." },
            { label: "Email the user to ask if it's them", feedback: "Don't email a possibly compromised account — the attacker reads the mail. Reach out by phone, in person, or through a separate channel." },
            { label: "Wait until 8 AM to ask the engineer in person", feedback: "Too slow. Every minute the attacker keeps access is a minute they can do damage." },
          ],
        },
      },
      {
        title: "Reach out to the user",
        body: "You call the user's known cell number. Half-asleep, mchen confirms: not them, not traveling, not on the system right now. They didn't sign in.",
        choice: {
          prompt: "What's next?",
          options: [
            { label: "Confirmed incident. Trigger the IR playbook.", feedback: "Right. You now have a confirmed account takeover. Containment is partly done; the rest of the playbook governs eradication and recovery." },
            { label: "Tell the user not to worry, you handled it", feedback: "Premature. There's still a containment, eradication, and recovery cycle to run." },
            { label: "Re-enable the account so the user can keep working", feedback: "Absolutely not. The account stays disabled until passwords are rotated and MFA is reconfigured." },
          ],
        },
      },
      {
        title: "Post-incident",
        body: "It's now 7 AM. The incident is contained. You're writing the report.",
        choice: {
          prompt: "What's the most important thing the report should answer?",
          options: [
            { label: "How did the attacker get the password in the first place — and how do we stop the next one?", feedback: "Right. Root cause and prevention. An IR report that doesn't change anything is wasted work." },
            { label: "A blow-by-blow of every keystroke you typed", feedback: "Some level of detail is useful for the file, but it's not what makes the report valuable." },
            { label: "Whether the user should be disciplined", feedback: "Almost never — most takeovers aren't the user's fault. Focus on systemic fixes." },
          ],
        },
      },
    ],
  },
  practice: {
    estMinutes: 12,
    intro: "Triage drill. Ten alerts in rapid succession. Pick the right priority for each. Critical = act now. Warning = investigate this shift. Informational = log it. False Positive = noise to filter out.",
    items: [
      {
        prompt: "An admin account logs in successfully from a brand-new IP at 4 AM and immediately runs commands to disable logging.",
        options: [
          { label: "Critical", correct: true, feedback: "Right. Admin login + log tampering at off-hours is one of the highest-priority alerts in any SOC." },
          { label: "Warning", correct: false, feedback: "Underweighting. The disable-logging step is the giveaway — this needs immediate action." },
          { label: "False Positive", correct: false, feedback: "Disabling logging is almost never legitimate during a live session at 4 AM." },
        ],
      },
      {
        prompt: "A user types their password wrong twice, then gets it right on the third try, from their normal device and location.",
        options: [
          { label: "False Positive", correct: true, feedback: "Right. Two failed attempts followed by a success from a known device is everyday user behavior." },
          { label: "Warning", correct: false, feedback: "Pattern matters. From a known device and location, this is just a typo." },
          { label: "Critical", correct: false, feedback: "Far too aggressive. You'd burn the team on noise." },
        ],
      },
      {
        prompt: "A workstation starts encrypting files rapidly and renaming them with a .locked extension.",
        options: [
          { label: "Critical", correct: true, feedback: "Right. This is ransomware in the act. Isolate the machine immediately." },
          { label: "Warning", correct: false, feedback: "Too soft. Ransomware can spread laterally in minutes." },
          { label: "Informational", correct: false, feedback: "This is the textbook critical alert — drop everything." },
        ],
      },
      {
        prompt: "A monthly scheduled backup job runs at 2 AM and transfers 50 GB to the backup server.",
        options: [
          { label: "Informational", correct: true, feedback: "Right. Scheduled, documented, known destination — log it and move on." },
          { label: "Critical", correct: false, feedback: "Without context this could look bad, but it matches the schedule and goes to a known server." },
          { label: "Warning", correct: false, feedback: "If the SOC has the backup schedule documented, this should be a 'don't alert' rule. At worst informational." },
        ],
      },
      {
        prompt: "A new external IP address has tried 240 different usernames against the VPN in the last hour, all failed.",
        options: [
          { label: "Warning — investigate and rate-limit the IP", correct: true, feedback: "Right. Failures only is bad but not catastrophic — block the IP and watch for any successes." },
          { label: "Critical — assume account takeover", correct: false, feedback: "If there are no successes, no account is taken over yet. Warning is the right tier; the action is to block before that changes." },
          { label: "False Positive", correct: false, feedback: "240 usernames from a single new IP is not a false positive — it's a probing attempt." },
        ],
      },
      {
        prompt: "Antivirus on one laptop flagged a file as 'low-confidence' suspicious and quarantined it.",
        options: [
          { label: "Informational, then verify", correct: true, feedback: "Right. Low-confidence detections are common; check whether the file is benign or pivot up if it isn't." },
          { label: "Critical", correct: false, feedback: "Too aggressive for a low-confidence detection. Save Critical for confirmed threats." },
          { label: "False Positive without investigating", correct: false, feedback: "Never auto-dismiss without at least a quick look." },
        ],
      },
      {
        prompt: "A junior employee accidentally emailed a file with personal data of 50 customers to the wrong external recipient.",
        options: [
          { label: "Warning — privacy incident, follow data-breach process", correct: true, feedback: "Right. This is a real data incident even though it's accidental. Treat it as one." },
          { label: "Informational — they didn't mean it", correct: false, feedback: "Intent doesn't change the regulatory or contractual exposure." },
          { label: "Critical — call the FBI", correct: false, feedback: "Privacy incidents have a defined process — follow it. The FBI isn't typically the first call." },
        ],
      },
      {
        prompt: "A scheduled vulnerability scan generated 1,200 alerts overnight, mostly informational, all from the scanner's own IP.",
        options: [
          { label: "False Positive — tune the rule", correct: true, feedback: "Right. The SOC should exclude its own scanners from alerting; this is noise that risks hiding real signals." },
          { label: "Critical", correct: false, feedback: "These are not real attack alerts. Tuning is the fix." },
          { label: "Warning", correct: false, feedback: "Excludes belong in detection engineering. Don't escalate scanner noise." },
        ],
      },
      {
        prompt: "A developer pushed a config change that briefly opened a database port to the internet for 4 minutes.",
        options: [
          { label: "Warning — investigate whether anyone connected in that window", correct: true, feedback: "Right. The window was small, but it existed. Check logs for any external connections during that time." },
          { label: "Informational — it's already closed", correct: false, feedback: "Too soft. Even short exposures need verification." },
          { label: "Critical", correct: false, feedback: "Critical is for active or sustained exposure. Four minutes that's already closed is Warning." },
        ],
      },
      {
        prompt: "A senior engineer logs in normally, does normal work for two hours, then logs out.",
        options: [
          { label: "Informational (or no alert at all)", correct: true, feedback: "Right. Normal activity from a known user is exactly what should NOT alert. If it is alerting, the rule is too noisy." },
          { label: "Warning", correct: false, feedback: "Nothing about this is suspicious." },
          { label: "Critical", correct: false, feedback: "Far too aggressive — this would burn out any team." },
        ],
      },
    ],
  },
  homework: {
    estMinutes: 10,
    title: "Tabletop: nonprofit phishing",
    prompt: "A small nonprofit you're consulting for had this happen at 9 AM: the executive director clicked a phishing email. Their mailbox is now sending malware-laden replies to staff. They have eight employees, one IT contractor (offsite), and a shared cloud drive. They called you.",
    instructions: [
      "What's the first action in the first 5 minutes?",
      "Who do you call, and in what order?",
      "What do you contain or shut down to keep the incident from spreading?",
      "Write a 3-step plan in plain language the executive director can act on right now.",
    ],
    placeholder: "Example: 1) First 5 min: have the director sign out of email everywhere and change their password from a clean device. 2) Calls: the IT contractor, then notify the rest of the staff to stop replying to anything from her account today. 3) Contain: revoke any active email sessions, scan the inbox rules for malicious forwards the attacker may have set up.",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Module 5 — Cyber Career Map
// ────────────────────────────────────────────────────────────────────────────

const CAREER_MAP: ModuleContent = {
  slug: "career-map",
  title: "Cyber Career Map",
  totalMinutes: 60,
  hook: {
    estMinutes: 4,
    title: "The map is real",
    paragraphs: [
      "Imagine a 19-year-old, no degree, working part-time at a phone store. They start studying for ISC2 Certified in Cybersecurity in their off hours — the certification is free in year one. Then Cisco Networking Academy's free Introduction to Cybersecurity. Then a CompTIA Security+ certification. A year later, they apply for SOC analyst roles. Many of them get callbacks.",
      "This isn't a fantasy. It's a documented pattern. Many entry-level cyber professionals don't have four-year computer science degrees. They have a certification or two, a clear interest, and the persistence to keep going through a hundred 'no's to find the 'yes.'",
    ],
    closer: "There isn't one path into cyber. There are dozens. Here's the map.",
  },
  reading: {
    estMinutes: 13,
    sections: [
      {
        heading: "The five major pillars",
        paragraphs: [
          "Cybersecurity is wide. Most jobs fit into one of five pillars.",
          "**Security Operations** is the day-to-day defense — SOC analysts, threat hunters, incident responders. If you like investigating live problems and reading clues, this is your pillar.",
          "**Offensive Security** is the legal-attacker side — penetration testers, red teamers, bug bounty hunters. If you like puzzles and reverse-engineering, this is your pillar.",
          "**Governance, Risk, and Compliance (GRC)** is the policy and audit side — risk analysts, compliance auditors, security awareness leads. If you're a strong writer and communicator who can translate tech for non-tech, this pillar needs you.",
          "**Engineering and Architecture** is the build side — security engineers, cloud security engineers, identity and access management specialists, network security engineers. If you like building defenses rather than just monitoring them, this is your pillar.",
          "**Digital Forensics and Investigation** is the after-the-fact reconstruction — DFIR analysts, malware analysts, fraud investigators. If you like piecing together what happened from limited evidence, here.",
        ],
      },
      {
        heading: "The entry-level reality check",
        paragraphs: [
          "Most cybersecurity job postings labeled 'entry-level' ask for one to two years of relevant experience. This is the source of the famous 'cyber experience paradox': you can't get a job without experience, and you can't get experience without a job.",
          "There are real ways out of the paradox. **Home labs** — running a virtual SOC environment, capture-the-flag (CTF) challenges, TryHackMe and HackTheBox accounts — count as experience for the right hiring managers. **Internships and apprenticeships** (CyberFastTrack, AFA CyberPatriot, NSA Stokes Educational Scholarship Program, government Pathways programs) build the resume. **Adjacent IT roles** like help desk, junior network admin, or systems support are how a lot of SOC analysts get their start.",
          "Salary ranges in the U.S. for entry-level cyber roles commonly fall in the $60,000–$80,000 band, with significant variation by city and specialization. Mid-level (two to five years of experience) commonly reaches $90,000–$130,000.",
        ],
        callout: "The experience paradox is real — but home labs, internships, and IT roles are how people get past it.",
        grcLens: {
          body: "Most cybersecurity job postings require some technical experience. But **GRC is the exception**. It's the most accessible entry point in the industry — paralegal, audit, business-analyst, and communications backgrounds all transfer in. **GRC pays as well as technical roles**, and the field is less crowded than 'SOC analyst' applicant pools.",
        },
      },
      {
        heading: "Certifications that actually open doors",
        paragraphs: [
          "Certifications aren't required, but the right ones are taken seriously by hiring managers.",
          "**ISC2 Certified in Cybersecurity (CC).** Free first year of certification under ISC2's 'One Million Certified in Cybersecurity' pledge. Open to candidates 16 and up. The most accessible starting credential. It's the right first step for almost everyone.",
          "**CompTIA Security+.** The most-requested certification in U.S. job postings. Vendor-neutral. Solid foundation across all five pillars. Required for many U.S. federal cybersecurity roles under the DoD 8570 / 8140 directive.",
          "**Cisco CCNA / CyberOps Associate.** Network-focused. The CyberOps Associate path is purpose-built for SOC roles. Cisco Networking Academy offers the prep coursework free.",
          "**CompTIA Network+ and A+.** If you want IT help desk first as a stepping stone, these two are the standard entry credentials.",
          "More advanced certifications (CISSP, OSCP, CEH, GIAC family) come later in a career and require experience to qualify or to make sense.",
        ],
        keyTerms: [
          { term: "ISC2 CC", definition: "Certified in Cybersecurity — entry-level certification, free in year one." },
          { term: "Security+", definition: "CompTIA's foundational vendor-neutral cybersecurity certification." },
        ],
      },
      {
        heading: "Non-traditional paths",
        paragraphs: [
          "Plenty of people in cyber didn't follow a straight line. Some common alternate routes:",
          "**IT help desk → SOC analyst.** Two of the most common pipelines into security. Help desk gives you real-world exposure to user problems, ticket systems, and basic networking. Many SOCs hire directly from internal help desk teams.",
          "**Military / government intelligence → contractor or industry.** The U.S. military and federal agencies train tens of thousands of cyber operators every year. Many transition into private-sector roles after their service.",
          "**Self-taught + portfolio.** People who spend a year doing CTFs, writing up findings, contributing to open-source security tools, or maintaining a public blog have landed roles without traditional credentials.",
          "**Career changers from adjacent fields.** Software developers move into application security. Network engineers move into network security. Auditors move into GRC. Communicators move into security awareness and training.",
          "What works at every entry point is the same: pick a pillar that fits how you're wired, build a credential or two, build a portfolio of work you can show, and keep applying.",
        ],
      },
    ],
    citations: [
      "ISC2 One Million Certified in Cybersecurity — https://www.isc2.org/landing/1mcc",
      "CompTIA Career Roadmap — https://www.comptia.org/certifications",
      "Cisco Networking Academy — https://www.netacad.com/",
      "BLS Information Security Analysts — https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm",
      "NIST NICE Cybersecurity Workforce Framework — https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-resource-center",
    ],
  },
  lesson: {
    estMinutes: 17,
    intro: "Six role cards. Each shows a day in the life, education paths people have taken to get there, and a typical salary range. Pick the one that fits you best — but read all six. People often realize on the second pass which one they actually want.",
    scenes: [
      {
        title: "SOC Analyst (Tier 1)",
        body: "Day: triage alerts, investigate suspicious logins, escalate the hard ones. Salary band: ~$55K–$80K entry, more in major metros. Paths in: IT help desk, ISC2 CC + Security+, CyberOps Associate, military cyber MOS, or just a strong portfolio of CTFs.",
        choice: {
          prompt: "Does this fit you?",
          options: [
            { label: "Yes — investigating live problems sounds right", feedback: "Good signal. Many people start here and move into specialization within a year or two." },
            { label: "Maybe — I'd want to know more about shift work", feedback: "Real concern. SOCs often have 24/7 coverage; ask about shift rotation when interviewing." },
            { label: "No — I don't want to react, I want to build", feedback: "Useful self-knowledge. Engineering and Architecture might fit better." },
          ],
        },
      },
      {
        title: "Penetration Tester",
        body: "Day: get paid to break into systems legally, write reports about what you found, sometimes social engineering. Salary band: ~$70K–$110K entry, well into six figures with experience. Paths in: CTFs, OSCP certification, security research, sometimes from a developer or sysadmin background.",
        choice: {
          prompt: "Does this fit you?",
          options: [
            { label: "Yes — I love puzzles and reverse-engineering", feedback: "Strong signal. Build a CTF portfolio. The TryHackMe and HackTheBox platforms are common starting points." },
            { label: "Maybe — I'd want to know if it's stressful", feedback: "Some pen testing is calm research; some is high-pressure on-site engagements. Varies by employer." },
            { label: "No — I'd rather defend than attack", feedback: "Fair. Threat hunting (offensive mindset, defender role) might split the difference for you." },
          ],
        },
      },
      {
        title: "GRC Analyst",
        accessibleEntry: true,
        body: "Day: read regulations, translate them into company policies, audit whether controls actually exist, advise leadership on risk. Salary band: ~$75K–$95K entry, $95K–$130K with experience. Paths in: writing/communications backgrounds, paralegal experience, audit, ISC2 CC + a GRC-leaning track like ISACA's CSX. **You do not need a CS degree.**",
        choice: {
          prompt: "Does this fit you?",
          options: [
            { label: "Yes — I'm a strong writer and I like translating tech", feedback: "Strong signal. GRC pays well and is less crowded than SOC-aspirant roles." },
            { label: "Maybe — I want to know how technical it is", feedback: "GRC is less hands-on-keyboard than SOC, but you still need to understand the controls you're auditing. Some technical depth is expected." },
            { label: "No — I want to be on the technical side", feedback: "Fair. Security engineering might be a better fit." },
          ],
        },
      },
      {
        title: "Compliance Officer",
        accessibleEntry: true,
        body: "Day: own regulatory adherence — HIPAA, SOX, PCI-DSS, GDPR. Liaise with auditors, regulators, and legal counsel. Build the evidence binders that prove the company is doing what it claims. Salary band: ~$90K–$115K entry, $115K–$150K with experience. Paths in: law degree, MBA, internal-audit background; CISA, CISSP, or CRISC certifications.",
        choice: {
          prompt: "Does this fit you?",
          options: [
            { label: "Yes — I'm policy-minded and detail-oriented", feedback: "Strong signal. Compliance Officer is one of the higher-paid entry points and demand keeps growing as regulations expand." },
            { label: "Maybe — I'd want to know how legal-heavy it is", feedback: "Fair concern. Some compliance work is very close to legal practice; some is more operational. Varies by company size and industry." },
            { label: "No — I don't want to read regulations all day", feedback: "Useful self-knowledge. SOC or security engineering will feel more dynamic." },
          ],
        },
      },
      {
        title: "IT Auditor",
        accessibleEntry: true,
        body: "Day: test security controls. Review logs, change-management processes, and access lists. Write audit reports that get read by leadership and regulators. Salary band: ~$75K–$100K entry, $100K–$135K with experience. Paths in: accounting, IT, or business degree; CPA, CISA, or CIA certifications.",
        choice: {
          prompt: "Does this fit you?",
          options: [
            { label: "Yes — I'm analytical and I enjoy investigation", feedback: "Strong signal. IT Audit is a path that values methodical thinkers. The CISA is the dominant credential — start there." },
            { label: "Maybe — I want to know how varied the work is", feedback: "Auditors typically rotate across departments and topics, so variety is real. But the work cadence is project-based with deadlines around close-of-year." },
            { label: "No — I don't want to write a lot of reports", feedback: "Fair. Audit is heavy on documentation. Look at SOC or DFIR instead." },
          ],
        },
      },
      {
        title: "Risk Analyst",
        accessibleEntry: true,
        body: "Day: quantify organizational risk. Build risk matrices (likelihood × impact). Recommend which controls are worth the cost and which aren't. Brief executives. Salary band: ~$80K–$105K entry, $105K–$140K with experience. Paths in: math, finance, business, or IT background; CRISC or CISM certifications.",
        choice: {
          prompt: "Does this fit you?",
          options: [
            { label: "Yes — I'm comfortable with numbers and big-picture thinking", feedback: "Strong signal. Risk analysis blends technical understanding with decision support — a valuable mix." },
            { label: "Maybe — I'm not sure how math-heavy it is", feedback: "Varies. Some risk work is qualitative (high/medium/low matrices). Some is quantitative (FAIR methodology, monetary loss estimates). Both exist." },
            { label: "No — I want to be hands-on with systems", feedback: "Fair. Security engineering or SOC will give you more keyboard time." },
          ],
        },
      },
      {
        title: "Security Engineer",
        body: "Day: design and deploy defenses — firewalls, identity systems, cloud security configurations, monitoring infrastructure. Salary band: ~$80K–$120K entry, often higher in cloud or major metros. Paths in: software engineering, network engineering, systems administration, cloud certifications (AWS Security Specialty, etc.).",
        choice: {
          prompt: "Does this fit you?",
          options: [
            { label: "Yes — I want to build the systems other people use", feedback: "Strong signal. Security engineering is one of the better-paid and faster-growing pillars." },
            { label: "Maybe — I'd want to know about on-call", feedback: "Security engineering often has some on-call. Worth asking about." },
            { label: "No — I prefer investigation to construction", feedback: "Fair. SOC or DFIR is probably a better fit." },
          ],
        },
      },
      {
        title: "Digital Forensics & Incident Response (DFIR)",
        body: "Day: get called in after a breach. Reconstruct what happened. Recover deleted files, analyze malware, write courtroom-grade reports. Salary band: ~$70K–$110K entry, much higher with consulting experience. Paths in: SOC analyst → DFIR, law enforcement, military intelligence, dedicated DFIR programs.",
        choice: {
          prompt: "Does this fit you?",
          options: [
            { label: "Yes — I want to handle real emergencies", feedback: "Strong signal. DFIR is intense but consistently in demand." },
            { label: "Maybe — I'd want to know about work-life balance", feedback: "Real concern. Major incidents often involve long hours. Some firms manage this better than others." },
            { label: "No — I'd rather prevent incidents than clean them up", feedback: "Fair. SOC and security engineering both lean toward prevention." },
          ],
        },
      },
      {
        title: "Cloud Security Engineer",
        body: "Day: configure and harden AWS / Azure / GCP environments, write infrastructure-as-code with security baked in, automate audits. Salary band: ~$90K–$140K entry, frequently higher. Paths in: cloud engineering, software development, infrastructure roles, AWS / Azure / GCP security certifications.",
        choice: {
          prompt: "Does this fit you?",
          options: [
            { label: "Yes — I want to work on modern infrastructure", feedback: "Strong signal. Cloud security is one of the highest-paid and fastest-growing specialties." },
            { label: "Maybe — I'd want to know if I need coding experience", feedback: "Yes, some. Modern cloud security work usually involves infrastructure-as-code (Terraform, CloudFormation) and scripting." },
            { label: "No — I want to work with on-premises networks", feedback: "Fair, though shrinking. Most companies are at least partly in the cloud now." },
          ],
        },
      },
    ],
  },
  practice: {
    estMinutes: 12,
    intro: "Six career snapshots. Match each story to the role they ended up in. The point isn't to memorize — it's to see that there are many real paths in.",
    items: [
      {
        prompt: "Spent two years working IT help desk at a community college after high school. Got the Security+ on a study schedule of one chapter per week. Got hired as a Tier 1 analyst at a regional bank.",
        options: [
          { label: "SOC Analyst", correct: true, feedback: "Right. Help desk → Security+ → SOC is one of the most common paths into the field." },
          { label: "Penetration Tester", correct: false, feedback: "Possible eventually, but the direct hire from help desk + Security+ is almost always a SOC role." },
          { label: "Cloud Security Engineer", correct: false, feedback: "Cloud security usually wants cloud experience first — AWS or Azure work history." },
        ],
      },
      {
        prompt: "Studied English literature in college. Worked in legal aid for three years. Got the ISC2 CC and took a self-study GRC course. Hired as a junior risk analyst at a healthcare company.",
        options: [
          { label: "GRC Analyst", correct: true, feedback: "Right. The writing/legal background is exactly what GRC values. Communication is the differentiator." },
          { label: "Security Engineer", correct: false, feedback: "Unlikely without a technical infrastructure background." },
          { label: "DFIR Analyst", correct: false, feedback: "Would usually require more direct technical investigation experience first." },
        ],
      },
      {
        prompt: "Served four years in the Army's signal corps. Got a Top Secret clearance. Took the Cisco CyberOps Associate during the last six months of service. Hired by a federal contractor as a SOC analyst at $85K.",
        options: [
          { label: "SOC Analyst", correct: true, feedback: "Right. Military signal + clearance is a fast track into federal SOC work, often at higher salaries than civilian first jobs." },
          { label: "Pen Tester", correct: false, feedback: "Possible long-term, but the first civilian role usually leans on the existing operational training." },
          { label: "Compliance Auditor", correct: false, feedback: "Some go this route, but the operational background fits SOC better as a first move." },
        ],
      },
      {
        prompt: "Self-taught while working full-time at a coffee shop. Did 200+ HackTheBox challenges over a year. Wrote up the trickiest ones on a personal blog. Got the OSCP. Hired by a small pen-test firm.",
        options: [
          { label: "Penetration Tester", correct: true, feedback: "Right. HackTheBox + OSCP + write-ups is the textbook self-taught pen test path." },
          { label: "Security Engineer", correct: false, feedback: "Possible, but the OSCP and CTF profile point strongly to offensive work." },
          { label: "GRC Analyst", correct: false, feedback: "Not the natural fit — GRC values writing and process, not exploit-finding." },
        ],
      },
      {
        prompt: "Worked five years as a backend developer. Started getting interested in how their company's auth system worked. Took the AWS Security Specialty cert. Moved into a cloud security role inside the same company.",
        options: [
          { label: "Cloud Security Engineer", correct: true, feedback: "Right. Developer + AWS Security Specialty + internal move is a very common cloud security path." },
          { label: "SOC Analyst", correct: false, feedback: "Underuses the engineering background — this person can build, not just monitor." },
          { label: "DFIR Analyst", correct: false, feedback: "DFIR usually wants investigation experience, not pure development experience." },
        ],
      },
      {
        prompt: "Worked at a small MSP (managed service provider) doing everything — help desk, network admin, light security. Got pulled in to handle a ransomware incident at a client. Took specialized DFIR training. Hired by an incident response firm.",
        options: [
          { label: "DFIR Analyst", correct: true, feedback: "Right. Real incident exposure plus specialized training is the standard DFIR path." },
          { label: "Pen Tester", correct: false, feedback: "Different mindset — DFIR is about reconstructing what happened, not breaking in." },
          { label: "GRC Analyst", correct: false, feedback: "Not the natural fit given the hands-on incident background." },
        ],
      },
    ],
  },
  homework: {
    estMinutes: 10,
    title: "My 12-month plan",
    prompt: "Write down a real plan for the next year. Bring it back here and submit. The exercise is to write it down — research shows people who write down concrete plans are significantly more likely to follow them.",
    instructions: [
      "Pick your top 2 cyber roles to explore further (from the lesson or beyond it).",
      "List 3 skills you already have that transfer (communication, attention to detail, math, teamwork, anything).",
      "List 3 skills you need to build.",
      "Write 3 specific actions you'll take in the next 90 days (start ISC2 CC, finish Cisco NetAcad Intro to Cybersecurity, build a home lab, do a CTF, etc.). Be specific — 'study more' doesn't count.",
      "Name one person you'll talk to about this in the next 30 days. Anyone — facilitator, family member, someone working in tech.",
    ],
    placeholder: "Example: Top 2 roles: SOC analyst, cloud security engineer. Transferable skills: writing, pattern recognition, working under pressure (from sports). Skills to build: networking fundamentals, scripting, log analysis. 90-day actions: 1) finish ISC2 CC online course, 2) complete the Cisco NetAcad Introduction to Cybersecurity, 3) build a home lab with one VM running Wireshark. Person to talk to: my uncle who works in IT.",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Module 6 — Cisco NetAcad Bridge
// ────────────────────────────────────────────────────────────────────────────

const NETACAD_BRIDGE: ModuleContent = {
  slug: "cisco-netacad-link",
  title: "Cisco NetAcad Bridge",
  totalMinutes: 60,
  hook: {
    estMinutes: 4,
    title: "From foundations to certification-ready",
    paragraphs: [
      "You've learned the foundations here. Now it's time to go deeper than any single platform can take you. Cisco offers free, industry-grade cybersecurity coursework through Cisco Networking Academy — the same coursework used by community colleges, four-year universities, and corporate training programs around the world.",
      "The point of this module isn't to memorize Cisco's catalog. It's to get you actually enrolled, with a chosen course, before you leave the session.",
    ],
    closer: "By the end of this 60 minutes, you'll have a NetAcad account, a chosen first course, and a study plan.",
  },
  reading: {
    estMinutes: 12,
    sections: [
      {
        heading: "What Cisco NetAcad is",
        paragraphs: [
          "**Cisco Networking Academy** is a free education program run by Cisco. According to Cisco, it has served more than 17 million learners across more than 190 countries since it started.",
          "The courses are not introductory marketing material — they are the same content that prepares students for real industry certifications. Several lead directly into Cisco's career-level certifications (CCST Cybersecurity, CyberOps Associate, CCNA), which are recognized by employers worldwide.",
          "There is no cost. There is no admissions process. You sign up, pick a course, and start learning at your own pace.",
        ],
        callout: "Free, self-paced, industry-recognized. Almost no other career path offers this combination.",
        grcLens: {
          body: "Cisco NetAcad teaches the **technical** foundations. For **GRC** roles — auditor, compliance, risk — also explore **ISACA's** free resources at isaca.org. ISACA owns the **CISA** (Certified Information Systems Auditor) certification and publishes entry-level material aimed at non-CS backgrounds. Pair NetAcad with ISACA's free CSX intro and you have the foundations for either path.",
        },
      },
      {
        heading: "Recommended starting sequence",
        paragraphs: [
          "**Introduction to Cybersecurity** is the right first course for almost everyone. About 15 hours total, no prerequisites. It covers the same broad terrain we've covered here, in more depth.",
          "**Cybersecurity Essentials** is the next step — roughly 30 hours. It goes deeper on the technical side: encryption, networks, threats, defensive measures. Some of it will feel like review of what you've done in this track. That's a feature, not a bug — repetition is how concepts stick.",
          "**CCST Cybersecurity** is a more substantial path — roughly 50 hours of coursework and lab work. It leads to the Cisco Certified Support Technician (CCST) Cybersecurity certification, which is an entry-level industry certification, distinct from the older 'CCNA Cyber Ops' track Cisco has been retiring.",
          "If you're more network-curious than cybersecurity-curious, the **CCNA** path is the world's most-recognized entry-level networking credential. Plenty of cybersecurity professionals have a CCNA before they pivot fully into security.",
        ],
      },
      {
        heading: "How to actually get value from it",
        paragraphs: [
          "**Set a real schedule.** Two to three hours a week, on specific days, beats six hours every other Saturday. Tell someone — your facilitator, a friend, a family member — what your schedule is.",
          "**Take notes alongside the content.** Even just a few bullet points per session. The act of writing helps you remember, and you'll thank yourself when you come back to study for a certification.",
          "**Use the labs.** Cisco Packet Tracer is a free network simulator that comes with several of the courses. It lets you build virtual networks and experiment safely. Hands-on practice is what separates people who pass the cert from people who just watched the videos.",
          "**Don't go alone if you don't have to.** The NetAcad community forums are active, and many cohort programs (including this one) pair learners up to keep each other accountable.",
        ],
        callout: "Two to three hours per week, with notes and hands-on practice, beats marathon sessions every time.",
      },
    ],
    citations: [
      "Cisco Networking Academy — https://www.netacad.com/",
      "Cisco CCST Cybersecurity — https://www.cisco.com/site/us/en/learn/training-certifications/certifications/cybersecurity/ccst-cybersecurity/index.html",
      "Cisco Packet Tracer — https://www.netacad.com/courses/packet-tracer",
      "ISACA — https://www.isaca.org/",
    ],
  },
  lesson: {
    estMinutes: 17,
    intro: "Walk through creating a NetAcad account and choosing your first course. By the end of these scenes, you should have an account and a course picked. Your facilitator can help if you get stuck.",
    scenes: [
      {
        title: "Open netacad.com",
        body: "Go to netacad.com in your browser. You'll see the Cisco Networking Academy landing page. Look for a button labeled 'Sign Up' or 'Get Started.'",
        choice: {
          prompt: "Picked the right button?",
          options: [
            { label: "Yes — I see the sign-up page", feedback: "Great. Move to the next step." },
            { label: "I see a course catalog, not a sign-up button", feedback: "Try the top-right of the page — sign-up is usually there. If you're still stuck, your facilitator can walk through screen-sharing." },
            { label: "I can't get to the site at all", feedback: "Check your connection. If the site is blocked on your school network, your facilitator can help work around that." },
          ],
        },
      },
      {
        title: "Create an account",
        body: "Cisco will ask for your name, email, and a password. You can sign up with a school email if you have one — it sometimes unlocks additional resources.",
        choice: {
          prompt: "Picking a password — what's the right move?",
          options: [
            { label: "A long unique passphrase saved in your password manager", feedback: "Right. You learned this in Module 2. Apply it here." },
            { label: "Your usual personal password", feedback: "Don't. If that password is ever in a breach, this account goes too." },
            { label: "The simplest password the system will accept", feedback: "Don't. This account will hold your certification progress — protect it." },
          ],
        },
      },
      {
        title: "Browse the catalog",
        body: "Once your account is active, you'll see a catalog with hundreds of courses. Most cybersecurity learners start with 'Introduction to Cybersecurity.' Use the search bar.",
        choice: {
          prompt: "How do you decide which course to enroll in?",
          options: [
            { label: "Pick the first one — it's all useful", feedback: "Not the worst approach, but better to pick deliberately." },
            { label: "Match the course to where you are right now (probably 'Introduction to Cybersecurity' if it's your first one)", feedback: "Right. Start where you are, not where you want to be." },
            { label: "Enroll in five at once to have options", feedback: "Common mistake. You'll finish zero. Pick one and finish it." },
          ],
        },
      },
      {
        title: "Enroll",
        body: "Click 'Enroll' on your chosen course. The platform will add it to your dashboard.",
        choice: {
          prompt: "What do you do first?",
          options: [
            { label: "Skim the syllabus and the time commitment", feedback: "Right. Knowing how long the course is helps you plan." },
            { label: "Start the first lesson right now", feedback: "Also fine — but skim the syllabus first so you know what you signed up for." },
            { label: "Close the tab and come back later", feedback: "Almost no one comes back. While you're here, commit to the first lesson now or this week." },
          ],
        },
      },
      {
        title: "Set a schedule",
        body: "Before you close the tab, pick the specific times in the next 7 days when you'll work on this course.",
        choice: {
          prompt: "What does a realistic schedule look like?",
          options: [
            { label: "Two 1-hour sessions per week, on specific days", feedback: "Right. Specific beats vague. 'Tuesday and Thursday after dinner' beats 'three hours sometime this week.'" },
            { label: "All five hours on Saturday morning", feedback: "Possible but harder to sustain. Spaced repetition works better than cramming." },
            { label: "Whenever I have time", feedback: "Almost certainly won't happen. Pick days and times now." },
          ],
        },
      },
      {
        title: "Tell someone",
        body: "Send a message — to your facilitator, a friend, anyone — saying what course you're starting and what your schedule is.",
        choice: {
          prompt: "Why bother telling someone?",
          options: [
            { label: "Accountability — you're significantly more likely to follow through", feedback: "Right. The research on this is strong. Saying it out loud changes the odds." },
            { label: "It's a requirement of the module", feedback: "It's a recommendation, not a requirement. But it's a recommendation worth taking." },
            { label: "It's not necessary if you're disciplined", feedback: "Even disciplined people benefit from external accountability. Tell someone." },
          ],
        },
      },
    ],
  },
  practice: {
    estMinutes: 10,
    intro: "Six 'plan your path' choices. Pick the one that fits your situation — there's no single right answer, but the feedback explains the trade-offs.",
    items: [
      {
        prompt: "You have 2 hours per week. Pick your first NetAcad course.",
        options: [
          { label: "Introduction to Cybersecurity (~15 hours)", correct: true, feedback: "Right. At 2 hours/week, this is ~7-8 weeks — doable and builds momentum." },
          { label: "CCST Cybersecurity (~50 hours)", correct: false, feedback: "At 2 hours/week, this would take 6 months. Possible, but better to build momentum with a shorter course first." },
          { label: "CCNA (~100+ hours)", correct: false, feedback: "Way too much commitment as a first course. CCNA is a real career credential — earn it later." },
        ],
      },
      {
        prompt: "You have 6 hours per week and you've already done Introduction to Cybersecurity. What's next?",
        options: [
          { label: "Cybersecurity Essentials (~30 hours)", correct: true, feedback: "Right. The natural next step." },
          { label: "Repeat Introduction to Cybersecurity", correct: false, feedback: "Repetition has value but you already have the foundation. Move forward." },
          { label: "Skip straight to CCNA", correct: false, feedback: "Cybersecurity Essentials is the right bridge before more advanced certs." },
        ],
      },
      {
        prompt: "You're more interested in networking than security right now. What's the best path?",
        options: [
          { label: "Start with Introduction to Networks (CCNA path), then layer security on later", correct: true, feedback: "Right. A solid networking foundation makes everything in cybersecurity easier later." },
          { label: "Skip networking and focus on cybersecurity courses", correct: false, feedback: "Risky. Almost every cybersecurity job requires solid networking fundamentals." },
          { label: "Don't do NetAcad — wait for university", correct: false, feedback: "No reason to wait. Free coursework is available now." },
        ],
      },
      {
        prompt: "You want to know if your time will translate to a real credential. What's the most direct certification path?",
        options: [
          { label: "CCST Cybersecurity through NetAcad coursework + the exam", correct: true, feedback: "Right. CCST Cybersecurity is the most direct entry-level certification from NetAcad coursework." },
          { label: "CCNA — apply for an entry job after", correct: false, feedback: "CCNA is excellent but it's networking-first. CCST Cybersecurity is more directly cyber." },
          { label: "Skip certifications, just take courses", correct: false, feedback: "Coursework alone is great learning, but employers look for the credential. Take the exam." },
        ],
      },
      {
        prompt: "You're stuck on a hard concept (subnetting, encryption math, etc.). What's the right move?",
        options: [
          { label: "Post in the NetAcad forums or ask a peer in the cohort", correct: true, feedback: "Right. Communities exist specifically for this. Use them." },
          { label: "Give up on the course", correct: false, feedback: "Don't. Stuck is normal. Asking is what gets you unstuck." },
          { label: "Skip the section and hope it doesn't matter", correct: false, feedback: "It usually does matter, and gaps compound. Ask, don't skip." },
        ],
      },
      {
        prompt: "You're 60% through a course and losing motivation. What works best?",
        options: [
          { label: "Re-anchor to your 12-month plan and your accountability partner", correct: true, feedback: "Right. The dip in the middle is normal. The plan and the partner are exactly why you built them." },
          { label: "Switch to a new course", correct: false, feedback: "Common trap. Finish what you started — momentum compounds." },
          { label: "Take a 3-month break", correct: false, feedback: "Almost no one comes back. Cut the workload short-term if needed, but don't disappear." },
        ],
      },
    ],
  },
  homework: {
    estMinutes: 10,
    title: "First lesson",
    prompt: "Before our next session, complete the first lesson of your chosen NetAcad course. Submit your reflection here.",
    instructions: [
      "Which course did you enroll in?",
      "What did the first lesson cover, in your own words (3-5 sentences)?",
      "What was harder than you expected?",
      "What was easier than you expected?",
      "When are your next two scheduled study sessions?",
    ],
    placeholder: "Example: I enrolled in Introduction to Cybersecurity. First lesson covered different types of attackers and what motivates them — state actors, criminals, hacktivists, insiders. Harder than expected: the threat actor categories blur together; I'm still confused about hacktivists vs script kiddies. Easier than expected: the cyber-news quiz at the end. Next sessions: Tuesday 7-8 PM and Thursday 7-8 PM.",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Module 7 — Cyber Capstone (90 min, no quiz — deliverable is the assessment)
// ────────────────────────────────────────────────────────────────────────────

const CYBER_CAPSTONE: ModuleContent = {
  slug: "capstone-security-plan",
  title: "Capstone — My Security Plan",
  totalMinutes: 90,
  skipQuiz: true,
  hook: {
    estMinutes: 5,
    title: "Today, you're the consultant",
    paragraphs: [
      "Today you stop being a student. Today you're a consultant. A small business — a barbershop, a food truck, a community center — needs you. They don't have an IT department. They don't have a CISO. They have you, an hour, and a budget that's roughly zero.",
      "What you produce today is portfolio-worthy. Real. Something you could bring to an internship interview, to a college application, or to a real local business that needs help.",
    ],
    closer: "By the end, you'll have a written security plan with concrete recommendations and a one-page executive summary.",
  },
  reading: {
    estMinutes: 10,
    sections: [
      {
        heading: "What SMB cybersecurity consulting looks like",
        paragraphs: [
          "Most small and medium-sized businesses (SMBs) don't have full-time security staff. They have an owner, a few employees, a point-of-sale system, a cloud accounting tool, maybe a website, and an instinct that they should be 'doing something' about security.",
          "Real consultants who serve this market do a few things consistently: they ask about the business before they ask about the technology. They translate findings into plain language. They prioritize ruthlessly — three changes that will actually happen beats fifteen that won't.",
          "Your work today follows that pattern. Pick a business, understand what they do and what they care about, identify the most likely risks, recommend a handful of high-impact, low-cost changes, and write it up.",
        ],
      },
      {
        heading: "What a good security plan looks like",
        paragraphs: [
          "A real SMB security plan is short. One executive page that the owner will actually read, plus a couple of supporting pages with detail. Long plans don't get implemented.",
          "The structure that works: **business context** (what they do, what data they handle, who could hurt them and how), **top risks** (three to five, ranked), **recommendations** (concrete actions, with rough cost and effort estimates), **executive summary** (the one page).",
          "Cite what you're recommending. If you say 'use a password manager,' name two real options. If you say 'enable MFA,' name where to enable it. Specificity is what separates a real plan from a generic one.",
        ],
        callout: "Three changes the owner will actually make beats fifteen that look good in a report.",
      },
      {
        heading: "Compliance Considerations",
        paragraphs: [
          "Even tiny businesses have compliance obligations the owner may not know about. A barbershop that takes credit cards is subject to **PCI-DSS** — the standard for handling card data — even if they've never heard of it. A nonprofit that collects donor health information may touch **HIPAA**. A business with customers in California is subject to **CCPA**. A business with EU customers is subject to **GDPR**. A school program touches **FERPA**.",
          "A good consultant doesn't lecture the owner on regulations they didn't sign up to understand. The consultant **finds out which ones apply**, names them in plain language, and folds them into the recommendations.",
          "Your plan should answer three compliance questions, briefly:",
          "**1. What laws or regulations apply to this business?** A short list — usually one to three. PCI-DSS is almost universal if they take cards. State-level breach notification almost always applies. Industry-specific ones (HIPAA, FERPA, GLBA) only if they touch that data.",
          "**2. What records would they need to keep, and for how long?** This shapes recommendations. If logs need to be retained for years, you can't just say 'turn on logging.' You have to say where the logs go and how long they stay.",
          "**3. What would they tell affected people if a breach happened tomorrow?** State breach-notification laws set deadlines (usually 30–60 days). The plan should at least name who would draft that notice and through what channel.",
        ],
        grcLens: {
          body: "This is the **GRC half** of your security plan. Even at small business scale, the questions an auditor or regulator would ask shape what 'good' looks like. Folding compliance into the plan — instead of treating it as a separate document — is what real consultants do.",
        },
      },
    ],
    citations: [
      "CISA Cyber Essentials for Small Business — https://www.cisa.gov/cyber-essentials",
      "FCC Small Biz Cyber Planner — https://www.fcc.gov/cyberplanner",
      "NIST Small Business Cybersecurity Corner — https://www.nist.gov/itl/smallbusinesscyber",
      "PCI Security Standards Council — https://www.pcisecuritystandards.org/",
      "FTC Data Breach Response Guide — https://www.ftc.gov/business-guidance/resources/data-breach-response-guide-business",
    ],
  },
  lesson: {
    estMinutes: 15,
    intro: "Read a sample security plan for a fictional barbershop. Notice what makes it useful: specific, prioritized, plain-language, cheap to implement.",
    scenes: [
      {
        title: "The business",
        body: "Fade & Co. is a four-chair barbershop. Two owners, two employees. They take walk-ins and appointments through an iPad-based booking system. Payments through a Square terminal. WhatsApp group with staff. They store no medical or legal records, but they have ~3,000 customer phone numbers and emails in their booking system.",
        choice: {
          prompt: "What's the most important thing to understand first?",
          options: [
            { label: "What systems hold customer data and who can access them", feedback: "Right. The plan is built around the data the business actually holds." },
            { label: "Whether they use Mac or Windows", feedback: "Useful detail but not the first question. Data first." },
            { label: "Their annual revenue", feedback: "Sometimes relevant for sizing, but not the first question." },
          ],
        },
      },
      {
        title: "The top risks",
        body: "Reviewing Fade & Co.'s setup, the consultant identifies the top three risks: (1) the iPad booking app is shared with no individual logins — anyone in the shop can read the full customer list; (2) staff WhatsApp group has personal phones with no MFA on the connected emails; (3) the Square account login is shared between owners.",
        choice: {
          prompt: "What ranks these correctly?",
          options: [
            { label: "Severity × likelihood — focus on what's most likely AND most damaging", feedback: "Right. A shared Square login is probably the highest risk because compromise means immediate financial exposure." },
            { label: "Cost to fix — cheapest first", feedback: "A reasonable secondary sort, but not the primary one." },
            { label: "Alphabetical order", feedback: "Don't." },
          ],
        },
      },
      {
        title: "The recommendations",
        body: "Three changes, each cheap. (1) Create individual Square logins per owner and enable MFA. (2) Enable MFA on the email connected to the booking system; consider Bitwarden for the staff. (3) Move the customer email list out of the booking app's CSV export into a managed list (Mailchimp, etc.) where access can be logged.",
        choice: {
          prompt: "Why are these three good recommendations?",
          options: [
            { label: "They're concrete, cheap, and address the top-ranked risks", feedback: "Right. The owner can see what to do and roughly what it costs." },
            { label: "They sound impressive", feedback: "Impressing the client is the wrong goal. Helping them is the goal." },
            { label: "They use industry jargon", feedback: "Jargon hides recommendations. Avoid it." },
          ],
        },
      },
      {
        title: "The executive summary",
        body: "One page. Three bullets at the top. Three numbered recommendations. A 'what to do this week' section. The total reading time should be 60 seconds.",
        choice: {
          prompt: "What's the test for whether the summary is good?",
          options: [
            { label: "The owner reads it once and knows what to do Monday morning", feedback: "Right. Action-readiness in 60 seconds is the bar." },
            { label: "It's long enough to look thorough", feedback: "Length is not value. Concise is harder and more valuable." },
            { label: "It uses technical terms", feedback: "Plain language is the strength of a good summary." },
          ],
        },
      },
    ],
  },
  practice: {
    estMinutes: 35,
    intro: "Now it's your turn. Pick a real or imagined small business. Build a security plan. There is no grading rubric here in the prototype — bring the draft to your facilitator for review. Save your progress as you go; the homework field below holds your full draft.",
    items: [
      {
        prompt: "Choose your business. Which sounds most interesting to work on?",
        options: [
          { label: "A neighborhood barbershop or salon (4-8 employees, customer data, POS)", correct: true, feedback: "Strong choice. Real, common, manageable scope." },
          { label: "A food truck (1-2 employees, mobile POS, social-media-driven sales)", correct: true, feedback: "Strong choice. Mobile + social media adds interesting wrinkles." },
          { label: "A community nonprofit (volunteer-run, donor database, mailing list)", correct: true, feedback: "Strong choice. Donor data and grant compliance bring real considerations." },
        ],
      },
      {
        prompt: "Sketch the business: what do they do, what data do they hold, who could hurt them?",
        options: [
          { label: "I've thought about it and I'm ready to write", correct: true, feedback: "Good. Use the homework section to write up the business context." },
          { label: "I need to think more about who could hurt them", correct: true, feedback: "Fair. Common threats for SMBs: phishing, ransomware, theft of customer or payment data, social-engineered fraud. Pick one or two relevant ones." },
          { label: "I want to pick a different business", correct: true, feedback: "Go for it. There's no wrong answer here." },
        ],
      },
      {
        prompt: "List the top 3-5 risks. Rank them.",
        options: [
          { label: "Done — I have a ranked list", correct: true, feedback: "Good. Move to recommendations." },
          { label: "I'm not sure how to rank — I have 5 risks but they all feel important", correct: true, feedback: "Sort by likely × impact. Likely × small impact ≠ unlikely × big impact. Decide which side to favor and explain it." },
          { label: "I only have 2 risks — is that enough?", correct: true, feedback: "Three is a good target. If you only have two, push: what's the second-most-likely data leak, fraud, or business disruption?" },
        ],
      },
      {
        prompt: "Write 3 recommendations. Each one needs an action, a cost estimate, and an effort estimate.",
        options: [
          { label: "Done", correct: true, feedback: "Good. Now write the executive summary." },
          { label: "I have 3 actions but no cost/effort estimates", correct: true, feedback: "Estimate. A password manager is ~$0-$3/user/month. MFA setup is ~1 hour. A new POS account is ~30 minutes. You don't need precision, you need order-of-magnitude." },
          { label: "All my recommendations are 'add MFA'", correct: true, feedback: "MFA is real, but variety helps. What about backups? Staff training? Inventory of who has access to what?" },
        ],
      },
      {
        prompt: "Write the one-page executive summary in the homework field below.",
        options: [
          { label: "I'm ready to draft", correct: true, feedback: "Use this format in the homework field: (1) 3 bullets describing the business and what's at stake, (2) 3 numbered recommendations, (3) 'this week' action list of 1-3 things." },
          { label: "I'm worried it's too short", correct: true, feedback: "Short is the goal. If the owner reads only the summary, they should know exactly what to do." },
          { label: "I'm worried it's too long", correct: true, feedback: "Cut. Real consultants cut. One page is the target." },
        ],
      },
    ],
  },
  homework: {
    estMinutes: 10,
    title: "Real-world application",
    prompt: "This is both your capstone submission and your real-world homework. Submit the executive summary of your security plan here. As a bonus, find a real small business in your community (with the owner's permission), have a 15-minute conversation about how they handle data, and add 3 observations to your submission.",
    instructions: [
      "Paste your one-page executive summary: 3 bullets of business context, 3 numbered recommendations with action + cost + effort, 'this week' action list.",
      "Add a short 'Compliance Considerations' section: which laws or regulations apply (e.g., PCI-DSS if they take cards), what records they'd need to keep and for how long, and what they'd tell affected people if a breach happened tomorrow.",
      "(Optional bonus) Find a small business owner you know. Ask them 3 questions: How do they take payments? Where do they store customer info? What would worry them about a data leak?",
      "Add 3 observations from that conversation if you did it.",
    ],
    placeholder: "Example summary:\n\nBusiness: Tony's Tacos food truck. 1 owner, 1 employee. Square POS, ~600 customer phone numbers, Instagram and TikTok-driven sales.\n\nTop 3 risks: (1) Owner's Instagram is the de facto storefront — losing access = losing business. (2) Square account uses owner's personal email with no MFA. (3) Customer phone list is stored in a Notes app.\n\nRecommendations:\n1. Enable MFA on the Instagram account and the email behind it. Cost: $0. Effort: 30 min.\n2. Switch the Square account to a business email with MFA enabled. Cost: $0. Effort: 1 hour.\n3. Move the customer list out of Notes into a managed tool (Google Contacts or a free Mailchimp account). Cost: $0. Effort: 1 hour.\n\nThis week: turn on MFA on the Instagram and email accounts. Schedule the rest for next week.\n\nObservations from real conversation: ...",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Export
// ────────────────────────────────────────────────────────────────────────────

export const CYBER_LAUNCH_CONTENT: Record<string, ModuleContent> = {
  "cyber-foundations": CYBER_FOUNDATIONS,
  "digital-safety-sim": DIGITAL_SAFETY,
  "network-basics": NETWORK_BASICS,
  "threat-detective": THREAT_DETECTIVE,
  "career-map": CAREER_MAP,
  "cisco-netacad-link": NETACAD_BRIDGE,
  "capstone-security-plan": CYBER_CAPSTONE,
};

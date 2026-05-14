/**
 * Detailed facilitator guides for each Cyber Launch module.
 *
 * Sensitive sections (justice-impacted framing, mental-health red flags) are
 * worth a human review before being printed at scale. See REPORT in
 * src/components/pathways/facilitator/tabs/ModuleGuidesTab.tsx for a checklist.
 */

export interface ModuleGuide {
  slug: string;
  number: number;
  name: string;
  whatItTeaches: string;
  whyItMatters: string[]; // paragraphs
  timeRequired: string;
  whatToExpect: string[]; // step-by-step bullets
  facilitatorRole: {
    before: string[];
    during: string[];
    after: string[];
  };
  discussionBefore: string[];
  discussionAfter: string[];
  stickingPoints: { point: string; guidance: string }[];
  extensions: string[];
  realWorld: string;
  vocabulary: { term: string; definition: string }[];
  redFlags: string[];
}

export const MODULE_GUIDES: ModuleGuide[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. Cyber Foundations
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "cyber-foundations",
    number: 1,
    name: "Cyber Foundations",
    whatItTeaches:
      "What cybersecurity is, why it matters to every business and household, and the wide range of roles in the field. Students leave with a working definition of cyber, a sense of the scale of the talent shortage, and concrete examples of how people enter the industry without a four-year degree.",
    whyItMatters: [
      "Most teenagers — especially those in alternative education, workforce programs, or correctional settings — walk in believing cybersecurity is for people with computer science degrees and elite backgrounds. That belief is wrong, and it shuts students out before they ever apply. This module is where we break that frame.",
      "For justice-impacted youth in particular, cybersecurity is one of the most accessible technical fields. Many roles do not require background-check clearance the way some government jobs do, employers care more about demonstrated skill than credentials, and the field rewards self-taught learners with home labs and free certifications. This module plants that seed.",
    ],
    timeRequired: "30 minutes in-app + 15 minutes of facilitator-led discussion. Ideal as the first 45-60 minutes of session one.",
    whatToExpect: [
      "7 slides covering: what cyber is, why it matters, real breaches, who works in cyber (8 roles with salaries), many ways into the field, and the opportunity (470,000+ open U.S. jobs).",
      "Slide 4 lists 8 specific job roles — Security Analyst, Pen Tester, Incident Responder, Security Engineer, GRC Analyst, Digital Forensics, Security Architect, CISO — with descriptions and salary ranges.",
      "Module ends with a short reflection: which role surprised you, which one might fit you.",
    ],
    facilitatorRole: {
      before: [
        "Read the slide content yourself first so you can speak to it without reading off the screen.",
        "Be ready with one personal story about technology — a time you got scammed, a password you reused, a friend whose account got taken over. This signals that cyber affects everyone, including you.",
        "Set the tone: this is a no-judgment space. Mistakes are part of cybersecurity work — professionals get phished too.",
      ],
      during: [
        "Walk the room. Don't sit at your laptop. Look for students who finish a slide and then stare at the screen — that's the signal they want to talk.",
        "If a student says 'I'm not a tech person' or 'this isn't for me,' note it but don't argue. Save it for the after-discussion.",
        "Take note of which roles students react to. The ones they linger on are clues about what to amplify later.",
      ],
      after: [
        "Run the after-discussion below before moving on. The conversation matters more than the slides.",
        "Capture each student's top role of interest on the progress tracker. You'll come back to this in Week 5.",
      ],
    },
    discussionBefore: [
      "Have you ever been hacked, scammed, or had an account compromised? What happened?",
      "When you hear 'cybersecurity,' what image comes to mind?",
      "Do you know anyone who works in tech? What do they do?",
      "What's the most personal information a stranger could find about you online right now?",
      "If a business got hacked and your data was stolen, what would you want them to do?",
    ],
    discussionAfter: [
      "Which cyber role surprised you the most? Why?",
      "Which one might fit how you actually like to spend time?",
      "Did any of the salary ranges change how you see this field?",
      "The slide said 'many ways in.' Which of those entry points sounds doable for you in the next 12 months?",
      "If you had to explain cybersecurity to your younger cousin, how would you say it?",
    ],
    stickingPoints: [
      {
        point: "Student says 'I'm not smart enough for this.'",
        guidance:
          "Don't argue. Ask them: 'What does smart mean to you?' Then share that some of the best analysts in the field are people who are patient, observant, and stubborn — not necessarily good at math. The work rewards curiosity over IQ.",
      },
      {
        point: "Student fixates on the highest salary (CISO at $150K-$250K).",
        guidance:
          "Acknowledge the appeal, but redirect: 'That's a 15-year role. What's the $60K entry-level job that gets you there?' Help them see the pathway, not the destination.",
      },
      {
        point: "Student says 'I don't have a computer at home.'",
        guidance:
          "Validate that this is real. Then surface options: public libraries, community college open labs, free cloud-based environments like Cisco Packet Tracer, TryHackMe free tier, and our program's in-person sessions. Lack of a home device is a logistics problem, not a capability problem.",
      },
      {
        point: "Student says cyber is just hacking and that's illegal.",
        guidance:
          "Common misconception. Explain the difference between criminal hacking and authorized penetration testing — pen testers are paid to find vulnerabilities legally. Most cyber jobs are defensive (analyst, engineer, responder), not offensive.",
      },
      {
        point: "Student goes quiet and disengaged.",
        guidance:
          "Don't push them in front of the group. Check in privately after the session. Sometimes a student is processing — sometimes they're hungry, tired, or carrying something heavy. Ask 'How are you?' before 'What didn't land?'",
      },
    ],
    extensions: [
      "Have students look up one of the 8 roles on LinkedIn and find a real person in that job. Share what they found next session.",
      "Ask students to write a 'what I want my life to look like at 25' paragraph. Don't grade it. Use it as a private mirror for them to revisit at week 6.",
      "Watch the documentary 'The Great Hack' or a short YouTube explainer on a recent breach (Colonial Pipeline, MOVEit, T-Mobile). Discuss what role would have caught it.",
    ],
    realWorld:
      "The Colonial Pipeline ransomware attack in 2021 shut down fuel delivery to the entire U.S. East Coast for six days. The breach started with a single leaked password on a VPN account that didn't have multi-factor authentication. One Security Analyst paying attention to one alert might have caught the attacker before they pivoted. That's the job — and it's exactly what these students will learn to do.",
    vocabulary: [
      { term: "Cybersecurity", definition: "Protecting computers, networks, and data from attacks, damage, or unauthorized access." },
      { term: "Breach", definition: "When someone gets into a system or steals data without permission." },
      { term: "Ransomware", definition: "Malicious software that locks files until the victim pays the attacker." },
      { term: "Pen Test (Penetration Test)", definition: "A legal, authorized attack on a system to find weaknesses before criminals do." },
      { term: "Certification", definition: "An industry credential proving you have a skill — often more valued by employers than a degree." },
      { term: "CISO", definition: "Chief Information Security Officer — the most senior cyber role in a company." },
    ],
    redFlags: [
      "Student says 'people like me don't get jobs like this.' This signals internalized exclusion. Don't dismiss it. Validate, then plant a counter-example.",
      "Student deflects with humor every time cyber careers come up. May indicate fear of failure. Check in privately.",
      "Student disengages physically (puts head down, headphones in) during the discussion. Note it. May be a tough day — or a sign they don't yet feel safe in the cohort.",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Digital Safety Sim
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "digital-safety-sim",
    number: 2,
    name: "Digital Safety Sim",
    whatItTeaches:
      "How to recognize phishing emails and texts, build passwords that resist real attacks, spot social engineering, navigate public Wi-Fi safely, and respond when an account has been compromised. By the end, students should be able to defend their own digital lives and explain why each defense works.",
    whyItMatters: [
      "This is the single most personally useful module in the program. Most students have already been targeted — by an Instagram phishing DM, a fake Cash App support call, a romance scam, or a 'your package couldn't be delivered' text. Many have lost money or accounts. They just didn't have a name for what happened.",
      "Cybersecurity is not only a future career. It is a present-day life skill. Students who finish this module are immediately safer, and they become the person in their family or friend group who other people come to with questions. That role — the trusted advisor — is exactly what a Security Analyst does professionally.",
    ],
    timeRequired: "25 minutes in-app + 20 minutes for the password and account audit (Worksheet 3). Plan a full 60-minute session.",
    whatToExpect: [
      "Interactive scenarios where students decide: is this email phishing, or legitimate? Each scenario explains the red flags.",
      "Password-strength challenges — students see how a 'clever' password gets cracked in seconds and a long passphrase resists cracking for years.",
      "Social engineering examples — a phone call from 'IT,' a USB drive in a parking lot, a friend in trouble asking for money.",
      "Wi-Fi safety: what attackers can see on public networks and how a VPN changes the calculus.",
      "Breach response: what to do in the first hour after you realize an account is compromised.",
    ],
    facilitatorRole: {
      before: [
        "Have Worksheet 3 (Password & Account Audit) printed and ready.",
        "Decide whether you will recommend a specific free password manager — Bitwarden free tier is the safest neutral recommendation. Be ready to walk a student through signing up.",
        "Anticipate that at least one student has been recently scammed. Be ready to listen without making them feel stupid.",
      ],
      during: [
        "After each phishing scenario, pause and ask 'what told you it was fake?' before the app reveals the answer. Their detection muscles need reps.",
        "When you get to passwords, do the audit worksheet immediately while the topic is hot. Don't save it for later — they'll forget the urgency.",
        "If a student gets quiet during the phishing examples, they may be remembering a time they fell for one. Don't call them out. Make space for them to share later if they want.",
      ],
      after: [
        "Ask: 'What's one thing you're going to change about your digital safety this week?' Have each student name one action.",
        "Offer to help anyone enable MFA on their main account before they leave the session.",
        "Celebrate any student who says 'I already do that.' Reinforce that they're ahead.",
      ],
    },
    discussionBefore: [
      "Have you ever clicked something you shouldn't have? What happened?",
      "Has anyone you know been scammed online? How did they figure it out?",
      "What's the password style you use right now — without telling me the actual password? (e.g., 'a word plus my birthday', 'random characters', etc.)",
      "Do you reuse passwords? Be honest. (Most people do.)",
      "If you got an email from your bank right now saying your account was locked, what would you do first?",
    ],
    discussionAfter: [
      "What's one thing you're going to change about your own digital safety this week?",
      "Which scenario surprised you the most? Why was it convincing?",
      "Phishing succeeds against IT professionals every day. Why do you think it works so well?",
      "If your grandmother called you saying she got a strange email, walk me through what you'd tell her.",
      "What's the difference between being paranoid and being careful?",
    ],
    stickingPoints: [
      {
        point: "Student says they've been scammed and feels embarrassed.",
        guidance:
          "Normalize it on the spot. Phishing succeeds against trained IT professionals all the time. Mention the 2020 Twitter Bitcoin scam — even Twitter employees with full training got social-engineered. The shame protects the scammer, not the student.",
      },
      {
        point: "Student insists their password is fine because 'no one would guess it.'",
        guidance:
          "Cracking is not guessing. Attackers don't sit at a keyboard typing — they run software that tries billions of combinations. Show the haveibeenpwned.com count of breached passwords. A 'clever' 8-character password is broken in under a minute on consumer hardware.",
      },
      {
        point: "Student doesn't want to enable MFA because 'it's annoying.'",
        guidance:
          "Validate. It IS annoying. But it's the single most effective defense — Microsoft data shows MFA blocks 99.9% of account takeover attempts. Suggest starting with their most important account (email, since email is the recovery path for everything else).",
      },
      {
        point: "Student asks if they should use the same password manager their parent uses.",
        guidance:
          "Personal accounts should be personal. Recommend their own free Bitwarden or 1Password Families account if available. Family password sharing has its place but each person needs their own vault.",
      },
      {
        point: "Student raises that they don't have a phone for MFA.",
        guidance:
          "Real constraint, common in alternative education and reentry settings. Authenticator apps work on tablets and shared devices. Backup codes (printed and stored offline) are a phone-free option. Don't make MFA conditional on a smartphone.",
      },
    ],
    extensions: [
      "Have students set up a free Bitwarden account during the session and move 3 of their important accounts into it.",
      "Send students home with the assignment: 'Audit your mom/dad/auntie's accounts and help them enable MFA on at least one.' This builds the trusted-advisor identity.",
      "Have students try haveibeenpwned.com with one of their email addresses and see what breaches they're already in.",
    ],
    realWorld:
      "The MOVEit breach in 2023 exposed data on more than 60 million people across hundreds of companies — payroll providers, government agencies, hospitals. Many of those people only found out months later. The defensive lesson is small and concrete: turn on MFA, use unique passwords per account, treat every 'your account has been compromised' email as suspicious until you verify it through a separate channel. That's not paranoia — that's how analysts operate.",
    vocabulary: [
      { term: "Phishing", definition: "A fake message designed to trick you into giving up credentials, money, or access." },
      { term: "MFA / 2FA", definition: "Multi-factor (or two-factor) authentication. A second proof of identity beyond your password." },
      { term: "Social Engineering", definition: "Manipulating people — not computers — to give up information or access." },
      { term: "Credential Stuffing", definition: "Attackers using your leaked password from one site to try logging into all your other accounts." },
      { term: "Passphrase", definition: "A long string of words used as a password — usually stronger than a short complex password." },
      { term: "Password Manager", definition: "Software that generates and stores unique passwords for every site so you don't have to remember them." },
      { term: "VPN", definition: "Virtual Private Network — encrypts your internet traffic so others on the same network can't read it." },
    ],
    redFlags: [
      "Student reveals they were defrauded recently and seems financially harmed. Connect them to a trusted adult or partner site staff for support — not just cyber education.",
      "Student admits to using their accounts to scam others. Don't lecture; refer to the partner organization's case management process. This is bigger than facilitation.",
      "Student says 'I just don't care if I get hacked.' Often hides a deeper hopelessness. Check in privately.",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Network Basics
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "network-basics",
    number: 3,
    name: "Network Basics",
    whatItTeaches:
      "How data travels across the internet — what a packet is, how DNS turns a name into an address, what TCP and HTTP actually do, and where firewalls fit in. Students learn enough networking vocabulary to read job descriptions and to follow a Cisco NetAcad course without drowning.",
    whyItMatters: [
      "Networking is the foundation of every defensive cyber role. Without it, log analysis is just shapes on a screen and incident response is guesswork. This module is the bridge from 'I care about security' to 'I can actually do this job.'",
      "It is also the most technical module — the one most likely to lose students. Plan for it. Slow down. Use analogies. Repeat the mail-delivery comparison until students are sick of hearing it. The goal isn't mastery in 30 minutes; it's enough familiarity that they can keep going.",
    ],
    timeRequired: "30 minutes in-app + a 20-minute group packet-tracing activity. Total session: 60-75 minutes. Plan a break in the middle.",
    whatToExpect: [
      "A walk-through of what happens between typing a URL and seeing a webpage — DNS lookup, TCP handshake, HTTP request, response.",
      "Visualizations of how packets are routed, including what each hop along the way can or cannot see.",
      "Introduction to firewalls — what they block, what they don't, and why they're not a silver bullet.",
      "A worked example tracing a single web request from browser to server and back, with notes on where security controls live.",
      "Quick exposure to the OSI model — students don't need to memorize all 7 layers but should know it exists.",
    ],
    facilitatorRole: {
      before: [
        "Re-read this module yourself. If you're not from a networking background, watch a 10-minute 'How does the internet work?' YouTube video the night before.",
        "Have the packet-tracing group activity ready (see Extensions). Even simple: a string drawn between students representing packets passing.",
        "Acknowledge upfront that this module is denser than the others. 'If this is the one that feels hardest, that's normal. Almost everyone says that.'",
      ],
      during: [
        "Pause after each acronym (IP, DNS, HTTP, TCP) and ask a student to repeat what it stands for and what it does, in their own words. If they can't, slow down — don't move on.",
        "Use physical analogies relentlessly. Mail delivery, road trips, sending a package. Abstract concepts need concrete handles.",
        "Watch for the glaze-over. When eyes go flat, stop and do a 90-second physical activity — pass an object around the room as a 'packet' and call out the firewalls, routers, and DNS lookups.",
      ],
      after: [
        "Have each student write down ONE thing they understood and ONE thing that's still fuzzy. Collect them. Use the fuzzy items to start next session.",
        "Reassure: nobody fully understands networking in 30 minutes. The goal is to be unafraid of it.",
      ],
    },
    discussionBefore: [
      "When you type 'google.com' and hit enter, what do you think happens?",
      "How does your phone know which router to send data to?",
      "Have you ever heard the word 'packet' before? In what context?",
      "What's the difference between Wi-Fi and the internet?",
      "If you had to design a system to deliver mail to every house in the world, what would you need?",
    ],
    discussionAfter: [
      "When you opened this lesson, your packet traveled through how many systems? What could go wrong at each step?",
      "Where would a security analyst place a firewall to protect a hospital? What kinds of attacks would it stop, and what kinds would it miss?",
      "Why does DNS matter? What could an attacker do if they controlled DNS?",
      "The lesson said 'a firewall is not a silver bullet.' What does that mean?",
      "Which networking concept did you find most interesting? Why?",
    ],
    stickingPoints: [
      {
        point: "Acronym overload — student starts asking 'what was DNS again?' for the third time.",
        guidance:
          "Don't sigh. Hand them the vocabulary list and let them keep it open. Acronyms are not a knowledge problem; they're a retrieval problem. Reps fix it.",
      },
      {
        point: "Student says 'this is too technical, I'm out.'",
        guidance:
          "Validate. 'Networking is the hardest module. You're not behind — this is just the part that takes the longest.' Then offer a one-on-one walk-through after the session.",
      },
      {
        point: "Student gets stuck on the OSI model 7 layers.",
        guidance:
          "Skip it. The 7-layer OSI model is a teaching aid, not something students need to memorize at this stage. Tell them: 'You'll see this again in NetAcad. Don't worry about it now.'",
      },
      {
        point: "Student asks 'why do I need to know this if I want to be a SOC analyst?'",
        guidance:
          "Fair question. Answer honestly: every alert a SOC analyst investigates names IPs, ports, and protocols. If those words are unfamiliar, the alert is unreadable. This is the literacy that makes the work possible.",
      },
      {
        point: "Student confuses IP address with MAC address.",
        guidance:
          "Common. IP = the postal address that changes when you move. MAC = the serial number on your phone that doesn't. Both identify the device, but for different purposes.",
      },
    ],
    extensions: [
      "Group packet-tracing: assign each student a role — sender, DNS server, router, firewall, web server, receiver. Pass a physical 'packet' (a sticky note with a URL) through the chain. Each station narrates what it does.",
      "Have students open a terminal (or use an online tool) and run a real `ping` and `traceroute` to a website. See the actual hops.",
      "Watch a short video on a real DDoS attack — Dyn 2016 took out Twitter, Reddit, Netflix. Discuss what defenses would have helped.",
    ],
    realWorld:
      "The 2016 Dyn DNS attack used a botnet of compromised smart cameras and DVRs to flood Dyn's servers — the company that handled DNS for Twitter, Spotify, Netflix, and PayPal. For hours, those sites were unreachable not because they were hacked, but because nobody could look up where they lived. A Network Analyst watching DNS query volume would have seen it building. The skill of reading network traffic is what separates someone who feels it in real time from someone who reads about it the next day.",
    vocabulary: [
      { term: "Packet", definition: "A small chunk of data with addressing info that travels across a network." },
      { term: "IP Address", definition: "The unique number that identifies a device on a network (like a postal address)." },
      { term: "DNS", definition: "Domain Name System — translates 'google.com' into the IP address machines actually use." },
      { term: "TCP", definition: "Transmission Control Protocol — makes sure packets arrive in order and nothing is missing." },
      { term: "HTTP / HTTPS", definition: "Hypertext Transfer Protocol — how browsers and web servers talk. HTTPS is the encrypted version." },
      { term: "Firewall", definition: "A device or software that filters traffic based on rules — blocks what shouldn't get through." },
      { term: "Port", definition: "A numbered doorway into a computer. Different services listen on different port numbers (web=80, secure web=443)." },
      { term: "Protocol", definition: "An agreed-upon set of rules for how two systems talk to each other." },
    ],
    redFlags: [
      "Student visibly shuts down halfway through and refuses to come back. Don't push. Check in privately and consider pairing them with a stronger peer for the next session.",
      "Student says 'I'm just dumb at this stuff.' Counter quickly but don't over-explain. 'You're learning a foreign language in 30 minutes. That's not dumb — that's hard.'",
      "Student asks repeatedly when the technical part ends. May be a sign they want career content over technical depth — totally valid. Reassure that Modules 4-7 are more applied.",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Threat Detective
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "threat-detective",
    number: 4,
    name: "Threat Detective",
    whatItTeaches:
      "The real workflow of a Security Operations Center (SOC) analyst — reviewing log entries, identifying a breach pattern, and writing a clear incident report. This is the first module where students do work that mirrors an actual entry-level job.",
    whyItMatters: [
      "Up to this point, the modules have been about understanding. This one is about doing. Students stop being 'someone learning about cyber' and start being 'someone practicing being an analyst.' That identity shift is the most important outcome of the whole program.",
      "It's also the module that creates the strongest portfolio artifact. The incident report a student writes here is something they can talk through in an interview. 'I reviewed a set of logs, identified a pattern of failed logins from an unusual IP, and concluded the account was being brute-forced.' That sentence, said with confidence, gets people hired.",
    ],
    timeRequired: "35 minutes in-app. Plan for an additional 15 minutes of group debrief where students share what they found and how they wrote it up.",
    whatToExpect: [
      "A scenario brief: a fictional company has noticed something off. The student's job is to find what.",
      "A set of log entries to review — timestamped, with usernames, IPs, success/failure markers.",
      "Multiple-choice prompts to identify the breach (e.g., 'Was this a brute force, a phishing-driven compromise, or insider misuse?').",
      "An incident report template the student fills in: what happened, when, who, scope, recommended next steps.",
      "Feedback at the end on the quality of the written report.",
    ],
    facilitatorRole: {
      before: [
        "Read through the scenario yourself first. Have your own answer to 'what's the breach?' ready before students start.",
        "Bring out the language they'll need: 'lateral movement,' 'failed authentication,' 'pivot.' Don't expect them to know these — teach them as the scenario unfolds.",
        "Remind students that real analysts work in teams. Pair work is encouraged for this module.",
      ],
      during: [
        "Walk through the FIRST log entry with the whole group out loud. Then let them work. The first one is the literacy gate — once they can read one, they can read fifty.",
        "Resist giving answers. When a student asks 'is this the breach?' answer with 'what makes you think so?' Their reasoning matters more than their answer.",
        "Encourage students to write rough notes as they go. Real analysts don't hold logs in their head — they take notes.",
      ],
      after: [
        "Have each student or pair share their incident report out loud (or read it). Praise specifics: 'You said the IP was from Romania — that's exactly the kind of detail a real report needs.'",
        "Discuss: what would the company do with this report? Who reads it? This connects the work to a real chain of action.",
        "Celebrate the identity shift: 'You just did what a SOC analyst does on day one of the job.'",
      ],
    },
    discussionBefore: [
      "If a detective walked into a crime scene, what would they look for first?",
      "What's the difference between evidence and a guess?",
      "If you saw 100 emails in your inbox and one of them was malicious, how would you find it?",
      "Have you ever solved a problem by looking at a pattern? What was it?",
      "What makes a report 'good' versus 'bad' in your experience?",
    ],
    discussionAfter: [
      "If you were the company CEO and your analyst sent you this report, what would you do next?",
      "What part of the investigation felt most like real detective work?",
      "What information was missing from the logs that you wished you had?",
      "If this had been a real breach with real customer data, what's the first phone call the company has to make?",
      "Could you imagine doing this 8 hours a day? Why or why not?",
    ],
    stickingPoints: [
      {
        point: "Student is intimidated by raw log lines and freezes.",
        guidance:
          "Walk through ONE entry with them out loud. Read each field: 'timestamp = when it happened, src_ip = where it came from, user = who tried to log in, status = whether it worked.' Once they parse one, they can parse the rest.",
      },
      {
        point: "Student picks a wrong answer and gets discouraged.",
        guidance:
          "Wrong answers in an investigation are normal. Real analysts have a hypothesis, test it, and revise. Frame it: 'You tested an idea and ruled it out. That's the work.'",
      },
      {
        point: "Student writes an incident report that's three words long.",
        guidance:
          "Use the template prompts: 'What happened? When? Who's affected? What did you do? What should happen next?' If they answer each in one sentence, the report writes itself. Give them the structure, not the words.",
      },
      {
        point: "Student says 'this is just guessing.'",
        guidance:
          "It's not — but it's a fair pushback. Investigations are about narrowing options based on evidence. Show them which log fields are evidence and which are just noise.",
      },
      {
        point: "Student finishes too fast and didn't actually engage.",
        guidance:
          "Ask them to read their report aloud. If it's thin, ask them one specific follow-up: 'What time did the breach start?' If they don't know, send them back to look. Quality over completion.",
      },
    ],
    extensions: [
      "Have a 'detective day' where students bring a real news article about a breach and present it like a case briefing.",
      "Show students a public incident report (e.g., a CISA advisory) and have them read it together. Compare format to their own.",
      "Run a roleplay: one student is the analyst, one is the CEO. The analyst presents the report; the CEO asks tough questions.",
    ],
    realWorld:
      "In the 2020 Twitter Bitcoin scam, internal logs showed Slack messages, admin tool accesses, and account changes made by a small group of accounts — including some belonging to employees who weren't at their desks. A SOC analyst reading those logs in near-real time would have seen the anomaly within minutes. Twitter's eventual report read very much like the kind of write-up students produce in this module. That's not coincidence — the workflow is the same.",
    vocabulary: [
      { term: "Log", definition: "A timestamped record of an event on a system — who did what, when, and whether it worked." },
      { term: "Brute Force", definition: "An attack where someone tries thousands of password combinations until one works." },
      { term: "Lateral Movement", definition: "When an attacker who got into one system uses it to move to other systems on the same network." },
      { term: "SIEM", definition: "Security Information and Event Management — the tool analysts use to search and correlate logs." },
      { term: "IOC (Indicator of Compromise)", definition: "A specific piece of evidence (IP, file hash, domain) that points to an attack." },
      { term: "Incident Report", definition: "A written summary of a security event — what happened, scope, response, and recommendations." },
      { term: "SOC", definition: "Security Operations Center — the team that watches for and responds to attacks around the clock." },
    ],
    redFlags: [
      "Student writes a report blaming the user who got phished. Coach them: in real reports, blame is replaced with system-level findings. 'User clicked a link' is not the root cause — 'no email filtering on inbound mail' is.",
      "Student gives up after one wrong answer. Sit next to them. Walk through the next entry together. Confidence is fragile here and crucial.",
      "Student takes the scenario too literally and gets distressed (e.g., 'this could happen to my family'). Validate, then redirect to the defender role: 'And now you're learning to stop it.'",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Cyber Career Map
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "career-map",
    number: 5,
    name: "Cyber Career Map",
    whatItTeaches:
      "A guided exploration of 6-8 cyber roles, what each one actually does day-to-day, what it pays, what kind of person tends to thrive in it, and what credentials or experiences get someone hired. Students leave with a top 1-2 roles they want to pursue and a sense of the path to get there.",
    whyItMatters: [
      "Most career exploration in K-12 systems is shallow — a list of jobs, a salary, a generic 'this might be for you.' Justice-impacted and alternative-education youth in particular have been handed thin career content their whole lives. They've learned to tune it out.",
      "This module is designed to push past that. Each role is described in terms of who hires for it, what a typical day looks like, what kind of person fits, and what concrete next step opens that door. The goal isn't to have students decide today — it's to have them see themselves in at least one role they didn't know existed yesterday.",
    ],
    timeRequired: "20 minutes in-app + 25 minutes for Worksheet 1 (Career Interest Reflection). Plan a 45-60 minute session.",
    whatToExpect: [
      "Each role presented with: what they do daily, typical salary range (entry through experienced), education or certs that open the door, personality fit, and a 'first job' description so students can search for real openings.",
      "A self-rating tool — students rate their interest in each role 1-5.",
      "A short reflection at the end: top 2 roles, what about them appeals, what's the first step.",
      "Worksheet 1 deepens this with longer-form questions and a 12-month planning prompt.",
    ],
    facilitatorRole: {
      before: [
        "Print Worksheet 1 ahead of time. Have a pen for each student.",
        "Pre-read each role description so you can supplement with stories. If you know someone in cyber, plan a sentence or two about them.",
        "Be honest with yourself: have you ever felt like a job 'wasn't for you' because of who else was in it? That's the felt experience many students bring. Be ready to meet it.",
      ],
      during: [
        "After each role, ask one student: 'Can you imagine doing this for 40 hours a week?' Real answers matter — including 'no.'",
        "Don't just read salaries. Translate them: 'A Security Analyst making $80K takes home around $4,500/month after taxes, in most states. What does that buy in your neighborhood?' Concrete.",
        "Look for surprised reactions. If a student says 'wait, that's a job?' linger there.",
      ],
      after: [
        "Have every student name their top role aloud. Don't move on until everyone has named one — even if it's tentative.",
        "Connect to next steps: 'Your top role is Pen Tester. Cisco NetAcad has a free intro course. Want to start it tonight?'",
        "Update the cohort progress tracker with each student's top role — you'll use this for ongoing mentorship.",
      ],
    },
    discussionBefore: [
      "What jobs have adults around you actually had? What did you learn about work from watching them?",
      "What's a job you'd never want to do? Why?",
      "When you imagine yourself working — five years from now — where are you? What does it look like?",
      "What does 'good money' mean to you? Be specific.",
      "What's a skill you have that nobody is paying you for yet?",
    ],
    discussionAfter: [
      "Which role surprised you the most? Why?",
      "If your top role pays $90K and requires a Security+ cert, what's your 12-month plan to get there?",
      "Which role would your family understand? Which one would you have to explain?",
      "Did any role make you think 'I could actually see myself doing that'? Tell me about it.",
      "What's the difference between a job you want and a job you think you SHOULD want?",
    ],
    stickingPoints: [
      {
        point: "Student feels the salary ranges are unrealistic.",
        guidance:
          "Be honest. Entry roles in your region may pay less than the national range. Cite a real local job listing if you can — Indeed or LinkedIn. Don't oversell. But also don't undersell: cyber pays well compared to most fields, even at entry.",
      },
      {
        point: "Student picks the highest-paid role without considering fit.",
        guidance:
          "Don't shame the choice. Money is a real and valid reason. But press: 'CISO is a leadership role. Are you someone who likes managing teams, sitting in boardrooms, doing politics?' Sometimes they discover they're more drawn to the work than the title.",
      },
      {
        point: "Student says all the roles sound boring.",
        guidance:
          "Possible. Or they may not yet have the language for what excites them. Ask: 'What's something you've done — anything, paid or not — where you lost track of time?' Map that back to roles.",
      },
      {
        point: "Student fixates on a role with the lowest credential bar.",
        guidance:
          "Validate the strategy — minimum viable credential is a smart approach. But also: 'After your first role, what's role #2?' Help them see the trajectory beyond the first job.",
      },
      {
        point: "Student says 'I want to do this but my record will stop me.'",
        guidance:
          "Be specific and honest. Many cyber employers DO hire people with records — especially in private-sector defensive roles. Some government clearance jobs won't. Refer them to your partner organization's reentry employment lead. Don't promise outcomes you can't guarantee, but don't crush hope either.",
      },
    ],
    extensions: [
      "Have students search LinkedIn for their top role in their city. How many openings? What do they all ask for?",
      "Bring in a cyber professional via Zoom (15 minutes is enough) to answer 'what is your actual day like?'",
      "Have students draft a LinkedIn 'About' section as if they already had the role they want. Future-self framing.",
    ],
    realWorld:
      "In 2024, CompTIA's State of the Tech Workforce report identified cybersecurity as one of the few fields where credential-based hiring continues to gain ground over degree-based hiring. Multiple Fortune 500 employers — IBM, Apple, Amazon among them — have publicly dropped degree requirements for many tech roles. This is not aspirational. It is current. A student who finishes Cyber Launch and earns ISC2's free Certified in Cybersecurity credential is genuinely qualified to apply for entry SOC roles in many regions.",
    vocabulary: [
      { term: "SOC Analyst", definition: "Watches alerts and investigates suspicious activity in real time. Common entry-level role." },
      { term: "Penetration Tester", definition: "Legally attacks systems to find weaknesses. Requires hands-on skill and curiosity." },
      { term: "Incident Responder", definition: "Leads the team that contains and recovers from an active breach. High-pressure, high-respect." },
      { term: "GRC Analyst", definition: "Governance, Risk, and Compliance — translates security work into policies, audits, and reports." },
      { term: "Digital Forensics", definition: "Recovers and analyzes data from devices after incidents or crimes. Detail-oriented work." },
      { term: "Security+ / CC", definition: "CompTIA Security+ and ISC2 Certified in Cybersecurity — two beginner-friendly certifications that open doors." },
      { term: "Clearance", definition: "Government background-check status some federal roles require. Not needed for most private-sector cyber jobs." },
    ],
    redFlags: [
      "Student picks a role just because they don't want to disappoint you. Watch for the over-eager answer. Ask follow-up questions to make sure it's their choice.",
      "Student dismisses the entire module as 'a brochure.' Often hides past experience with shallow career talk. Ask what would have made it real for them.",
      "Student reveals a record-related concern and seems to give up. Pause. Connect them to the right support staff at your site that day.",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Cisco Networking Academy
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "cisco-netacad-link",
    number: 6,
    name: "Cisco Networking Academy",
    whatItTeaches:
      "How to enroll in and navigate Cisco's free industry-grade coursework — particularly the 'Introduction to Cybersecurity' and 'Networking Essentials' courses, which are valuable on a resume and serve as direct prep for the CCNA and Cybersecurity certifications.",
    whyItMatters: [
      "Bright Boost is a launchpad, not the whole rocket. Cisco NetAcad is where students go from 'understands cyber' to 'has real coursework on their resume.' The certificates students earn on NetAcad are issued by Cisco — a name every employer knows.",
      "The biggest predictor of whether a student actually continues with NetAcad after this session is whether they got their account set up while you were in the room. Don't let this be optional — sit with them as they sign up.",
    ],
    timeRequired: "20 minutes for setup + 10-15 minutes of guided tour. Self-paced thereafter. Plan a full session for setup.",
    whatToExpect: [
      "An overview of what Cisco NetAcad offers, focused on the two most accessible courses for beginners.",
      "Step-by-step account setup — students create their NetAcad login during the module.",
      "A tour of the platform: how to enroll in a course, where homework lives, how to track progress.",
      "Notes on which courses lead to which certifications and what each cert is worth on a job application.",
    ],
    facilitatorRole: {
      before: [
        "Create your own NetAcad account if you don't have one. You can't guide students through a system you've never used.",
        "Have the direct enrollment URL ready: introduction to cybersecurity is the easiest first course. Bookmark it.",
        "Test the platform on the device students will use. If site access is restricted at your location, plan workarounds in advance.",
      ],
      during: [
        "Have every student create their NetAcad account in the session. Not after — DURING. Walk between desks confirming each one is in.",
        "Note their NetAcad usernames in the cohort tracker. Future check-ins will reference this.",
        "Show them where to find 'My Courses,' how to mark a lesson complete, and where the certificate appears at the end.",
      ],
      after: [
        "Assign Module 1 of 'Introduction to Cybersecurity' as homework before the next session. Frame it: 'You're now in Cisco's system. You're not a Bright Boost student anymore — you're a Cisco learner.'",
        "Plan to follow up in week 5 or 6: who finished Module 1? Who needs nudging? This is where ongoing mentorship begins.",
      ],
    },
    discussionBefore: [
      "What's the most prestigious or recognizable company name on your resume right now? What would it mean to have Cisco there?",
      "What's stopped you from finishing online courses in the past?",
      "If you finish a free Cisco course and put it on your resume, who reads that resume differently?",
      "How do you keep yourself going on self-paced work?",
      "What would help you stick with a course over 6-8 weeks?",
    ],
    discussionAfter: [
      "Now that your account is set up, when are you going to do Module 1? Be specific — what day and time?",
      "What might get in the way of finishing? What's your backup plan?",
      "Who in your life can you tell about this — so they ask you 'how's your Cisco course going' next week?",
      "What's the smallest version of finishing one lesson? How many minutes?",
      "If you finish Intro to Cybersecurity, what's the next course on NetAcad you'd want to take?",
    ],
    stickingPoints: [
      {
        point: "Student can't create an account because they don't have an email.",
        guidance:
          "Help them create a free Gmail or ProtonMail address. This is also a life skill — many programs and employers will require an email. The account setup is part of the work.",
      },
      {
        point: "Student finds the NetAcad interface confusing.",
        guidance:
          "It IS more complex than ours. Walk through it together the first time. Show them: dashboard, enrolled courses, current lesson, progress bar, certificate page. After that, they can navigate alone.",
      },
      {
        point: "Student says 'I don't have time for another platform.'",
        guidance:
          "Validate. Then reframe: 'Intro to Cybersecurity is six modules. If you do one module a week, that's six weeks to a certificate from Cisco. What other six-week thing would have that payoff?'",
      },
      {
        point: "Student gets the account but doesn't enroll in any course.",
        guidance:
          "Enroll them then and there. Pick 'Introduction to Cybersecurity.' Have them click 'Start Course.' The first 90 seconds of the first lesson should happen with you sitting next to them. Inertia is the enemy.",
      },
      {
        point: "Student's site blocks the NetAcad domain.",
        guidance:
          "Real. Many correctional and alternative-ed sites have strict firewalls. Have the IT/facilities contact ready. NetAcad is widely recognized as safe educational content — most blocks can be lifted with a request.",
      },
    ],
    extensions: [
      "Pair students into 'study buddies' who check in on each other's NetAcad progress weekly.",
      "Set a cohort goal: 'By week 6, everyone has finished Module 1.' Celebrate with a printable Cisco cert reveal moment.",
      "Have students share screenshots of their NetAcad progress in a cohort group chat (if permitted by site policy).",
    ],
    realWorld:
      "Cisco's CCNA certification is one of the most commonly listed credentials in entry-level networking and security job postings. Even passing the free 'Introduction to Cybersecurity' course produces a digital badge that students can post on LinkedIn. That single line — 'Introduction to Cybersecurity, Cisco Networking Academy, 2026' — on a resume often gets it past the first algorithmic screen. Free credentials with Cisco's name are not a small thing.",
    vocabulary: [
      { term: "Cisco NetAcad", definition: "Cisco's free online learning platform for networking, security, and IT skills." },
      { term: "CCNA", definition: "Cisco Certified Network Associate — a well-known networking certification, often a job requirement." },
      { term: "Module", definition: "A unit of coursework on NetAcad, usually 1-3 hours of content with a quiz at the end." },
      { term: "Digital Badge", definition: "An online credential — often shareable on LinkedIn — issued at the end of a course." },
      { term: "Self-Paced", definition: "A course you complete on your own schedule, without live class times." },
    ],
    redFlags: [
      "Student leaves the session without an account created. They will not return to set it up alone. Hold the line: account creation happens in session.",
      "Student creates an account but never logs back in. Plan a week-5 check-in where you watch them log in and complete one lesson with you.",
      "Student feels overwhelmed by 'another platform.' Sometimes the right answer is to push pause and focus on Capstone first; NetAcad can wait until after program completion.",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Capstone — My Security Plan
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "capstone-security-plan",
    number: 7,
    name: "Capstone: My Security Plan",
    whatItTeaches:
      "How to apply everything from the program to a real (or realistic) scenario — assessing risk, recommending controls, writing an executive summary, and presenting findings. The artifact students produce is portfolio-grade.",
    whyItMatters: [
      "Every student leaves this program with something they can show. The Capstone is that something. It is the answer to the most common interview question for entry-level cyber roles: 'Tell me about a project you've worked on.'",
      "The Capstone is also the moment students hear themselves speak about cyber with authority for the first time. That voice — the confident, knowledgeable voice — is the most important asset they leave with. Once they've heard themselves use it, they can use it again.",
    ],
    timeRequired: "45 minutes in-app + 30 minutes of presentation and feedback. Plan a 90-minute showcase session for the final week.",
    whatToExpect: [
      "A realistic business scenario — a small organization with assets, employees, and weak spots.",
      "Guided prompts to identify the three biggest risks, recommend a control for each, and estimate cost vs. value.",
      "An executive summary template — students fill in: situation, key risks, recommendations, expected outcome.",
      "A presentation prompt: students explain their plan in 3-5 minutes.",
      "Feedback and reflection at the end.",
    ],
    facilitatorRole: {
      before: [
        "Print Worksheet 6 (Capstone Planning Doc) for each student.",
        "Decide whether students will present to just the cohort, or invite outside guests (partner org leaders, family, community members). Outside guests massively increase the impact — students rise to a real audience.",
        "Have sentence starters ready for the executive summary (see below in stickingPoints).",
      ],
      during: [
        "Push students past first-draft thinking. 'You said the biggest risk is phishing. Why? What evidence in the scenario tells you that?'",
        "Read their executive summaries out loud while sitting next to them. Hearing the words helps them catch what's missing.",
        "Hold the room during presentations. Phones away. Eye contact. This is a real moment.",
      ],
      after: [
        "Give every student specific, true feedback. 'You identified MFA as a quick win — that was a sharp call.' Avoid generic praise.",
        "Make sure each student leaves with a printed copy of their final Capstone. This becomes a portfolio document.",
        "Take a photo of them with their finished plan (with consent). Their first 'cyber professional' moment, captured.",
      ],
    },
    discussionBefore: [
      "If you had to recommend ONE security change to a small business in your neighborhood, what would it be?",
      "What's the difference between a problem and a risk?",
      "When you've explained something hard to someone before, what made the explanation work?",
      "What does 'executive summary' mean to you? Have you read one before?",
      "If a stranger had to act on your advice, what would they need from you in writing?",
    ],
    discussionAfter: [
      "Your security plan looks like a document a consultant produces. Some people make a living writing variations of this. What did this exercise teach you about that work?",
      "What part of the plan was hardest? Why?",
      "If the business owner read your plan and could only do ONE thing, what should they do first?",
      "When you presented, what felt different about hearing yourself say these things out loud?",
      "What would you change about your plan if you had another week to work on it?",
    ],
    stickingPoints: [
      {
        point: "Executive summary feels too formal/scary.",
        guidance:
          "Provide sentence starters: 'This assessment focuses on...' / 'The three highest risks identified are...' / 'My recommended priorities are...' Tell students that real summaries follow the same pattern — there's a formula. Once they have the formula, the work becomes filling in the blanks with their own analysis.",
      },
      {
        point: "Student picks too many risks to address.",
        guidance:
          "Force them to pick three. Then within those three, force them to rank #1. Real consulting is ruthless prioritization. The skill of choosing what NOT to do is part of the work.",
      },
      {
        point: "Student picks recommendations that cost too much.",
        guidance:
          "Push back: 'This business has 5 employees and $50K annual revenue. They can't buy a $20K firewall. What's the version that costs nothing?' MFA is free. Password managers have free tiers. Education is free. Make them cost-conscious.",
      },
      {
        point: "Student writes a plan that's generic — could apply to any business.",
        guidance:
          "Pull them back to the scenario. 'The business is a small dental office. What about THAT changes your priorities?' Specificity is the skill. Generic plans get ignored.",
      },
      {
        point: "Student is terrified of presenting.",
        guidance:
          "Offer options: present to just you first, then to the cohort. Or record themselves on video. Public presentation isn't the skill — the skill is being able to explain their work. Let them choose the format that lets them do that.",
      },
    ],
    extensions: [
      "Invite a real small-business owner to listen to a presentation. The stakes raise the work.",
      "Have students record themselves presenting and watch it back. The most uncomfortable, most powerful learning happens in playback.",
      "Submit the best Capstone to a regional cybersecurity competition or to the partner organization's leadership.",
    ],
    realWorld:
      "Small and mid-sized businesses are the most targeted and least defended segment of the U.S. economy — and they are massively underserved by traditional cyber consulting because the engagement fees are too high. A student who can write a clear, prioritized security plan for a small business is producing exactly the kind of work some independent consultants charge $2,000-$5,000 for. The Capstone is not a school project. It is a sample of professional work.",
    vocabulary: [
      { term: "Risk", definition: "A potential bad thing that could happen, combined with how bad it would be." },
      { term: "Control", definition: "A specific defense or action that reduces a risk (e.g., MFA is a control against credential theft)." },
      { term: "Likelihood", definition: "How probable a given risk is to actually happen." },
      { term: "Impact", definition: "How much damage a risk would cause if it did happen — money, downtime, harm." },
      { term: "Quick Win", definition: "A control that delivers a lot of protection for very little cost or effort." },
      { term: "Executive Summary", definition: "A short — usually one page — overview of a longer report, written for non-technical decision-makers." },
      { term: "Portfolio Artifact", definition: "A piece of real work you can show to employers as evidence of skill." },
    ],
    redFlags: [
      "Student refuses to present and seems shut down — not just shy. Make space for a private session. The skill is more important than the format.",
      "Student's plan reveals deep stress or fixation on a personal experience (e.g., a real breach in their family). Acknowledge, redirect to the scenario, connect them to a trusted adult after.",
      "Student finishes too easily and acts like the work is beneath them. Ask harder questions: 'Walk me through your second-priority recommendation. Why not first?' Real work has friction.",
    ],
  },
];

export function getGuideBySlug(slug: string): ModuleGuide | undefined {
  return MODULE_GUIDES.find((g) => g.slug === slug);
}

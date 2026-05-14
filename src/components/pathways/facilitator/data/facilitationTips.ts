/**
 * Facilitation tips for working with Pathways cohorts.
 *
 * IMPORTANT REVIEW NOTE:
 * The "Working With Justice-Impacted Youth" section touches on
 * trauma-informed practice, language norms, and referrals to other support.
 * This content has NOT been reviewed by a clinical social worker, partner
 * org leadership, or counsel. Treat it as a starting draft. Before this is
 * printed at scale or used in partner training, it should be reviewed by:
 *   1. A clinician or social worker familiar with the population
 *   2. Partner organization (e.g., Escape The Odds) leadership
 *   3. The facilitators who will actually use it
 *
 * The goal is to provide useful structure without crossing into clinical
 * guidance that's outside our scope.
 */

export interface TipsSection {
  id: string;
  title: string;
  intro: string;
  bullets: { heading: string; body: string }[];
}

export const FACILITATION_TIPS: TipsSection[] = [
  {
    id: "tone-day-one",
    title: "Setting Tone Day One",
    intro:
      "The first session decides whether students lean in or check out. The work of session one is less about content and more about establishing that this room is different from school, court, work, or the other places they've been told what they can't do.",
    bullets: [
      {
        heading: "Don't lead with 'this is about getting a job'",
        body: "Lead with 'this is about understanding something most people don't.' Students who are tired of being marketed to will check out at any mention of careers in the first 10 minutes. Earn that conversation by giving them something interesting first — then careers land.",
      },
      {
        heading: "Handle 'I'm not smart enough' on the spot",
        body: "When a student says this — and one usually does in the first session — don't argue. Don't reassure them. Ask: 'What does smart mean to you?' Then share that the most valuable trait in cyber isn't intelligence — it's stubbornness in the face of confusing systems. Most students recognize themselves in that.",
      },
      {
        heading: "Make mistakes part of the work",
        body: "Phishing succeeds against IT professionals. Pen testers fail to break into systems regularly. Incident responders make wrong calls under pressure. Tell students this early. Mistakes are not the absence of skill — they are how skill is built. If they make a mistake in a module, they're doing the work right.",
      },
      {
        heading: "Establish cohort confidentiality",
        body: "Tell students explicitly: what gets shared in this room stays in this room. If a student talks about a scam they fell for, a family member's situation, or a personal account they're worried about — that doesn't leave the cohort. You as facilitator will not discuss specific students with anyone outside the program except in safety situations. State this. Don't assume they know.",
      },
      {
        heading: "Use names",
        body: "By session two, you should know every student's name. Use them. Greet by name. Call on by name. This is one of the cheapest, highest-impact things you can do to signal that you see each person as a person, not a participant.",
      },
    ],
  },
  {
    id: "justice-impacted",
    title: "Working With Justice-Impacted Youth",
    intro:
      "Many Pathways cohorts will include students with juvenile system involvement, current or former probation, family system involvement, or recent reentry. The work here is to deliver real cybersecurity education while remaining attentive to the histories students bring. This is a starting framework — not clinical guidance.",
    bullets: [
      {
        heading: "Trauma-informed basics",
        body: "Predictability matters. Start and end sessions on time. Follow the same rhythm each week (check-in → module work → discussion → close). Students who have experienced unpredictability in other systems will relax into a reliable structure. Avoid surprises that put a student on the spot in front of peers.",
      },
      {
        heading: "Language that doesn't assume traditional school success",
        body: "Avoid: 'when you were in school,' 'as you learned in middle school,' 'when you go to college.' Substitute: 'whether or not school worked for you,' 'one path is college — another is...' Many students didn't have a smooth K-12 experience, and language that assumes it telegraphs that this program isn't for them.",
      },
      {
        heading: "The 'background check' question",
        body: "It will come up, often in Module 5 (Career Map). Be honest. Many private-sector cyber roles do not run the kind of background check that disqualifies based on juvenile or non-violent records. Some federal and defense roles do. The pathway exists, and it's wider than 'no records anywhere.' Refer to partner org reentry employment leads for region-specific guidance. Never promise outcomes — and never crush hope. Both are lies.",
      },
      {
        heading: "Build agency, not dependency",
        body: "Resist the urge to give students answers or fix problems for them. When a student asks 'what should I do?', respond with 'what are you thinking?' first. The skill you're building is their capacity to assess and decide — not their reliance on you. This applies to module work and to life questions equally.",
      },
      {
        heading: "Know when to refer",
        body: "Cyber education is the work. Mental health, legal questions, housing instability, family conflict, substance use — these are NOT your work. When they surface (and sometimes they will), your job is to listen briefly, validate, and connect the student to the partner organization's case management or support staff. Have those names and numbers ready before session one. You are not the safety net — but you should know where the net is.",
      },
      {
        heading: "Frame skills as power",
        body: "For students who've been on the receiving end of systems that surveilled them, restricted them, or held information about them, cyber skills are a form of power. They can protect their own data, help their families, and someday work in roles that hold the levers. This framing — power, not just employment — lands differently than 'this is a good career.' Use it when it's authentic.",
      },
    ],
  },
  {
    id: "cultural-responsiveness",
    title: "Cultural Responsiveness",
    intro:
      "The curriculum was written to be broadly accessible, but every cohort is specific. Adapt the examples, language, and emphasis to the students in front of you.",
    bullets: [
      {
        heading: "Examples should reflect students' lives",
        body: "When you discuss phishing, use scenarios from platforms students actually use — Instagram DMs, Cash App texts, TikTok messages, gift card scams. The IBM Cost of a Data Breach Report is true and useful — but a corner-store phishing example may land harder.",
      },
      {
        heading: "Be careful with 'cyber crime' framing",
        body: "For students who have been on the receiving end of the criminal justice system, framing parts of cyber as 'criminal hacking' can flatten complexity. Distinguish authorized work (pen testing, red teaming) from criminal work, and treat the line as a professional norm — not a moral judgment about the people who've crossed it.",
      },
      {
        heading: "Honor what students already know",
        body: "Many justice-impacted students have practical knowledge about surveillance, monitoring, and digital footprints that exceeds the curriculum. When a student says 'I know how to keep my phone clean from my P.O.,' that's actual technical knowledge. Validate it. Connect it to the field's broader frame.",
      },
      {
        heading: "Don't perform familiarity you don't have",
        body: "If you're not from the community your students are from, don't pretend to be. Students notice and trust you less for it. Be the version of you that you are. Acknowledge what you don't know. Ask. Listen. Your job isn't to be 'cool' — it's to be useful.",
      },
      {
        heading: "Adapt the celebration",
        body: "Some students respond to public praise; some shut down under it. Get a feel for each student's tolerance. Quiet, private acknowledgment is often more powerful than a group shoutout, especially early.",
      },
    ],
  },
  {
    id: "struggling-student",
    title: "When a Student Is Struggling",
    intro:
      "Struggle is part of learning. The skill is distinguishing productive struggle (the student needs more reps) from harmful struggle (the student needs different support).",
    bullets: [
      {
        heading: "Signs they need more technical support",
        body: "Spending 10+ minutes on a single concept without progress. Asking the same clarifying question multiple times. Going quiet during interactive modules. Solution: pair with a peer who's a step ahead, or sit with them and walk through one example together.",
      },
      {
        heading: "Signs they need emotional support",
        body: "Sudden withdrawal that's out of pattern. Aggressive humor when career topics come up. Eye contact that drops and doesn't recover. Solution: a private check-in. 'How's your week been?' is enough. Sometimes nothing is wrong with the module — life is wrong outside it.",
      },
      {
        heading: "Signs they need life support beyond your scope",
        body: "Talk of unsafe living situations, untreated mental health needs, food insecurity, legal trouble outside their control. Solution: connect to partner org support staff TODAY. Don't wait for the next session. Cyber education can resume once the more immediate need is being addressed.",
      },
      {
        heading: "Pairing strategies that work",
        body: "Strong-with-struggling pairings can help both — but only if the strong student is patient. Strong-with-strong pairings race ahead and lose the room. Strong-with-curious is the ideal — pair a confident student with a curious-but-uncertain one. The confident student feels useful; the curious student feels supported.",
      },
      {
        heading: "Know when to slow down vs. when to move forward",
        body: "Slow down when 30%+ of the cohort is lost. Move forward when 80%+ is following. Between those, push individuals through one-on-one, but don't hold the whole group. Pacing is a leadership decision — own it.",
      },
    ],
  },
  {
    id: "group-dynamics",
    title: "Group Dynamics",
    intro:
      "A cohort is more than a collection of students. It's a small social system. The system matters as much as the curriculum.",
    bullets: [
      {
        heading: "Pair work strategies",
        body: "Default to pairs over solo work for hands-on modules (Threat Detective, Capstone). Pairs talk through their reasoning, which deepens learning. Reshuffle pairs every 1-2 weeks so no clique forms and no student gets stuck with the same partner.",
      },
      {
        heading: "Handle disruption with respect",
        body: "When a student is disrupting (talking over others, on their phone during discussion, side conversations), address it privately first — a quiet word at break, not a public callout. If it continues, raise it directly: 'I notice you're checking out. What's going on?' Get curious before correcting.",
      },
      {
        heading: "Encourage quieter students without forcing them",
        body: "Don't cold-call quiet students in front of the group early. Instead, write down their names. In session two or three, find a moment privately: 'I'd love to hear what you thought about that scenario from last week.' Once they've spoken to you, they're more likely to speak to the group.",
      },
      {
        heading: "Manage students who finish fast",
        body: "Fast finishers can become bored or disruptive — or they can become peer leaders. Give them an explicit role: 'You finished early. Want to walk through this with [other student] who's still working?' Most fast finishers like being useful. Cap how often you ask this so they don't feel like unpaid TAs.",
      },
      {
        heading: "Notice the social system",
        body: "Who eats lunch together? Who avoids eye contact with whom? Who arrives early and who slips in late? The patterns matter. If a student is being subtly excluded, that affects their learning. If a student is over-relying on one peer for help, that's also a signal. Adjust pairings based on what you observe.",
      },
    ],
  },
  {
    id: "tech-issues",
    title: "Tech Issues",
    intro:
      "Technical problems will happen. Prepare for them so the program doesn't unravel when Wi-Fi fails or a login breaks.",
    bullets: [
      {
        heading: "Common login problems",
        body: "Most login failures are: wrong cohort code, password typo, or platform-side. Have the join code printed and visible on a wall. If passwords are the issue, the platform's reset flow handles it. If the platform is down, switch to discussion or worksheet mode and continue without it.",
      },
      {
        heading: "Have backup plans",
        body: "Print 2-3 worksheets ahead of time as a contingency. If the Wi-Fi or platform fails, you can pivot to the printable worksheet for that week's topic and still run a strong session. The worksheets are designed to stand alone if needed.",
      },
      {
        heading: "Devices and shared computers",
        body: "If students share devices, build in a 5-minute swap so each student has individual time. If shared accounts are a constraint (e.g., correctional ed sites with locked-down systems), use Worksheet 6 for capstone work instead of the in-app version — paper-based work travels.",
      },
      {
        heading: "Don't troubleshoot in front of the group",
        body: "When one student has a tech problem, don't make 11 other students watch you fix it. Get the rest started on something — read the discussion prompt, fill in the vocabulary journal, pair up. Then handle the technical issue.",
      },
      {
        heading: "When you don't know the answer",
        body: "Tech issues will exceed your expertise sometimes. That's fine. Say 'I don't know — let me figure it out by next session.' Then actually figure it out. Showing students that adults can not-know and follow up is more useful than pretending to know.",
      },
    ],
  },
];

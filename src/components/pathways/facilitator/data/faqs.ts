/**
 * FAQs for the facilitator resources page.
 *
 * Voice notes:
 * - Youth answers should sound like a real mentor, not corporate copy.
 *   Honest, direct, encouraging — never patronizing.
 * - Parent/guardian answers are calm and concrete. Assume the reader is
 *   skeptical of programs marketed to their child.
 * - Partner answers are tight and outcome-oriented. Assume the reader is
 *   accountable to a funder or board.
 *
 * The answers below have not been reviewed by counsel or by a partner
 * organization's leadership. They are facilitator-drafted starting points.
 * Sensitive answers (records, mental health, family situations) are worth
 * a human review before being printed at scale.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  key: "youth" | "parents" | "partners";
  label: string;
  description: string;
  items: FaqItem[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    key: "youth",
    label: "From Youth",
    description: "Real questions teenagers ask. Answers facilitators can use word-for-word, or adapt to their voice.",
    items: [
      {
        question: "Do I need to be good at math to work in cyber?",
        answer:
          "No. Most cybersecurity work doesn't use math past basic arithmetic. The skills that matter are paying attention to detail, being curious about how things break, and being patient enough to follow a trail of evidence. If you've ever spent two hours figuring out a glitch in a video game, you already have the temperament.",
      },
      {
        question: "I don't have a computer at home. Can I still do this?",
        answer:
          "Yes — and this is more common than you think. Many people in this field started without a personal computer. Public libraries have computers you can use for free. Some employers and bootcamps give out laptops. Cisco's NetAcad and TryHackMe's free tier run in your browser, so a borrowed device works fine. The lack of a home computer is a logistics problem, not a talent problem. Let your facilitator know — they can help you find access.",
      },
      {
        question: "I have a record. Will that stop me from getting a cyber job?",
        answer:
          "It depends on the role. Some federal government and defense contractor jobs require background clearances that a record can complicate. But most private-sector cybersecurity jobs — SOC analyst, penetration tester, engineer, GRC, forensics — do not require that. Many companies actively hire people with records, and some have explicit second-chance hiring policies. The honest truth is: your record will close some doors and not others. The pathway exists, and it's wider than you've been told. Talk to your facilitator about specific employers in your region.",
      },
      {
        question: "How much does it cost to get certified?",
        answer:
          "There are real free options. ISC2's Certified in Cybersecurity (CC) is free for the exam and the training. Cisco NetAcad courses are free. Microsoft and Google offer free fundamentals certs. The most well-known beginner cert — CompTIA Security+ — costs around $370 for the exam, and free study materials are easy to find. You can build a credentialed resume without spending money. The costs come later, when you want advanced certs — but by then you'll likely have a job paying for them.",
      },
      {
        question: "How long until I can actually get a job?",
        answer:
          "Realistic timeline: 6-12 months of consistent study from where you are now to an entry-level role. Six months if you can put in 10-15 hours a week and earn one or two beginner certs. Twelve months if life is busier. The biggest predictor isn't talent — it's whether you actually finish what you start. Most people who don't make it just stop. Most people who keep showing up do.",
      },
      {
        question: "I'm not good at school. Is this still for me?",
        answer:
          "Possibly more for you, honestly. School and cyber don't measure the same things. School rewards quick memorization, sitting still, and writing essays. Cyber rewards being curious about how things work, being patient enough to find the answer, and being unafraid of unfamiliar systems. A lot of strong cyber professionals struggled in school. Show up to this program. See if the work feels different.",
      },
      {
        question: "Will I have to go to college?",
        answer:
          "Not for most cyber jobs. Increasingly, employers care more about certs and demonstrated skill than degrees. Major employers like IBM, Apple, and Amazon have dropped degree requirements for many tech roles. That said, a college degree can open some doors and close others — it's a real choice, not a wrong one. The path that's right for you depends on your goals, money, and life situation. We can talk through it.",
      },
      {
        question: "What if I'm bad with computers?",
        answer:
          "Define 'bad.' If you can use a smartphone, you have more computer literacy than people give you credit for. Cyber doesn't require you to start as a power user — it teaches you the things you don't know. The only requirement is that you're willing to be a beginner without giving up. Lots of people in this field started exactly where you are.",
      },
      {
        question: "Can I work in cyber without showing my face or from home?",
        answer:
          "A lot of cyber work is fully remote. SOC analyst jobs, security engineering, GRC, threat intelligence — these all have remote roles. You'll typically need to show up on video for meetings, but you don't have to be on camera all day. Pen testing, incident response, and some leadership roles involve more visibility. If privacy is important to you, the SOC analyst path is the most camera-light entry point.",
      },
      {
        question: "Is this safer than IT support?",
        answer:
          "Different, not safer. IT support and cyber both deal with stress — broken systems, angry users, time pressure. Cyber adds the weight of high-stakes decisions (did we contain the breach in time?). Both pay better than most service jobs. Many cyber professionals started in IT help desk — it's a common stepping stone, and there's no shame in it.",
      },
      {
        question: "What does a normal day actually look like?",
        answer:
          "Depends on the role. A SOC analyst spends a lot of the day in a dashboard reviewing alerts, asking 'is this real or noise,' and writing tickets. A pen tester spends time in a virtual machine trying to break into a target system, then writing reports. An incident responder has long quiet stretches broken by intense crisis weeks. A GRC analyst reviews policies and runs audits. None of it looks like the movies. Most of it is patient detective work.",
      },
      {
        question: "Do I need to know how to code?",
        answer:
          "Helpful, not required for most entry roles. Light Python and a little bash will make you more effective and more hirable as you move up. But you can absolutely get into a SOC analyst, GRC, or forensics role without writing code. If you want to be a pen tester or security engineer, plan to pick up code along the way.",
      },
      {
        question: "Is the work boring?",
        answer:
          "Sometimes. Like every job. The boring parts are real — paperwork, repeated alerts, meetings. The interesting parts are also real — solving puzzles, catching attackers, making decisions that matter. If you only chase excitement, no field will satisfy you. If you can sit with the boring parts in exchange for moments that matter, cyber pays off.",
      },
      {
        question: "What if I want to switch careers later?",
        answer:
          "Cyber skills travel well. The mindset — risk assessment, attention to detail, writing clearly under pressure — works in law, business operations, project management, and policy. Many cyber professionals pivot into adjacent roles after 5-10 years. You're not locking yourself in by starting here.",
      },
      {
        question: "What's the worst part of working in cyber?",
        answer:
          "Honest answers: alert fatigue (a SOC analyst can review hundreds of alerts in a shift, most of which turn out to be nothing), being on-call (some roles require 24/7 availability rotations), and dealing with leadership that doesn't understand security. The work itself is usually engaging. The frustrating parts are about people and process, not technology.",
      },
      {
        question: "Will my family understand what I do?",
        answer:
          "Probably not at first. Most cyber professionals have to explain their job at every family gathering for the first few years. Get a short answer ready: 'I help companies stop cyber attacks.' That's enough for most people. Over time, when you bring home a real paycheck and a sense of identity, the understanding follows.",
      },
    ],
  },
  {
    key: "parents",
    label: "From Parents / Guardians",
    description: "Questions guardians ask before letting their teen enroll. Answer them with calm specificity.",
    items: [
      {
        question: "Is this a real job pathway or just an enrichment program?",
        answer:
          "It's both. Bright Boost Pathways is designed to be the first 6 weeks of a longer journey. Students who finish this program have a foundation in cybersecurity, a portfolio project, and exposure to Cisco's free continuing coursework. From there, with steady study, students can earn industry certifications (ISC2 Certified in Cybersecurity is free) and apply for entry-level SOC analyst roles. This is not the whole journey — it's the launchpad.",
      },
      {
        question: "What does my child actually walk away with?",
        answer:
          "A completed capstone project they can talk about, hands-on exposure to seven cyber topics, a Cisco NetAcad account already enrolled in coursework, a written security plan as a portfolio document, and — most importantly — the felt experience of being capable in this field. Many students come in believing this isn't for them. They leave knowing it is.",
      },
      {
        question: "Is the platform safe for my child to use?",
        answer:
          "Yes. The platform requires login, doesn't collect unnecessary personal information, doesn't show ads, and doesn't allow open chat between students or outsiders. Facilitators are the only adults with visibility into student progress. We can walk you through our data practices if you want details.",
      },
      {
        question: "What if my child isn't a 'tech person'?",
        answer:
          "Most students who finish this program didn't see themselves as 'tech people' at the start. The program is designed for that. The first module spends most of its time on the question 'who actually works in cyber?' — and the answer turns out to be more diverse than people expect. If your child can use a smartphone, follow instructions, and stick with something for a few weeks, they have everything they need.",
      },
      {
        question: "Do I need to know technology to support my child in this?",
        answer:
          "No. The most useful thing you can do is ask: 'What did you work on today?' and listen. You don't need to know the answer — you just need to ask the question. Your interest matters more than your expertise.",
      },
      {
        question: "How is this different from school?",
        answer:
          "School often teaches subjects in the abstract — math, history, science — without a clear connection to what comes next. This program is the opposite. Every session is about real work: how attackers operate, how defenders respond, what specific jobs exist, and how to get one. Students don't get tested for grades. They build a project. Pacing is adjustable for each student.",
      },
      {
        question: "How much time will my child spend on this?",
        answer:
          "Six weekly sessions of 60-90 minutes each, plus optional homework and Cisco coursework on the student's own time. We typically suggest 1-2 hours of optional time per week if the student wants to go deeper. The core program is contained in the weekly sessions.",
      },
      {
        question: "What if my child has a hard week and misses a session?",
        answer:
          "It's not a problem. The platform is self-paced, so missed material can be caught up. Facilitators check in with students who miss to figure out what's needed. Life happens, and the program is designed to bend without breaking.",
      },
      {
        question: "Will this help my child get into college or a job?",
        answer:
          "It can help with both. For college, students will have a portfolio project to discuss in applications. For a job, they leave with a Cisco NetAcad account and a clear path to industry certifications. The honest truth is that what comes next depends on what your child does after the program — but they'll have a real foundation to build on.",
      },
      {
        question: "Who teaches this program?",
        answer:
          "Trained facilitators from the partner organization hosting the cohort — typically educators, workforce-development staff, or program coordinators with experience working with young people. Facilitators don't need to be cybersecurity experts; the platform provides the content, and facilitators provide the support and structure. Many facilitators learn alongside the students.",
      },
      {
        question: "Is there a cost?",
        answer:
          "For most participants, no. Bright Boost Pathways is delivered through partnerships with community organizations, alternative schools, and reentry programs that fund the program through grants, sponsorships, or partner budgets. Check with the specific cohort sponsor about any costs.",
      },
    ],
  },
  {
    key: "partners",
    label: "From Partner Organizations",
    description: "Questions community partners and site leaders ask before signing on to host a cohort.",
    items: [
      {
        question: "How long does a cohort take?",
        answer:
          "Six weeks, with one 60-90 minute session per week. Cohorts can be compressed (e.g., two sessions per week for 3 weeks) or extended (every other week for 12 weeks) to fit your site's schedule. The core content remains the same.",
      },
      {
        question: "What do I need at my site to host this?",
        answer:
          "A room with reliable internet, devices for students (laptops, tablets, or shared computers — even one device per pair works), and a trained facilitator. We provide the platform, the curriculum, the facilitator guide, and onboarding support. Sites that can dedicate a consistent space and time tend to get the best results.",
      },
      {
        question: "How many students per facilitator works best?",
        answer:
          "8-12 students per facilitator is the sweet spot. Below 8, peer learning suffers. Above 12, individual attention becomes hard. Cohorts up to 16 can work with a strong facilitator. Above 20, plan for a co-facilitator.",
      },
      {
        question: "What outcomes can we report to funders?",
        answer:
          "Concrete outputs: completion rates per module, capstone artifacts produced, Cisco NetAcad accounts created and active, and facilitator-administered pre/post reflections. We can also support custom data collection for specific funder requirements — talk to us before the cohort starts so we can wire that in.",
      },
      {
        question: "Is there age flexibility?",
        answer:
          "The program is designed for ages 14-17, split into Explorer (14-15) and Launch (16-17) bands. We've successfully run cohorts with 18- and 19-year-olds in workforce settings, and 13-year-olds in advanced summer programs. We do not recommend mixing ages more than 3 years apart in the same cohort.",
      },
      {
        question: "Can we run this alongside other programming?",
        answer:
          "Yes — and often it works better that way. Cyber Launch pairs well with workforce-development programs, post-secondary readiness initiatives, alternative-education STEM tracks, and reentry support programs. We've seen the strongest outcomes when cyber is one of several supports a student is engaged with.",
      },
      {
        question: "What does success look like 30/60/90 days after a cohort?",
        answer:
          "30 days: students retain the language and frame of cybersecurity, and continue with at least one Cisco NetAcad module. 60 days: at least half the cohort has completed Cisco's Introduction to Cybersecurity. 90 days: students are pursuing certifications (ISC2 CC, CompTIA fundamentals), some are applying for entry roles, and the partner organization can identify 2-3 students to feature in success stories. Outcomes depend heavily on continued support from the partner site — the program plants, ongoing mentorship grows.",
      },
      {
        question: "How do you support justice-impacted youth specifically?",
        answer:
          "The curriculum and facilitator guides are written with the recognition that justice-impacted youth have been failed by abstract career programs. We frame cyber concretely — what jobs hire people with records, what credentials open which doors, what the realistic pathway looks like. Facilitator tips include trauma-informed practices, language to avoid, and how to handle the 'will my record stop me?' question honestly. We continue to refine these based on partner feedback.",
      },
      {
        question: "How do we report progress to our internal stakeholders?",
        answer:
          "The facilitator dashboard provides cohort-level progress views and exportable data. We're working on richer outcome dashboards for partner reporting — let us know what your reporting cycle looks like and we can help align.",
      },
      {
        question: "What if a student needs more support than we can offer?",
        answer:
          "The program is not a replacement for case management, counseling, or specialized educational support. If a student needs more than the program offers, facilitators are trained to refer back to the partner organization's support staff. We're a curriculum, not a wraparound — your existing support infrastructure remains primary.",
      },
      {
        question: "Can we customize the content for our population?",
        answer:
          "The core platform content is standardized, but facilitators have wide latitude in how they frame and supplement it. Examples, discussion questions, and worksheet activities can all be adapted. We're also open to co-developing partner-specific extensions — talk to us if you have a specific need.",
      },
    ],
  },
];

/**
 * Printable worksheets for the facilitator resources page.
 *
 * Each worksheet is rendered as a stand-alone print-friendly HTML document
 * opened in a new tab via window.open. The `@media print` block hides
 * facilitator-only sections so students get a clean printout when the
 * facilitator does Cmd/Ctrl+P. Facilitator notes remain visible on screen.
 *
 * Sensitive sections (Worksheet 5's incident response, Worksheet 7's
 * 12-month plan) are worth a review by partner staff before being printed
 * at scale — they touch on real money, real time, and real expectations.
 */

export interface Worksheet {
  id: string;
  number: number;
  title: string;
  description: string;
  duration: string;
  buildHtml: () => string;
}

const PRINT_STYLES = `
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1.5rem;
      color: #0f172a;
      line-height: 1.5;
    }
    h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
    h2 { font-size: 1.15rem; margin: 1.5rem 0 .5rem; border-bottom: 1px solid #cbd5e1; padding-bottom: .25rem; }
    h3 { font-size: 1rem; margin: 1rem 0 .35rem; }
    p, li { font-size: 0.95rem; }
    .meta { color: #64748b; font-size: .85rem; margin-bottom: 1rem; }
    .student-info {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;
      border: 1px solid #cbd5e1; padding: .75rem; border-radius: 6px;
      margin: 1rem 0 1.5rem;
    }
    .student-info div { font-size: .85rem; }
    .student-info span { display: block; color: #64748b; font-size: .75rem; margin-bottom: .25rem; }
    .student-info .line { border-bottom: 1px solid #94a3b8; height: 1.25rem; }
    .field { margin: .75rem 0; }
    .field-label { font-weight: 600; font-size: .9rem; margin-bottom: .25rem; }
    .write-lines {
      border-bottom: 1px solid #94a3b8;
      height: 1.5rem;
      margin: .35rem 0;
    }
    .scale {
      display: inline-flex; gap: .5rem; margin: .25rem 0;
    }
    .scale span {
      display: inline-block; width: 28px; height: 28px;
      border: 1px solid #94a3b8; border-radius: 4px;
      text-align: center; line-height: 28px; font-size: .85rem;
    }
    table {
      width: 100%; border-collapse: collapse; margin: .75rem 0;
      font-size: .9rem;
    }
    th, td {
      border: 1px solid #94a3b8; padding: .5rem; text-align: left;
      vertical-align: top;
    }
    th { background: #f1f5f9; font-weight: 600; }
    .scenario {
      background: #fef3c7; border-left: 4px solid #f59e0b;
      padding: .75rem 1rem; margin: 1rem 0; border-radius: 4px;
    }
    .scenario .label { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: #92400e; font-weight: 600; }
    .facilitator-note {
      background: #ecfeff; border: 1px dashed #0891b2;
      padding: .75rem 1rem; margin: 1rem 0; border-radius: 4px;
      font-size: .85rem; color: #155e75;
    }
    .facilitator-note .label { font-weight: 600; text-transform: uppercase; font-size: .75rem; letter-spacing: .05em; }
    .page-break { page-break-before: always; }
    @media print {
      body { margin: .5in; padding: 0; }
      .facilitator-note, .no-print { display: none !important; }
      h1 { margin-top: 0; }
    }
    .footer {
      margin-top: 2rem; padding-top: .75rem;
      border-top: 1px solid #cbd5e1; font-size: .75rem; color: #64748b;
    }
  </style>
`;

function studentInfoBlock() {
  return `
    <div class="student-info">
      <div><span>Name</span><div class="line"></div></div>
      <div><span>Date</span><div class="line"></div></div>
      <div><span>Cohort</span><div class="line"></div></div>
    </div>
  `;
}

function writeLines(n: number) {
  return Array(n).fill('<div class="write-lines"></div>').join("");
}

function scaleRow(label: string) {
  return `
    <tr>
      <td>${label}</td>
      <td>
        <div class="scale">
          <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
        </div>
      </td>
    </tr>
  `;
}

function shell(title: string, subtitle: string, body: string, facilitatorNotes?: string) {
  return `
    <!DOCTYPE html>
    <html><head>
      <meta charset="utf-8" />
      <title>${title} — Bright Boost Pathways</title>
      ${PRINT_STYLES}
    </head><body>
      <h1>${title}</h1>
      <p class="meta">${subtitle}</p>
      ${studentInfoBlock()}
      ${body}
      ${facilitatorNotes ? `<div class="facilitator-note"><div class="label">Facilitator Notes (hidden in print)</div>${facilitatorNotes}</div>` : ""}
      <div class="footer">Bright Boost Pathways — Cyber Launch Track. Worksheet content is for educational use within sponsored cohorts.</div>
    </body></html>
  `;
}

export const WORKSHEETS: Worksheet[] = [
  // 1. Career Interest Reflection
  {
    id: "career-interest",
    number: 1,
    title: "Career Interest Reflection",
    description: "Multi-part reflection on cyber roles, what appeals, life connections, 12-month plan, and support network.",
    duration: "25-30 min",
    buildHtml: () =>
      shell(
        "Career Interest Reflection",
        "Pair with Module 5: Cyber Career Map. Best completed in the same session.",
        `
          <h2>Part 1 — Rate Your Interest</h2>
          <p>Rate each role from 1 (no interest) to 5 (strong interest). Be honest — there are no wrong answers.</p>
          <table>
            <thead><tr><th style="width:55%">Role</th><th>Interest (1-5)</th></tr></thead>
            <tbody>
              ${scaleRow("Security Analyst — watches alerts, investigates threats")}
              ${scaleRow("Penetration Tester — legally hacks systems to find weaknesses")}
              ${scaleRow("Incident Responder — leads the team during a breach")}
              ${scaleRow("Security Engineer — designs and builds defenses")}
              ${scaleRow("GRC Analyst — governance, risk, and compliance work")}
              ${scaleRow("Digital Forensics — recovers evidence from devices")}
              ${scaleRow("Security Architect — designs the overall strategy")}
              ${scaleRow("CISO — leads the security program for a whole company")}
            </tbody>
          </table>

          <h2>Part 2 — Your Top Two</h2>
          <div class="field">
            <div class="field-label">My #1 role:</div>
            ${writeLines(1)}
            <div class="field-label">What specifically appeals to me about it?</div>
            ${writeLines(3)}
          </div>
          <div class="field">
            <div class="field-label">My #2 role:</div>
            ${writeLines(1)}
            <div class="field-label">What specifically appeals to me about it?</div>
            ${writeLines(3)}
          </div>

          <h2>Part 3 — Life Connections</h2>
          <div class="field">
            <div class="field-label">What experiences in my life so far connect to my top role? (Hobbies, jobs, school subjects, family work, anything.)</div>
            ${writeLines(4)}
          </div>

          <h2>Part 4 — 12-Month Plan</h2>
          <div class="field">
            <div class="field-label">What would I need to learn or do in the next 12 months to get closer to this role?</div>
            ${writeLines(5)}
          </div>

          <h2>Part 5 — My Support Network</h2>
          <div class="field">
            <div class="field-label">Who in my life could help me move toward this? (Family, friends, teachers, mentors, anyone.)</div>
            ${writeLines(3)}
          </div>

          <h2>Part 6 — Honest Obstacles</h2>
          <div class="field">
            <div class="field-label">What realistic obstacles do I see? (Money, time, transportation, access, support, anything.)</div>
            ${writeLines(4)}
          </div>

          <h2>Part 7 — One Conversation</h2>
          <div class="field">
            <div class="field-label">One person I will talk to about this in the next 7 days:</div>
            ${writeLines(1)}
            <div class="field-label">What I will ask them:</div>
            ${writeLines(2)}
          </div>
        `,
        `Watch for students who pick the highest-paid role without engagement. Push them to Part 2 specifics. Also watch for students who rate everything a 3 — usually means they're hedging. Encourage honest 1s and 5s.`,
      ),
  },

  // 2. Phishing Field Guide
  {
    id: "phishing-field-guide",
    number: 2,
    title: "Phishing Field Guide",
    description: "8 realistic phishing examples with annotation space. Includes facilitator-only answer key.",
    duration: "30-40 min",
    buildHtml: () =>
      shell(
        "Phishing Field Guide",
        "Annotate each example. Circle the red flags. Note what tipped you off.",
        `
          <p>For each example below, mark the red flags directly on the page. In the space provided, write what makes this message suspicious.</p>

          <h2>Example 1 — Bank "Urgent" Email</h2>
          <div class="scenario">
            <div class="label">From: BankOfAmerica-Security@bofa-alerts.co</div>
            <div style="margin-top:.5rem">Subject: URGENT — Your account will be suspended in 24 hours</div>
            <div style="margin-top:.5rem">Dear Customer, We have detected unusual activity on your account. To avoid suspension, please verify your identity within 24 hours by clicking the link below. <strong>[Click here to verify]</strong></div>
          </div>
          <div class="field-label">Red flags you spotted:</div>
          ${writeLines(3)}

          <h2>Example 2 — Package Delivery Text</h2>
          <div class="scenario">
            <div class="label">From: +1 (555) 213-8847</div>
            <div style="margin-top:.5rem">USPS: Your package #US7842XX cannot be delivered due to incomplete address. Update at: usps-track-pkg.info/verify</div>
          </div>
          <div class="field-label">Red flags you spotted:</div>
          ${writeLines(3)}

          <h2>Example 3 — Boss Asking a Favor (BEC)</h2>
          <div class="scenario">
            <div class="label">From: "Jordan Reyes, CEO" &lt;j.reyes-ceo@gmail.com&gt;</div>
            <div style="margin-top:.5rem">Subject: Quick favor</div>
            <div style="margin-top:.5rem">Hey — I'm in a meeting and can't talk. I need you to buy 5 Apple gift cards ($500 each) for a client appreciation thing. I'll reimburse you when I'm out. Send me the codes ASAP. Thanks.</div>
          </div>
          <div class="field-label">Red flags you spotted:</div>
          ${writeLines(3)}

          <h2>Example 4 — Fake Login Page</h2>
          <div class="scenario">
            <div class="label">URL bar: hxxps://accounts-google.security-update.com/signin</div>
            <div style="margin-top:.5rem">Looks like a Google login screen. "Sign in to continue to Gmail."</div>
          </div>
          <div class="field-label">Red flags you spotted:</div>
          ${writeLines(3)}

          <h2>Example 5 — IT Support Call</h2>
          <div class="scenario">
            <div class="label">Phone call</div>
            <div style="margin-top:.5rem">"Hi, this is Mike from IT. We're patching some servers tonight and I need to verify your computer is updated. Can you give me your username and password so I can log in remotely and check?"</div>
          </div>
          <div class="field-label">Red flags you spotted:</div>
          ${writeLines(3)}

          <h2>Example 6 — Attachment Bait</h2>
          <div class="scenario">
            <div class="label">From: HR@company-careers.org</div>
            <div style="margin-top:.5rem">Subject: Salary Adjustment — Action Required</div>
            <div style="margin-top:.5rem">Please review and sign the attached document by EOD. <strong>[Salary_Adjustment_2026.docx.exe]</strong></div>
          </div>
          <div class="field-label">Red flags you spotted:</div>
          ${writeLines(3)}

          <h2>Example 7 — Romance / Social Engineering DM</h2>
          <div class="scenario">
            <div class="label">Instagram DM, account created 2 weeks ago, 4 followers</div>
            <div style="margin-top:.5rem">"Hey, I saw your profile and you seem really sweet. I'm a model in California but I'm having trouble with my agency. Could you help me send a small payment through Cash App? I'll pay you back triple next week."</div>
          </div>
          <div class="field-label">Red flags you spotted:</div>
          ${writeLines(3)}

          <h2>Example 8 — Tech Support Scam</h2>
          <div class="scenario">
            <div class="label">Popup on a sketchy website</div>
            <div style="margin-top:.5rem">"WARNING! Your computer is infected with 3 viruses! Call Microsoft Support immediately at 1-800-FAKE-NUM to remove them before your data is destroyed."</div>
          </div>
          <div class="field-label">Red flags you spotted:</div>
          ${writeLines(3)}

          <div class="page-break"></div>
          <h2>Answer Key — Facilitator Only</h2>
          <div class="facilitator-note">
            <div class="label">Print this page separately for facilitator use only.</div>
            <ol>
              <li><strong>Bank email:</strong> domain is bofa-alerts.co (not real BofA), urgency manufactured, generic "Dear Customer," link not the real bank URL.</li>
              <li><strong>Package text:</strong> USPS doesn't text from personal phone numbers, URL is .info, package number doesn't match USPS format.</li>
              <li><strong>BEC:</strong> CEO email is gmail.com (not company domain), urgency, gift cards are a universal scam payment method, "I'll reimburse you."</li>
              <li><strong>Fake login:</strong> URL is security-update.com with accounts-google as a subdomain (not google.com), HTTPS with weird subdomain pattern.</li>
              <li><strong>IT call:</strong> Real IT never asks for passwords. Real IT uses ticketing systems and identifies themselves through known channels.</li>
              <li><strong>Attachment:</strong> File is .docx.exe (executable hidden as document), unfamiliar sender domain, urgency.</li>
              <li><strong>Romance DM:</strong> New account, few followers, immediate request for money, "I'll pay you back triple" — classic advance fee.</li>
              <li><strong>Tech support:</strong> Microsoft never displays phone numbers in popups. No legitimate antivirus warning comes through web browser popups.</li>
            </ol>
          </div>
        `,
        `Common student reaction: "I would have fallen for at least three of these." Normalize this. Phishing works on IT professionals. The point isn't shame — it's pattern recognition.`,
      ),
  },

  // 3. Password & Account Audit
  {
    id: "password-audit",
    number: 3,
    title: "Password & Account Audit",
    description: "Audit your top 5 accounts. Check password uniqueness, MFA, and recovery email. Build an action plan.",
    duration: "20-30 min",
    buildHtml: () =>
      shell(
        "Password & Account Audit",
        "Pair with Module 2: Digital Safety Sim. Goal: every student leaves with at least one account secured.",
        `
          <h2>Step 1 — List Your 5 Most Important Accounts</h2>
          <p>The accounts that, if someone broke into them, would cause you the most damage. Email, banking, social, school, anything you'd be devastated to lose.</p>
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Unique password?</th>
                <th>MFA on?</th>
                <th>Recovery email current?</th>
              </tr>
            </thead>
            <tbody>
              ${Array(5)
                .fill(0)
                .map(
                  () => `
                <tr>
                  <td><div class="write-lines"></div></td>
                  <td>☐ Yes  ☐ No</td>
                  <td>☐ Yes  ☐ No</td>
                  <td>☐ Yes  ☐ No</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <h2>Step 2 — This Week's Action Plan</h2>
          <div class="field">
            <div class="field-label">One account I will fix this week:</div>
            ${writeLines(1)}
            <div class="field-label">What I will do (enable MFA / change password / update recovery email):</div>
            ${writeLines(2)}
          </div>

          <h2>Step 3 — Where to Get the Tools</h2>
          <h3>Free password managers</h3>
          <ul>
            <li><strong>Bitwarden</strong> — free, open source, works on all devices. Recommended starting point.</li>
            <li><strong>1Password Families</strong> — free for some students through school programs.</li>
            <li><strong>Built-in</strong> — iCloud Keychain (Apple) or Google Password Manager work for many people.</li>
          </ul>
          <h3>How to enable MFA on major platforms</h3>
          <ul>
            <li><strong>Gmail / Google:</strong> myaccount.google.com → Security → 2-Step Verification</li>
            <li><strong>Apple ID:</strong> Settings → [your name] → Sign-In & Security → Two-Factor Authentication</li>
            <li><strong>Instagram / Facebook:</strong> Settings → Accounts Center → Password and Security → Two-Factor Authentication</li>
            <li><strong>Banking:</strong> Look in account settings or call the bank directly</li>
          </ul>

          <h2>Step 4 — One Person to Help</h2>
          <div class="field">
            <div class="field-label">Who in my life would benefit if I helped them audit their accounts? When will I do it?</div>
            ${writeLines(3)}
          </div>
        `,
        `Best done in-session, not as homework. Inertia is the enemy — students who walk out without enabling at least one MFA setting usually don't come back to it.`,
      ),
  },

  // 4. Network Map Activity
  {
    id: "network-map",
    number: 4,
    title: "Network Map Activity",
    description: "Draw your home network. Identify devices. Spot the riskiest one. Plan what you'd change.",
    duration: "20-25 min",
    buildHtml: () =>
      shell(
        "Network Map Activity",
        "Pair with Module 3: Network Basics. Concrete application — draw your real network.",
        `
          <h2>Step 1 — Draw Your Home Network</h2>
          <p>In the space below, draw a simple map of your home Wi-Fi. Include:</p>
          <ul>
            <li>The router (the box from your internet provider)</li>
            <li>Every device connected: phones, laptops, tablets, smart TV, game consoles, smart speakers, security cameras, smart bulbs, doorbells</li>
            <li>Anyone who shares the network with you</li>
          </ul>
          <div style="border:1px dashed #94a3b8; height: 280px; margin: 1rem 0; border-radius: 6px;"></div>

          <h2>Step 2 — Who Can Access What?</h2>
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Who can use it?</th>
                <th>Has a password?</th>
              </tr>
            </thead>
            <tbody>
              ${Array(6)
                .fill(0)
                .map(
                  () => `
                <tr>
                  <td><div class="write-lines"></div></td>
                  <td><div class="write-lines"></div></td>
                  <td>☐ Yes  ☐ No  ☐ Unknown</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <h2>Step 3 — Spot the Riskiest Device</h2>
          <p>Which device on your network worries you most? Why? (Old laptop? Smart TV that hasn't been updated? Visitor's phone? Guest Wi-Fi shared with neighbors?)</p>
          ${writeLines(4)}

          <h2>Step 4 — What Would You Change?</h2>
          <div class="field">
            <div class="field-label">Change #1 (easy / free):</div>
            ${writeLines(2)}
            <div class="field-label">Change #2 (takes a little time):</div>
            ${writeLines(2)}
            <div class="field-label">Change #3 (longer-term):</div>
            ${writeLines(2)}
          </div>

          <h2>Common Findings</h2>
          <ul>
            <li>Default router password never changed</li>
            <li>Old smart TV, doorbell, or camera no longer getting updates</li>
            <li>Guest Wi-Fi never set up — visitors on the main network</li>
            <li>Router firmware not updated in years</li>
            <li>Shared streaming/gaming accounts with weak passwords</li>
          </ul>
        `,
        `Students often realize how many internet-connected devices they have. The smart TV they got 5 years ago is usually the standout risk. If a student doesn't have a home network (e.g., relies on public Wi-Fi), have them map a friend or family member's network instead.`,
      ),
  },

  // 5. Incident Response Tabletop
  {
    id: "incident-response",
    number: 5,
    title: "Incident Response Tabletop",
    description: "A realistic breach scenario. Walk through first hour, first day, first week using real IR structure.",
    duration: "40-50 min",
    buildHtml: () =>
      shell(
        "Incident Response Tabletop",
        "Pair with Module 4: Threat Detective. Best run as a group exercise after individual reflection.",
        `
          <div class="scenario">
            <div class="label">Scenario</div>
            <p style="margin:.5rem 0 0">You work at a local nonprofit that serves 1,200 community members. The Executive Director just walked into your office, visibly shaken. She says: "I think I just clicked on a phishing email and entered our donor database password. The site looked exactly like our donor tool but the URL was weird. I'm so sorry — what do we do?"</p>
            <p style="margin:.5rem 0 0">It is 10:15 AM on a Tuesday. The nonprofit has 8 staff and a board of 12. Your IT support is a part-time contractor who is unreachable today.</p>
          </div>

          <h2>Part 1 — The First Hour</h2>
          <p>What do you do in the first 60 minutes? Use the IR framework: <strong>Identify, Contain, Eradicate, Recover, Lessons Learned.</strong> Start with Identify and Contain.</p>
          <div class="field">
            <div class="field-label">Identify — what do you need to know?</div>
            ${writeLines(4)}
          </div>
          <div class="field">
            <div class="field-label">Contain — what action stops the bleeding right now?</div>
            ${writeLines(4)}
          </div>

          <h2>Part 2 — The First Day</h2>
          <div class="field">
            <div class="field-label">Who needs to be told today? In what order?</div>
            ${writeLines(4)}
          </div>
          <div class="field">
            <div class="field-label">What technical actions need to happen today?</div>
            ${writeLines(4)}
          </div>
          <div class="field">
            <div class="field-label">What do you document?</div>
            ${writeLines(3)}
          </div>

          <h2>Part 3 — The First Week</h2>
          <div class="field">
            <div class="field-label">Eradicate — how do you make sure the attacker is fully out?</div>
            ${writeLines(3)}
          </div>
          <div class="field">
            <div class="field-label">Recover — how do you get back to normal operations? What's the order?</div>
            ${writeLines(4)}
          </div>
          <div class="field">
            <div class="field-label">Communication — what do donors need to hear? When?</div>
            ${writeLines(3)}
          </div>

          <h2>Part 4 — Lessons Learned</h2>
          <div class="field">
            <div class="field-label">What's the #1 thing the nonprofit should change so this doesn't happen again?</div>
            ${writeLines(3)}
          </div>
          <div class="field">
            <div class="field-label">What does the after-action report look like? Who reads it?</div>
            ${writeLines(3)}
          </div>

          <h2>Discussion Questions for the Group</h2>
          <ul>
            <li>Who in your response plan needs the most empathy? The Executive Director who clicked? The donors? The staff?</li>
            <li>What would change if the breach involved children's data instead of donor data?</li>
            <li>If your part-time IT contractor was unreachable, who's the backup? What if there is no backup?</li>
            <li>The Executive Director feels terrible. How do you keep her in the response without paralyzing her?</li>
            <li>What's the difference between blaming a user and fixing a system?</li>
          </ul>
        `,
        `Don't let students rush past the Identify step. The instinct is to "fix it" before knowing what's broken. Press them: "What do you actually know right now? Versus what are you assuming?" Real IR is about disciplined sequencing.`,
      ),
  },

  // 6. Capstone Planning Doc
  {
    id: "capstone-planning",
    number: 6,
    title: "Capstone Planning Doc",
    description: "Deeper than the in-app capstone. Pick a real local business, plan stakeholder interview, build risk matrix.",
    duration: "60-90 min",
    buildHtml: () =>
      shell(
        "Capstone Planning Doc",
        "Pair with Module 7: My Security Plan. Use this for portfolio-quality work students can show in interviews.",
        `
          <h2>Step 1 — Pick a Real Business</h2>
          <p>Choose a small business in your neighborhood (5-30 employees). Not a chain, not a franchise — a real local place. A barbershop, dental office, food truck, tutoring center, auto shop, day care, restaurant.</p>
          <div class="field">
            <div class="field-label">Business name and type:</div>
            ${writeLines(2)}
            <div class="field-label">Why did I pick this one?</div>
            ${writeLines(3)}
          </div>

          <h2>Step 2 — Stakeholder Interview Prep</h2>
          <p>If you could ask the owner three questions to understand their security needs, what would they be?</p>
          <div class="field">
            <div class="field-label">Question 1 (about their operations):</div>
            ${writeLines(2)}
            <div class="field-label">Question 2 (about their concerns):</div>
            ${writeLines(2)}
            <div class="field-label">Question 3 (about their constraints):</div>
            ${writeLines(2)}
          </div>

          <h2>Step 3 — Risk Matrix</h2>
          <p>List the top 5 risks. Rate each on Likelihood (how probable) and Impact (how damaging). Prioritize the high-likelihood, high-impact ones.</p>
          <table>
            <thead>
              <tr>
                <th>Risk</th>
                <th>Likelihood (1-5)</th>
                <th>Impact (1-5)</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              ${Array(5)
                .fill(0)
                .map(
                  () => `
                <tr>
                  <td><div class="write-lines"></div></td>
                  <td><div class="write-lines"></div></td>
                  <td><div class="write-lines"></div></td>
                  <td>☐ High  ☐ Med  ☐ Low</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <h2>Step 4 — Budget Reality</h2>
          <p>Sort your recommendations into three columns. Be honest about cost.</p>
          <table>
            <thead>
              <tr><th>Free / Almost Free</th><th>Under $500</th><th>$500+ or ongoing</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>${writeLines(5)}</td>
                <td>${writeLines(5)}</td>
                <td>${writeLines(5)}</td>
              </tr>
            </tbody>
          </table>

          <h2>Step 5 — Executive Summary Draft</h2>
          <p>Use these sentence starters:</p>
          <div class="field">
            <div class="field-label">"This assessment focuses on [BUSINESS NAME], a [TYPE OF BUSINESS] with approximately [#] employees and [DESCRIBE OPERATIONS]."</div>
            ${writeLines(3)}
          </div>
          <div class="field">
            <div class="field-label">"The three highest priority risks identified are:"</div>
            ${writeLines(4)}
          </div>
          <div class="field">
            <div class="field-label">"My recommended quick wins, which can be implemented this month at little or no cost, are:"</div>
            ${writeLines(4)}
          </div>
          <div class="field">
            <div class="field-label">"If [BUSINESS NAME] can only do one thing in the next 30 days, it should be:"</div>
            ${writeLines(3)}
          </div>

          <h2>Step 6 — Presentation Prep</h2>
          <p>You will present this in 3-5 minutes. Plan your structure.</p>
          <ol>
            <li><strong>Hook</strong> (30 seconds) — Why should the business owner care? What's at stake?</li>
            <li><strong>Findings</strong> (90 seconds) — Top 3 risks, in plain language.</li>
            <li><strong>Recommendations</strong> (90 seconds) — What to do, in what order, what it costs.</li>
            <li><strong>Close</strong> (30 seconds) — One sentence on what success looks like in 30 days.</li>
          </ol>
          <div class="field-label">Notes for my presentation:</div>
          ${writeLines(8)}
        `,
        `When a student picks a business they have a personal connection to (family member's shop, place they worked), the work gets noticeably better. Encourage real-world picks. If they can actually talk to the owner, even better — that's bonus material.`,
      ),
  },

  // 7. Career Pathway Roadmap
  {
    id: "career-roadmap",
    number: 7,
    title: "Career Pathway Roadmap",
    description: "12-month plan with quarterly milestones, certifications, portfolio projects, and a support network map.",
    duration: "30-45 min",
    buildHtml: () =>
      shell(
        "Career Pathway Roadmap",
        "Best used at the end of the program. Pair with Worksheet 1 — refer back to the top role chosen there.",
        `
          <div class="field">
            <div class="field-label">My target role:</div>
            ${writeLines(1)}
            <div class="field-label">Why this role:</div>
            ${writeLines(2)}
          </div>

          <h2>Quarter 1 — Months 1-3: Skills to Build</h2>
          <p>What concrete skills will you build in the first three months?</p>
          <div class="field">
            <div class="field-label">Top 3 skills:</div>
            ${writeLines(4)}
            <div class="field-label">Where I will learn them (Cisco NetAcad, TryHackMe, YouTube channels, library books, etc.):</div>
            ${writeLines(3)}
            <div class="field-label">Hours per week I will commit:</div>
            ${writeLines(1)}
          </div>
          <div class="field">
            <div class="field-label">End-of-quarter checkpoint — how will I know I'm on track?</div>
            ${writeLines(2)}
          </div>

          <h2>Quarter 2 — Months 4-6: Certifications to Attempt</h2>
          <div class="field">
            <div class="field-label">Certification target:</div>
            ${writeLines(1)}
            <div class="field-label">Why this cert opens the door I want:</div>
            ${writeLines(2)}
            <div class="field-label">Cost (and how I will pay for it):</div>
            ${writeLines(2)}
            <div class="field-label">End-of-quarter checkpoint:</div>
            ${writeLines(2)}
          </div>

          <h2>Quarter 3 — Months 7-9: Portfolio Projects</h2>
          <p>Real work you can show in an interview.</p>
          <div class="field">
            <div class="field-label">Project 1 (e.g., expanded version of your capstone):</div>
            ${writeLines(3)}
            <div class="field-label">Project 2 (e.g., a home lab walkthrough, a CTF write-up, an internship task):</div>
            ${writeLines(3)}
            <div class="field-label">Where will I host them? (GitHub, LinkedIn, personal site, partner org portfolio):</div>
            ${writeLines(2)}
          </div>

          <h2>Quarter 4 — Months 10-12: Job Applications or Next Step</h2>
          <div class="field">
            <div class="field-label">My next step (entry-level role, apprenticeship, advanced program, college, etc.):</div>
            ${writeLines(2)}
            <div class="field-label">5 specific employers or programs I will apply to:</div>
            ${writeLines(5)}
            <div class="field-label">Who will help me with my resume and interview prep?</div>
            ${writeLines(2)}
          </div>

          <h2>My Support Network Map</h2>
          <p>List the people who can help you. Be specific — names, not roles.</p>
          <table>
            <thead>
              <tr><th>Role they play</th><th>Name</th><th>What I need from them</th></tr>
            </thead>
            <tbody>
              <tr><td>Mentor (someone in the field)</td><td>${writeLines(1)}</td><td>${writeLines(1)}</td></tr>
              <tr><td>Accountability partner (checks in on me)</td><td>${writeLines(1)}</td><td>${writeLines(1)}</td></tr>
              <tr><td>Resume/interview helper</td><td>${writeLines(1)}</td><td>${writeLines(1)}</td></tr>
              <tr><td>Emotional support (rough weeks)</td><td>${writeLines(1)}</td><td>${writeLines(1)}</td></tr>
              <tr><td>Resource connector (financial aid, transit, etc.)</td><td>${writeLines(1)}</td><td>${writeLines(1)}</td></tr>
            </tbody>
          </table>

          <h2>Honest Self-Check</h2>
          <div class="field">
            <div class="field-label">What's most likely to derail me?</div>
            ${writeLines(3)}
            <div class="field-label">What's my plan if that happens?</div>
            ${writeLines(3)}
          </div>
        `,
        `Roadmaps are aspirational documents. Don't let students treat them as binding contracts. The point is the practice of planning — they will revise this many times. What matters is that they finish a version they believe in.`,
      ),
  },

  // 8. Cybersecurity Vocabulary Journal
  {
    id: "vocab-journal",
    number: 8,
    title: "Cybersecurity Vocabulary Journal",
    description: "Running glossary students fill in throughout the program. Term, definition, where they saw it, real-life example.",
    duration: "Ongoing across all sessions",
    buildHtml: () =>
      shell(
        "Cybersecurity Vocabulary Journal",
        "Fill in as you encounter new terms across the program. Aim for 20+ entries by week 6.",
        `
          <p>For each new term you encounter, write it down with a definition in your own words, where you first saw it, and a real-life example. The journal is yours — keep it simple and useful.</p>

          <table>
            <thead>
              <tr>
                <th style="width:20%">Term</th>
                <th style="width:30%">My definition (in my own words)</th>
                <th style="width:20%">Where I saw it</th>
                <th style="width:30%">Real-life example</th>
              </tr>
            </thead>
            <tbody>
              ${Array(15)
                .fill(0)
                .map(
                  () => `
                <tr>
                  <td><div class="write-lines"></div><div class="write-lines"></div></td>
                  <td><div class="write-lines"></div><div class="write-lines"></div></td>
                  <td><div class="write-lines"></div><div class="write-lines"></div></td>
                  <td><div class="write-lines"></div><div class="write-lines"></div></td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="page-break"></div>
          <h2>Starter Terms (in case you get stuck)</h2>
          <p>These are common cybersecurity terms you'll likely encounter. Add the ones that matter most to you, and your own definitions:</p>
          <ul style="columns: 2; gap: 1.5rem;">
            <li>Phishing</li>
            <li>MFA / 2FA</li>
            <li>Social Engineering</li>
            <li>Password Manager</li>
            <li>Packet</li>
            <li>IP Address</li>
            <li>DNS</li>
            <li>HTTPS</li>
            <li>Firewall</li>
            <li>VPN</li>
            <li>Brute Force</li>
            <li>Ransomware</li>
            <li>Malware</li>
            <li>SIEM</li>
            <li>SOC</li>
            <li>Pen Test</li>
            <li>CVE</li>
            <li>Patch</li>
            <li>Zero-Day</li>
            <li>Incident Response</li>
            <li>Risk</li>
            <li>Control</li>
            <li>Compliance</li>
            <li>Cert (Certification)</li>
          </ul>
        `,
        `The journal is most valuable when students return to it. At the start of each session, have them flip through and read 3 entries aloud. Repetition + retrieval = retention.`,
      ),
  },
];

export function openWorksheetPrint(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  // Give the browser a moment to render before opening print dialog
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch {
      // Some browsers block auto-print; user can manually print.
    }
  }, 250);
}

/**
 * Pathway track definitions — secondary-age (14-17) program layer.
 */

export interface PathwayModule {
  slug: string;
  name: string;
  description: string;
  type: "lesson" | "activity" | "project" | "assessment" | "external";
  duration: string;
  status: "active" | "coming_soon";
  externalUrl?: string;
}

export interface PathwayTrack {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  bands: ("explorer" | "launch")[];
  status: "active" | "coming_soon";
  modules: PathwayModule[];
}

export const PATHWAY_TRACKS: PathwayTrack[] = [
  {
    slug: "cyber-launch",
    name: "Cyber Launch",
    tagline: "Your entry point to cybersecurity careers",
    description: "Digital safety, networking basics, career awareness, and certification prep. Start with free Cisco coursework and build toward ISC2 CC eligibility.",
    icon: "Shield",
    color: "#06B6D4",
    bands: ["launch", "explorer"],
    status: "active",
    modules: [
      { slug: "cyber-foundations", name: "Cyber Foundations", description: "What is cybersecurity? Why does it matter? Who works in this field?", type: "lesson", duration: "30 min", status: "active" },
      { slug: "digital-safety-sim", name: "Digital Safety Sim", description: "Interactive simulation: spot phishing, protect passwords, secure a network.", type: "activity", duration: "25 min", status: "active" },
      { slug: "network-basics", name: "Network Basics", description: "How the internet works: packets, protocols, and pathways.", type: "lesson", duration: "30 min", status: "active" },
      { slug: "threat-detective", name: "Threat Detective", description: "Analyze logs, find the breach, write an incident report.", type: "activity", duration: "35 min", status: "active" },
      { slug: "career-map", name: "Cyber Career Map", description: "Explore cybersecurity roles, salaries, and pathways.", type: "activity", duration: "20 min", status: "active" },
      { slug: "cisco-netacad-link", name: "Cisco Networking Academy", description: "Free external coursework to deepen your networking and security skills.", type: "external", duration: "Self-paced", status: "active", externalUrl: "https://www.cisco.com/site/us/en/learn/training-certifications/training/netacad/index.html" },
      { slug: "capstone-security-plan", name: "Capstone: My Security Plan", description: "Create a security assessment for a real scenario. Present your findings.", type: "project", duration: "45 min", status: "active" },
    ],
  },
  {
    slug: "build-your-own-lane",
    name: "Build Your Own Lane",
    tagline: "Ownership, entrepreneurship, and opportunity",
    description: "Opportunity mapping, customer thinking, value propositions, and pitching your own venture.",
    icon: "Rocket",
    color: "#F59E0B",
    bands: ["explorer", "launch"],
    status: "coming_soon",
    modules: [
      { slug: "opportunity-scan", name: "Opportunity Scan", description: "Find problems worth solving in your community.", type: "activity", duration: "30 min", status: "coming_soon" },
      { slug: "customer-thinking", name: "Customer Thinking", description: "Who needs what you are building?", type: "lesson", duration: "25 min", status: "coming_soon" },
      { slug: "value-proposition", name: "Value Proposition", description: "What makes your idea worth paying for?", type: "lesson", duration: "25 min", status: "coming_soon" },
      { slug: "pitch-builder", name: "Pitch Builder", description: "Build and rehearse a 60-second pitch.", type: "project", duration: "40 min", status: "coming_soon" },
      { slug: "money-math", name: "Money Math for Ventures", description: "Pricing, margins, and break-even — simplified.", type: "activity", duration: "30 min", status: "coming_soon" },
    ],
  },
  {
    slug: "money-moves",
    name: "Money Moves",
    tagline: "Budgets, banking, credit, and economic power",
    description: "Budgeting, banking, credit, pricing, taxes, and economic mobility framing.",
    icon: "DollarSign",
    color: "#10B981",
    bands: ["explorer", "launch"],
    status: "coming_soon",
    modules: [
      { slug: "budget-basics", name: "Budget Basics", description: "Where does your money go? Build your first budget.", type: "activity", duration: "25 min", status: "coming_soon" },
      { slug: "banking-decoded", name: "Banking Decoded", description: "Accounts, fees, and how to make the system work for you.", type: "lesson", duration: "20 min", status: "coming_soon" },
      { slug: "credit-score-sim", name: "Credit Score Sim", description: "Watch your score rise and fall based on choices.", type: "activity", duration: "30 min", status: "coming_soon" },
      { slug: "taxes-101", name: "Taxes 101", description: "W-2s, deductions, and filing — no jargon.", type: "lesson", duration: "25 min", status: "coming_soon" },
      { slug: "economic-mobility-map", name: "My Economic Map", description: "Where are you now? Where do you want to be?", type: "project", duration: "35 min", status: "coming_soon" },
    ],
  },
  {
    slug: "future-tech-lab",
    name: "Future Tech Lab",
    tagline: "AI, data, and digital problem-solving",
    description: "AI literacy, digital problem-solving, basic coding and data challenges, and STEM pathway exposure.",
    icon: "Cpu",
    color: "#8B5CF6",
    bands: ["explorer", "launch"],
    status: "coming_soon",
    modules: [
      { slug: "ai-around-you", name: "AI Around You", description: "Where is AI in your daily life?", type: "lesson", duration: "20 min", status: "coming_soon" },
      { slug: "data-detective", name: "Data Detective", description: "Collect, clean, and make sense of real data.", type: "activity", duration: "35 min", status: "coming_soon" },
      { slug: "code-challenge", name: "Code Challenge", description: "Solve real problems with simple code.", type: "activity", duration: "40 min", status: "coming_soon" },
      { slug: "design-thinking", name: "Design Thinking Sprint", description: "From problem to prototype in one session.", type: "project", duration: "45 min", status: "coming_soon" },
    ],
  },
  {
    slug: "creative-media-lab",
    name: "Creative Media Lab",
    tagline: "Tell your story. Build your platform.",
    description: "Digital storytelling, media production, audio/video concepts, and project-based expression.",
    icon: "Film",
    color: "#EC4899",
    bands: ["explorer"],
    status: "coming_soon",
    modules: [
      { slug: "story-structure", name: "Story Structure", description: "Every great story follows a shape. Learn the shapes.", type: "lesson", duration: "20 min", status: "coming_soon" },
      { slug: "visual-storytelling", name: "Visual Storytelling", description: "Storyboard a 60-second short.", type: "activity", duration: "30 min", status: "coming_soon" },
      { slug: "audio-lab", name: "Audio Lab", description: "Record, edit, and publish a podcast clip.", type: "activity", duration: "35 min", status: "coming_soon" },
      { slug: "media-capstone", name: "Media Capstone", description: "Produce and present your project.", type: "project", duration: "45 min", status: "coming_soon" },
    ],
  },
];

export function getTrackBySlug(slug: string): PathwayTrack | undefined {
  return PATHWAY_TRACKS.find((t) => t.slug === slug);
}

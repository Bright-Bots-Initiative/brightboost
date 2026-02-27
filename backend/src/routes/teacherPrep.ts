import { Router } from "express";
import type { Request, Response } from "express";
import prisma from "../utils/prisma";
import { requireRole } from "../utils/auth";

const router = Router();

// ── Module prep content (static data per module) ────────────────────────────

const MODULE_PREP_DATA: Record<
  string,
  {
    objectives: string[];
    vocabulary: { term: string; definition: string }[];
    prerequisites: string[];
    estimatedMinutes: number;
    misconceptions: string[];
    discussionBefore: string[];
    discussionAfter: string[];
    turnAndTalk: string[];
    materials: string[];
    pacingGuide: { label: string; minutes: number }[];
  }
> = {
  "k2-stem-sequencing": {
    objectives: [
      "Students will understand that instructions must be followed in order (sequencing).",
      "Students will identify when steps are out of order and correct a sequence.",
      "Students will connect sequencing to everyday routines like getting dressed or baking.",
    ],
    vocabulary: [
      { term: "Sequence", definition: "The order in which things happen, one after another." },
      { term: "Algorithm", definition: "A set of step-by-step instructions to solve a problem." },
      { term: "Debug", definition: "To find and fix a mistake in instructions." },
      { term: "Step", definition: "One single action in a sequence of instructions." },
    ],
    prerequisites: [
      "Ability to follow simple 2-3 step verbal instructions.",
      "Understanding of first, next, and last.",
      "Familiarity with everyday routines (morning routine, cooking, etc.).",
    ],
    estimatedMinutes: 45,
    misconceptions: [
      "Students may think any order works as long as all steps are included.",
      "Students may confuse 'steps' with 'choices' — emphasize that order matters.",
      "Some students believe computers can figure out the right order on their own.",
    ],
    discussionBefore: [
      "What do you do every morning to get ready for school? What happens if you put on your shoes before your socks?",
      "If you were making a peanut butter sandwich, what would happen if you spread the peanut butter before opening the jar?",
      "Can you think of a time when doing things in the wrong order caused a silly mistake?",
    ],
    discussionAfter: [
      "What happened when Boost's steps were out of order? How did you help fix them?",
      "Why is it important for robots (and computers) to have steps in the right order?",
      "Can you think of something at home where the order of steps really matters?",
    ],
    turnAndTalk: [
      "Tell your partner about your morning routine. What is the FIRST thing you do?",
      "If a robot wanted to brush its teeth, what steps would it need? Tell your partner.",
    ],
    materials: [
      "Tablets or computers with internet access (one per student or pair)",
      "Optional: printed sequence cards for unplugged warm-up activity",
      "Optional: sticky notes for students to write their own sequence steps",
    ],
    pacingGuide: [
      { label: "Warm-up discussion (use Before questions)", minutes: 5 },
      { label: "Teacher intro: What is a sequence?", minutes: 5 },
      { label: "Students on BrightBoost platform", minutes: 20 },
      { label: "Group debrief (use After questions)", minutes: 10 },
      { label: "Exit ticket: Draw 3 steps in order", minutes: 5 },
    ],
  },
  "k2-stem-rhyme-ride": {
    objectives: [
      "Students will identify words that rhyme (have the same ending sound).",
      "Students will practice phonemic awareness by matching rhyming word pairs.",
      "Students will connect rhyming to reading fluency and word patterns.",
    ],
    vocabulary: [
      { term: "Rhyme", definition: "Words that have the same ending sound, like cat and hat." },
      { term: "Sound", definition: "What we hear when we say a word out loud." },
      { term: "Pattern", definition: "Something that repeats in a regular way." },
      { term: "Word family", definition: "A group of words that end with the same letters and sound." },
    ],
    prerequisites: [
      "Ability to hear and identify individual sounds in words.",
      "Familiarity with common CVC (consonant-vowel-consonant) words.",
      "Basic understanding of beginning and ending sounds.",
    ],
    estimatedMinutes: 45,
    misconceptions: [
      "Students may confuse words that start with the same sound with words that rhyme.",
      "Students might think words must be spelled similarly to rhyme (e.g., 'blue' and 'shoe').",
      "Some students may focus on meaning rather than sound when looking for rhymes.",
    ],
    discussionBefore: [
      "Can you think of two words that sound alike at the end? Like 'cat' and 'hat'?",
      "Why do you think songs and poems use rhyming words?",
      "If I say 'sun,' can you think of a word that rhymes with it?",
    ],
    discussionAfter: [
      "What rhyming pairs do you remember from the game? Which were tricky?",
      "How does knowing rhyming words help you when you read a new book?",
      "Can you make up a silly sentence using two rhyming words?",
    ],
    turnAndTalk: [
      "Say a word to your partner. Can they think of a word that rhymes?",
      "Think of your favorite animal. Can you and your partner find a word that rhymes with it?",
    ],
    materials: [
      "Tablets or computers with internet access (one per student or pair)",
      "Optional: rhyming word cards for unplugged warm-up activity",
      "Optional: chart paper for class rhyming word wall",
    ],
    pacingGuide: [
      { label: "Warm-up: Rhyming word clap game", minutes: 5 },
      { label: "Teacher intro: What makes words rhyme?", minutes: 5 },
      { label: "Students on BrightBoost platform", minutes: 20 },
      { label: "Group debrief (use After questions)", minutes: 10 },
      { label: "Exit ticket: Write or draw 2 rhyming pairs", minutes: 5 },
    ],
  },
  "k2-stem-bounce-buds": {
    objectives: [
      "Students will learn that all living things are made of tiny parts called cells.",
      "Students will identify that some tiny living things (microbes) can be helpful.",
      "Students will connect biology to everyday health habits like handwashing.",
    ],
    vocabulary: [
      { term: "Cell", definition: "The smallest building block of all living things." },
      { term: "Microbe", definition: "A tiny living thing too small to see without a microscope." },
      { term: "Microscope", definition: "A tool that makes tiny things look big so we can see them." },
      { term: "Healthy", definition: "When your body is working well and feeling good." },
    ],
    prerequisites: [
      "Understanding that plants, animals, and people are living things.",
      "Basic concept of 'big' and 'small.'",
      "Awareness of personal hygiene habits (washing hands, brushing teeth).",
    ],
    estimatedMinutes: 45,
    misconceptions: [
      "Students may think all germs and microbes are bad — explain that some help us (e.g., gut bacteria).",
      "Students might think cells are only in humans — all living things have cells.",
      "Some students may think you can see cells with your eyes if you look closely enough.",
    ],
    discussionBefore: [
      "What is the smallest living thing you can think of? Can something be alive even if you can't see it?",
      "Why do we wash our hands before eating? What are we trying to wash away?",
      "Have you ever looked at something through a magnifying glass? What did you see?",
    ],
    discussionAfter: [
      "What surprised you about cells and microbes? Did you know some tiny things are helpful?",
      "If you had a microscope, what would you want to look at first?",
      "How can we keep our bodies healthy knowing what we learned about microbes?",
    ],
    turnAndTalk: [
      "Tell your partner one thing you learned about cells. What are they?",
      "What is one way you keep your body healthy? Share with your partner.",
    ],
    materials: [
      "Tablets or computers with internet access (one per student or pair)",
      "Optional: magnifying glasses for hands-on exploration activity",
      "Optional: pictures of cells under a microscope (printed or displayed)",
    ],
    pacingGuide: [
      { label: "Warm-up: What is the smallest thing you know?", minutes: 5 },
      { label: "Teacher intro: Meet the tiny world of cells", minutes: 5 },
      { label: "Students on BrightBoost platform", minutes: 20 },
      { label: "Group debrief (use After questions)", minutes: 10 },
      { label: "Exit ticket: Draw a cell and label it", minutes: 5 },
    ],
  },
  "k2-stem-gotcha-gears": {
    objectives: [
      "Students will understand that robots and AI follow instructions made by people.",
      "Students will practice planning ahead and making decisions (strategic thinking).",
      "Students will learn that debugging means finding and fixing mistakes in a plan.",
    ],
    vocabulary: [
      { term: "Robot", definition: "A machine that follows instructions to do a job." },
      { term: "AI (Artificial Intelligence)", definition: "When a computer can learn and make decisions, like a smart helper." },
      { term: "Plan", definition: "Thinking about what to do before you do it." },
      { term: "Debug", definition: "Finding and fixing a mistake in your plan or code." },
    ],
    prerequisites: [
      "Basic understanding that machines and computers are built by people.",
      "Ability to follow simple game rules.",
      "Understanding of cause and effect (if I do this, then that happens).",
    ],
    estimatedMinutes: 45,
    misconceptions: [
      "Students may think robots can think and feel like people — they only follow instructions.",
      "Students might believe AI is magic — explain it's patterns and instructions made by people.",
      "Some students may think debugging means something is broken forever — it's just finding the fix!",
    ],
    discussionBefore: [
      "Have you ever seen a robot? What did it do? Who do you think told it what to do?",
      "What would you do if you were building a robot helper? What job would it have?",
      "When you make a mistake on a drawing, what do you do? That's like debugging!",
    ],
    discussionAfter: [
      "What did Gearbot need your help with? How did you fix the problem?",
      "What surprised you about how robots follow instructions?",
      "If you could program a robot to help at school, what would it do?",
    ],
    turnAndTalk: [
      "Tell your partner: What is one job a robot could do at your house?",
      "Think about the game you just played. What was your strategy? Share with your partner.",
    ],
    materials: [
      "Tablets or computers with internet access (one per student or pair)",
      "Optional: toy robot or pictures of different robots for discussion",
      "Optional: paper and crayons for 'Design Your Robot' extension activity",
    ],
    pacingGuide: [
      { label: "Warm-up: What do you know about robots?", minutes: 5 },
      { label: "Teacher intro: How do robots follow instructions?", minutes: 5 },
      { label: "Students on BrightBoost platform", minutes: 20 },
      { label: "Group debrief (use After questions)", minutes: 10 },
      { label: "Exit ticket: Draw your own robot helper", minutes: 5 },
    ],
  },
};

// GET /api/teacher/prep/:moduleSlug — Get prep data for a module
router.get(
  "/teacher/prep/:moduleSlug",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const { moduleSlug } = req.params;
      const teacherId = req.user!.id;

      const prepData = MODULE_PREP_DATA[moduleSlug];
      if (!prepData) {
        return res.status(404).json({ error: "No prep data found for this module" });
      }

      // Fetch teacher's checklist state
      const checklist = await prisma.teacherPrepChecklist.findUnique({
        where: { teacherId_moduleSlug: { teacherId, moduleSlug } },
      });

      res.json({
        moduleSlug,
        ...prepData,
        checklist: checklist
          ? { items: checklist.items, completedAt: checklist.completedAt }
          : null,
      });
    } catch (err) {
      console.error("Error fetching prep data:", err);
      res.status(500).json({ error: "Failed to fetch prep data" });
    }
  },
);

// PUT /api/teacher/prep/:moduleSlug/checklist — Save checklist state
router.put(
  "/teacher/prep/:moduleSlug/checklist",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const { moduleSlug } = req.params;
      const teacherId = req.user!.id;
      const { items } = req.body;

      if (!items || typeof items !== "object") {
        return res.status(400).json({ error: "Items must be an object" });
      }

      // Check if all items are complete
      const allComplete = Object.values(items).every((v) => v === true);

      const checklist = await prisma.teacherPrepChecklist.upsert({
        where: { teacherId_moduleSlug: { teacherId, moduleSlug } },
        create: {
          teacherId,
          moduleSlug,
          items,
          completedAt: allComplete ? new Date() : null,
        },
        update: {
          items,
          completedAt: allComplete ? new Date() : null,
        },
      });

      res.json(checklist);
    } catch (err) {
      console.error("Error saving checklist:", err);
      res.status(500).json({ error: "Failed to save checklist" });
    }
  },
);

// GET /api/teacher/prep — List all modules with prep status
router.get(
  "/teacher/prep",
  requireRole("teacher"),
  async (req: Request, res: Response) => {
    try {
      const teacherId = req.user!.id;

      const checklists = await prisma.teacherPrepChecklist.findMany({
        where: { teacherId },
      });

      const checklistMap = Object.fromEntries(
        checklists.map((c) => [c.moduleSlug, { items: c.items, completedAt: c.completedAt }]),
      );

      const moduleSlugs = Object.keys(MODULE_PREP_DATA);
      const result = moduleSlugs.map((slug) => ({
        moduleSlug: slug,
        hasPrep: true,
        checklist: checklistMap[slug] || null,
      }));

      res.json(result);
    } catch (err) {
      console.error("Error fetching prep list:", err);
      res.status(500).json({ error: "Failed to fetch prep list" });
    }
  },
);

export default router;
export { MODULE_PREP_DATA };

/**
 * Grade-band-aware content configs for Set 1 games.
 *
 * Each game reads `config.gradeBand` (default "k2") and loads the
 * matching content set. K-2 content is the existing default; g3_5
 * content is harder with upgraded vocabulary and multi-step reasoning.
 */

export type GradeBand = "k2" | "g3_5";

export function getGradeBand(config?: any): GradeBand {
  if (config?.gradeBand === "g3_5") return "g3_5";
  return "k2";
}

// XP multiplier for g3_5 content (20% higher than K-2)
export const XP_MULTIPLIER: Record<GradeBand, number> = {
  k2: 1.0,
  g3_5: 1.2,
};

// ── Gotcha Gears content ────────────────────────────────────────────────

export interface GearRoundContent {
  clueText: string;
  correctLabel: string;
  distractors: string[];
  hint?: string;
}

export const GOTCHA_GEARS_CONTENT: Record<GradeBand, GearRoundContent[]> = {
  k2: [
    { clueText: "I help a robot think and learn", correctLabel: "AI Brain", distractors: ["Hammer", "Paintbrush"], hint: "Think about what makes a robot smart!" },
    { clueText: "I store information like a library", correctLabel: "Memory Chip", distractors: ["Wheel", "Speaker"], hint: "Where do computers keep things?" },
    { clueText: "I tell the robot what to do step by step", correctLabel: "Program", distractors: ["Snack", "Balloon"], hint: "It's like a recipe for computers!" },
    { clueText: "I help a robot see the world", correctLabel: "Camera Sensor", distractors: ["Pillow", "Crayon"], hint: "What do YOUR eyes do?" },
    { clueText: "I protect the robot from mistakes", correctLabel: "Debug Tool", distractors: ["Umbrella", "Toy Car"], hint: "Finding and fixing errors!" },
    { clueText: "I move the robot's arms and wheels", correctLabel: "Motor", distractors: ["Book", "Flower"], hint: "What makes things spin and move?" },
    { clueText: "I let robots talk to each other", correctLabel: "Antenna", distractors: ["Spoon", "Hat"], hint: "Think about how signals travel!" },
  ],
  g3_5: [
    { clueText: "I process data to make decisions", correctLabel: "CPU", distractors: ["Battery", "Speaker", "Fan"], hint: "The brain of a computer!" },
    { clueText: "I store data even when power is off", correctLabel: "Hard Drive", distractors: ["Screen", "Keyboard", "Mouse"], hint: "Where do files live permanently?" },
    { clueText: "I detect changes in temperature, light, or motion", correctLabel: "Sensor", distractors: ["Printer", "Charger", "Cable"], hint: "How do robots know what's around them?" },
    { clueText: "I convert electrical signals into movement", correctLabel: "Actuator", distractors: ["Microphone", "Filter", "Lens"], hint: "What turns signals into action?" },
    { clueText: "I repeat a set of instructions until a condition is met", correctLabel: "Loop", distractors: ["Variable", "Comment", "Import"], hint: "Think about doing something over and over!" },
    { clueText: "I protect a system by checking inputs before processing", correctLabel: "Validation", distractors: ["Encryption", "Compression", "Rendering"], hint: "Making sure data is correct before using it!" },
    { clueText: "I allow two systems to communicate using a shared protocol", correctLabel: "API", distractors: ["URL", "DNS", "RAM"], hint: "A bridge between programs!" },
    { clueText: "I find and fix errors in code by testing step by step", correctLabel: "Debugging", distractors: ["Compiling", "Deploying", "Formatting"], hint: "Like being a code detective!" },
  ],
};

// ── Boost Path Planner (Lost Steps) content ─────────────────────────────

export interface PathLevel {
  titleKey: string;
  size: number;
  start: { x: number; y: number };
  goal: { x: number; y: number };
  dir: "N" | "E" | "S" | "W";
  walls: { x: number; y: number }[];
  maxSteps: number;
}

export const BOOST_PATH_LEVELS: Record<GradeBand, PathLevel[]> = {
  k2: [
    { titleKey: "games.boostPath.level1", size: 3, start: { x: 0, y: 2 }, goal: { x: 2, y: 0 }, dir: "N", walls: [], maxSteps: 4 },
    { titleKey: "games.boostPath.level2", size: 3, start: { x: 0, y: 2 }, goal: { x: 2, y: 0 }, dir: "N", walls: [{ x: 1, y: 1 }], maxSteps: 6 },
    { titleKey: "games.boostPath.level3", size: 4, start: { x: 0, y: 3 }, goal: { x: 3, y: 0 }, dir: "N", walls: [{ x: 1, y: 2 }, { x: 2, y: 1 }], maxSteps: 8 },
  ],
  g3_5: [
    { titleKey: "games.boostPath.g35level1", size: 4, start: { x: 0, y: 3 }, goal: { x: 3, y: 0 }, dir: "E", walls: [{ x: 1, y: 1 }, { x: 2, y: 2 }], maxSteps: 7 },
    { titleKey: "games.boostPath.g35level2", size: 5, start: { x: 0, y: 4 }, goal: { x: 4, y: 0 }, dir: "N", walls: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 1 }], maxSteps: 10 },
    { titleKey: "games.boostPath.g35level3", size: 5, start: { x: 0, y: 4 }, goal: { x: 4, y: 0 }, dir: "E", walls: [{ x: 1, y: 3 }, { x: 2, y: 1 }, { x: 3, y: 3 }, { x: 3, y: 2 }], maxSteps: 12 },
    { titleKey: "games.boostPath.g35level4", size: 6, start: { x: 0, y: 5 }, goal: { x: 5, y: 0 }, dir: "N", walls: [{ x: 1, y: 3 }, { x: 2, y: 1 }, { x: 3, y: 4 }, { x: 4, y: 2 }, { x: 4, y: 1 }], maxSteps: 14 },
  ],
};

// ── Bounce & Buds content ───────────────────────────────────────────────

export interface BounceRoundContent {
  clueText: string;
  correctLabel: string;
  distractors: string[];
  theme: string;
}

export const BOUNCE_BUDS_ROUNDS: Record<GradeBand, BounceRoundContent[]> = {
  k2: [
    { clueText: "Which one helps a plant grow?", correctLabel: "Water", distractors: ["Rock", "Metal"], theme: "plant-needs" },
    { clueText: "Which part drinks water from the soil?", correctLabel: "Root", distractors: ["Cloud", "Button"], theme: "plant-parts" },
    { clueText: "Plants use this to make food!", correctLabel: "Sunlight", distractors: ["Wind", "Ice"], theme: "plant-needs" },
    { clueText: "This part helps make food for the plant.", correctLabel: "Leaf", distractors: ["Sand", "Coin"], theme: "plant-parts" },
    { clueText: "Roots grow in this!", correctLabel: "Soil", distractors: ["Glass", "Plastic"], theme: "plant-needs" },
    { clueText: "Which one is a tiny living helper?", correctLabel: "Microbe", distractors: ["Brick", "Wire"], theme: "tiny-living-things" },
    { clueText: "This part holds the plant up tall!", correctLabel: "Stem", distractors: ["Rope", "Tape"], theme: "plant-parts" },
    { clueText: "Every living thing is made of these!", correctLabel: "Cell", distractors: ["Pixel", "Dot"], theme: "tiny-living-things" },
  ],
  g3_5: [
    { clueText: "Which process converts sunlight into energy for plants?", correctLabel: "Photosynthesis", distractors: ["Evaporation", "Combustion", "Erosion"], theme: "plant-science" },
    { clueText: "What gas do plants absorb from the air?", correctLabel: "Carbon Dioxide", distractors: ["Oxygen", "Nitrogen", "Helium"], theme: "plant-science" },
    { clueText: "Which part of a plant carries water from roots to leaves?", correctLabel: "Xylem", distractors: ["Petal", "Seed", "Bark"], theme: "plant-parts" },
    { clueText: "What do plants release into the air as a byproduct?", correctLabel: "Oxygen", distractors: ["Carbon Dioxide", "Methane", "Smoke"], theme: "plant-science" },
    { clueText: "Which organism breaks down dead plants and returns nutrients to soil?", correctLabel: "Decomposer", distractors: ["Predator", "Pollinator", "Parasite"], theme: "ecosystems" },
    { clueText: "What is the green pigment in leaves called?", correctLabel: "Chlorophyll", distractors: ["Melanin", "Keratin", "Cellulose"], theme: "plant-science" },
    { clueText: "Which variable would you change in a plant growth experiment?", correctLabel: "Amount of water", distractors: ["Type of ruler", "Color of pot", "Day of week"], theme: "fair-test" },
    { clueText: "A fair test changes only ONE variable. What stays the same?", correctLabel: "Controlled variables", distractors: ["All variables", "The hypothesis", "The conclusion"], theme: "fair-test" },
    { clueText: "Plants compete for sunlight. What happens to a plant in shade?", correctLabel: "It grows taller to reach light", distractors: ["It turns blue", "It stops growing roots", "It makes more seeds"], theme: "ecosystems" },
  ],
};

// ── Rhyme & Ride word families ───────────────────────────────────────────

export interface RhymeFamily {
  pattern: string;
  words: string[];
  distractors: string[];
}

export const RHYME_FAMILIES: Record<GradeBand, RhymeFamily[]> = {
  k2: [
    { pattern: "-at", words: ["cat", "bat", "hat", "mat", "sat", "rat"], distractors: ["dog", "big", "run", "cup"] },
    { pattern: "-un", words: ["fun", "sun", "run", "bun", "pun"], distractors: ["red", "box", "top", "net"] },
    { pattern: "-ig", words: ["big", "dig", "fig", "pig", "wig"], distractors: ["cat", "sun", "map", "bed"] },
  ],
  g3_5: [
    { pattern: "-tion", words: ["motion", "station", "nation", "action", "fraction"], distractors: ["mountain", "captain", "certain", "fountain"] },
    { pattern: "-ight", words: ["light", "sight", "flight", "might", "bright"], distractors: ["weight", "eight", "height", "great"] },
    { pattern: "-ment", words: ["moment", "segment", "element", "experiment", "measurement"], distractors: ["prevent", "content", "cement", "intent"] },
    { pattern: "-ence", words: ["science", "evidence", "sequence", "reference", "difference"], distractors: ["silence", "balance", "distance", "instance"] },
  ],
};

// ── Tank Trek levels ────────────────────────────────────────────────────

export const TANK_TREK_G35_LEVELS = {
  chapters: [
    {
      id: "g35-ch1",
      titles: { en: "Algorithm Thinking", es: "Pensamiento Algorítmico", vi: "Tư Duy Thuật Toán", "zh-CN": "算法思维" },
      theme: "lab" as const,
      levels: [
        {
          id: "g35-1-1",
          names: { en: "Sequence Challenge", es: "Desafío de Secuencia", vi: "Thử Thách Trình Tự", "zh-CN": "序列挑战" },
          cols: 4, rows: 4, startRow: 3, startCol: 0, startDir: "E" as const, par: 6,
          storySnippets: { en: "Plan an efficient path — fewer moves earn more stars!", es: "¡Planifica un camino eficiente — menos pasos = más estrellas!", vi: "Lập kế hoạch hiệu quả — ít bước hơn = nhiều sao hơn!", "zh-CN": "规划高效路径——步数越少，星星越多！" },
          hints: { en: "Think about the whole path before starting", es: "Piensa en todo el camino antes de empezar", vi: "Nghĩ về toàn bộ đường đi trước khi bắt đầu", "zh-CN": "开始前先想好整条路线" },
          grid: [["wall","wall","floor","goal"],["floor","wall","floor","floor"],["floor","floor","floor","wall"],["start","wall","wall","wall"]],
        },
        {
          id: "g35-1-2",
          names: { en: "Debug the Route", es: "Depura la Ruta", vi: "Gỡ Lỗi Đường Đi", "zh-CN": "调试路线" },
          cols: 5, rows: 4, startRow: 3, startCol: 0, startDir: "N" as const, par: 8,
          storySnippets: { en: "This maze has a tricky path. Plan carefully to avoid dead ends!", es: "Este laberinto tiene un camino difícil. ¡Planifica para evitar callejones sin salida!", vi: "Mê cung này có đường khó. Hãy lập kế hoạch để tránh ngõ cụt!", "zh-CN": "这个迷宫路线很巧妙。仔细规划避免死路！" },
          hints: { en: "There are two paths — one is shorter", es: "Hay dos caminos — uno es más corto", vi: "Có hai đường — một đường ngắn hơn", "zh-CN": "有两条路——其中一条更短" },
          grid: [["wall","wall","floor","floor","goal"],["floor","floor","floor","wall","floor"],["floor","wall","chip","floor","floor"],["start","floor","wall","wall","wall"]],
        },
      ],
    },
    {
      id: "g35-ch2",
      titles: { en: "Optimization", es: "Optimización", vi: "Tối Ưu Hóa", "zh-CN": "优化" },
      theme: "factory" as const,
      levels: [
        {
          id: "g35-2-1",
          names: { en: "Chip Collector", es: "Colector de Chips", vi: "Thu Thập Chip", "zh-CN": "芯片收集者" },
          cols: 5, rows: 5, startRow: 4, startCol: 0, startDir: "E" as const, par: 10, maxCommands: 12,
          storySnippets: { en: "Collect all data chips AND reach the goal in minimum moves!", es: "¡Recoge todos los chips Y llega a la meta con el mínimo de movimientos!", vi: "Thu thập tất cả chip DÀ đến đích với ít bước nhất!", "zh-CN": "收集所有芯片并用最少步数到达目标！" },
          hints: { en: "Plan to collect chips along the way, not as detours", es: "Planifica recoger chips en el camino, no como desvíos", vi: "Lên kế hoạch nhặt chip dọc đường, không đi vòng", "zh-CN": "计划沿途收集芯片，不要绕路" },
          grid: [["wall","wall","wall","floor","goal"],["floor","chip","wall","floor","floor"],["floor","floor","floor","floor","wall"],["wall","floor","wall","chip","floor"],["start","floor","floor","wall","wall"]],
        },
      ],
    },
  ],
};

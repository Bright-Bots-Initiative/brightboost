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

/**
 * Integrity contract (enforced by RhymeRideBands.test.ts): every word in
 * `words` ends with the family's letter pattern; NO distractor does. The
 * game shows the pattern chip as the cue, so a distractor that literally
 * ends with the pattern (e.g. "cement" for -ment) would mark an honest
 * answer wrong.
 */
export const RHYME_FAMILIES: Record<GradeBand, RhymeFamily[]> = {
  k2: [
    { pattern: "-at", words: ["cat", "bat", "hat", "mat", "sat", "rat"], distractors: ["dog", "big", "run", "cup"] },
    { pattern: "-un", words: ["fun", "sun", "run", "bun", "pun"], distractors: ["red", "box", "top", "net"] },
    { pattern: "-ig", words: ["big", "dig", "fig", "pig", "wig"], distractors: ["cat", "sun", "map", "bed"] },
  ],
  g3_5: [
    { pattern: "-tion", words: ["motion", "station", "nation", "action", "fraction"], distractors: ["mountain", "captain", "certain", "fountain"] },
    { pattern: "-ight", words: ["light", "sight", "flight", "might", "bright"], distractors: ["great", "wait", "street", "point"] },
    { pattern: "-ment", words: ["moment", "segment", "element", "experiment", "measurement"], distractors: ["prevent", "content", "talent", "intent"] },
    { pattern: "-ence", words: ["science", "evidence", "sequence", "reference", "difference"], distractors: ["advance", "balance", "distance", "instance"] },
    { pattern: "-ound", words: ["sound", "found", "ground", "round", "pound", "bound"], distractors: ["sand", "band", "wand", "bond"] },
    { pattern: "-ain", words: ["rain", "brain", "train", "chain", "explain", "remain"], distractors: ["ran", "green", "line", "lean"] },
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
          // Solver-derived (see TankTrekSolvability.test.ts): collecting both
          // chips + reaching the goal takes a minimum of 20 commands
          // (12 forwards + 8 turns). The original maxCommands: 12 made the
          // level's own stated objective impossible. Cap = 25 (~1.25× the
          // optimal, matching the chapter's optimal-to-cap ratio); par = 12
          // = optimal full-route forwards, so chip collectors — the point of
          // the level — earn 3 stars.
          cols: 5, rows: 5, startRow: 4, startCol: 0, startDir: "E" as const, par: 12, maxCommands: 25,
          storySnippets: { en: "Collect all data chips AND reach the goal in minimum moves!", es: "¡Recoge todos los chips Y llega a la meta con el mínimo de movimientos!", vi: "Thu thập tất cả chip DÀ đến đích với ít bước nhất!", "zh-CN": "收集所有芯片并用最少步数到达目标！" },
          hints: { en: "Plan to collect chips along the way, not as detours", es: "Planifica recoger chips en el camino, no como desvíos", vi: "Lên kế hoạch nhặt chip dọc đường, không đi vòng", "zh-CN": "计划沿途收集芯片，不要绕路" },
          grid: [["wall","wall","wall","floor","goal"],["floor","chip","wall","floor","floor"],["floor","floor","floor","floor","wall"],["wall","floor","wall","chip","floor"],["start","floor","floor","wall","wall"]],
        },
      ],
    },
  ],
};

// ── Quantum Quest g3-5 sectors ──────────────────────────────────────────
// Structurally matches QQSector in QuantumQuestGame.tsx (kept here, in the
// band content registry, to mirror TANK_TREK_G35_LEVELS).

export interface QQProblemContent {
  id: string;
  prompts: Partial<Record<string, string>>;
  correctAnswer: number;
  decoys: number[];
  skillTag: string;
}

export interface QQSectorContent {
  id: string;
  titles: Partial<Record<string, string>>;
  storyBeats?: Partial<Record<string, string>>;
  problems: QQProblemContent[];
  speed: number;
  spawnRate: number;
  theme: "harbor" | "nebula" | "gate";
}

export const QUANTUM_QUEST_G35_SECTORS: QQSectorContent[] = [
  {
    id: "g35-s1",
    titles: { en: "Star Harbor", es: "Puerto Estelar", vi: "Bến Sao", "zh-CN": "星港" },
    theme: "harbor",
    storyBeats: {
      en: "Explorer! The harbor engines run on multiplication. Scan the right products to launch.",
      es: "¡Explorador! Los motores del puerto funcionan con multiplicación. Escanea los productos correctos para despegar.",
      vi: "Nhà thám hiểm! Động cơ bến cảng chạy bằng phép nhân. Quét đúng kết quả để khởi hành.",
      "zh-CN": "探险家！港口引擎靠乘法运转。扫描正确的积才能起飞。",
    },
    speed: 1.5,
    spawnRate: 2.3,
    problems: [
      { id: "g35-s1-1", prompts: { en: "4 × 6 = ?" }, correctAnswer: 24, decoys: [18, 28, 32], skillTag: "multiplication" },
      { id: "g35-s1-2", prompts: { en: "7 × 8 = ?" }, correctAnswer: 56, decoys: [54, 48, 63], skillTag: "multiplication" },
      { id: "g35-s1-3", prompts: { en: "9 × 3 = ?" }, correctAnswer: 27, decoys: [21, 24, 36], skillTag: "multiplication" },
      { id: "g35-s1-4", prompts: { en: "8 × 6 = ?" }, correctAnswer: 48, decoys: [42, 54, 56], skillTag: "multiplication" },
      { id: "g35-s1-5", prompts: { en: "12 × 5 = ?" }, correctAnswer: 60, decoys: [55, 65, 72], skillTag: "multiplication" },
    ],
  },
  {
    id: "g35-s2",
    titles: { en: "Nebula Stream", es: "Corriente de Nebulosa", vi: "Dòng Tinh Vân", "zh-CN": "星云流" },
    theme: "nebula",
    storyBeats: {
      en: "The stream splits into equal currents — division territory. Watch for growing patterns too.",
      es: "La corriente se divide en partes iguales — territorio de división. Atento también a los patrones que crecen.",
      vi: "Dòng chảy chia thành các luồng bằng nhau — vùng phép chia. Cũng hãy chú ý các quy luật tăng dần.",
      "zh-CN": "星流分成相等的支流——除法领域。也要注意递增的规律。",
    },
    speed: 2.5,
    spawnRate: 1.9,
    problems: [
      { id: "g35-s2-1", prompts: { en: "56 ÷ 8 = ?" }, correctAnswer: 7, decoys: [6, 8, 9], skillTag: "division" },
      { id: "g35-s2-2", prompts: { en: "72 ÷ 9 = ?" }, correctAnswer: 8, decoys: [7, 9, 6], skillTag: "division" },
      { id: "g35-s2-3", prompts: { en: "What comes next: 3, 6, 12, 24, ?", es: "¿Qué sigue: 3, 6, 12, 24, ?", vi: "Số tiếp theo: 3, 6, 12, 24, ?", "zh-CN": "下一个是：3, 6, 12, 24, ?" }, correctAnswer: 48, decoys: [36, 30, 42], skillTag: "patterns" },
      { id: "g35-s2-4", prompts: { en: "45 ÷ 5 = ?" }, correctAnswer: 9, decoys: [8, 7, 6], skillTag: "division" },
      { id: "g35-s2-5", prompts: { en: "What comes next: 81, 27, 9, ?", es: "¿Qué sigue: 81, 27, 9, ?", vi: "Số tiếp theo: 81, 27, 9, ?", "zh-CN": "下一个是：81, 27, 9, ?" }, correctAnswer: 3, decoys: [1, 6, 18], skillTag: "patterns" },
      { id: "g35-s2-6", prompts: { en: "63 ÷ 7 = ?" }, correctAnswer: 9, decoys: [8, 7, 6], skillTag: "division" },
    ],
  },
  {
    id: "g35-s3",
    titles: { en: "Quantum Gate", es: "Puerta Cuántica", vi: "Cổng Lượng Tử", "zh-CN": "量子之门" },
    theme: "gate",
    storyBeats: {
      en: "Final gate: fractions and order of operations. The decoys are built from the most common mistakes — check before you scan.",
      es: "Puerta final: fracciones y orden de operaciones. Los señuelos vienen de los errores más comunes — revisa antes de escanear.",
      vi: "Cổng cuối: phân số và thứ tự phép tính. Đáp án nhiễu lấy từ các lỗi phổ biến nhất — kiểm tra trước khi quét.",
      "zh-CN": "最后一关：分数与运算顺序。干扰项来自最常见的错误——扫描前要检查。",
    },
    speed: 3.2,
    spawnRate: 1.7,
    problems: [
      { id: "g35-s3-1", prompts: { en: "What is 1/2 of 18?", es: "¿Cuánto es 1/2 de 18?", vi: "1/2 của 18 là bao nhiêu?", "zh-CN": "18的1/2是多少？" }, correctAnswer: 9, decoys: [6, 8, 12], skillTag: "fractions" },
      { id: "g35-s3-2", prompts: { en: "What is 3/4 of 20?", es: "¿Cuánto es 3/4 de 20?", vi: "3/4 của 20 là bao nhiêu?", "zh-CN": "20的3/4是多少？" }, correctAnswer: 15, decoys: [12, 16, 18], skillTag: "fractions" },
      { id: "g35-s3-3", prompts: { en: "(2 + 3) × 4 = ?" }, correctAnswer: 20, decoys: [14, 24, 10], skillTag: "order-of-operations" },
      { id: "g35-s3-4", prompts: { en: "What is 1/3 of 27?", es: "¿Cuánto es 1/3 de 27?", vi: "1/3 của 27 là bao nhiêu?", "zh-CN": "27的1/3是多少？" }, correctAnswer: 9, decoys: [3, 6, 12], skillTag: "fractions" },
      { id: "g35-s3-5", prompts: { en: "30 - 4 × 5 = ?" }, correctAnswer: 10, decoys: [130, 26, 20], skillTag: "order-of-operations" },
      { id: "g35-s3-6", prompts: { en: "2 × (9 - 3) = ?" }, correctAnswer: 12, decoys: [15, 6, 18], skillTag: "order-of-operations" },
      { id: "g35-s3-7", prompts: { en: "What is 2/5 of 25?", es: "¿Cuánto es 2/5 de 25?", vi: "2/5 của 25 là bao nhiêu?", "zh-CN": "25的2/5是多少？" }, correctAnswer: 10, decoys: [5, 15, 4], skillTag: "fractions" },
    ],
  },
];

// ── Grade 3-5 story & quiz overrides for Set 1 modules ─────────────────
// The seeded INFO activities (story_quiz) are authored for K-2. When a
// g3_5 student opens them, ActivityPlayer swaps in these slides/questions
// at render time (see applyG35StoryOverrides). Keyed by module slug.

export interface BandedStoryQuiz {
  slides: { id: string; text: { en: string; es: string }; icon?: string }[];
  questions: {
    id: string;
    prompt: { en: string; es: string };
    choices: { en: string; es: string }[];
    answerIndex: number;
    hint?: { en: string; es: string };
  }[];
}

export const G35_STORY_QUIZZES: Record<string, BandedStoryQuiz> = {
  "k2-stem-bounce-buds": {
    slides: [
      { id: "g35-bb-s1", text: { en: "Plants are living systems. They pull water up through roots and stems, capture sunlight with their leaves, and turn it into food energy through photosynthesis.", es: "Las plantas son sistemas vivos. Absorben agua por las raíces y los tallos, capturan luz solar con las hojas y la convierten en energía mediante la fotosíntesis." }, icon: "🌱" },
      { id: "g35-bb-s2", text: { en: "Scientists study plants with fair tests: change ONE variable — like the amount of water — and keep everything else the same.", es: "Los científicos estudian las plantas con pruebas justas: cambian UNA variable — como la cantidad de agua — y mantienen todo lo demás igual." }, icon: "🧪" },
      { id: "g35-bb-s3", text: { en: "In this mission you'll sort plant science ideas at speed. Read each clue, then bounce to the answer the evidence supports.", es: "En esta misión clasificarás ideas de ciencia de plantas a toda velocidad. Lee cada pista y salta a la respuesta que apoya la evidencia." }, icon: "⚡" },
    ],
    questions: [
      { id: "g35-bb-q1", prompt: { en: "What does photosynthesis do for a plant?", es: "¿Qué hace la fotosíntesis por una planta?" }, choices: [{ en: "Turns sunlight into food energy", es: "Convierte la luz solar en energía" }, { en: "Moves the plant toward shade", es: "Mueve la planta hacia la sombra" }, { en: "Turns soil into seeds", es: "Convierte la tierra en semillas" }, { en: "Keeps insects away", es: "Aleja a los insectos" }], answerIndex: 0, hint: { en: "Photo = light. Synthesis = making something.", es: "Foto = luz. Síntesis = fabricar algo." } },
      { id: "g35-bb-q2", prompt: { en: "You water one plant 10 mL and another 50 mL each day. For a fair test, what must stay the same?", es: "Riegas una planta con 10 mL y otra con 50 mL cada día. Para una prueba justa, ¿qué debe permanecer igual?" }, choices: [{ en: "Everything except the water amount", es: "Todo excepto la cantidad de agua" }, { en: "Nothing — change it all", es: "Nada — cambia todo" }, { en: "Only the pot color", es: "Solo el color de la maceta" }, { en: "The amount of water", es: "La cantidad de agua" }], answerIndex: 0, hint: { en: "A fair test changes exactly one variable.", es: "Una prueba justa cambia exactamente una variable." } },
      { id: "g35-bb-q3", prompt: { en: "Which part carries water from the roots up to the leaves?", es: "¿Qué parte lleva el agua desde las raíces hasta las hojas?" }, choices: [{ en: "The xylem in the stem", es: "El xilema en el tallo" }, { en: "The petals", es: "Los pétalos" }, { en: "The seeds", es: "Las semillas" }, { en: "The flower", es: "La flor" }], answerIndex: 0, hint: { en: "Think of tiny tubes inside the stem.", es: "Piensa en tubitos dentro del tallo." } },
    ],
  },
  "k2-stem-gotcha-gears": {
    slides: [
      { id: "g35-gg-s1", text: { en: "Every computer — from a robot to a game console — is a team of parts. The CPU makes decisions, memory stores data, and sensors gather information from the world.", es: "Cada computadora — desde un robot hasta una consola — es un equipo de partes. El CPU toma decisiones, la memoria guarda datos y los sensores reúnen información del mundo." }, icon: "🤖" },
      { id: "g35-gg-s2", text: { en: "Programs control the team with instructions. A loop repeats steps until a condition is met. Validation checks data before the computer trusts it.", es: "Los programas controlan el equipo con instrucciones. Un bucle repite pasos hasta cumplir una condición. La validación revisa los datos antes de que la computadora confíe en ellos." }, icon: "🔁" },
      { id: "g35-gg-s3", text: { en: "Your mission: catch the right component for each job description before the gears lock. Read carefully — the decoys sound close!", es: "Tu misión: atrapa el componente correcto para cada descripción antes de que los engranajes se traben. Lee con cuidado — ¡los señuelos suenan parecidos!" }, icon: "⚙️" },
    ],
    questions: [
      { id: "g35-gg-q1", prompt: { en: "Which part of a computer executes instructions and makes decisions?", es: "¿Qué parte de la computadora ejecuta instrucciones y toma decisiones?" }, choices: [{ en: "The CPU", es: "El CPU" }, { en: "The screen", es: "La pantalla" }, { en: "The battery", es: "La batería" }, { en: "The speaker", es: "El altavoz" }], answerIndex: 0, hint: { en: "It's called the brain of the computer.", es: "Se le llama el cerebro de la computadora." } },
      { id: "g35-gg-q2", prompt: { en: "A robot repeats \"move forward\" until the path is blocked. What is that called?", es: "Un robot repite \"avanzar\" hasta que el camino se bloquea. ¿Cómo se llama eso?" }, choices: [{ en: "A loop", es: "Un bucle" }, { en: "A variable", es: "Una variable" }, { en: "A download", es: "Una descarga" }, { en: "A glitch", es: "Un fallo" }], answerIndex: 0, hint: { en: "Repeat until a condition is met.", es: "Repetir hasta cumplir una condición." } },
      { id: "g35-gg-q3", prompt: { en: "Why does a program validate input before using it?", es: "¿Por qué un programa valida los datos antes de usarlos?" }, choices: [{ en: "To make sure the data is correct and safe", es: "Para asegurar que los datos sean correctos y seguros" }, { en: "To make the program slower", es: "Para hacer el programa más lento" }, { en: "To use more memory", es: "Para usar más memoria" }, { en: "Because computers like tests", es: "Porque a las computadoras les gustan las pruebas" }], answerIndex: 0, hint: { en: "Bad data in means bad results out.", es: "Datos malos producen resultados malos." } },
    ],
  },
  "k2-stem-rhyme-ride": {
    slides: [
      { id: "g35-rr-s1", text: { en: "English words are built from patterns. Endings like -tion, -ment, and -ence appear in thousands of words — spot the pattern and you can read almost anything.", es: "Las palabras en inglés se construyen con patrones. Terminaciones como -tion, -ment y -ence aparecen en miles de palabras — reconoce el patrón y podrás leer casi cualquier cosa." }, icon: "🔤" },
      { id: "g35-rr-s2", text: { en: "But watch out: spelling and sound don't always agree. \"Weight\" looks close to \"light\", but they don't sound alike. Strong readers check both the letters AND the sound.", es: "Pero cuidado: la escritura y el sonido no siempre coinciden. \"Weight\" se parece a \"light\", pero no suenan igual. Los buenos lectores revisan las letras Y el sonido." }, icon: "👀" },
      { id: "g35-rr-s3", text: { en: "In this ride you'll catch words that share an ending pattern — at speed. Trust the pattern, not the first glance.", es: "En este viaje atraparás palabras que comparten una terminación — a toda velocidad. Confía en el patrón, no en el primer vistazo." }, icon: "🚲" },
    ],
    questions: [
      { id: "g35-rr-q1", prompt: { en: "Which word ends with the same pattern as \"motion\"?", es: "¿Qué palabra termina con el mismo patrón que \"motion\"?" }, choices: [{ en: "Fraction", es: "Fraction" }, { en: "Mountain", es: "Mountain" }, { en: "Moment", es: "Moment" }, { en: "Monster", es: "Monster" }], answerIndex: 0, hint: { en: "Look at the last four letters: -tion.", es: "Mira las últimas cuatro letras: -tion." } },
      { id: "g35-rr-q2", prompt: { en: "Why is \"weight\" NOT a rhyme for \"light\"?", es: "¿Por qué \"weight\" NO rima con \"light\"?" }, choices: [{ en: "They end with different sounds", es: "Terminan con sonidos diferentes" }, { en: "Weight is too long", es: "Weight es demasiado larga" }, { en: "Light is not a real word", es: "Light no es una palabra real" }, { en: "They start with different letters", es: "Empiezan con letras diferentes" }], answerIndex: 0, hint: { en: "Say both out loud and listen to the endings.", es: "Dilas en voz alta y escucha las terminaciones." } },
      { id: "g35-rr-q3", prompt: { en: "Using the ending -ment, which of these is a real word?", es: "Usando la terminación -ment, ¿cuál de estas es una palabra real?" }, choices: [{ en: "Experiment", es: "Experiment" }, { en: "Experimention", es: "Experimention" }, { en: "Experimentence", es: "Experimentence" }, { en: "Experimentain", es: "Experimentain" }], answerIndex: 0, hint: { en: "Only one of these appears in a dictionary.", es: "Solo una aparece en el diccionario." } },
    ],
  },
  "k2-stem-tank-trek": {
    slides: [
      { id: "g35-tt-s1", text: { en: "Bolt the robot runs algorithms — exact sequences of commands. Computers don't guess: they execute exactly what you wrote, in exactly that order.", es: "El robot Bolt ejecuta algoritmos — secuencias exactas de comandos. Las computadoras no adivinan: ejecutan exactamente lo que escribiste, en ese orden exacto." }, icon: "🤖" },
      { id: "g35-tt-s2", text: { en: "Great programmers optimize: they look for the route with the fewest steps. Then they debug — find the wrong command, change it, and test again.", es: "Los buenos programadores optimizan: buscan la ruta con menos pasos. Luego depuran — encuentran el comando equivocado, lo cambian y prueban otra vez." }, icon: "🧭" },
      { id: "g35-tt-s3", text: { en: "Your levels track forward steps against par. Plan the whole route before you press play — three stars go to efficient routes.", es: "Tus niveles comparan los pasos con el par. Planifica toda la ruta antes de presionar jugar — las tres estrellas son para rutas eficientes." }, icon: "⭐" },
    ],
    questions: [
      { id: "g35-tt-q1", prompt: { en: "An algorithm is best described as…", es: "Un algoritmo se describe mejor como…" }, choices: [{ en: "An exact step-by-step set of instructions", es: "Un conjunto exacto de instrucciones paso a paso" }, { en: "A lucky guess", es: "Una adivinanza con suerte" }, { en: "A type of robot", es: "Un tipo de robot" }, { en: "A maze", es: "Un laberinto" }], answerIndex: 0, hint: { en: "Think: a recipe a computer can follow.", es: "Piensa: una receta que una computadora puede seguir." } },
      { id: "g35-tt-q2", prompt: { en: "Your route works but uses 12 steps; par is 8. What does an optimizer do?", es: "Tu ruta funciona pero usa 12 pasos; el par es 8. ¿Qué hace un optimizador?" }, choices: [{ en: "Look for a shorter path that still reaches the goal", es: "Buscar un camino más corto que aún llegue a la meta" }, { en: "Add more turns", es: "Agregar más giros" }, { en: "Run it again unchanged", es: "Repetirla sin cambios" }, { en: "Delete the goal", es: "Borrar la meta" }], answerIndex: 0, hint: { en: "Optimize means same result, fewer steps.", es: "Optimizar significa el mismo resultado con menos pasos." } },
      { id: "g35-tt-q3", prompt: { en: "Bolt turns left at step 3 when it should turn right. What's the debugging move?", es: "Bolt gira a la izquierda en el paso 3 cuando debía girar a la derecha. ¿Cuál es el paso de depuración?" }, choices: [{ en: "Change only step 3 and re-test", es: "Cambiar solo el paso 3 y volver a probar" }, { en: "Rewrite every step", es: "Reescribir todos los pasos" }, { en: "Press buttons randomly", es: "Presionar botones al azar" }, { en: "Start a new maze", es: "Empezar otro laberinto" }], answerIndex: 0, hint: { en: "Fix the smallest thing that's wrong, then verify.", es: "Corrige lo mínimo que está mal y verifica." } },
    ],
  },
  "k2-stem-quantum-quest": {
    slides: [
      { id: "g35-qq-s1", text: { en: "Welcome back, Explorer. This sector runs on multiplication, division, and fractions — the math that powers real navigation.", es: "Bienvenido de nuevo, Explorador. Este sector funciona con multiplicación, división y fracciones — la matemática que impulsa la navegación real." }, icon: "🚀" },
      { id: "g35-qq-s2", text: { en: "Order of operations matters: multiply and divide before you add and subtract. 2 + 3 × 4 is 14, not 20.", es: "El orden de las operaciones importa: multiplica y divide antes de sumar y restar. 2 + 3 × 4 es 14, no 20." }, icon: "🧮" },
      { id: "g35-qq-s3", text: { en: "Scan fast, but check the math. The decoy answers are built from the most common mistakes.", es: "Escanea rápido, pero revisa la matemática. Los señuelos vienen de los errores más comunes." }, icon: "🔍" },
    ],
    questions: [
      { id: "g35-qq-q1", prompt: { en: "What is 2 + 3 × 4?", es: "¿Cuánto es 2 + 3 × 4?" }, choices: [{ en: "14", es: "14" }, { en: "20", es: "20" }, { en: "24", es: "24" }, { en: "9", es: "9" }], answerIndex: 0, hint: { en: "Multiply first: 3 × 4 = 12, then add 2.", es: "Multiplica primero: 3 × 4 = 12, luego suma 2." } },
      { id: "g35-qq-q2", prompt: { en: "What is 3/4 of 20?", es: "¿Cuánto es 3/4 de 20?" }, choices: [{ en: "15", es: "15" }, { en: "12", es: "12" }, { en: "5", es: "5" }, { en: "16", es: "16" }], answerIndex: 0, hint: { en: "Find 1/4 of 20 first, then take 3 of them.", es: "Primero halla 1/4 de 20, luego toma 3 de esos." } },
      { id: "g35-qq-q3", prompt: { en: "56 ÷ 8 = ?", es: "¿56 ÷ 8 = ?" }, choices: [{ en: "7", es: "7" }, { en: "6", es: "6" }, { en: "8", es: "8" }, { en: "9", es: "9" }], answerIndex: 0, hint: { en: "Which number times 8 makes 56?", es: "¿Qué número por 8 da 56?" } },
    ],
  },
};

/**
 * Render-time band override for seeded story_quiz activities. Returns the
 * content unchanged for K-2 (or unknown modules), so K-2 behavior is
 * byte-identical. Applied at render (not parse) time because useGradeBand
 * resolves asynchronously.
 */
export function applyG35StoryOverrides(
  content: any,
  moduleSlug: string | undefined,
  band: GradeBand,
): any {
  if (band !== "g3_5" || !moduleSlug) return content;
  if (content?.type !== "story_quiz") return content;
  const override = G35_STORY_QUIZZES[moduleSlug];
  if (!override) return content;
  return { ...content, slides: override.slides, questions: override.questions };
}


// ── Maze Maps g3-5 sectors ──────────────────────────────────────────
// 
// 

export interface SweepConfig {
  id: string;
  loop: [number, number][];
  startIndex: number;
}

export interface MazeMapConfig {
  id: string;
  rows: number;
  cols: number;
  start: [number, number];
  goal: [number, number];
  walls: [number, number][];
  orbs: [number, number][];
  safePads: [number, number][];
  sweepers: SweepConfig[];
}

export const MAPS_G3_5: Record<string, MazeMapConfig> = {
  tutorial: {
    id: "tutorial", rows: 6, cols: 6,
    start: [5, 0], goal: [0, 5],
    walls: [[0, 0], [1, 0], [1, 1], [4, 1], [0, 3], [1, 3], [2, 3], [4, 3], [4, 4]],
    orbs: [[2, 1], [5, 3], [2, 4]],
    safePads: [],
    sweepers: [],
  },
  guided: {
    id: "guided", rows: 6, cols: 6,
    start: [5, 0], goal: [5, 5],
    walls: [[0, 1], [0, 2], [1, 1], [1, 2],[3, 2], [4, 2], [4, 4], [5, 4]],
    orbs: [[2, 0], [2, 3], [3, 5]],
    safePads: [[1, 3]],
    sweepers: [
      { id: "s1", loop: [[3, 3], [3, 2], [2, 2], [2, 3], [3, 3]], startIndex: 0 },
      { id: "s2", loop: [[0, 4], [1, 4], [2, 4], [3, 4], [2, 4], [1, 4], [0, 4]], startIndex: 0 },
    ],
  },
  main: {
    id: "main", rows: 7, cols: 7,
    start: [6, 0], goal: [5, 3],
    walls: [[3, 1], [3, 2], [3, 3], [3, 4], [4, 2], [5, 2]],
    orbs: [[3, 0], [1, 3], [3, 6], [5, 5]],
    safePads: [[2, 1], [0, 6]],
    sweepers: [
      { id: "s1", loop: [[5, 1], [5, 0], [4, 0], [4, 1], [5, 1]], startIndex: 0 },
      { id: "s2", loop: [[0, 2], [1, 2], [2, 2], [2, 3], [1, 3], [0, 3], [0, 2]], startIndex: 0 },
      { id: "s3", loop: [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [5, 5], [4, 5], [3, 5], [2, 5], [1, 5], [0, 5]], startIndex: 0 },
      { id: "s4", loop: [[6, 6], [6, 5], [5, 5], [5, 6], [6, 6]], startIndex: 0 },
    ],
  },
};
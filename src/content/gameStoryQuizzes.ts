/**
 * Story + reading comprehension content for each game experience.
 * Used by the seed script to create INFO activities immediately before
 * the corresponding INTERACT game activity.
 *
 * Shape matches the existing story_quiz content structure:
 * { type: "story_quiz", slides: [...], questions: [...] }
 */
export const gameStoryQuizzes = {
  boostPathPlanner: {
    type: "story_quiz",
    slides: [
      {
        id: "bpp-s1",
        text: {
          en: "Boost is a little helper robot in the Bright Lab. Today, Boost has one job: carry a tiny battery to the charging station.",
          es: "Boost es un peque\u00f1o robot ayudante en el Laboratorio Brillante. Hoy, Boost tiene un trabajo: llevar una peque\u00f1a bater\u00eda a la estaci\u00f3n de carga.",
        },
        icon: "\uD83E\uDD16",
      },
      {
        id: "bpp-s2",
        text: {
          en: "Boost cannot just rush forward. Boost has to look, think, and put the steps in the right order.",
          es: "Boost no puede apresurarse. Boost tiene que mirar, pensar y poner los pasos en el orden correcto.",
        },
        icon: "\uD83E\uDDE0",
      },
      {
        id: "bpp-s3",
        text: {
          en: "When we help Boost turn and move the right way, we are practicing sequencing. Sequencing means putting steps in order.",
          es: "Cuando ayudamos a Boost a girar y moverse correctamente, estamos practicando la secuenciaci\u00f3n. Secuenciar significa poner los pasos en orden.",
        },
        icon: "\uD83D\uDCCB",
      },
    ],
    questions: [
      {
        id: "bpp-q1",
        prompt: {
          en: "What is Boost trying to do?",
          es: "\u00bfQu\u00e9 intenta hacer Boost?",
        },
        choices: [
          { en: "Reach the charging station", es: "Llegar a la estaci\u00f3n de carga" },
          { en: "Go to sleep", es: "Irse a dormir" },
          { en: "Paint the wall", es: "Pintar la pared" },
        ],
        answerIndex: 0,
        hint: {
          en: "Read the first slide again \u2014 what is Boost's job today?",
          es: "Lee la primera diapositiva de nuevo \u2014 \u00bfcu\u00e1l es el trabajo de Boost hoy?",
        },
      },
      {
        id: "bpp-q2",
        prompt: {
          en: "What should Boost do first?",
          es: "\u00bfQu\u00e9 debe hacer Boost primero?",
        },
        choices: [
          { en: "Make a plan", es: "Hacer un plan" },
          { en: "Guess fast", es: "Adivinar r\u00e1pido" },
          { en: "Spin in circles", es: "Girar en c\u00edrculos" },
        ],
        answerIndex: 0,
        hint: {
          en: "Boost has to look and think before moving.",
          es: "Boost tiene que mirar y pensar antes de moverse.",
        },
      },
      {
        id: "bpp-q3",
        prompt: {
          en: "What does sequencing mean?",
          es: "\u00bfQu\u00e9 significa secuenciar?",
        },
        choices: [
          { en: "Putting steps in order", es: "Poner los pasos en orden" },
          { en: "Jumping over walls", es: "Saltar sobre paredes" },
          { en: "Moving as fast as possible", es: "Moverse lo m\u00e1s r\u00e1pido posible" },
        ],
        answerIndex: 0,
        hint: {
          en: "The last slide explains what sequencing means.",
          es: "La \u00faltima diapositiva explica qu\u00e9 significa secuenciar.",
        },
      },
    ],
  },

  rhymoRhymeRocket: {
    type: "story_quiz",
    slides: [
      {
        id: "rrr-s1",
        text: {
          en: "Rhymo is getting a rocket ready for takeoff. The rocket powers up when Rhymo hears words that sound the same at the end.",
          es: "Rhymo est\u00e1 preparando un cohete para despegar. El cohete se enciende cuando Rhymo escucha palabras que suenan igual al final.",
        },
        icon: "\uD83D\uDE80",
      },
      {
        id: "rrr-s2",
        text: {
          en: "If the words rhyme, the rocket glows brighter. If the words do not rhyme, Rhymo has to listen again.",
          es: "Si las palabras riman, el cohete brilla m\u00e1s. Si las palabras no riman, Rhymo tiene que escuchar de nuevo.",
        },
        icon: "\u2728",
      },
      {
        id: "rrr-s3",
        text: {
          en: "Good readers and listeners pay attention to sounds in words. Rhyming helps us notice patterns in language.",
          es: "Los buenos lectores y oyentes prestan atenci\u00f3n a los sonidos de las palabras. Rimar nos ayuda a notar patrones en el lenguaje.",
        },
        icon: "\uD83D\uDC42",
      },
    ],
    questions: [
      {
        id: "rrr-q1",
        prompt: {
          en: "What helps Rhymo's rocket power up?",
          es: "\u00bfQu\u00e9 ayuda a encender el cohete de Rhymo?",
        },
        choices: [
          { en: "Rhyming words", es: "Palabras que riman" },
          { en: "Loud stomping", es: "Pisotones fuertes" },
          { en: "Long naps", es: "Siestas largas" },
        ],
        answerIndex: 0,
        hint: {
          en: "The rocket powers up when Rhymo hears matching sounds.",
          es: "El cohete se enciende cuando Rhymo escucha sonidos iguales.",
        },
      },
      {
        id: "rrr-q2",
        prompt: {
          en: "What should Rhymo listen for?",
          es: "\u00bfQu\u00e9 debe escuchar Rhymo?",
        },
        choices: [
          { en: "Words that sound the same at the end", es: "Palabras que suenan igual al final" },
          { en: "The tallest word", es: "La palabra m\u00e1s alta" },
          { en: "The slowest word", es: "La palabra m\u00e1s lenta" },
        ],
        answerIndex: 0,
        hint: {
          en: "Rhyming words have the same ending sound.",
          es: "Las palabras que riman tienen el mismo sonido al final.",
        },
      },
      {
        id: "rrr-q3",
        prompt: {
          en: "What do rhyming words help us notice?",
          es: "\u00bfQu\u00e9 nos ayudan a notar las palabras que riman?",
        },
        choices: [
          { en: "Sound patterns", es: "Patrones de sonido" },
          { en: "Paint colors", es: "Colores de pintura" },
          { en: "Shoe sizes", es: "Tallas de zapatos" },
        ],
        answerIndex: 0,
        hint: {
          en: "The last slide talks about patterns in language.",
          es: "La \u00faltima diapositiva habla de patrones en el lenguaje.",
        },
      },
    ],
  },

  buddyGardenSort: {
    type: "story_quiz",
    slides: [
      {
        id: "bgs-s1",
        text: {
          en: "Buddy is helping grow a tiny school garden. Some cards show plant parts. Some cards show things plants need to grow.",
          es: "Buddy est\u00e1 ayudando a cultivar un peque\u00f1o jard\u00edn escolar. Algunas tarjetas muestran partes de plantas. Algunas tarjetas muestran cosas que las plantas necesitan para crecer.",
        },
        icon: "\uD83C\uDF31",
      },
      {
        id: "bgs-s2",
        text: {
          en: "Plants need sunlight, water, air, and soil. Plants also have parts like roots, stems, and leaves.",
          es: "Las plantas necesitan luz solar, agua, aire y tierra. Las plantas tambi\u00e9n tienen partes como ra\u00edces, tallos y hojas.",
        },
        icon: "\u2600\uFE0F",
      },
      {
        id: "bgs-s3",
        text: {
          en: "When we sort carefully, we learn what plants need and how each plant part helps the whole plant.",
          es: "Cuando clasificamos cuidadosamente, aprendemos lo que las plantas necesitan y c\u00f3mo cada parte de la planta ayuda a toda la planta.",
        },
        icon: "\uD83C\uDF3F",
      },
    ],
    questions: [
      {
        id: "bgs-q1",
        prompt: {
          en: "Which of these is something a plant needs?",
          es: "\u00bfCu\u00e1l de estos es algo que una planta necesita?",
        },
        choices: [
          { en: "Water", es: "Agua" },
          { en: "A toy car", es: "Un carro de juguete" },
          { en: "A pillow", es: "Una almohada" },
        ],
        answerIndex: 0,
        hint: {
          en: "Think about what helps a plant grow.",
          es: "Piensa en qu\u00e9 ayuda a una planta a crecer.",
        },
      },
      {
        id: "bgs-q2",
        prompt: {
          en: "Which of these is a plant part?",
          es: "\u00bfCu\u00e1l de estos es una parte de la planta?",
        },
        choices: [
          { en: "Leaf", es: "Hoja" },
          { en: "Television", es: "Televisi\u00f3n" },
          { en: "Backpack", es: "Mochila" },
        ],
        answerIndex: 0,
        hint: {
          en: "Roots, stems, and leaves are all plant parts.",
          es: "Las ra\u00edces, los tallos y las hojas son todas partes de la planta.",
        },
      },
      {
        id: "bgs-q3",
        prompt: {
          en: "Why are we sorting the cards?",
          es: "\u00bfPor qu\u00e9 estamos clasificando las tarjetas?",
        },
        choices: [
          { en: "To learn about plant needs and parts", es: "Para aprender sobre las necesidades y partes de las plantas" },
          { en: "To race as fast as possible", es: "Para correr lo m\u00e1s r\u00e1pido posible" },
          { en: "To hide the cards", es: "Para esconder las tarjetas" },
        ],
        answerIndex: 0,
        hint: {
          en: "Sorting helps us learn how plants work.",
          es: "Clasificar nos ayuda a aprender c\u00f3mo funcionan las plantas.",
        },
      },
    ],
  },

  tankTrek: {
    type: "story_quiz",
    slides: [
      {
        id: "tt-s1",
        text: {
          en: "Bolt the helper bot sees a glowing green goal across the training room.",
          es: "Bolt el robot ayudante ve una meta verde brillante al otro lado de la sala de entrenamiento.",
        },
        icon: "\uD83E\uDD16",
      },
      {
        id: "tt-s2",
        text: {
          en: "There are walls in the way, so Bolt has to turn, move carefully, and follow a smart path.",
          es: "Hay paredes en el camino, as\u00ed que Bolt tiene que girar, moverse con cuidado y seguir un camino inteligente.",
        },
        icon: "\uD83E\uDDF1",
      },
      {
        id: "tt-s3",
        text: {
          en: "Good problem-solvers do not rush. They stop, think, and choose the next step.",
          es: "Los buenos solucionadores de problemas no se apresuran. Se detienen, piensan y eligen el siguiente paso.",
        },
        icon: "\uD83D\uDCA1",
      },
    ],
    questions: [
      {
        id: "tt-q1",
        prompt: {
          en: "Where does Bolt want to go?",
          es: "\u00bfA d\u00f3nde quiere ir Bolt?",
        },
        choices: [
          { en: "To the glowing goal", es: "A la meta brillante" },
          { en: "To the wall", es: "A la pared" },
          { en: "To sleep", es: "A dormir" },
        ],
        answerIndex: 0,
        hint: {
          en: "Bolt sees something glowing green.",
          es: "Bolt ve algo brillando en verde.",
        },
      },
      {
        id: "tt-q2",
        prompt: {
          en: "What should Bolt do before moving?",
          es: "\u00bfQu\u00e9 debe hacer Bolt antes de moverse?",
        },
        choices: [
          { en: "Make a plan", es: "Hacer un plan" },
          { en: "Guess fast", es: "Adivinar r\u00e1pido" },
          { en: "Close its eyes", es: "Cerrar los ojos" },
        ],
        answerIndex: 0,
        hint: {
          en: "Good problem-solvers stop and think first.",
          es: "Los buenos solucionadores de problemas se detienen y piensan primero.",
        },
      },
      {
        id: "tt-q3",
        prompt: {
          en: "Why does Bolt need to turn?",
          es: "\u00bfPor qu\u00e9 Bolt necesita girar?",
        },
        choices: [
          { en: "To go around walls", es: "Para rodear las paredes" },
          { en: "To make a loud sound", es: "Para hacer un sonido fuerte" },
          { en: "To hide the goal", es: "Para esconder la meta" },
        ],
        answerIndex: 0,
        hint: {
          en: "There are walls in the way.",
          es: "Hay paredes en el camino.",
        },
      },
    ],
  },

  quantumQuest: {
    type: "story_quiz",
    slides: [
      {
        id: "qq-s1",
        text: {
          en: "Nova is a young space explorer. The star ship needs number power to fly.",
          es: "Nova es una joven exploradora espacial. La nave estelar necesita poder num\u00e9rico para volar.",
        },
        icon: "\uD83D\uDE80",
      },
      {
        id: "qq-s2",
        text: {
          en: "Nova counts carefully, solves simple math problems, and looks for number patterns.",
          es: "Nova cuenta cuidadosamente, resuelve problemas matem\u00e1ticos simples y busca patrones num\u00e9ricos.",
        },
        icon: "\uD83D\uDD22",
      },
      {
        id: "qq-s3",
        text: {
          en: "The best explorers do not just tap quickly. They slow down, think, and pick the best answer.",
          es: "Los mejores exploradores no tocan r\u00e1pidamente. Se toman su tiempo, piensan y eligen la mejor respuesta.",
        },
        icon: "\u2B50",
      },
    ],
    questions: [
      {
        id: "qq-q1",
        prompt: {
          en: "What powers Nova's star ship?",
          es: "\u00bfQu\u00e9 impulsa la nave estelar de Nova?",
        },
        choices: [
          { en: "Correct math answers", es: "Respuestas matem\u00e1ticas correctas" },
          { en: "A sandwich", es: "Un s\u00e1ndwich" },
          { en: "A rain cloud", es: "Una nube de lluvia" },
        ],
        answerIndex: 0,
        hint: {
          en: "The star ship needs number power.",
          es: "La nave estelar necesita poder num\u00e9rico.",
        },
      },
      {
        id: "qq-q2",
        prompt: {
          en: "What does Nova do carefully?",
          es: "\u00bfQu\u00e9 hace Nova cuidadosamente?",
        },
        choices: [
          { en: "Count and compare numbers", es: "Contar y comparar n\u00fameros" },
          { en: "Paint the moon", es: "Pintar la luna" },
          { en: "Hide the stars", es: "Esconder las estrellas" },
        ],
        answerIndex: 0,
        hint: {
          en: "Nova solves math problems and looks for patterns.",
          es: "Nova resuelve problemas matem\u00e1ticos y busca patrones.",
        },
      },
      {
        id: "qq-q3",
        prompt: {
          en: "What do good explorers do?",
          es: "\u00bfQu\u00e9 hacen los buenos exploradores?",
        },
        choices: [
          { en: "Think before choosing", es: "Pensar antes de elegir" },
          { en: "Always guess", es: "Siempre adivinar" },
          { en: "Skip the numbers", es: "Saltarse los n\u00fameros" },
        ],
        answerIndex: 0,
        hint: {
          en: "The best explorers slow down and think.",
          es: "Los mejores exploradores se toman su tiempo y piensan.",
        },
      },
    ],
  },
};

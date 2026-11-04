const devices =
  "Tabletas o computadoras con acceso a internet (una por estudiante o pareja).";
const platform = "Actividad en BrightBoost";
const discussion = "Conversación en grupo con las preguntas de cierre";
export const SPANISH_PREP: Record<
  string,
  {
    objectives: string[];
    vocabulary: { term: string; definition: string }[];
    prerequisites: string[];
    misconceptions: string[];
    discussionBefore: string[];
    discussionAfter: string[];
    turnAndTalk: string[];
    materials: string[];
    pacingLabels: string[];
  }
> = {
  "k2-stem-rhyme-ride": {
    objectives: [
      "Reconocer palabras que terminan con el mismo sonido.",
      "Emparejar palabras que riman para practicar la conciencia fonológica.",
      "Relacionar las rimas con los patrones de las palabras y la fluidez lectora.",
    ],
    vocabulary: [
      {
        term: "Rima",
        definition:
          "Dos palabras riman cuando sus sonidos finales coinciden, como «gato» y «pato».",
      },
      {
        term: "Sonido",
        definition: "Lo que oímos al decir una palabra en voz alta.",
      },
      { term: "Patrón", definition: "Algo que se repite de manera regular." },
      {
        term: "Palabras con la misma terminación",
        definition:
          "Palabras que comparten letras y sonidos al final, como «casa» y «tasa».",
      },
    ],
    prerequisites: [
      "Distinguir sonidos dentro de una palabra.",
      "Reconocer palabras cortas y conocidas.",
      "Distinguir el sonido inicial del final.",
    ],
    misconceptions: [
      "Empezar con el mismo sonido no basta para rimar: comparen las terminaciones.",
      "Para encontrar una rima hay que escuchar, aunque las letras no sean iguales; por ejemplo, «tuvo» y «cubo».",
      "Dos palabras pueden rimar aunque signifiquen cosas muy distintas.",
    ],
    discussionBefore: [
      "¿Qué palabras suenan igual al final, como «gato» y «pato»?",
      "¿Para qué sirven las rimas en una canción o un poema?",
      "Si digo «ratón», ¿qué palabra rima con ella?",
    ],
    discussionAfter: [
      "¿Qué parejas de palabras recuerdan del juego? ¿Cuáles les costaron más?",
      "¿Cómo les ayuda reconocer rimas al leer algo nuevo?",
      "¿Pueden inventar una oración divertida con dos palabras que rimen?",
    ],
    turnAndTalk: [
      "Dile una palabra a tu pareja. ¿Puede encontrar otra que rime?",
      "Elijan un animal y busquen juntos una palabra que rime con su nombre.",
    ],
    materials: [
      devices,
      "Opcional: tarjetas de palabras que riman para empezar sin pantallas.",
      "Opcional: papel grande para un mural de rimas.",
    ],
    pacingLabels: [
      "Calentamiento: dar palmadas al oír una rima",
      "Introducción: ¿qué hace que dos palabras rimen?",
      platform,
      discussion,
      "Salida: escribir o dibujar dos parejas de palabras que rimen",
    ],
  },
  "k2-stem-bounce-buds": {
    objectives: [
      "Reconocer que todos los seres vivos están formados por células.",
      "Identificar microbios que benefician a los seres vivos.",
      "Relacionar lo aprendido con hábitos cotidianos, como lavarse las manos.",
    ],
    vocabulary: [
      {
        term: "Célula",
        definition: "La unidad más pequeña que forma a los seres vivos.",
      },
      {
        term: "Microbio",
        definition:
          "Un ser vivo tan pequeño que hace falta un microscopio para verlo.",
      },
      {
        term: "Microscopio",
        definition: "Instrumento que amplía la imagen de cosas diminutas.",
      },
      {
        term: "Salud",
        definition: "El buen funcionamiento y bienestar del cuerpo.",
      },
    ],
    prerequisites: [
      "Reconocer que las personas, los animales y las plantas son seres vivos.",
      "Comparar tamaños grandes y pequeños.",
      "Conocer hábitos de higiene, como lavarse las manos y cepillarse los dientes.",
    ],
    misconceptions: [
      "Algunos microbios nos benefician; por ejemplo, ciertas bacterias del intestino.",
      "Las células no son exclusivas de los seres humanos: todos los seres vivos tienen células.",
      "Mirar más de cerca no basta para ver la mayoría de las células: se necesita un microscopio.",
    ],
    discussionBefore: [
      "¿Cuál es el ser vivo más pequeño que conocen? ¿Puede estar vivo aunque no lo veamos?",
      "¿Por qué nos lavamos las manos antes de comer? ¿Qué queremos quitar?",
      "¿Alguna vez miraron algo con una lupa? ¿Qué vieron?",
    ],
    discussionAfter: [
      "¿Qué les sorprendió de las células y los microbios? ¿Cómo pueden ayudarnos algunos microbios?",
      "Si tuvieran un microscopio, ¿qué mirarían primero?",
      "¿Cómo usarían lo que aprendieron sobre los microbios para cuidar su salud?",
    ],
    turnAndTalk: [
      "Cuéntale a tu pareja qué es una célula y algo que aprendiste sobre ella.",
      "Comparte una manera de cuidar tu cuerpo.",
    ],
    materials: [
      devices,
      "Opcional: lupas para explorar objetos.",
      "Opcional: imágenes impresas o proyectadas de células vistas al microscopio.",
    ],
    pacingLabels: [
      "Calentamiento: ¿qué es lo más pequeño que conocen?",
      "Introducción: el pequeño mundo de las células",
      platform,
      discussion,
      "Salida: dibujar una célula y señalar sus partes",
    ],
  },
  "k2-stem-gotcha-gears": {
    objectives: [
      "Reconocer que los robots y los sistemas de IA siguen instrucciones creadas por personas.",
      "Planificar los pasos antes de actuar y tomar decisiones durante el juego.",
      "Aprender que depurar consiste en encontrar y corregir errores en un plan.",
    ],
    vocabulary: [
      {
        term: "Robot",
        definition: "Máquina que sigue instrucciones para realizar una tarea.",
      },
      {
        term: "Inteligencia artificial (IA)",
        definition:
          "Tecnología que permite a una computadora aprender de ejemplos y tomar decisiones.",
      },
      {
        term: "Plan",
        definition: "Los pasos que pensamos seguir antes de actuar.",
      },
      {
        term: "Depurar",
        definition:
          "Encontrar y corregir un error en un plan o en un programa.",
      },
    ],
    prerequisites: [
      "Saber que las personas construyen las máquinas y las computadoras.",
      "Seguir reglas sencillas de un juego.",
      "Reconocer una causa y su efecto: si hago esto, ocurre aquello.",
    ],
    misconceptions: [
      "Los robots pueden parecer humanos, pero no sienten como las personas.",
      "La IA no es magia: las personas diseñan instrucciones y usan ejemplos para que reconozca patrones.",
      "Encontrar un error no significa que algo esté roto para siempre: se puede probar otra solución.",
    ],
    discussionBefore: [
      "¿Han visto un robot? ¿Qué hacía? ¿Quién le dio las instrucciones?",
      "Si construyeran un robot para ayudarles, ¿qué tarea le darían?",
      "Cuando se equivocan en un dibujo, ¿cómo lo corrigen? ¿En qué se parece a depurar?",
    ],
    discussionAfter: [
      "¿Qué ayuda necesitaba Gearbot? ¿Cómo resolvieron el problema?",
      "¿Qué les sorprendió de cómo siguen instrucciones los robots?",
      "Si programaran un robot que ayudara en la escuela, ¿qué haría?",
    ],
    turnAndTalk: [
      "Dile a tu pareja qué tarea podría hacer un robot en tu casa.",
      "Recuerda la partida y comparte con tu pareja qué estrategia usaste.",
    ],
    materials: [
      devices,
      "Opcional: un robot de juguete o imágenes de distintos robots para conversar.",
      "Opcional: papel y crayones para diseñar un robot.",
    ],
    pacingLabels: [
      "Calentamiento: ¿qué saben de los robots?",
      "Introducción: ¿cómo siguen instrucciones los robots?",
      platform,
      discussion,
      "Salida: dibujar un robot que ayude con una tarea",
    ],
  },
};

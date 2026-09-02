/**
 * Biome Buddy — localized CONTENT data (design §4, §7).
 *
 * Science cards, why-lines, labels and the name kit are data-shaped (many
 * options × several parts), so they live here as `{ en, es }` objects read
 * through `pickLocale()` (`src/utils/localizedContent.ts`) — the Track Maker
 * name-kit pattern — instead of hundreds of scattered UI keys. UI chrome
 * (buttons, headings, announcements) stays in `src/locales/{en,es}/common.json`
 * under `biomeBuddy.*`.
 *
 * Every string here is child-facing: one short sentence per part, the formal
 * term kept in its own field so it can be shown in parentheses. "more" is the
 * expandable "Tell me more" paragraph. Real biology only — no invented parts.
 *
 * Share links carry IDS, never these labels, so the same link renders in the
 * recipient's active language.
 */
import type {
  AnyOptionId,
  Biome,
  Category,
  NameAdjective,
  NameNoun,
  OptionId,
  Pattern,
  Stat,
} from "./biomeBuddyModel";

export type Localized = { en: string; es: string };

/** Locales this content is complete in. The page-scoped LanguageToggle only
 *  offers these so no child-visible surface mixes languages. */
export const BIOME_BUDDY_LOCALES = ["en", "es"] as const;

// ── Biomes ──────────────────────────────────────────────────────────────────

export interface BiomeInfo {
  label: Localized;
  /** Kid-facing subtitle that keeps the four-elements theme honest
   *  ("Fire" = desert & volcano, not a habitat made of fire). */
  subtitle: Localized;
  /** "in the Water" / "en el Agua" — carries the article and gender so
   *  templates never glue an English-shaped preposition onto a label. */
  inPhrase: Localized;
  /** Four kid-level sentences: temperature, animals, plants, sights. */
  description: Localized;
  fauna: Localized;
}

export const BIOME_INFO: Record<Biome, BiomeInfo> = {
  earth: {
    label: { en: "Earth", es: "Tierra" },
    inPhrase: { en: "in the Earth", es: "en la Tierra" },
    subtitle: { en: "Forest floor & jungle", es: "Suelo del bosque y selva" },
    description: {
      en: "It is shady and damp under the trees. Leaves and roots cover the ground. Beetles, frogs, foxes and snakes live here. There are lots of places to hide and lots of things to sniff.",
      es: "Bajo los árboles hay sombra y humedad. Las hojas y las raíces cubren el suelo. Aquí viven escarabajos, ranas, zorros y serpientes. Hay muchos sitios para esconderse y muchas cosas que oler.",
    },
    fauna: {
      en: "beetles · foxes · deer · tree frogs · snakes",
      es: "escarabajos · zorros · ciervos · ranas arborícolas · serpientes",
    },
  },
  water: {
    label: { en: "Water", es: "Agua" },
    inPhrase: { en: "in the Water", es: "en el Agua" },
    subtitle: {
      en: "Pond, swamp & shallows",
      es: "Estanque, pantano y orilla",
    },
    description: {
      en: "It is wet everywhere here: ponds, swamps and the edge of the sea. The water can be murky or clear, still or rushing. Fish, otters, ducks, crabs and axolotls live here. Smells and sounds travel through water in surprising ways.",
      es: "Aquí todo está mojado: estanques, pantanos y la orilla del mar. El agua puede ser turbia o clara, quieta o rápida. Aquí viven peces, nutrias, patos, cangrejos y ajolotes. Los olores y los sonidos viajan por el agua de formas sorprendentes.",
    },
    fauna: {
      en: "fish · otters · ducks · crabs · axolotls",
      es: "peces · nutrias · patos · cangrejos · ajolotes",
    },
  },
  fire: {
    label: { en: "Fire", es: "Fuego" },
    inPhrase: { en: "in the Fire", es: "en el Fuego" },
    subtitle: { en: "Desert & volcano", es: "Desierto y volcán" },
    description: {
      en: "It is hot and dry, with sand dunes and black volcanic rock. Days are burning hot and nights get cold. Camels, fennec foxes, sidewinder snakes and scorpions live here. Water is hard to find, so every drop counts.",
      es: "Hace calor y todo está seco, con dunas de arena y roca volcánica negra. Los días queman y las noches son frías. Aquí viven camellos, zorros del desierto, cascabeles cornudas y escorpiones. El agua es difícil de encontrar, así que cada gota cuenta.",
    },
    fauna: {
      en: "camels · fennec foxes · sidewinders · thorny devils · scorpions",
      es: "camellos · zorros del desierto · cascabeles cornudas · diablos espinosos · escorpiones",
    },
  },
  air: {
    label: { en: "Air", es: "Aire" },
    inPhrase: { en: "in the Air", es: "en el Aire" },
    subtitle: {
      en: "Windy cliffs & high canopy",
      es: "Acantilados ventosos y copas altas",
    },
    description: {
      en: "Up here the wind blows hard across cliffs and treetops. You can see a long way, and the air is thin and cool. Hawks, bats, dragonflies and gliding squirrels live here. There are few places to hide, so being quick and sharp-eyed helps.",
      es: "Aquí arriba el viento sopla fuerte entre acantilados y copas de árboles. Se ve muy lejos, y el aire es fresco y ligero. Aquí viven halcones, murciélagos, libélulas y ardillas voladoras. Hay pocos sitios para esconderse, así que ayuda ser rápido y tener buena vista.",
    },
    fauna: {
      en: "hawks · bats · dragonflies · gliding squirrels · mountain goats",
      es: "halcones · murciélagos · libélulas · ardillas voladoras · cabras montesas",
    },
  },
};

export const STAT_LABEL: Record<Stat, Localized> = {
  sight: { en: "Sight", es: "Vista" },
  hearing: { en: "Hearing", es: "Oído" },
  smell: { en: "Smell", es: "Olfato" },
  agility: { en: "Agility", es: "Agilidad" },
};

export const CATEGORY_LABEL: Record<Category | "pattern", Localized> = {
  eyes: { en: "Eyes", es: "Ojos" },
  ears: { en: "Ears", es: "Orejas" },
  nose: { en: "Nose & Breathing", es: "Nariz y respiración" },
  movement: { en: "Movement", es: "Movimiento" },
  covering: { en: "Body Covering", es: "Cubierta del cuerpo" },
  pattern: { en: "Color & Pattern", es: "Color y patrón" },
};

// ── Science cards ───────────────────────────────────────────────────────────

export interface ScienceCard {
  label: Localized;
  /** Formal / scientific term. */
  term: Localized;
  what: Localized;
  usedFor: Localized;
  evolved: Localized;
  animals: Localized;
  where: Localized;
  affects: Localized;
  /** "Tell me more" — one deeper paragraph. */
  more: Localized;
}

type CardTable = { [C in Category]: Record<OptionId<C>, ScienceCard> };

export const SCIENCE: CardTable = {
  eyes: {
    no_eyes: {
      label: { en: "No eyes", es: "Sin ojos" },
      term: { en: "eyeless / troglobite", es: "sin ojos / troglobio" },
      what: {
        en: "Skin grows where eyes would be.",
        es: "Donde irían los ojos, crece piel.",
      },
      usedFor: {
        en: "Saving energy where there is no light to see by.",
        es: "Ahorrar energía donde no hay luz para ver.",
      },
      evolved: {
        en: "In pitch-dark caves, animals born with smaller eyes did just as well and saved energy, so over many generations eyes faded away.",
        es: "En cuevas totalmente oscuras, a los animales que nacían con ojos más pequeños les iba igual de bien y ahorraban energía, así que con muchas generaciones los ojos desaparecieron.",
      },
      animals: {
        en: "Cave salamanders, cave fish, some cave beetles.",
        es: "Salamandras de cueva, peces de cueva, algunos escarabajos de cueva.",
      },
      where: {
        en: "Deep caves in Europe, Mexico and the United States.",
        es: "Cuevas profundas de Europa, México y Estados Unidos.",
      },
      affects: {
        en: "Other senses get sharper: touch, hearing and smell do the seeing.",
        es: "Los otros sentidos se agudizan: el tacto, el oído y el olfato hacen de ojos.",
      },
      more: {
        en: "Eyes cost energy to grow and run. In total darkness they give nothing back, so over thousands of generations animals that spent less on eyes did just as well. The olm, a cave salamander, still has tiny eyes under its skin that can sense light but not shapes.",
        es: "Los ojos cuestan energía para crecer y funcionar. En la oscuridad total no sirven de nada, así que, con miles de generaciones, a los animales que gastaban menos en ojos les fue igual de bien. El proteo, una salamandra de cueva, aún tiene ojos diminutos bajo la piel que notan la luz pero no las formas.",
      },
    },
    rotating_eyes: {
      label: { en: "Swivel eyes", es: "Ojos giratorios" },
      term: {
        en: "independently rotating eyes",
        es: "ojos de rotación independiente",
      },
      what: {
        en: "Each eye can turn on its own, like two little periscopes.",
        es: "Cada ojo gira por su cuenta, como dos periscopios.",
      },
      usedFor: {
        en: "Watching two directions at once, then locking both eyes on a bug.",
        es: "Mirar dos direcciones a la vez y luego fijar los dos ojos en un bicho.",
      },
      evolved: {
        en: "Slow hunters that sit still on branches did better when they could scan without moving.",
        es: "A los cazadores lentos que se quedan quietos en las ramas les fue mejor al poder mirar sin moverse.",
      },
      animals: {
        en: "Chameleons.",
        es: "Camaleones.",
      },
      where: {
        en: "Forests of Madagascar and Africa.",
        es: "Bosques de Madagascar y África.",
      },
      affects: {
        en: "Big eye muscles and a brain that can handle two pictures at once.",
        es: "Músculos grandes en los ojos y un cerebro que maneja dos imágenes a la vez.",
      },
      more: {
        en: "A chameleon's eyes sit in cone-shaped turrets and can look in different directions at the same time. When it spots prey, both eyes swing forward so it can judge distance exactly before its tongue shoots out. This works best in air; underwater, eyes shaped for air see blurry.",
        es: "Los ojos del camaleón están en torretas con forma de cono y pueden mirar en direcciones distintas al mismo tiempo. Cuando ve una presa, los dos ojos giran hacia delante para calcular la distancia antes de lanzar la lengua. Funciona mejor en el aire; bajo el agua, unos ojos hechos para el aire ven borroso.",
      },
    },
    wide_set_eyes: {
      label: { en: "Wide-set eyes", es: "Ojos a los lados" },
      term: {
        en: "lateral eyes (360° vision)",
        es: "ojos laterales (visión de 360°)",
      },
      what: {
        en: "Eyes on the sides of the head that see almost all the way around.",
        es: "Ojos a los lados de la cabeza que ven casi todo alrededor.",
      },
      usedFor: {
        en: "Spotting a hunter sneaking up from behind.",
        es: "Ver a un cazador que se acerca por detrás.",
      },
      evolved: {
        en: "Animals that get hunted did better when nothing could surprise them.",
        es: "A los animales que son cazados les fue mejor cuando nada podía sorprenderlos.",
      },
      animals: {
        en: "Rabbits, deer, woodcocks, horses.",
        es: "Conejos, ciervos, chochas, caballos.",
      },
      where: {
        en: "Open fields, deserts and forest edges all over the world.",
        es: "Campos abiertos, desiertos y bordes de bosque de todo el mundo.",
      },
      affects: {
        en: "Great for spotting danger, but harder to judge exact distance in front.",
        es: "Genial para ver el peligro, pero cuesta más calcular la distancia de frente.",
      },
      more: {
        en: "A rabbit can see almost a full circle without turning its head, with only a small blind spot right in front of its nose. Wide-set eyes trade depth perception for coverage, which is a great deal in open places where the danger comes from far away.",
        es: "Un conejo ve casi un círculo completo sin girar la cabeza, con un pequeño punto ciego justo delante de la nariz. Los ojos a los lados cambian la percepción de profundidad por cobertura, un buen trato en lugares abiertos donde el peligro viene de lejos.",
      },
    },
    compound_eyes: {
      label: { en: "Compound eyes", es: "Ojos compuestos" },
      term: {
        en: "compound eyes (ommatidia)",
        es: "ojos compuestos (omatidios)",
      },
      what: {
        en: "One eye made of thousands of tiny eyes packed together.",
        es: "Un ojo hecho de miles de ojitos juntos.",
      },
      usedFor: {
        en: "Catching the tiniest movement, even behind you.",
        es: "Notar el movimiento más pequeño, incluso por detrás.",
      },
      evolved: {
        en: "Fast flying insects did better when they could see motion in every direction at once.",
        es: "A los insectos voladores rápidos les fue mejor al ver el movimiento en todas direcciones a la vez.",
      },
      animals: {
        en: "Dragonflies, flies, bees, crabs.",
        es: "Libélulas, moscas, abejas, cangrejos.",
      },
      where: {
        en: "Almost everywhere insects live, from ponds to mountain tops.",
        es: "Casi en todos los sitios donde viven insectos, de estanques a montañas.",
      },
      affects: {
        en: "Super motion sense but blurry detail; the brain works fast to keep up.",
        es: "Sentido del movimiento genial pero poco detalle; el cerebro trabaja rápido para seguir el ritmo.",
      },
      more: {
        en: "A dragonfly's eye has up to 30,000 facets, each pointing a slightly different way. It cannot read a sign, but it notices a wing-beat from far off and can catch prey in mid-air nine times out of ten. In murky water the facets get little light and the picture fades.",
        es: "El ojo de una libélula tiene hasta 30 000 facetas, cada una mirando en una dirección un poco distinta. No podría leer un cartel, pero nota un aleteo desde lejos y atrapa presas en el aire nueve de cada diez veces. En agua turbia las facetas reciben poca luz y la imagen se apaga.",
      },
    },
  },
  ears: {
    hidden_ears: {
      label: { en: "Hidden ear holes", es: "Oídos escondidos" },
      term: {
        en: "no pinna (ear opening)",
        es: "sin pabellón (abertura auditiva)",
      },
      what: {
        en: "Ear openings under feathers or scales, with no flap on the outside.",
        es: "Aberturas del oído bajo plumas o escamas, sin oreja por fuera.",
      },
      usedFor: {
        en: "Hearing while staying smooth and streamlined.",
        es: "Oír mientras el cuerpo sigue liso y aerodinámico.",
      },
      evolved: {
        en: "Flyers and swimmers did better without flaps that catch wind or water.",
        es: "A los voladores y nadadores les fue mejor sin orejas que frenan en el viento o el agua.",
      },
      animals: {
        en: "Birds, lizards, seals.",
        es: "Aves, lagartos, focas.",
      },
      where: {
        en: "Skies, cliffs and coasts everywhere.",
        es: "Cielos, acantilados y costas de todo el mundo.",
      },
      affects: {
        en: "Less drag when moving fast; sounds are a bit quieter without a flap to gather them.",
        es: "Menos freno al moverse rápido; los sonidos llegan un poco más bajos sin oreja que los recoja.",
      },
      more: {
        en: "Owls hear brilliantly with no outer ears at all: the feathers of their face form a dish that funnels sound to ear openings hidden underneath. Smooth heads slip through air and water, which is why almost no bird or fish has ear flaps.",
        es: "Los búhos oyen de maravilla sin orejas: las plumas de la cara forman un plato que lleva el sonido a las aberturas escondidas debajo. Las cabezas lisas cortan el aire y el agua, y por eso casi ninguna ave ni pez tiene orejas.",
      },
    },
    pinna: {
      label: { en: "Big ear flaps", es: "Orejas grandes" },
      term: {
        en: "pinna (outer ear)",
        es: "pabellón auricular (oreja externa)",
      },
      what: {
        en: "Large skin-and-cartilage flaps that catch sound like satellite dishes.",
        es: "Grandes orejas de piel y cartílago que atrapan el sonido como antenas.",
      },
      usedFor: {
        en: "Hearing tiny sounds, and dumping body heat in hot places.",
        es: "Oír sonidos diminutos y soltar el calor del cuerpo en sitios calurosos.",
      },
      evolved: {
        en: "Desert hunters did better with ears that heard bugs under the sand and cooled them down.",
        es: "A los cazadores del desierto les fue mejor con orejas que oían bichos bajo la arena y los refrescaban.",
      },
      animals: {
        en: "Fennec foxes, jackrabbits, elephants, bats.",
        es: "Zorros del desierto, liebres, elefantes, murciélagos.",
      },
      where: {
        en: "The Sahara, dry grasslands, and caves.",
        es: "El Sáhara, praderas secas y cuevas.",
      },
      affects: {
        en: "Blood flows through the ears to cool the body; big flaps drag in wind and fill with water.",
        es: "La sangre pasa por las orejas para enfriar el cuerpo; las orejas grandes frenan con el viento y se llenan de agua.",
      },
      more: {
        en: "A fennec fox's ears are about half as long as its body. They funnel the faintest scratching of a beetle under the sand, and the many blood vessels inside act like a radiator, letting heat escape. Underwater the flap stops helping: sound moves through water differently and reaches the inner ear through the skull instead.",
        es: "Las orejas del zorro del desierto miden casi la mitad de su cuerpo. Recogen el rasguño más leve de un escarabajo bajo la arena, y los muchos vasos sanguíneos de dentro funcionan como un radiador que deja escapar el calor. Bajo el agua la oreja deja de ayudar: el sonido viaja distinto y llega al oído interno a través del cráneo.",
      },
    },
    jaw_vibration: {
      label: { en: "Jaw hearing", es: "Oír con la mandíbula" },
      term: {
        en: "bone conduction via jaw",
        es: "conducción ósea por la mandíbula",
      },
      what: {
        en: "No ears on the outside; the jawbone feels shaking in the ground.",
        es: "Sin orejas por fuera; el hueso de la mandíbula siente las vibraciones del suelo.",
      },
      usedFor: {
        en: "Feeling footsteps coming through rock, soil and sand.",
        es: "Sentir pasos que llegan por la roca, la tierra y la arena.",
      },
      evolved: {
        en: "Animals that press their heads to the ground did better when their bones carried the shaking to the inner ear.",
        es: "A los animales que apoyan la cabeza en el suelo les fue mejor cuando sus huesos llevaban la vibración al oído interno.",
      },
      animals: {
        en: "Snakes, some lizards, elephants through their feet.",
        es: "Serpientes, algunos lagartos, y los elefantes a través de las patas.",
      },
      where: {
        en: "Forest floors and deserts on every continent except Antarctica.",
        es: "Suelos de bosque y desiertos de todos los continentes menos la Antártida.",
      },
      affects: {
        en: "Works only with something solid to touch; a smooth head is easy to push through burrows.",
        es: "Solo funciona tocando algo sólido; una cabeza lisa entra fácil en las madrigueras.",
      },
      more: {
        en: "A snake has no eardrum and no outer ear. Its lower jaw rests on the ground and passes vibrations to a tiny bone connected to the inner ear, so it senses footsteps long before it could see who is coming. On a windy cliff with nothing to rest against, this sense has little to feel.",
        es: "La serpiente no tiene tímpano ni oreja. Su mandíbula inferior se apoya en el suelo y pasa las vibraciones a un huesecillo conectado al oído interno, así que siente los pasos mucho antes de ver quién llega. En un acantilado ventoso, sin nada en que apoyarse, este sentido tiene poco que sentir.",
      },
    },
    tympanum: {
      label: { en: "Skin eardrum", es: "Tímpano en la piel" },
      term: { en: "tympanum", es: "tímpano externo" },
      what: {
        en: "A round patch of thin skin behind the eye that works as an eardrum.",
        es: "Un círculo de piel fina detrás del ojo que funciona como tímpano.",
      },
      usedFor: {
        en: "Hearing calls from other frogs across a pond, in and out of the water.",
        es: "Oír las llamadas de otras ranas por todo el estanque, dentro y fuera del agua.",
      },
      evolved: {
        en: "Animals that live half in water did better with an eardrum that works in both.",
        es: "A los animales que viven mitad en el agua les fue mejor con un tímpano que funciona en las dos partes.",
      },
      animals: {
        en: "Frogs, toads, many lizards.",
        es: "Ranas, sapos, muchos lagartos.",
      },
      where: {
        en: "Ponds, wetlands and damp forests worldwide.",
        es: "Estanques, humedales y bosques húmedos de todo el mundo.",
      },
      affects: {
        en: "Thin skin must stay moist, so hot dry places make it crack and stop working well.",
        es: "La piel fina debe estar húmeda, así que en sitios calientes y secos se agrieta y funciona peor.",
      },
      more: {
        en: "You can see a frog's eardrum as a flat disc on the side of its head. Because it is on the outside, it picks up sound waves from air and from water, which is perfect for an animal that calls from the pond edge. Some frogs even hear through their lungs, which vibrate and pass the sound inward.",
        es: "El tímpano de la rana se ve como un disco plano en el lado de la cabeza. Como está por fuera, capta ondas de sonido del aire y del agua, perfecto para un animal que canta desde la orilla. Algunas ranas incluso oyen con los pulmones, que vibran y pasan el sonido hacia dentro.",
      },
    },
  },
  nose: {
    gills: {
      label: { en: "Gills & water-nose", es: "Branquias y nariz de agua" },
      term: { en: "gills (branchiae) + nares", es: "branquias + narinas" },
      what: {
        en: "Feathery slits that breathe water, plus two tiny nostril pits that sniff it.",
        es: "Rendijas con forma de pluma que respiran agua, y dos hoyitos de nariz que la olfatean.",
      },
      usedFor: {
        en: "Breathing with the gills and sniffing with the nostril pits, all underwater.",
        es: "Respirar con las branquias y olfatear con los hoyitos de la nariz, todo bajo el agua.",
      },
      evolved: {
        en: "The first animals lived in water, and gills came long before lungs.",
        es: "Los primeros animales vivían en el agua, y las branquias llegaron mucho antes que los pulmones.",
      },
      animals: {
        en: "Fish, sharks, axolotls, tadpoles.",
        es: "Peces, tiburones, ajolotes, renacuajos.",
      },
      where: {
        en: "Every ocean, lake and river on Earth.",
        es: "Todos los océanos, lagos y ríos de la Tierra.",
      },
      affects: {
        en: "Gills only work wet; out of water they dry out and the body runs low on air.",
        es: "Las branquias solo funcionan mojadas; fuera del agua se secan y al cuerpo le falta aire.",
      },
      more: {
        en: "Water flows over thin gill filaments full of blood vessels, and oxygen crosses into the blood. Smelling is a separate job: water flows through two little nostril pits (nares) on the snout, past scent sensors, so a fish sniffs the water it swims through. In air, the filaments collapse and stick together, which is why a fish out of water cannot breathe even though air has more oxygen.",
        es: "El agua pasa por filamentos finos llenos de vasos sanguíneos y el oxígeno cruza a la sangre. Oler es otro trabajo: el agua pasa por dos hoyitos de nariz (narinas) en el hocico, junto a sensores de olor, así que el pez olfatea el agua por la que nada. En el aire los filamentos se aplastan y se pegan, y por eso un pez fuera del agua no puede respirar aunque el aire tenga más oxígeno.",
      },
    },
    nose_lungs: {
      label: { en: "Nose & lungs", es: "Nariz y pulmones" },
      term: { en: "nostrils + lungs", es: "fosas nasales + pulmones" },
      what: {
        en: "Two nostrils that pull air past smell sensors and down into lungs.",
        es: "Dos fosas nasales que llevan el aire por los sensores de olor hasta los pulmones.",
      },
      usedFor: {
        en: "Breathing air and sniffing out food, friends and danger.",
        es: "Respirar aire y olfatear comida, amigos y peligro.",
      },
      evolved: {
        en: "When animals crawled onto land, lungs let them use the oxygen in air.",
        es: "Cuando los animales salieron a tierra, los pulmones les dejaron usar el oxígeno del aire.",
      },
      animals: {
        en: "Dogs, foxes, deer, bears — most mammals.",
        es: "Perros, zorros, ciervos, osos: casi todos los mamíferos.",
      },
      where: {
        en: "Forests, grasslands and cities everywhere.",
        es: "Bosques, praderas y ciudades de todo el mundo.",
      },
      affects: {
        en: "A wet nose catches scent; underwater the nostrils must close and hardly any smelling happens.",
        es: "Una nariz húmeda atrapa el olor; bajo el agua las fosas se cierran y casi no se huele nada.",
      },
      more: {
        en: "Damp air carries scent molecules well, which is why a forest smells so strong after rain. A fox's nose has about 200 million smell receptors, and a wet nose helps dissolve scents so they can be sensed. In hot dry air scents evaporate fast, and underwater a lung-breather holds its breath and smells nothing.",
        es: "El aire húmedo lleva bien las moléculas de olor; por eso el bosque huele tan fuerte después de la lluvia. La nariz de un zorro tiene unos 200 millones de receptores, y estar húmeda ayuda a disolver los olores para notarlos. En el aire seco y caliente los olores se evaporan rápido, y bajo el agua un animal con pulmones aguanta la respiración y no huele nada.",
      },
    },
    forked_tongue: {
      label: { en: "Forked tongue", es: "Lengua bífida" },
      term: {
        en: "forked tongue + Jacobson's organ",
        es: "lengua bífida + órgano de Jacobson",
      },
      what: {
        en: "A tongue that splits in two and carries smells to a special pocket in the mouth.",
        es: "Una lengua partida en dos que lleva los olores a un bolsillo especial de la boca.",
      },
      usedFor: {
        en: "Smelling in stereo: each tip tells which side the scent is stronger on.",
        es: "Oler en estéreo: cada punta dice de qué lado el olor es más fuerte.",
      },
      evolved: {
        en: "Hunters that follow scent trails did better when the tongue could tell left from right.",
        es: "A los cazadores que siguen rastros les fue mejor cuando la lengua distinguía izquierda y derecha.",
      },
      animals: {
        en: "Snakes, monitor lizards.",
        es: "Serpientes, varanos.",
      },
      where: {
        en: "Deserts, forests and grasslands on every warm continent.",
        es: "Desiertos, bosques y praderas de todos los continentes cálidos.",
      },
      affects: {
        en: "Works in dry air where noses struggle; wind scatters the trail and water washes it away.",
        es: "Funciona en aire seco donde las narices fallan; el viento dispersa el rastro y el agua lo borra.",
      },
      more: {
        en: "A snake flicks its tongue to collect scent particles, then presses the two tips into the Jacobson's organ on the roof of its mouth. Because the tips are apart, the snake compares them and turns toward the stronger side. Scent particles sit still on hot sand, so this works beautifully in deserts.",
        es: "La serpiente saca la lengua para recoger partículas de olor y luego apoya las dos puntas en el órgano de Jacobson, en el paladar. Como las puntas están separadas, la serpiente las compara y gira hacia el lado más fuerte. En la arena caliente las partículas se quedan quietas, así que funciona de maravilla en el desierto.",
      },
    },
    spiracles: {
      label: {
        en: "Breathing holes & antennae",
        es: "Agujeros para respirar y antenas",
      },
      term: { en: "spiracles + antennae", es: "espiráculos + antenas" },
      what: {
        en: "Tiny holes along the body let air straight in, and two antennae do the smelling.",
        es: "Agujeritos a lo largo del cuerpo por donde entra el aire, y dos antenas que se encargan de oler.",
      },
      usedFor: {
        en: "Breathing through tubes that reach every part of a small body; antennae do the smelling.",
        es: "Respirar por tubos que llegan a todo un cuerpo pequeño; las antenas se encargan de oler.",
      },
      evolved: {
        en: "Small animals did fine without lungs because air tubes could reach everywhere.",
        es: "A los animales pequeños les fue bien sin pulmones porque los tubos de aire llegaban a todas partes.",
      },
      animals: {
        en: "Beetles, grasshoppers, caterpillars, ants.",
        es: "Escarabajos, saltamontes, orugas, hormigas.",
      },
      where: {
        en: "Everywhere on land, from rainforests to deserts.",
        es: "Por toda la tierra firme, de las selvas a los desiertos.",
      },
      affects: {
        en: "Keeps the body light and quick; the holes can shut to save water but must stay closed underwater.",
        es: "Mantiene el cuerpo ligero y rápido; los agujeros se cierran para ahorrar agua pero deben seguir cerrados bajo el agua.",
      },
      more: {
        en: "Insects have no lungs. Air enters through spiracles on the sides and travels down branching tubes called tracheae right to the muscles. Desert beetles close their spiracles most of the time so water does not escape. Underwater the holes must seal, so most insects cannot stay down for long.",
        es: "Los insectos no tienen pulmones. El aire entra por los espiráculos de los lados y baja por tubos ramificados llamados tráqueas hasta los músculos. Los escarabajos del desierto cierran los espiráculos casi siempre para que no se escape el agua. Bajo el agua los agujeros deben sellarse, así que la mayoría no aguanta mucho sumergida.",
      },
    },
  },
  movement: {
    wings: {
      label: { en: "Wings", es: "Alas" },
      term: { en: "wings (powered flight)", es: "alas (vuelo activo)" },
      what: {
        en: "Long limbs with a wide surface that push against the air.",
        es: "Extremidades largas con una superficie ancha que empujan el aire.",
      },
      usedFor: {
        en: "Flying up, away and over things that walkers cannot cross.",
        es: "Volar hacia arriba, escapar y cruzar cosas que los caminantes no pueden.",
      },
      evolved: {
        en: "Gliders that could flap did better, and over millions of years arms became wings.",
        es: "A los planeadores que podían aletear les fue mejor, y en millones de años los brazos se volvieron alas.",
      },
      animals: {
        en: "Hawks, bats, dragonflies, ducks.",
        es: "Halcones, murciélagos, libélulas, patos.",
      },
      where: {
        en: "Every continent, including Antarctica.",
        es: "Todos los continentes, incluida la Antártida.",
      },
      affects: {
        en: "Needs light bones and big chest muscles; wet wings get heavy and dense forests get in the way.",
        es: "Necesita huesos ligeros y músculos de pecho grandes; las alas mojadas pesan y los bosques cerrados estorban.",
      },
      more: {
        en: "Flight is the most energy-hungry way to move, so flyers have hollow bones, huge chest muscles and fast hearts. In open windy sky a hawk barely flaps at all, riding rising air. Wet feathers or wing skin weigh far more, which is why most flyers stay out of the water.",
        es: "Volar es la forma de moverse que más energía gasta, así que los voladores tienen huesos huecos, músculos de pecho enormes y corazones rápidos. En cielo abierto y ventoso un halcón casi no aletea: se deja llevar por el aire que sube. Las plumas o la piel del ala mojadas pesan mucho más, y por eso casi ningún volador entra en el agua.",
      },
    },
    fins: {
      label: { en: "Fins", es: "Aletas" },
      term: { en: "fins", es: "aletas" },
      what: {
        en: "Flat paddles on the sides and tail that push against water.",
        es: "Paletas planas en los lados y la cola que empujan el agua.",
      },
      usedFor: {
        en: "Darting, turning and hovering in water.",
        es: "Lanzarse, girar y quedarse quieto en el agua.",
      },
      evolved: {
        en: "The earliest swimmers had fins long before any animal had legs.",
        es: "Los primeros nadadores tuvieron aletas mucho antes de que existieran las patas.",
      },
      animals: {
        en: "Fish, sharks, dolphins, axolotls.",
        es: "Peces, tiburones, delfines, ajolotes.",
      },
      where: {
        en: "Oceans, rivers and lakes worldwide.",
        es: "Océanos, ríos y lagos de todo el mundo.",
      },
      affects: {
        en: "Perfect in water, but fins cannot lift a body on land or grip rock.",
        es: "Perfectas en el agua, pero las aletas no levantan el cuerpo en tierra ni agarran la roca.",
      },
      more: {
        en: "Fins work because water is thick: a small push moves a lot of water and the animal glides forward. On land there is nothing thick to push against, so a fish can only flop. A few fish, like mudskippers, crawl on stiff front fins for a short while, but they must return to water to breathe.",
        es: "Las aletas funcionan porque el agua es densa: un empujón pequeño mueve mucha agua y el animal se desliza. En tierra no hay nada denso que empujar, así que un pez solo puede dar saltos. Algunos peces, como los saltarines del fango, se arrastran un rato con las aletas delanteras, pero deben volver al agua para respirar.",
      },
    },
    webbed_feet: {
      label: { en: "Webbed feet", es: "Patas palmeadas" },
      term: {
        en: "webbed feet (interdigital webbing)",
        es: "patas palmeadas (membrana interdigital)",
      },
      what: {
        en: "Skin stretched between the toes to make a paddle.",
        es: "Piel estirada entre los dedos que forma una paleta.",
      },
      usedFor: {
        en: "Paddling through water and waddling on soft mud.",
        es: "Remar en el agua y andar sobre barro blando.",
      },
      evolved: {
        en: "Animals that lived at the water's edge did better with toes that could push water and still walk.",
        es: "A los animales de la orilla les fue mejor con dedos que empujaban el agua y aún servían para andar.",
      },
      animals: {
        en: "Ducks, otters, frogs, platypuses.",
        es: "Patos, nutrias, ranas, ornitorrincos.",
      },
      where: {
        en: "Ponds, rivers and coasts on every continent.",
        es: "Estanques, ríos y costas de todos los continentes.",
      },
      affects: {
        en: "Great paddles, but wide thin feet burn on hot sand and wobble on rock.",
        es: "Grandes remos, pero las patas anchas y finas se queman en la arena caliente y se tambalean en la roca.",
      },
      more: {
        en: "A duck spreads its toes on the push stroke and folds them on the return, like a rower feathering an oar. The same wide foot spreads weight so the bird does not sink into mud. On burning desert sand, though, all that thin skin heats up fast, and on a cliff there is nothing for a web to grip.",
        es: "El pato abre los dedos al empujar y los cierra al volver, como un remero. La misma pata ancha reparte el peso para no hundirse en el barro. Pero en la arena ardiente del desierto toda esa piel fina se calienta rápido, y en un acantilado no hay nada que la membrana pueda agarrar.",
      },
    },
    claws: {
      label: { en: "Claws", es: "Garras" },
      term: { en: "claws (keratin)", es: "garras (queratina)" },
      what: {
        en: "Hard curved tips on the toes, made of the same stuff as your fingernails.",
        es: "Puntas duras y curvas en los dedos, hechas de lo mismo que tus uñas.",
      },
      usedFor: {
        en: "Climbing trees and cliffs, and digging burrows to hide from heat.",
        es: "Trepar árboles y acantilados, y cavar madrigueras para escapar del calor.",
      },
      evolved: {
        en: "Climbers and diggers did better when their toes could hook into wood, rock and soil.",
        es: "A los trepadores y cavadores les fue mejor cuando los dedos se enganchaban en madera, roca y tierra.",
      },
      animals: {
        en: "Squirrels, bears, badgers, cats, meerkats.",
        es: "Ardillas, osos, tejones, gatos, suricatas.",
      },
      where: {
        en: "Forests, mountains and deserts everywhere.",
        es: "Bosques, montañas y desiertos de todo el mundo.",
      },
      affects: {
        en: "Needs strong toe bones; claws are useless for pushing water and hard to swim with.",
        es: "Necesita huesos de dedo fuertes; las garras no sirven para empujar agua y cuesta nadar con ellas.",
      },
      more: {
        en: "A squirrel can run head-first down a tree because its back ankles rotate and its claws hook the bark. A bat hangs from a cliff or cave roof on hooked claws all day without using a muscle. Fennec foxes dig burrows so fast with their claws that they can vanish into sand in seconds.",
        es: "Una ardilla baja un árbol de cabeza porque los tobillos traseros giran y las garras se enganchan en la corteza. Un murciélago cuelga de un acantilado o del techo de una cueva con garras en forma de gancho todo el día sin usar un músculo. Los zorros del desierto cavan tan rápido con las garras que desaparecen en la arena en segundos.",
      },
    },
    padded_paws: {
      label: { en: "Padded paws", es: "Patas acolchadas" },
      term: {
        en: "paw pads (furred soles)",
        es: "almohadillas plantares (plantas peludas)",
      },
      what: {
        en: "Soft cushions on the bottom of the feet, sometimes covered in fur.",
        es: "Cojines blandos bajo los pies, a veces cubiertos de pelo.",
      },
      usedFor: {
        en: "Sneaking silently and walking on burning-hot sand.",
        es: "Andar sin hacer ruido y caminar sobre arena ardiente.",
      },
      evolved: {
        en: "Quiet hunters did better when their footsteps made no sound.",
        es: "A los cazadores silenciosos les fue mejor cuando sus pasos no hacían ruido.",
      },
      animals: {
        en: "Cats, fennec foxes, camels, wolves.",
        es: "Gatos, zorros del desierto, camellos, lobos.",
      },
      where: {
        en: "Deserts, forests and grasslands worldwide.",
        es: "Desiertos, bosques y praderas de todo el mundo.",
      },
      affects: {
        en: "Soaks up bumps for the leg bones; soft pads slip on wet rock and do not push water.",
        es: "Amortigua los golpes para los huesos de la pata; las almohadillas blandas resbalan en roca mojada y no empujan el agua.",
      },
      more: {
        en: "A fennec fox has thick fur on the soles of its feet, so it can trot across sand that would burn a bare paw. A camel's wide soft pads spread out on each step so it does not sink. Cats walk on their toes with padded soles, which is why you rarely hear one coming.",
        es: "El zorro del desierto tiene pelo grueso en las plantas, así que trota por arena que quemaría una pata desnuda. Las almohadillas anchas y blandas del camello se abren en cada paso para no hundirse. Los gatos andan de puntillas sobre plantas acolchadas; por eso casi nunca oyes llegar a uno.",
      },
    },
  },
  covering: {
    short_fur: {
      label: { en: "Short fur", es: "Pelo corto" },
      term: { en: "short pelage", es: "pelaje corto" },
      what: {
        en: "A thin, dense coat of hair close to the skin.",
        es: "Una capa de pelo fina y densa pegada a la piel.",
      },
      usedFor: {
        en: "Staying warm at night without getting too hot by day.",
        es: "Mantener el calor de noche sin acalorarse de día.",
      },
      evolved: {
        en: "Warm-blooded animals did better with a coat that trapped a little air.",
        es: "A los animales de sangre caliente les fue mejor con una capa que atrapaba un poco de aire.",
      },
      animals: {
        en: "Deer, foxes, mice, otters.",
        es: "Ciervos, zorros, ratones, nutrias.",
      },
      where: {
        en: "Forests and grasslands with mild seasons.",
        es: "Bosques y praderas con estaciones suaves.",
      },
      affects: {
        en: "Light and easy to move in; soaks up water and gets heavy when swimming.",
        es: "Ligero y cómodo para moverse; absorbe agua y pesa al nadar.",
      },
      more: {
        en: "Fur works by trapping a layer of still air next to the skin. A short coat traps just enough for cool nights but lets heat out when running. Otters keep short fur so dense that water never reaches their skin, which is the exception that proves how much wet fur usually weighs.",
        es: "El pelo funciona atrapando una capa de aire quieto junto a la piel. Una capa corta atrapa lo justo para las noches frescas pero deja salir el calor al correr. Las nutrias tienen un pelo corto tan denso que el agua nunca llega a la piel: la excepción que muestra cuánto suele pesar el pelo mojado.",
      },
    },
    long_fur: {
      label: { en: "Long shaggy fur", es: "Pelo largo" },
      term: { en: "long pelage", es: "pelaje largo" },
      what: {
        en: "A thick, deep coat of long hair.",
        es: "Una capa gruesa y profunda de pelo largo.",
      },
      usedFor: {
        en: "Keeping warm in cold wind and snow.",
        es: "Mantener el calor con viento frío y nieve.",
      },
      evolved: {
        en: "Animals in cold places did better the more air their coat could trap.",
        es: "A los animales de sitios fríos les fue mejor cuanto más aire atrapaba su pelaje.",
      },
      animals: {
        en: "Yaks, musk oxen, mountain goats, sheep.",
        es: "Yaks, bueyes almizcleros, cabras montesas, ovejas.",
      },
      where: {
        en: "High mountains and the far north.",
        es: "Montañas altas y el lejano norte.",
      },
      affects: {
        en: "Heavy to carry; overheats in deserts and soaks up huge amounts of water.",
        es: "Pesa al llevarlo; da calor en el desierto y absorbe muchísima agua.",
      },
      more: {
        en: "A musk ox's outer hair can be 60 cm long over a woolly underlayer, so it can stand in a blizzard without shivering. The same coat would be dangerous in a desert, where the animal could not shed heat, and in water it would soak up its own weight and drag the swimmer down.",
        es: "El pelo exterior del buey almizclero mide hasta 60 cm sobre una capa de lana, así que aguanta una ventisca sin temblar. El mismo abrigo sería peligroso en el desierto, donde no podría soltar el calor, y en el agua absorbería su propio peso y hundiría al nadador.",
      },
    },
    smooth_scales: {
      label: { en: "Smooth scales", es: "Escamas lisas" },
      term: { en: "smooth scales", es: "escamas lisas" },
      what: {
        en: "Flat overlapping plates that make the skin slick.",
        es: "Placas planas y superpuestas que dejan la piel resbaladiza.",
      },
      usedFor: {
        en: "Slipping through water and keeping water inside the body.",
        es: "Deslizarse por el agua y guardar el agua dentro del cuerpo.",
      },
      evolved: {
        en: "Swimmers and desert reptiles both did better with a smooth waterproof skin.",
        es: "A los nadadores y a los reptiles del desierto les fue mejor con una piel lisa e impermeable.",
      },
      animals: {
        en: "Fish, smooth-scaled snakes, skinks.",
        es: "Peces, serpientes de escamas lisas, eslizones.",
      },
      where: {
        en: "Rivers, oceans and deserts worldwide.",
        es: "Ríos, océanos y desiertos de todo el mundo.",
      },
      affects: {
        en: "Very low drag; scales must be shed to grow, and they give no warmth in cold wind.",
        es: "Muy poco freno; hay que mudar las escamas para crecer, y no dan calor con viento frío.",
      },
      more: {
        en: "Fish scales overlap like roof tiles and are coated in slime, so water slides past with almost no drag. Reptile scales are made of keratin and are nearly waterproof, which is why a desert lizard loses far less water through its skin than a frog does. Smooth scales do nothing to trap warm air, so scaled animals rely on the sun for heat.",
        es: "Las escamas de los peces se superponen como tejas y llevan una capa de baba, así que el agua resbala casi sin freno. Las escamas de los reptiles son de queratina y casi impermeables; por eso un lagarto del desierto pierde mucha menos agua por la piel que una rana. Las escamas lisas no atrapan aire caliente, así que los animales con escamas dependen del sol.",
      },
    },
    keeled_scales: {
      label: { en: "Rough ridged scales", es: "Escamas con quilla" },
      term: { en: "keeled scales (squamation)", es: "escamas aquilladas" },
      what: {
        en: "Scales with a raised ridge down the middle, rough like a file.",
        es: "Escamas con un borde levantado en el centro, ásperas como una lima.",
      },
      usedFor: {
        en: "Gripping rock and sand, and collecting dew that runs to the mouth.",
        es: "Agarrarse a la roca y la arena, y recoger rocío que corre hasta la boca.",
      },
      evolved: {
        en: "Desert reptiles did better when their skin could grip and gather water.",
        es: "A los reptiles del desierto les fue mejor cuando su piel podía agarrar y recoger agua.",
      },
      animals: {
        en: "Thorny devils, rattlesnakes, garter snakes.",
        es: "Diablos espinosos, serpientes de cascabel, culebras.",
      },
      where: {
        en: "Australian and American deserts, dry grasslands.",
        es: "Desiertos de Australia y América, praderas secas.",
      },
      affects: {
        en: "Rough skin drags a little in water but grips dry ground well; ridges scatter light for camouflage.",
        es: "La piel áspera frena un poco en el agua pero agarra bien el suelo seco; las quillas dispersan la luz y ayudan a camuflarse.",
      },
      more: {
        en: "The thorny devil of Australia has tiny grooves between its ridged scales. When dew or rain touches any part of its body, the water is pulled along the grooves all the way to its mouth, so it can drink through its skin. The rough texture also breaks up reflections, so the lizard looks like a dry twig.",
        es: "El diablo espinoso de Australia tiene surcos diminutos entre sus escamas con quilla. Cuando el rocío o la lluvia toca cualquier parte del cuerpo, el agua corre por los surcos hasta la boca, así que bebe a través de la piel. La textura áspera también rompe los reflejos y el lagarto parece una ramita seca.",
      },
    },
    hard_shell: {
      label: { en: "Hard shell", es: "Caparazón" },
      term: {
        en: "shell (scutes over bone)",
        es: "caparazón (escudos sobre hueso)",
      },
      what: {
        en: "A dome of bone covered in hard plates, worn like armor.",
        es: "Una cúpula de hueso cubierta de placas duras, como una armadura.",
      },
      usedFor: {
        en: "Keeping teeth and claws out, so the animal does not have to be fast.",
        es: "Mantener fuera dientes y garras, para no tener que ser rápido.",
      },
      evolved: {
        en: "Slow animals did better when their ribs widened into a shield.",
        es: "A los animales lentos les fue mejor cuando sus costillas se ensancharon hasta ser un escudo.",
      },
      animals: {
        en: "Tortoises, turtles, armadillos.",
        es: "Tortugas de tierra, tortugas de agua, armadillos.",
      },
      where: {
        en: "Deserts, forests, ponds and oceans in warm parts of the world.",
        es: "Desiertos, bosques, estanques y océanos de las zonas cálidas del mundo.",
      },
      affects: {
        en: "Armor everywhere costs agility everywhere: the skeleton is fused, and there is a lot to carry.",
        es: "Una armadura completa cuesta agilidad en todas partes: el esqueleto está fusionado y hay mucho que cargar.",
      },
      more: {
        en: "A tortoise's shell is its ribs and backbone, spread out and fused into one piece, then covered in keratin plates called scutes. It cannot be taken off. The trade is clear: almost nothing can bite through it, but the animal can never sprint, and flying with a shell is impossible.",
        es: "El caparazón de una tortuga son sus costillas y su columna, extendidas y fusionadas en una sola pieza, cubiertas por placas de queratina llamadas escudos. No se puede quitar. El trato está claro: casi nada puede morderlo, pero el animal nunca podrá correr, y volar con caparazón es imposible.",
      },
    },
    feathers: {
      label: { en: "Feathers", es: "Plumas" },
      term: { en: "plumage", es: "plumaje" },
      what: {
        en: "Light branching structures that overlap to cover the body.",
        es: "Estructuras ligeras y ramificadas que se superponen para cubrir el cuerpo.",
      },
      usedFor: {
        en: "Flying, staying warm, and shedding water like a raincoat.",
        es: "Volar, mantener el calor y repeler el agua como un impermeable.",
      },
      evolved: {
        en: "Feathers first kept dinosaurs warm; only later did they help with flight.",
        es: "Las plumas primero dieron calor a los dinosaurios; solo después ayudaron a volar.",
      },
      animals: {
        en: "All birds: hawks, ducks, penguins, ostriches.",
        es: "Todas las aves: halcones, patos, pingüinos, avestruces.",
      },
      where: {
        en: "Every continent and every ocean.",
        es: "Todos los continentes y todos los océanos.",
      },
      affects: {
        en: "Very light for the warmth they give; must be oiled and preened, and trap heat in deserts.",
        es: "Muy ligeras para el calor que dan; hay que engrasarlas y acicalarlas, y en el desierto guardan demasiado calor.",
      },
      more: {
        en: "A single feather has a central shaft with hundreds of branches that zip together with tiny hooks. Birds spread oil from a gland near the tail over their feathers so water beads off, which is why ducks stay dry. On a windy cliff, feathers both cut the wind and trap warmth, a rare double win.",
        es: "Una sola pluma tiene un eje central con cientos de ramas que se enganchan con ganchitos diminutos. Las aves extienden aceite de una glándula cerca de la cola sobre las plumas para que el agua resbale; por eso los patos se mantienen secos. En un acantilado ventoso, las plumas cortan el viento y guardan el calor: un doble premio poco común.",
      },
    },
  },
};

export const PATTERN_SCIENCE: Record<Pattern, ScienceCard> = {
  stripes: {
    label: { en: "Stripes", es: "Rayas" },
    term: { en: "disruptive coloration", es: "coloración disruptiva" },
    what: {
      en: "Bold bands of dark and light across the body.",
      es: "Franjas marcadas de oscuro y claro por el cuerpo.",
    },
    usedFor: {
      en: "Breaking up the body's outline so it is hard to tell where it starts and ends.",
      es: "Romper la silueta del cuerpo para que no se sepa dónde empieza y dónde acaba.",
    },
    evolved: {
      en: "Animals whose edges were hard to see got caught less often.",
      es: "Los animales cuyos bordes eran difíciles de ver fueron atrapados menos veces.",
    },
    animals: {
      en: "Zebras, tigers, okapis, clownfish.",
      es: "Cebras, tigres, okapis, peces payaso.",
    },
    where: {
      en: "Grasslands, jungles and coral reefs.",
      es: "Praderas, selvas y arrecifes de coral.",
    },
    affects: {
      en: "Only skin and fur color changes; it costs no energy to keep.",
      es: "Solo cambia el color de la piel y el pelo; no cuesta energía mantenerlo.",
    },
    more: {
      en: "Zebra stripes also confuse biting flies, which struggle to land on striped surfaces. Stripes are a picture-level trick: they work on the eyes of whoever is looking, so they help against some hunters and not others.",
      es: "Las rayas de la cebra también confunden a las moscas que pican, a las que les cuesta posarse en superficies rayadas. Las rayas son un truco visual: funcionan sobre los ojos de quien mira, así que sirven contra unos cazadores y no contra otros.",
    },
  },
  spots: {
    label: { en: "Spots", es: "Manchas" },
    term: {
      en: "spotted coat (cryptic pattern)",
      es: "pelaje moteado (patrón críptico)",
    },
    what: {
      en: "Dots or rosettes scattered over a lighter background.",
      es: "Puntos o rosetas repartidos sobre un fondo más claro.",
    },
    usedFor: {
      en: "Matching the dappled light under leaves.",
      es: "Parecerse a la luz moteada bajo las hojas.",
    },
    evolved: {
      en: "Forest animals did better looking like sunlight through leaves.",
      es: "A los animales del bosque les fue mejor pareciendo luz de sol entre hojas.",
    },
    animals: {
      en: "Leopards, jaguars, fawns, trout.",
      es: "Leopardos, jaguares, cervatillos, truchas.",
    },
    where: {
      en: "Forests and rivers worldwide.",
      es: "Bosques y ríos de todo el mundo.",
    },
    affects: {
      en: "Only skin and fur color; many baby animals lose their spots as they grow.",
      es: "Solo el color de piel y pelo; muchas crías pierden las manchas al crecer.",
    },
    more: {
      en: "A fawn lies still in the grass and its spots look exactly like patches of sunlight, so a fox walking past sees nothing. Leopard rosettes do the same job in trees. The pattern works only when the animal holds still, which is why spotted babies are taught to freeze.",
      es: "Un cervatillo se queda quieto en la hierba y sus manchas parecen puntos de sol, así que un zorro que pasa no ve nada. Las rosetas del leopardo hacen lo mismo en los árboles. El patrón solo funciona si el animal no se mueve; por eso a las crías moteadas se les enseña a quedarse quietas.",
    },
  },
  countershading: {
    label: { en: "Dark top, light belly", es: "Lomo oscuro, panza clara" },
    term: { en: "countershading", es: "contrasombreado" },
    what: {
      en: "Darker on the back, paler underneath.",
      es: "Más oscuro en el lomo, más claro por debajo.",
    },
    usedFor: {
      en: "Blending in from above and below at the same time.",
      es: "Camuflarse desde arriba y desde abajo a la vez.",
    },
    evolved: {
      en: "Swimmers seen from both directions did better with two colors.",
      es: "A los nadadores vistos desde arriba y desde abajo les fue mejor con dos colores.",
    },
    animals: {
      en: "Sharks, penguins, dolphins, deer.",
      es: "Tiburones, pingüinos, delfines, ciervos.",
    },
    where: {
      en: "Oceans and open water everywhere, also open land.",
      es: "Océanos y aguas abiertas de todo el mundo, y también tierra abierta.",
    },
    affects: {
      en: "Only color; it also flattens the animal's shadow so it looks less solid.",
      es: "Solo el color; también aplana la sombra del animal para que parezca menos sólido.",
    },
    more: {
      en: "Look up at a shark from below and its pale belly blends with the bright surface. Look down from a boat and its dark back vanishes into the deep. Because sunlight always comes from above, the dark top also cancels out the natural shadow on the belly, making the whole body look flat.",
      es: "Mira un tiburón desde abajo y su panza clara se funde con la superficie brillante. Míralo desde un barco y su lomo oscuro desaparece en lo profundo. Como la luz del sol siempre viene de arriba, el lomo oscuro también anula la sombra natural de la panza y el cuerpo entero parece plano.",
    },
  },
  warning: {
    label: { en: "Bright warning colors", es: "Colores de aviso" },
    term: { en: "aposematism", es: "aposematismo" },
    what: {
      en: "Loud yellow, red or orange with black, made to be seen.",
      es: "Amarillo, rojo o naranja chillón con negro, hecho para ser visto.",
    },
    usedFor: {
      en: "Telling hunters: I taste terrible or I sting, leave me alone.",
      es: "Decirles a los cazadores: tengo un sabor horrible o pico, déjenme en paz.",
    },
    evolved: {
      en: "Animals that were poisonous did better when hunters could learn to recognize them.",
      es: "A los animales venenosos les fue mejor cuando los cazadores aprendían a reconocerlos.",
    },
    animals: {
      en: "Poison dart frogs, bees, monarch butterflies, ladybugs, skunks.",
      es: "Ranas dardo, abejas, mariposas monarca, mariquitas, mofetas.",
    },
    where: {
      en: "Rainforests, meadows and gardens worldwide.",
      es: "Selvas, prados y jardines de todo el mundo.",
    },
    affects: {
      en: "Only color, but it only works if the animal really is dangerous or copies one that is.",
      es: "Solo el color, pero solo funciona si el animal es peligroso de verdad o imita a uno que lo es.",
    },
    more: {
      en: "A bird that eats one bad-tasting monarch butterfly remembers the orange-and-black pattern and never tries another. Some harmless animals borrow the same colors, a trick called mimicry: the viceroy butterfly looks almost exactly like a monarch and gets left alone for free.",
      es: "Un pájaro que come una mariposa monarca de mal sabor recuerda el patrón naranja y negro y no prueba otra. Algunos animales inofensivos copian esos colores, un truco llamado mimetismo: la mariposa virrey se parece casi por completo a la monarca y la dejan en paz gratis.",
    },
  },
  camouflage: {
    label: { en: "Plain camouflage", es: "Camuflaje liso" },
    term: { en: "cryptic coloration", es: "coloración críptica" },
    what: {
      en: "One muted color that matches sand, bark or mud.",
      es: "Un solo color apagado que se parece a la arena, la corteza o el barro.",
    },
    usedFor: {
      en: "Disappearing into the background while sitting still.",
      es: "Desaparecer en el fondo mientras se está quieto.",
    },
    evolved: {
      en: "The animals that matched their home best were the ones hunters missed.",
      es: "Los animales que mejor se parecían a su casa eran los que los cazadores no veían.",
    },
    animals: {
      en: "Sand cats, sidewinders, tree frogs, stick insects.",
      es: "Gatos de las arenas, cascabeles cornudas, ranas arborícolas, insectos palo.",
    },
    where: {
      en: "Deserts, forests and rocky shores everywhere.",
      es: "Desiertos, bosques y costas rocosas de todo el mundo.",
    },
    affects: {
      en: "Only color; it works best for animals that can freeze.",
      es: "Solo el color; funciona mejor en animales que saben quedarse quietos.",
    },
    more: {
      en: "A sidewinder is the exact color of the dune it lives on, and it buries itself so only its eyes show. The same trick fails the moment the animal moves to a different background: a sand-colored snake on dark volcanic rock stands out completely.",
      es: "La cascabel cornuda tiene el color exacto de su duna y se entierra hasta que solo se ven los ojos. El mismo truco falla en cuanto el animal cambia de fondo: una serpiente color arena sobre roca volcánica oscura se ve de lejos.",
    },
  },
};

// ── Why-lines: one per (option, biome) with a NONZERO modifier ─────────────
// Test & Learn reads these. Curious, never corrective: they explain fit.

type WhyTable = {
  [C in Category]: Partial<
    Record<OptionId<C>, Partial<Record<Biome, Localized>>>
  >;
};

export const WHY: WhyTable = {
  eyes: {
    no_eyes: {
      earth: {
        en: "With no eyes, this Buddy listens harder in the leaf litter, where every rustle tells a story.",
        es: "Sin ojos, este Buddy escucha más fuerte entre las hojas, donde cada crujido cuenta una historia.",
      },
      water: {
        en: "In murky water eyes see little anyway, so this Buddy sniffs and feels its way like a cave fish.",
        es: "En agua turbia los ojos ven poco de todos modos, así que este Buddy huele y tantea como un pez de cueva.",
      },
      air: {
        en: "On a windy cliff the gusts scatter sounds, so an eyeless Buddy misses more of what is around it.",
        es: "En un acantilado ventoso las ráfagas dispersan los sonidos, así que un Buddy sin ojos se pierde más de lo que pasa a su alrededor.",
      },
    },
    rotating_eyes: {
      earth: {
        en: "Swivel eyes scan the tangled branches for bugs without moving, just like a chameleon.",
        es: "Los ojos giratorios rastrean las ramas enredadas en busca de bichos sin moverse, como un camaleón.",
      },
      water: {
        en: "Eyes built for air see blurry underwater, so the swivel trick loses its edge in the pond.",
        es: "Unos ojos hechos para el aire ven borroso bajo el agua, así que el truco giratorio pierde ventaja en el estanque.",
      },
      fire: {
        en: "Wide-open desert lets each eye sweep a big slice of sky and sand for movement.",
        es: "El desierto abierto deja que cada ojo barra un buen trozo de cielo y arena buscando movimiento.",
      },
    },
    wide_set_eyes: {
      earth: {
        en: "Eyes on the sides keep watch all around in the forest, though leaves block the far view.",
        es: "Los ojos a los lados vigilan todo alrededor en el bosque, aunque las hojas tapan la vista lejana.",
      },
      water: {
        en: "In cloudy water there is less to see in any direction, so all-around eyes help less.",
        es: "En agua turbia hay menos que ver en cualquier dirección, así que los ojos a los lados ayudan menos.",
      },
      fire: {
        en: "On open sand nothing sneaks up on all-around eyes; a hawk's shadow shows from far away.",
        es: "En la arena abierta nada se acerca sin que lo vean unos ojos a los lados; la sombra de un halcón se ve de lejos.",
      },
      air: {
        en: "Long sightlines on the cliff give all-around eyes plenty of far-off things to catch.",
        es: "Las vistas largas del acantilado dan a los ojos laterales muchas cosas lejanas que captar.",
      },
    },
    compound_eyes: {
      water: {
        en: "Thousands of tiny facets each get very little light in murky water, so the picture fades.",
        es: "Miles de facetas diminutas reciben muy poca luz en el agua turbia, así que la imagen se apaga.",
      },
      fire: {
        en: "Bright desert light floods every facet, so motion on the sand is easy to catch.",
        es: "La luz brillante del desierto inunda cada faceta, así que el movimiento en la arena se nota fácil.",
      },
      air: {
        en: "In open sky compound eyes catch every wing-beat, and quick eyes make quick turns, like a dragonfly.",
        es: "En cielo abierto los ojos compuestos captan cada aleteo, y unos ojos rápidos hacen giros rápidos, como una libélula.",
      },
    },
  },
  ears: {
    hidden_ears: {
      water: {
        en: "Sound travels through water into the skull, so hidden ears hear a bit better here.",
        es: "El sonido viaja por el agua hasta el cráneo, así que los oídos escondidos oyen un poco mejor aquí.",
      },
      air: {
        en: "Smooth hidden ears cut through wind without flapping or whistling, the way a hawk's do.",
        es: "Los oídos escondidos y lisos cortan el viento sin aletear ni silbar, como los de un halcón.",
      },
    },
    pinna: {
      earth: {
        en: "Big ear flaps gather the tiny scratches and rustles of the forest floor.",
        es: "Las orejas grandes recogen los rasguños y crujidos diminutos del suelo del bosque.",
      },
      water: {
        en: "Ear flaps fill with water and stop funneling sound, so the fennec's trick fades in the pond.",
        es: "Las orejas se llenan de agua y dejan de recoger el sonido, así que el truco del zorro del desierto se apaga en el estanque.",
      },
      fire: {
        en: "In the desert huge ears do two jobs: hear beetles under the sand and dump body heat.",
        es: "En el desierto las orejas enormes hacen dos trabajos: oír escarabajos bajo la arena y soltar el calor del cuerpo.",
      },
      air: {
        en: "On the cliff, wind roars in big ear flaps and drags on them, so they hear less and slow the Buddy a little.",
        es: "En el acantilado el viento ruge en las orejas grandes y las frena, así que oyen menos y frenan un poco al Buddy.",
      },
    },
    jaw_vibration: {
      earth: {
        en: "Resting its jaw on the forest floor, this Buddy feels footsteps through roots and soil.",
        es: "Apoyando la mandíbula en el suelo del bosque, este Buddy siente los pasos a través de raíces y tierra.",
      },
      water: {
        en: "Water carries shaking but there is nothing solid to press against, so jaw hearing dulls.",
        es: "El agua lleva vibraciones, pero no hay nada sólido en que apoyarse, así que oír con la mandíbula se vuelve más débil.",
      },
      fire: {
        en: "Sand carries vibrations well; a sidewinder feels a lizard coming across the dune.",
        es: "La arena lleva bien las vibraciones; una cascabel cornuda siente llegar a un lagarto por la duna.",
      },
      air: {
        en: "Up on a windy cliff there is little ground to press against, so jaw hearing has almost nothing to feel.",
        es: "En un acantilado ventoso hay poco suelo en que apoyarse, así que la mandíbula casi no tiene nada que sentir.",
      },
    },
    tympanum: {
      earth: {
        en: "Damp forest air keeps the skin eardrum moist and ready, like a tree frog's.",
        es: "El aire húmedo del bosque mantiene el tímpano de piel húmedo y listo, como el de una rana arborícola.",
      },
      water: {
        en: "A skin eardrum hears in water and out of it, perfect for a pond Buddy.",
        es: "Un tímpano de piel oye dentro y fuera del agua, perfecto para un Buddy de estanque.",
      },
      fire: {
        en: "Hot dry air cracks a thin skin eardrum, so it hears less in the desert.",
        es: "El aire caliente y seco agrieta un tímpano de piel fina, así que oye menos en el desierto.",
      },
    },
  },
  nose: {
    gills: {
      earth: {
        en: "Gills need water to breathe, and the nostril pits only sniff smells carried in water. On the damp forest floor both get a little, so this Buddy is slower and smells less.",
        es: "Las branquias necesitan agua para respirar, y los hoyitos de la nariz solo olfatean olores que lleva el agua. En el suelo húmedo del bosque ambos reciben poca, así que este Buddy es más lento y huele menos.",
      },
      water: {
        en: "In the pond, gills pull oxygen from every mouthful and the nostril pits sniff scents right out of the water, so this Buddy is quick and sharp-nosed.",
        es: "En el estanque, las branquias sacan oxígeno de cada bocanada y los hoyitos de la nariz olfatean los olores del agua, así que este Buddy es rápido y tiene buen olfato.",
      },
      fire: {
        en: "In the desert gills dry out fast and there is no water for the nostril pits to sniff, so this Buddy gets little air and slows right down. Gills miss the pond here.",
        es: "En el desierto las branquias se secan rápido y no hay agua que los hoyitos de la nariz puedan olfatear, así que este Buddy recibe poco aire y se vuelve muy lento. Las branquias echan de menos el estanque.",
      },
      air: {
        en: "Thin dry cliff air gives gills almost nothing to breathe and the water-sniffing nostrils nothing to sniff, so this Buddy tires quickly up high.",
        es: "El aire fino y seco del acantilado casi no da nada que respirar a las branquias ni nada que olfatear a la nariz de agua, así que este Buddy se cansa rápido en las alturas.",
      },
    },
    nose_lungs: {
      earth: {
        en: "Damp forest air carries scent beautifully, so a wet nose finds every trail.",
        es: "El aire húmedo del bosque lleva muy bien los olores, así que una nariz húmeda encuentra todos los rastros.",
      },
      water: {
        en: "Underwater the nostrils close and the Buddy holds its breath, so hardly any smelling happens down here.",
        es: "Bajo el agua las fosas nasales se cierran y el Buddy aguanta la respiración, así que aquí abajo casi no huele nada.",
      },
      fire: {
        en: "Hot dry air dries the nose and scents blow away fast, so smelling is a bit harder in the desert.",
        es: "El aire caliente y seco reseca la nariz y los olores se van rápido, así que oler cuesta un poco más en el desierto.",
      },
    },
    forked_tongue: {
      earth: {
        en: "A forked tongue follows scent trails across the forest floor, tip by tip.",
        es: "Una lengua bífida sigue los rastros de olor por el suelo del bosque, punta a punta.",
      },
      water: {
        en: "Water washes scent particles away before the tongue can collect them.",
        es: "El agua arrastra las partículas de olor antes de que la lengua pueda recogerlas.",
      },
      fire: {
        en: "Scent particles sit still on hot sand, so a forked tongue smells in stereo across the desert.",
        es: "Las partículas de olor se quedan quietas en la arena caliente, así que la lengua bífida huele en estéreo por todo el desierto.",
      },
      air: {
        en: "Cliff wind scatters scent before the tongue can compare its two tips.",
        es: "El viento del acantilado dispersa el olor antes de que la lengua pueda comparar sus dos puntas.",
      },
    },
    spiracles: {
      earth: {
        en: "Side breathing holes work fine in damp forest air, and antennae pick up scents on the ground.",
        es: "Los agujeros para respirar funcionan bien en el aire húmedo del bosque, y las antenas captan olores en el suelo.",
      },
      water: {
        en: "Antennae are built to catch smells in air, so in the pond this Buddy smells much less. Its breathing holes must stay shut down here too, until it surfaces.",
        es: "Las antenas están hechas para captar olores en el aire, así que en el estanque este Buddy huele mucho menos. Sus agujeros para respirar también deben quedar cerrados aquí abajo, hasta que salga a la superficie.",
      },
      fire: {
        en: "Desert beetles shut their breathing holes to keep water in, and still catch scents with antennae.",
        es: "Los escarabajos del desierto cierran sus agujeros para no perder agua, y aun así captan olores con las antenas.",
      },
      air: {
        en: "A light air-tube body is quick in the wind, and antennae taste the breeze for scents.",
        es: "Un cuerpo ligero con tubos de aire es rápido en el viento, y las antenas prueban la brisa en busca de olores.",
      },
    },
  },
  movement: {
    wings: {
      earth: {
        en: "Tangled branches get in the way of wide wings, so flying through the forest takes care.",
        es: "Las ramas enredadas estorban a unas alas anchas, así que volar por el bosque requiere cuidado.",
      },
      water: {
        en: "Wet wings get heavy fast, and there is no thick water to push against with a wing.",
        es: "Las alas mojadas pesan enseguida, y no hay agua densa que empujar con un ala.",
      },
      fire: {
        en: "Open desert sky is easy flying, and rising hot air gives a free lift.",
        es: "El cielo abierto del desierto es fácil de volar, y el aire caliente que sube da un impulso gratis.",
      },
      air: {
        en: "On the windy cliff, wings barely need to flap: this Buddy rides the gusts like a hawk.",
        es: "En el acantilado ventoso las alas casi no necesitan aletear: este Buddy monta las ráfagas como un halcón.",
      },
    },
    fins: {
      earth: {
        en: "Fins have nothing thick to push against on land, so this Buddy can only flop along the forest floor.",
        es: "Las aletas no tienen nada denso que empujar en tierra, así que este Buddy solo puede dar saltitos por el suelo del bosque.",
      },
      water: {
        en: "Fins turn every flick into a glide through the pond, the fastest thing here.",
        es: "Las aletas convierten cada sacudida en un deslizamiento por el estanque, lo más rápido que hay aquí.",
      },
      fire: {
        en: "Fins on hot sand cannot lift the body or move it far. Fins miss the water here.",
        es: "Las aletas en arena caliente no levantan el cuerpo ni lo mueven lejos. Las aletas echan de menos el agua.",
      },
      air: {
        en: "Fins cannot grip rock or push air, so a cliff is a hard place for a finned Buddy.",
        es: "Las aletas no agarran roca ni empujan aire, así que un acantilado es un sitio difícil para un Buddy con aletas.",
      },
    },
    webbed_feet: {
      water: {
        en: "Webbed feet are built-in paddles; every push moves lots of pond water.",
        es: "Las patas palmeadas son remos incorporados; cada empujón mueve mucha agua del estanque.",
      },
      fire: {
        en: "Wide thin webbed feet heat up fast on burning sand, so this Buddy hops carefully.",
        es: "Las patas palmeadas, anchas y finas, se calientan rápido en la arena ardiente, así que este Buddy salta con cuidado.",
      },
      air: {
        en: "Webs have nothing to grip on a cliff face, so climbing is wobbly.",
        es: "Las membranas no tienen nada que agarrar en un acantilado, así que trepar es tambaleante.",
      },
    },
    claws: {
      earth: {
        en: "Claws hook into bark and roots, so this Buddy climbs and digs all over the forest.",
        es: "Las garras se enganchan en la corteza y las raíces, así que este Buddy trepa y cava por todo el bosque.",
      },
      water: {
        en: "Claws cannot push water, so swimming is slow and splashy.",
        es: "Las garras no empujan el agua, así que nadar es lento y con mucho chapoteo.",
      },
      fire: {
        en: "Claws dig a cool burrow under the hot sand in seconds, just like a fennec fox.",
        es: "Las garras cavan una madriguera fresca bajo la arena caliente en segundos, como un zorro del desierto.",
      },
      air: {
        en: "Claws hook into cracks in the cliff rock, the way a bat hangs on by its claws, so this Buddy scrambles up high.",
        es: "Las garras se enganchan en las grietas de la roca, como un murciélago colgado de sus garras, así que este Buddy trepa muy alto.",
      },
    },
    padded_paws: {
      earth: {
        en: "Soft pads sneak silently over leaves and twigs, like a cat stalking.",
        es: "Las almohadillas blandas avanzan en silencio sobre hojas y ramitas, como un gato al acecho.",
      },
      water: {
        en: "Soft pads slip on wet rock and do not push water, so the pond is slow going.",
        es: "Las almohadillas blandas resbalan en la roca mojada y no empujan el agua, así que el estanque se hace lento.",
      },
      fire: {
        en: "Furry padded paws trot across burning sand that would scorch bare feet.",
        es: "Las patas acolchadas y peludas trotan por arena ardiente que quemaría unos pies desnudos.",
      },
      air: {
        en: "Soft pads slip a little on bare cliff rock, so climbing takes extra care.",
        es: "Las almohadillas blandas resbalan un poco en la roca del acantilado, así que trepar requiere más cuidado.",
      },
    },
  },
  covering: {
    short_fur: {
      earth: {
        en: "A light short coat is easy to move in through the forest and keeps the night chill off.",
        es: "Un pelo corto y ligero es cómodo para moverse por el bosque y quita el frío de la noche.",
      },
      water: {
        en: "Short fur soaks up pond water and gets a little heavy for swimming.",
        es: "El pelo corto absorbe el agua del estanque y pesa un poco al nadar.",
      },
    },
    long_fur: {
      water: {
        en: "Long shaggy fur soaks up its own weight in water and drags the swimmer down.",
        es: "El pelo largo absorbe su propio peso en agua y hunde al nadador.",
      },
      fire: {
        en: "A thick coat traps heat in the desert, so this Buddy overheats and slows down.",
        es: "Un pelaje grueso guarda el calor en el desierto, así que este Buddy se acalora y se vuelve más lento.",
      },
      air: {
        en: "On a cold windy cliff, long fur keeps the Buddy warm and its muscles ready, like a mountain goat.",
        es: "En un acantilado frío y ventoso, el pelo largo mantiene al Buddy caliente y sus músculos listos, como una cabra montesa.",
      },
    },
    smooth_scales: {
      earth: {
        en: "Smooth scales slide easily between roots and leaf litter.",
        es: "Las escamas lisas se deslizan fácil entre raíces y hojas.",
      },
      water: {
        en: "Slick scales let water slide past with almost no drag, so this Buddy swims fast.",
        es: "Las escamas resbaladizas dejan pasar el agua casi sin freno, así que este Buddy nada rápido.",
      },
      fire: {
        en: "Waterproof scales keep precious water inside, so this Buddy stays lively in the heat.",
        es: "Las escamas impermeables guardan el agua preciosa dentro, así que este Buddy sigue activo con el calor.",
      },
      air: {
        en: "Smooth scales trap no warm air, so this Buddy gets chilly and stiff in the cold cliff wind.",
        es: "Las escamas lisas no guardan aire caliente, así que este Buddy se enfría y se pone rígido con el viento frío del acantilado.",
      },
    },
    keeled_scales: {
      earth: {
        en: "Rough ridged scales grip bark and roots as this Buddy climbs.",
        es: "Las escamas ásperas con quilla agarran la corteza y las raíces cuando este Buddy trepa.",
      },
      water: {
        en: "Rough scales drag a little in the water, so swimming is slower than with smooth ones.",
        es: "Las escamas ásperas frenan un poco en el agua, así que nadar es más lento que con escamas lisas.",
      },
      fire: {
        en: "Ridged scales grip sand and collect dew for drinking, just like a thorny devil.",
        es: "Las escamas con quilla agarran la arena y recogen rocío para beber, como un diablo espinoso.",
      },
    },
    hard_shell: {
      earth: {
        en: "A heavy shell is safe but slow to carry over roots and logs.",
        es: "Un caparazón pesado es seguro pero lento de cargar sobre raíces y troncos.",
      },
      water: {
        en: "A shell is heavy in water and hard to steer, so this Buddy paddles slowly.",
        es: "Un caparazón pesa en el agua y cuesta dirigirlo, así que este Buddy rema despacio.",
      },
      fire: {
        en: "A shell shades the Buddy from the desert sun, but it is still a lot to carry across hot sand.",
        es: "El caparazón da sombra al Buddy bajo el sol del desierto, pero sigue siendo mucho que cargar por la arena caliente.",
      },
      air: {
        en: "A shell is far too heavy to climb or glide with, so the cliff is the slowest place for it.",
        es: "Un caparazón pesa demasiado para trepar o planear, así que el acantilado es el sitio más lento para él.",
      },
    },
    feathers: {
      water: {
        en: "Oiled feathers shed water like a duck's, so this Buddy stays light in the pond.",
        es: "Las plumas engrasadas repelen el agua como las de un pato, así que este Buddy se mantiene ligero en el estanque.",
      },
      fire: {
        en: "Feathers trap heat, so in the desert this Buddy has to slow down to stay cool.",
        es: "Las plumas guardan el calor, así que en el desierto este Buddy tiene que ir más despacio para no acalorarse.",
      },
      air: {
        en: "Feathers cut the cliff wind and keep the Buddy warm at once, a double win up high.",
        es: "Las plumas cortan el viento del acantilado y mantienen al Buddy caliente a la vez, un doble premio en las alturas.",
      },
    },
  },
};

// ── Wondering nudges (curious, never corrective) ───────────────────────────

export const WONDER_POOL: Localized[] = [
  {
    en: "I wonder what would happen with gills in the desert…",
    es: "Me pregunto qué pasaría con branquias en el desierto…",
  },
  {
    en: "I wonder which part would change the most if this Buddy moved to the pond?",
    es: "Me pregunto qué parte cambiaría más si este Buddy se mudara al estanque.",
  },
  {
    en: "I wonder if there is a Buddy that hears well AND moves fast up on the cliffs?",
    es: "Me pregunto si hay un Buddy que oiga bien Y se mueva rápido en los acantilados.",
  },
  {
    en: "I wonder what a hard shell would do to a flyer…",
    es: "Me pregunto qué le haría un caparazón a un volador…",
  },
  {
    en: "I wonder which two parts would make the sneakiest forest Buddy?",
    es: "Me pregunto qué dos partes harían el Buddy más sigiloso del bosque.",
  },
  {
    en: "I wonder what happens if you keep the same parts but pick a different home?",
    es: "Me pregunto qué pasa si guardas las mismas partes pero eliges otro hogar.",
  },
];

// ── Name kit labels ─────────────────────────────────────────────────────────

export const NAME_ADJECTIVE_LABEL: Record<NameAdjective, Localized> = {
  swift: { en: "Swift", es: "Veloz" },
  brave: { en: "Brave", es: "Valiente" },
  sparkly: { en: "Sparkly", es: "Brillante" },
  mighty: { en: "Mighty", es: "Fuerte" },
  gentle: { en: "Gentle", es: "Gentil" },
  sunny: { en: "Sunny", es: "Alegre" },
  bold: { en: "Bold", es: "Audaz" },
  happy: { en: "Happy", es: "Feliz" },
};

export const NAME_NOUN_LABEL: Record<NameNoun, Localized> = {
  finfox: { en: "Finfox", es: "Aletazorro" },
  hopper: { en: "Hopper", es: "Saltarín" },
  glider: { en: "Glider", es: "Planeador" },
  digger: { en: "Digger", es: "Excavador" },
  splasher: { en: "Splasher", es: "Chapoteador" },
  crawler: { en: "Crawler", es: "Gateador" },
  flutter: { en: "Flutter", es: "Aleteo" },
  roamer: { en: "Roamer", es: "Vagabundo" },
};

/** Word order differs by language; ids are what get stored. */
export const NAME_TEMPLATE: Localized = {
  en: "{adjective} {noun}",
  es: "{noun} {adjective}",
};

/** Pure, locale-explicit name rendering (the React layer passes the active
 *  language; tests pass it directly). */
export function renderBuddyName(
  name: { adjective: NameAdjective; noun: NameNoun },
  locale: string,
): string {
  const key: keyof Localized = locale === "es" ? "es" : "en";
  return NAME_TEMPLATE[key]
    .replace("{adjective}", NAME_ADJECTIVE_LABEL[name.adjective][key])
    .replace("{noun}", NAME_NOUN_LABEL[name.noun][key]);
}

/** Look up any option's science card regardless of category. */
export function scienceFor(
  category: Category | "pattern",
  option: AnyOptionId | Pattern,
): ScienceCard {
  if (category === "pattern") return PATTERN_SCIENCE[option as Pattern];
  return (SCIENCE[category] as Record<string, ScienceCard>)[option];
}

export function whyFor(
  category: Category,
  option: AnyOptionId,
  biome: Biome,
): Localized | null {
  const byOption = WHY[category] as Record<
    string,
    Partial<Record<Biome, Localized>> | undefined
  >;
  return byOption[option]?.[biome] ?? null;
}

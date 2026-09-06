/**
 * Word banks for the COLLIDE engine and smart defaults.
 */

export const OBJECTS_AND_PLACES = [
  "a decommissioned bell tower",
  "an unmetered air well",
  "a counterfeit pilgrimage permit",
  "a drowned records vault",
  "a salt-crusted telegraph relay",
  "an anatomical amphitheatre",
  "a border customs shed",
  "a blind courier's satchel",
  "a quarantined mountain cloister",
  "a broken funicular terminal",
  "a municipal debt registry",
  "a moth-eaten conservatory",
  "a rusted floodgate mechanism",
  "a bone-china tea service with bloodstains",
  "an unlicensed apothecary barge",
  "a former leper asylum",
  "a cartographer's private basement",
  "a tax-collector's deadbox",
  "a clockwork lighthouse that ticks backward",
  "a hunter academy entrance exam docket",
];

export const EMOTIONAL_REGISTERS = [
  "spiteful, unhurried, quietly devoted",
  "feral optimism under bureaucratic decay",
  "bitter nostalgia and dry gallows humor",
  "paranoia, domestic warmth, sudden violence",
  "reverent grief disguised as commerce",
  "unhinged bravado, exhaustion, tender pride",
  "austere longing, clinical scrutiny",
  "claustrophobic tenderness, heavy damp",
  "feverish devotion, polite cruelty",
  "melancholic wonder, dry irony",
  "grim workplace solidarity, stubborn hope",
];

export const STRUCTURAL_CONSTRAINTS = [
  "she's been dead three years but nobody told her",
  "every transaction requires physical blood collateral",
  "the inquiry arrives at sunrise tomorrow",
  "the debt increases every time someone apologizes",
  "leaving costs ten times more than entering",
  "the client is actively sabotaging the search",
  "the only weapon left is an unsigned lease",
  "the dead do not leave until their arrears are settled",
  "no one may speak of what was buried beneath the hearth",
  "everyone knows the verdict except the jury",
  "the scholarship was a bounty on the applicant's head",
  "the machine breaks if anyone speaks with sincerity",
];

export interface NovelSpark {
  id: string;
  category: "Anime & Manga" | "Gothic & Classic Lit" | "Cinematic & Sci-Fi" | "Historical Oddity" | "AI Roleplay Tropes";
  title: string;
  premise: string;
  sourceInspiration: string;
}

export const NOVEL_SPARKS_VAULT: NovelSpark[] = [
  // Anime & Manga
  {
    id: "spk-ani-1",
    category: "Anime & Manga",
    title: "The Memory Tuition",
    premise: "Supernatural hunter academy where tuition is paid in harvested memories, and the prodigy applicant just ran out of childhood.",
    sourceInspiration: "Hunter x Hunter + Chainsaw Man",
  },
  {
    id: "spk-ani-2",
    category: "Anime & Manga",
    title: "Graveyard Shift Overlord",
    premise: "A sealed demon lord works the graveyard shift at an orbital 24-hour convenience store during a planetary quarantine.",
    sourceInspiration: "The Devil is a Part-Timer + Cyberpunk",
  },
  {
    id: "spk-ani-3",
    category: "Anime & Manga",
    title: "Apology Curse",
    premise: "A contract devil who can only grant wishes or lend power if both contractor and target genuinely apologize to each other first.",
    sourceInspiration: "Jujutsu Kaisen + Monogatari",
  },
  {
    id: "spk-ani-4",
    category: "Anime & Manga",
    title: "Scrap Reef Vanguard",
    premise: "A decommissioned mecha ace living on a floating rust-reef is hired as a navigator by the rookie officer who shot them down.",
    sourceInspiration: "Gundam Iron-Blooded + Evangelion",
  },
  {
    id: "spk-ani-5",
    category: "Anime & Manga",
    title: "Shrinking Reset",
    premise: "A murder-mystery time loop in a feudal magical clan where every death resets the day, but the protagonist wakes up two inches shorter.",
    sourceInspiration: "Re:Zero + Erased",
  },

  // Gothic & Classic Lit
  {
    id: "spk-lit-1",
    category: "Gothic & Classic Lit",
    title: "The Salt Cathedral",
    premise: "An arctic whaling steamship trapped in winter pack ice finds an abandoned vessel frozen upright with its crew entombed in a chapel of salt.",
    sourceInspiration: "Frankenstein + The Terror",
  },
  {
    id: "spk-lit-2",
    category: "Gothic & Classic Lit",
    title: "The Medium's Ledger",
    premise: "A Victorian spiritualist runs a high-society blackmail syndicate using ghosts who shamelessly fabricate how their living relatives murdered them.",
    sourceInspiration: "Wilkie Collins + Crimson Peak",
  },
  {
    id: "spk-lit-3",
    category: "Gothic & Classic Lit",
    title: "The Alchemist's Corridor",
    premise: "The reading of an estranged patriarch's will requires all five heirs to live together in a single windowless corridor without speaking a word.",
    sourceInspiration: "Edgar Allan Poe + Shirley Jackson",
  },
  {
    id: "spk-lit-4",
    category: "Gothic & Classic Lit",
    title: "The Drowning Archipelago",
    premise: "A disgraced cartographer is commissioned by an ailing empress to chart an archipelago that only rises above sea level when someone is actively drowning.",
    sourceInspiration: "Borges + Italo Calvino",
  },
  {
    id: "spk-lit-5",
    category: "Gothic & Classic Lit",
    title: "The Asylum of Tomorrows",
    premise: "A 19th-century asylum alienist realizes his most delirious patients aren't losing their sanity—they are remembering tomorrow's newspaper.",
    sourceInspiration: "Dracula + Philip K. Dick",
  },

  // Cinematic & Sci-Fi
  {
    id: "spk-sci-1",
    category: "Cinematic & Sci-Fi",
    title: "Cold Orbit Truce",
    premise: "A two-person spy station in deep orbit continues their joint daily routines months after nuclear silence descended on both their home nations.",
    sourceInspiration: "Solaris + 2001: A Space Odyssey",
  },
  {
    id: "spk-sci-2",
    category: "Cinematic & Sci-Fi",
    title: "The Levee Detective",
    premise: "Underwater biopunk noir: a levee gumshoe is hired by an untouchable dry-sider oligarch to find a rebellious daughter who never set foot on dry land.",
    sourceInspiration: "Blade Runner + Chinatown",
  },
  {
    id: "spk-sci-3",
    category: "Cinematic & Sci-Fi",
    title: "Memory Foreclosure",
    premise: "A repo agent repossessing luxury synthetic memories falls into an obsessive spiral after decrypting the childhood of their fugitive target.",
    sourceInspiration: "Eternal Sunshine + Dark City",
  },
  {
    id: "spk-sci-4",
    category: "Cinematic & Sci-Fi",
    title: "The Stellar Eviction",
    premise: "A solar-sail abbey translating dying star frequencies receives an official municipal eviction notice stamped by an extinct galactic empire.",
    sourceInspiration: "Canticle for Leibowitz + Arrival",
  },
  {
    id: "spk-sci-5",
    category: "Cinematic & Sci-Fi",
    title: "Sleeved Passenger",
    premise: "A body-rental courier discovers a previous renter has etched an encrypted diary directly into the synaptic tissue of their leased spinal cord.",
    sourceInspiration: "Altered Carbon + Memento",
  },

  // Historical Oddity
  {
    id: "spk-his-1",
    category: "Historical Oddity",
    title: "The Radium Telegraph",
    premise: "1920s factory women painting luminous watch dials begin sending coded labor union distress signals by modulating the glowing numerals.",
    sourceInspiration: "Radium Girls + Peaky Blinders",
  },
  {
    id: "spk-his-2",
    category: "Historical Oddity",
    title: "The Black Tulip Syndicate",
    premise: "1637 Amsterdam tulip mania: the single most expensive black bulb in Christendom is revealed to be a poison delivery vessel engineered by anabaptists.",
    sourceInspiration: "Umberto Eco + Succession",
  },
  {
    id: "spk-his-3",
    category: "Historical Oddity",
    title: "The Quarantine Pass Counterfeit",
    premise: "Venetian plague doctor discovers the lazaretto island's chief physician is counterfeiting clean-bill-of-health wax seals for Venetian senators.",
    sourceInspiration: "The Decameron + The Third Man",
  },
  {
    id: "spk-his-4",
    category: "Historical Oddity",
    title: "The North Sea Ghost Tower",
    premise: "A 1968 rogue pirate radio crew broadcasting rock from an abandoned Maunsell sea fort begins intercepting Morse transmissions from a phantom battleship.",
    sourceInspiration: "The Boat That Rocked + The Twilight Zone",
  },

  // AI Roleplay Tropes
  {
    id: "spk-rp-1",
    category: "AI Roleplay Tropes",
    title: "Two Inquisitors in the Snow",
    premise: "Two rival inquisitors trapped in a snowbound mountain pass safehouse, each secretly carrying orders to execute the other at sunrise.",
    sourceInspiration: "The Hateful Eight + Disco Elysium",
  },
  {
    id: "spk-rp-2",
    category: "AI Roleplay Tropes",
    title: "The Re-Writing Grimoire",
    premise: "A sentient spellbook that gradually rewrites its reader's core morality and speech cadence to match the tragic villain of an unfinished myth.",
    sourceInspiration: "Elden Ring + Jonathan Strange",
  },
  {
    id: "spk-rp-3",
    category: "AI Roleplay Tropes",
    title: "The Disgraced Bodyguard's Debt",
    premise: "A disgraced paladin bound by magical oath to defend a spoiled young aristocrat whose secret crime was the exact cause of the paladin's exile.",
    sourceInspiration: "Witcher + Game of Thrones",
  },
  {
    id: "spk-rp-4",
    category: "AI Roleplay Tropes",
    title: "Sanctuary Tavern Siege",
    premise: "A neutral border tavern owner with an enchanted 'no-blade' covenant must host the leaders of two warring factions during an outside siege.",
    sourceInspiration: "John Wick + Deadwood",
  },
];

/**
 * Returns a randomized set of novel sparks across distinct categories.
 */
export function generateNovelSparks(count = 4): NovelSpark[] {
  // Shuffle categories
  const categories: NovelSpark["category"][] = [
    "Anime & Manga",
    "Gothic & Classic Lit",
    "Cinematic & Sci-Fi",
    "Historical Oddity",
    "AI Roleplay Tropes",
  ];
  
  // Pick one from diverse categories first
  const shuffledCats = [...categories].sort(() => 0.5 - Math.random());
  const selected: NovelSpark[] = [];

  for (const cat of shuffledCats) {
    if (selected.length >= count) break;
    const inCat = NOVEL_SPARKS_VAULT.filter((s) => s.category === cat);
    if (inCat.length > 0) {
      const pick = inCat[Math.floor(Math.random() * inCat.length)];
      if (!selected.some((s) => s.id === pick.id)) {
        selected.push(pick);
      }
    }
  }

  // Fill remaining if needed
  while (selected.length < count) {
    const unpicked = NOVEL_SPARKS_VAULT.filter((s) => !selected.some((sel) => sel.id === s.id));
    if (unpicked.length === 0) break;
    const pick = unpicked[Math.floor(Math.random() * unpicked.length)];
    selected.push(pick);
  }

  return selected;
}

export const SPARK_EXAMPLES = [
  "cozy apocalypse",
  "noir + cottagecore + grief",
  "she's been dead three years but nobody told her",
  "hunter academy where the scholarship is a death warrant",
  "underwater noir: a levee detective looking for a dry-sider's daughter",
  "dune spice smuggling ring run out of a monastery laundry",
];

export function rollCollision(): { objectPlace: string; register: string; constraint: string; combined: string } {
  const op = OBJECTS_AND_PLACES[Math.floor(Math.random() * OBJECTS_AND_PLACES.length)];
  const reg = EMOTIONAL_REGISTERS[Math.floor(Math.random() * EMOTIONAL_REGISTERS.length)];
  const con = STRUCTURAL_CONSTRAINTS[Math.floor(Math.random() * STRUCTURAL_CONSTRAINTS.length)];
  return {
    objectPlace: op,
    register: reg,
    constraint: con,
    combined: `${op} · ${reg} · ${con}`,
  };
}

export const KNOWN_FRANCHISES = [
  "Hunter x Hunter", "Hunter X Hunter", "HxH",
  "Dune", "Warhammer", "Warhammer 40k", "Warhammer 40,000", "40k",
  "Cyberpunk", "Cyberpunk 2077",
  "Elden Ring", "Dark Souls", "Bloodborne",
  "Disco Elysium",
  "Jujutsu Kaisen", "JJK",
  "Chainsaw Man",
  "Fallout", "The Elder Scrolls", "Skyrim",
  "Genshin Impact", "Honkai", "Arknights",
  "Witcher", "The Witcher",
  "Song of Ice and Fire", "Game of Thrones",
  "Star Wars", "Star Trek", "Mass Effect",
  "Lord of the Rings", "Tolkien",
  "Mad Max", "Shadowrun", "Dishonored", "Sunless Sea", "Fallen London"
];

export const LINGUISTIC_BASES = [
  "Anglo-Saxon / Early Middle English",
  "Franco-Burgundian",
  "West Slavic (Czech / Polish)",
  "Low German / Dutch",
  "North Iberian (Basque / Galician)",
  "Edo-period Japanese",
  "Classical Persian",
  "Old Norse / Faroese",
  "Finno-Ugric",
  "Greco-Anatolian",
];

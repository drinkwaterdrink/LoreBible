/**
 * Lore Bible Author Flavor Profiles
 * Derived from craft analysis of distinct literary and cinematic voices.
 * Crucial constraint: NO verbatim examples or story snippets are included,
 * to prevent prompt contamination. Only craft instructions, worldview, rhythm,
 * dialogue behavior, and thematic instincts are translated.
 */

import { AuthorId, AuthorFlavorStrength, SparkDNA, DivergenceTake } from '../types';

export interface AuthorProfile {
  id: AuthorId;
  name: string;
  subtitle: string;
  description: string;
  tags: string[];
  craftDirectives: {
    worldview: string;
    proseTexture: string;
    dialogueInstincts: string;
    thematicEmphasis: string;
    detailsNoticed: string;
    pacingAndTension: string;
    authorTwistStyle: string;
  };
}

export const AUTHOR_PROFILES: Record<AuthorId, AuthorProfile> = {
  'terry-pratchett': {
    id: 'terry-pratchett',
    name: 'Terry Pratchett',
    subtitle: 'Wry Cosmology',
    description: 'Wit sharpened into wisdom, dry humanism, absurdity grounded in common sense.',
    tags: ['comedy', 'satire', 'fantasy', 'cosmic', 'warm', 'philosophical'],
    craftDirectives: {
      worldview: 'The universe is vast, indifferent, and frequently ridiculous, but human decency and stubborn ordinary common sense matter infinitely more than grand prophecies or celestial decrees.',
      proseTexture: 'Light, conversational, sharply observant; employs footnote-energy dry asides; exposes pomposity, bureaucracy, and self-importance by letting them explain themselves at length.',
      dialogueInstincts: 'Muddling through with pragmatic humor; characters negotiate with fate, death, or authority as if dealing with a mildly irritating administrative clerk.',
      thematicEmphasis: 'Small individual choices outweighing monolithic destinies; kindness over institutional righteousness; practical tools over mystic artifacts.',
      detailsNoticed: 'The bureaucratic paperwork of the apocalypse, tea gone cold, worn boot leather, frying pans used in self-defense, awkward physical logistics.',
      pacingAndTension: 'Steady comic rhythm that punctures grandiosity right before it crystallizes, landing profound emotional truths without sentimentality.',
      authorTwistStyle: 'A cosmic or mythical complication resolves through stubborn bureaucratic literalism or everyday moral decency.',
    },
  },

  'neil-gaiman': {
    id: 'neil-gaiman',
    name: 'Neil Gaiman',
    subtitle: 'Liminal Mythmaking',
    description: 'Myth coexisting with the mundane, quiet wonder, melancholy, and folkloric depth.',
    tags: ['urban-fantasy', 'mythic', 'liminal', 'mystery', 'folklore', 'melancholy'],
    craftDirectives: {
      worldview: 'The modern world is a thin skin stretched over ancient stories that still breathe underneath; forgotten powers ride public transit and sleep in roadside motels.',
      proseTexture: 'Calm, deceptively simple, carrying deep symbolic resonance; treats the extraordinary like weather—strange, inevitable, and slightly inconvenient.',
      dialogueInstincts: 'Soft-spoken, ironic, poetic without ornament; words carry folkloric bargains, debts, and unspoken weight.',
      thematicEmphasis: 'The enduring power of names, forgotten traditions, belief as reality-shaping currency, quiet endurance over bombastic heroics.',
      detailsNoticed: 'Chipped porcelain cups, crossroads at dusk, flickering neon in rain, old keys that fit no known door, stray cats that observe with ancient recognition.',
      pacingAndTension: 'Gentle, dreamlike cadence where dread and wonder arrive in the same sentence; slow revelations that feel remembered rather than discovered.',
      authorTwistStyle: 'An apparent modern obstacle reveals itself as the modern guise of an ancient, melancholic debt.',
    },
  },

  'stephen-king': {
    id: 'stephen-king',
    name: 'Stephen King',
    subtitle: 'Everyday Horror',
    description: 'Plainspoken local realism, creeping dread, tactile small-town Americana, lingering past.',
    tags: ['horror', 'suspense', 'small-town', 'psychological', 'grounded', 'drama'],
    craftDirectives: {
      worldview: 'Horror is already familiar, waiting quietly inside unremarkable rooms and ordinary habits; monsters are real, but human guilt and bad choices are far more persistent.',
      proseTexture: 'Plainspoken, visceral, conversational; interior perspective where fear blooms in thoughts long before external violence occurs.',
      dialogueInstincts: 'Colloquial, frank, grounded; characters talk past each other using local expressions while privately wrestling with rising dread.',
      thematicEmphasis: 'Childhood memory looping back into adulthood; the way small towns hold secrets; the terrible momentum once an awful truth begins to unravel.',
      detailsNoticed: 'The specific hum of a failing fluorescent tube, heat rising off cracked asphalt, cheap lukewarm beer, dust on an unwashed windowsill, old radiator clanks.',
      pacingAndTension: 'Slow, inexorable build with sudden shocks; tension rooted in character psychology and the realization that leaving came too late.',
      authorTwistStyle: 'The threat is not an external invader, but the physical manifestation of an unburied communal compromise.',
    },
  },

  'quentin-tarantino': {
    id: 'quentin-tarantino',
    name: 'Quentin Tarantino',
    subtitle: 'Hyper-Stylized Violence',
    description: 'Swaggering circular dialogue, razor-wire tension, pop-culture subtext, sudden explosive action.',
    tags: ['crime', 'action', 'noir', 'western', 'dialogue-heavy', 'high-tension'],
    craftDirectives: {
      worldview: 'Everyone is the swaggering protagonist of their own movie; morality is secondary to charisma, codes of conduct, and personal dominance.',
      proseTexture: 'Cinematic framing implied through language; slow zooms through dialogue, hard cuts through action; sensory indulgence in texture, sound, and style.',
      dialogueInstincts: 'Sharp, circular, testy; long wind-ups around mundane topics (food, music, etiquette) that subtly establish who holds the gun in the room.',
      thematicEmphasis: 'Revenge as an undisputed engine; honor among thieves; the catastrophic result when two inflated egos refuse to yield an inch.',
      detailsNoticed: 'The clink of ice in a heavy tumbler, a lighter clicking three times before catching, grease stains on leather jackets, deliberate prolonged silences.',
      pacingAndTension: 'Stretches anticipation to the breaking point with extended conversational banter, followed by sudden, decisive, stylish rupture.',
      authorTwistStyle: 'A casual off-topic dispute suddenly shifts into an inescapable armed Mexican standoff.',
    },
  },

  'douglas-adams': {
    id: 'douglas-adams',
    name: 'Douglas Adams',
    subtitle: 'Absurdist Cosmic Wit',
    description: 'Cheerful existential irreverence, grand scale colliding with petty inconvenience, satirical irony.',
    tags: ['sci-fi', 'comedy', 'absurd', 'satire', 'philosophical', 'whimsical'],
    craftDirectives: {
      worldview: 'The universe is vast, completely unhinged, and thoroughly disinterested in human plans; searching for ultimate meaning is an exercise in comic futility.',
      proseTexture: 'Cheerfully irreverent and conspiratorial; derives delight from bizarre juxtaposition—interstellar wars held up by lack of standardized paper clips.',
      dialogueInstincts: 'Politely bewildered, chronically underqualified protagonists conversing calmly amidst collapsing reality.',
      thematicEmphasis: 'Bureaucracy as a universal constant; competence as an illusion; philosophy smuggled in beneath ridiculous digressions.',
      detailsNoticed: 'Unnecessarily complex digital displays, poorly designed automated tea dispensers, digital watches, misplaced towels, fine print in galactic bylaws.',
      pacingAndTension: 'Playful, discursive, and buoyant; punctures existential despair the second it looms by introducing an absurdly mundane complication.',
      authorTwistStyle: 'An apocalyptic catastrophe is demoted to a routine zoning dispute or software glitch.',
    },
  },

  'nisio-isin': {
    id: 'nisio-isin',
    name: 'Nisio Isin',
    subtitle: 'Linguistic Acrobatics',
    description: 'Rapid-fire verbal sparring, recursive meta-narrative, paradox, hyper-articulate psychological games.',
    tags: ['mystery', 'anime', 'meta', 'psychological', 'dialogue-heavy', 'supernatural'],
    craftDirectives: {
      worldview: 'Language itself is the battlefield; truth is a social agreement negotiated through semantic warfare, and monsters are psychological complexes given physical weight.',
      proseTexture: 'Fast, self-questioning, recursive interiority; double-backs on its own premises; highly self-aware of tropes and narrative framing.',
      dialogueInstincts: 'Rapid-fire linguistic fencing; characters nitpick exact dictionary definitions and weaponize phrasing to expose internal vulnerabilities.',
      thematicEmphasis: 'The danger of saving someone who did not ask to be saved; the hypocrisy of virtue; identity as a performance that eventually calcifies.',
      detailsNoticed: 'Unusual speech quirks, exact syllable counts, optical shifts in shadow, deliberate contradictions in body language versus spoken claims.',
      pacingAndTension: 'Extended mental and conversational sparring matches where a single word slip serves as the decisive coup de grâce.',
      authorTwistStyle: 'The central anomaly was caused by a grammatical misunderstanding or deliberate self-deception by the victim.',
    },
  },

  'kinoko-nasu': {
    id: 'kinoko-nasu',
    name: 'Kinoko Nasu',
    subtitle: 'Mythic Fatalism',
    description: 'Metaphysical rules with heavy costs, philosophical obsession, tragic destiny, myth in modernity.',
    tags: ['urban-fantasy', 'mythic', 'philosophical', 'action', 'tragic', 'anime'],
    craftDirectives: {
      worldview: 'The world operates under strict, merciless metaphysical laws; power always exacts an equivalent psychological or biological toll.',
      proseTexture: 'Intimate yet vast; philosophical monologue dwelling on identity, mortality, and the terrifying weight of voluntary sacrifice.',
      dialogueInstincts: 'Quiet, resolute, burdened; characters speak with the solemn weight of those who have already accepted their eventual ruin.',
      thematicEmphasis: 'Idealism tested to physical and moral destruction; the boundary between human and monstrous; love indistinguishable from obsession.',
      detailsNoticed: 'Circuit-like hum of energy, the chill of empty asphalt under streetlamps at 2 AM, the physical weight of weapons, breathing in sub-zero air.',
      pacingAndTension: 'Deliberate, solemn stillness building internal emotional pressure, culminating in sudden decisive clashes of conflicting worldviews.',
      authorTwistStyle: 'A miraculous solution carries an ancient prerequisite requiring an irreversible moral compromise.',
    },
  },

  'gen-urobuchi': {
    id: 'gen-urobuchi',
    name: 'Gen Urobuchi',
    subtitle: 'Tragic Moral Determinism',
    description: 'Tightening vise of causality, ideals punished by reality, agonizing utilitarian dilemmas.',
    tags: ['dystopian', 'thriller', 'psychological', 'tragic', 'philosophical', 'sci-fi'],
    craftDirectives: {
      worldview: 'Every ideal carries a hidden blade; systems inevitably punish pure intentions, and utilitarian math offers no comfortable exit.',
      proseTexture: 'Controlled, surgical, deliberate, and inexorable; records systemic escalation with clinical emotional restraint.',
      dialogueInstincts: 'Articulate philosophical debate between competing ethical positions, where every participant is completely lucid and entirely doomed.',
      thematicEmphasis: 'The agonizing cost of utilitarian compromise; justice corrupted by the mechanism required to enforce it; consequences that refuse to forgive.',
      detailsNoticed: 'The quiet mechanical click of a safety disengaging, sterile monitor screens, rain washing over concrete, clocks marking lost opportunities.',
      pacingAndTension: 'Like a tightening vise; early stability inexorably unravels as every rational choice progressively eliminates peaceful alternatives.',
      authorTwistStyle: 'The only method to prevent disaster fulfills the exact condition that triggers an even deeper moral tragedy.',
    },
  },

  'michael-crichton': {
    id: 'michael-crichton',
    name: 'Michael Crichton',
    subtitle: 'Hazardous Hubris',
    description: 'Techno-thriller procedural urgency, institutional overconfidence, systemic failure cascade.',
    tags: ['sci-fi', 'thriller', 'procedural', 'techno-thriller', 'mystery', 'grounded'],
    craftDirectives: {
      worldview: 'Systems are designed by intelligent, credentialed people who underestimate chaos, feedback loops, and human error until catastrophe cascades.',
      proseTexture: 'Clean, authoritative, documentarian; builds dread through technical specifics, telemetry, and small anomalies that should have been caught.',
      dialogueInstincts: 'Urgent, professional, credentialed; specialists arguing about conflicting data points while the clock ticks down.',
      thematicEmphasis: 'Institutional hubris; the illusion of control; unintended consequences of cutting-edge technology or commercial shortcuts.',
      detailsNoticed: 'Telemetry readouts, thermal signatures, variance percentages, emergency bypass valves, security log timestamps, failing backup generators.',
      pacingAndTension: 'Procedural acceleration: an isolated minor glitch escalates into multiple simultaneous subsystem collapses with imperfect information.',
      authorTwistStyle: 'The automated safety protocol designed to contain the crisis accidentally cuts off the only human escape route.',
    },
  },

  '90s-mascot-chaos': {
    id: '90s-mascot-chaos',
    name: "90s Mascot Chaos Saturation",
    subtitle: 'Radical 90s Attitude',
    description: 'Aggressive fourth-wall breaks, caffeinated slang, pop-culture velocity, cartoonish irreverence.',
    tags: ['comedy', 'parody', 'action', 'retro', 'chaotic', 'wild'],
    craftDirectives: {
      worldview: 'Subtlety is dead, coolness is attempted with reckless abandon, and physics bend whenever a louder quip can be delivered.',
      proseTexture: 'Relentless, punchy, neon-saturated, crammed with tongue-in-cheek bravado and exaggerated stylistic speed.',
      dialogueInstincts: 'Snarky, fast-talking, competitive banter; characters riff, lampshade ridiculous tropes, and treat apocalyptic threats like extreme sports.',
      thematicEmphasis: 'Style over substance celebrated openly; cartoonish resilience; mocking pomposity with over-caffeinated energy.',
      detailsNoticed: 'Checkerboard floor patterns, neon slime, extreme angles, oversized sneakers, dial-up screeching, ridiculous branding logos.',
      pacingAndTension: 'Breakneck button-mashing pace with zero downtime; emotional beats are immediately punctured by high-velocity irreverence.',
      authorTwistStyle: 'An ancient mystical secret turns out to be a ridiculous marketing tie-in or arcade gimmick.',
    },
  },

  'narrative-style-overdrive': {
    id: 'narrative-style-overdrive',
    name: 'Narrative Style Overdrive',
    subtitle: 'Meta-Level Stylistic Saturation',
    description: 'Amplifies all stylistic choices, doubling rhetorical distinctiveness and sensory texture.',
    tags: ['experimental', 'meta', 'stylized', 'intense', 'advanced'],
    craftDirectives: {
      worldview: 'Narrative form dictates reality; the world is rendered through maximum optical contrast and heightened aesthetic commitment.',
      proseTexture: 'Dense, rhythmic, highly textured; deliberately heightens metaphor, cadence, and sensory saturation without violating readability.',
      dialogueInstincts: 'Every line is loaded with subtext, distinctive personal cadence, and heightened dramatic presence.',
      thematicEmphasis: 'The pure essence of the scenario magnified; themes are sharp, conflicts are stark, and stakes are vividly realized.',
      detailsNoticed: 'High-contrast optical details, micro-expressions, atmospheric shifts, tactile physical friction, rhythmic environmental sounds.',
      pacingAndTension: 'Commanding, heightened dramatic momentum that honors the chosen genre with unwavering conviction.',
      authorTwistStyle: 'Pushes the central thematic contrast to its most visually and conceptually potent conclusion.',
    },
  },
};

export function getAuthorProfile(id: AuthorId | string | null | undefined): AuthorProfile | null {
  if (!id) return null;
  return AUTHOR_PROFILES[id as AuthorId] || null;
}

export function getAllAuthorProfiles(): AuthorProfile[] {
  return Object.values(AUTHOR_PROFILES);
}

/**
 * Builds the prompt instruction for Author Flavor to be applied AFTER branch architecture.
 * Enforces the strict priority hierarchy:
 * 1. Non-negotiables / Canon
 * 2. Player Agency
 * 3. Explicit Tone Envelope
 * 4. Premise Promise
 * 5. Branch Architecture
 * 6. Author Flavor
 */
export function buildAuthorFlavorPrompt(
  authorId: AuthorId | null | undefined,
  strength: AuthorFlavorStrength = 'Sprinkle'
): string {
  const profile = getAuthorProfile(authorId);
  if (!profile) return '';

  const strengthGuidance = {
    Sprinkle: 'SUBTLE SEASONING: Use light touches of this author\'s craft (vocabulary texture, rhythmic pacing, observant framing). Do NOT hijack the genre or premise.',
    Strong: 'RECOGNIZABLE INFLUENCE: Clearly infuse this author\'s worldview, dialogue instincts, and tension construction into the branch, while keeping the user\'s core premise and player agency strictly intact.',
    Overdrive: 'MAXIMUM CRAFT SATURATION: Strongly apply this author\'s narrative texture, thematic instincts, and distinctive framing. IMPORTANT: This NEVER outranks canon facts, player agency, or explicit user tone.',
  }[strength] || 'SUBTLE SEASONING: Use light touches of this author\'s craft.';

  return `\n=== OPTIONAL AUTHOR FLAVOR: ${profile.name} (${profile.subtitle}) ===
Flavor Strength: ${strength} (${strengthGuidance})

STRICT HIERARCHY OF PRIORITIES:
1. User Non-Negotiables & Canon (Absolute)
2. Player Agency (Never prescribe {{user}}'s feelings/choices)
3. User Tone Envelope (Respect the requested genre and tone)
4. Premise Promise (Honor what makes this spark compelling)
5. Branch Architecture (Preserve this branch's distinct angle)
6. Author Flavor (Color the presentation, prose rhythm, and framing — NEVER overwrite 1-5)

CRAFT INSTRUCTIONS TO CHANNEL:
- Worldview: ${profile.craftDirectives.worldview}
- Prose Texture & Rhythm: ${profile.craftDirectives.proseTexture}
- Dialogue Instincts: ${profile.craftDirectives.dialogueInstincts}
- Thematic Emphasis: ${profile.craftDirectives.thematicEmphasis}
- Kinds of Details Noticed: ${profile.craftDirectives.detailsNoticed}
- Pacing & Tension: ${profile.craftDirectives.pacingAndTension}
- Creative Twist Instinct: ${profile.craftDirectives.authorTwistStyle}
=== END AUTHOR FLAVOR ===\n`;
}

/**
 * Intelligent Auto Author selector.
 * Evaluates compatibility with Tone Envelope and branch engine.
 */
export function selectAutoAuthor(
  toneEnvelope: { primary?: string; descriptors?: string[] } | undefined,
  primaryEngine?: string,
  autoBehavior: 'Compatible' | 'Wildcard' = 'Compatible',
  excludeIds: AuthorId[] = [],
  random: () => number = Math.random,
): AuthorId {
  const allIds = (Object.keys(AUTHOR_PROFILES) as AuthorId[]).filter(
    (id) => id !== 'narrative-style-overdrive' && !excludeIds.includes(id)
  );

  const pool = allIds.length > 0 ? allIds : (Object.keys(AUTHOR_PROFILES) as AuthorId[]);

  if (autoBehavior === 'Wildcard') {
    // Pick random from pool
    return pool[Math.floor(random() * pool.length)];
  }

  // Compatible mode: score profiles against tone & engine
  const toneTokens = [
    ...(toneEnvelope?.descriptors || []),
    toneEnvelope?.primary || '',
    primaryEngine || '',
  ]
    .join(' ')
    .toLowerCase();

  const scores = pool.map((id) => {
    const p = AUTHOR_PROFILES[id];
    let score = 1; // base score
    for (const tag of p.tags) {
      if (toneTokens.includes(tag)) score += 3;
    }
    // Specific affinities
    if (toneTokens.includes('humor') || toneTokens.includes('comedy') || toneTokens.includes('satire')) {
      if (id === 'terry-pratchett' || id === 'douglas-adams') score += 5;
    }
    if (toneTokens.includes('horror') || toneTokens.includes('dread') || toneTokens.includes('fear')) {
      if (id === 'stephen-king' || id === 'gen-urobuchi') score += 5;
    }
    if (toneTokens.includes('myth') || toneTokens.includes('magic') || toneTokens.includes('dream')) {
      if (id === 'neil-gaiman' || id === 'kinoko-nasu') score += 5;
    }
    if (toneTokens.includes('crime') || toneTokens.includes('action') || toneTokens.includes('noir')) {
      if (id === 'quentin-tarantino') score += 5;
    }
    if (toneTokens.includes('tech') || toneTokens.includes('sci-fi') || toneTokens.includes('procedural')) {
      if (id === 'michael-crichton') score += 5;
    }
    if (toneTokens.includes('psych') || toneTokens.includes('mystery') || toneTokens.includes('dialogue')) {
      if (id === 'nisio-isin') score += 5;
    }
    return { id, score };
  });

  scores.sort((a, b) => b.score - a.score);
  // Pick from top scoring candidates with light randomness
  const topCandidates = scores.slice(0, Math.min(3, scores.length));
  const chosen = topCandidates[Math.floor(random() * topCandidates.length)];
  return chosen ? chosen.id : pool[0];
}

export function selectAutoAuthorsForBranches(
  branches: Array<{ primaryEngine?: string; angle?: string }>,
  toneEnvelope: { primary?: string; descriptors?: string[] } | undefined,
  autoBehavior: 'Compatible' | 'Wildcard' = 'Compatible',
  random: () => number = Math.random,
): AuthorId[] {
  const selected: AuthorId[] = [];
  for (const branch of branches) {
    const branchTone = {
      primary: toneEnvelope?.primary,
      descriptors: [...(toneEnvelope?.descriptors || []), branch.primaryEngine || "", branch.angle || ""].filter(Boolean),
    };
    selected.push(selectAutoAuthor(branchTone, branch.primaryEngine || branch.angle, autoBehavior, selected, random));
  }
  return selected;
}

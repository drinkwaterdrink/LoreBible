export interface ForgeSourceContextInput {
  sparkText: string;
  parse?: unknown;
  canon?: unknown;
  chosenTake?: unknown;
  physics?: unknown;
  existingDoc?: unknown;
}

type LooseRecord = Record<string, unknown>;

function record(value: unknown): LooseRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as LooseRecord : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function namedEntries(value: unknown, includeRole = false): string {
  if (!Array.isArray(value)) return "";
  return value.map((item) => {
    const entry = record(item);
    const fields = record(entry?.fields);
    const name = text(fields?.name) || text(entry?.id);
    return includeRole ? `${name} (${text(fields?.role)})` : name;
  }).filter(Boolean).join(", ");
}

/** Single deterministic source of Forge project context for generation and previews. */
export function buildForgeSourceContext(params: ForgeSourceContextInput): string {
  const { sparkText } = params;
  const parse = record(params.parse);
  const canon = record(params.canon);
  const chosenTake = record(params.chosenTake);
  const physics = record(params.physics);
  const existingDoc = record(params.existingDoc);
  const nonNegs = Array.isArray(parse?.nonNegotiables) ? parse.nonNegotiables : [];
  const regWords = Array.isArray(parse?.registerWords) ? parse.registerWords : [];
  const userRole = text(parse?.userRole);

  let ctx = `NON-NEGOTIABLE PREMISE: "${sparkText}".
Everything generated must be recognisably part of this world.
Required elements: ${JSON.stringify(nonNegs)}.
Required register: ${JSON.stringify(regWords)}.
Player character: ALWAYS leave the player character reference as {{user}}; NEVER generate a persona name for the user.`;

  if (userRole) ctx += `\nPlayer starting position: ${userRole}.`;

  if (canon?.enabled && text(canon.franchiseName)) {
    const franchise = text(canon.franchiseName);
    ctx += `\n\nCANON MODE ACTIVE:
Franchise: ${franchise}
Fidelity tier: ${text(canon.fidelity) || "Adjacent"}
MANDATORY INSTRUCTIONS FOR CANON MODE:
1. Use real in-universe proper nouns, factions, licensing, technologies, and vocabulary from ${franchise}.
2. Reinterpret mundanity as the authentic logistics and material realities OF THIS WORLD (${franchise}) — supply lines, protocols, maintenance, and jurisdictional borders.
3. Keep metaphysical and world rules consistent with canon.`;
  }

  if (chosenTake) {
    ctx += `\n\nCHOSEN PREMISE ANGLE:
Title: ${text(chosenTake.title)}
Pitch: ${text(chosenTake.pitch)}
Angle: ${text(chosenTake.angle)}
What's Strange: ${text(chosenTake.whatsStrange)}
Tone: ${text(chosenTake.genreTone)}`;
  }

  if (physics) {
    ctx += `\n\nWORLD CONSTRAINTS:
- Density: ${text(physics.density) || "Standard"}
- Strangeness: ${physics.strangeness || 3}/5
- Mundanity: ${physics.mundanity || 4}/5
- Violence: ${text(physics.violence) || "Moderate"}
- Horror: ${text(physics.horror) || "Psych"}
- Romance: ${text(physics.romance) || "Subplot"}
- Pacing: ${text(physics.pacing) || "Slow burn"}`;
    if (!canon?.enabled && text(physics.linguisticBase).trim()) ctx += `\n- Linguistic Base: ${text(physics.linguisticBase)}`;
    if (text(physics.mustInclude).trim()) ctx += `\n- Author Must-Include: "${text(physics.mustInclude).trim()}"`;
    if (text(physics.mustAvoid).trim()) ctx += `\n- Author Must-Avoid: "${text(physics.mustAvoid).trim()}"`;
  }

  if (existingDoc) {
    ctx += `\n\nALREADY ESTABLISHED SECTIONS (Hold full continuity and coherence with these):`;
    const core = record(existingDoc.core);
    if (core) {
      ctx += `\n- Title: "${text(core.title)}"`;
      ctx += `\n- Core Rule: "${text(core.theRule)}"`;
      ctx += `\n- Core Cost: "${text(core.theCost)}"`;
      ctx += `\n- Situation: "${text(core.theSituation)}"`;
      ctx += `\n- Pressure: "${text(core.thePressure)}"`;
    }
    const user = record(existingDoc.user);
    if (user) {
      ctx += `\n- User Position: "${text(user.rolePosition)}"`;
      ctx += `\n- User Starts With: "${text(user.startsWith)}"`;
    }
    const worldPhysics = record(existingDoc.worldPhysics);
    if (worldPhysics) {
      ctx += `\n- Authority Check: "${text(worldPhysics.authorityCheck)}"`;
      ctx += `\n- Power Ceiling: "${text(worldPhysics.powerCeiling)}"`;
    }
    const locations = namedEntries(existingDoc.locations);
    if (locations) ctx += `\n- Established Locations: ${locations}`;
    const factions = namedEntries(existingDoc.factions);
    if (factions) ctx += `\n- Established Factions: ${factions}`;
    const npcs = namedEntries(existingDoc.npcs, true);
    if (npcs) ctx += `\n- Established NPCs: ${npcs}`;
  }
  return ctx;
}

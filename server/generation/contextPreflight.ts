import type { ForgeJobDestinationV1, ForgeJobV1 } from "../../src/contracts/projectGraph.js";
import type { ForgeSpecialistJob } from "./forgeSpecialistPlan.js";

export class ContextPreflightError extends Error {
  readonly code: string;
  readonly jobId: string;
  readonly actualTokens?: number;
  readonly limitTokens?: number;
  readonly missingDependencies?: string[];

  constructor(rejection: ContextPreflightRejection) {
    super(rejection.message);
    this.name = "ContextPreflightError";
    this.code = rejection.code;
    this.jobId = rejection.jobId;
    this.actualTokens = rejection.actualTokens;
    this.limitTokens = rejection.limitTokens;
    this.missingDependencies = rejection.missingDependencies;
  }
}

export const AGENCY_RESERVATIONS = Object.freeze({
  playerAgency: "PLAYER AGENCY: {{user}} is an open participant. Never invent durable player backstory, feelings, attraction, internal monologue, or involuntary actions. Unspecified player attributes remain player-defined.",
  secrecyBoundary: "SECRECY BOUNDARY: Concealed truths and private motives belong strictly to their designated keepers. Do not leak unearned discoveries into public dialogue, location descriptions, or starting scenes.",
  worldPhysics: "PHYSICS BOUNDARY: Hard limits, costs, and authority checks apply universally. Do not introduce supernatural exceptions or arbitrary power spikes into grounded settings.",
  dynamicEmergence: "DYNAMIC EMERGENCE: Define operational pressures, stakes, and choices. Never railroad future scenes, script player decisions, or prescribe an inevitable ending.",
  proceduralData: "PROCEDURAL BOUNDARY: Roll tables and dynamic event triggers are relative authoring inspiration, not deterministic runtime mechanics.",
  metadataBoundary: "METADATA BOUNDARY: Format matching and permanence classifications are descriptive project metadata, not active runtime enforcement.",
});

export const SPECIALIST_DEPENDENCIES: Record<ForgeJobDestinationV1, readonly ForgeJobDestinationV1[]> = Object.freeze({
  core: [],
  user: ["core"],
  worldPhysics: ["core"],
  status: ["core", "user", "worldPhysics"],
  locations: ["core", "worldPhysics"],
  factions: ["core", "locations"],
  npcs: ["core", "locations", "factions"],
  relationshipWeb: ["core", "npcs", "factions"],
  knowledgeMap: ["core", "npcs", "secrets"],
  items: ["core", "worldPhysics", "locations"],
  secrets: ["core", "npcs", "factions"],
  conflict: ["core", "factions", "npcs"],
  pressureProtocol: ["core", "conflict"],
  history: ["core", "factions"],
  pressures: ["core", "worldPhysics"],
  additionalLore: ["core"],
  aesthetic: ["core"],
  naming: ["core"],
  proceduralRolls: ["core", "worldPhysics"],
  opening: ["core", "user", "status", "locations", "npcs"],
  expansionNotes: ["opening"],
  antiGravity: ["opening"],
  buildNotes: ["opening"],
});

export function getAgencyReservationsForSpecialist(key: ForgeJobDestinationV1): string[] {
  const reservations: string[] = [AGENCY_RESERVATIONS.playerAgency];
  if (key === "secrets" || key === "knowledgeMap" || key === "opening") {
    reservations.push(AGENCY_RESERVATIONS.secrecyBoundary);
  }
  if (key === "worldPhysics" || key === "items" || key === "pressures" || key === "proceduralRolls") {
    reservations.push(AGENCY_RESERVATIONS.worldPhysics);
  }
  if (key === "opening" || key === "conflict" || key === "pressureProtocol") {
    reservations.push(AGENCY_RESERVATIONS.dynamicEmergence);
  }
  if (key === "proceduralRolls") {
    reservations.push(AGENCY_RESERVATIONS.proceduralData);
  }
  if (key === "buildNotes") {
    reservations.push(AGENCY_RESERVATIONS.metadataBoundary);
  }
  return reservations;
}

export interface ContextPreflightParams {
  job: ForgeSpecialistJob | ForgeJobV1;
  baseContext: {
    sparkText: string;
    parse?: {
      nonNegotiables?: string[];
      registerWords?: string[];
      userRole?: string | null;
    };
    canon?: {
      enabled?: boolean;
      franchiseName?: string;
      fidelity?: string;
    };
    chosenTake?: {
      title?: string;
      pitch?: string;
      angle?: string;
      whatsStrange?: string;
      genreTone?: string;
    };
    physics?: {
      density?: string;
      strangeness?: number;
      mundanity?: number;
      violence?: string;
      horror?: string;
      romance?: string;
      pacing?: string;
      linguisticBase?: string;
      mustInclude?: string;
      mustAvoid?: string;
    };
  };
  completedSections: Readonly<Record<string, unknown>>;
  modelLimits?: {
    contextWindow?: number;
    maxPromptTokens?: number;
    maxOutputTokens?: number;
  };
  customAgencyReservations?: string[];
}

export interface ContextPreflightReport {
  ok: true;
  jobId: string;
  key: ForgeJobDestinationV1;
  estimatedPromptTokens: number;
  outputAllowance: number;
  totalEstimatedTokens: number;
  dependencies: string[];
  includedSections: string[];
  context: string;
}

export interface ContextPreflightRejection {
  ok: false;
  code: "CONTEXT_LIMIT_EXCEEDED" | "MISSING_DEPENDENCY" | "CONTEXT_CONTRADICTION" | "CREDENTIAL_LEAK_PREVENTED";
  message: string;
  jobId: string;
  key: string;
  actualTokens?: number;
  limitTokens?: number;
  missingDependencies?: string[];
}

export type ContextPreflightResult = ContextPreflightReport | ContextPreflightRejection;

function jobKey(job: ForgeSpecialistJob | ForgeJobV1): ForgeJobDestinationV1 {
  if ("key" in job && job.key) return job.key;
  if ("destinations" in job && Array.isArray(job.destinations) && job.destinations[0]) return job.destinations[0];
  throw new Error(`Job ${job.id} has no destination key.`);
}

function jobOutputAllowance(job: ForgeSpecialistJob | ForgeJobV1): number {
  if ("estimatedOutputTokens" in job && typeof job.estimatedOutputTokens === "number" && job.estimatedOutputTokens > 0) {
    return job.estimatedOutputTokens;
  }
  return 800;
}

function jobDependencies(job: ForgeSpecialistJob | ForgeJobV1): string[] {
  if ("dependencies" in job && Array.isArray(job.dependencies)) {
    return [...job.dependencies];
  }
  return [];
}

const CREDENTIAL_PATTERNS = [
  /AIza[0-9A-Za-z_-]{35}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /Bearer\s+[a-zA-Z0-9_\-\.]{16,}/i,
  /[a-f0-9]{32,64}:[a-f0-9]{32,64}/,
];

function sanitizeMessage(message: string): string {
  let clean = message;
  for (const pattern of CREDENTIAL_PATTERNS) {
    clean = clean.replace(pattern, "[REDACTED_CREDENTIAL]");
  }
  return clean;
}

export function estimateTextTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 3.8));
}

export function selectSpecialistContext(
  key: ForgeJobDestinationV1,
  baseContext: ContextPreflightParams["baseContext"],
  completedSections: Readonly<Record<string, unknown>>,
  agencyReservations: string[],
): { context: string; includedSections: string[] } {
  const parts: string[] = [];
  const { sparkText, parse, canon, chosenTake, physics } = baseContext;

  // 1. Non-negotiable premise
  parts.push(`NON-NEGOTIABLE PREMISE: "${sparkText || "Unspecified premise"}".`);
  parts.push("Everything generated must be recognisably part of this world.");
  if (parse?.nonNegotiables && parse.nonNegotiables.length > 0) {
    parts.push(`Required elements: ${JSON.stringify(parse.nonNegotiables)}.`);
  }
  if (parse?.registerWords && parse.registerWords.length > 0) {
    parts.push(`Required register: ${JSON.stringify(parse.registerWords)}.`);
  }
  if (parse?.userRole) {
    parts.push(`Player starting position: ${parse.userRole}.`);
  }

  // 2. Canon constraints if active
  if (canon?.enabled && canon.franchiseName) {
    parts.push(`\nCANON MODE ACTIVE (${canon.franchiseName}):`);
    parts.push(`Fidelity tier: ${canon.fidelity || "Adjacent"}`);
    parts.push("Keep metaphysics, naming, and technology strictly consistent with canon.");
  }

  // 3. Chosen angle
  if (chosenTake) {
    parts.push(`\nCHOSEN PREMISE ANGLE:`);
    if (chosenTake.title) parts.push(`Title: ${chosenTake.title}`);
    if (chosenTake.pitch) parts.push(`Pitch: ${chosenTake.pitch}`);
    if (chosenTake.angle) parts.push(`Angle: ${chosenTake.angle}`);
    if (chosenTake.whatsStrange) parts.push(`What's Strange: ${chosenTake.whatsStrange}`);
    if (chosenTake.genreTone) parts.push(`Tone: ${chosenTake.genreTone}`);
  }

  // 4. World Physics constraints
  if (physics) {
    parts.push(`\nWORLD CONSTRAINTS:`);
    parts.push(`- Density: ${physics.density || "Standard"}`);
    parts.push(`- Strangeness: ${physics.strangeness ?? 3}/5`);
    parts.push(`- Mundanity: ${physics.mundanity ?? 4}/5`);
    parts.push(`- Violence: ${physics.violence || "Moderate"}`);
    parts.push(`- Horror: ${physics.horror || "Psych"}`);
    parts.push(`- Romance: ${physics.romance || "Subplot"}`);
    parts.push(`- Pacing: ${physics.pacing || "Slow burn"}`);
    if (!canon?.enabled && physics.linguisticBase?.trim()) {
      parts.push(`- Linguistic Base: ${physics.linguisticBase.trim()}`);
    }
    if (physics.mustInclude?.trim()) {
      parts.push(`- Must Include: "${physics.mustInclude.trim()}"`);
    }
    if (physics.mustAvoid?.trim()) {
      parts.push(`- Must Avoid: "${physics.mustAvoid.trim()}"`);
    }
  }

  // 5. Agency Reservations and boundaries
  if (agencyReservations.length > 0) {
    parts.push(`\nAGENCY RESERVATIONS & BOUNDARIES:`);
    for (const reservation of agencyReservations) {
      parts.push(`- ${reservation}`);
    }
  }

  // 6. Disciplined dependency section inclusion
  const neededSections = SPECIALIST_DEPENDENCIES[key] ?? [];
  const includedSections: string[] = [];
  const establishedParts: string[] = [];

  for (const dep of neededSections) {
    const val = completedSections[dep];
    if (val !== undefined && val !== null) {
      includedSections.push(dep);
      if (dep === "core" && typeof val === "object") {
        const c = val as Record<string, any>;
        establishedParts.push(`- Core Title: "${c.title || ""}"`);
        if (c.theRule) establishedParts.push(`- Core Rule: "${c.theRule}"`);
        if (c.theCost) establishedParts.push(`- Core Cost: "${c.theCost}"`);
        if (c.theSituation) establishedParts.push(`- Situation: "${c.theSituation}"`);
        if (c.thePressure) establishedParts.push(`- Pressure: "${c.thePressure}"`);
      } else if (dep === "user" && typeof val === "object") {
        const u = val as Record<string, any>;
        if (u.rolePosition) establishedParts.push(`- User Position: "${u.rolePosition}"`);
        if (u.startsWith) establishedParts.push(`- User Starts With: "${u.startsWith}"`);
      } else if (dep === "worldPhysics" && typeof val === "object") {
        const wp = val as Record<string, any>;
        if (wp.authorityCheck) establishedParts.push(`- Authority Check: "${wp.authorityCheck}"`);
        if (wp.powerCeiling) establishedParts.push(`- Power Ceiling: "${wp.powerCeiling}"`);
      } else if (dep === "status" && typeof val === "object") {
        const st = val as Record<string, any>;
        if (st.content) establishedParts.push(`- Initial Status: "${st.content}"`);
      } else if (dep === "locations" && Array.isArray(val) && val.length > 0) {
        const names = val.map((loc: any) => loc.fields?.name || loc.id).filter(Boolean).join(", ");
        if (names) establishedParts.push(`- Established Locations: ${names}`);
      } else if (dep === "factions" && Array.isArray(val) && val.length > 0) {
        const names = val.map((fac: any) => fac.fields?.name || fac.id).filter(Boolean).join(", ");
        if (names) establishedParts.push(`- Established Factions: ${names}`);
      } else if (dep === "npcs" && Array.isArray(val) && val.length > 0) {
        const names = val.map((npc: any) => `${npc.fields?.name || npc.id} (${npc.fields?.role || "Cast"})`).join(", ");
        if (names) establishedParts.push(`- Established NPCs: ${names}`);
      } else if (dep === "opening" && typeof val === "object") {
        const op = val as Record<string, any>;
        if (op.firstLocation) establishedParts.push(`- Opening Location: "${op.firstLocation}"`);
        if (op.firstChoice) establishedParts.push(`- Opening First Choice: "${op.firstChoice}"`);
      } else if (dep === "conflict" && typeof val === "object") {
        const cf = val as Record<string, any>;
        if (cf.central) establishedParts.push(`- Central Conflict: "${cf.central}"`);
      }
    }
  }

  if (establishedParts.length > 0) {
    parts.push(`\nALREADY ESTABLISHED RELEVANT SECTIONS (Strict continuity):`);
    parts.push(...establishedParts);
  }

  return {
    context: parts.join("\n"),
    includedSections,
  };
}

export function preflightSpecialistContext(params: ContextPreflightParams): ContextPreflightResult {
  const { job, baseContext, completedSections, modelLimits, customAgencyReservations } = params;
  const key = jobKey(job);

  // 1. Check for credential leakage in inputs
  const allInputText = JSON.stringify({ baseContext, jobId: job.id, key });
  for (const pattern of CREDENTIAL_PATTERNS) {
    if (pattern.test(allInputText)) {
      return {
        ok: false,
        code: "CREDENTIAL_LEAK_PREVENTED",
        message: sanitizeMessage(`Specialist ${job.id} input context contains credential-like material [REDACTED_CREDENTIAL]; blocked preflight.`),
        jobId: job.id,
        key,
      };
    }
  }

  // 2. Contradiction / Invalidation checks
  if (!baseContext.sparkText || !baseContext.sparkText.trim()) {
    return {
      ok: false,
      code: "CONTEXT_CONTRADICTION",
      message: `Specialist ${job.id} has an empty non-negotiable premise.`,
      jobId: job.id,
      key,
    };
  }

  // Check for required dependency sections
  const requiredDeps = SPECIALIST_DEPENDENCIES[key] ?? [];
  const missingDeps: string[] = [];
  for (const dep of requiredDeps) {
    if (completedSections[dep] === undefined) {
      // In Checkpoint B/C dependency ordering, a specialist whose dependencies are required must have them present
      missingDeps.push(dep);
    }
  }

  if (missingDeps.length > 0) {
    return {
      ok: false,
      code: "MISSING_DEPENDENCY",
      message: `Specialist ${job.id} (${key}) requires completed dependency sections [${missingDeps.join(", ")}], but they are not established.`,
      jobId: job.id,
      key,
      missingDependencies: missingDeps,
    };
  }

  // 3. Construct disciplined context
  const agency = customAgencyReservations ?? getAgencyReservationsForSpecialist(key);
  const { context, includedSections } = selectSpecialistContext(key, baseContext, completedSections, agency);

  // 4. Approximate tokens
  const estimatedPromptTokens = estimateTextTokens(context);
  const outputAllowance = jobOutputAllowance(job);
  const totalEstimatedTokens = estimatedPromptTokens + outputAllowance;
  const dependencies = jobDependencies(job);

  // 5. Check against model limits (HONEST BLOCKING, NO SILENT TRUNCATION, NO FAKE SUMMARIES)
  if (modelLimits?.maxPromptTokens && estimatedPromptTokens > modelLimits.maxPromptTokens) {
    return {
      ok: false,
      code: "CONTEXT_LIMIT_EXCEEDED",
      message: `Specialist ${job.id} (${key}) requires ${estimatedPromptTokens} prompt tokens, exceeding maxPromptTokens limit of ${modelLimits.maxPromptTokens}.`,
      jobId: job.id,
      key,
      actualTokens: estimatedPromptTokens,
      limitTokens: modelLimits.maxPromptTokens,
    };
  }

  if (modelLimits?.contextWindow && totalEstimatedTokens > modelLimits.contextWindow) {
    return {
      ok: false,
      code: "CONTEXT_LIMIT_EXCEEDED",
      message: `Specialist ${job.id} (${key}) requires ${totalEstimatedTokens} total tokens (${estimatedPromptTokens} prompt + ${outputAllowance} output allowance), exceeding contextWindow limit of ${modelLimits.contextWindow}.`,
      jobId: job.id,
      key,
      actualTokens: totalEstimatedTokens,
      limitTokens: modelLimits.contextWindow,
    };
  }

  return {
    ok: true,
    jobId: job.id,
    key,
    estimatedPromptTokens,
    outputAllowance,
    totalEstimatedTokens,
    dependencies,
    includedSections,
    context,
  };
}

export function assertSpecialistContextPreflight(params: ContextPreflightParams): ContextPreflightReport {
  const result = preflightSpecialistContext(params);
  if (result.ok === false) {
    throw new ContextPreflightError(result);
  }
  return result;
}

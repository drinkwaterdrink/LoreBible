import { expect, test } from "bun:test";
import {
  preflightSpecialistContext,
  assertSpecialistContextPreflight,
  selectSpecialistContext,
  getAgencyReservationsForSpecialist,
  ContextPreflightError,
} from "../../server/generation/contextPreflight";
import type { ForgeSpecialistJob } from "../../server/generation/forgeSpecialistPlan";

function createMockSpecialistJob(key: any, id = "job-test-1", estimatedOutputTokens = 800): ForgeSpecialistJob & { estimatedOutputTokens: number } {
  return {
    id,
    bundleIndex: 0,
    kind: "category_entries",
    key,
    entryIds: [],
    schema: { type: "object" },
    splitDepth: 0,
    estimatedOutputTokens,
  };
}

const mockBaseContext = {
  sparkText: "A solitary harbor sound where fog horns dictate daily routines.",
  parse: {
    nonNegotiables: ["fog horn", "discharge book"],
    registerWords: ["piling", "slack water", "ballast"],
    userRole: "Discharged sailor awaiting slip assignment",
  },
  chosenTake: {
    title: "The Sound of Slack Water",
    pitch: "In a tidal sound where time is kept by steam whistles, an outsider looks for work.",
    angle: "Logistical harbor mystery",
    whatsStrange: "The sound water never reflects the sky.",
    genreTone: "Atmospheric nautical realism",
  },
  physics: {
    density: "Rich",
    strangeness: 2,
    mundanity: 4,
    violence: "Mild",
    horror: "None",
    romance: "None",
    pacing: "Measured",
    mustInclude: "Harbor master log",
  },
};

const fullCompletedSections: Record<string, unknown> = {
  core: { title: "The Sound of Slack Water", theRule: "Water cannot be owned", theCost: "Memory decays near the tide", theSituation: "Discharge slips frozen", thePressure: "Winter ice closing the sound" },
  user: { rolePosition: "Discharged sailor", startsWith: "Tattered sea bag and stamped papers" },
  worldPhysics: { authorityCheck: "Harbor Clerk stamp", powerCeiling: "Steam cranes", faultLines: ["Old dock union"], permanence: "P" },
  status: { content: "Waiting on slip 4 under freezing mist.", settings: "Dawn fog", permanence: "T" },
  locations: [{ id: "loc-1", fields: { name: "Slip 4" } }, { id: "loc-2", fields: { name: "Coal Wharf" } }],
  factions: [{ id: "fac-1", fields: { name: "Sound Pilot Guild" } }],
  npcs: [{ id: "npc-1", fields: { name: "Dockmaster Vane", role: "Clerk" } }],
  relationshipWeb: [{ id: "rel-1", fields: {} }],
  knowledgeMap: [{ id: "km-1", fields: {} }],
  items: [{ id: "item-1", fields: { name: "Brass Horn" } }],
  secrets: [{ id: "sec-1", fields: { truth: "The coal barge sank intentionally." } }],
  conflict: { central: "Union vs Harbor Trust", permanence: "P" },
  pressureProtocol: "Cold snap incoming",
  history: [{ id: "hist-1", fields: {} }],
  aesthetic: { weather: "Cold fog", permanence: "P" },
  naming: { linguisticBase: "Anglo-Norse", permanence: "P" },
  pressures: [{ id: "pr-1", fields: {} }],
  additionalLore: [{ id: "al-1", fields: {} }],
  proceduralRolls: [{ id: "roll-1", name: "Tidal Shifts", entries: [] }],
  opening: { firstLocation: "Slip 4", firstChoice: "Approach clerk", permanence: "T" },
  expansionNotes: { explicit: "Fade", permanence: "P" },
  antiGravity: { temptations: [], permanence: "P" },
  buildNotes: { permanenceRouting: "P/C/T", permanence: "P" },
};

test("context selection is bounded and does not dump the entire Project Graph into specialist prompts", () => {
  const npcsJob = createMockSpecialistJob("npcs");
  const { context, includedSections } = selectSpecialistContext(
    "npcs",
    mockBaseContext,
    fullCompletedSections,
    getAgencyReservationsForSpecialist("npcs")
  );

  // Relevant dependencies are included
  expect(includedSections).toContain("core");
  expect(includedSections).toContain("locations");
  expect(includedSections).toContain("factions");
  expect(context).toContain("Slip 4");
  expect(context).toContain("Sound Pilot Guild");

  // Irrelevant sections are strictly excluded
  expect(includedSections).not.toContain("proceduralRolls");
  expect(includedSections).not.toContain("buildNotes");
  expect(includedSections).not.toContain("secrets");
  expect(includedSections).not.toContain("items");
  expect(context).not.toContain("Brass Horn");
  expect(context).not.toContain("sank intentionally");
  expect(context).not.toContain("Tidal Shifts");
});

test("specialist context includes appropriate agency reservations and boundary conditions", () => {
  // Player agency is included everywhere
  const userReservations = getAgencyReservationsForSpecialist("user");
  expect(userReservations.some(r => r.includes("PLAYER AGENCY"))).toBe(true);

  // Secrecy boundary for secrets and opening
  const secretReservations = getAgencyReservationsForSpecialist("secrets");
  expect(secretReservations.some(r => r.includes("SECRECY BOUNDARY"))).toBe(true);

  const openingReservations = getAgencyReservationsForSpecialist("opening");
  expect(openingReservations.some(r => r.includes("SECRECY BOUNDARY"))).toBe(true);
  expect(openingReservations.some(r => r.includes("DYNAMIC EMERGENCE"))).toBe(true);

  // Physics boundary for worldPhysics and procedural data
  const physicsReservations = getAgencyReservationsForSpecialist("worldPhysics");
  expect(physicsReservations.some(r => r.includes("PHYSICS BOUNDARY"))).toBe(true);

  const rollReservations = getAgencyReservationsForSpecialist("proceduralRolls");
  expect(rollReservations.some(r => r.includes("PROCEDURAL BOUNDARY"))).toBe(true);

  // Metadata boundary for buildNotes
  const buildNotesReservations = getAgencyReservationsForSpecialist("buildNotes");
  expect(buildNotesReservations.some(r => r.includes("METADATA BOUNDARY"))).toBe(true);
});

test("preflight reports prompt tokens, output allowance, and dependencies accurately", () => {
  const openingJob = createMockSpecialistJob("opening", "job-open-1", 1200);
  const result = preflightSpecialistContext({
    job: openingJob,
    baseContext: mockBaseContext,
    completedSections: fullCompletedSections,
  });

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.jobId).toBe("job-open-1");
    expect(result.key).toBe("opening");
    expect(result.outputAllowance).toBe(1200);
    expect(result.estimatedPromptTokens).toBeGreaterThan(100);
    expect(result.totalEstimatedTokens).toBe(result.estimatedPromptTokens + 1200);
    expect(result.includedSections).toContain("core");
    expect(result.includedSections).toContain("user");
    expect(result.includedSections).toContain("status");
    expect(result.includedSections).toContain("locations");
    expect(result.includedSections).toContain("npcs");
  }
});

test("preflight detects when context exceeds maxPromptTokens and blocks honestly without silent truncation", () => {
  const openingJob = createMockSpecialistJob("opening", "job-open-1", 1200);

  // Intentionally set an impossibly low maxPromptTokens limit
  const result = preflightSpecialistContext({
    job: openingJob,
    baseContext: mockBaseContext,
    completedSections: fullCompletedSections,
    modelLimits: {
      maxPromptTokens: 50, // lower than realistic prompt
    },
  });

  expect(result.ok).toBe(false);
  const rejection = result as import("../../server/generation/contextPreflight").ContextPreflightRejection;
  expect(rejection.code).toBe("CONTEXT_LIMIT_EXCEEDED");
  expect(rejection.limitTokens).toBe(50);
  expect(rejection.actualTokens).toBeGreaterThan(50);
  expect(rejection.message).toContain("exceeding maxPromptTokens limit of 50");

  // assertSpecialistContextPreflight throws ContextPreflightError
  expect(() => assertSpecialistContextPreflight({
    job: openingJob,
    baseContext: mockBaseContext,
    completedSections: fullCompletedSections,
    modelLimits: { maxPromptTokens: 50 },
  })).toThrow(ContextPreflightError);
});

test("preflight detects when total tokens exceed contextWindow and blocks honestly", () => {
  const rollJob = createMockSpecialistJob("proceduralRolls", "job-roll-1", 800);

  // Set context window lower than prompt + output allowance
  const result = preflightSpecialistContext({
    job: rollJob,
    baseContext: mockBaseContext,
    completedSections: fullCompletedSections,
    modelLimits: {
      contextWindow: 400,
    },
  });

  expect(result.ok).toBe(false);
  const rejection = result as import("../../server/generation/contextPreflight").ContextPreflightRejection;
  expect(rejection.code).toBe("CONTEXT_LIMIT_EXCEEDED");
  expect(rejection.limitTokens).toBe(400);
  expect(rejection.message).toContain("exceeding contextWindow limit of 400");
});

test("preflight detects missing dependency sections and rejects before generation", () => {
  const openingJob = createMockSpecialistJob("opening", "job-open-1", 1200);

  // Missing 'user' and 'status' dependencies
  const incompleteSections = {
    core: fullCompletedSections.core,
    locations: fullCompletedSections.locations,
    npcs: fullCompletedSections.npcs,
  };

  const result = preflightSpecialistContext({
    job: openingJob,
    baseContext: mockBaseContext,
    completedSections: incompleteSections,
  });

  expect(result.ok).toBe(false);
  const rejection = result as import("../../server/generation/contextPreflight").ContextPreflightRejection;
  expect(rejection.code).toBe("MISSING_DEPENDENCY");
  expect(rejection.missingDependencies).toContain("user");
  expect(rejection.missingDependencies).toContain("status");
  expect(rejection.message).toContain("requires completed dependency sections");
});

test("preflight blocks credential-like strings in inputs without leaking secrets in diagnostics", () => {
  const job = createMockSpecialistJob("locations");
  const leakedApiKey = "AIzaSyDaFakeSecretKeyForTestingLeakPrevention35";

  const taintedContext = {
    ...mockBaseContext,
    sparkText: `Harbor setting with key: ${leakedApiKey}`,
  };

  const result = preflightSpecialistContext({
    job,
    baseContext: taintedContext,
    completedSections: { core: fullCompletedSections.core },
  });

  expect(result.ok).toBe(false);
  const rejection = result as import("../../server/generation/contextPreflight").ContextPreflightRejection;
  expect(rejection.code).toBe("CREDENTIAL_LEAK_PREVENTED");
  expect(rejection.message).not.toContain(leakedApiKey);
  expect(rejection.message).toContain("[REDACTED_CREDENTIAL]");
});

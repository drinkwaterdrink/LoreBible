import { expect, test } from "bun:test";
import { blueprintSelectionFixture } from "../fixtures/blueprintSelection";
import {
  createForgeSpecialistPlan,
  hydrateForgeSpecialistJob,
  compileForgeSpecialistJobPrompt,
  validateForgeSpecialistJob,
  canUseForgeSpecialistsForBatch,
  canUsePersistedForgeSpecialistsForBundle,
} from "../../server/generation/forgeSpecialistPlan";
import {
  createSpecialistLedger,
  beginSpecialistJob,
  completeSpecialistJob,
  mergeSpecialistJobs,
} from "../../src/lib/projectGraph/forgeSpecialistLedger";
import type { ForgeSpecialistLedgerV1 } from "../../src/contracts/projectGraph";

const source = "sha256:source";
const at = "2026-09-21T12:00:00Z";

function testSelection() {
  const sel = structuredClone(blueprintSelectionFixture);
  sel.categories = [
    { ...sel.categories[0], id: "locations", label: "Locations", purpose: "Places", status: "required", detail: "standard", targetRange: { min: 1, ideal: 1, max: 1 } },
  ];
  sel.lorebookRange = { min: 1, ideal: 1, max: 1 };
  return sel;
}

test("Bundle 6 plans bounded singleton jobs for proceduralRolls, opening, expansionNotes, antiGravity, and buildNotes in order", () => {
  const selection = testSelection();
  const plan = createForgeSpecialistPlan(selection, {}, "source context", source);
  const bundleSix = plan.jobs.filter(job => job.bundleIndex === 5);

  expect(bundleSix.map(job => job.destinations[0])).toEqual([
    "proceduralRolls",
    "opening",
    "expansionNotes",
    "antiGravity",
    "buildNotes",
  ]);
  expect(bundleSix.every(job => job.entryIds.length === 0)).toBe(true);

  const openingJob = bundleSix.find(job => job.destinations[0] === "opening")!;
  const expansionJob = bundleSix.find(job => job.destinations[0] === "expansionNotes")!;
  const antiGravityJob = bundleSix.find(job => job.destinations[0] === "antiGravity")!;
  const buildNotesJob = bundleSix.find(job => job.destinations[0] === "buildNotes")!;

  expect(expansionJob.dependencies).toContain(openingJob.id);
  expect(antiGravityJob.dependencies).toContain(openingJob.id);
  expect(buildNotesJob.dependencies).toContain(openingJob.id);
});

test("Bundle 6 specialists receive only their owned schema and mission", () => {
  const selection = testSelection();
  const plan = createForgeSpecialistPlan(selection, {}, "source context", source);

  const openingSpec = plan.jobs.find(job => job.destinations[0] === "opening")!;
  const openingJob = hydrateForgeSpecialistJob(openingSpec);
  const openingPrompt = compileForgeSpecialistJobPrompt(openingJob, "source context", null);
  expect(openingPrompt.userPrompt).toContain('"ownedSection": "opening"');
  expect(openingPrompt.userPrompt).toContain('"firstMessage"');
  expect(openingPrompt.userPrompt).not.toContain('"ownedSection": "proceduralRolls"');
  expect(openingPrompt.userPrompt).toContain("playable");

  const proceduralSpec = plan.jobs.find(job => job.destinations[0] === "proceduralRolls")!;
  const proceduralJob = hydrateForgeSpecialistJob(proceduralSpec);
  const proceduralPrompt = compileForgeSpecialistJobPrompt(proceduralJob, "source context", null);
  expect(proceduralPrompt.userPrompt).toContain('"ownedSection": "proceduralRolls"');
  expect(proceduralPrompt.userPrompt).toContain('"triggerKeys"');

  const buildNotesSpec = plan.jobs.find(job => job.destinations[0] === "buildNotes")!;
  const buildNotesJob = hydrateForgeSpecialistJob(buildNotesSpec);
  const buildNotesPrompt = compileForgeSpecialistJobPrompt(buildNotesJob, "source context", null);
  expect(buildNotesPrompt.userPrompt).toContain('"ownedSection": "buildNotes"');
  expect(buildNotesPrompt.userPrompt).toContain("metadata");
});

test("Bundle 6 specialists reject unowned sections, malformed roll tables, and invalid metadata", () => {
  const selection = testSelection();
  const plan = createForgeSpecialistPlan(selection, {}, "source context", source);

  const openingJob = hydrateForgeSpecialistJob(plan.jobs.find(job => job.destinations[0] === "opening")!);

  // Reject unowned sections
  expect(() => validateForgeSpecialistJob(openingJob, {
    opening: { firstLocation: "Slip 4", firstNpc: "Harbor Clerk", firstChoice: "Present your discharge book", style: "Second person", firstMessage: "The mist clings to the piling.", permanence: "T" },
    expansionNotes: { explicit: "Fade", violence: "Mild", horror: "None", romance: "None", humor: "Dry", pacing: "Measured", playerDeath: "No", contentFlags: [], allCharactersAdult: true, permanence: "P" },
  })).toThrow("unowned section");

  // Reject missing required fields
  expect(() => validateForgeSpecialistJob(openingJob, {
    opening: { firstLocation: "Slip 4", firstMessage: "" },
  })).toThrow();

  // Validate proceduralRolls
  const proceduralJob = hydrateForgeSpecialistJob(plan.jobs.find(job => job.destinations[0] === "proceduralRolls")!);
  expect(() => validateForgeSpecialistJob(proceduralJob, {
    proceduralRolls: [{ id: "roll-1", name: "Weather shifts", triggerKeys: ["weather"], settings: "Harbor", entries: [{ id: "e1", weight: -1, outcome: "Squall" }] }],
  })).toThrow();

  const validRolls = validateForgeSpecialistJob(proceduralJob, {
    proceduralRolls: [{ id: "roll-1", name: "Weather shifts", triggerKeys: ["weather"], settings: "Harbor", entries: [{ id: "e1", weight: 10, outcome: "Dense fog rolls across the sound." }] }],
  });
  expect(validRolls).toHaveProperty("proceduralRolls");

  // Validate expansionNotes
  const expansionJob = hydrateForgeSpecialistJob(plan.jobs.find(job => job.destinations[0] === "expansionNotes")!);
  const validExpansion = validateForgeSpecialistJob(expansionJob, {
    expansionNotes: { explicit: "Fade to black", violence: "Low stakes", horror: "None", romance: "Subtle", humor: "Dry observational", pacing: "Unrushed", playerDeath: "Not possible", contentFlags: ["cold", "isolation"], allCharactersAdult: true, permanence: "P" },
  });
  expect(validExpansion).toHaveProperty("expansionNotes");

  // Validate antiGravity
  const antiGravityJob = hydrateForgeSpecialistJob(plan.jobs.find(job => job.destinations[0] === "antiGravity")!);
  const validAntiGravity = validateForgeSpecialistJob(antiGravityJob, {
    antiGravity: {
      temptations: [{ temptation: "Make the ferry clerk immediately confide in the stranger", counter: "Require two routine transactions before personal disclosure" }],
      permanence: "P",
    },
  });
  expect(validAntiGravity).toHaveProperty("antiGravity");

  // Validate buildNotes
  const buildNotesJob = hydrateForgeSpecialistJob(plan.jobs.find(job => job.destinations[0] === "buildNotes")!);
  const validBuildNotes = validateForgeSpecialistJob(buildNotesJob, {
    buildNotes: { permanenceRouting: "P=permanent, C=contextual, T=temporal", orderBands: "Standard", disabledUntilEarnedList: [], formatMatch: "Standard lorebook format", permanence: "P" },
  });
  expect(validBuildNotes).toHaveProperty("buildNotes");
});

test("Bundle 6 jobs enforce dependency ordering in the durable specialist ledger", () => {
  const selection = testSelection();
  const plan = createForgeSpecialistPlan(selection, {}, "source context", source);
  const bundleSix = plan.jobs.filter(job => job.bundleIndex === 5);
  let ledger = createSpecialistLedger({ planHash: plan.planHash, inputFingerprint: source, jobs: bundleSix });

  const proceduralJob = bundleSix.find(job => job.destinations[0] === "proceduralRolls")!;
  const openingJob = bundleSix.find(job => job.destinations[0] === "opening")!;
  const expansionJob = bundleSix.find(job => job.destinations[0] === "expansionNotes")!;
  const antiGravityJob = bundleSix.find(job => job.destinations[0] === "antiGravity")!;
  const buildNotesJob = bundleSix.find(job => job.destinations[0] === "buildNotes")!;

  // expansionNotes cannot begin before opening
  expect(() => beginSpecialistJob(ledger, { jobId: expansionJob.id, attemptId: "att-exp-1", provider: "gemini", modelId: "flash", promptHash: expansionJob.promptHash, startedAt: at })).toThrow("not ready");

  // Complete procedural
  ledger = beginSpecialistJob(ledger, { jobId: proceduralJob.id, attemptId: "att-proc-1", provider: "gemini", modelId: "flash", promptHash: proceduralJob.promptHash, startedAt: at });
  ledger = completeSpecialistJob(ledger, {
    jobId: proceduralJob.id, attemptId: "att-proc-1", commandId: "cmd-proc-1",
    sections: { proceduralRolls: [{ id: "roll-1", name: "Morning Traffic", triggerKeys: ["slip"], settings: "Harbor", entries: [{ id: "e1", weight: 5, outcome: "A coal barge arrives." }] }] },
    completedAt: at,
  });

  // Complete opening
  ledger = beginSpecialistJob(ledger, { jobId: openingJob.id, attemptId: "att-open-1", provider: "gemini", modelId: "flash", promptHash: openingJob.promptHash, startedAt: at });
  ledger = completeSpecialistJob(ledger, {
    jobId: openingJob.id, attemptId: "att-open-1", commandId: "cmd-open-1",
    sections: { opening: { firstLocation: "Slip 4", firstNpc: "Harbor Clerk", firstChoice: "Show discharge papers", style: "Second person descriptive", firstMessage: "The morning horn sounds through the fog.", permanence: "T" } },
    completedAt: at,
  });

  // Now expansionNotes can complete
  ledger = beginSpecialistJob(ledger, { jobId: expansionJob.id, attemptId: "att-exp-1", provider: "gemini", modelId: "flash", promptHash: expansionJob.promptHash, startedAt: at });
  ledger = completeSpecialistJob(ledger, {
    jobId: expansionJob.id, attemptId: "att-exp-1", commandId: "cmd-exp-1",
    sections: { expansionNotes: { explicit: "Fade", violence: "Grounded", horror: "None", romance: "None", humor: "Dry", pacing: "Measured", playerDeath: "No", contentFlags: ["fog"], allCharactersAdult: true, permanence: "P" } },
    completedAt: at,
  });

  // Complete antiGravity
  ledger = beginSpecialistJob(ledger, { jobId: antiGravityJob.id, attemptId: "att-ag-1", provider: "gemini", modelId: "flash", promptHash: antiGravityJob.promptHash, startedAt: at });
  ledger = completeSpecialistJob(ledger, {
    jobId: antiGravityJob.id, attemptId: "att-ag-1", commandId: "cmd-ag-1",
    sections: { antiGravity: { temptations: [{ temptation: "Instant friendship", counter: "Require shared work" }], permanence: "P" } },
    completedAt: at,
  });

  // Complete buildNotes
  ledger = beginSpecialistJob(ledger, { jobId: buildNotesJob.id, attemptId: "att-bn-1", provider: "gemini", modelId: "flash", promptHash: buildNotesJob.promptHash, startedAt: at });
  ledger = completeSpecialistJob(ledger, {
    jobId: buildNotesJob.id, attemptId: "att-bn-1", commandId: "cmd-bn-1",
    sections: { buildNotes: { permanenceRouting: "P/C/T", orderBands: "Standard", disabledUntilEarnedList: [], formatMatch: "LoreBible native", permanence: "P" } },
    completedAt: at,
  });

  // Merge Bundle 6
  const merged = mergeSpecialistJobs(ledger, 5);
  expect(merged).toHaveProperty("proceduralRolls");
  expect(merged).toHaveProperty("opening");
  expect(merged).toHaveProperty("expansionNotes");
  expect(merged).toHaveProperty("antiGravity");
  expect(merged).toHaveProperty("buildNotes");
});

test("older ledgers without Bundle 6 jobs fall back safely instead of pretending jobs exist", () => {
  const oldLedger: ForgeSpecialistLedgerV1 = {
    version: 1,
    planHash: "sha256:old",
    inputFingerprint: source,
    jobs: [{
      job: {
        version: 1, id: "old-b5", bundleIndex: 4, ordinal: 0, kind: "bundle5_section",
        destinations: ["history"], categoryId: "history", categoryLabel: "History",
        entryIds: ["hist-1"], dependencies: [], schemaId: "forge.bundle5.history/v1",
        schemaVersion: 1, promptHash: "sha256:t", inputFingerprint: source,
        estimatedOutputTokens: 500, splitDepth: 0,
      },
      status: "complete", attempts: [], sections: { history: [] },
    }],
  };
  expect(canUsePersistedForgeSpecialistsForBundle(oldLedger, 5)).toBe(false);
  expect(canUsePersistedForgeSpecialistsForBundle(oldLedger, 4)).toBe(true);
});

test("single-request Forge does not convert Bundle 6 into specialist execution", () => {
  expect(canUseForgeSpecialistsForBatch(5, 6)).toBe(true);
  expect(canUseForgeSpecialistsForBatch(0, 6)).toBe(false);
});

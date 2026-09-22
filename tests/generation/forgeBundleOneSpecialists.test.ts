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
import type { ForgeSpecialistLedgerV1, ForgeJobV1 } from "../../src/contracts/projectGraph";

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

test("Bundle 1 plans bounded singleton jobs for core, user, worldPhysics, and status in dependency order", () => {
  const selection = testSelection();
  const plan = createForgeSpecialistPlan(selection, {}, "source context", source);
  const bundleOne = plan.jobs.filter(job => job.bundleIndex === 0);

  expect(bundleOne.map(job => job.destinations[0])).toEqual(["core", "user", "worldPhysics", "status"]);
  expect(bundleOne.every(job => job.entryIds.length === 0)).toBe(true);

  const coreJob = bundleOne.find(job => job.destinations[0] === "core")!;
  const userJob = bundleOne.find(job => job.destinations[0] === "user")!;
  const physicsJob = bundleOne.find(job => job.destinations[0] === "worldPhysics")!;
  const statusJob = bundleOne.find(job => job.destinations[0] === "status")!;

  expect(coreJob.dependencies).toEqual([]);
  expect(userJob.dependencies).toEqual([coreJob.id]);
  expect(physicsJob.dependencies).toEqual([coreJob.id]);
  expect(statusJob.dependencies).toContain(coreJob.id);
  expect(statusJob.dependencies).toContain(userJob.id);
  expect(statusJob.dependencies).toContain(physicsJob.id);
});

test("Bundle 1 specialists receive only their owned schema and mission", () => {
  const selection = testSelection();
  const plan = createForgeSpecialistPlan(selection, {}, "source context", source);
  const coreJob = hydrateForgeSpecialistJob(plan.jobs.find(job => job.destinations[0] === "core")!);
  const userJob = hydrateForgeSpecialistJob(plan.jobs.find(job => job.destinations[0] === "user")!);
  const physicsJob = hydrateForgeSpecialistJob(plan.jobs.find(job => job.destinations[0] === "worldPhysics")!);
  const statusJob = hydrateForgeSpecialistJob(plan.jobs.find(job => job.destinations[0] === "status")!);

  const corePrompt = compileForgeSpecialistJobPrompt(coreJob, "source context", null);
  expect(corePrompt.userPrompt).toContain('"ownedSection": "core"');
  expect(corePrompt.userPrompt).not.toContain('"ownedSection": "worldPhysics"');
  expect(corePrompt.userPrompt).toContain('"title"');

  const userPrompt = compileForgeSpecialistJobPrompt(userJob, "source context", null);
  expect(userPrompt.userPrompt).toContain('"ownedSection": "user"');
  expect(userPrompt.userPrompt).toContain('"rolePosition"');
  expect(userPrompt.userPrompt).toContain("player");

  const physicsPrompt = compileForgeSpecialistJobPrompt(physicsJob, "source context", null);
  expect(physicsPrompt.userPrompt).toContain('"ownedSection": "worldPhysics"');
  expect(physicsPrompt.userPrompt).toContain('"rules"');

  const statusPrompt = compileForgeSpecialistJobPrompt(statusJob, "source context", null);
  expect(statusPrompt.userPrompt).toContain('"ownedSection": "status"');
  expect(statusPrompt.userPrompt).toContain('"content"');
});

test("Bundle 1 specialists reject unowned sections, partial fields, and malformed structures", () => {
  const selection = testSelection();
  const plan = createForgeSpecialistPlan(selection, {}, "source context", source);
  const coreJob = hydrateForgeSpecialistJob(plan.jobs.find(job => job.destinations[0] === "core")!);

  // Reject unowned sections
  expect(() => validateForgeSpecialistJob(coreJob, {
    core: { title: "A Harbor Town", pitch: "A quiet port", genreTone: "Grounded", eraScale: "Local", theRule: "Ferries run at dawn", theCost: "Passage is coin", theSituation: "New administration", thePressure: "Inspection imminent", theQuestion: "Who controls the slips?", permanence: "P" },
    user: { rolePosition: "Visitor" },
  })).toThrow("unowned section");

  // Reject missing required fields
  expect(() => validateForgeSpecialistJob(coreJob, {
    core: { title: "A Harbor Town", pitch: "" },
  })).toThrow();

  // Physics job rejects numbered placeholder rules
  const physicsJob = hydrateForgeSpecialistJob(plan.jobs.find(job => job.destinations[0] === "worldPhysics")!);
  expect(() => validateForgeSpecialistJob(physicsJob, {
    worldPhysics: {
      rules: [{ id: "rule-1", fields: { name: "Rule 1", rule: "Pay the ferry toll", profits: "The city", pays: "The traveler" }, keys: ["toll"], permanence: "C", locked: false }],
      authorityCheck: "City bailiff",
      powerCeiling: "Ordinary human limits",
      faultLines: ["Smuggling"],
      permanence: "C",
    },
  })).toThrow("descriptive semantic name");

  // Physics job validates valid semantic rules
  const validPhysics = validateForgeSpecialistJob(physicsJob, {
    worldPhysics: {
      rules: [{ id: "rule-1", fields: { name: "Ferry Slip Toll", rule: "Pay the ferry toll", profits: "The city", pays: "The traveler" }, keys: ["toll"], permanence: "C", locked: false }],
      authorityCheck: "City bailiff",
      powerCeiling: "Ordinary human limits",
      faultLines: ["Smuggling"],
      permanence: "C",
    },
  });
  expect(validPhysics).toHaveProperty("worldPhysics");
});

test("Bundle 1 jobs enforce dependency ordering in the durable specialist ledger", () => {
  const selection = testSelection();
  const plan = createForgeSpecialistPlan(selection, {}, "source context", source);
  const bundleOne = plan.jobs.filter(job => job.bundleIndex === 0);
  let ledger = createSpecialistLedger({ planHash: plan.planHash, inputFingerprint: source, jobs: bundleOne });

  const coreJob = bundleOne.find(job => job.destinations[0] === "core")!;
  const userJob = bundleOne.find(job => job.destinations[0] === "user")!;
  const physicsJob = bundleOne.find(job => job.destinations[0] === "worldPhysics")!;
  const statusJob = bundleOne.find(job => job.destinations[0] === "status")!;

  // user, physics, and status cannot begin before core
  expect(() => beginSpecialistJob(ledger, { jobId: userJob.id, attemptId: "att-user-1", provider: "gemini", modelId: "flash", promptHash: userJob.promptHash, startedAt: at })).toThrow("not ready");
  expect(() => beginSpecialistJob(ledger, { jobId: statusJob.id, attemptId: "att-status-1", provider: "gemini", modelId: "flash", promptHash: statusJob.promptHash, startedAt: at })).toThrow("not ready");

  // Begin and complete core
  ledger = beginSpecialistJob(ledger, { jobId: coreJob.id, attemptId: "att-core-1", provider: "gemini", modelId: "flash", promptHash: coreJob.promptHash, startedAt: at });
  ledger = completeSpecialistJob(ledger, {
    jobId: coreJob.id, attemptId: "att-core-1", commandId: "cmd-core-1",
    sections: { core: { title: "Port Mara", pitch: "A salt port under winter fog", genreTone: "Grounded drama", eraScale: "Late industrial", theRule: "The tide waits for no slip", theCost: "Cold iron rusts fast", theSituation: "The union is holding a quiet ballot", thePressure: "The ice is closing the outer channel", theQuestion: "Can the pilot keep his license?", permanence: "P" } },
    completedAt: at,
  });

  // Now user and physics can begin
  ledger = beginSpecialistJob(ledger, { jobId: userJob.id, attemptId: "att-user-1", provider: "gemini", modelId: "flash", promptHash: userJob.promptHash, startedAt: at });
  ledger = completeSpecialistJob(ledger, {
    jobId: userJob.id, attemptId: "att-user-1", commandId: "cmd-user-1",
    sections: { user: { rolePosition: "Relief ferry pilot arriving on the morning cutter", startsWith: "A stamped union discharge book and two changes of wool", wants: "A berth on the deep-draft run", fears: "Being blacklisted by the slip committee", hookPull: "A vacancy at Slip 4", hookPush: "No work back across the narrows", hookTrap: "The retiring pilot will only sign for someone who knows the shoal", permanence: "P" } },
    completedAt: at,
  });

  // status still cannot begin until physics completes
  expect(() => beginSpecialistJob(ledger, { jobId: statusJob.id, attemptId: "att-status-1", provider: "gemini", modelId: "flash", promptHash: statusJob.promptHash, startedAt: at })).toThrow("not ready");

  // Complete physics
  ledger = beginSpecialistJob(ledger, { jobId: physicsJob.id, attemptId: "att-physics-1", provider: "gemini", modelId: "flash", promptHash: physicsJob.promptHash, startedAt: at });
  ledger = completeSpecialistJob(ledger, {
    jobId: physicsJob.id, attemptId: "att-physics-1", commandId: "cmd-physics-1",
    sections: { worldPhysics: { rules: [{ id: "rule-tide", fields: { name: "Channel Shoal Clearance", rule: "Vessels over twenty tons must sound the narrows at half-ebb", profits: "The pilot house retains authority", pays: "Unlicensed runners forfeit salvage" }, keys: ["shoal", "ebb"], permanence: "C", locked: false }], authorityCheck: "Harbor pilot warden", powerCeiling: "Strict nautical physics and steam engineering", faultLines: ["Winter drift ice", "Forged sounding charts"], permanence: "C" } },
    completedAt: at,
  });

  // Now status can begin and complete
  ledger = beginSpecialistJob(ledger, { jobId: statusJob.id, attemptId: "att-status-1", provider: "gemini", modelId: "flash", promptHash: statusJob.promptHash, startedAt: at });
  ledger = completeSpecialistJob(ledger, {
    jobId: statusJob.id, attemptId: "att-status-1", commandId: "cmd-status-1",
    sections: { status: { content: "The cutter has just tied off at Slip 4; morning bell has not yet rung", settings: "Winter fog; visibility under half a cable", permanence: "T" } },
    completedAt: at,
  });

  // Merge Bundle 1
  const merged = mergeSpecialistJobs(ledger, 0);
  expect(merged).toHaveProperty("core");
  expect(merged).toHaveProperty("user");
  expect(merged).toHaveProperty("worldPhysics");
  expect(merged).toHaveProperty("status");
});

test("older ledgers without Bundle 1 jobs fall back safely instead of pretending jobs exist", () => {
  const oldLedger: ForgeSpecialistLedgerV1 = {
    version: 1,
    planHash: "sha256:old",
    inputFingerprint: source,
    jobs: [{
      job: {
        version: 1, id: "old-b2", bundleIndex: 1, ordinal: 0, kind: "category_entries",
        destinations: ["locations"], categoryId: "locations", categoryLabel: "Locations",
        entryIds: ["loc-1"], dependencies: [], schemaId: "forge.bundle2.locations/v1",
        schemaVersion: 1, promptHash: "sha256:t", inputFingerprint: source,
        estimatedOutputTokens: 500, splitDepth: 0,
      },
      status: "complete", attempts: [], sections: { locations: [] },
    }],
  };
  expect(canUsePersistedForgeSpecialistsForBundle(oldLedger, 0)).toBe(false);
  expect(canUsePersistedForgeSpecialistsForBundle(oldLedger, 1)).toBe(true);
});

test("single-request Forge does not convert Bundle 1 into specialist execution", () => {
  expect(canUseForgeSpecialistsForBatch(0, 1)).toBe(true);
  expect(canUseForgeSpecialistsForBatch(0, 6)).toBe(false);
});

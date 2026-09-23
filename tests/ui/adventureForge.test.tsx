import { expect, test } from "bun:test";
import {
  deriveAdventureForgeView,
  resolveEffectiveJobs,
  CANONICAL_FORGE_BUNDLES,
} from "../../src/ui/adventure/workspaces/forgeViewModel";

test("deriveAdventureForgeView generates all 6 canonical bundles with pending status when idle", () => {
  const model = deriveAdventureForgeView({
    isForging: false,
    workingTitle: "The Whispering Vault",
  });

  expect(model.workingTitle).toBe("The Whispering Vault");
  expect(model.bundles.length).toBe(6);
  expect(model.totalBundleCount).toBe(6);
  expect(model.completedBundleCount).toBe(0);
  expect(model.isForging).toBe(false);
  expect(model.isCompleted).toBe(false);

  // All 6 bundles are pending
  expect(model.bundles.every((b) => b.status === "pending")).toBe(true);

  // Titles match canonical structure
  expect(model.bundles[0].title).toBe("Foundations & The Spine");
  expect(model.bundles[1].title).toBe("Spatial Geography & Power");
  expect(model.bundles[2].title).toBe("Dramatis Personae");
  expect(model.bundles[3].title).toBe("Knowledge Systems & Secrets");
  expect(model.bundles[4].title).toBe("Pressures, Chronology & Atmosphere");
  expect(model.bundles[5].title).toBe("Narrative Opening & Engagement");
});

test("deriveAdventureForgeView derives in_progress and active specialist telemetry during generation", () => {
  const model = deriveAdventureForgeView({
    isForging: true,
    workingTitle: "The Whispering Vault",
    generationActivity: {
      status: "streaming",
      task: "forge",
      progress: {
        task: "forge",
        phase: "forge_bundle",
        specialistPhase: "cartographer",
        specialistIndex: 2,
        specialistTotal: 6,
        completedSteps: 1,
        totalSteps: 6,
        label: "Cartographer drafting 4 territorial sectors",
      },
    } as any,
    streamedSections: {
      core: { pitch: "Ancient subterranean vault containing cold truths." },
      user: { rolePosition: "Vault Warden" },
    },
  });

  expect(model.isForging).toBe(true);
  expect(model.bundles[0].status).toBe("completed");
  expect(model.bundles[0].isPreserved).toBe(true);
  expect(model.bundles[0].previewSummary).toBe("“Ancient subterranean vault containing cold truths.”");

  // Bundle 2 is in progress
  expect(model.bundles[1].status).toBe("in_progress");
  expect(model.bundles[1].specialistTitle).toBe("Cartographer & Faction Chronicler");

  // Telemetry is truthful and derived
  expect(model.activeSpecialist).not.toBeNull();
  expect(model.activeSpecialist?.pulseActive).toBe(true);
  expect(model.activeSpecialist?.jobProgress).toContain("2 of 6");
  expect(model.activeSpecialist?.currentActivityText).toBe("Cartographer drafting 4 territorial sectors");

  // Truthful cancellation contract
  expect(model.cancellationNotice.label).toBe("Stop generation");
  expect(model.cancellationNotice.truthfulExplanation).toContain("Completed specialist jobs are already saved");
});

test("deriveAdventureForgeView derives interrupted status and checkpoint recovery state", () => {
  const model = deriveAdventureForgeView({
    isForging: false,
    workingTitle: "The Whispering Vault",
    hasCheckpoint: true,
    forgeError: "Rate limit reached on provider. Preserved 2 bundles.",
    generationActivity: {
      status: "error",
      task: "forge",
      progress: {
        task: "forge",
        phase: "error",
        completedSteps: 2,
        totalSteps: 6,
      },
    } as any,
    streamedSections: {
      core: { pitch: "Vault core" },
      locations: [{ id: "loc-1" }],
    },
  });

  expect(model.hasError).toBe(true);
  expect(model.errorMessage).toContain("Rate limit reached");
  expect(model.hasCheckpoint).toBe(true);
  expect(model.isCompleted).toBe(false);

  // Bundle 1 & 2 are completed
  expect(model.bundles[0].status).toBe("completed");
  expect(model.bundles[1].status).toBe("completed");

  // Bundle 3 is marked interrupted
  expect(model.bundles[2].status).toBe("interrupted");
});

test("deriveAdventureForgeView derives WORLD FORGED completed state when all bundles exist", () => {
  const model = deriveAdventureForgeView({
    isForging: false,
    workingTitle: "The Whispering Vault",
    streamedSections: {
      core: { title: "Vault", pitch: "A cold subterranean mystery." },
      user: { rolePosition: "Warden" },
      worldPhysics: { rules: [] },
      locations: [{ id: "l1" }, { id: "l2" }],
      factions: [{ id: "f1" }],
      npcs: [{ id: "n1" }, { id: "n2" }],
      relationshipWeb: [{ id: "r1" }],
      items: [{ id: "i1" }],
      secrets: [{ id: "s1" }],
      history: [{ id: "h1" }],
      pressures: [{ id: "p1" }],
      opening: { firstLocation: "The Threshold" },
    },
    generationActivity: {
      status: "complete",
      task: "forge",
      progress: {
        task: "forge",
        phase: "complete",
        completedSteps: 6,
        totalSteps: 6,
      },
    } as any,
  });

  expect(model.isCompleted).toBe(true);
  expect(model.completedBundleCount).toBe(6);
  expect(model.canProceedToRefine).toBe(true);
  expect(model.totalEntriesCount).toBeGreaterThan(0);
});

test("resolveEffectiveJobs filters out superseded parent jobs to prevent double-counting", () => {
  const rawJobs = [
    { id: "job-parent-1", isReplaced: true, splitDepth: 0 },
    { id: "job-child-1a", isReplaced: false, splitDepth: 1 },
    { id: "job-child-1b", isReplaced: false, splitDepth: 1 },
    { id: "job-regular-2", isReplaced: false, splitDepth: 0 },
  ];

  const effective = resolveEffectiveJobs(rawJobs);
  expect(effective.length).toBe(3);
  expect(effective.map((j) => j.id)).not.toContain("job-parent-1");
  expect(effective.map((j) => j.id)).toContain("job-child-1a");
  expect(effective.map((j) => j.id)).toContain("job-child-1b");
  expect(effective.map((j) => j.id)).toContain("job-regular-2");
});

test("AdventureForgeWorkspace renders Command Center UI with 6 bundles and stop action when forging", () => {
  const { renderToString } = require("react-dom/server");
  const React = require("react");
  const { AdventureForgeWorkspace } = require("../../src/ui/adventure/workspaces/AdventureForgeWorkspace");

  const html = renderToString(
    React.createElement(AdventureForgeWorkspace, {
      buildLogs: [],
      streamedSections: {
        core: { pitch: "Deep frostpunk mystery" },
      },
      isForging: true,
      document: null,
      onProceedToRefine: () => {},
      workingTitle: "The Iron Sanctum",
      generationActivity: {
        status: "streaming",
        task: "forge",
        onCancel: () => {},
        progress: {
          task: "forge",
          phase: "forge_bundle",
          specialistPhase: "cartographer",
          specialistIndex: 2,
          specialistTotal: 6,
          completedSteps: 1,
          totalSteps: 6,
          label: "Cartographer drafting 4 territorial sectors",
        },
      },
    })
  );

  expect(html).toContain("The Iron Sanctum");
  expect(html).toContain("Stage 04 · Forge Command Center");
  expect(html).toContain("PIPELINE ACTIVE");
  expect(html).toContain("Cartographer drafting 4 territorial sectors");
  expect(html).toContain("Stop generation");
  expect(html).toContain("Foundations &amp; The Spine");
  expect(html).toContain("Spatial Geography &amp; Power");
});

test("AdventureForgeWorkspace renders WORLD FORGED celebration state with Refine CTA", () => {
  const { renderToString } = require("react-dom/server");
  const React = require("react");
  const { AdventureForgeWorkspace } = require("../../src/ui/adventure/workspaces/AdventureForgeWorkspace");

  const html = renderToString(
    React.createElement(AdventureForgeWorkspace, {
      buildLogs: [],
      streamedSections: {
        core: { title: "Sanctum", pitch: "Deep frostpunk mystery" },
        user: { rolePosition: "Engineer" },
        worldPhysics: { rules: [] },
        locations: [{ id: "l1" }],
        factions: [{ id: "f1" }],
        npcs: [{ id: "n1" }],
        relationshipWeb: [{ id: "r1" }],
        items: [{ id: "i1" }],
        secrets: [{ id: "s1" }],
        history: [{ id: "h1" }],
        pressures: [{ id: "p1" }],
        opening: { firstLocation: "Hearth" },
      },
      isForging: false,
      document: null,
      onProceedToRefine: () => {},
      workingTitle: "The Iron Sanctum",
      generationActivity: {
        status: "complete",
        task: "forge",
        progress: {
          task: "forge",
          phase: "complete",
          completedSteps: 6,
          totalSteps: 6,
        },
      },
    })
  );

  expect(html).toContain("WORLD FORGED");
  expect(html).toContain("World Forged Successfully");
  expect(html).toContain("Enter Refine Studio");
  expect(html).toContain("Review Manuscript in Refine");
});


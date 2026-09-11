import { expect, test } from "bun:test";
import { createBlueprintPlanningContext } from "../../src/lib/blueprint/planningContext";
import { createSavedProjectV2, type SavedLoreBibleProjectV2 } from "../../src/lib/projectPersistence";

const project = createSavedProjectV2({
  document: {
    id: "legacy-document",
    title: "A document title that must not be copied",
    sparkText: "Document prose must remain private to the adapter.",
    opening: { firstMessage: "This authored first message must not be copied." },
  } as any,
  workflow: {
    stage: "3",
    sparkParse: {
      franchise: "Archive City",
      nonNegotiables: ["Legacy non-negotiable"],
      registerWords: ["legacy"],
      userRole: "Legacy role",
      openNegotiables: ["Legacy open question"],
      sparkDNA: {
        nonNegotiables: ["Keep player choices authoritative"],
        premisePromise: "An archive remembers every bargain.",
        toneEnvelope: { primary: "watchful", descriptors: ["rainy", "intimate"] },
        genreSignals: ["urban fantasy", "mystery"],
        playerAgencyBoundaries: "The player decides all protagonist actions.",
        openVariables: ["Who opened the vault?"],
        existingPressures: ["The debt collector arrives at dawn."],
        assumptions: ["Records have social force."],
        opportunitySpace: ["An ally may be forged through a favor."],
        userRole: "A new archivist",
        franchise: "Archive City",
      },
    },
    canon: {} as any,
    physics: {
      density: "Rich",
      densityTokens: 6000,
      strangeness: 4,
      mundanity: 2,
      genre: "Urban fantasy",
      subgenre: "Archive mystery",
      violence: "Moderate",
      horror: "Existential",
      romance: "Subplot",
      humor: "Dry",
      pacing: "Measured",
      explicitContent: "Fade",
      playerDeath: "Only if earned",
      linguisticBase: "Contemporary English",
      mustInclude: "Rain-soaked ledgers",
      mustAvoid: "Chosen-one destiny",
    },
    takes: [
      { id: "take-other", title: "Other", pitch: "Not selected", genreTone: "Comedy", angle: "Farce", retainedNonNegotiables: [] },
      { id: "take-selected", title: "Selected", pitch: "A debt is called in.", genreTone: "Urban fantasy mystery", angle: "Social pressure", retainedNonNegotiables: ["Keep player choices authoritative"] },
    ],
    selectedTakeId: "take-selected",
  },
  generation: {
    settings: { quality: "Deep Craft", divergenceMode: "Exploratory", authorFlavor: { mode: "Off", strength: "Sprinkle", autoBehavior: "Compatible" } },
    modelSelection: { profileId: null, modelId: null },
    provenance: [{ stage: "forge", provider: "example", apiKey: "credential-shaped-value" } as any],
  },
} as any) as SavedLoreBibleProjectV2 & { unrelatedExtension: { apiKey: string } };

(project as any).unrelatedExtension = { apiKey: "credential-shaped-value" };

test("creates an allowlisted planning context from the selected saved-project workflow", () => {
  const context = createBlueprintPlanningContext(project, { projectId: "graph-1", projectRevision: 3 });

  expect(context).toMatchObject({
    projectId: "graph-1",
    projectRevision: 3,
    selectedTake: {
      id: "take-selected",
      title: "Selected",
      pitch: "A debt is called in.",
      angle: "Social pressure",
      genres: ["Urban fantasy mystery"],
      tone: ["Urban fantasy mystery"],
      retainedNonNegotiables: ["Keep player choices authoritative"],
    },
    sparkDna: {
      premisePromise: "An archive remembers every bargain.",
      toneEnvelope: { primary: "watchful", descriptors: ["rainy", "intimate"] },
      genreSignals: ["urban fantasy", "mystery"],
    },
    physicsConstraints: { mustAvoid: "Chosen-one destiny", densityTokens: 6000 },
    generationQuality: "deep_craft",
  });
  expect(JSON.stringify(context)).not.toContain("provenance");
  expect(JSON.stringify(context)).not.toContain("apiKey");
  expect(JSON.stringify(context)).not.toContain("firstMessage");
  expect(JSON.stringify(context)).not.toContain("Document prose");
});

test("omits the selected take when its saved selection cannot be resolved", () => {
  const context = createBlueprintPlanningContext({ ...project, workflow: { ...project.workflow, selectedTakeId: "missing" } }, { projectId: "graph-1", projectRevision: 3 });

  expect(context.selectedTake).toBeUndefined();
});

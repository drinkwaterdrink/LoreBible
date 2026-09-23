import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { AdventureBlueprintWorkspace } from "../../src/ui/adventure/workspaces/AdventureBlueprintWorkspace";
import { DEFAULT_PHYSICS } from "../../src/lib/scenarioDraft";
import type { BlueprintSelectionV1 } from "../../src/contracts/blueprintSelection";

const cleanHtml = (html: string) => html.replace(/<!-- -->/g, "");

const MOCK_BLUEPRINT_SELECTION: BlueprintSelectionV1 = {
  schema: "lorebible.blueprint-selection/v1",
  projectId: "proj-test",
  sourceProjectRevision: 1,
  sourceRecommendationFingerprint: "fingerprint-test",
  interfaceMode: "smart_auto",
  artifactTargets: ["full_world"],
  worldMode: "hybrid",
  buildIntensity: "rich",
  generationQuality: "balanced",
  runtimeBudget: "balanced",
  lorebookScale: "standard",
  lorebookRange: { min: 20, ideal: 30, max: 40 },
  loreLibraryBudget: { mode: "standard" },
  runtimeTokenBudget: { mode: "auto" },
  principalCastRange: { min: 3, ideal: 5, max: 8 },
  rosterCastRange: { min: 8, ideal: 12, max: 20 },
  everydayLifeDetail: 2,
  forgeExecutionPreference: "continuous",
  mechanicPacks: [],
  lockedFields: [],
  createdAt: "2026-09-22T00:00:00Z",
  updatedAt: "2026-09-22T00:00:00Z",
  categories: [
    {
      id: "factions",
      label: "Factions & Secret Guilds",
      targetRange: { min: 3, ideal: 4, max: 5 },
      detail: "standard",
      status: "required",
      userLocked: true,
      custom: true,
      purpose: "Competing underground political orders",
      justification: "Critical to court intrigue narrative tension",
      likelyRuntimeRole: "dynamic",
      candidateArchitectures: [],
      userExplanation: "",
    },
    {
      id: "characters",
      label: "Dramatis Personae",
      targetRange: { min: 4, ideal: 5, max: 6 },
      detail: "rich",
      status: "required",
      userLocked: false,
      custom: false,
      purpose: "Core agents of change",
      justification: "Character-driven conflict",
      likelyRuntimeRole: "dynamic",
      candidateArchitectures: [],
      userExplanation: "",
    },
    {
      id: "locations",
      label: "The Sovereign Territory",
      targetRange: { min: 2, ideal: 3, max: 4 },
      detail: "standard",
      status: "recommended",
      userLocked: false,
      custom: false,
      purpose: "Atmospheric stage boundaries",
      justification: "Spatial anchor for all encounters",
      likelyRuntimeRole: "reference",
      candidateArchitectures: [],
      userExplanation: "",
    },
  ],
};

test("AdventureBlueprintWorkspace renders data-driven categories preserving custom, lock, and target range", () => {
  const rawHtml = renderToString(
    <AdventureBlueprintWorkspace
      physics={DEFAULT_PHYSICS}
      onChangePhysics={() => {}}
      onProceed={() => {}}
      isCanonActive={false}
      chosenTitle="The Whispering Vault"
      blueprintSelection={MOCK_BLUEPRINT_SELECTION}
    />
  );
  const html = cleanHtml(rawHtml);

  // Stage hero
  expect(html).toContain("Stage 03 · Rules &amp; Physics");
  expect(html).toContain("Calibrate the world&#x27;s forces.");

  // Data-driven categories rendered from props
  expect(html).toContain("Factions &amp; Secret Guilds");
  expect(html).toContain("Dramatis Personae");
  expect(html).toContain("The Sovereign Territory");

  // Custom pill
  expect(html).toContain("Custom");

  // User locked indicator
  expect(html).toContain('title="User locked"');

  // Target ranges
  expect(html).toContain("3–5");
  expect(html).toContain("4–6");
  expect(html).toContain("2–4");
});

test("AdventureBlueprintWorkspace renders Rules & Physics constraints", () => {
  const customPhysics = {
    ...DEFAULT_PHYSICS,
    genre: "Nautical Weird Horror",
    violence: "Moderate" as const,
    linguisticBase: "Latinate / Romance",
  };

  const rawHtml = renderToString(
    <AdventureBlueprintWorkspace
      physics={customPhysics}
      onChangePhysics={() => {}}
      onProceed={() => {}}
      isCanonActive={false}
      chosenTitle="The Whispering Vault"
      blueprintSelection={MOCK_BLUEPRINT_SELECTION}
    />
  );
  const html = cleanHtml(rawHtml);

  expect(html).toContain("Rules &amp; Physics Constraints");
  expect(html).toContain("Nautical Weird Horror");
  expect(html).toContain("Moderate");
  expect(html).toContain("Latinate / Romance");
});

test("AdventureBlueprintWorkspace renders Enter Forge CTA when blueprint is valid", () => {
  const rawHtml = renderToString(
    <AdventureBlueprintWorkspace
      physics={DEFAULT_PHYSICS}
      onChangePhysics={() => {}}
      onProceed={() => {}}
      isCanonActive={false}
      chosenTitle="The Whispering Vault"
      blueprintSelection={MOCK_BLUEPRINT_SELECTION}
    />
  );
  const html = cleanHtml(rawHtml);

  expect(html).toContain("Enter Forge");
  expect(html).toContain("Open Full Studio");
});

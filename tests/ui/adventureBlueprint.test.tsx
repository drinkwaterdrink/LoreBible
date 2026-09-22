import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { AdventureBlueprintWorkspace } from "../../src/ui/adventure/workspaces/AdventureBlueprintWorkspace";
import { DEFAULT_PHYSICS } from "../../src/lib/scenarioDraft";
import type { BlueprintSelectionV1 } from "../../src/contracts/blueprintSelection";

const cleanHtml = (html: string) => html.replace(/<!-- -->/g, "");

const MOCK_BLUEPRINT_SELECTION: BlueprintSelectionV1 = {
  version: 1,
  targetWordCount: 4500,
  everydayLifeDetail: "moderate",
  forgeExecutionPreference: "continuous",
  categories: [
    {
      id: "factions",
      label: "Factions & Secret Guilds",
      targetRange: { min: 3, max: 5 },
      detail: "standard",
      status: "included",
      userLocked: true,
      custom: true,
      purpose: "Competing underground political orders",
      justification: "Critical to court intrigue narrative tension",
    },
    {
      id: "characters",
      label: "Dramatis Personae",
      targetRange: { min: 4, max: 6 },
      detail: "high",
      status: "included",
      userLocked: false,
      custom: false,
      purpose: "Core agents of change",
      justification: "Character-driven conflict",
    },
    {
      id: "locations",
      label: "The Sovereign Territory",
      targetRange: { min: 2, max: 4 },
      detail: "standard",
      status: "included",
      userLocked: false,
      custom: false,
      purpose: "Atmospheric stage boundaries",
      justification: "Spatial anchor for all encounters",
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

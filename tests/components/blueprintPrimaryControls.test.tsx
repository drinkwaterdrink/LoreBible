import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { BlueprintPrimaryControls } from "../../src/components/blueprint/BlueprintPrimaryControls";
import { createBlueprintPlan } from "../../src/lib/blueprint/planner";
import { familyVisit } from "../fixtures/blueprintPremises";
import { blueprintSelectionFixture } from "../fixtures/blueprintSelection";

test("custom library size renders one mobile-friendly token slider and a live entry estimate", () => {
  const plan = createBlueprintPlan(familyVisit(), { createdAt: "2026-09-13T00:00:00.000Z" });
  const html = renderToString(
    <BlueprintPrimaryControls
      plan={plan}
      selection={blueprintSelectionFixture}
      onField={() => undefined}
      onLoreLibraryTarget={() => undefined}
    />,
  );

  expect(html).toContain('aria-label="Authored lore target"');
  expect(html).toContain('type="range"');
  expect(html).toContain('min="2000"');
  expect(html).toContain('max="40000"');
  expect(html).toContain('step="1000"');
  expect(html).toContain("40,000");
  expect(html).toContain("approximately");
  expect(html).toContain("80");
  expect(html).toContain("160");
  expect(html).not.toContain('aria-label="Library maximum tokens"');
});

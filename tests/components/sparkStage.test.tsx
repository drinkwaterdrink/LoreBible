import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { SparkStage } from "../../src/components/SparkStage";

test("Spark action footer is mobile stacked, full width, and safe-area aware", () => {
  const html = renderToString(<SparkStage
    sparkText="A mobile premise"
    onChangeSpark={() => undefined}
    onProceed={() => undefined}
    isLoading={false}
    settings={{
      quality: "Deep Craft",
      divergenceMode: "Exploratory",
      authorFlavor: { mode: "Off", strength: "Sprinkle", autoBehavior: "Compatible", manualAuthorId: null, overdriveEnabled: false },
      modelSelection: null,
    }}
    onUpdateSettings={() => undefined}
  />);
  expect(html).toContain('data-spark-action-footer="true"');
  expect(html).toContain("flex-col sm:flex-row");
  expect(html).toContain('id="proceed-to-divergence-btn"');
  expect(html).toContain("w-full sm:w-auto");
  expect(html).toContain("safe-area-inset-bottom");
  expect(html).toContain("Generate Fresh Premises");
  expect(html).toContain("Uses one model request");
  expect(html).not.toContain("Roll Fresh Sparks");
});

test("Spark keeps prior generated premises visible while a new set is being generated", () => {
  const html = renderToString(<SparkStage
    sparkText=""
    onChangeSpark={() => undefined}
    onProceed={() => undefined}
    isLoading={false}
    premiseSuggestions={{
      schemaVersion: 1,
      suggestions: ["a", "b", "c", "d"].map((id) => ({ id, title: `Generated ${id}`, premise: `Fresh premise ${id}`, category: "Original" })) as any,
    }}
    onGeneratePremiseSuggestions={() => undefined}
    isGeneratingPremises={true}
    premiseGenerationActivity={{
      task: "premises",
      progress: { task: "premises", phase: "writer", label: "Drafting four fresh premises", completedSteps: 0, totalSteps: 1 },
      startedAt: Date.now(),
      usage: {},
      reasoning: "",
      reasoningTruncated: false,
      status: "active",
      lastEventAt: Date.now(),
      lastProviderActivityAt: null,
      outputCharacters: 0,
      onCancel: () => undefined,
      onClearReasoning: () => undefined,
    }}
  />);

  expect(html).toContain("Generated a");
  expect(html).toContain("Fresh premise d");
  expect(html).toContain("Stop premise generation");
  expect(html).toContain("Drafting four fresh premises");
});

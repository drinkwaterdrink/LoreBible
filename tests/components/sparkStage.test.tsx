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
});

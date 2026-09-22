import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { ParchmentEditor } from "../../src/ui/adventure/components/ParchmentEditor";
import { AdventureSparkWorkspace } from "../../src/ui/adventure/workspaces/AdventureSparkWorkspace";
import { DEFAULT_CANON } from "../../src/lib/scenarioDraft";

const cleanHtml = (html: string) => html.replace(/<!-- -->/g, "");

test("ParchmentEditor renders premise text, chapter badge, and word count accurately", () => {
  const text = "A cartographer discovers that maps drawn at midnight predict tomorrow's assassinations.";
  const rawHtml = renderToString(
    <ParchmentEditor
      value={text}
      onChange={() => {}}
      placeholder="Type your premise..."
    />
  );
  const html = cleanHtml(rawHtml);

  expect(html).toContain("Chapter I · The Initial Spark");
  expect(html).toContain("A cartographer discovers");
  // Text has 11 words
  expect(html).toContain("11 words");
  // Reset clear premise icon button is rendered
  expect(html).toContain("Wipe draft");
});

test("AdventureSparkWorkspace renders StageHero, docked actions, and primary CTA", () => {
  const rawHtml = renderToString(
    <AdventureSparkWorkspace
      sparkText="The clockwork king requires human memories to maintain kingdom stability."
      onChangeSpark={() => {}}
      onProceed={() => {}}
      isLoading={false}
      canon={DEFAULT_CANON}
      onUpdateCanon={() => {}}
    />
  );
  const html = cleanHtml(rawHtml);

  // StageHero
  expect(html).toContain("Stage 01 · Origin Seed");
  expect(html).toContain("Lay down the spark.");

  // Docked secondary actions
  expect(html).toContain("Inspire");
  expect(html).toContain("Collide");
  expect(html).toContain("Analyze Margin");

  // Primary action dock
  expect(html).toContain("Examine Divergence");
  expect(html).toContain("parchment-workspace");
});

test("AdventureSparkWorkspace reflects loading status correctly in primary dock", () => {
  const rawHtml = renderToString(
    <AdventureSparkWorkspace
      sparkText="Test premise"
      onChangeSpark={() => {}}
      onProceed={() => {}}
      isLoading={true}
      canon={DEFAULT_CANON}
      onUpdateCanon={() => {}}
    />
  );
  const html = cleanHtml(rawHtml);

  expect(html).toContain("Exploring Angles...");
  expect(html).toContain("disabled");
});

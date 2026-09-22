import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { JourneyStrip } from "../../src/ui/adventure/JourneyStrip";

test("JourneyStrip desktop bar renders all 5 stages with Blueprint and Rules & Physics subtitle", () => {
  const html = renderToString(
    <JourneyStrip
      currentStage={3}
      maxUnlockedStage={4}
      onSelectStage={() => {}}
      variant="desktop-bar"
    />,
  );

  expect(html).toContain("Spark");
  expect(html).toContain("Divergence");
  expect(html).toContain("Blueprint");
  expect(html).toContain("Rules &amp; Physics");
  expect(html).toContain("Forge");
  expect(html).toContain("Refine");

  // Stage 3 is current
  expect(html).toContain('aria-current="step"');
});

test("JourneyStrip marks stages as completed, current, and locked based on stage progress", () => {
  const html = renderToString(
    <JourneyStrip
      currentStage={2}
      maxUnlockedStage={3}
      onSelectStage={() => {}}
      variant="desktop-bar"
    />,
  );

  // Stage 1 (Spark) is completed (< currentStage)
  // Stage 2 (Divergence) is current
  // Stage 4 & 5 are locked (> maxUnlockedStage) and should have disabled attribute
  expect(html).toContain("disabled");
});

test("JourneyStrip mobile-strip renders compact stepper navigation", () => {
  const html = renderToString(
    <JourneyStrip
      currentStage={1}
      maxUnlockedStage={1}
      onSelectStage={() => {}}
      variant="mobile-strip"
    />,
  );

  expect(html).toContain('aria-label="Workflow Journey"');
  expect(html).toContain("Spark");
  expect(html).toContain("Blueprint");
});

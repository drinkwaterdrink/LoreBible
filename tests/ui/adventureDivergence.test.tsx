import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { AdventureDivergenceWorkspace } from "../../src/ui/adventure/workspaces/AdventureDivergenceWorkspace";
import type { DivergenceTake } from "../../src/types";

const cleanHtml = (html: string) => html.replace(/<!-- -->/g, "");

const MOCK_TAKES: DivergenceTake[] = [
  {
    id: "take-1",
    title: "The Iron Cathedral",
    pitch: "An underground fortress where rust is treated as a divine judgment.",
    genreTone: "Gothic Industrial Horror",
    whatsStrange: "Machines pray louder than monks",
    angle: "Cosmic Irony",
    retainedNonNegotiables: ["Underground city", "The plague of iron"],
  },
  {
    id: "take-2",
    title: "Whispering Rails",
    pitch: "A locomotive expedition through an ocean of salt where train tracks lay themselves.",
    genreTone: "Weird West Speculative",
    whatsStrange: "The tracks remember dead travelers",
    angle: "Frontier Dread",
    retainedNonNegotiables: ["Underground city"],
  },
  {
    id: "take-3",
    title: "The Hollow Court",
    pitch: "Courtiers in porcelain masks trade memories of sunlight during an endless winter.",
    genreTone: "Baroque Fantasy Melodrama",
    whatsStrange: "Faces cannot be reflected in silver",
    angle: "High Society Intrigue",
    retainedNonNegotiables: ["The plague of iron"],
  },
  {
    id: "take-4",
    title: "Clockwork Meridian",
    pitch: "Astronomers race against a decelerating planetary core using forbidden clockwork engines.",
    genreTone: "Hard Sci-Fi / Steampunk",
    whatsStrange: "Gravity fluctuates at noon",
    angle: "Ticking Crucible",
    retainedNonNegotiables: [],
  },
];

test("AdventureDivergenceWorkspace renders 4-quadrant exploration board with real take titles and tags", () => {
  const rawHtml = renderToString(
    <AdventureDivergenceWorkspace
      takes={MOCK_TAKES}
      selectedTakeId="take-2"
      onSelectTake={() => {}}
      onRerollAll={() => {}}
      onPushFurther={() => {}}
      onProceed={() => {}}
      isLoading={false}
      sparkText="Test spark"
    />
  );
  const html = cleanHtml(rawHtml);

  // Stage hero
  expect(html).toContain("Stage 02 · Four Angles");
  expect(html).toContain("Explore the four paths.");

  // Renders take 1, 2, 3, 4
  expect(html).toContain("The Iron Cathedral");
  expect(html).toContain("Whispering Rails");
  expect(html).toContain("The Hollow Court");
  expect(html).toContain("Clockwork Meridian");

  // Real genre tones and angles
  expect(html).toContain("Gothic Industrial Horror");
  expect(html).toContain("Weird West Speculative");
  expect(html).toContain("Machines pray louder than monks");

  // Selected take card has selected indicator
  expect(html).toContain("Chosen");
  expect(html).toContain("adventure-card-selected");

  // Primary action button
  expect(html).toContain("Open Blueprint");
});

test("AdventureDivergenceWorkspace exposes re-explore, push further, and steer controls", () => {
  const rawHtml = renderToString(
    <AdventureDivergenceWorkspace
      takes={MOCK_TAKES}
      selectedTakeId="take-1"
      onSelectTake={() => {}}
      onRerollAll={() => {}}
      onPushFurther={() => {}}
      onSteerSingleTake={() => {}}
      onProceed={() => {}}
      isLoading={false}
      sparkText="Test spark"
    />
  );
  const html = cleanHtml(rawHtml);

  expect(html).toContain("Reroll All Angles");
  expect(html).toContain("Push Selected Further");
  expect(html).toContain("Steer");
});

test("AdventureDivergenceWorkspace renders error state when error is provided", () => {
  const rawHtml = renderToString(
    <AdventureDivergenceWorkspace
      takes={[]}
      selectedTakeId={undefined}
      onSelectTake={() => {}}
      onRerollAll={() => {}}
      onPushFurther={() => {}}
      onProceed={() => {}}
      isLoading={false}
      sparkText="Test spark"
      divergenceError="Rate limit exceeded on upstream provider."
    />
  );
  const html = cleanHtml(rawHtml);

  expect(html).toContain("Rate limit exceeded on upstream provider.");
});

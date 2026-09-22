import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { ProjectHome, PRIMARY_STAGE_ACTIONS } from "../../src/ui/adventure/ProjectHome";
import type { SavedLoreBibleProjectV2 } from "../../src/lib/projectPersistence";
import type { GenerationTelemetryView } from "../../src/ui/adventure/types";
import { DEFAULT_CANON, DEFAULT_PHYSICS } from "../../src/lib/scenarioDraft";

const cleanHtml = (html: string) => html.replace(/<!-- -->/g, "");

const IDLE_TELEMETRY: GenerationTelemetryView = {
  isGenerating: false,
  taskLabel: null,
  phaseLabel: null,
  specialistPhase: null,
  specialistIndex: null,
  specialistTotal: null,
  elapsedMs: null,
  outputTokens: null,
  outputCharacters: null,
  modelName: null,
  canCancel: false,
  onCancel: null,
};

const MOCK_PROJECT: SavedLoreBibleProjectV2 = {
  schemaVersion: 2,
  document: {
    id: "doc-123",
    title: "The Embered Crown",
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-20T12:00:00.000Z",
    sparkText: "A prince uncovers a star shard in the royal archives.",
  } as any,
  workflow: {
    stage: "divergence",
    sparkParse: null,
    canon: DEFAULT_CANON,
    physics: DEFAULT_PHYSICS,
    takes: [],
    selectedTakeId: null,
  },
  generation: {
    settings: {
      quality: "Deep Craft",
      divergenceMode: "Exploratory",
      authorFlavor: { mode: "Off", strength: "Sprinkle", autoBehavior: "Compatible", manualAuthorId: null, overdriveEnabled: false },
      modelSelection: null,
    },
    modelSelection: { profileId: "env", modelId: "gemini-2.5-pro" },
    provenance: [],
  },
  savedAt: "2026-09-20T12:00:00.000Z",
};

test("ProjectHome derives the correct primary continue action for each stage", () => {
  expect(PRIMARY_STAGE_ACTIONS[1].label).toBe("Continue Spark");
  expect(PRIMARY_STAGE_ACTIONS[2].label).toBe("Review Divergence");
  expect(PRIMARY_STAGE_ACTIONS[3].label).toBe("Open Blueprint");
  expect(PRIMARY_STAGE_ACTIONS[4].label).toBe("Continue Forge");
  expect(PRIMARY_STAGE_ACTIONS[5].label).toBe("Review Manuscript");

  // Render for Stage 3 (Blueprint)
  const htmlStage3 = cleanHtml(
    renderToString(
      <ProjectHome
        workingTitle="Project Blueprint"
        currentStage={3}
        maxUnlockedStage={3}
        savedProjects={[]}
        generationTelemetry={IDLE_TELEMETRY}
        isSaved={true}
        onContinueWriting={() => {}}
        onSelectStage={() => {}}
        onNewScenario={() => {}}
        onOpenVault={() => {}}
      />,
    ),
  );

  expect(htmlStage3).toContain("Open Blueprint");
  expect(htmlStage3).toContain("Stage 3: Blueprint");
  expect(htmlStage3).toContain("Rules &amp; Physics");
  expect(htmlStage3).toContain("Saved");

  // Render for Stage 1 (Spark)
  const htmlStage1 = cleanHtml(
    renderToString(
      <ProjectHome
        workingTitle="Fresh Tale"
        currentStage={1}
        maxUnlockedStage={1}
        savedProjects={[]}
        generationTelemetry={IDLE_TELEMETRY}
        isSaved={false}
        onContinueWriting={() => {}}
        onSelectStage={() => {}}
        onNewScenario={() => {}}
        onOpenVault={() => {}}
      />,
    ),
  );

  expect(htmlStage1).toContain("Continue Spark");
  expect(htmlStage1).toContain("Unsaved");
});

test("ProjectHome displays real saved manuscripts and empty state without fabrication", () => {
  // 1. With saved projects
  const htmlWithProjects = cleanHtml(
    renderToString(
      <ProjectHome
        workingTitle="Active Tale"
        currentStage={1}
        maxUnlockedStage={1}
        savedProjects={[MOCK_PROJECT]}
        generationTelemetry={IDLE_TELEMETRY}
        onContinueWriting={() => {}}
        onSelectStage={() => {}}
        onNewScenario={() => {}}
        onOpenVault={() => {}}
        onLoadSavedProject={() => {}}
      />,
    ),
  );

  expect(htmlWithProjects).toContain("The Embered Crown");
  expect(htmlWithProjects).toContain("Load Manuscript");
  expect(htmlWithProjects).toContain("Recent Projects / Saved Manuscripts");

  // 2. Empty state
  const htmlEmpty = cleanHtml(
    renderToString(
      <ProjectHome
        workingTitle="Fresh Tale"
        currentStage={1}
        maxUnlockedStage={1}
        savedProjects={[]}
        generationTelemetry={IDLE_TELEMETRY}
        onContinueWriting={() => {}}
        onSelectStage={() => {}}
        onNewScenario={() => {}}
        onOpenVault={() => {}}
      />,
    ),
  );

  expect(htmlEmpty).toContain("No saved manuscripts yet in the library vault");
});

test("ProjectHome displays truthful telemetry when generation is active", () => {
  const activeTelemetry: GenerationTelemetryView = {
    isGenerating: true,
    taskLabel: "Forge Synthesis",
    phaseLabel: "Streaming Factions Bundle",
    specialistPhase: "Locations & Factions",
    specialistIndex: 2,
    specialistTotal: 5,
    elapsedMs: 8000,
    outputTokens: 2450,
    outputCharacters: 9800,
    modelName: "Gemini 2.5 Pro",
    canCancel: true,
    onCancel: () => {},
  };

  const html = cleanHtml(
    renderToString(
      <ProjectHome
        workingTitle="Active Tale"
        currentStage={4}
        maxUnlockedStage={4}
        savedProjects={[]}
        generationTelemetry={activeTelemetry}
        onContinueWriting={() => {}}
        onSelectStage={() => {}}
        onNewScenario={() => {}}
        onOpenVault={() => {}}
      />,
    ),
  );

  expect(html).toContain("Forge Synthesis");
  expect(html).toContain("Locations &amp; Factions");
  expect(html).toContain("Streaming Factions Bundle");
  expect(html).toContain("2,450 tokens");
  expect(html).toContain("Stop");
});

test("ProjectHome exposes real Quick Actions and Library Vault navigation", () => {
  const html = cleanHtml(
    renderToString(
      <ProjectHome
        workingTitle="Active Tale"
        currentStage={2}
        maxUnlockedStage={2}
        savedProjects={[MOCK_PROJECT]}
        generationTelemetry={IDLE_TELEMETRY}
        onContinueWriting={() => {}}
        onSelectStage={() => {}}
        onNewScenario={() => {}}
        onOpenVault={() => {}}
        onOpenCommandPalette={() => {}}
        onOpenSettings={() => {}}
      />,
    ),
  );

  expect(html).toContain("Quick Actions");
  expect(html).toContain("New Scenario");
  expect(html).toContain("Open Library Vault");
  expect(html).toContain("1 saved manuscript");
  expect(html).toContain("Commands &amp; Search");
  expect(html).toContain("Connections &amp; Settings");
});

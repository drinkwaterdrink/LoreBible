import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { VaultModal } from "../../src/components/VaultModal";
import { createSavedProjectV2 } from "../../src/lib/projectPersistence";

test("Vault renders project workflow metadata rather than flattening records to documents", () => {
  const document = {
    id: "doc-1", title: "Restorable Project", createdAt: "2026-01-01", updatedAt: "2026-01-02", sparkText: "Premise",
    parse: {}, canon: {}, physics: { density: "Standard" }, core: { title: "Restorable Project", pitch: "Premise", genreTone: "Drama" },
  } as any;
  const project = createSavedProjectV2({
    document,
    workflow: { stage: "2", maxUnlockedStage: "4", sparkParse: null, canon: {} as any, physics: document.physics, takes: [], selectedTakeId: null },
    generation: { settings: {} as any, modelSelection: { profileId: null, modelId: null }, provenance: [] },
  });
  const html = renderToString(<VaultModal
    isOpen
    onClose={() => undefined}
    savedProjects={[project]}
    onLoadProject={() => undefined}
    onDeleteProject={() => undefined}
    onDuplicateProject={() => undefined}
    onRenameProject={() => undefined}
    currentDocumentId="doc-1"
  />);
  expect(html).toContain("Restorable Project");
  expect(html).toContain('aria-label="Stage 2, unlocked through 4"');
});

test("Vault identifies a fully forged legacy project as Refine-ready", () => {
  const document = {
    id: "legacy-forged", title: "Legacy Forge", createdAt: "2026-01-01", updatedAt: "2026-01-02", sparkText: "Premise",
    parse: {}, canon: {}, physics: { density: "Rich" }, core: { title: "Legacy Forge", pitch: "Premise", theRule: "Generated rule" },
    opening: { firstMessage: "Playable opening" },
  } as any;
  const project = createSavedProjectV2({
    document,
    workflow: { stage: "1", sparkParse: null, canon: {} as any, physics: document.physics, takes: [], selectedTakeId: null },
    generation: { settings: { quality: "Balanced", divergenceMode: "Faithful", authorFlavor: { mode: "Off" } } as any, modelSelection: { profileId: null, modelId: null }, provenance: [] },
  });
  const html = renderToString(<VaultModal
    isOpen onClose={() => undefined} savedProjects={[project]}
    onLoadProject={() => undefined} onDeleteProject={() => undefined}
    onDuplicateProject={() => undefined} onRenameProject={() => undefined}
  />);
  expect(html).toContain('aria-label="Stage 5, unlocked through 5"');
});

import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { buildPromptComparison, buildPromptOverrides, createPromptTestId, PromptStudioView } from "../../src/components/PromptStudio";

const feature = {
  id: "forge.core", label: "Core premise", purpose: "Creative direction for the core specialist.", defaultVersion: 1,
  defaultText: "Build a playable premise.", protectedRequirements: ["The output schema always applies."], allowedVariables: ["{{user}}", "{{char}}"],
};

test("disposable prompt test IDs are valid without secure-context browser APIs", () => {
  expect(createPromptTestId(1_727_200_000_000, 0.123456)).toMatch(/^prompt-test-[A-Za-z0-9_-]{8,80}$/);
});

test("Prompt Studio keeps editable creative text separate from protected requirements", () => {
  const html = renderToString(<PromptStudioView features={[feature]} profiles={[]} selectedProfileId={null} selectedFeatureId="forge.core" draftName="New profile" draftText={feature.defaultText} busy={false} error={null} status={null} onSelectProfile={() => undefined} onSelectFeature={() => undefined} onNameChange={() => undefined} onTextChange={() => undefined} onNew={() => undefined} onSave={() => undefined} onReset={() => undefined} />);
  expect(html).toContain("Creative Prompts");
  expect(html).toContain("Application profile");
  expect(html).toContain("Protected requirements");
  expect(html).toContain("The output schema always applies.");
  expect(html).toContain("Forge freezes its effective instructions");
  expect(html).toContain("data-prompt-studio-scroll-root=\"true\"");
  expect(html).not.toContain("textarea readonly");
});

test("profile saves increment only prompt overrides whose text changed", () => {
  const profile = { schemaVersion: 1 as const, id: "profile-a", name: "A", revision: 4, overrides: [{ featureId: "forge.core", baseVersion: 1, text: "Existing edit", revision: 3 }] };
  expect(buildPromptOverrides([feature], { "forge.core": "Existing edit" }, profile)).toEqual(profile.overrides);
  expect(buildPromptOverrides([feature], { "forge.core": "Changed edit" }, profile)).toEqual([{ featureId: "forge.core", baseVersion: 1, text: "Changed edit", revision: 4 }]);
  expect(buildPromptOverrides([feature], { "forge.core": feature.defaultText }, profile)).toEqual([]);
});

test("Prompt Studio exposes a project-only override without confusing it with the application profile", () => {
  const html = renderToString(<PromptStudioView features={[feature]} profiles={[]} selectedProfileId={null} selectedFeatureId="forge.core" draftName="New profile" draftText={feature.defaultText} busy={false} error={null} status={null} projectOverrideText="Project direction" onProjectOverrideChange={() => undefined} onSelectProfile={() => undefined} onSelectFeature={() => undefined} onNameChange={() => undefined} onTextChange={() => undefined} onNew={() => undefined} onSave={() => undefined} onReset={() => undefined} />);
  expect(html).toContain("This project override");
  expect(html).toContain("Project direction");
  expect(html).toContain("Clear project override");
});

test("prompt comparison explains default, profile, and project precedence", () => {
  expect(buildPromptComparison(feature, "Profile direction", "Project direction")).toEqual({
    defaultText: "Build a playable premise.",
    profileText: "Profile direction",
    projectText: "Project direction",
    effectiveText: "Project direction",
    effectiveSource: "Project override",
  });
  expect(buildPromptComparison(feature, "Profile direction", "").effectiveSource).toBe("Application profile");
  expect(buildPromptComparison(feature, feature.defaultText, "").effectiveSource).toBe("Shipped default");
});

test("Prompt Studio exposes portable profile actions and effective prompt comparison", () => {
  const html = renderToString(<PromptStudioView features={[feature]} profiles={[]} selectedProfileId={null} selectedFeatureId="forge.core" draftName="New profile" draftText="Profile direction" busy={false} error={null} status={null} projectOverrideText="Project direction" onProjectOverrideChange={() => undefined} onImport={() => undefined} onExport={() => undefined} onSelectProfile={() => undefined} onSelectFeature={() => undefined} onNameChange={() => undefined} onTextChange={() => undefined} onNew={() => undefined} onSave={() => undefined} onReset={() => undefined} />);
  expect(html).toContain("Import profile JSON");
  expect(html).toContain("Export profile JSON");
  expect(html).toContain("Compare prompt layers");
  expect(html).toContain("Effective source");
  expect(html).toContain("Project override");
});

test("Prompt Studio explains and exposes the opt-in compiled request preview", () => {
  const html = renderToString(<PromptStudioView features={[feature]} profiles={[]} selectedProfileId={null} selectedFeatureId="forge.core" draftName="New profile" draftText={feature.defaultText} busy={false} error={null} status={null} previewAvailable previewBusy={false} preview={null} onPreview={() => undefined} onSelectProfile={() => undefined} onSelectFeature={() => undefined} onNameChange={() => undefined} onTextChange={() => undefined} onNew={() => undefined} onSave={() => undefined} onReset={() => undefined} />);
  expect(html).toContain("Preview compiled request");
  expect(html).toContain("private project context");
  expect(html).toContain("does not call the model");
});

test("Prompt Studio renders compiled request provenance and disclosure", () => {
  const html = renderToString(<PromptStudioView features={[feature]} profiles={[]} selectedProfileId={null} selectedFeatureId="forge.core" draftName="New profile" draftText={feature.defaultText} busy={false} error={null} status={null} previewAvailable previewBusy={false} onPreview={() => undefined} preview={{ featureId: "forge.core", jobId: "job-core", schemaId: "forge.bundle.core", snapshotHash: "snapshot-1", promptHash: "prompt-1", systemInstruction: "SYSTEM REQUEST", userPrompt: "PRIVATE CONTEXT", disclosure: { includesPrivateProjectContext: true, generationPerformed: false, manuscriptMutated: false } }} onSelectProfile={() => undefined} onSelectFeature={() => undefined} onNameChange={() => undefined} onTextChange={() => undefined} onNew={() => undefined} onSave={() => undefined} onReset={() => undefined} />);
  expect(html).toContain("job-core");
  expect(html).toContain("forge.bundle.core");
  expect(html).toContain("SYSTEM REQUEST");
  expect(html).toContain("PRIVATE CONTEXT");
  expect(html).toContain("No model call was made");
});

test("Prompt Studio exposes an explicit paid disposable test with cancellation", () => {
  const html = renderToString(<PromptStudioView features={[feature]} profiles={[]} selectedProfileId={null} selectedFeatureId="forge.core" draftName="New profile" draftText={feature.defaultText} busy={false} error={null} status={null} previewAvailable testAvailable testBusy={false} testResult={null} onTest={() => undefined} onCancelTest={() => undefined} onSelectProfile={() => undefined} onSelectFeature={() => undefined} onNameChange={() => undefined} onTextChange={() => undefined} onNew={() => undefined} onSave={() => undefined} onReset={() => undefined} />);
  expect(html).toContain("Run disposable model test");
  expect(html).toContain("provider tokens");
  expect(html).toContain("candidate is not saved");
});

test("Prompt Studio shows a disposable candidate without an apply action", () => {
  const html = renderToString(<PromptStudioView features={[feature]} profiles={[]} selectedProfileId={null} selectedFeatureId="forge.core" draftName="New profile" draftText={feature.defaultText} busy={false} error={null} status={null} previewAvailable testAvailable testBusy={false} onTest={() => undefined} onCancelTest={() => undefined} testResult={{ candidate: { core: { title: "Candidate world" } }, compilation: { featureId: "forge.core", jobId: "job-1", schemaId: "schema-1", snapshotHash: "snapshot-1", promptHash: "prompt-1" }, provenance: { provider: "gemini", modelRequested: "model-1", modelReported: "model-1", usage: { inputTokens: 20, outputTokens: 10 } }, disclosure: { disposable: true, manuscriptMutated: false, checkpointMutated: false } }} onSelectProfile={() => undefined} onSelectFeature={() => undefined} onNameChange={() => undefined} onTextChange={() => undefined} onNew={() => undefined} onSave={() => undefined} onReset={() => undefined} />);
  expect(html).toContain("Candidate world");
  expect(html).toContain("Disposable candidate");
  expect(html).not.toContain("Apply candidate");
});

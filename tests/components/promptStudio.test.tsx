import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { buildPromptOverrides, PromptStudioView } from "../../src/components/PromptStudio";

const feature = {
  id: "forge.core", label: "Core premise", purpose: "Creative direction for the core specialist.", defaultVersion: 1,
  defaultText: "Build a playable premise.", protectedRequirements: ["The output schema always applies."], allowedVariables: ["{{user}}", "{{char}}"],
};

test("Prompt Studio keeps editable creative text separate from protected requirements", () => {
  const html = renderToString(<PromptStudioView features={[feature]} profiles={[]} selectedProfileId={null} selectedFeatureId="forge.core" draftName="New profile" draftText={feature.defaultText} busy={false} error={null} status={null} onSelectProfile={() => undefined} onSelectFeature={() => undefined} onNameChange={() => undefined} onTextChange={() => undefined} onNew={() => undefined} onSave={() => undefined} onReset={() => undefined} />);
  expect(html).toContain("Creative Prompts");
  expect(html).toContain("Application profile");
  expect(html).toContain("Protected requirements");
  expect(html).toContain("The output schema always applies.");
  expect(html).toContain("Saved profiles do not affect generation yet");
  expect(html).toContain("data-prompt-studio-scroll-root=\"true\"");
  expect(html).not.toContain("textarea readonly");
});

test("profile saves increment only prompt overrides whose text changed", () => {
  const profile = { schemaVersion: 1 as const, id: "profile-a", name: "A", revision: 4, overrides: [{ featureId: "forge.core", baseVersion: 1, text: "Existing edit", revision: 3 }] };
  expect(buildPromptOverrides([feature], { "forge.core": "Existing edit" }, profile)).toEqual(profile.overrides);
  expect(buildPromptOverrides([feature], { "forge.core": "Changed edit" }, profile)).toEqual([{ featureId: "forge.core", baseVersion: 1, text: "Changed edit", revision: 4 }]);
  expect(buildPromptOverrides([feature], { "forge.core": feature.defaultText }, profile)).toEqual([]);
});

import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { addCustomModelId, connectionTestSuccessMessage, removeCustomModelId, SettingsModal } from "../../src/components/SettingsModal";

test("connections dialog renders with no saved model selection", () => {
  const html = renderToString(
    React.createElement(SettingsModal, {
      isOpen: true,
      onClose: () => undefined,
      selection: null,
      onSelectionChange: () => undefined,
    }),
  );

  expect(html).toContain("Connections &amp; Models");
  expect(html).toContain("No saved providers yet.");
  expect(html).toContain("data-connections-scroll-root=\"true\"");
  expect(html).toContain("Advanced model settings");
  expect(html).toContain("value=\"gemini\">Gemini AI Studio");
  expect(html).toContain("Sort models");
  expect(html).toContain("Alphabetical");
  expect(html).toContain("Newest");
  expect(html).toContain("NanoGPT Popular");
  expect(html).toContain("NanoGPT subscription first");
  expect(html).toContain("Favorites stay at the top");
  expect(html).toContain("Copy diagnostics");
  expect(html).not.toContain("value=\"gemini\" disabled=\"\"");
  expect(html).toContain("Search models");
  expect(html).toContain("data-connections-model-picker=\"true\"");
  expect(html).toContain("data-connections-actions=\"true\"");
  const selectedHtml = renderToString(
    React.createElement(SettingsModal, {
      isOpen: true,
      onClose: () => undefined,
      selection: { profileId: "saved-profile", modelId: "gemini-3.8-flash" },
      onSelectionChange: () => undefined,
    }),
  );
  expect(selectedHtml).toContain("Selected model");
});

test("custom model additions return validation errors instead of throwing through React updates", () => {
  expect(addCustomModelId([], "  vendor/private-preview:thinking  ")).toEqual({
    modelIds: ["vendor/private-preview:thinking"],
    error: null,
  });
  expect(addCustomModelId(["vendor/model"], "vendor/model")).toEqual({
    modelIds: ["vendor/model"],
    error: "That custom model ID is already saved.",
  });
  expect(addCustomModelId([], "")).toEqual({
    modelIds: [],
    error: "Enter a custom model ID first.",
  });
});

test("custom model removals return validation errors instead of throwing through React updates", () => {
  expect(removeCustomModelId(["vendor/model"], "vendor/model", "vendor/model")).toEqual({
    modelIds: ["vendor/model"],
    error: "Choose another model before removing the selected custom model.",
  });
  expect(removeCustomModelId(["vendor/model", "vendor/other"], "vendor/model", "vendor/other")).toEqual({
    modelIds: ["vendor/other"],
    error: null,
  });
});

test("connection test success explains that generation was not tested", () => {
  expect(connectionTestSuccessMessage(12)).toBe("Key accepted · 12 provider models reported. This checks authentication and model listing, not generation speed or structured output.");
});

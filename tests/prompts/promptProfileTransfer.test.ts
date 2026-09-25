import { expect, test } from "bun:test";
import { parsePromptProfileImportV1, serializePromptProfileExportV1 } from "../../src/lib/prompts/profileTransfer";

const profile = {
  schemaVersion: 1 as const,
  id: "private-internal-id",
  name: "Cinematic Forge",
  revision: 7,
  overrides: [{ featureId: "forge.core", baseVersion: 1, text: "Keep {{user}} free to choose.", revision: 3 }],
};

test("prompt profile export contains only portable prompt data and preserves literal macros", () => {
  const exported = serializePromptProfileExportV1(profile);
  expect(JSON.parse(exported)).toEqual({
    kind: "lorebible.prompt-profile",
    schemaVersion: 1,
    name: "Cinematic Forge",
    overrides: profile.overrides,
  });
  expect(exported).not.toContain("private-internal-id");
  expect(exported).not.toContain('"revision": 7');
  expect(exported).toContain("{{user}}");
});

test("prompt profile export refuses a draft that could not be imported again", () => {
  expect(() => serializePromptProfileExportV1({ name: " ", overrides: [] })).toThrow("name is required");
});

test("prompt profile import validates the envelope and returns a new-profile draft", () => {
  const draft = parsePromptProfileImportV1(serializePromptProfileExportV1(profile));
  expect(draft).toEqual({ name: "Cinematic Forge", overrides: profile.overrides });
});

test("prompt profile import rejects malformed, unsupported, and unexpected data", () => {
  expect(() => parsePromptProfileImportV1("not json")).toThrow("valid JSON");
  expect(() => parsePromptProfileImportV1(JSON.stringify({ kind: "lorebible.prompt-profile", schemaVersion: 2, name: "A", overrides: [] }))).toThrow("schemaVersion");
  expect(() => parsePromptProfileImportV1(JSON.stringify({ kind: "wrong", schemaVersion: 1, name: "A", overrides: [] }))).toThrow("kind");
  expect(() => parsePromptProfileImportV1(JSON.stringify({ kind: "lorebible.prompt-profile", schemaVersion: 1, name: "A", overrides: [], credentials: "secret" }))).toThrow("Unknown prompt profile import field");
});

test("prompt profile import enforces total and per-feature size limits", () => {
  expect(() => parsePromptProfileImportV1("x".repeat(256_001))).toThrow("256,000");
  expect(() => parsePromptProfileImportV1(JSON.stringify({ kind: "lorebible.prompt-profile", schemaVersion: 1, name: "A", overrides: [{ ...profile.overrides[0], text: "x".repeat(24_001) }] }))).toThrow("24,000");
});

import { expect, test } from "bun:test";
import { parsePromptProfileV1, type PromptProfileV1 } from "../../src/contracts/prompts";

const valid = {
  schemaVersion: 1,
  id: "profile-a",
  name: "My Forge voice",
  revision: 1,
  overrides: [{ featureId: "forge.core", baseVersion: 1, text: "Keep {{user}} free to choose.", revision: 1 }],
} satisfies PromptProfileV1;

test("prompt profiles preserve literal macros and valid registered overrides", () => {
  expect(parsePromptProfileV1(valid)).toEqual(valid);
});

test("prompt profiles reject unknown features and duplicate overrides", () => {
  expect(() => parsePromptProfileV1({ ...valid, overrides: [{ ...valid.overrides[0], featureId: "forge.unknown" }] })).toThrow("Unknown prompt feature");
  expect(() => parsePromptProfileV1({ ...valid, overrides: [valid.overrides[0], { ...valid.overrides[0] }] })).toThrow("only once");
});

test("prompt profiles reject unsupported versions, extra fields, and oversized text", () => {
  expect(() => parsePromptProfileV1({ ...valid, schemaVersion: 2 })).toThrow("schemaVersion");
  expect(() => parsePromptProfileV1({ ...valid, secret: "should not be accepted" })).toThrow("Unknown prompt profile field");
  expect(() => parsePromptProfileV1({ ...valid, overrides: [{ ...valid.overrides[0], text: "x".repeat(24_001) }] })).toThrow("24,000");
});

test("prompt profiles reject prototype-bearing imported objects", () => {
  const inherited = Object.create({ injected: true });
  Object.assign(inherited, valid);
  expect(() => parsePromptProfileV1(inherited)).toThrow("plain object");
});

import { expect, test } from "bun:test";
import { parseModelSelection } from "../../src/contracts/generation";

test("accepts an empty model selection during initial setup", () => {
  expect(parseModelSelection({ profileId: null, modelId: null })).toEqual({ profileId: null, modelId: null });
});
test("trims valid model-selection IDs", () => {
  expect(parseModelSelection({ profileId: " p1 ", modelId: " model-a " })).toEqual({ profileId: "p1", modelId: "model-a" });
});
test("rejects malformed model-selection fields", () => {
  expect(() => parseModelSelection({ profileId: 42, modelId: null })).toThrow("profileId");
  expect(() => parseModelSelection({ profileId: null, modelId: [] })).toThrow("modelId");
});

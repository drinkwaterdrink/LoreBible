import { expect, test } from "bun:test";
import { resolvePromptSnapshot } from "../../src/lib/prompts/resolve";

test("a saved profile overrides only its selected Forge feature", () => {
  const snapshot = resolvePromptSnapshot({
    profile: { schemaVersion: 1, id: "profile/deep", name: "Deep", revision: 3, overrides: [
      { featureId: "forge.history", baseVersion: 1, text: "Write causal history with named consequences.", revision: 2 },
    ] },
  });
  expect(snapshot.profileId).toBe("profile/deep");
  expect(snapshot.profileRevision).toBe(3);
  expect(snapshot.resolvedCreativeText["forge.history"]).toBe("Write causal history with named consequences.");
  expect(snapshot.resolvedCreativeText["forge.core"]).toBeTruthy();
  expect(snapshot.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
});

test("snapshot hashes change when effective creative instructions change", () => {
  const one = resolvePromptSnapshot({ profile: { schemaVersion: 1, id: "profile/a", name: "A", revision: 1, overrides: [{ featureId: "forge.core", baseVersion: 1, text: "First", revision: 1 }] } });
  const two = resolvePromptSnapshot({ profile: { schemaVersion: 1, id: "profile/a", name: "A", revision: 2, overrides: [{ featureId: "forge.core", baseVersion: 1, text: "Second", revision: 2 }] } });
  expect(two.hash).not.toBe(one.hash);
});

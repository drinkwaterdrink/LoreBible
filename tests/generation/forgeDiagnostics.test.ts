import { expect, test } from "bun:test";
import { formatForgeBundleFailure, safeForgeFailureReason } from "../../server/generation/forgeDiagnostics";

test("truncation identifies LoreBible's connected-model request allowance", () => {
  expect(safeForgeFailureReason("INVALID_STRUCTURED_OUTPUT", true)).toContain("16,000 output tokens");
});

test("Forge failure diagnostics identify the bundle and selected model without credentials", () => {
  expect(formatForgeBundleFailure(2, "Bundle 3: NPCs, Relationship Web, and Knowledge Map", "gemini-3.8-flash", safeForgeFailureReason("PROVIDER_UNAVAILABLE")))
    .toBe("Forge bundle 3 (Bundle 3: NPCs, Relationship Web, and Knowledge Map) using gemini-3.8-flash failed: The provider could not complete the request; saved bundles are unchanged.");
  const sentinel="private-user-prose sk-secret";
  expect(safeForgeFailureReason("PROVIDER_UNAVAILABLE")).not.toContain(sentinel);
});

import { expect, test } from "bun:test";
import { formatForgeBundleFailure } from "../../server/generation/forgeDiagnostics";

test("Forge failure diagnostics identify the bundle and selected model without credentials", () => {
  expect(formatForgeBundleFailure(2, "Bundle 3: NPCs, Relationship Web, and Knowledge Map", "gemini-3.8-flash", "Provider rejected the request (HTTP 400). Invalid argument"))
    .toBe("Forge bundle 3 (Bundle 3: NPCs, Relationship Web, and Knowledge Map) using gemini-3.8-flash failed: Provider rejected the request (HTTP 400). Invalid argument");
});

import { expect, test } from "bun:test";
import { migrateLegacySparkDNA, parseCanonicalSparkDNA } from "../../src/contracts/spark";

const canonical = {
  nonNegotiables: ["two friends"],
  premisePromise: "A quiet repair attempt",
  toneEnvelope: { primary: "tender", descriptors: ["grounded"] },
  genreSignals: ["domestic drama"],
  playerAgencyBoundaries: "{{user}} chooses what to reveal.",
  openVariables: ["what was misunderstood"],
  existingPressures: [], assumptions: [], opportunitySpace: [], userRole: null, franchise: null,
};

test("accepts canonical SparkDNA and defaults missing arrays to empty", () => {
  const result = parseCanonicalSparkDNA({ ...canonical, assumptions: undefined, opportunitySpace: undefined });
  expect(result.premisePromise).toBe("A quiet repair attempt");
  expect(result.assumptions).toEqual([]);
  expect(result.opportunitySpace).toEqual([]);
});
test("rejects the legacy SparkDNA shape explicitly", () => {
  expect(() => parseCanonicalSparkDNA({ corePremise: "old", genreArchetype: "drama", tonalRegisters: ["quiet"] })).toThrow("Legacy SparkDNA");
});
test("migrates legacy fields deterministically without adding lore", () => {
  const result = migrateLegacySparkDNA({ corePremise: "A quiet repair attempt", genreArchetype: "domestic drama", tonalRegisters: ["tender", "grounded"], implicitAssumptions: ["the friends remember the event differently"], wildcards: ["an old letter"], openNegotiables: ["what was misunderstood"], nonNegotiables: ["two friends"], userRole: null, franchise: null });
  expect(result.premisePromise).toBe("A quiet repair attempt");
  expect(result.genreSignals).toEqual(["domestic drama"]);
  expect(result.openVariables).toEqual(["what was misunderstood"]);
  expect(result.opportunitySpace).toEqual(["an old letter"]);
  expect(result.existingPressures).toEqual([]);
});
test("reports malformed nested values by field path", () => {
  expect(() => parseCanonicalSparkDNA({ ...canonical, toneEnvelope: { primary: 3, descriptors: [] } })).toThrow("toneEnvelope.primary");
  expect(() => parseCanonicalSparkDNA({ ...canonical, genreSignals: ["ok", 3] })).toThrow("genreSignals");
});

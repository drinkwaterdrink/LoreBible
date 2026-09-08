import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..");

test("normal server routes do not invoke deterministic creative generators", async () => {
  const source = await readFile(join(root, "server.ts"), "utf8");
  expect(source.match(/generateDeterministicSparkParse\(/g)?.length || 0).toBe(1);
  expect(source.match(/generateDeterministicDivergenceTakes\(/g)?.length || 0).toBe(1);
  expect(source).not.toContain("generateDeterministicBundle(");
  expect(source).not.toContain("generateSuggestedRollGroups(");
  expect(source).not.toContain("allowOfflineFallback");
  expect(source).not.toContain("looks up from their work, pausing a moment");
  expect(source).not.toContain("Physical limitation of the threshold");
  expect(source).not.toContain("The Silent Accord of Year 12");
  expect(source).not.toContain('criticResult?.selectedIndices || [0, 1, 2, 3]');
});

test("legacy environment Gemini never advertises or uses an automatic model pool", async () => {
  const source = await readFile(join(root, "server.ts"), "utf8");
  expect(source).not.toContain("CANDIDATE_MODELS");
  expect(source).not.toContain("Automatic failover active");
  expect(source).not.toContain("Switching to alternative model");
  expect(source).not.toContain('modelRequested: "gemini-auto"');
});

test("creative route failures use the shared truthful response boundary", async () => {
  const source = await readFile(join(root, "server.ts"), "utf8");
  expect(source).toContain("sendGenerationFailure(res");
  expect(source).toContain("normalizeGenerationFailure(");
});

test("deterministic audit responses identify themselves as local heuristics", async () => {
  const source = await readFile(join(root, "server.ts"), "utf8");
  expect(source.match(/analysisSource: "local_heuristic"/g)?.length || 0).toBeGreaterThanOrEqual(3);
});

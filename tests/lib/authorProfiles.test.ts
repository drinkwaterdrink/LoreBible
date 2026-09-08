import { expect, test } from "bun:test";
import { selectAutoAuthorsForBranches } from "../../src/lib/authorProfiles";

test("auto author assignment avoids duplicates across a divergence board", () => {
  const authors = selectAutoAuthorsForBranches(
    [{ primaryEngine: "comedy" }, { primaryEngine: "horror" }, { primaryEngine: "mythic" }, { primaryEngine: "procedural" }],
    { primary: "dark comedy", descriptors: ["mystery"] },
    "Compatible",
    () => 0,
  );
  expect(authors).toHaveLength(4);
  expect(new Set(authors).size).toBe(4);
});

test("auto author assignment remains deterministic with injected randomness", () => {
  const branches = [{ primaryEngine: "comedy" }, { primaryEngine: "comedy" }];
  expect(selectAutoAuthorsForBranches(branches, { primary: "comedy" }, "Wildcard", () => 0))
    .toEqual(selectAutoAuthorsForBranches(branches, { primary: "comedy" }, "Wildcard", () => 0));
});

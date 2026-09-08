import { expect, test } from "bun:test";

import { CURATED_MODELS } from "../src/lib/modelCatalog";

test("exports at least one curated model", () => {
  expect(CURATED_MODELS.length).toBeGreaterThan(0);
});

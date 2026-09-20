import { expect, test } from "bun:test";
import { FORGE_BUNDLE_DEFINITIONS } from "../../server/generation/forgeSchemas";
import { FORGE_BUNDLE_KEYS } from "../../server/generation/forgeResume";
import { validateSchemaValue } from "../../server/generation/schemaContract";

test("extracted Forge definitions preserve six checkpoint bundle keys", () => {
  expect(FORGE_BUNDLE_DEFINITIONS.map((bundle) => bundle.keys)).toEqual([...FORGE_BUNDLE_KEYS]);
});

test("Bundle 5 rejects an array for its aesthetic object", () => {
  const schema = FORGE_BUNDLE_DEFINITIONS[4].schema.properties!.aesthetic;
  expect(validateSchemaValue([], schema)).toEqual([
    { path: "", code: "type", expected: "object", actual: "array" },
  ]);
});

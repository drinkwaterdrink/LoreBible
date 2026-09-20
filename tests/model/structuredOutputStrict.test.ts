import { expect, test } from "bun:test";
import { parseStructuredOutput } from "../../server/model/structuredOutput";

test("strict Forge parser accepts one nested document with a short preamble", () => {
  expect(parseStructuredOutput('Response:\n{"a":{"b":1}}', { policy: "single_document" }).parsed).toEqual({ a: { b: 1 } });
});

test("strict Forge parser rejects two complete JSON documents", () => {
  expect(() => parseStructuredOutput('Example: []\nAnswer: {"history":[]}', { policy: "single_document" })).toThrow();
});

test("strict Forge parser rejects a truncated document instead of recovering a nested fragment", () => {
  expect(() => parseStructuredOutput('{"a":{"b":1}', { policy: "single_document" })).toThrow();
});

test("legacy parser retains its existing first document recovery", () => {
  expect(parseStructuredOutput('Example: []\nAnswer: {"history":[]}').parsed).toEqual([]);
});

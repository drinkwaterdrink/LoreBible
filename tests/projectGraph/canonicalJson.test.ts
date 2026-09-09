import { expect, test } from "bun:test";
import { canonicalizeJson, sha256Hex } from "../../src/lib/projectGraph/canonicalJson";

test("canonicalizes object keys recursively while retaining array order", () => {
  const source = { z: [{ b: 2, a: 1 }, null], a: "line\nquote\"" };
  expect(canonicalizeJson(source)).toBe('{"a":"line\\nquote\\\"","z":[{"a":1,"b":2},null]}');
  expect(Object.keys(source)).toEqual(["z", "a"]);
});

test("rejects values that cannot be preserved as JSON", () => {
  const cyclic: any = { a: 1 };
  cyclic.self = cyclic;
  expect(() => canonicalizeJson(cyclic)).toThrow("JSON-serializable");
  expect(() => canonicalizeJson({ missing: undefined })).toThrow("JSON-serializable");
});

test("produces a known SHA-256 digest", () => {
  expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

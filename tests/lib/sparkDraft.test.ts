import { expect, test } from "bun:test";
import { readSparkDraft, SPARK_DRAFT_STORAGE_KEY, writeSparkDraft } from "../../src/lib/sparkDraft";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
    removeItem(key: string) { values.delete(key); },
  };
}

test("Spark draft round-trips only versioned text and timestamp metadata", () => {
  const storage = memoryStorage();
  writeSparkDraft(storage, "A carefully typed mobile premise");
  expect(readSparkDraft(storage)).toBe("A carefully typed mobile premise");
  const stored = JSON.parse(storage.getItem(SPARK_DRAFT_STORAGE_KEY) || "{}");
  expect(Object.keys(stored).sort()).toEqual(["sparkText", "updatedAt", "version"]);
  expect(stored).toMatchObject({ version: 1, sparkText: "A carefully typed mobile premise" });
  expect(typeof stored.updatedAt).toBe("number");
});

test("empty Spark removes the draft and invalid records restore nothing", () => {
  const storage = memoryStorage();
  writeSparkDraft(storage, "temporary");
  writeSparkDraft(storage, "");
  expect(storage.getItem(SPARK_DRAFT_STORAGE_KEY)).toBe(null);

  storage.setItem(SPARK_DRAFT_STORAGE_KEY, "not json");
  expect(readSparkDraft(storage)).toBe("");
  storage.setItem(SPARK_DRAFT_STORAGE_KEY, JSON.stringify({ version: 2, sparkText: "wrong version", updatedAt: 1 }));
  expect(readSparkDraft(storage)).toBe("");
  storage.setItem(SPARK_DRAFT_STORAGE_KEY, JSON.stringify({ version: 1, sparkText: "x".repeat(100001), updatedAt: 1 }));
  expect(readSparkDraft(storage)).toBe("");
});

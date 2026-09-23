import { expect, test } from "bun:test";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createPromptProfileStore, PromptProfileStoreError } from "../../server/prompts/promptProfileStore";

const override = { featureId: "forge.core", baseVersion: 1, text: "Favor concrete playable pressure.", revision: 1 } as const;

async function pathForTest() {
  const directory = join(tmpdir(), `lore-bible-prompt-store-${crypto.randomUUID()}`);
  await mkdir(directory, { recursive: true });
  return join(directory, "profiles.json");
}

test("prompt profiles persist across store instances and update with optimistic revisions", async () => {
  const path = await pathForTest();
  const first = createPromptProfileStore(path);
  const created = await first.create({ name: "Production voice", overrides: [override] });
  expect(created.revision).toBe(1);
  expect((await createPromptProfileStore(path).list())[0].overrides[0].text).toBe("Favor concrete playable pressure.");

  const updated = await first.update(created.id, { name: "Production voice revised", overrides: [override] }, 1);
  expect(updated.revision).toBe(2);
  await expect(first.update(created.id, { name: "Stale", overrides: [] }, 1)).rejects.toMatchObject({ code: "conflict" });
});

test("prompt profile writes create a recoverable backup and deletion is durable", async () => {
  const path = await pathForTest();
  const store = createPromptProfileStore(path);
  const created = await store.create({ name: "One", overrides: [] });
  await store.update(created.id, { name: "Two", overrides: [] }, 1);
  expect(JSON.parse(await readFile(`${path}.bak`, "utf8")).profiles[0].name).toBe("One");
  await store.delete(created.id, 2);
  expect(await createPromptProfileStore(path).list()).toEqual([]);
});

test("prompt profile store reports corrupt JSON rather than replacing it", async () => {
  const path = await pathForTest();
  await Bun.write(path, "{broken");
  await expect(createPromptProfileStore(path).list()).rejects.toBeInstanceOf(PromptProfileStoreError);
});

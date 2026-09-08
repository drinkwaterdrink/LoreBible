import { expect, test } from "bun:test";
import { createProfileStore, type SecretProtector } from "../../server/secrets/profileStore";

const protector: SecretProtector = {
  async protect(value) { return `cipher:${Buffer.from(value).toString("base64")}`; },
  async unprotect(value) { return Buffer.from(value.slice("cipher:".length), "base64").toString("utf8"); },
};

test("profile metadata never serializes plaintext or ciphertext", async () => {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-profile-test-${crypto.randomUUID()}.json`;
  const store = createProfileStore(path, protector);
  const profile = await store.upsert({ name: "OpenRouter", provider: "openrouter", apiKey: "sk-secret" });
  expect(JSON.stringify(profile)).not.toContain("sk-secret");
  expect(JSON.stringify(profile)).not.toContain("cipher:");
  expect(await store.getSecret(profile.id)).toBe("sk-secret");
});

test("blank-key update retains the existing secret", async () => {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-profile-test-${crypto.randomUUID()}.json`;
  const store = createProfileStore(path, protector);
  const created = await store.upsert({ name: "NanoGPT", provider: "nanogpt", apiKey: "sk-original" });
  await store.upsert({ id: created.id, name: "Renamed", provider: "nanogpt", apiKey: "" });
  expect(await store.getSecret(created.id)).toBe("sk-original");
});

test("corrupt profile data fails without replacing the file", async () => {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-profile-test-${crypto.randomUUID()}.json`;
  await Bun.write(path, "not-json");
  const store = createProfileStore(path, protector);
  await expect(store.list()).rejects.toThrow("corrupt");
  expect(await Bun.file(path).text()).toBe("not-json");
});

test("profile store persists normalized custom model IDs across ordinary updates", async () => {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-profile-test-${crypto.randomUUID()}.json`;
  const store = createProfileStore(path, protector);
  const created = await store.upsert({
    name: "NanoGPT",
    provider: "nanogpt",
    customModelIds: ["  vendor/model:thinking  ", "vendor/other"],
  });
  expect(created.customModelIds).toEqual(["vendor/model:thinking", "vendor/other"]);

  const renamed = await store.upsert({ id: created.id, name: "Nano", provider: "nanogpt" });
  expect(renamed.customModelIds).toEqual(created.customModelIds);

  const replaced = await store.upsert({ id: created.id, name: "Nano", provider: "nanogpt", customModelIds: ["vendor/replacement"] });
  expect(replaced.customModelIds).toEqual(["vendor/replacement"]);
});

test("profile store loads legacy records without custom model IDs", async () => {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-profile-test-${crypto.randomUUID()}.json`;
  await Bun.write(path, JSON.stringify({
    schemaVersion: 1,
    profiles: [{
      id: "legacy-profile",
      name: "Legacy",
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      keyHint: null,
      hasSecret: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastTestedAt: null,
      lastTestStatus: "untested",
    }],
  }));
  const store = createProfileStore(path, protector);
  expect((await store.list())[0]?.customModelIds).toEqual([]);
});

test("profile store rejects duplicate custom model IDs", async () => {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-profile-test-${crypto.randomUUID()}.json`;
  const store = createProfileStore(path, protector);
  await expect(store.upsert({
    name: "Bad",
    provider: "openrouter",
    customModelIds: ["vendor/model", "vendor/model"],
  })).rejects.toMatchObject({ code: "invalid" });
});

test("profile store rejects unsafe custom model IDs", async () => {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-profile-test-${crypto.randomUUID()}.json`;
  const store = createProfileStore(path, protector);
  await expect(store.upsert({
    name: "Bad",
    provider: "openrouter",
    customModelIds: ["vendor/model\nmalformed"],
  })).rejects.toMatchObject({ code: "invalid" });
  await expect(store.upsert({
    name: "Bad",
    provider: "openrouter",
    customModelIds: [`vendor/${"x".repeat(201)}`],
  })).rejects.toMatchObject({ code: "invalid" });
});

import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import type { ProviderId } from "../../src/contracts/generation.js";
import { DEFAULT_PROVIDER_BASE_URLS, type ProfileInput, type ProfileMetadata, type SecretProtector, type StoredProfileRecord } from "./types.js";

export type { ProfileInput, ProfileMetadata, SecretProtector } from "./types.js";

interface ProfileFileV1 { schemaVersion: 1; profiles: StoredProfileRecord[]; }

const MAX_CUSTOM_MODEL_ID_LENGTH = 200;

export interface ProfileStore {
  list(): Promise<ProfileMetadata[]>;
  getMetadata(id: string): Promise<ProfileMetadata | null>;
  getSecret(id: string): Promise<string | null>;
  upsert(input: ProfileInput): Promise<ProfileMetadata>;
  setTestStatus(id: string, status: StoredProfileRecord["lastTestStatus"]): Promise<ProfileMetadata>;
  delete(id: string): Promise<void>;
}

export class ProfileStoreError extends Error {
  constructor(message: string, public readonly code: "corrupt" | "invalid" | "missing") { super(message); this.name = "ProfileStoreError"; }
}

export function normalizeCustomModelIds(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new ProfileStoreError("customModelIds must be an array.", "invalid");
  const normalized = value.map((entry) => {
    if (typeof entry !== "string") throw new ProfileStoreError("Every custom model ID must be a string.", "invalid");
    const id = entry.trim();
    if (!id) throw new ProfileStoreError("Custom model IDs cannot be empty.", "invalid");
    if (id.length > MAX_CUSTOM_MODEL_ID_LENGTH) throw new ProfileStoreError("Custom model IDs must be 200 characters or fewer.", "invalid");
    if (/\p{Cc}/u.test(id)) throw new ProfileStoreError("Custom model IDs cannot contain control characters.", "invalid");
    return id;
  });
  if (new Set(normalized).size !== normalized.length) throw new ProfileStoreError("Custom model IDs must be unique.", "invalid");
  return normalized;
}

/** Resolve the per-user, non-roaming profile database location. */
export function resolveDefaultProfileStorePath(): string {
  const base = process.platform === "win32"
    ? (process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"))
    : (process.env.XDG_CONFIG_HOME || join(homedir(), ".config"));
  return join(base, "LoreBible", "connections.v1.json");
}

function metadata(record: StoredProfileRecord): ProfileMetadata {
  const { secretCiphertext: _secretCiphertext, ...safe } = record;
  return safe;
}

function validateRecord(value: unknown): value is StoredProfileRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.name === "string" &&
    (record.provider === "gemini" || record.provider === "openrouter" || record.provider === "nanogpt") &&
    typeof record.baseUrl === "string" && (record.keyHint === null || typeof record.keyHint === "string") &&
    typeof record.hasSecret === "boolean" && typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" && (record.lastTestedAt === null || typeof record.lastTestedAt === "string") &&
    (record.lastTestStatus === "untested" || record.lastTestStatus === "available" || record.lastTestStatus === "unavailable" || record.lastTestStatus === "error") &&
    (record.customModelIds === undefined || Array.isArray(record.customModelIds));
}

export function createProfileStore(filePath: string, protector: SecretProtector) {
  async function readStore(): Promise<ProfileFileV1> {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { profiles?: unknown }).profiles) || (parsed as { schemaVersion?: unknown }).schemaVersion !== 1) throw new Error("invalid profile store shape");
      const profiles = (parsed as { profiles: unknown[] }).profiles;
      if (profiles.some((profile) => !validateRecord(profile))) throw new Error("invalid profile record");
      return {
        schemaVersion: 1,
        profiles: (profiles as StoredProfileRecord[]).map((profile) => ({
          ...profile,
          customModelIds: normalizeCustomModelIds(profile.customModelIds),
        })),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return { schemaVersion: 1, profiles: [] };
      throw new ProfileStoreError(`Profile store is corrupt: ${error instanceof Error ? error.message : "invalid JSON"}`, "corrupt");
    }
  }

  async function writeStore(store: ProfileFileV1): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    const backupPath = `${filePath}.bak`;
    try { await copyFile(filePath, backupPath); } catch (error) { if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error; }
    await writeFile(tempPath, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
    await rename(tempPath, filePath);
  }

  const store: ProfileStore = {
    async list(): Promise<ProfileMetadata[]> { const store = await readStore(); return store.profiles.map(metadata); },
    async getMetadata(id: string): Promise<ProfileMetadata | null> { const store = await readStore(); const record = store.profiles.find((profile) => profile.id === id); return record ? metadata(record) : null; },
    async getSecret(id: string): Promise<string | null> {
      const store = await readStore();
      const record = store.profiles.find((profile) => profile.id === id);
      if (!record) throw new ProfileStoreError(`Profile ${id} was not found.`, "missing");
      return record.secretCiphertext ? protector.unprotect(record.secretCiphertext) : null;
    },
    async upsert(input: ProfileInput): Promise<ProfileMetadata> {
      const store = await readStore();
      const now = new Date().toISOString();
      const existing = input.id ? store.profiles.find((profile) => profile.id === input.id) : undefined;
      if (input.id && !existing) throw new ProfileStoreError(`Profile ${input.id} was not found.`, "missing");
      const name = input.name.trim();
      if (!name) throw new ProfileStoreError("Profile name is required.", "invalid");
      const provider: ProviderId = input.provider;
      const customModelIds = input.customModelIds === undefined
        ? existing?.customModelIds || []
        : normalizeCustomModelIds(input.customModelIds);
      const record: StoredProfileRecord = existing ? { ...existing, name, provider, baseUrl: DEFAULT_PROVIDER_BASE_URLS[provider], updatedAt: now, customModelIds } : { id: randomUUID(), name, provider, baseUrl: DEFAULT_PROVIDER_BASE_URLS[provider], keyHint: null, hasSecret: false, createdAt: now, updatedAt: now, lastTestedAt: null, lastTestStatus: "untested", customModelIds };
      if (input.apiKey !== undefined && input.apiKey.trim()) {
        const key = input.apiKey.trim();
        record.secretCiphertext = await protector.protect(key);
        record.keyHint = key.length >= 4 ? `…${key.slice(-4)}` : "configured";
        record.hasSecret = true;
      }
      if (!record.hasSecret) { delete record.secretCiphertext; record.keyHint = null; }
      const index = store.profiles.findIndex((profile) => profile.id === record.id);
      if (index === -1) store.profiles.push(record); else store.profiles[index] = record;
      await writeStore(store);
      return metadata(record);
    },
    async setTestStatus(id: string, status: StoredProfileRecord["lastTestStatus"]): Promise<ProfileMetadata> {
      const file = await readStore();
      const record = file.profiles.find((profile) => profile.id === id);
      if (!record) throw new ProfileStoreError(`Profile ${id} was not found.`, "missing");
      record.lastTestStatus = status;
      record.lastTestedAt = new Date().toISOString();
      record.updatedAt = record.lastTestedAt;
      await writeStore(file);
      return metadata(record);
    },
    async delete(id: string): Promise<void> {
      const store = await readStore();
      const next = store.profiles.filter((profile) => profile.id !== id);
      if (next.length === store.profiles.length) throw new ProfileStoreError(`Profile ${id} was not found.`, "missing");
      await writeStore({ schemaVersion: 1, profiles: next });
    },
  };
  return store;
}

import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { parsePromptProfileDraftV1, parsePromptProfileV1, type PromptProfileDraftV1, type PromptProfileV1 } from "../../src/contracts/prompts.js";

interface PromptProfileFileV1 { schemaVersion: 1; profiles: PromptProfileV1[]; }
export class PromptProfileStoreError extends Error {
  constructor(message: string, public readonly code: "corrupt" | "invalid" | "missing" | "conflict") { super(message); this.name = "PromptProfileStoreError"; }
}
export interface PromptProfileStore {
  list(): Promise<PromptProfileV1[]>;
  create(input: PromptProfileDraftV1): Promise<PromptProfileV1>;
  update(id: string, input: PromptProfileDraftV1, expectedRevision: number): Promise<PromptProfileV1>;
  delete(id: string, expectedRevision: number): Promise<void>;
}
export function resolveDefaultPromptProfileStorePath(): string {
  const base = process.platform === "win32" ? (process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local")) : (process.env.XDG_CONFIG_HOME || join(homedir(), ".config"));
  return join(base, "LoreBible", "prompt-profiles.v1.json");
}
export function createPromptProfileStore(filePath: string): PromptProfileStore {
  async function read(): Promise<PromptProfileFileV1> {
    try {
      const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || (parsed as { schemaVersion?: unknown }).schemaVersion !== 1 || !Array.isArray((parsed as { profiles?: unknown }).profiles)) throw new Error("invalid prompt profile store shape");
      return { schemaVersion: 1, profiles: (parsed as { profiles: unknown[] }).profiles.map(parsePromptProfileV1) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return { schemaVersion: 1, profiles: [] };
      throw new PromptProfileStoreError(`Prompt profile store is corrupt: ${error instanceof Error ? error.message : "invalid JSON"}`, "corrupt");
    }
  }
  async function write(file: PromptProfileFileV1) {
    await mkdir(dirname(filePath), { recursive: true });
    try { await copyFile(filePath, `${filePath}.bak`); } catch (error) { if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error; }
    await writeFile(`${filePath}.tmp`, JSON.stringify(file, null, 2), { encoding: "utf8", mode: 0o600 });
    await rename(`${filePath}.tmp`, filePath);
  }
  return {
    async list() { return (await read()).profiles.map((profile) => structuredClone(profile)); },
    async create(input) {
      let draft: PromptProfileDraftV1; try { draft = parsePromptProfileDraftV1(input); } catch (error) { throw new PromptProfileStoreError(error instanceof Error ? error.message : "Invalid profile.", "invalid"); }
      const file = await read();
      const profile: PromptProfileV1 = { schemaVersion: 1, id: randomUUID(), name: draft.name, revision: 1, overrides: draft.overrides };
      file.profiles.push(profile); await write(file); return structuredClone(profile);
    },
    async update(id, input, expectedRevision) {
      let draft: PromptProfileDraftV1; try { draft = parsePromptProfileDraftV1(input); } catch (error) { throw new PromptProfileStoreError(error instanceof Error ? error.message : "Invalid profile.", "invalid"); }
      const file = await read(); const index = file.profiles.findIndex((profile) => profile.id === id);
      if (index < 0) throw new PromptProfileStoreError(`Prompt profile ${id} was not found.`, "missing");
      if (file.profiles[index].revision !== expectedRevision) throw new PromptProfileStoreError("Prompt profile changed since it was loaded.", "conflict");
      const profile: PromptProfileV1 = { schemaVersion: 1, id, name: draft.name, revision: expectedRevision + 1, overrides: draft.overrides };
      file.profiles[index] = profile; await write(file); return structuredClone(profile);
    },
    async delete(id, expectedRevision) {
      const file = await read(); const index = file.profiles.findIndex((profile) => profile.id === id);
      if (index < 0) throw new PromptProfileStoreError(`Prompt profile ${id} was not found.`, "missing");
      if (file.profiles[index].revision !== expectedRevision) throw new PromptProfileStoreError("Prompt profile changed since it was loaded.", "conflict");
      file.profiles.splice(index, 1); await write(file);
    },
  };
}

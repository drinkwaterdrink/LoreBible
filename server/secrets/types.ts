import type { ProviderId } from "../../src/contracts/generation.js";

export interface SecretProtector {
  protect(plaintext: string): Promise<string>;
  unprotect(ciphertext: string): Promise<string>;
}

export type ProfileTestStatus = "untested" | "available" | "unavailable" | "error";

export interface StoredProfileRecord {
  id: string;
  name: string;
  provider: ProviderId;
  baseUrl: string;
  keyHint: string | null;
  hasSecret: boolean;
  secretCiphertext?: string;
  createdAt: string;
  updatedAt: string;
  lastTestedAt: string | null;
  lastTestStatus: ProfileTestStatus;
  customModelIds: string[];
}

export interface ProfileMetadata {
  id: string;
  name: string;
  provider: ProviderId;
  baseUrl: string;
  keyHint: string | null;
  hasSecret: boolean;
  createdAt: string;
  updatedAt: string;
  lastTestedAt: string | null;
  lastTestStatus: ProfileTestStatus;
  customModelIds: string[];
}

export interface ProfileInput {
  id?: string;
  name: string;
  provider: ProviderId;
  apiKey?: string;
  customModelIds?: string[];
}

export const DEFAULT_PROVIDER_BASE_URLS: Record<ProviderId, string> = {
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  openrouter: "https://openrouter.ai/api/v1",
  nanogpt: "https://nano-gpt.com/api/v1",
};

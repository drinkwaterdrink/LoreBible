import type { PromptOverrideV1, PromptProfileV1, ResolvedPromptSnapshotV1 } from "../../contracts/prompts";
import { canonicalizeJson, sha256Hex } from "../projectGraph/canonicalJson";
import { PROMPT_REGISTRY, PROMPT_REGISTRY_VERSION } from "./registry";

export function resolvePromptSnapshot(input: { profile: PromptProfileV1 | null; projectOverrides?: readonly PromptOverrideV1[] }): ResolvedPromptSnapshotV1 {
  const resolvedCreativeText: Record<string, string> = Object.fromEntries(PROMPT_REGISTRY.map((feature) => [feature.id, feature.defaultText]));
  for (const override of input.profile?.overrides ?? []) resolvedCreativeText[override.featureId] = override.text;
  for (const override of input.projectOverrides ?? []) resolvedCreativeText[override.featureId] = override.text;
  const identity = {
    schemaVersion: 1 as const,
    registryVersion: PROMPT_REGISTRY_VERSION,
    profileId: input.profile?.id ?? null,
    profileRevision: input.profile?.revision ?? null,
    resolvedCreativeText,
  };
  return { ...identity, hash: `sha256:${sha256Hex(canonicalizeJson(identity))}` };
}

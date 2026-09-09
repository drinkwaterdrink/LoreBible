import type { LoreManifest, PortabilityFinding } from "../../contracts/artifacts";
import type { NativeLumiverseWorldBookV1 } from "../../contracts/lumiverseWorldBook";
import { parseNativeLumiverseWorldBookV1 } from "../../contracts/lumiverseWorldBook";

export interface PortableCharacterBookEntry {
  keys: string[];
  content: string;
  enabled: boolean;
  constant: boolean;
  insertionOrder: number;
  depth: number;
  comment: string;
}

export interface PortableCharacterBookResult {
  name: string;
  description: string;
  entries: PortableCharacterBookEntry[];
  omissions: PortabilityFinding[];
}

const SELECTIVE_LOGIC = { AND: 0, OR: 1, NOT: 2, NOT_ALL: 3 } as const;

export function serializeNativeLumiverseWorldBook(
  manifest: LoreManifest,
  clock: () => number = () => Date.now(),
): NativeLumiverseWorldBookV1 {
  const output: NativeLumiverseWorldBookV1 = {
    version: 1,
    type: "lumiverse_world_book",
    name: manifest.name,
    description: manifest.description,
    metadata: {
      generator: "LoreBible",
      manifest_id: manifest.id,
      evidence_status: "static_validated",
      runtime_verified: false,
    },
    entries: manifest.entries.map((entry) => ({
      uid: entry.nativeUid,
      key: entry.activation.primaryKeys,
      keysecondary: entry.activation.secondaryKeys,
      content: entry.content,
      comment: entry.title,
      position: entry.injection.position,
      depth: entry.injection.depth,
      role: entry.injection.role,
      order_value: entry.injection.order,
      selective: entry.activation.selective,
      constant: entry.activation.state === "constant",
      disabled: entry.activation.state === "disabled",
      group_name: entry.activation.group,
      group_override: entry.activation.groupOverride,
      group_weight: entry.activation.groupWeight,
      probability: entry.activation.probability,
      scan_depth: entry.activation.scanDepth,
      case_sensitive: entry.activation.caseSensitive,
      match_whole_words: entry.activation.wholeWord,
      automation_id: "",
      extensions: {
        lorebible: {
          source_id: entry.sourceId,
          category: entry.category,
          temporal_class: entry.temporalClass,
          visibility: entry.visibility,
          estimated_tokens: entry.estimatedTokens,
          activation_rationale: entry.activationRationale,
        },
      },
      use_regex: entry.activation.useRegex,
      prevent_recursion: entry.activation.preventRecursion,
      exclude_recursion: entry.activation.excludeRecursion,
      delay_until_recursion: entry.activation.delayUntilRecursion,
      priority: entry.injection.priority,
      sticky: entry.activation.sticky,
      cooldown: entry.activation.cooldown,
      delay: entry.activation.delay,
      selective_logic: SELECTIVE_LOGIC[entry.activation.selectiveLogic],
      use_probability: entry.activation.useProbability,
      vectorized: entry.activation.vectorized,
      exclude_greeting: false,
      revision: 1,
      outlet_name: "",
      wi_marker: false,
      wi_marker_side: 0,
    })),
    exported_at: clock(),
  };

  return parseNativeLumiverseWorldBookV1(output);
}

const PORTABLE_FEATURES = [
  "secondary keys and selective logic",
  "priority",
  "entry-level scan depth",
  "probability",
  "sticky/cooldown/delay",
  "groups and weights",
  "recursion controls",
  "vectorization",
] as const;

export function serializePortableCharacterBook(manifest: LoreManifest): PortableCharacterBookResult {
  const omissions: PortabilityFinding[] = PORTABLE_FEATURES.map((feature) => ({
    code: `portable.omits.${feature.replaceAll(/[^a-z]+/g, "_")}`,
    severity: "note",
    feature,
    message: `Portable Character Book output does not fully preserve ${feature}; use the native Lumiverse World Book for full fidelity.`,
  }));

  return {
    name: manifest.name,
    description: manifest.description,
    entries: manifest.entries.map((entry) => ({
      keys: entry.activation.primaryKeys,
      content: entry.content,
      enabled: entry.activation.state !== "disabled",
      constant: entry.activation.state === "constant",
      insertionOrder: entry.injection.order,
      depth: entry.injection.depth,
      comment: entry.title,
    })),
    omissions,
  };
}

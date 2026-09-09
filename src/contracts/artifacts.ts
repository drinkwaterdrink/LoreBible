export type CardArchetype = "narrator_world";

export type ArtifactFindingSeverity = "blocker" | "major" | "minor" | "note";

export interface ArtifactFinding {
  code: string;
  severity: ArtifactFindingSeverity;
  message: string;
  artifactId?: string;
  sourceId?: string;
}

export type ArtifactFieldName =
  | "name"
  | "description"
  | "personality"
  | "scenario"
  | "firstMessage"
  | "exampleMessages"
  | "systemPrompt"
  | "postHistoryInstructions"
  | "creatorNotes";

export interface ArtifactFieldOwnership {
  field: ArtifactFieldName | "worldBook";
  sourceIds: string[];
  rationale: string;
}

export interface CharacterArtifactIR {
  id: string;
  archetype: CardArchetype;
  fields: Record<ArtifactFieldName, string>;
  tags: string[];
  alternateGreetings: string[];
  loreManifestId: string;
  ownership: ArtifactFieldOwnership[];
  findings: ArtifactFinding[];
}

export type LoreCategory =
  | "world_rule"
  | "location"
  | "faction"
  | "character"
  | "relationship"
  | "knowledge"
  | "item"
  | "secret"
  | "history"
  | "pressure";

export type LoreTemporalClass = "evergreen" | "initial" | "current" | "historical";
export type LoreVisibility = "public" | "limited" | "private" | "secret";
export type LoreActivationState = "conditional" | "constant" | "disabled";
export type LoreSelectiveLogic = "AND" | "OR" | "NOT" | "NOT_ALL";
export type LoreInjectionRole = "system" | "user" | "assistant" | null;

export interface LoreActivationIntent {
  state: LoreActivationState;
  primaryKeys: string[];
  secondaryKeys: string[];
  selective: boolean;
  selectiveLogic: LoreSelectiveLogic;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  scanDepth: number | null;
  useProbability: boolean;
  probability: number;
  sticky: number;
  cooldown: number;
  delay: number;
  group: string;
  groupOverride: boolean;
  groupWeight: number;
  preventRecursion: boolean;
  excludeRecursion: boolean;
  delayUntilRecursion: boolean;
  vectorized: boolean;
  vectorDependency: "none" | "embedding_provider_required";
}

export interface LoreInjectionIntent {
  position: number;
  depth: number;
  role: LoreInjectionRole;
  order: number;
  priority: number;
}

export interface LoreActivationTest {
  kind: "positive" | "negative" | "collision";
  text: string;
  shouldActivate: boolean;
}

export interface LoreEntryIR {
  id: string;
  nativeUid: string;
  sourceId: string;
  sourceFactIds: string[];
  title: string;
  category: LoreCategory;
  canonicalOwner: "worldBook";
  content: string;
  temporalClass: LoreTemporalClass;
  visibility: LoreVisibility;
  activation: LoreActivationIntent;
  injection: LoreInjectionIntent;
  contentRationale: string;
  activationRationale: string;
  expectedActivationTests: LoreActivationTest[];
  estimatedTokens: number;
  findings: ArtifactFinding[];
}

export interface PortabilityFinding extends ArtifactFinding {
  feature: string;
}

export interface LoreManifest {
  id: string;
  name: string;
  description: string;
  entries: LoreEntryIR[];
  findings: ArtifactFinding[];
  portabilityFindings: PortabilityFinding[];
}

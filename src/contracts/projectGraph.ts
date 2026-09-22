export const PROJECT_GRAPH_SCHEMA = "lorebible.project-graph/v1" as const;

export const USER_AGENCY_RESERVATIONS = [
  "actions", "dialogue", "thoughts", "feelings", "attraction", "consent", "decisions",
  "relationships", "abilities", "backstory", "next_voluntary_action",
] as const;

export type GraphOrigin = "user" | "approved_project" | "lumiverse_docs_technical" | "external_reference" | "generated" | "inferred";
export type CanonStatus = "canon" | "provisional" | "suggested" | "conflicted" | "deprecated";
export type TemporalClass = "evergreen" | "initial" | "current" | "historical" | "future_possible";
export type Visibility = "public" | "limited" | "private" | "secret";
export type EntityType = "character" | "location" | "faction" | "organization" | "item" | "system" | "event" | "culture" | "species" | "concept" | "other";

export interface CanonFact { id: string; subjectId: string; predicate: string; value: unknown; status: CanonStatus; origin: GraphOrigin; confidence: number; visibility: Visibility; temporalClass: TemporalClass; sourceEvidenceIds: string[]; }
export interface EntityRecord { id: string; type: EntityType; name: string; aliases: string[]; importance: "principal" | "major" | "supporting" | "minor" | "reference"; lifecycle: "active" | "historical" | "future" | "unknown"; factIds: string[]; relationshipIds: string[]; sourceEvidenceIds: string[]; }
export interface RelationshipEdge { id: string; sourceEntityId: string; targetEntityId: string; publicDynamic?: string; privateDynamic?: string; sourceView?: string; targetView?: string; tension?: string; leverage?: string; status: "canon" | "provisional" | "conflicted"; origin: GraphOrigin; factIds: string[]; }
export interface KnowledgeClaim { id: string; factId: string; entityId: string; state: "knows" | "believes" | "suspects" | "misunderstands" | "unaware"; confidence?: number; origin: GraphOrigin; sourceEvidenceId?: string; }
export interface TemporalSnapshot { id: string; label: string; class: TemporalClass; factIds: string[]; worldTime: string | null; recordedAt: string; origin: GraphOrigin; }
export interface OwnershipRecord { id: string; factId: string; owner: "character_description" | "character_personality" | "scenario" | "system_prompt" | "example_messages" | "world_book" | "first_message" | "mutable_state" | "creator_notes" | "visual_bible" | "project_only"; rationale: string; origin: GraphOrigin; }
export interface SourceEvidence { id: string; kind: "user_input" | "saved_project" | "generated_output" | "lumiverse_documentation" | "external_reference"; locator: string; checksum?: string; observedAt?: string; }
export interface DependencyEdge { id: string; fromId: string; toId: string; type: "references" | "embeds" | "activates" | "assumes" | "mirrors" | "generated_from"; status: "canon" | "provisional" | "broken" | "deprecated"; origin: GraphOrigin; }
export interface ArtifactRecord { id: string; type: string; status: "planned" | "draft" | "ready" | "validated" | "released" | "deprecated" | "deferred"; origin: GraphOrigin; displayName: string | null; filename: string | null; version: string | null; sourceFactIds: string[]; }
export type BuildStatus = "pending" | "active" | "complete" | "failed" | "cancelled";
export interface BuildRecord { id: string; stage: string; status: BuildStatus; artifactIds: string[]; sourceRevision: number; kind?: string; }
export interface ForgeAttemptRecord { id: string; provider: string; modelId: string; route: string; status: "active" | "complete" | "failed" | "cancelled"; startedAt: string; finishedAt: string | null; diagnostic?: { code: string; message: string }; }
export interface ForgeBatchRecord { index: number; name: string; expectedKeys: string[]; status: BuildStatus; sections: Record<string, unknown>; attempts: ForgeAttemptRecord[]; acceptedCommandId: string | null; }
export type ForgeJobDestinationV1 = "core" | "user" | "worldPhysics" | "status" | "locations" | "factions" | "npcs" | "relationshipWeb" | "knowledgeMap" | "items" | "secrets" | "conflict" | "pressureProtocol" | "history" | "aesthetic" | "naming" | "pressures" | "additionalLore";
export interface ForgeJobV1 { version: 1; id: string; bundleIndex: number; ordinal: number; kind: "category_entries" | "bundle5_section"; destinations: [ForgeJobDestinationV1]; categoryId?: string; categoryLabel?: string; purpose?: string; entryIds: string[]; dependencies: string[]; schemaId: string; schemaVersion: 1; /** Template/ownership contract hash for new jobs; exact rendered hash for legacy bundle5_section jobs. */ promptHash: string; inputFingerprint: string; estimatedOutputTokens: number; splitDepth: number; }
export interface ForgeJobAttemptV1 { id: string; status: "active" | "complete" | "failed" | "cancelled"; provider: string; modelId: string; /** Exact initially rendered prompt sent for this durable attempt. */ promptHash: string; startedAt: string; endedAt?: string; failureCode?: string; }
export interface ForgeJobRecordV1 { job: ForgeJobV1; status: "pending" | "active" | "complete" | "failed" | "cancelled" | "superseded"; attempts: ForgeJobAttemptV1[]; sections?: Record<string, unknown>; acceptedCommandId?: string; replacementJobIds?: string[]; }
export interface ForgeSpecialistLedgerV1 { version: 1; planHash: string; inputFingerprint: string; jobs: ForgeJobRecordV1[]; }
export type ForgeCategoryRecordKind = "entity" | "relationship" | "knowledge" | "temporal_fact" | "section" | "empty_collection";
export type ForgeCastTier = "principal" | "roster" | "unclassified";
export type ForgeSpecialistProjectionV1 =
  | { kind:"entity"; entityType:EntityType; name:string|null; castTier:ForgeCastTier; independentGoal:string|null; independentActivity:string|null }
  | { kind:"relationship"; sourceName:string|null; targetName:string|null; publicDynamic:string|null; tension:string|null; direction:string|null }
  | { kind:"knowledge"; truth:string|null; knownBy:string|null; suspectedBy:string|null; surfacesWhen:string|null }
  | { kind:"temporal_fact"; temporalClass:"historical"|"current"; label:string|null; timing:string|null; consequence:string|null };
export interface ForgeCategoryRecordV1 { id:string; schema:"lorebible.forge-category-record/v1"; buildId:string; bundleIndex:number; sectionKey:string; categoryId:string; recordKind:ForgeCategoryRecordKind; ordinal:number; sourceEntryId:string|null; semanticName:string|null; status:"proposed"; origin:"generated"; payload:unknown; projection?:ForgeSpecialistProjectionV1; }
export interface ForgeBuildRecordV1 extends BuildRecord {
  kind: "forge";
  schema: "lorebible.forge-build/v1";
  executionMode: "continuous" | "step_by_step" | "single_request";
  inputFingerprint: string;
  lastTransitionRevision: number;
  createdAt: string;
  updatedAt: string;
  batches: ForgeBatchRecord[];
  /** Optional while reading v0.53-v0.54 saved builds; every new completion populates this collection. */
  categoryRecords?: ForgeCategoryRecordV1[];
  specialistLedger?: ForgeSpecialistLedgerV1;
  checkpoint: { completedBundleCount: number; sections: Record<string, unknown> };
}
export interface ValidationFinding { id: string; severity: "blocker" | "major" | "minor" | "info"; code: string; path: string; message: string; evidence?: unknown; }
export interface DecisionRecord { id: string; question: string; decision: unknown; status: "accepted" | "proposed" | "superseded"; origin: GraphOrigin; }
export interface UnresolvedRecord { id: string; code: string; path: string; message: string; severity: "blocker" | "major" | "minor" | "info"; }

export interface ProjectGraphV1 {
  schema: typeof PROJECT_GRAPH_SCHEMA;
  project: { id: string; name: string | null; version: string; status: "planning" | "active" | "paused" | "releasing" | "released" | "archived"; targetPlatform: "lumiverse"; mode: "legacy_migrated" | "graph_native"; revision?: number };
  authority: { sourceOrder: GraphOrigin[] };
  agency: { protectedSubject: "{{user}}"; reserved: string[] };
  canon: CanonFact[]; entities: EntityRecord[]; relationships: RelationshipEdge[]; knowledge: KnowledgeClaim[];
  temporalSnapshots: TemporalSnapshot[]; ownership: OwnershipRecord[]; sources: SourceEvidence[]; dependencies: DependencyEdge[];
  artifacts: ArtifactRecord[]; builds: BuildRecord[];
  validation: { status: "not_run" | "pass" | "pass_with_warnings" | "blocked"; findings: ValidationFinding[]; lastRun: string | null };
  decisions: DecisionRecord[]; unresolved: UnresolvedRecord[]; extensions: Record<string, unknown>;
}

export interface ProjectGraphMigrationReceiptV1 { schema: "lorebible.project-graph-migration/v1"; sourceSchema: 2; targetSchema: typeof PROJECT_GRAPH_SCHEMA; sourceSha256: string; sourceCanonicalJson: string; migratedAt: string; counts: Record<string, number>; decisions: string[]; warnings: string[]; unresolvedIds: string[]; validationStatus: "pass" | "blocked"; }
export interface ProjectGraphMigrationResult { graph: ProjectGraphV1; receipt: ProjectGraphMigrationReceiptV1; }

# Project Graph Migration Foundation Design

**Status:** Approved 2026-09-09  
**Roadmap:** M1.1 of M1 Project Graph and persistence foundation  
**Release:** LoreBible v0.38

## Goal

Introduce a versioned, validated Project Graph and a deterministic, non-destructive migration from `SavedLoreBibleProjectV2` without changing the current editor or making the graph a second writable authority.

## Scope

This slice adds:

- project, canon, entity, directional relationship, knowledge, temporal, ownership, source-evidence, dependency, validation, artifact, and build-record contracts;
- a runtime parser that rejects malformed graph records and preserves permitted extension fields;
- deterministic migration from a complete V2 saved project;
- a migration envelope containing the original serialized V2 source, its SHA-256 checksum, migration decisions, warnings, and unresolved items;
- deterministic tests and public documentation.

This slice does not add server persistence, graph editing commands, UI surfaces, automatic save migration, or graph-native Forge. Those remain M1.2 and later work.

## Authority and preservation rules

1. The V2 project remains the live editor/save authority in v0.38.
2. Migration is explicit and pure: it returns a new graph plus receipt and does not mutate or overwrite the input.
3. The migration envelope preserves the entire JSON-serializable V2 value, including unknown fields, in canonical serialized form with a checksum.
4. Explicit user-authored manuscript material is preserved. When its origin or approval state cannot be proven, it becomes `provisional`, never silently `canon`.
5. User instructions and accepted project data outrank generated or inferred material.
6. Temporary opening/current state is classified separately from evergreen truth and is not promoted to constant lore.
7. `{{user}}` retains actions, dialogue, thoughts, feelings, attraction, consent, decisions, relationships, abilities, backstory, and next voluntary action.
8. Provider credentials and connection-profile secrets are outside portable project graphs and migration envelopes.

## Contract organization

`src/contracts/projectGraph.ts` owns the data model and discriminated unions. The top-level schema identifier is `lorebible.project-graph/v1` and the record includes:

- project identity, version, target platform, status, and graph mode;
- authority order and agency contract;
- canon facts with origin, confidence, visibility, temporal class, and approval state;
- stable entity records and aliases;
- directional relationship edges;
- knowledge claims separating truth from belief, suspicion, misunderstanding, and unawareness;
- temporal snapshots separating evergreen, opening, current, historical, and future-possible state;
- canonical ownership assignments;
- source evidence and dependency edges;
- artifact and resumable build records;
- validation findings, decisions, and unresolved items;
- an extension-safe `extensions` object.

`src/lib/projectGraph/validation.ts` performs runtime parsing. It returns structured path-specific issues and a parsed value only on success. Unknown keys inside `extensions` survive parsing; arbitrary unknown top-level graph keys are rejected so schema drift is visible.

## Stable identity

Migration IDs use a namespaced SHA-256 digest of stable source identity and semantic path rather than array position alone. Identical source projects produce identical graph IDs. A renamed entity keeps its graph ID in later command-based edits; rename propagation belongs to M1.2.

Entity extraction is conservative:

- locations, factions, NPCs, items, and named world concepts become entities;
- relationships become directional edges only when source and target can be resolved without guessing;
- unresolved relationship text remains a provisional fact and produces an unresolved record;
- duplicates are not silently merged solely because display names match.

## Migration result

`migrateSavedProjectV2ToGraph(source)` returns:

```ts
interface ProjectGraphMigrationResult {
  graph: ProjectGraphV1;
  receipt: ProjectGraphMigrationReceiptV1;
}
```

The receipt records schema versions, source checksum, migration timestamp supplied through an injectable clock, counts, explicit decisions, warnings, unresolved IDs, and validation status. Repeating migration with the same source and clock produces byte-equivalent output.

## Validation and evidence

Deterministic tests cover:

- valid minimal graph parsing and malformed-reference rejection;
- stable IDs and repeat migration;
- complete source preservation and checksum verification;
- unknown V2 field preservation;
- provisional treatment of uncertain authored/generated material;
- directional relationships and unresolved endpoints;
- belief versus truth separation;
- edit-time versus world-time classification;
- opening/current state isolation;
- absence of connection profiles and API-key-shaped fields;
- non-mutation of the source;
- corruption rejection.

Passing these checks establishes `static_validated` evidence only. It does not prove Lumiverse import, runtime activation, or concurrent repository behavior.

## Rollback

The migration is additive and unused by the current save path. Reverting the v0.38 files removes the graph capability without changing V2 projects. No persisted user project is rewritten by this slice.

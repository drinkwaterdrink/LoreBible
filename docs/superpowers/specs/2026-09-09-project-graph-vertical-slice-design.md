# Project Graph Vertical Slice Design

**Status:** Approved in chat 2026-09-09; written specification pending review  
**Roadmap:** M1.3, final slice of M1  
**Planned release:** LoreBible v0.40

## Goal

Prove one existing V2 project can be explicitly migrated, persisted, inspected, edited, compiled from graph-native data, restarted, reloaded, and recompiled without changing the existing Vault's authority or accepted state.

## Scope

M1.3 adds:

- explicit V2-to-graph preparation for one selected Vault project;
- a mobile-safe Project Graph beta panel;
- persisted graph status and migration diagnostics;
- one controlled entity-rename workflow with blast-radius reporting;
- a minimal graph-native narrator-card and Lumiverse World Book preview compiler;
- parse/round-trip validation and restart equivalence tests;
- v0.40 release documentation and M1 closure evidence.

M1.3 does not:

- automatically migrate projects;
- remove, rewrite, or stop V2 browser saves;
- make graph data editable through arbitrary JSON;
- route Forge or Refine generation into the graph;
- replace existing exports;
- claim live Lumiverse import or activation behavior.

## Selected architecture

The Vault remains the project-discovery surface. Each V2 project gains an opt-in **Prepare Project Graph** action. Preparation sends that one complete V2 record to the local server, creates a validated graph through the existing migration function, and persists it through the Project Repository.

Prepared projects open a separate beta panel. The panel reads and edits the repository graph but does not alter the V2 project. Its copy must say this clearly.

The graph-native compiler consumes `ProjectGraphV1` only. It must not parse `receipt.sourceCanonicalJson`, call the legacy document compiler, or use the V2 object after migration. This proves compilation uses the new authority rather than a disguised legacy fallback.

## Project identity and idempotent preparation

Migration adds these administrative extension values:

```ts
extensions: {
  legacySourceSchema: 2;
  legacyDocumentId: string;
  migrationReceipt: {
    sourceSha256: string;
    migratedAt: string;
    warningCount: number;
  };
}
```

The complete legacy source remains in the separately returned migration receipt, not duplicated into the graph extensions.

Add:

`POST /api/projects/graph/migrate-v2`

The request contains one `SavedLoreBibleProjectV2`. The server supplies the migration timestamp. Behavior:

- no existing graph for `legacyDocumentId`: migrate, validate, create, return 201;
- existing graph with the same source checksum and revision 1: return the existing graph and receipt summary with 200 `already_prepared`;
- existing graph that has been edited or originated from different source bytes: return 409 `graph_exists_modified` and preserve both sides;
- malformed or credential-bearing input: return the existing safe 400/422 contracts;
- no overwrite/upsert behavior is allowed.

`GET /api/projects/graph` summaries add `legacyDocumentId`, enabling the client to match prepared graphs to Vault projects without exposing storage paths or source contents.

## Client service

Add a focused `projectGraphService` with:

- `listPreparedProjectGraphs()`;
- `prepareProjectGraph(project)`;
- `loadProjectGraph(graphId)`;
- `renameGraphEntity(graphId, expectedRevision, entityId, name)`;
- `compileGraphPreview(graphId)`.

Every response is recursively checked for credential-shaped fields before reaching React. Errors retain stable server codes, safe messages, and revision metadata.

## Vault integration

`VaultModal` receives prepared-graph summaries and callbacks from `App`.

For every project:

- unprepared: show **Prepare Project Graph (Beta)**;
- preparing: disable only that project's beta action and show progress;
- prepared: show **Open Graph Preview** plus revision;
- failed: keep all Vault actions working and show a scoped recovery message.

The existing Rename, Duplicate, Delete, and Open Sheet actions remain unchanged. Deleting a V2 Vault project does not delete its repository graph in this slice because that would expand a browser-local action into destructive server data removal. The beta panel explains orphan retention; cleanup policy belongs to a later explicit design.

The action layout must wrap vertically on narrow screens, remain keyboard accessible, and stay inside the existing scrollable modal.

## Project Graph beta panel

The panel shows:

- project name and beta/non-authoritative label;
- graph revision and source V2 ID;
- counts for entities, facts, relationships, knowledge claims, and unresolved items;
- migration warning count and validation status;
- entity list with type, name, aliases, and stable ID in a secondary disclosure;
- an entity rename form;
- latest change receipt split into **Applied automatically** and **Review suggested**;
- graph-native artifact preview and validation findings.

### Rename behavior

The user chooses one entity, enters a name, and submits. The client sends the currently displayed revision. On success it replaces the displayed graph with the returned revision and shows the receipt.

On `revision_conflict`:

- do not clear the typed name;
- state that a newer revision exists;
- provide **Reload current graph**;
- do not automatically retry or overwrite.

Other failures preserve both the V2 project and last loaded graph.

## Graph-native artifact compiler

Create `compileProjectGraphArtifacts(graph)` returning:

```ts
interface ProjectGraphArtifactPreview {
  sourceProjectId: string;
  sourceRevision: number;
  card: CharacterArtifactIR;
  lore: LoreManifest;
  cardV3: unknown;
  nativeWorldBook: unknown;
  findings: ArtifactFinding[];
  validation: {
    graph: "pass";
    cardV3: "pass" | "blocked";
    nativeWorldBook: "pass" | "blocked";
  };
}
```

### Card allocation

- `name`: graph project name, otherwise `Untitled Project` plus a minor finding;
- `description`: public evergreen facts owned by `character_description`, plus public evergreen project/world facts with no more specific runtime owner;
- `personality`: facts owned by `character_personality`; remain empty with a note when unauthored;
- `scenario`: public/limited `initial` facts owned by `scenario`;
- `firstMessage`: the single `initial` fact owned by `first_message`; multiple candidates are a major finding and none remains empty with a note;
- `exampleMessages`: only `example_messages` ownership; otherwise empty;
- `systemPrompt`: the existing genre-neutral narrator/world-director agency contract, shared through a dedicated helper rather than duplicated text;
- `postHistoryInstructions`: the existing continuity/agency reminder;
- `creatorNotes`: compiler provenance, source graph revision, and static-validation boundary.

Current facts do not enter permanent card fields. Secret facts do not enter public card fields.

### Lore allocation

One focused lore entry is produced for each eligible canonical fact or entity concept, not one giant project dump.

- eligible temporal classes: `evergreen` and `historical`; `initial` only when intentionally owned by World Book;
- `current` and `future_possible` are excluded with findings;
- secret facts compile disabled;
- character knowledge claims do not convert belief into truth;
- entity names and aliases become deterministic keys;
- facts without viable entity keys remain disabled and receive a major finding;
- advanced retrieval features remain off unless explicit graph-owned activation intent exists in a future schema;
- stable IDs derive from graph fact/entity IDs and never array positions.

The preview uses existing V3 and native World Book serializers after producing canonical IR. Both outputs are parsed through current structural validators. Validation failures block the preview response; no deterministic creative fallback is generated.

## Compile endpoint

Add:

`GET /api/projects/graph/:projectId/compile-preview`

It reloads the authoritative graph from the repository immediately before compilation. The response includes the source revision so the UI can identify stale previews. It does not persist artifact records or write export files.

## Restart/equivalence proof

The integration fixture must perform:

1. construct a representative V2 project containing two entities, public facts, an opening, current state, a secret, and a belief;
2. migrate through the route/service boundary;
3. persist through Repository instance A;
4. rename one entity through a revisioned command;
5. compile preview A;
6. discard Repository instance A and create Repository instance B at the same root;
7. reload and compile preview B;
8. assert canonical graph equality, revision equality, stable IDs/alias retention, card field equality, lore entry equality, and identical parsed serializer fields;
9. assert current state and secrets never appear in public card fields;
10. assert the secret lore entry remains disabled and belief remains attributed.

This is a process-restart simulation, not a forced crash or operating-system restart.

## Failure and preservation policy

- Migration failure leaves V2 and any prior repository graph unchanged.
- Repository conflict never overwrites either revision.
- Rename failure preserves typed UI input and last loaded graph.
- Compile failure preserves graph state and previous preview.
- Closing/reopening the panel reloads authoritative repository state.
- No failure invokes legacy/deterministic authored fallback content.

## Tests

### Migration route and service

- create, already-prepared idempotence, modified conflict;
- graph summary matching through `legacyDocumentId`;
- malformed/corrupt/credential rejection;
- redacted client boundary.

### Graph compiler

- consumes graph-only input;
- correct ownership/temporal/visibility routing;
- secret disabled and current excluded;
- knowledge attribution preserved;
- stable entry IDs and serializer parse checks;
- empty unauthored fields plus findings;
- no source receipt fallback;
- exact revision in preview.

### UI

- mobile-reachable prepare/open controls;
- per-project loading/error isolation;
- non-authoritative beta explanation;
- rename success/alias/receipt display;
- conflict preserves typed value and offers reload;
- preview retains previous successful output after failure.

### End to end

- route-backed migrate/edit/compile/restart/recompile equality;
- V2 input byte-equivalent before/after;
- fresh repository instance observes edited revision;
- no credential-shaped output.

### Release gate

- focused red/green cycles;
- full `bun test`;
- `bun run typecheck`;
- `bun run build`;
- `git diff --check`;
- clean `test` worktree and `HEAD == origin/test` after push.

## Evidence boundary

Passing M1.3 proves deterministic local migration, in-process repository editing, structural graph-native compilation, and fresh-instance reload for the tested fixtures. It does not prove live Lumiverse import, activation, model behavior, cross-process concurrency, physical power-loss recovery, or migration of projects the user did not explicitly select.

## Rollback

The V2 Vault stays authoritative. The beta panel and endpoints are additive. Reverting v0.40 removes the opt-in workflow without changing browser saves. Repository graph files are not automatically deleted.

## Roadmap effect

If every M1.3 gate passes, M1 is complete and the roadmap moves from 8/17 complete to 9/17 complete, with 8 remaining. M2 Blueprint Studio becomes next.

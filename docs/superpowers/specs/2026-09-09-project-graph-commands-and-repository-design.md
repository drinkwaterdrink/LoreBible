# Project Graph Commands and Repository Design

**Status:** Approved in chat 2026-09-09; written specification pending user review  
**Roadmap:** M1.2 of M1 Project Graph and persistence foundation  
**Planned release:** LoreBible v0.39

## Goal

Add revision-safe Project Graph changes and a transactional per-user Project Repository without switching the current Vault or browser V2 save path yet.

M1.2 establishes the write semantics and durable storage boundary that M1.3 can safely connect to the application.

## Scope

This slice adds:

- a pure command engine for supported graph changes;
- optimistic revision checks and structured conflicts;
- entity rename and canon-fact update commands;
- deterministic change sets and blast-radius reports;
- a filesystem-backed Project Repository with serialized per-project writes;
- validated atomic replacement, recovery backups, corruption reporting, and path safety;
- narrow internal server routes suitable for later UI integration;
- deterministic command, repository, and route tests;
- v0.39 version, changelog, roadmap progress, and validation receipt.

This slice does not:

- change the current Vault or localStorage behavior;
- automatically migrate any user project;
- delete or rewrite V2 saves;
- expose a new graph editor;
- compile the M1 thin vertical slice;
- claim cross-process file locking or Lumiverse runtime evidence.

## Considered approaches

### Selected: command engine and repository behind one internal boundary

Commands own mutation semantics; the repository owns concurrency, validation, and durability. Routes call the repository instead of reading and rewriting whole files themselves. This prevents UI consumers from inventing incompatible write rules.

### Rejected for this slice: repository-only whole-document writes

This is initially smaller but makes lost updates easy and gives later features no standard change receipt or blast-radius record.

### Rejected for this slice: immediate Vault replacement

This would expose existing projects to an unproven persistence path. The repository must pass interruption, corruption, recovery, and revision tests before becoming the UI authority.

## Graph revision invariant

`project.revision` becomes required for repository-managed graphs and must be a positive safe integer.

Every mutation command includes:

```ts
interface ProjectGraphCommandEnvelope<TCommand> {
  commandId: string;
  expectedRevision: number;
  issuedAt: string;
  command: TCommand;
}
```

The command engine rejects:

- missing or malformed command IDs;
- non-positive or unsafe revisions;
- an `expectedRevision` different from `graph.project.revision`;
- missing targets;
- invalid command payloads;
- results that fail Project Graph validation;
- credential-shaped keys introduced by a command.

A rejection returns a structured error and leaves the input graph byte-equivalent. A successful command returns a cloned graph whose revision is exactly the old revision plus one.

## Supported commands

### Rename entity

```ts
interface RenameEntityCommand {
  type: "entity.rename";
  entityId: string;
  name: string;
}
```

Rules:

- trim the new name and reject empty/control-character values;
- preserve the entity ID;
- if the name is unchanged after normalization, reject as a no-op;
- append the previous display name to aliases unless already present;
- do not infer that same-named entities are identical;
- update only confirmed structural name mirrors identified by exact stable references;
- do not rewrite arbitrary prose merely because it contains the old name;
- report possible textual references in the blast radius as `proposed_semantic_edit` findings.

### Update canon fact

```ts
interface UpdateCanonFactCommand {
  type: "canon.update";
  factId: string;
  value: unknown;
  status?: CanonStatus;
  visibility?: Visibility;
  temporalClass?: TemporalClass;
}
```

Rules:

- preserve the fact ID, subject, origin, confidence, and source evidence;
- reject values that are not JSON-serializable;
- reject no-op updates;
- do not silently promote `generated` or `inferred` facts to `canon` without an explicit requested status;
- mark directly dependent artifacts/builds as stale in the change receipt; artifact status mutation is deferred unless a confirmed dependency requires it;
- report unresolved textual/prose consumers without rewriting them.

## Change result and blast radius

```ts
interface ProjectGraphChangeResult {
  graph: ProjectGraphV1;
  receipt: {
    schema: "lorebible.project-graph-change/v1";
    commandId: string;
    projectId: string;
    fromRevision: number;
    toRevision: number;
    changedIds: string[];
    automaticChanges: ChangeImpact[];
    proposedSemanticEdits: ChangeImpact[];
    unaffectedSummary: string[];
    appliedAt: string;
  };
}
```

Each impact contains a stable target ID, path, classification, and reason. Traversal follows confirmed graph references and dependency edges in both directions. The receipt never claims unavailable artifacts were updated.

## Error contract

`ProjectGraphCommandError` codes:

- `invalid_command`
- `revision_conflict`
- `missing_target`
- `no_change`
- `invalid_graph`
- `credential_rejected`

Revision conflicts include expected and actual revision numbers. Error messages are safe for the UI and do not serialize project content.

## Repository contract

```ts
interface ProjectRepository {
  list(): Promise<ProjectRepositorySummary[]>;
  load(projectId: string): Promise<ProjectGraphV1 | null>;
  create(graph: ProjectGraphV1): Promise<ProjectGraphV1>;
  apply(projectId: string, envelope: ProjectGraphCommandEnvelope<ProjectGraphCommand>): Promise<ProjectGraphChangeResult>;
  inspectRecovery(projectId: string): Promise<ProjectRecoveryStatus>;
  restoreBackup(projectId: string, expectedPrimaryChecksum: string | null): Promise<ProjectGraphV1>;
}
```

The default root is:

`%LOCALAPPDATA%\LoreBible\projects`

Non-Windows development falls back to the platform user-data/config directory already used by connection profiles.

Every project uses an encoded stable ID directory:

```text
projects/<encoded-project-id>/
  project.json
  project.json.bak
  project.json.tmp
  project.json.rejected
```

The repository derives all paths internally. Callers cannot supply filenames or filesystem paths. Project IDs must be non-empty, bounded strings without control characters; directory names use base64url encoding so traversal sequences cannot escape the root.

## One-authority and write serialization

Within a server process, operations for the same project are serialized through a per-project promise queue. Different projects may proceed independently.

The repository reloads the authoritative primary file after entering the queue and before checking `expectedRevision`. A stale caller therefore receives `revision_conflict` instead of overwriting a newer revision.

This establishes in-process concurrency safety only. Cross-process locking remains explicitly unproven and is deferred until multiple LoreBible server processes need to share the same repository.

## Transactional write protocol

For create and apply:

1. Validate the candidate graph and reject credential-shaped data.
2. Canonically serialize the candidate and calculate SHA-256.
3. Ensure the project directory exists.
4. Remove only a stale repository-owned temporary file after confirming its exact derived path.
5. Write `project.json.tmp` with restricted permissions where supported.
6. Read the temporary file back, parse it, validate it, and compare its checksum.
7. If a primary exists, copy it to `project.json.bak`.
8. Atomically rename the verified temporary file to `project.json` on the same volume.
9. Read and validate the new primary before returning success.

Restore follows the same staged write-and-verify protocol with two deliberate differences: the validated backup is the candidate, and the existing primary is copied to `project.json.rejected` rather than overwriting the known-good backup. The rejected copy is also a fixed repository-derived path and is never loaded automatically.

If any step before rename fails, the old primary remains authoritative. If verification after rename fails, the operation returns a corruption error and reports the backup; it does not silently restore or erase evidence.

## Read and corruption behavior

- Missing primary: `load()` returns `null`.
- Valid primary: return the parsed graph.
- Invalid JSON, invalid graph, or checksum-read failure: throw `ProjectRepositoryError` with code `corrupt_primary`.
- The corrupt primary remains unchanged.
- `inspectRecovery()` independently reports whether the backup exists and validates, including primary and backup checksums when readable.
- Recovery is an explicit operation. It never occurs automatically during ordinary load.
- `restoreBackup()` requires the caller's last observed primary checksum (or `null` when unreadable/missing), preventing recovery over a newly changed primary.
- A successful restore preserves the former corrupt/current primary as `project.json.rejected` when it is readable; otherwise it records the limitation in the returned recovery receipt. The known-good backup remains unchanged.

## Credential exclusion

Repository writes recursively reject keys matching credential-bearing shapes such as:

- `apiKey`, `api_key`, `api-key`;
- `credential`;
- `accessToken`, `access_token`, `access-token`;
- `secretKey`, `secret_key`, `secret-key`.

Ordinary creative fields such as `secrets`, `secret`, or secret visibility are allowed. The error reports the field path but never its value.

## Internal server routes

Add a focused router module rather than expanding `server.ts` with repository logic:

- `GET /api/projects/graph` — safe summaries only;
- `POST /api/projects/graph` — create a validated graph;
- `GET /api/projects/graph/:projectId` — load one graph;
- `POST /api/projects/graph/:projectId/commands` — apply a revisioned command;
- `GET /api/projects/graph/:projectId/recovery` — inspect recovery state;
- `POST /api/projects/graph/:projectId/recovery/restore` — explicit backup restoration.

Route parsing maps domain errors to stable HTTP responses:

- 400 invalid command/graph/ID;
- 404 missing project/target;
- 409 revision conflict/no-op/recovery precondition conflict;
- 422 credential rejection;
- 500 I/O failure;
- 503 corrupt primary with recovery availability metadata.

No route accepts provider keys, arbitrary paths, or a caller-supplied root directory.

## Testing

### Command tests

- correct revision succeeds and increments once;
- stale revision fails without mutating input;
- rename preserves entity ID and old alias;
- same-name entity records remain distinct;
- reciprocal relationships are not invented;
- no-op/empty/control-character rename rejection;
- fact updates preserve ownership/provenance fields;
- generated/inferred canon is not promoted implicitly;
- exact structural impacts versus proposed prose impacts;
- missing targets and credential-shaped values fail safely;
- resulting graph passes the runtime parser.

### Repository tests

- create/load/list and new-instance restart reload;
- duplicate create rejection;
- per-project concurrent commands produce one success and one revision conflict;
- different projects do not share a queue;
- interrupted temp write preserves primary;
- invalid temp verification prevents rename;
- corrupt primary remains unchanged;
- valid/invalid/missing backup inspection;
- explicit recovery checksum precondition;
- restored graph validates;
- traversal-shaped project ID remains within root;
- credentials are never written;
- leftover temp file cleanup targets only the derived project temp file.

Filesystem failure tests use an injected adapter at the repository boundary rather than monkey-patching global Node APIs. Ordinary tests use real temporary directories.

### Route tests

- stable status/error mappings;
- route responses do not expose filesystem roots or unrelated projects;
- command receipts and recovery metadata remain value-safe;
- malformed bodies do not reach repository writes.

### Release gate

- focused red/green tests for every new behavior;
- full `bun test`;
- `bun run typecheck`;
- `bun run build`;
- `git diff --check`;
- branch/remote commit equality after push.

## Evidence boundary

Passing M1.2 establishes deterministic command behavior and simulated filesystem interruption/recovery plus real temporary-directory persistence. It does not prove:

- cross-process locking;
- resilience to operating-system or hardware failure at every instruction boundary;
- live migration of current Vault projects;
- Lumiverse import or runtime behavior.

These limitations appear in the v0.39 receipt and changelog.

## Rollback

The current browser V2 save system remains untouched and authoritative for the UI. Repository files are additive and unused by Vault. Reverting the M1.2 code removes the internal repository/routes without altering existing V2 projects. No cleanup or deletion of `%LOCALAPPDATA%\LoreBible\projects` is automatic.

## Next slice

M1.3 will explicitly migrate a selected V2 project, persist it through the repository, expose one controlled graph edit, compile a basic card/book from that revision, restart/reload it, and compare accepted state exactly. Only after that vertical slice passes can the application begin transitioning its live project authority.

# M1.1 Project Graph migration receipt

**Release:** v0.38  
**Milestone status:** M1 in progress  
**Evidence maturity:** `static_validated`

## Delivered

- `lorebible.project-graph/v1` contracts and runtime reference validation.
- Deterministic semantic IDs derived from source project identity and source path.
- Canonical V2 serialization and SHA-256 source receipts.
- Conservative extraction of entities, directional relationships, knowledge claims, temporal facts, and ownership.
- Full persisted V2 source retention, including unknown JSON fields.
- Refusal to create portable receipts when credential-shaped fields are found.

## Preservation and rollback

`SavedLoreBibleProjectV2` remains the live editor and browser-save authority. Migration is a pure, additive function and is not wired to autosave or Vault loading. Removing the M1.1 modules therefore leaves existing projects unchanged.

## Validation performed

- Focused Project Graph parser, canonical JSON, checksum, and migration tests.
- Full Bun test suite.
- TypeScript `--noEmit` checking.
- Vite/client and bundled-server production build.
- Git whitespace/diff validation.

Exact command results are recorded in the v0.38 development handoff and Git history.

## Not established

- No automatic migration of user saves.
- No server-side ProjectRepository or atomic Windows persistence yet.
- No revision-conflict command API yet.
- No restart/reload vertical slice yet.
- No Lumiverse import, Dry Run, Diagnostics, or runtime activation test.

## Next slice

M1.2 adds revision-safe graph commands and a transactional Windows ProjectRepository with recovery copies. It must keep one write authority and must not place API keys in portable project backups.

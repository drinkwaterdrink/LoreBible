# Project Graph Migration Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a validated Project Graph v1 and deterministic, lossless migration from `SavedLoreBibleProjectV2` while leaving V2 as the live save authority.

**Architecture:** Focused contract and validator modules define one graph format; a pure migration module conservatively extracts structured records while retaining the complete canonical source and checksum in a receipt envelope. No UI or repository wiring is introduced in this slice.

**Tech Stack:** TypeScript 5.8, Bun 1.3.14 tests, Web Crypto/Node crypto-compatible SHA-256, React/Vite documentation surfaces.

**Spec:** `docs/superpowers/specs/2026-09-09-project-graph-migration-foundation.md`

## Global Constraints

- Keep `SavedLoreBibleProjectV2` as the sole live editor/save authority in v0.38.
- Never mutate, overwrite, or delete the V2 source during migration.
- Preserve every JSON-serializable unknown V2 field in the migration envelope.
- Mark uncertain extracted creative material `provisional`, not `canon`.
- Exclude connection profiles, credentials, and API keys from graph output and portable migration records.
- Preserve the normalized `{{user}}` agency reservation set from the design.
- Evidence from this slice is `static_validated`; do not claim Lumiverse runtime validation.
- Increment the visible application version exactly once, from v0.37 to v0.38.

---

### Task 1: Project Graph contracts and runtime validation

**Files:**
- Create: `src/contracts/projectGraph.ts`
- Create: `src/lib/projectGraph/validation.ts`
- Create: `tests/projectGraph/validation.test.ts`

**Interfaces:**
- Produces: `ProjectGraphV1`, record subtypes, `PROJECT_GRAPH_SCHEMA`, `parseProjectGraph(value): ProjectGraphParseResult`.
- Consumes: no production interfaces beyond JSON-compatible values.

- [ ] **Step 1: Write failing parser tests**

Create tests for a complete minimal graph, rejection of duplicate IDs, missing dependency endpoints, invalid relationship direction, invalid knowledge references, the exact agency reservation set, and preservation of `extensions`.

- [ ] **Step 2: Verify the tests fail for the missing module**

Run: `bun test tests/projectGraph/validation.test.ts`  
Expected: FAIL because `src/lib/projectGraph/validation.ts` does not exist.

- [ ] **Step 3: Define the focused contracts**

Implement the schema and record interfaces described by the spec. Use string-literal unions for statuses, origins, visibility, temporal class, ownership surface, dependency type, finding severity, and build status. All graph-addressable records require stable string IDs.

- [ ] **Step 4: Implement the runtime parser**

Return `{ ok: true, value }` or `{ ok: false, issues: Array<{ path: string; message: string }> }`. Validate collection shapes, unique IDs, cross-references, relationship direction, knowledge fact/entity endpoints, dependency endpoints, and the exact agency contract.

- [ ] **Step 5: Verify Task 1**

Run: `bun test tests/projectGraph/validation.test.ts`  
Expected: all Task 1 tests pass.

- [ ] **Step 6: Commit Task 1**

```powershell
git add src/contracts/projectGraph.ts src/lib/projectGraph/validation.ts tests/projectGraph/validation.test.ts
git commit -m "feat: define project graph contracts"
```

### Task 2: Canonical source envelope and checksum

**Files:**
- Create: `src/lib/projectGraph/canonicalJson.ts`
- Create: `tests/projectGraph/canonicalJson.test.ts`

**Interfaces:**
- Produces: `canonicalizeJson(value: unknown): string`, `sha256Hex(value: string): string`.
- Consumes: JSON-compatible V2 source values.

- [ ] **Step 1: Write failing canonicalization tests**

Test recursively sorted object keys, retained array order, escaped strings, `null`, rejection of unsupported cyclic/non-JSON values, and the known SHA-256 fixture for a canonical string.

- [ ] **Step 2: Verify RED**

Run: `bun test tests/projectGraph/canonicalJson.test.ts`  
Expected: FAIL because the canonical JSON helpers do not exist.

- [ ] **Step 3: Implement canonical JSON and SHA-256**

Implement deterministic recursive canonicalization without modifying the input. Use `node:crypto` `createHash("sha256")` for the digest.

- [ ] **Step 4: Verify GREEN and commit**

Run: `bun test tests/projectGraph/canonicalJson.test.ts`  
Expected: all tests pass.

```powershell
git add src/lib/projectGraph/canonicalJson.ts tests/projectGraph/canonicalJson.test.ts
git commit -m "feat: add deterministic project source hashing"
```

### Task 3: Conservative V2 migration

**Files:**
- Create: `src/lib/projectGraph/migrateSavedProjectV2.ts`
- Create: `tests/projectGraph/migrateSavedProjectV2.test.ts`
- Modify: `src/contracts/projectGraph.ts`

**Interfaces:**
- Produces: `migrateSavedProjectV2ToGraph(source, options): ProjectGraphMigrationResult`, where options requires `migratedAt: string`.
- Consumes: `SavedLoreBibleProjectV2`, `canonicalizeJson`, `sha256Hex`, and Task 1 graph contracts.

- [ ] **Step 1: Write failing stable-migration tests**

Use a compact V2 fixture to assert identical input plus clock yields deep-equal output, stable project/entity/fact IDs, no source mutation, source checksum verification, complete canonical source retention, and successful `parseProjectGraph` validation.

- [ ] **Step 2: Verify RED**

Run: `bun test tests/projectGraph/migrateSavedProjectV2.test.ts`  
Expected: FAIL because the migration entry point is missing.

- [ ] **Step 3: Implement the minimal migration envelope and core facts**

Create project metadata, authority, agency, decisions, validation, and migration receipt. Extract explicit title, Spark premise, core manuscript facts, and temporal opening/current records. All uncertain extracted material is provisional with its V2 source path.

- [ ] **Step 4: Verify the first migration tests pass**

Run: `bun test tests/projectGraph/migrateSavedProjectV2.test.ts`  
Expected: stable-envelope tests pass.

- [ ] **Step 5: Add failing entity, relationship, and knowledge tests**

Assert conservative entities for NPC/location/faction/item entries, distinct IDs for same-named records, directional edges only for resolvable endpoints, unresolved records for ambiguous text, and separate knowledge claims that reference facts rather than redefine truth.

- [ ] **Step 6: Verify the new tests fail for missing extraction behavior**

Run: `bun test tests/projectGraph/migrateSavedProjectV2.test.ts`  
Expected: FAIL on entity/relationship/knowledge assertions.

- [ ] **Step 7: Implement conservative structured extraction**

Map source sections using stable semantic paths; retain aliases and original fields as provisional facts. Never infer reciprocal relationships. Store unresolvable relationship/knowledge material as provisional facts plus unresolved records.

- [ ] **Step 8: Add and satisfy safety tests**

Add tests proving opening/current state is not evergreen, unknown V2 fields remain in `sourceCanonicalJson`, fields named like `apiKey`, `connectionProfile`, or `credential` are rejected from a portable migration envelope, and malformed/cyclic input produces a structured migration error rather than partial output.

- [ ] **Step 9: Verify Task 3 and commit**

Run: `bun test tests/projectGraph/migrateSavedProjectV2.test.ts tests/projectGraph/validation.test.ts tests/projectGraph/canonicalJson.test.ts`  
Expected: all project-graph tests pass.

```powershell
git add src/contracts/projectGraph.ts src/lib/projectGraph/migrateSavedProjectV2.ts tests/projectGraph/migrateSavedProjectV2.test.ts
git commit -m "feat: migrate v2 projects into project graph"
```

### Task 4: Release documentation and version v0.38

**Files:**
- Modify: `package.json`
- Modify: `src/version.ts`
- Modify: `CHANGELOG.md`
- Modify: `docs/roadmap/delivery-roadmap.md`
- Create: `docs/roadmap/m1-project-graph-migration-receipt.md`
- Test: existing version and documentation contract tests discovered by `bun test`

**Interfaces:**
- Produces: visible `v0.38`, M1.1 static-validation receipt, roadmap status showing M1 in progress.
- Consumes: verification results from Tasks 1–3.

- [ ] **Step 1: Identify and update version assertions**

Run `rg -n "0\.37|APP_VERSION|version label" src tests package.json` and update the expected release to `0.38.0` / `v0.38` in the relevant existing test before production version constants.

- [ ] **Step 2: Verify the version test fails**

Run the identified focused test.  
Expected: FAIL because the application still reports v0.37.

- [ ] **Step 3: Update release metadata and documentation**

Set package and visible versions to v0.38. Add a changelog entry explaining what the graph/migration foundation does and why. Mark M1.1 complete inside M1 while keeping the overall roadmap at 8 of 17 complete and 9 remaining because the M1 exit gate has not passed. Record exact checks and limitations in the receipt.

- [ ] **Step 4: Run the full release gate**

Run: `bun test`  
Expected: zero failures.

Run: `bun run typecheck`  
Expected: exit code 0.

Run: `bun run build`  
Expected: exit code 0; report the existing Vite chunk-size warning separately if still present.

- [ ] **Step 5: Review the final diff against the spec**

Run: `git diff --check` and `git status --short`. Confirm no UI/save wiring, credentials, generated artifacts, or unrelated changes entered the slice.

- [ ] **Step 6: Commit and push the release**

```powershell
git add package.json src/version.ts CHANGELOG.md docs/roadmap/delivery-roadmap.md docs/roadmap/m1-project-graph-migration-receipt.md docs/superpowers/specs/2026-09-09-project-graph-migration-foundation.md docs/superpowers/plans/2026-09-09-project-graph-migration-foundation.md
git commit -m "release: ship LoreBible v0.38"
git push origin test
```

## Self-review

- Spec coverage: contracts, validation, deterministic identity, complete source preservation, checksum, conservative extraction, temporal isolation, secret exclusion, evidence boundary, versioning, changelog, and rollback are assigned to Tasks 1–4.
- Placeholder scan: no deferred implementation placeholders are used; explicitly out-of-scope work is assigned to M1.2.
- Type consistency: the parser, migration result, canonicalization, and migration option names are consistent across tasks.

# Forge Stable Cross-Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give generated Forge relationship and knowledge proposals deterministic, inspectable stable links without promoting uncertain output into canon.

**Architecture:** Add a pure resolver beside the existing Project Graph projection code. It reads a Forge build's category records and existing graph entities, returns a revision-scoped report, and never mutates checkpoints or manuscript payloads. The Project Graph panel shows a compact summary while retaining unresolved detail in the report for subsequent acceptance work.

**Tech Stack:** TypeScript 5.8, React 19, Bun tests, existing Project Graph v1 and Forge build v1.

**Spec:** `docs/superpowers/specs/2026-09-19-forge-stable-cross-links-design.md`

## Global Constraints

- Work only on `test`; preserve unrelated changes and all accepted Forge checkpoints.
- Generated specialist records remain proposals, not accepted canon.
- Never infer unsupported character knowledge, user history, or creative facts.
- Do not change the six-bundle protocol, source payloads, IDs, or manuscript derivation.
- Legacy builds lacking `categoryRecords` return an unsupported/empty report.
- Linking is structurally verified, not Lumiverse runtime observed.

## Review Focus

1. A generated NPC and an existing graph entity share a name: matching must be ambiguous, not first-wins (Task 1 test).
2. Two aliases normalize to the same spelling: matching must be ambiguous even if one candidate's canonical name matches (Task 1 test).
3. `{{user}}` appears as a relationship endpoint: never fabricate a graph entity for it (Task 1 test).
4. A single unknown stable-ID-looking string appears: do not fall back to a coincidental name match (Task 1 test).
5. Reordering records or reloading a graph must not change a report's targets/findings (Task 2 test).

## File map

- Create `src/lib/projectGraph/forgeCrossLinks.ts`: resolver, matching index, report types; no storage writes.
- Create `tests/projectGraph/forgeCrossLinks.test.ts`: resolver, revision, compatibility, and lossless-input tests.
- Modify `src/components/ProjectGraphPanel.tsx`: compact report summary for latest Forge build; no editor or acceptance control.
- Modify `docs/roadmap/delivery-roadmap.md`, `CHANGELOG.md`, `package.json`, and `src/version.ts` only after implementation and full verification, following the current release convention.

---

### Task 1: Deterministic candidate index and endpoint resolution

**Files:**
- Create: `src/lib/projectGraph/forgeCrossLinks.ts`
- Create: `tests/projectGraph/forgeCrossLinks.test.ts`

**Interfaces:**
- Consumes: `ProjectGraphV1`, `ForgeBuildRecordV1`, and `ForgeCategoryRecordV1` from `src/contracts/projectGraph.ts`.
- Produces: `resolveForgeLinks(graph: ProjectGraphV1, buildId: string): ForgeLinkReport`.
- `ForgeLinkReport` has `{buildId, graphRevision, status: "ready"|"unsupported", records: ForgeLinkedRecord[], findings: ForgeLinkFinding[], counts}`.
- `ForgeEndpoint` has `{status:"resolved"|"missing"|"ambiguous"|"not_applicable", targetId:string|null, targetKind:"graph_entity"|"forge_entity"|null, candidateIds:string[]}`.

- [ ] **Step 1: Write failing tests for exact matching, ambiguity, and missing references.**

Use `projectForgeSections` to build proposals in the test; create graph fixtures with valid `ProjectGraphV1` arrays. Example essential assertions:

```ts
const report = resolveForgeLinks(graph, "build:one");
expect(report.records.find(item => item.recordId === relationship.id)?.source).toMatchObject({
  status: "resolved", targetId: npc.id, targetKind: "forge_entity"
});
expect(report.records.find(item => item.recordId === relationship.id)?.target.status).toBe("ambiguous");
expect(report.findings.map(item => item.code)).toContain("forge.link.ambiguous");
```

Add separate tests for exact graph stable ID, Forge record ID, source entry ID, unique canonical name, unique alias, duplicate canonical name, alias collision, missing endpoint, unknown ID-like string, `{{user}}`, self-link, and a relationship with one resolved and one missing endpoint. The test must fail because `resolveForgeLinks` does not exist.

- [ ] **Step 2: Run the focused test and confirm the expected red failure.**

Run: `bun test tests/projectGraph/forgeCrossLinks.test.ts`. Expected: missing export/function failure, not malformed fixtures.

- [ ] **Step 3: Implement the smallest pure resolver.**

Normalize with `value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US")`. Index both graph entities and build-local `projection.kind === "entity"` records by ID and normalized name/aliases; never use substring/fuzzy matching. An ID-shaped value beginning `entity:` or `forge-category:` that has no exact target is missing, not a name fallback. Direct source entry IDs are eligible only if unique. Sort candidate IDs before reporting. Resolve each relationship endpoint independently; emit `forge.link.self_reference` if both resolve to the same target. Do not put output into `graph.relationships` or modify the input.

- [ ] **Step 4: Run focused tests and refactor only after green.**

Run: `bun test tests/projectGraph/forgeCrossLinks.test.ts`. Expected: all Task 1 tests pass.

- [ ] **Step 5: Commit the tested resolver.**

Run: `git add src/lib/projectGraph/forgeCrossLinks.ts tests/projectGraph/forgeCrossLinks.test.ts` then `git commit -m "feat: resolve Forge proposal references without canon promotion"`.

### Task 2: Knowledge boundaries, revision behavior, and lossless compatibility

**Files:**
- Modify: `src/lib/projectGraph/forgeCrossLinks.ts`
- Modify: `tests/projectGraph/forgeCrossLinks.test.ts`

**Interfaces:**
- Uses the Task 1 `resolveForgeLinks` report.
- For knowledge records, `knownBy` and `suspectedBy` each produce a `ForgeEndpoint`; `truthFactId` stays `null` until an accepted fact exists.

- [ ] **Step 1: Write failing tests for knowledge and lifecycle behavior.**

```ts
const before = structuredClone(graph);
const report = resolveForgeLinks(graph, "build:one");
expect(report.records.find(item => item.recordId === knowledge.id)?.truthFactId).toBeNull();
expect(graph).toEqual(before);
expect(deriveForgeSectionsFromCategoryRecords(build.categoryRecords!)).toEqual(build.checkpoint.sections);
```

Add tests that a unique `knownBy` name resolves; a comma-separated or multiple-person string stays ambiguous/unresolved without parsing; a rename retains the ID through the former alias; duplicate aliases after rename become ambiguous; a missing `categoryRecords` property returns `status:"unsupported"` with empty records; changing `graph.project.revision` changes `graphRevision`; reordering source arrays does not alter the sorted report. The `knownBy` test must fail before implementation.

- [ ] **Step 2: Run the focused test and observe the expected red assertion.**

Run: `bun test tests/projectGraph/forgeCrossLinks.test.ts`.

- [ ] **Step 3: Add knowledge resolution and stable report ordering.**

Apply the same exact single-reference lookup to each knowledge field; never split prose on punctuation. Expose the unresolved fact dependency as `forge.link.fact_acceptance_required`; do not create `CanonFact`, `KnowledgeClaim`, or acceptance commands. Sort records by stable record ID and findings by record ID/path/code so array order cannot affect output.

- [ ] **Step 4: Run focused and existing Forge tests.**

Run: `bun test tests/projectGraph/forgeCrossLinks.test.ts tests/projectGraph/forgeCategoryRecords.test.ts tests/projectGraph/forgeBuilds.test.ts tests/projectGraph/validation.test.ts`. Expected: all pass.

- [ ] **Step 5: Commit the lifecycle-safe report.**

Run: `git add src/lib/projectGraph/forgeCrossLinks.ts tests/projectGraph/forgeCrossLinks.test.ts` then `git commit -m "test: protect Forge links across reload and rename"`.

### Task 3: Compact Project Graph inspection and release evidence

**Files:**
- Modify: `src/components/ProjectGraphPanel.tsx`
- Create: `tests/projectGraph/forgeCrossLinksPanel.test.tsx` only if the existing test toolchain supports component rendering; otherwise test a pure panel summary exported from `forgeCrossLinks.ts` in `forgeCrossLinks.test.ts` and keep JSX presentation minimal.
- Modify: `docs/roadmap/delivery-roadmap.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json`
- Modify: `src/version.ts`

**Interfaces:**
- Consumes `resolveForgeLinks(graph, latestForge.id)` and its counts.
- Produces only a read-only summary: resolved endpoints, unresolved endpoints, and an honest proposal/structural-only label.

- [ ] **Step 1: Write a failing summary test.**

```ts
expect(summarizeForgeLinks(report)).toEqual({resolved:2, unresolved:1, unsupported:false});
```

Also test unsupported legacy builds show no misleading zero-success badge. Run `bun test tests/projectGraph/forgeCrossLinks.test.ts`; expected: `summarizeForgeLinks` missing.

- [ ] **Step 2: Implement summary and render it beside existing Forge record count.**

Compute only for the latest Forge build with category records. Use accessible text like “Forge links: 2 resolved · 1 needs review (proposals only)”. If unsupported, say “Forge links: unavailable for older build”; do not equate a zero finding count with accepted canon.

- [ ] **Step 3: Run focused tests and inspect narrow-screen layout.**

Run `bun test tests/projectGraph/forgeCrossLinks.test.ts` and `bun run typecheck`. Review the panel at a mobile viewport if the local app is available; report manual inspection separately from automated results.

- [ ] **Step 4: Update current version and roadmap only for the scope actually shipped.**

Follow `CHANGELOG.md`/`src/version.ts` conventions and update any version tests that pin the number. Record M3.2 as still in progress: linking reports are implemented, while acceptance and scoped regeneration remain. Do not claim runtime certification.

- [ ] **Step 5: Run release checks and commit.**

Run `bun test`, `bun run typecheck`, `bun run build`, `git diff --check`, and `git status --short`. Resolve caused failures; list unrelated failures honestly. Commit the completed slice with only its files.

## Self-review and execution handoff

Before implementation, check that each test can fail for the behavior it names, no test requires a provider call, legacy saves remain readable, and only Task 3 changes version surfaces. At completion, report branch/start/end SHA, exact test outcomes, structural evidence, and remaining M3.2 work. Do not push unless separately requested.

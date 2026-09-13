# Graph-Native Forge Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every accepted Forge section produce stable, typed, proposed category records inside the canonical Project Graph, while deriving the legacy manuscript checkpoint from those records.

**Architecture:** Extend the existing `ForgeBuildRecordV1` compatibly with category records rather than introducing a second artifact system. Bundle completion deterministically projects provider output into records, and a reverse projector reconstructs the exact legacy sections used by the current UI. The records remain proposed generated material; this slice does not silently promote model output into accepted canon.

**Tech Stack:** TypeScript, Bun tests, existing Project Graph repository and command state machine.

**Spec:** `docs/superpowers/specs/2026-09-12-blueprint-reliability-and-resumable-forge-design.md`

## Global Constraints

- Work only on `test` and preserve unrelated user work.
- Preserve V2 loading and existing durable Forge checkpoints.
- Generated records are proposed, never silently accepted canon.
- Stable record IDs must survive reload and deterministic replay.
- Do not add model calls or change Lumiverse serialization.
- Increase the visible version by exactly 0.01 only after the slice passes the release gate.

---

### Task 1: Category-record projection

**Files:**
- Modify: `src/contracts/projectGraph.ts`
- Create: `src/lib/projectGraph/forgeCategoryRecords.ts`
- Test: `tests/projectGraph/forgeCategoryRecords.test.ts`

**Interfaces:**
- Produces: `projectForgeSections(buildId, bundleIndex, sections)` and `deriveForgeSectionsFromCategoryRecords(records)`.
- Produces stable records containing category identity, record kind, source entry identity, semantic name, ordinal, proposal status, and lossless payload.

- [ ] Write tests proving deterministic IDs, category mapping, empty-collection preservation, and exact reverse projection.
- [ ] Run the focused test and confirm missing interfaces fail.
- [ ] Implement the closed section-to-category mapping and lossless projection.
- [ ] Run the focused test and confirm it passes.

### Task 2: Transactional Forge integration

**Files:**
- Modify: `src/lib/projectGraph/forgeBuilds.ts`
- Modify: `src/lib/projectGraph/validation.ts`
- Modify: `tests/projectGraph/forgeBuilds.test.ts`
- Modify: `tests/projectGraph/validation.test.ts`

**Interfaces:**
- Consumes: the Task 1 projectors.
- Produces: bundle completion that atomically stores records and derives the checkpoint from them.

- [ ] Write tests showing completed bundles store records, retries cannot duplicate them, legacy records remain readable, and tampered record/checkpoint parity is rejected.
- [ ] Run tests and confirm the new assertions fail.
- [ ] Integrate projection into `completeForgeBatch` and add compatibility-aware validation.
- [ ] Run the focused Project Graph suites.

### Task 3: Release bookkeeping and verification

**Files:**
- Modify: `package.json`
- Modify: `src/version.ts`
- Modify: `CHANGELOG.md`
- Modify: `docs/roadmap/delivery-roadmap.md`
- Modify: `docs/roadmap/production-studio-blueprint.md`
- Modify: version tests

**Interfaces:**
- Produces: an honest v0.55 release record that marks M3.2 foundation progress without claiming canon acceptance or full-fidelity CHARX behavior.

- [ ] Update version surfaces and roadmap status.
- [ ] Run `bun test`, `bun run typecheck`, `npm.cmd run build`, and `git diff --check`.
- [ ] Request code review and resolve Critical or Important findings.
- [ ] Commit and push the verified update to `origin/test`.

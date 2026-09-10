# Project Graph Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an opt-in Vault-to-Project-Graph workflow with controlled rename, graph-native card/lore preview, and restart-equivalence proof.

**Architecture:** The server migrates one selected V2 project into the existing repository. A pure graph compiler creates canonical IR and validated previews; a focused client service and beta panel expose preparation, inspection, rename receipts, and preview without changing V2 authority.

**Tech Stack:** TypeScript, Bun, Express, React, Vite, existing Project Graph and artifact serializers.

**Spec:** `docs/superpowers/specs/2026-09-09-project-graph-vertical-slice-design.md`

## Global Constraints

- Migration is opt-in and non-overwriting; V2 remains authoritative.
- Compiler accepts `ProjectGraphV1` only and never reads preserved V2 source.
- Current/secret/knowledge data follows graph classification and ownership.
- Empty unauthored card fields produce findings, never invented creative prose.
- Mobile controls remain reachable and preserve typed input on conflict.
- Release evidence is structural/local only; no Lumiverse runtime claim.

---

### Task 1: Graph-native artifact compiler

**Files:** Create `src/lib/projectGraph/artifactCompiler.ts`; modify `src/lib/artifacts/characterArtifact.ts` to export shared runtime instructions; create `tests/projectGraph/artifactCompiler.test.ts`.

**Interfaces:** Produce `compileProjectGraphArtifacts(graph): ProjectGraphArtifactPreview`.

- [ ] Write failing tests for ownership allocation, empty fields/findings, current exclusion, disabled secrets, belief attribution, stable IDs, revision, and serializer parsing.
- [ ] Run the focused test and confirm the missing compiler failure.
- [ ] Implement canonical Lore/Card IR and use current V3/native serializers and parsers.
- [ ] Run focused tests and typecheck; commit `feat: compile artifacts from project graph`.

### Task 2: Idempotent V2 migration and compile APIs

**Files:** Modify migration extensions/repository summaries and `server/routes/projects.ts`; create route and restart integration tests.

**Interfaces:** Add `POST /api/projects/graph/migrate-v2` and `GET /api/projects/graph/:id/compile-preview`.

- [ ] Write failing tests for create, already-prepared, modified conflict, summary matching, compile reload, and fresh-repository equivalence.
- [ ] Run tests and confirm missing behavior.
- [ ] Implement server-timestamp migration, non-overwriting checksum checks, summary metadata, and authoritative reload before compile.
- [ ] Run route/repository/compiler/typecheck gates; commit `feat: add project graph migration and preview APIs`.

### Task 3: Client service and mobile beta panel

**Files:** Create `src/services/projectGraphService.ts`, `src/components/ProjectGraphPanel.tsx`; modify `VaultModal.tsx` and `App.tsx`; create client/component tests.

**Interfaces:** Provide list/prepare/load/rename/compile methods and panel callbacks/state.

- [ ] Write failing service tests for redaction and coded conflicts plus component tests for mobile prepare/open, beta warning, rename receipt, conflict preservation, reload, and preview retention.
- [ ] Run tests and confirm missing modules/controls.
- [ ] Implement per-project preparation state and the non-authoritative mobile panel without changing existing Vault actions.
- [ ] Run focused UI/service tests and typecheck; commit `feat: add project graph beta workflow`.

### Task 4: v0.40 and M1 closure

**Files:** Modify version files/tests, changelog, delivery roadmap; create `docs/roadmap/m1-vertical-slice-receipt.md`.

- [ ] Change version expectations to v0.40 and verify RED.
- [ ] Update visible/package versions and evidence-bounded documentation; mark M1 complete only if every gate passes.
- [ ] Run full tests, typecheck, production build, diff check, and scope review.
- [ ] Commit `release: ship LoreBible v0.40`, push `test`, verify clean worktree and `HEAD == origin/test`.

## Self-review

- Every spec behavior maps to compiler, API/integration, UI, or release work.
- Interfaces and names are consistent; no placeholder implementation steps remain.
- The slice closes M1 without authorizing automatic authority migration.

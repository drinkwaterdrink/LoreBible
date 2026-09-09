# Project Graph Commands and Repository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver revision-safe graph commands and transactional per-user persistence without changing the current V2 Vault authority.

**Architecture:** A pure command module clones and validates graph changes. A filesystem repository serializes each project's mutations, stages and verifies writes, preserves backups, and exposes narrow Express routes.

**Tech Stack:** TypeScript 5.8, Bun 1.3.14, Node filesystem/crypto, Express, Vite.

**Spec:** `docs/superpowers/specs/2026-09-09-project-graph-commands-and-repository-design.md`

## Global Constraints

- V2 browser storage remains the live UI authority.
- Every accepted command increments revision exactly once; stale revisions never write.
- Stable entity and fact IDs survive edits.
- Arbitrary prose is reported as blast radius, never silently rewritten.
- Repository paths are derived internally from base64url project IDs.
- Candidate files are parsed, validated, and checksummed before atomic rename.
- Credentials never enter repository files or responses.
- Evidence remains static/simulated; no Lumiverse runtime claim.

---

### Task 1: Revision-safe command engine

**Files:**
- Modify: `src/contracts/projectGraph.ts`
- Create: `src/lib/projectGraph/commands.ts`
- Create: `tests/projectGraph/commands.test.ts`

**Interfaces:**
- Produces `applyProjectGraphCommand(graph, envelope): ProjectGraphChangeResult` and `ProjectGraphCommandError`.
- Consumes `ProjectGraphV1`, `parseProjectGraph`, and canonical JSON validation.

- [ ] Write failing tests for successful rename, stable ID/old alias, exact revision increment, stale conflict/non-mutation, missing/no-op/unsafe names, canon updates, explicit status promotion, credential rejection, and blast-radius classification.
- [ ] Run `bun test tests/projectGraph/commands.test.ts`; verify failure is the missing command module.
- [ ] Add exact command/envelope/change-receipt contracts and implement clone-first mutation plus final graph validation.
- [ ] Run the focused tests and `bun run typecheck`; require zero failures.
- [ ] Commit `feat: add revision-safe project graph commands`.

### Task 2: Transactional Project Repository

**Files:**
- Create: `server/projects/projectRepository.ts`
- Create: `tests/projects/projectRepository.test.ts`

**Interfaces:**
- Produces `createProjectRepository(root, options?)`, `resolveDefaultProjectRepositoryPath()`, `ProjectRepository`, and `ProjectRepositoryError`.
- Consumes Task 1 command engine and graph parser/canonicalizer.

- [ ] Write failing real-temp-directory tests for create/load/list, duplicate rejection, restart reload, path containment, concurrent stale writes, backup creation, corrupt-primary preservation, recovery inspection/restore preconditions, and credential rejection.
- [ ] Run `bun test tests/projects/projectRepository.test.ts`; verify failure is the missing repository module.
- [ ] Implement base64url paths, per-project promise queues, validated staged writes, read-back checksum verification, backup copying, atomic rename, recovery inspection, and explicit restore with rejected-primary preservation.
- [ ] Add an injected filesystem adapter test that fails a staged write and assert the prior primary remains byte-identical.
- [ ] Run repository, command, and typecheck gates; require zero failures.
- [ ] Commit `feat: add transactional project repository`.

### Task 3: Internal graph repository routes

**Files:**
- Create: `server/routes/projects.ts`
- Modify: `server.ts`
- Create: `tests/routes/projects.test.ts`

**Interfaces:**
- Produces `registerProjectRoutes(app, { repository })`.
- Consumes Task 2 repository only; routes contain no filesystem logic.

- [ ] Write failing route tests for summaries, create/load, commands, malformed payloads, revision conflict, missing project, credential rejection, corrupt-primary metadata, and recovery endpoints.
- [ ] Run `bun test tests/routes/projects.test.ts`; verify the missing router failure.
- [ ] Implement stable error-to-HTTP mapping and register the default repository during server startup without exposing its root.
- [ ] Run route, repository, command, truthful-generation, and typecheck tests.
- [ ] Commit `feat: expose internal project graph repository routes`.

### Task 4: v0.39 release

**Files:**
- Modify: `package.json`, `src/version.ts`, version tests, `CHANGELOG.md`, `docs/roadmap/delivery-roadmap.md`
- Create: `docs/roadmap/m1-project-repository-receipt.md`

**Interfaces:**
- Produces visible v0.39 and an evidence-bounded release record.

- [ ] Update version expectations first and verify they fail against v0.38.
- [ ] Change package/display versions to 0.39.0/v0.39; document functionality, why, rollback, exact limitations, and M1 remaining work.
- [ ] Run `bun test`, `bun run typecheck`, `bun run build`, and `git diff --check` fresh.
- [ ] Inspect the diff for accidental Vault wiring, credentials, arbitrary paths, generated repository files, or unrelated edits.
- [ ] Commit `release: ship LoreBible v0.39`, push `test`, and verify `HEAD == origin/test` with a clean worktree.

## Self-review

- Coverage: command semantics, concurrency, atomic persistence, recovery, routes, versioning, documentation, rollback, and evidence boundaries each have a task.
- No placeholders or independently invented interfaces remain.
- Names and signatures are consistent between command, repository, and route tasks.

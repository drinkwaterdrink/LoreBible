# Project Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore each saved LoreBible project and the active unsaved workspace with its own complete workflow state while preserving V1/V2 compatibility and quarantining corrupt storage.

**Architecture:** Treat `SavedLoreBibleProjectV2[]` as the Vault's canonical state instead of repeatedly reconstructing projects from bare documents. Add a versioned active-workspace envelope for reload recovery, keep all persistence operations pure/testable behind storage helpers, and adapt the existing Vault UI to project records without exposing storage internals.

**Tech Stack:** TypeScript 5.8, React 19, browser `localStorage`, Bun test, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-06-provider-profiles-and-stabilization-design.md`

**Status:** Implemented and verified on 2026-09-08. Final evidence: 117 tests passed, TypeScript passed, production build passed, and an isolated rendered check confirmed the `v0.32` badge plus legacy Vault stage recovery.

## Global Constraints

- Keep read compatibility with the legacy V1 document array and the existing V2 project store.
- Never persist API keys, ciphertext, provider secrets, or full connection-profile metadata.
- Corrupt input must be copied verbatim to a timestamped recovery key and must not be silently replaced.
- A failed write must preserve the previous stored value and produce a visible user-facing error.
- Reload and mobile/desktop-site mode switches must restore the active workspace without requiring an explicit Vault save.
- Explicit New clears only the active workspace draft; it does not remove Vault projects.
- The visible release becomes `v0.32` for this user-visible update.

---

### Task 1: Persistence contracts and transactional storage helpers

**Files:**
- Modify: `src/lib/projectPersistence.ts`
- Create: `src/lib/workspacePersistence.ts`
- Modify: `tests/persistence/projectPersistence.test.ts`
- Create: `tests/persistence/workspacePersistence.test.ts`

**Interfaces:**
- Produces: `readProjectStore(storage, now?)`, `writeProjectStore(storage, store)`, `SavedWorkspaceDraftV2`, `readWorkspaceDraft(storage, now?)`, `writeWorkspaceDraft(storage, draft)`, and `clearWorkspaceDraft(storage)`.
- Consumes: `SavedLoreBibleProjectV2`, `LoreBibleDocument | null`, workflow state, generation settings, take history, and redacted model-selection IDs.

- [ ] **Step 1: Write failing store tests** asserting V1 migration, full V2 round-trip, delete persistence, corrupt-data quarantine without original overwrite, and quota-write preservation.
- [ ] **Step 2: Run `bun test tests/persistence/projectPersistence.test.ts`** and confirm failures identify the missing storage boundary.
- [ ] **Step 3: Implement strict additive validation and transactional store helpers** that read once, quarantine malformed raw JSON, and write only the supplied canonical store.
- [ ] **Step 4: Run the store tests** and confirm they pass.
- [ ] **Step 5: Write failing active-workspace tests** using a literal Stage 2 fixture with settings, selected-take version history, optional document, and no secrets.
- [ ] **Step 6: Run `bun test tests/persistence/workspacePersistence.test.ts`** and confirm the module is missing.
- [ ] **Step 7: Implement the V2 workspace envelope** with validation, recovery quarantine, write failure propagation, and explicit clear.
- [ ] **Step 8: Run both persistence test files** and confirm they pass.

### Task 2: Canonical Vault state and exact project restoration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/VaultModal.tsx`
- Create: `tests/components/vaultModal.test.tsx`
- Create: `tests/lib/projectWorkspace.test.ts`

**Interfaces:**
- Produces: pure `captureWorkspaceState(...)` and `restoreWorkspaceState(project)` helpers in `src/lib/projectWorkspace.ts`.
- Consumes: canonical saved projects, workflow stage, maximum unlocked stage, Spark parse, canon, physics, takes/version history, selected take, document, settings, model selection, and provenance.

- [ ] **Step 1: Write failing pure restoration tests** asserting Stage 2 remains Stage 2, all four takes and nested versions survive, project-specific settings survive, a missing selected take is normalized safely, and no secret-shaped fields serialize.
- [ ] **Step 2: Run the focused test** and confirm the project-workspace API is absent.
- [ ] **Step 3: Implement capture/restore helpers** with stage bounds `1..5`, unlocked-stage normalization, additive defaults, and exact per-project settings.
- [ ] **Step 4: Run the restoration tests** and confirm they pass.
- [ ] **Step 5: Write a failing Vault component test** asserting project records render and return the exact chosen project.
- [ ] **Step 6: Adapt `VaultModal` and `App`** so the Vault state is `SavedLoreBibleProjectV2[]`, save/update/duplicate/rename/delete operate on whole projects, and load restores the whole workflow instead of forcing Stage 5.
- [ ] **Step 7: Remove the reconstruct-every-project autosave loop** and write the canonical project store only after explicit Vault mutations.
- [ ] **Step 8: Run restoration and Vault tests** and confirm they pass.

### Task 3: Active-workspace recovery and visible storage failures

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/StorageRecoveryNotice.tsx`
- Create: `tests/components/storageRecoveryNotice.test.tsx`
- Modify: `tests/lib/projectWorkspace.test.ts`

**Interfaces:**
- Produces: a debounced active-workspace save, initialization from the valid workspace envelope, and a dismissible recovery/save-error notice.
- Consumes: every state field captured by `captureWorkspaceState`; never consumes transient AbortControllers, secrets, open modal state, or provider reasoning buffers.

- [ ] **Step 1: Write failing tests** for full active-workspace round-trip, explicit New clearing, corrupt-draft recovery, and accessible storage-error copy.
- [ ] **Step 2: Run the focused tests** and confirm the recovery UI/lifecycle is absent.
- [ ] **Step 3: Initialize App workflow state from one parsed draft snapshot** so React state cannot mix values from separate storage reads.
- [ ] **Step 4: Add a 300 ms debounced workspace write** covering Spark, stage, unlocked stage, parse, canon, physics, takes/history, selection, document, and settings.
- [ ] **Step 5: Surface quarantine and write failures** with a non-blocking notice that says existing in-memory work remains available.
- [ ] **Step 6: Make both New handlers share one reset path** that clears the active draft and resets transient generation state without touching Vault projects.
- [ ] **Step 7: Run persistence, workspace, and component tests** and confirm they pass.

### Task 4: Release v0.32, document, verify, and publish

**Files:**
- Modify: `src/version.ts`
- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Modify: `docs/roadmap/README.md`
- Modify: `tests/contracts/version.test.ts`

**Interfaces:**
- Produces: visible `v0.32`, an M0.4 completion record, and M0.5 as the next roadmap slice.
- Consumes: the existing shared `APP_VERSION` badge and changelog format.

- [ ] **Step 1: Update release metadata** to `0.32` / `0.32.0` and move M0.4 notes into a dated changelog section.
- [ ] **Step 2: Mark M0.4 complete** and M0.5 Divergence lineage next in the roadmap.
- [ ] **Step 3: Run `bun test`** and require zero failures.
- [ ] **Step 4: Run `bun run typecheck`** and require exit code 0.
- [ ] **Step 5: Run `bun run build`** and record any existing non-blocking bundle warning.
- [ ] **Step 6: Inspect the final diff and working tree** for secrets, unrelated edits, generated artifacts, and whitespace errors.
- [ ] **Step 7: Commit the verified update** with `git commit -m "release: ship LoreBible v0.32"`.
- [ ] **Step 8: Push the verified commits** to the configured GitHub remote.

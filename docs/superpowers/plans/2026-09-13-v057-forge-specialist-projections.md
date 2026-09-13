# Forge Specialist Projections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn accepted Forge categories into typed specialist proposals for cast, relationships, knowledge, and temporal material without breaking resumable checkpoints or the derived manuscript.

**Architecture:** Extend the existing `ForgeCategoryRecordV1` rather than creating a second graph authority. A pure projector derives bounded specialist metadata from each accepted payload while retaining the lossless payload as the manuscript source. New NPC responses add explicit cast tier and independent activity, while legacy payloads receive safe `unclassified`/null projections rather than invented content.

**Tech Stack:** TypeScript, Bun tests, existing Project Graph and Forge checkpoint modules.

**Spec:** `docs/superpowers/specs/2026-09-12-v047-blueprint-and-lore-quality-design.md`

## Global Constraints

- Work only on `test` and preserve completed Forge checkpoints.
- Generated specialist records remain proposals, not accepted canon.
- Never infer unsupported character knowledge, user history, or creative facts.
- Original Forge payloads remain lossless and continue deriving the same manuscript.
- Do not add provider calls or change the six-bundle resume protocol.
- Increase the visible version by exactly 0.01 after the release gate passes.

---

### Task 1: Typed specialist projection contract

**Files:**
- Modify: `src/contracts/projectGraph.ts`
- Modify: `src/lib/projectGraph/forgeCategoryRecords.ts`
- Modify: `src/lib/projectGraph/validation.ts`
- Test: `tests/projectGraph/forgeCategoryRecords.test.ts`
- Test: `tests/projectGraph/validation.test.ts`

**Interfaces:**
- Produces: `ForgeSpecialistProjectionV1`, attached as optional `projection` on `ForgeCategoryRecordV1`.
- Preserves: `payload`, stable record IDs, category IDs, proposal status, and reverse manuscript derivation.

- [x] **Step 1: Write failing projection tests**

Test that NPCs project name, cast tier, independent goal/activity; relationships project directional endpoints and dynamics; knowledge projects truth/knower/suspector boundaries; history and pressure project explicit temporal classes. Verify sparse legacy payloads remain valid without fabricated values.

- [x] **Step 2: Run focused tests and observe the missing projection failure**

Run: `bun test tests/projectGraph/forgeCategoryRecords.test.ts tests/projectGraph/validation.test.ts`

- [x] **Step 3: Implement the pure projection and closed validation**

Use only source fields already present. Unknown cast tier becomes `unclassified`; absent optional values become `null`; history is `historical`, pressure is `current`. Do not parse prose to invent facts.

- [x] **Step 4: Re-run focused tests**

Run: `bun test tests/projectGraph/forgeCategoryRecords.test.ts tests/projectGraph/validation.test.ts`

### Task 2: Specialist-aware new NPC generation

**Files:**
- Modify: `server.ts`
- Modify: `server/generation/forgeValidation.ts`
- Test: `tests/generation/forgeValidation.test.ts`

**Interfaces:**
- New provider fields: `castTier: "principal" | "roster"` and non-empty `independentActivity`.
- Legacy persisted sections remain readable because only newly accepted provider responses use the stricter boundary.

- [x] **Step 1: Write failing validation tests**

Require new NPC entries to carry a valid cast tier and independent activity; reject missing or invalid values with a specific message.

- [x] **Step 2: Run the focused test and observe failure**

Run: `bun test tests/generation/forgeValidation.test.ts`

- [x] **Step 3: Extend schema, validation, and Bundle 3 instructions**

Tell the provider to follow Blueprint principal/roster targets, give every NPC an offscreen activity independent of `{{user}}`, and create useful NPC-to-NPC relationships rather than only user-facing connections.

- [x] **Step 4: Re-run focused generation and checkpoint tests**

Run: `bun test tests/generation/forgeValidation.test.ts tests/projectGraph/forgeCategoryRecords.test.ts tests/projectGraph/forgeBuilds.test.ts`

### Task 3: Release documentation and verification

**Files:**
- Modify: `package.json`
- Modify: `src/version.ts`
- Modify: `CHANGELOG.md`
- Modify: `docs/roadmap/delivery-roadmap.md`
- Modify: `docs/roadmap/production-studio-blueprint.md`
- Modify: version tests

**Interfaces:**
- Produces: v0.57 with an honest M3.2 progress record.

- [x] **Step 1: Update release surfaces after implementation passes focused tests**

- [x] **Step 2: Run `bun test`, `bun run typecheck`, `npm.cmd run build`, and `git diff --check`**

- [x] **Step 3: Review for payload parity, migration safety, private data, and unsupported creative inference**

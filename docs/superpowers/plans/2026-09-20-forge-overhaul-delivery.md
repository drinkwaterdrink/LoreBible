# Forge overhaul delivery plan

**Implementation handoff:** start with the [R1 executable blueprint](2026-09-20-forge-r1-executable-blueprint.md), use the [exact prompt pack](../specs/2026-09-20-forge-production-prompt-pack.md), then follow [R2–R4 continuation contracts](2026-09-20-forge-r2-r4-handoff.md). Those documents refine the task-level choices below and govern where more specific. This document remains the overall sequence.

> Implement coherent slices with test-driven development and verification before completion. This is the expanded delivery sequence, not a claim that the overhaul has shipped. Execute natively; preserve existing work.

**Goal:** reliable, resumable, precisely specified creative jobs with editable versioned creative prompts.
**Architecture:** preserve six logical bundles and graph authority; introduce bounded jobs, shared schema validation and a prompt registry. Publish only committed validated results.
**Tech stack:** existing TypeScript, Bun, React, Express, ProjectRepository, model gateway.
**Spec:** [Forge overhaul and Prompt Studio](../specs/2026-09-20-forge-overhaul-and-prompt-studio.md).

## Global constraints

Work only on `test`; inspected baseline `4fd0389`, 0.62.0. Preserve IDs, accepted prose, user locks, connection profiles and completed checkpoints. No hidden creative fallback, automatic schema relaxation, fabricated runtime certification, or whole-server rewrite. Library and activation budgets stay independent. Schema/provenance constraints are not user-editable creative prompts. Assign release version after verified scope.

## Review focus

1. Provider accepts a fallback request but returns valid JSON of the wrong type.
2. Connection drops between saving a job and publishing its event.
3. Blueprint maxima contradict total minimum or omit existing material.
4. Global prompt edits during a paused project change resume semantics.
5. Existing saves with old Divergence boards use raw mode without accidentally selecting a stale take.

## Slice 1 — close the current failure path

Files: `server/model/gateway.ts`, `structuredOutput.ts`, `server/generation/forgeResume.ts`, `server.ts`; extract existing schema definitions to `server/generation/forgeSchemas.ts`. Tests: existing gateway, Forge validation/resume suites plus `tests/generation/forgeStructuredContract.test.ts`.

- [ ] Add fake-provider regressions asserting that schema text remains present after a schema-unsupported 400 followed by a successful fallback. Assert exact nested types for aesthetic/naming.
- [ ] Add cases for direct object, null, scalar, wrong arrays, missing nested fields, one valid singleton wrapper, two JSON documents, and truncation. Assert failures retain prior checkpoint and emit no accepted section.
- [ ] Run the new tests and record expected failures before changing code.
- [ ] Generate prompt contract and validator from the same schema source. Add a typed response validator callback inside the generation attempt boundary, before property access or sanitation. Allow only documented lossless wrapper normalization.
- [ ] Move document mutation/accepted section events after candidate validation and durable commit. Introduce safe diagnostics for observed type, required paths, effective format, finish reason and attempt timing.
- [ ] Assert bounded correction, cancellation, and no secret text in diagnostics; rerun focused and complete verification. Checkpoint: `fix: enforce Forge contracts through provider fallback`.

## Slice 2 — inventory allocation before generation

Files: `server/generation/forgeCoveragePlan.ts`, `forgeBlueprintBrief.ts`, existing Blueprint selection/planner modules; tests in `tests/generation/forgeCoveragePlan.test.ts` and `forgeBlueprintBrief.test.ts`.

- [ ] Reproduce label-only custom categories and synthetic catch-all inflation with a deterministic household fixture. Add impossible min/max constraints and omitted-category cases.
- [ ] Replace hidden deficit bucket with explicit accepted allocation. Print exact IDs, labels, ownership, min/target/max and already-completed coverage. Refuse contradictory locked ranges before dispatch.
- [ ] Count runtime entries consistently; exclude aesthetic/naming singleton guides. Verify earlier NPC/location entries are read-only context, not Bundle 5 output obligations.
- [ ] Verify 40k allowance partitions useful coverage without requiring padding, changing runtime budget, or ignoring maxima. Checkpoint: `feat: plan explicit Forge category inventory`.

## Slice 3 — durable specialist jobs

Files: `src/contracts/projectGraph.ts`, `src/lib/projectGraph/forgeBuilds.ts`, `server/generation/forgeProjectCoordinator.ts`; create `server/generation/forgeJobPlan.ts` and `forgeJobRunner.ts`. Extend existing repository validators/commands alongside their contracts, not a parallel save store.

- [ ] Test deterministic job identity and ownership; rich casts and supplemental categories produce bounded jobs, singletons one owner, omitted categories none.
- [ ] Add versioned optional ledger to existing build records: job ID, fingerprint, prompt hash, status, validated result, attempt history and dependencies. Old completed bundles remain unchanged.
- [ ] Persist provisional successful jobs transactionally. Restart after job two fails reuses job one. Aggregate by explicit slots/deterministic order and reject duplicate IDs or owners.
- [ ] Add disconnect-after-commit, reload, cancel, stale graph revision, changed Blueprint, changed model and changed prompt cases. Confirm only incomplete compatible jobs rerun.
- [ ] Enforce one shared attempt/deadline policy. Truncation leads to smaller replacement jobs; schema failure gets one bounded correction; no nested exponential retry multiplication.
- [ ] Verify logical step-by-step mode still stops after one bundle; incompatible large single-request plans require a visible mode choice. Checkpoint: `feat: resume bounded Forge specialist jobs`.

## Slice 4 — refined prompts and context compiler

Files: `src/lib/systemPrompt.ts`, `src/lib/creativeConstitution.ts`, shared context builder used by `server.ts`; create `server/generation/prompts/registry.ts` and `compilePrompt.ts`. Migrate call sites incrementally, beginning with Forge.

- [ ] Inventory every model call and record stable feature ID, current instructions, input placeholders, schema and consumer. Mark deterministic Blueprint recommendations as such.
- [ ] Snapshot current effective requests for comparison. Add regression assertions excluding global negation bans, forced recursion and universal one-liner constraints from new specialist missions.
- [ ] Implement the five-layer compiler from the spec: protected protocol, feature mission, creative profile, job/canon data, correction. Exact schema always survives provider fallback.
- [ ] Add category missions and independently test player-history protection, name-pool noncanon, unresolved power, temporal ownership, public/private knowledge, everyday life and accepted-name preservation.
- [ ] Detect conflicting Spark/Physics accepted constraints before dispatch; persist explicit resolution. Scope context by dependency IDs while retaining relevant canon boundaries and identity registry.
- [ ] Verify no chain-of-thought request/storage is introduced, no hidden model changes, and request hashes are deterministic. Checkpoint: `feat: compile specialist creative prompts`.

## Slice 5 — Settings Prompt Studio

Files: create `src/contracts/promptProfile.ts`, `src/components/PromptStudio.tsx`; extend actual Settings host and persistence modules after registry inventory identifies all current hosts. Expose a control only once its generation consumer is wired.

- [ ] Test global/project precedence, missing variables, excessive text, unknown feature IDs, malformed import, reset, duplicate profile and upgrade retention.
- [ ] Implement versioned profiles and strict placeholder substitution without evaluation. Persist resolved profile hash/snapshot per build; reject silent mid-build replacement.
- [ ] Build feature list, purpose, editable creative text, protected requirements, diff, reset, save, prompt-only import/export and explicit private-content preview. Save performs no generation.
- [ ] Add isolated test-preview action with explicit model/scope and no manuscript mutation. Redact credentials from all previews/receipts.
- [ ] Test narrow-screen editing, keyboard focus, cancellation, unsaved changes and controls above mobile browser/footer obstruction. Checkpoint: `feat: expose versioned creative prompt profiles`.

## Slice 6 — progress, raw idea and end-to-end regression

Files: `src/App.tsx`, Spark/Physics/Forge components, project persistence and request contracts; extend existing component and generation tests.

- [ ] Add explicit `raw` versus `selected_take` source mode; test raw mode with stale boards/selected IDs, save/load, navigation, generation fingerprints and optional return to Divergence.
- [ ] Add “Use my original idea” path through Spark analysis to Physics without generating or fabricating a take. Never use `takes[0]` as a raw-mode fallback.
- [ ] Show current specialist, saved job counts, recovery reason, elapsed time and effective prompt profile. Expose planned/actual category counts and library versus runtime budgets separately.
- [ ] Run a deterministic rich fixture with fake schema rejection, one failed subjob, reload, then completion. Assert exact retained categories/IDs, no duplicate accepted events, atomic checkpoint and bounded retry count.
- [ ] Benchmark real selected providers only with explicit scope/cost awareness; report measured first-pass success, retry waste and elapsed components. Do not claim guaranteed speed or provider certification from offline tests.
- [ ] Checkpoint verified changes and update roadmap/evidence honestly. Continue canon acceptance and Retrieval Architect after this stabilization sequence.

## Verification for every code slice

Run focused affected suites separately, then `bun test`, `bun run typecheck`, `bun run build`, `git diff --check`. Preserve exact output/result counts. Run mobile interaction checks for UI slices. Do not repurpose a structural pass as runtime-observed generation quality. Review the complete diff for checkpoint compatibility and forbidden silent creative changes before committing; do not push without an applicable request.

## Present deliverable

Only investigation/design/roadmap documentation is delivered in this turn. The existing targeted tests were run as a baseline, not proof that these new requirements pass. No product code, defaults, saved projects, provider settings or prompt behavior was changed.

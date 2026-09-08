# Truthful Generation Failures and App Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship LoreBible v0.31 with a visible version label and truthful, state-preserving failures across every production creative-generation path.

**Architecture:** A shared failure contract normalizes server errors and is consumed by both JSON and SSE routes. Client services preserve structured failure metadata, while creative fallbacks are removed from normal production paths and local deterministic audits are explicitly labeled.

**Tech Stack:** TypeScript, React 19, Express, Bun test, Vite, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-09-08-truthful-generation-failures-and-version.md`

## Global Constraints

- Display version is exactly `v0.31`; package version is exactly `0.31.0`.
- Future user-visible app updates advance the display version by exactly `0.01`.
- Normal generation never returns deterministic authored content after a missing connection or model failure.
- Failed generation preserves previously accepted project content.
- Normal generation never silently switches away from the selected model ID.
- API error payloads never expose API keys or raw provider response bodies.
- Local deterministic audits identify themselves with `analysisSource: "local_heuristic"`.

---

### Task 1: Shared version and generation-failure contracts

**Files:**
- Create: `src/version.ts`
- Create: `src/contracts/generationFailure.ts`
- Create: `server/generation/failureResponse.ts`
- Modify: `src/contracts/generationProgress.ts`
- Modify: `package.json`
- Test: `tests/contracts/generationFailure.test.ts`
- Test: `tests/contracts/version.test.ts`

**Interfaces:**
- Produces: `APP_VERSION = "0.31"`, `GenerationFailurePayload`, `GenerationRequestError`, `normalizeGenerationFailure(error, context)`, and `sendGenerationFailure(res, error, context)`.
- Produces: SSE terminal errors with `code`, `action`, `retryable`, and optional `retryAfterMs`.

- [ ] **Step 1: Write failing contract and version tests** covering safe error normalization, gateway-code preservation, unknown-error redaction, SSE error parsing, and package/display version agreement.
- [ ] **Step 2: Run `bun test tests/contracts/generationFailure.test.ts tests/contracts/version.test.ts tests/contracts/generationProgress.test.ts`** and confirm failures describe the missing modules and fields.
- [ ] **Step 3: Implement the minimal contracts and server response helper** with exhaustive error-code-to-action mapping and no raw-error serialization.
- [ ] **Step 4: Set `package.json` to `0.31.0` and run the focused tests** until they pass.
- [ ] **Step 5: Commit the independently testable contract layer** with `git add` and `git commit -m "feat: add truthful generation failure contract"`.

### Task 2: Remove silent creative fallbacks from Spark and Divergence

**Files:**
- Modify: `server.ts`
- Modify: `src/services/geminiService.ts`
- Test: `tests/generation/truthfulGeneration.test.ts`
- Test: `tests/client/geminiService.test.ts`

**Interfaces:**
- Consumes: `normalizeGenerationFailure`, `sendGenerationFailure`, and `GenerationRequestError` from Task 1.
- Produces: Spark, Divergence, and single-angle routes that require a usable configured model and never call deterministic generators in normal mode.

- [ ] **Step 1: Write failing source-boundary and client tests** proving absent/model-failed paths return structured errors and the client preserves `code`, `action`, and retry metadata.
- [ ] **Step 2: Run the focused tests** and confirm they fail against the existing deterministic fallbacks and plain `Error` client behavior.
- [ ] **Step 3: Remove production calls to `generateDeterministicSparkParse` and `generateDeterministicDivergenceTakes`**, require an explicit selected model or explicit environment Gemini model, and send normalized JSON/SSE failures.
- [ ] **Step 4: Replace automatic environment Gemini model pooling with one explicit `GEMINI_MODEL`** and bounded same-model retry behavior.
- [ ] **Step 5: Implement shared client response parsing** so JSON and SSE consumers throw `GenerationRequestError` without discarding structured details.
- [ ] **Step 6: Run focused and full tests** and commit with `git commit -m "fix: make spark and divergence failures truthful"`.

### Task 3: Make Forge and Refine mutations transactional

**Files:**
- Modify: `server.ts`
- Modify: `src/services/geminiService.ts`
- Modify: `src/components/RefineStage.tsx`
- Test: `tests/generation/truthfulGeneration.test.ts`
- Test: `tests/client/geminiService.test.ts`

**Interfaces:**
- Consumes: shared server/client failure contracts from Tasks 1-2.
- Produces: Forge and Refine generation endpoints that either return validated model output or a truthful failure; no placeholder mutation is returned as success.

- [ ] **Step 1: Add failing tests** for Forge bundle failure, entry reroll, variants, entry push, and section regeneration, including assertions that no deterministic or stock placeholder result is returned.
- [ ] **Step 2: Run the focused tests** and verify each existing fallback is detected.
- [ ] **Step 3: Remove Forge and Refine creative fallback branches**, route every operation through the selected model gateway, and validate required response fields before success.
- [ ] **Step 4: Ensure Refine only calls `onUpdateDocument` after a successful response** and displays the structured error while retaining history and current content.
- [ ] **Step 5: Run focused and full tests** and commit with `git commit -m "fix: preserve work when forge or refine generation fails"`.

### Task 4: Separate model generation from local analysis tools

**Files:**
- Modify: `server.ts`
- Modify: `src/services/geminiService.ts`
- Modify: `src/types.ts`
- Modify: `src/components/refine/TestBenchEditor.tsx`
- Modify: `src/components/refine/MarginInspector.tsx`
- Test: `tests/generation/truthfulGeneration.test.ts`
- Test: `tests/client/geminiService.test.ts`

**Interfaces:**
- Produces: generated procedural rolls and Test Bench turns that fail truthfully.
- Produces: consistency, voice, gravity, and opening audit results carrying `analysisSource: "local_heuristic" | "model"`.

- [ ] **Step 1: Write failing tests** for procedural-roll and Test Bench model failures plus source labels on deterministic audits.
- [ ] **Step 2: Run focused tests** and confirm fallback success responses and missing labels are detected.
- [ ] **Step 3: Remove stock generated replies and procedural-roll fallbacks from normal endpoints** and route them through the selected model.
- [ ] **Step 4: Add analysis-source fields to legitimate local audit responses and render a small source label** in the relevant Refine surfaces.
- [ ] **Step 5: Run focused and full tests** and commit with `git commit -m "fix: distinguish local audits from model generation"`.

### Task 5: Version UI, actionable failures, changelog, and release verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/SidebarRail.tsx`
- Modify: `src/components/GenerationActivity.tsx`
- Modify: `src/components/DivergenceStage.tsx`
- Modify: `CHANGELOG.md`
- Modify: `docs/roadmap/README.md`
- Test: `tests/components/generationActivity.test.tsx`
- Test: `tests/components/versionDisplay.test.tsx`

**Interfaces:**
- Consumes: `APP_VERSION` and structured client failures.
- Produces: a desktop/mobile `v0.31` label and Retry/Connections guidance on generation failures.

- [ ] **Step 1: Write failing component tests** for the desktop/mobile version label and actionable failure rendering.
- [ ] **Step 2: Run component tests** and confirm the version/action controls are absent.
- [ ] **Step 3: Render `v0.31` beside both brand treatments** and add accessible Retry and Open Connections actions without crowding mobile controls.
- [ ] **Step 4: Move current Unreleased notes into a `v0.31 — 2026-09-08` release section**, document truthful failure behavior, and mark M0.3 complete with M0.4 as next.
- [ ] **Step 5: Run `bun test`, `bun run typecheck`, and `bun run build`**; record exact results and any pre-existing warnings.
- [ ] **Step 6: Review the final diff for secrets, unrelated changes, and accidental generated artifacts**, then commit with `git commit -m "release: ship LoreBible v0.31"`.
- [ ] **Step 7: Push the verified commits to the configured GitHub remote** with `git push`.

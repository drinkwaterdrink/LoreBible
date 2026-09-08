# Gemini Streaming Reliability and Mobile Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure Gemini AI Studio profiles, make compatible-provider generation observable and resistant to false two-minute failures, and preserve/reach the Spark action on Android-sized browsers.

**Architecture:** Extend the existing OpenAI-compatible selected-model gateway with provider capabilities, a bounded streaming parser, and activity-aware deadlines; route saved Gemini profiles through Google's compatibility API while leaving environment Gemini on the native SDK path. Keep UI events provider-agnostic, store only a small versioned Spark draft in browser storage, and make the Stage 1 footer safe-area responsive.

**Tech Stack:** TypeScript 5.8, React 19, Express 4, Bun test, Server-Sent Events, Google Gemini OpenAI compatibility API, Windows DPAPI.

**Spec:** `docs/superpowers/specs/2026-09-07-gemini-streaming-reliability-and-mobile-drafts-design.md`

## Global Constraints

- No API key, prompt, completion, or reasoning text may enter normal logs or browser storage.
- Provider reasoning is displayed only when explicitly returned; active requests say they are waiting rather than declaring it unavailable.
- Selected models never silently change. Only the existing environment-Gemini pool may fail over between models.
- Cancellation never retries and must remain distinct from first-event, inactivity, and overall timeout failures.
- Strict JSON schema remains the default; schema fallback occurs only after a provider explicitly rejects that format or returns invalid structured output.
- Exact provider usage is distinguished from local output estimates.
- No dependency additions are required.
- Real paid provider calls are not made during automated verification.

---

### Task 1: Provider capabilities and Gemini AI Studio profiles

**Files:**
- Modify: `server/secrets/types.ts`
- Modify: `src/lib/modelCatalog.ts`
- Modify: `server/routes/connections.ts`
- Modify: `server/model/gateway.ts`
- Modify: `src/components/SettingsModal.tsx`
- Modify: `tests/routes/connections.test.ts`
- Modify: `tests/model/gateway.test.ts`
- Modify: `tests/components/settingsModal.test.tsx`

**Interfaces:**
- Produces: `DEFAULT_PROVIDER_BASE_URLS.gemini = "https://generativelanguage.googleapis.com/v1beta/openai"`.
- Produces: a non-empty Gemini curated catalog accepted by `getCatalogForProvider("gemini")`.
- Produces: saved Gemini profiles that use the same `ModelGateway.generate(request)` interface as NanoGPT/OpenRouter.
- Consumes: existing DPAPI-backed `ProfileStore` and `/api/connections` routes.

- [ ] **Step 1: Add failing connection-route tests**

Add route cases that create a Gemini profile, assert the redacted profile uses the compatibility base URL, test it against a full `{ object: "list", data: [...] }` model response, and verify `/models` marks curated availability while retaining a custom Gemini ID.

- [ ] **Step 2: Run the route tests and verify the expected failure**
Run: `bun test tests/routes/connections.test.ts`

Expected: the Gemini test reports zero models or bypasses the external model request, proving saved Gemini profiles are not implemented.

- [ ] **Step 3: Add failing gateway and component tests**

Add a gateway fixture for a saved Gemini profile that returns a valid OpenAI-compatible structured completion. Assert the request reaches `/chat/completions`, uses Bearer authentication without exposing the credential in returned metadata, and retains the selected Gemini model. Render Settings and assert **Gemini AI Studio** is enabled rather than disabled.

- [ ] **Step 4: Run the focused tests and verify failure**

Run: `bun test tests/model/gateway.test.ts tests/components/settingsModal.test.tsx`

Expected: the gateway throws the native-adapter rejection and the provider option is disabled.

- [ ] **Step 5: Implement Gemini compatibility profiles**

Change the server-owned base URL, add curated Gemini structured-output models, remove the gateway rejection for saved Gemini profiles, make Gemini `/test` and `/models` use Bearer-authenticated compatibility endpoints, and enable the Settings option with accurate copy. Keep `environment-gemini` read-only and native.

- [ ] **Step 6: Run the Task 1 tests and typecheck**

Run: `bun test tests/routes/connections.test.ts tests/model/gateway.test.ts tests/components/settingsModal.test.tsx`

Run: `bun run typecheck`

Expected: all pass.

---

### Task 2: Streaming parser, provider activity deadlines, and adaptive retry

**Files:**
- Create: `server/model/providerStream.ts`
- Create: `server/model/providerTimeouts.ts`
- Modify: `src/contracts/generation.ts`
- Modify: `src/contracts/generationProgress.ts`
- Modify: `server/model/gateway.ts`
- Modify: `server/model/reasoning.ts`
- Modify: `server.ts`
- Create: `tests/model/providerStream.test.ts`
- Create: `tests/model/providerTimeouts.test.ts`
- Modify: `tests/model/gateway.test.ts`
- Modify: `tests/model/reasoning.test.ts`

**Interfaces:**
- Produces: `consumeOpenAICompatibleStream(response, handlers, signal): Promise<ProviderStreamResult>`.
- Produces: `ProviderStreamHandlers` with `onContentDelta`, `onReasoningDelta`, `onUsage`, and `onProviderActivity` callbacks.
- Produces: deadline policy `{ firstEventMs: 150000, inactivityMs: 60000, overallMs: 480000 }` and typed timeout reasons.
- Extends: `GenerationRequest` with optional activity callbacks and stage-specific `maxOutputTokens`.
- Consumes: existing `ModelGateway.generate`, request cancellation, and generation activity SSE events.

- [ ] **Step 1: Write failing fragmented-stream tests**

Use literal SSE fixtures split across arbitrary byte boundaries. Assert content/reasoning deltas are collected in order, usage and finish reason are preserved, `[DONE]` terminates once, malformed unknown fields are ignored, and an incomplete JSON data frame produces a sanitized provider error.

- [ ] **Step 2: Run the stream test and verify module-not-found failure**

Run: `bun test tests/model/providerStream.test.ts`

Expected: failure because `server/model/providerStream.ts` does not exist.

- [ ] **Step 3: Implement the minimal bounded stream parser**

Parse UTF-8 chunks with `TextDecoder`, retain an unfinished frame buffer between reads, accept OpenAI-compatible `choices[0].delta.content`, `reasoning`, and `reasoning_content`, accumulate bounded final content/reasoning, forward provider activity only on upstream bytes/events, and cancel the reader in `finally`.

- [ ] **Step 4: Run the stream test to green**

Run: `bun test tests/model/providerStream.test.ts`

Expected: pass.

- [ ] **Step 5: Write failing deadline tests**

Using short injected test durations, assert no first event produces `FIRST_EVENT_TIMEOUT`, an event resets the inactivity deadline, silence after an event produces `INACTIVITY_TIMEOUT`, continuous activity still reaches `OVERALL_TIMEOUT`, and caller abort produces `CLIENT_DISCONNECTED` without a timeout classification.

- [ ] **Step 6: Run the deadline tests and verify failure**

Run: `bun test tests/model/providerTimeouts.test.ts`

Expected: failure because the deadline coordinator does not exist.

- [ ] **Step 7: Implement deadline coordination**

Create one request-scoped abort controller linked to the caller signal. Arm the 150-second first-event and 8-minute overall timers, replace the first-event timer with a renewable 60-second inactivity timer on upstream activity, and map the recorded cause to a typed `ModelGatewayError`.

- [ ] **Step 8: Add failing gateway behavior tests**

Assert NanoGPT sends `stream: true`, `reasoning_content_compat: true`, and a provider-compatible reasoning configuration; Gemini sends `stream: true` and `reasoning_effort`; a stream rejection falls back once to non-stream mode; explicit schema rejection retries as `json_object`; a timeout does not downgrade schema; output limits are stage-specific; and sanitized diagnostics omit fixture prompts, answers, reasoning, and authorization values.

- [ ] **Step 9: Run gateway tests and verify the new assertions fail**

Run: `bun test tests/model/gateway.test.ts tests/model/reasoning.test.ts`

Expected: the current non-streaming request and incomplete top-level reasoning-token normalization fail the assertions.

- [ ] **Step 10: Implement streaming gateway and reasoning normalization**

Use the stream parser and deadline coordinator from this task. Add provider-specific optional fields without changing shared content/schema semantics, normalize both `completion_tokens_details.reasoning_tokens` and top-level `usage.reasoning_tokens`, and preserve one non-stream fallback for a model that explicitly rejects streaming.

- [ ] **Step 11: Implement adaptive selected-model retry**

Carry timeout kind and reasoning effort into retry progress. On a retryable timeout, reduce High to Medium or Medium to Low; do not reduce Low. Preserve selected model and report the changed strategy through existing server-to-client progress events.

- [ ] **Step 12: Run all Task 2 tests and typecheck**

Run: `bun test tests/model/providerStream.test.ts tests/model/providerTimeouts.test.ts tests/model/gateway.test.ts tests/model/reasoning.test.ts`

Run: `bun run typecheck`

Expected: all pass.

---

### Task 3: Live activity semantics and connection-test clarity

**Files:**
- Modify: `src/contracts/generationProgress.ts`
- Modify: `src/lib/reasoningBuffer.ts`
- Modify: `src/components/GenerationActivity.tsx`
- Modify: `src/services/sseStream.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsModal.tsx`
- Modify: `tests/contracts/generationProgress.test.ts`
- Modify: `tests/client/sseStream.test.ts`
- Modify: `tests/components/generationActivity.test.tsx`

**Interfaces:**
- Consumes: Task 2 content/reasoning/usage/provider-activity callbacks.
- Produces: typed `provider_activity` and optional `output_delta` events.
- Produces: UI state that distinguishes server heartbeat, provider activity, exact usage, and local output estimate.

- [ ] **Step 1: Add failing contract and SSE-client tests**

Assert provider activity timestamps and output deltas parse independently from heartbeats, fragmented browser SSE input is handled, and events arriving after cancellation/terminal completion do not mutate activity state.

- [ ] **Step 2: Run the contract/client tests and verify failure**

Run: `bun test tests/contracts/generationProgress.test.ts tests/client/sseStream.test.ts`

Expected: unknown event types are rejected because these events are not defined.

- [ ] **Step 3: Add failing activity component tests**

Render an active empty-reasoning request and assert **Waiting for provider reasoning** appears. Render a provider activity timestamp and output estimate, assert the estimate is labeled **estimated**, and render a completed no-reasoning request to assert **Reasoning unavailable** appears only then.

- [ ] **Step 4: Run the component test and verify failure**

Run: `bun test tests/components/generationActivity.test.tsx`

Expected: the active component currently declares reasoning unavailable.

- [ ] **Step 5: Implement event plumbing and activity copy**

Forward Task 2 callbacks through the existing Express SSE session, parse them in the client, update run-scoped activity state, show last provider activity separately from server connection, display exact usage when supplied, and label character-derived output counts as estimates.

- [ ] **Step 6: Update connection-test result copy**

Change the successful result to: `Key accepted · N provider models reported. This checks authentication and model listing, not generation speed or structured output.`

- [ ] **Step 7: Run Task 3 tests and typecheck**

Run: `bun test tests/contracts/generationProgress.test.ts tests/client/sseStream.test.ts tests/components/generationActivity.test.tsx tests/components/settingsModal.test.tsx`

Run: `bun run typecheck`

Expected: all pass.

---

### Task 4: Mobile-safe action footer and Spark draft recovery

**Files:**
- Create: `src/lib/sparkDraft.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/SparkStage.tsx`
- Modify: `tests/components/sparkStage.test.tsx`
- Create: `tests/lib/sparkDraft.test.ts`

**Interfaces:**
- Produces: `readSparkDraft(storage): string` and `writeSparkDraft(storage, text): void` with schema version 1 and a bounded text length.
- Consumes: existing `sparkText`, `setSparkText`, New-scenario reset, and saved-project load actions.

- [ ] **Step 1: Write failing draft persistence tests**

Using an in-memory `Storage` implementation, assert valid text round-trips, empty text removes the record, malformed/unknown-version/oversized records return an empty string, and the stored record contains only `version`, `sparkText`, and `updatedAt`.

- [ ] **Step 2: Run the draft tests and verify module-not-found failure**

Run: `bun test tests/lib/sparkDraft.test.ts`

Expected: failure because `src/lib/sparkDraft.ts` does not exist.

- [ ] **Step 3: Implement bounded versioned draft storage**

Use key `lore_bible_active_spark_draft_v1`, version `1`, and a 100,000-character read/write bound. Return an empty string on storage exceptions or invalid JSON. Remove the key for empty text.

- [ ] **Step 4: Run draft tests to green**

Run: `bun test tests/lib/sparkDraft.test.ts`

Expected: pass.

- [ ] **Step 5: Add failing Spark footer component tests**

Render Stage 1 and assert the action footer has a stable test identifier, mobile column/full-width behavior, safe-area bottom padding, and the action keeps the existing `proceed-to-divergence-btn` identifier.

- [ ] **Step 6: Run the component test and verify failure**

Run: `bun test tests/components/sparkStage.test.tsx`

Expected: current one-row footer lacks the required responsive/safe-area behavior.

- [ ] **Step 7: Implement responsive footer and App draft lifecycle**

Initialize `sparkText` from `readSparkDraft(window.localStorage)`, debounce `writeSparkDraft` after edits, clear it during explicit New/Clear, and update it when loading a saved project. Stack the footer below the small breakpoint, make the button `w-full sm:w-auto`, add `paddingBottom: max(0.75rem, env(safe-area-inset-bottom))`, and use a dynamic viewport height on the application shell.

- [ ] **Step 8: Run Task 4 tests and typecheck**

Run: `bun test tests/lib/sparkDraft.test.ts tests/components/sparkStage.test.tsx`

Run: `bun run typecheck`

Expected: all pass.

---

### Task 5: Integrated verification and desktop restart

**Files:**
- Modify only if verification exposes a tested regression in files listed above.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a verified production build and running local server.

- [ ] **Step 1: Run the complete automated suite**

Run: `bun test`

Expected: all tests pass without unhandled errors.

- [ ] **Step 2: Run static and production checks**

Run: `bun run typecheck`

Run: `bun run build`

Expected: both pass.

- [ ] **Step 3: Run mocked browser verification**

At desktop and 320, 360, 390, and 412 pixel viewport widths, verify Connections scrolling, enabled Gemini provider UI, mobile action visibility, exact Spark recovery after reload, active waiting-for-reasoning copy, provider activity updates, and cancellation using mock/local responses only.

- [ ] **Step 4: Restart the desktop launcher/server**

Stop only the LoreBible process bound to port 3000 after resolving its exact PID, then start the existing launcher hidden so the desktop shortcut continues opening the updated application.

- [ ] **Step 5: Verify the live app**

Check `/api/health`, load `http://localhost:3000/`, confirm the updated UI is served, and report that real NanoGPT/GLM and Gemini generation still require the user's own key-driven test unless a paid probe was separately authorized.

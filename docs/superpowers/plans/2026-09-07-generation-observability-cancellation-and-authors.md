# Generation Observability, Cancellation, Reasoning, and Authors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Anchor Scribing, Divergence, and Forge truthful progress and cancellation, expose bounded provider-returned reasoning, fix stalled response-body timeouts, and assign Auto author flavor per Divergence branch.

**Architecture:** Introduce small shared progress/SSE contracts and a reusable React activity component, then propagate `AbortSignal` through client services, Express request lifetimes, retry helpers, Gemini, and the selected-model gateway. Convert Divergence to structured SSE while extending Forge SSE, and keep Anchor Scribing as a cancellable single JSON call. Normalize reasoning and usage once at provider boundaries so UI components remain provider-agnostic.

**Tech Stack:** TypeScript 5.8, React 19, Express 4, `@google/genai` 2.4, Bun test, Server-Sent Events.

**Spec:** `docs/superpowers/specs/2026-09-07-generation-progress-cancellation-reasoning-and-models-design.md`

## Global Constraints

- Never fabricate reasoning, token counts, stage completion, or percentage progress.
- Elapsed time is client-derived; SSE heartbeats only prove the server connection remains alive.
- Reasoning is opt-in, collapsed by default, rendered as plain text, capped at 50,000 characters, clearable, session-only, and excluded from project saves and normal logs.
- Cancellation stops active provider work and future retries, preserves previous Divergence angles and completed Forge sections, and is not presented as an error.
- A stream emits exactly one terminal event: `done`, `cancelled`, or `error`.
- Provider timeout remains active until the complete body has been consumed.
- User cancellation and provider timeout are distinct typed errors.
- API keys and authorization headers never enter events, errors, reasoning, or logs.
- No dependency additions are required.

## File Structure

- Create `src/contracts/generationProgress.ts`: provider-agnostic event/usage/reasoning types and guards.
- Create `src/services/sseStream.ts`: fragmented SSE parser and terminal handling.
- Create `src/components/GenerationActivity.tsx`: shared progress, elapsed time, reasoning, and cancel UI.
- Create `src/lib/reasoningBuffer.ts`: shared bounded reasoning accumulator.
- Create `server/model/reasoning.ts`: normalize provider reasoning and usage.
- Create `server/generation/requestLifecycle.ts`: request abort linkage, abortable delays, heartbeat, and terminal writer.
- Modify `src/contracts/generation.ts`: add signal/reasoning fields to gateway contracts.
- Modify `server/model/gateway.ts`: combined cancellation/timeout, full-body timeout, reasoning extraction.
- Modify `server.ts`: signal-aware Gemini/retries, Divergence SSE, per-branch author selection, extended Forge SSE.
- Modify `src/services/geminiService.ts`: cancellable calls and shared SSE consumption.
- Modify `src/App.tsx`: task controllers/run IDs and progress state.
- Modify `src/components/SparkStage.tsx`: Stop Scribing/activity UI.
- Modify `src/components/DivergenceStage.tsx`: progress/reasoning/cancel UI.
- Modify `src/components/ForgeStage.tsx`: bundle progress/reasoning/cancel UI.
- Create `tests/contracts/generationProgress.test.ts`.
- Create `tests/client/sseStream.test.ts`.
- Create `tests/components/generationActivity.test.tsx`.
- Create `tests/model/reasoning.test.ts`.
- Create `tests/generation/requestLifecycle.test.ts`.
- Modify `tests/model/gateway.test.ts`.
- Create `tests/lib/authorProfiles.test.ts`.
- Add focused route/service tests alongside existing tests or in `tests/routes/generation.test.ts` after extracting injectable route handlers.

---

### Task 1: Define progress, usage, reasoning, and SSE contracts

**Files:**
- Create: `src/contracts/generationProgress.ts`
- Modify: `src/contracts/generation.ts`
- Test: `tests/contracts/generationProgress.test.ts`

**Interfaces:**
- Produces: `GenerationTask`, `GenerationPhase`, `GenerationUsage`, `GenerationProgressEvent`, `GenerationTerminalEvent`, `GenerationStreamEvent`.
- Produces: `GenerationRequest.signal?: AbortSignal`.
- Produces: `GenerationProvenance.reasoning?: string` and `usage.reasoningTokens?: number`.

- [ ] **Step 1: Write failing contract tests**

Test parsing of valid progress/usage/reasoning events and rejection of unknown tasks/phases or non-string reasoning.

```ts
expect(parseGenerationStreamEvent({
  type: "progress",
  task: "forge",
  phase: "forge_bundle",
  label: "Forging bundle 2 of 6",
  completedSteps: 1,
  totalSteps: 6,
})).toMatchObject({ task: "forge", totalSteps: 6 });
```

- [ ] **Step 2: Run and verify failure**

Run: `bun test tests/contracts/generationProgress.test.ts`

Expected: FAIL because the contract module does not exist.

- [ ] **Step 3: Implement exact discriminated unions and parser**

Use `type` as the SSE discriminator:

```ts
export type GenerationStreamEvent =
  | ({ type: "progress" } & GenerationProgressEvent)
  | { type: "reasoning"; task: GenerationTask; delta: string; complete?: boolean }
  | { type: "usage"; task: GenerationTask; usage: GenerationUsage }
  | { type: "heartbeat"; task: GenerationTask }
  | { type: "section"; task: "forge"; key: string; data: unknown }
  | { type: "done"; task: GenerationTask; result: unknown }
  | { type: "cancelled"; task: GenerationTask; message: string }
  | { type: "error"; task: GenerationTask; message: string; code?: string };
```

The parser validates only fields used by the client and throws on malformed terminal events.

- [ ] **Step 4: Run contract tests and typecheck**

Run: `bun test tests/contracts/generationProgress.test.ts`

Run: `bun run typecheck`

Expected: both pass.

- [ ] **Step 5: Commit the contract unit**

```powershell
git add src/contracts/generationProgress.ts src/contracts/generation.ts tests/contracts/generationProgress.test.ts
git commit -m "feat: define generation progress contracts"
```

If Git metadata is absent, record the checkpoint and continue without claiming a commit.

---

### Task 2: Normalize provider-returned reasoning safely

**Files:**
- Create: `src/lib/reasoningBuffer.ts`
- Create: `server/model/reasoning.ts`
- Test: `tests/model/reasoning.test.ts`

**Interfaces:**
- Produces: `normalizeProviderReasoning(payload: unknown): { text?: string; reasoningTokens?: number }`.
- Produces in `src/lib/reasoningBuffer.ts`: `appendBoundedReasoning(current: string, delta: string, limit?: number): { text: string; truncated: boolean }`.
- Consumed by: selected-model gateway and Gemini adapter.

- [ ] **Step 1: Write fixture-based failing tests**

Cover OpenRouter-compatible shapes such as `message.reasoning`, `message.reasoning_content`, content parts with reasoning types, reasoning details text, and `usage.completion_tokens_details.reasoning_tokens`. Cover missing, malformed, HTML-looking text, and over-limit content.

```ts
expect(normalizeProviderReasoning({
  choices: [{ message: { reasoning: "considering alternatives" } }],
  usage: { completion_tokens_details: { reasoning_tokens: 42 } },
})).toEqual({ text: "considering alternatives", reasoningTokens: 42 });
```

- [ ] **Step 2: Run and verify failure**

Run: `bun test tests/model/reasoning.test.ts`

Expected: FAIL because the normalizer does not exist.

- [ ] **Step 3: Implement defensive extraction and the 50,000-character cap**

Create `src/lib/reasoningBuffer.ts` for the accumulator and import it into the provider normalizer. Return plain strings only. Do not interpret Markdown/HTML and do not throw for unknown shapes. The truncation helper keeps the first 50,000 characters and exposes a boolean so the UI can display `Reasoning truncated for display.`

- [ ] **Step 4: Run reasoning tests**

Run: `bun test tests/model/reasoning.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the reasoning-normalization unit**

```powershell
git add server/model/reasoning.ts src/lib/reasoningBuffer.ts tests/model/reasoning.test.ts
git commit -m "feat: normalize provider reasoning"
```

---

### Task 3: Fix gateway cancellation and full-body timeout

**Files:**
- Modify: `server/model/gateway.ts`
- Modify: `tests/model/gateway.test.ts`

**Interfaces:**
- Consumes: `GenerationRequest.signal?: AbortSignal` and `normalizeProviderReasoning`.
- Produces: `ModelGatewayError` with `CLIENT_DISCONNECTED` for caller abort and `REQUEST_TIMEOUT` for internal timeout.
- Produces: response provenance containing bounded reasoning and reasoning-token usage.

- [ ] **Step 1: Write failing timeout and cancellation tests**

Create a response with a `ReadableStream` whose headers resolve immediately and whose body never closes; use a 25-50 ms timeout and assert `REQUEST_TIMEOUT`. Add a caller-controller test that aborts before the timeout and asserts `CLIENT_DISCONNECTED`. Add a response fixture proving reasoning reaches provenance.

```ts
const stalled = new ReadableStream({ start() {} });
const fetchImpl = async () => new Response(stalled, { status: 200 });
await expect(gateway.generate({ ...request, timeoutMs: 25 }))
  .rejects.toMatchObject({ code: "REQUEST_TIMEOUT" });
```

- [ ] **Step 2: Run gateway tests and verify failure**

Run: `bun test tests/model/gateway.test.ts`

Expected: the stalled-body test hangs or exceeds its assertion window, and caller cancellation is unsupported.

- [ ] **Step 3: Combine caller and timeout signals while retaining cause**

Keep the timeout active across `fetch` and `response.json()`. Track `timedOut` separately, link `request.signal` to the internal controller, and clear listeners/timer only after body consumption in one outer `finally`.

```ts
let timedOut = false;
const controller = new AbortController();
const onCallerAbort = () => controller.abort(request.signal?.reason);
request.signal?.addEventListener("abort", onCallerAbort, { once: true });
const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, Math.max(1000, request.timeoutMs));
```

For tests, either preserve the 1000 ms floor with fake timers or extract a tested timeout helper that permits a short injected duration. Do not weaken the production minimum accidentally.

- [ ] **Step 4: Extract reasoning and usage after successful body parsing**

Call the normalizer and add `reasoningTokens` beside input/output usage. Keep answer text extraction unchanged.

- [ ] **Step 5: Run gateway and reasoning tests**

Run: `bun test tests/model/gateway.test.ts tests/model/reasoning.test.ts`

Expected: PASS without hanging.

- [ ] **Step 6: Commit the gateway lifecycle unit**

```powershell
git add server/model/gateway.ts tests/model/gateway.test.ts
git commit -m "fix: abort stalled provider response bodies"
```

---

### Task 4: Add request lifecycle and terminal-safe SSE utilities

**Files:**
- Create: `server/generation/requestLifecycle.ts`
- Test: `tests/generation/requestLifecycle.test.ts`

**Interfaces:**
- Produces: `createRequestAbortSignal(req, res): { signal: AbortSignal; dispose(): void }`.
- Produces: `abortableDelay(ms: number, signal: AbortSignal): Promise<void>`.
- Produces: `createSseSession(res, task): { send(event); startHeartbeat(ms?); finish(event); dispose(); isFinished }`.

- [ ] **Step 1: Write failing lifecycle tests with event-emitter fakes**

Assert `req.aborted`, explicit `req` abort, and premature response close abort; normal `res.writableEnded = true` close does not. Assert abortable delay rejects immediately. Assert `finish` writes only the first terminal event and stops heartbeats.

```ts
session.finish({ type: "done", task: "forge", result: {} });
session.finish({ type: "error", task: "forge", message: "late" });
expect(writes.filter((value) => value.includes("event: done"))).toHaveLength(1);
expect(writes.some((value) => value.includes("event: error"))).toBe(false);
```

- [ ] **Step 2: Run and verify failure**

Run: `bun test tests/generation/requestLifecycle.test.ts`

Expected: FAIL because the lifecycle module does not exist.

- [ ] **Step 3: Implement lifecycle utilities**

SSE output uses one `event:` and one JSON `data:` line followed by a blank line. Heartbeats use the structured `heartbeat` event every 10,000 ms. `finish` guards idempotently, clears the interval, writes the terminal event, and ends the response.

- [ ] **Step 4: Run lifecycle tests**

Run: `bun test tests/generation/requestLifecycle.test.ts`

Expected: PASS and no open timer handles.

- [ ] **Step 5: Commit the lifecycle unit**

```powershell
git add server/generation/requestLifecycle.ts tests/generation/requestLifecycle.test.ts
git commit -m "feat: add cancellable generation lifecycle"
```

---

### Task 5: Make Gemini and retry helpers signal-aware

**Files:**
- Modify: `server.ts`
- Test: `tests/routes/generation.test.ts`

**Interfaces:**
- Consumes: request `AbortSignal`.
- Produces: `callGeminiGenerate(..., signal?: AbortSignal)` using `config.abortSignal`.
- Produces: `executeSelectedModelWithRetry({ ..., signal, onAttempt })`.
- Produces: `executeGeminiWithRetry<T>({ operation, maxAttempts, signal, onAttempt }): Promise<T>`.

- [ ] **Step 1: Extract injectable retry helpers and write failing tests**

Test that a user abort during an attempt or retry delay stops immediately and performs no next attempt. Test that timeout/provider errors still retry up to the configured maximum and call `onAttempt({ attempt, maxAttempts, status })`.

```ts
controller.abort();
await expect(runWithRetry({ signal: controller.signal, operation }))
  .rejects.toMatchObject({ code: "CLIENT_DISCONNECTED" });
expect(operation).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `bun test tests/routes/generation.test.ts`

Expected: FAIL because retry helpers do not accept a signal and delays are not abortable.

- [ ] **Step 3: Thread the signal through every provider path**

Pass the signal to `modelGateway.generate`, `@google/genai` as `config.abortSignal`, repair attempts, and `abortableDelay`. Check `signal.throwIfAborted()` before each attempt and before parsing/repair work. Map aborts to `CLIENT_DISCONNECTED`; preserve typed provider timeouts.

- [ ] **Step 4: Surface attempt callbacks without logging secrets**

Call `onAttempt` at requesting/retrying boundaries with stage name and attempt counts only. Do not include prompts, headers, or raw provider payloads.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `bun test tests/routes/generation.test.ts tests/model/gateway.test.ts`

Run: `bun run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the retry unit**

```powershell
git add server.ts tests/routes/generation.test.ts
git commit -m "feat: propagate generation cancellation"
```

---

### Task 6: Implement a robust reusable SSE client

**Files:**
- Create: `src/services/sseStream.ts`
- Test: `tests/client/sseStream.test.ts`

**Interfaces:**
- Produces: `consumeGenerationSse(response, { signal, onEvent }): Promise<GenerationTerminalEvent>`.
- Consumed by: Divergence and Forge service methods.

- [ ] **Step 1: Write failing parser tests**

Feed chunks split in the middle of UTF-8 content, event names, and JSON. Verify CRLF and LF separators, multiple `data:` lines, heartbeat delivery, one terminal result, premature EOF error, malformed terminal error, and abort cleanup.

- [ ] **Step 2: Run and verify failure**

Run: `bun test tests/client/sseStream.test.ts`

Expected: FAIL because the shared parser does not exist.

- [ ] **Step 3: Implement incremental parsing and cleanup**

Use `TextDecoder` streaming mode, retain incomplete blocks, join multiple data lines with `\n`, validate with `parseGenerationStreamEvent`, ignore comment lines, and always `reader.cancel()`/`releaseLock()` safely in `finally`. After the first terminal event, ignore later input and return it.

- [ ] **Step 4: Run parser tests**

Run: `bun test tests/client/sseStream.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the SSE client unit**

```powershell
git add src/services/sseStream.ts tests/client/sseStream.test.ts
git commit -m "feat: add generation SSE client"
```

---

### Task 7: Add the shared Generation Activity UI

**Files:**
- Create: `src/components/GenerationActivity.tsx`
- Test: `tests/components/generationActivity.test.tsx`

**Interfaces:**
- Produces: `GenerationActivityProps` with `task`, `progress`, `startedAt`, `usage`, `reasoning`, `reasoningTruncated`, `status`, and `onCancel`.
- Consumed by: Spark, Divergence, and Forge stages.

- [ ] **Step 1: Write failing render tests**

Render active, retrying, cancelled, complete-with-usage, reasoning-unavailable, and reasoning-available states. Assert the cancel button is accessible, reason text is escaped, the warning is present, and clearing/collapsing callbacks are connected through testable buttons.

```ts
expect(html).toContain("Architect · attempt 2 of 3");
expect(html).toContain("Cancel Generation");
expect(html).not.toContain("dangerouslySetInnerHTML");
```

- [ ] **Step 2: Run and verify failure**

Run: `bun test tests/components/generationActivity.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the compact activity panel**

Use a one-second interval only while active to derive elapsed time. Render discrete `completedSteps / totalSteps`, usage totals only when defined, and a pulsing connection dot labelled `Server connected` only after heartbeat/event receipt. The Reasoning `<pre>` uses normal React text rendering, `whitespace-pre-wrap`, and no HTML injection.

- [ ] **Step 4: Run component tests**

Run: `bun test tests/components/generationActivity.test.tsx`

Expected: PASS with timers cleaned up on unmount.

- [ ] **Step 5: Commit the shared UI unit**

```powershell
git add src/components/GenerationActivity.tsx tests/components/generationActivity.test.tsx
git commit -m "feat: add generation activity monitor"
```

---

### Task 8: Add Anchor Scribing Stop behavior

**Files:**
- Modify: `src/services/geminiService.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/SparkStage.tsx`
- Create: `tests/client/geminiService.test.ts`
- Modify: `tests/components/generationActivity.test.tsx`

**Interfaces:**
- Produces: `parseSparkApi(sparkText, settings?, signal?)`.
- Produces: App-owned Anchor task state and `handleCancelSparkParsing()`.
- Consumes: `GenerationActivity`.

- [ ] **Step 1: Write failing service and UI tests**

Verify `fetch` receives the supplied signal, an aborted request is recognized with `isAbortError`, and SparkStage renders **Stop Scribing** while parsing rather than a disabled progress-only button.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `bun test tests/client/geminiService.test.ts tests/components/generationActivity.test.tsx`

Expected: FAIL because the parse service and Spark props lack cancellation.

- [ ] **Step 3: Add App-owned controller/run state**

Store the controller in a ref, assign a monotonically increasing run ID, preserve prior parsed data until success, set phases Sending/Waiting/Validating, and ignore late completion whose run ID is stale. Abort on App unmount.

- [ ] **Step 4: Wire SparkStage Stop and activity UI**

Do not disable the active Stop button. Cancellation returns to editable state and shows `Scribing stopped.` neutrally. A normal error remains distinct.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `bun test tests/client/geminiService.test.ts tests/components/generationActivity.test.tsx`

Run: `bun run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the Anchor unit**

```powershell
git add src/services/geminiService.ts src/App.tsx src/components/SparkStage.tsx tests/client/geminiService.test.ts tests/components/generationActivity.test.tsx
git commit -m "feat: add cancellable anchor scribing"
```

---

### Task 9: Correct per-branch Auto author flavor

**Files:**
- Modify: `src/lib/authorProfiles.ts`
- Modify: `server.ts`
- Test: `tests/lib/authorProfiles.test.ts`
- Test: `tests/routes/generation.test.ts`

**Interfaces:**
- Produces: `selectAutoAuthorsForBranches(branches, toneEnvelope, autoBehavior): AuthorId[]`.
- Consumes: existing `selectAutoAuthor(..., excludeIds)` and `buildAuthorFlavorPrompt`.

- [ ] **Step 1: Write failing author assignment tests**

Use deterministic randomness injection or a scorer-selection seam. Assert four branches receive four distinct IDs when the pool permits, duplicate fallback occurs only after exhaustion, Manual returns the same requested ID, Off returns no IDs, and Architect/Critic prompt builders contain no `OPTIONAL AUTHOR FLAVOR` marker.

- [ ] **Step 2: Run tests and verify failure**

Run: `bun test tests/lib/authorProfiles.test.ts tests/routes/generation.test.ts`

Expected: FAIL because Auto selection occurs once before architecture.

- [ ] **Step 3: Add a board assignment helper**

Iterate selected branches, pass accumulated exclusions to `selectAutoAuthor`, and use each branch's engine/angle as compatibility input. Accept an optional random function in tests without changing production behavior.

- [ ] **Step 4: Reorder the Deep Craft prompts**

Remove author flavor from Architect and Critic. After the critic chooses four branches, assign Auto authors, then invoke Writer with the branch-specific flavor block. Manual applies the one manual flavor to every Writer branch; Off applies none. Persist `authorFlavorId`, `authorFlavorName`, and `authorFlavorStrength` per take.

- [ ] **Step 5: Run author and generation tests**

Run: `bun test tests/lib/authorProfiles.test.ts tests/routes/generation.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the author unit**

```powershell
git add src/lib/authorProfiles.ts server.ts tests/lib/authorProfiles.test.ts tests/routes/generation.test.ts
git commit -m "fix: assign auto author flavor per branch"
```

---

### Task 10: Stream Divergence stages, usage, reasoning, and cancellation

**Files:**
- Modify: `server.ts`
- Modify: `src/services/geminiService.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/DivergenceStage.tsx`
- Modify: `tests/routes/generation.test.ts`
- Modify: `tests/client/geminiService.test.ts`

**Interfaces:**
- Produces: `/api/divergence-stream` SSE endpoint.
- Produces: `streamDivergenceTakes(params, callbacks, signal): Promise<void>`.
- Consumes: lifecycle utilities, shared SSE parser, Generation Activity, and per-branch authors.

- [ ] **Step 1: Write failing route tests for stage order and cancellation**

With injected provider operations, assert Deep Craft emits Architect, Critic, Writer, validation, then one done event; Fast/Balanced emits one waiting step; attempt/usage/reasoning events follow the completed call; cancellation emits one cancelled event and no writer/done event.

- [ ] **Step 2: Run route tests and verify failure**

Run: `bun test tests/routes/generation.test.ts`

Expected: FAIL because only the JSON `/api/divergence` route exists.

- [ ] **Step 3: Add the SSE route around the existing generation pipeline**

Reuse the existing prompt/validation logic rather than maintaining two divergent implementations. Emit progress before each real stage, retry progress from callbacks, usage/reasoning after completed calls, heartbeat during waits, and one terminal event. Do not write reasoning to `console.log`.

- [ ] **Step 4: Write failing client preservation/cancel tests**

Verify a cancel signal reaches fetch, existing angles are not cleared when a reroll begins, cancelled terminal state keeps them, and only done replaces them.

- [ ] **Step 5: Implement service/App/UI wiring**

Add App-owned Divergence controller, run ID, accumulated usage, bounded reasoning, heartbeat timestamp, and progress. Change the main reroll button to **Cancel Generation** while active and render `GenerationActivity` near the stage header. Keep single-angle reroll behavior unchanged unless it uses the shared signal path safely.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `bun test tests/routes/generation.test.ts tests/client/geminiService.test.ts tests/components/generationActivity.test.tsx tests/lib/authorProfiles.test.ts`

Run: `bun run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit the Divergence unit**

```powershell
git add server.ts src/services/geminiService.ts src/App.tsx src/components/DivergenceStage.tsx tests/routes/generation.test.ts tests/client/geminiService.test.ts
git commit -m "feat: stream divergence generation progress"
```

---

### Task 11: Extend Forge progress, reasoning, and cancellation

**Files:**
- Modify: `server.ts`
- Modify: `src/services/geminiService.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/ForgeStage.tsx`
- Modify: `tests/routes/generation.test.ts`
- Modify: `tests/client/geminiService.test.ts`

**Interfaces:**
- Extends: existing `/api/forge` SSE stream with shared event contracts.
- Extends: `ForgeCallbacks` with `onProgress`, `onUsage`, `onReasoning`, `onHeartbeat`, and `onCancelled`.
- Consumes: lifecycle utilities, shared SSE parser, and Generation Activity.

- [ ] **Step 1: Write failing server tests**

Assert six-bundle progress reports real bundle indexes, section events precede completed-step increments, retries include attempt N/M, cancellation preserves emitted sections and ends once, and a stalled provider response becomes a visible timeout/retry rather than silent hanging.

- [ ] **Step 2: Run server tests and verify failure**

Run: `bun test tests/routes/generation.test.ts tests/model/gateway.test.ts`

Expected: FAIL because Forge emits only legacy log/section/done/error events and has no request signal.

- [ ] **Step 3: Extend Forge server events**

Wrap the existing bundle loop with the request lifecycle signal/session. Before each bundle emit `forge_bundle` progress with zero-based completed count and total. Emit retry callbacks, completed-call usage/reasoning, then section. Preserve the legacy `log` event only if needed for the current Build Log, but make structured progress authoritative.

- [ ] **Step 4: Write failing client/UI tests**

Verify the shared parser dispatches new callbacks, Cancel Forge stays enabled while active, bundle N/6 and sections completed render, cancellation retains current document sections, and Retry remains available afterward.

- [ ] **Step 5: Implement client/App/ForgeStage wiring**

Pass an App-owned signal to `streamForgeDocument`. Each `section` event merges `{ [sectionKey]: data }` into the current partial document without resetting keys received from earlier bundles. Render Generation Activity above Build Log and map Cancel to abort. On `cancelled`, set `isForging` false while retaining that partial document. On retry, create a fresh run/controller and replace sections only as new section events arrive.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `bun test tests/routes/generation.test.ts tests/client/geminiService.test.ts tests/components/generationActivity.test.tsx tests/model/gateway.test.ts`

Run: `bun run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit the Forge unit**

```powershell
git add server.ts src/services/geminiService.ts src/App.tsx src/components/ForgeStage.tsx tests/routes/generation.test.ts tests/client/geminiService.test.ts
git commit -m "feat: add cancellable forge progress"
```

---

### Task 12: Verify the full milestone

**Files:**
- Verify only; modify source/tests only for reproducible defects found during verification.

**Interfaces:**
- Consumes: both implementation plans and every preceding task.
- Produces: evidence-backed completion report with explicit validation boundaries.

- [ ] **Step 1: Run focused regression tests**

Run: `bun test tests/model/gateway.test.ts tests/model/reasoning.test.ts tests/generation/requestLifecycle.test.ts tests/client/sseStream.test.ts tests/client/geminiService.test.ts tests/components/generationActivity.test.tsx tests/lib/authorProfiles.test.ts tests/routes/generation.test.ts`

Expected: all pass.

- [ ] **Step 2: Run the complete test suite**

Run: `bun test`

Expected: all tests pass, including prior connection, persistence, export, launcher, and smoke tests.

- [ ] **Step 3: Run typecheck and production build**

Run: `bun run typecheck`

Expected: exit code 0.

Run: `bun run build`

Expected: Vite and server bundles complete. Report sandbox/build restrictions separately and do not convert an unperformed build into a pass.

- [ ] **Step 4: Perform live browser verification**

Using a configured test profile/model:

1. Start Anchor Scribing, confirm immediate Sending/Waiting state and increasing elapsed time, then Stop.
2. Confirm the previous editable premise remains and cancellation is neutral.
3. Start Deep Craft Divergence and observe Architect, Critic, Writer, validation, retries if any, heartbeat, and completed usage.
4. Expand Reasoning when available; confirm Unavailable appears when absent; clear/collapse it.
5. Cancel a reroll and confirm the old four angles remain.
6. Complete a run and confirm Auto assigns different author badges when the pool permits.
7. Switch to Manual and confirm the chosen author is board-wide.
8. Start Forge and observe bundle N/6, completed sections, elapsed time, retries, usage, and optional reasoning.
9. Cancel Forge and confirm completed sections remain visible and Retry is available.
10. Exercise a deliberately stalled body fixture or test route and confirm timeout/retry replaces indefinite silence.

- [ ] **Step 5: Perform privacy inspection**

Search source and captured test output for API-key fields and verify reasoning is absent from normal logs/project saves:

Run: `rg -n "apiKey|secretCiphertext|Authorization|reasoning" src server server.ts tests`

Review matches manually; expected credential references are limited to protected input/storage/headers and redaction tests. No secret value or reasoning payload should be logged.

- [ ] **Step 6: Record final evidence**

Report exact passing test count, typecheck and build results, browser scenarios actually performed, any environment-blocked checks, and the remaining deferred roadmap. Do not claim provider reasoning streaming for models/providers that returned only completed reasoning.

# Gemini AI Studio, Streaming Reliability, and Mobile Draft Recovery Design

**Date:** 2026-09-07

## Purpose

Add encrypted Google AI Studio connection profiles and correct the observed GLM Divergence failure mode while preserving the existing provider selection, structured-output workflow, cancellation controls, and authored input across mobile reloads.

This milestone replaces opaque, fixed-duration provider waits with truthful upstream streaming diagnostics. It also makes the Stage 1 action footer resilient on narrow Android viewports and restores unsaved Spark text after a browser reload or a Mobile/Desktop Site mode switch.

## Evidence and Root Cause

- The saved NanoGPT profile is authenticated and its model-list request succeeds.
- The application log records `Divergence Architect selected-model attempt 1/2: The provider request timed out.`
- Selected-provider calls use a hard `120_000` millisecond deadline for every stage and attempt.
- Deep Craft runs three dependent calls in sequence: Architect, Critic, then Writer. All three currently request High reasoning.
- Therefore, `0 / 4 steps` means the Architect response has not completed. `2 / 4 steps` means Architect and Critic completed and Writer is active.
- The current connection test proves credentials and model discovery only. It does not probe chat generation, structured JSON support, reasoning support, latency, or streaming.
- The selected-provider gateway requests one non-streamed JSON response. The browser cannot receive output or reasoning activity until that complete response arrives.
- NanoGPT documents `reasoning`, `reasoning_content`, `reasoning_details`, `completion_tokens_details.reasoning_tokens`, and top-level `usage.reasoning_tokens`. LoreBible currently recognizes most text forms but not the top-level token count, and it does not request compatibility reasoning deltas.
- The mobile Spark footer is visible in desktop viewport emulation down to 320 pixels, so the reported absence is most consistent with real mobile dynamic-viewport/keyboard behavior rather than a simple breakpoint omission. The footer currently has no safe-area treatment and combines explanatory text with a fixed-width action in one row.
- Spark text is React memory only. Switching the browser between Mobile and Desktop Site reloads the page, which initializes the Spark to an empty string.

## Goals

- Let a user create a **Gemini AI Studio** profile, save its API key with the existing Windows DPAPI protection, test it, browse compatible models, add custom model IDs, and select it for generation.
- Keep API keys server-side and out of browser storage, logs, progress events, and errors.
- Make upstream generation streaming when supported so output activity, provider-returned reasoning, and usage can reach the existing activity panel before completion.
- Replace the two-minute hard cutoff with first-event, inactivity, and overall deadlines that distinguish a silent provider from a slow but active thinking model.
- Make retries adapt to the previous failure instead of repeating the same request unchanged.
- Explain what the connection test does and does not prove.
- Keep the Stage 1 action reachable above mobile browser chrome and safe areas.
- Recover unsaved Spark text after reload without persisting API keys or reasoning.

## Non-goals

- Displaying or reconstructing private reasoning that a provider does not expose.
- Promising token-accurate counts when a provider supplies neither token deltas nor final usage.
- Benchmarking every upstream route or guaranteeing a provider's latency.
- Persisting provider reasoning in saved projects.
- Moving the application or encrypted key store to Android. The Android browser remains a client of the Windows-hosted server.
- Refactoring all generation routes out of `server.ts` in this milestone.

## Provider Architecture

### Gemini AI Studio Profile

Gemini uses Google's documented OpenAI-compatible API for this milestone:

```text
https://generativelanguage.googleapis.com/v1beta/openai
```

This is the smallest coherent extension of the existing selected-model gateway because it supports Bearer API-key authentication, `/models`, `/chat/completions`, streaming, reasoning effort, and structured outputs using the same boundary already used by NanoGPT and OpenRouter.

The existing environment-based native Gemini fallback remains supported and read-only. A saved Gemini AI Studio profile is distinct from `environment-gemini` and routes through the selected-model gateway with its exact selected model.

Profile behavior:

- Provider selector label: **Gemini AI Studio**.
- Default base URL is controlled server-side and cannot be supplied from the browser.
- The API key is encrypted with the existing DPAPI protector.
- `/test` authenticates by calling the compatibility `/models` endpoint.
- `/models` returns a curated set of text/structured-output-capable Gemini models with live availability plus profile-scoped custom model IDs.
- Custom Gemini model IDs use the existing trim, length, duplicate, and control-character validation.
- Environment Gemini continues using the existing native SDK/failover pool when no explicit profile/model is selected.

Initial curated Gemini choices should be limited to currently documented text models that support structured output. Provider model discovery determines availability; stale curated IDs remain visible but disabled rather than silently substituted. Exact custom IDs remain selectable even when the model-list endpoint does not report them, but the UI marks them **Custom · availability unverified** so preview or newly released IDs are still usable.

### Capability-Aware Request Shape

The gateway builds provider-specific optional fields while keeping a shared result contract:

- NanoGPT thinking models receive explicit reasoning compatibility fields and `exclude: false`.
- Gemini receives `reasoning_effort`; when supported, its Google extension requests provider-generated thought summaries.
- OpenRouter retains its existing reasoning request.
- Strict `json_schema` remains the first structured-output strategy.
- A provider/model rejection of strict schema may retry with `json_object` plus the schema embedded in the prompt. A timeout alone does not automatically downgrade schema because it does not prove schema incompatibility.
- Stage-specific output limits prevent an unconstrained thinking response from consuming an excessive budget. Limits must be high enough for the expected schema and tested against full four-card output.

Provider-returned model IDs, finish reasons, usage, and recognized field names may be recorded as sanitized diagnostics. Prompts, completions, reasoning text, headers, and keys must never be written to ordinary logs.

## Upstream Streaming and Activity

### Gateway Stream Contract

Selected-provider chat requests use `stream: true` where the provider supports OpenAI-compatible Server-Sent Events. The gateway incrementally collects:

- answer/content deltas;
- reasoning or reasoning-content deltas;
- reported usage;
- finish reason;
- provider heartbeat/data arrival timestamps.

It also assembles the final content string and performs the same JSON parse, contamination check, and schema validation used by the non-streaming path. Streaming changes observability, not the required final artifact.

The gateway exposes callbacks or typed events for activity without coupling it to Express or React. Unknown delta fields are ignored. A malformed reasoning delta cannot fail an otherwise valid completion.

If a provider rejects streaming for a particular model, the gateway may fall back once to its existing non-streamed response path and reports that fallback in progress text.

### Reasoning Display

The activity panel has truthful states:

- **Waiting for provider reasoning** while a request is active and no reasoning delta has arrived.
- **Reasoning streaming** while provider-returned reasoning deltas arrive.
- **View reasoning** after provider-returned reasoning or a thought summary exists.
- **Reasoning unavailable** only after the provider finishes without exposing reasoning text.

The existing bounded, escaped, collapsed-by-default reasoning buffer remains. Top-level `usage.reasoning_tokens` is normalized in addition to the existing supported usage shape. The UI states explicitly that some providers expose only a summary or token count and some expose nothing.

### Token and Output Activity

- Exact input/output/reasoning usage is displayed whenever the provider reports it.
- While text deltas arrive without usage, the UI may show a clearly labeled local estimate derived from accumulated characters; it must not label the estimate as billed tokens.
- The activity panel shows elapsed time and “last provider activity” age.
- Application SSE heartbeats continue to mean only that the LoreBible server connection is alive.
- Provider activity is a separate signal and must not be inferred from application heartbeats.

## Timeout and Retry Policy

Replace the single 120-second timer with three deadlines:

1. **First provider event deadline:** abort when no headers or data arrive within 150 seconds.
2. **Provider inactivity deadline:** after streaming begins, abort when no provider data arrives for 60 seconds.
3. **Overall attempt ceiling:** abort an attempt after 8 minutes even if small deltas continue, preventing endless reasoning loops.

These values are defaults, not latency promises. Cancellation remains immediate and never retries.

Retries are failure-aware:

- Authentication, missing profile/model, and explicit user cancellation do not retry.
- Rate limits respect a bounded provider retry delay when available.
- A first-event or inactivity timeout may retry once with reasoning effort reduced by one level and reports that change in the activity panel.
- Invalid structured output retries once with a repair/schema-compatible strategy.
- Provider 5xx/unavailable errors use the existing bounded backoff.
- Every retry event states the stage, attempt, cause, and any changed request strategy.

No request silently changes the selected model. The existing native Gemini environment failover pool is the only path allowed to switch models automatically.

## Divergence Timing and Progress Semantics

Deep Craft remains sequential because Critic depends on Architect and Writer depends on Critic. Its four displayed steps are:

1. Architect complete
2. Critic complete
3. Writer complete
4. Validate and publish complete

The current stage begins before its completed-step counter increments. The UI adds a brief explanation so `0 / 4` is not interpreted as no work occurring.

Expected guidance shown near quality selection or activity details:

- Fast/Balanced: often 30 seconds to 2 minutes.
- Deep Craft on a fast standard model: often 1 to 4 minutes.
- Deep Craft on a heavy thinking model: often 3 to 8 minutes.

These are rough ranges and vary with provider queues, reasoning budget, prompt size, and output length. The application treats continuous upstream activity as working even when a stage has not completed.

## Connection Testing UX

The existing button becomes **Test key & model list** or its result explains the scope:

> Key accepted; model list loaded. This does not test generation speed or structured output.

A paid generation probe is not run automatically. This avoids spending provider credit merely by opening or saving a profile. A future explicitly labeled generation probe can be added separately.

## Mobile Action and Draft Recovery

### Reachable Stage Action

The Spark action footer becomes responsive:

- Stack explanatory copy above the button on narrow screens.
- Make **Examine Divergence** full width on mobile and auto width from the small breakpoint upward.
- Add bottom padding using `env(safe-area-inset-bottom)`.
- Use a dynamic-viewport-aware page shell (`100dvh`) while retaining a safe fallback.
- Ensure the footer remains in the main scroll container and can be reached when the keyboard closes.
- Keep the active Stop control in the same reachable position.

Desktop and 320, 360, 390, and 412 pixel viewport tests verify the action is visible, clickable, and not horizontally clipped. A real Android browser remains the final validation boundary for dynamic keyboard/browser chrome behavior.

### Spark Draft Persistence

Use a versioned local draft record in browser `localStorage` containing only:

- Spark text;
- last updated timestamp;
- schema version.

Behavior:

- Restore the draft during initial state creation.
- Save with a short debounce after edits.
- An empty Spark removes the stored draft.
- Starting a confirmed new scenario clears the draft.
- Loading a saved project replaces the active Spark and updates the draft.
- Successfully saving the scenario may retain the matching Spark draft because a browser reload should reopen the current working context; explicit New/Clear is what removes it.
- Invalid or oversized draft data is ignored safely.
- API keys, reasoning, model responses, and generated documents are excluded.

This deliberately solves the reported lost typing without introducing a full wizard-session migration in the same patch.

## Error Handling and Diagnostics

- Timeout errors identify first-event, inactivity, or overall ceiling.
- Progress identifies the exact Deep Craft stage and attempt.
- Sanitized server logs include timestamps, provider name, requested/reported model, stage, elapsed milliseconds, HTTP status, finish reason, usage counts, and recognized response-field names.
- Logs exclude prompts, completions, reasoning content, API keys, request headers, and full provider error bodies.
- A generation failure preserves the editable Spark and any prior Divergence board.
- A stream emits exactly one terminal result: done, cancelled, or error.

## Testing Strategy

Implementation follows test-driven development.

### Provider and route tests

- Gemini profile creation uses the Google compatibility base URL and preserves DPAPI-backed secret handling.
- Gemini test/model routes authenticate with Bearer credentials and parse the compatibility model-list response.
- Saved Gemini selections generate through the selected-model gateway; environment Gemini continues using the native path.
- Provider request fixtures cover NanoGPT, OpenRouter, and Gemini streaming content, reasoning deltas, usage, finish reasons, fragmented SSE frames, `[DONE]`, and stream rejection fallback.
- Strict-schema rejection uses the documented fallback; timeout does not incorrectly imply schema rejection.
- Top-level NanoGPT reasoning-token usage is normalized.
- No log/event fixture contains credentials, prompt text, completion text, or reasoning text.

### Timeout and retry tests

- No first event reaches the first-event deadline.
- Active deltas reset the inactivity timer.
- A stalled stream reaches the inactivity deadline.
- Continuous small deltas still reach the overall ceiling.
- User cancellation aborts immediately and never retries.
- A timeout retry lowers reasoning by one level and reports the change.
- Authentication and unavailable-model errors never retry.

### Client and component tests

- Active requests say “Waiting for provider reasoning,” not unavailable.
- Reasoning deltas and final usage render safely and remain collapsed by default.
- Estimated activity is explicitly labeled as an estimate.
- The connection-test result explains its limited scope.
- Gemini AI Studio appears as a selectable provider and renders curated/custom model choices.
- Spark draft initialization, debounce, clearing, malformed storage, size bounds, New, and saved-project loading are covered.
- The mobile footer uses full-width stacking and safe-area-aware classes/styles.

### Browser verification

- Create a mock Gemini profile in an isolated test store and verify the complete modal flow without exposing a real key.
- Verify Connections scrolling and Gemini/custom model selection at desktop and mobile sizes.
- At 320, 360, 390, and 412 pixel widths, type a Spark, confirm **Examine Divergence** is visible, reload, and confirm the exact Spark is restored.
- Exercise mocked slow streams to confirm live provider activity, reasoning-state transitions, adaptive timeout messaging, and cancellation.
- Run the complete test suite, TypeScript checks, and production build.
- Real NanoGPT/GLM and Gemini generation are not claimed unless the user runs them with their own key or explicitly authorizes a paid probe.

## Security and Privacy

- Gemini API keys use the existing Windows DPAPI profile store.
- Full keys never return to the browser after saving.
- The browser stores only non-secret Spark draft text and model/profile identifiers already used by the UI.
- Provider reasoning stays in volatile UI state and is neither saved nor logged.
- Streaming parsers impose size bounds on answer/reasoning buffers.
- Provider errors are mapped to sanitized application errors.

## Rollout Order

1. Add failing tests for Gemini profiles/model discovery and provider-specific request shaping.
2. Add failing streaming, timeout, reasoning-token, and adaptive-retry tests.
3. Implement the shared selected-provider streaming gateway and diagnostics.
4. Enable Gemini AI Studio profiles, model discovery, selection, and generation.
5. Connect upstream deltas to the existing generation activity SSE events and refine reasoning/connection-test wording.
6. Add failing Spark draft and mobile-footer component tests.
7. Implement versioned Spark draft recovery and responsive safe-area footer behavior.
8. Run focused tests, the complete suite, typecheck, production build, and mocked browser walkthroughs.
9. Restart the desktop launcher/server and report any real-provider verification still requiring the user's own test.

## Acceptance Criteria

- A Gemini AI Studio profile can be created, securely saved, tested, assigned a reported or custom model, restored after restart, and used by every selected-model generation route.
- Environment Gemini behavior remains backward-compatible.
- GLM/NanoGPT generation no longer fails solely because a working stream crosses a fixed two-minute wall.
- Silent, inactive, and endlessly active requests each terminate under the correct bounded policy.
- Deep Craft shows stage, attempt, elapsed time, last provider activity, and truthful output/reasoning activity.
- Reasoning is shown only when returned by the provider; the active empty state no longer falsely declares it unavailable.
- Connection testing clearly states that it does not prove generation performance.
- The mobile **Examine Divergence** control is reachable at supported narrow widths.
- Spark text survives a browser reload or Mobile/Desktop Site mode switch and is cleared by an explicit New/Clear action.
- API keys and reasoning content do not enter browser storage or logs.
- Focused tests, full tests, typecheck, production build, and mocked browser verification pass, with real-provider boundaries stated accurately.

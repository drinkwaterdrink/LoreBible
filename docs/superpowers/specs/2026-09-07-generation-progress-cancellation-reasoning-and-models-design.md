# Generation Progress, Cancellation, Reasoning, and Custom Models Design

**Date:** 2026-09-07

## Purpose

Make long-running generation work observable and safely cancellable, correct the Connections modal overflow, align Divergence author flavor with the intended per-branch behavior, expose provider-returned reasoning on demand, and let each connection profile save custom model IDs.

This design covers Anchor Scribing, Divergence, Forge, and Connections. It deliberately avoids fake token streams or fabricated progress percentages.

## Goals

- Every long-running generation action has a visible current stage, elapsed time, retry state, and Stop or Cancel control.
- Cancellation propagates from the browser through the Express server to the active provider request and retry delay.
- Forge no longer appears silently stuck while a provider call or response body is stalled.
- Connections can scroll to every built-in and custom model at desktop and mobile viewport sizes.
- Auto author flavor is selected independently for each Divergence branch and does not distort branch architecture.
- Users can optionally inspect reasoning content when a provider actually returns it.
- Users can add, select, persist, and remove custom model IDs on each connection profile.
- Existing encrypted API-key handling remains unchanged and reasoning/progress events never expose credentials.

## Non-goals

- Synthesizing hidden chain-of-thought when a provider does not return reasoning.
- Claiming real-time token counts when a provider only reports usage after completion.
- Replacing all provider calls with token-by-token streaming in this milestone.
- Implementing the separate roadmap items listed at the end of this document.
- Adding per-card manual author selectors in this milestone; manual author mode remains board-wide.

## User Experience

### Connections and Models

The modal becomes a bounded flex column:

- The header remains fixed within the modal.
- The body owns the remaining height with `min-height: 0`.
- The profile list and profile editor receive explicit scroll containers.
- On narrow screens, the stacked body can scroll as one region.

Below the built-in model list, each profile gets a **Custom models** section:

- A text field accepts a provider model ID exactly as the provider expects it.
- **Add model** validates and saves it to that connection profile.
- Saved custom models appear in the same selectable model list as built-ins, marked **Custom**.
- A custom model can be removed unless it is currently selected; removing the selected model first requires choosing another model.
- Duplicate IDs are rejected case-sensitively after whitespace trimming.
- Empty IDs and IDs containing control characters are rejected. Provider-specific slash, colon, dot, dash, and underscore forms remain valid.
- Custom model IDs are ordinary configuration, not secrets. They are persisted in the existing desktop profile store alongside profile metadata; API keys remain in the encrypted key store.

The built-in catalog remains available for both NanoGPT and OpenRouter. Custom entries are profile-scoped so a model added to one connection does not silently appear in another.

### Shared Generation Activity

A compact shared activity panel presents truthful discrete state:

- task label;
- current phase;
- elapsed time;
- completed steps out of known steps, when applicable;
- current provider attempt and maximum attempts;
- completed input/output token totals when the provider reports them;
- an expandable **Reasoning** area when reasoning is available and monitoring is enabled;
- Stop or Cancel.

The panel never animates a made-up token counter. During a call that provides no intermediate usage, it shows elapsed time, a heartbeat indicator, and the current stage. Usage increases only after a provider call completes and reports it.

Suggested shared event shape:

```ts
type GenerationTask = "anchors" | "divergence" | "forge";

type GenerationPhase =
  | "requesting"
  | "waiting"
  | "validating"
  | "architect"
  | "critic"
  | "writer"
  | "forge_bundle"
  | "retrying"
  | "complete"
  | "cancelled"
  | "error";

interface GenerationUsage {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
}

interface GenerationProgressEvent {
  task: GenerationTask;
  phase: GenerationPhase;
  label: string;
  completedSteps?: number;
  totalSteps?: number;
  attempt?: number;
  maxAttempts?: number;
  usage?: GenerationUsage;
  reasoningDelta?: string;
  reasoningComplete?: boolean;
}
```

Elapsed time is client-derived from the task start timestamp so the UI continues updating between server events.

### Anchor Scribing

Anchor parsing remains a single JSON request because there is only one model operation. The client can still report honest phases:

1. Sending anchors
2. Waiting for model
3. Validating response

While active, the Scribe control changes to **Stop Scribing**. Cancellation aborts the request and returns the UI to its prior editable state without showing cancellation as a failure.

If the completed provider response contains usage or reasoning metadata, the final activity state displays it. No fake intermediate token count is shown.

### Divergence

Deep Craft moves to an SSE response so the existing server stages are visible:

1. Architect
2. Critic
3. Writer
4. Validate and publish angles

Fast and Balanced modes show their single generation call as one known step.

The activity panel shows the active stage, attempt number, elapsed time, heartbeat, accumulated completed-call usage, optional reasoning, and **Cancel Generation**. Existing angles remain visible until the replacement board completes successfully. Cancelling or failing a reroll does not erase the previous board.

### Forge

The current Forge SSE stream is extended with structured progress, usage, reasoning, retry, heartbeat, cancelled, and terminal events. The Forge panel shows:

- current bundle number out of the known total;
- completed section count;
- active retry attempt;
- elapsed time;
- completed-call token usage;
- optional reasoning viewer;
- **Cancel Forge**.

Already completed Forge sections remain visible after cancellation. Cancellation is presented as a neutral stopped state, not a red provider error. A stream emits exactly one terminal outcome: done, cancelled, or error.

## Reasoning Monitor

Reasoning monitoring is opt-in in the generation activity panel and defaults collapsed. It has three states:

- **Unavailable:** the provider/model returned no reasoning field.
- **Available:** reasoning was returned and can be expanded.
- **Streaming:** reasoning deltas are arriving from a provider path that supports them.

The application displays only reasoning content explicitly returned by NanoGPT or OpenRouter-compatible responses. It does not reconstruct, infer, or label ordinary answer text as reasoning.

Provider normalization checks supported response locations without assuming every model uses the same format, for example reasoning text/deltas and reported reasoning-token usage. Unknown provider fields are ignored. The normalizer is isolated and covered by fixtures so provider-specific differences do not leak into React components.

Reasoning is treated as potentially large and sensitive generated content:

- rendering is plain text, never raw HTML;
- the visible buffer is capped to a documented character limit with a truncation notice;
- the user can clear the displayed buffer;
- reasoning is not written to the lore document or project save format by default;
- reasoning is not written to normal application logs;
- cancelling stops additional reasoning updates;
- a short warning explains that provider-returned reasoning may be incomplete, repetitive, or unavailable.

This monitor is diagnostic. It must not block generation completion if reasoning parsing fails.

## Auto Author Flavor Semantics

The current behavior selects one Auto author before Divergence generation, applies that flavor to all four angles, and selects again on a full reroll. That explains the repeated author badge and the change after reroll, but it does not match the intended branch-specific behavior.

The corrected flow is:

1. Architect proposes distinct branches without author flavor.
2. Critic evaluates and selects branches without author flavor.
3. For Auto mode, select a compatible author for each chosen branch while excluding authors already used on the board when enough candidates exist.
4. Writer applies the assigned flavor independently to each branch.
5. Persist the resulting author ID, display name, and strength on each take.

Manual author mode remains board-wide: the chosen author is applied to all branches. Off mode applies none. Duplicate Auto authors are allowed only when the eligible pool cannot satisfy uniqueness; the event/log should make that fallback explicit.

Author flavor is therefore a treatment layer after architecture, not an input that determines what the branches are about.

## Transport and Cancellation

### Client

- Each active task owns one `AbortController`.
- Service methods accept an `AbortSignal`.
- Stop/Cancel calls `abort()` and disables repeat cancellation clicks.
- SSE readers are cancelled and released in `finally`.
- Unmounting the owning screen aborts its active request.
- A new run cannot silently reuse a controller from a previous run.

### Server

- Each route creates a request-scoped controller.
- `req.on("aborted")` and a premature `res.on("close")` abort active work. A normal completed response must not be mistaken for cancellation.
- The request signal is passed through retry helpers, abortable retry delays, the selected-model gateway, and Gemini calls.
- Client cancellation is distinguished from timeout and provider failure.
- Cancellation stops future retries and prevents late results from mutating the client.

### Provider Gateway Timeout

The selected-provider timeout currently ends after response headers arrive. The timeout must remain active until the response body has been fully consumed and parsed. This closes the observed failure mode where a provider sends headers and then stalls indefinitely during JSON parsing.

The gateway combines two causes without losing their meaning:

- request-scoped client cancellation;
- provider timeout.

Timeout errors remain retryable under the existing retry policy; user cancellation never retries.

### Heartbeats

SSE routes send a lightweight heartbeat approximately every ten seconds while work is active. A heartbeat proves the server connection is alive but does not claim that the upstream model is producing tokens.

## Data and Persistence

Connection profile metadata gains an optional `customModelIds: string[]`. Loading older profiles defaults it to an empty list, so no destructive migration is required.

Custom model selection uses the existing selected profile/model persistence path. Model IDs are always sent as data, never interpolated into URLs or shell commands.

Divergence take author metadata remains per-take and backward-compatible. Existing takes without the new fields continue rendering normally.

Reasoning buffers are session-only diagnostic state and are excluded from project saves unless a future explicitly designed feature adds export.

## Error Handling

- Every provider attempt is visible as attempt N of M.
- A timed-out response identifies the stage and attempt that timed out.
- Malformed provider reasoning cannot fail an otherwise valid result.
- Malformed primary output still fails validation as it does today.
- Cancellation never triggers an automatic retry.
- A late event after cancellation is ignored by task/run ID.
- Starting a new run replaces stale progress state only after assigning a new run ID.

## Testing Strategy

Implementation follows test-driven development.

### Unit and service tests

- Custom model add, trim, duplicate rejection, selection, persistence, and removal.
- Older profile metadata defaults `customModelIds` safely.
- Provider reasoning normalization for supported complete and delta shapes, missing reasoning, malformed reasoning, and truncation.
- Client services attach and honor `AbortSignal`.
- SSE parsing handles fragmented events, heartbeat, progress, reasoning, usage, cancelled, done, and error.
- Retry delays abort immediately and user cancellation does not retry.
- Gateway timeout remains active while a response body stalls after headers.
- Timeout and user cancellation produce distinct typed errors.
- SSE routes emit exactly one terminal event.
- Auto author selection assigns distinct authors per branch when possible and does not add author flavor to Architect or Critic prompts.
- Manual and Off author modes retain their documented behavior.
- Cancelling Divergence preserves the previous board.
- Cancelling Forge preserves completed sections.

### Component tests

- Connections renders built-in and custom models and exposes the custom-model form.
- Active controls change to Stop/Cancel and invoke the right controller.
- Generation activity renders stages, attempts, elapsed state, usage, and reasoning availability.
- Reasoning is escaped as text and can be cleared/collapsed.
- Cancellation renders a neutral stopped state.

### Browser verification

- Desktop and Android-sized viewports can scroll Connections to the last model and the save controls.
- Long custom IDs do not force horizontal page overflow.
- Anchor, Divergence, and Forge show visible activity within one UI tick.
- Cancel works during an upstream wait and during a retry delay.
- A deliberately stalled response body times out instead of hanging.
- Existing generated content stays visible during rerolls and after cancellation.

The existing typecheck and complete test suite must pass. A production build and live browser walkthrough are required when the environment permits them; any environment limitation must be reported separately from test results.

## Security and Privacy

- Existing Windows DPAPI API-key storage is preserved.
- Full keys never enter localStorage, progress events, reasoning events, UI logs, or server logs.
- Reasoning is plain-text escaped and kept in volatile UI state.
- Custom model IDs are configuration, but still receive length/control-character validation.
- Error messages must redact authorization headers, request headers, and provider payload fields that could contain secrets.

## Rollout Order

1. Add failing tests for profile custom models, cancellation, gateway body timeout, reasoning normalization, and author assignment.
2. Correct the Connections scroll boundary and implement custom model persistence/UI.
3. Introduce shared progress/reasoning contracts and client activity UI.
4. Propagate cancellation and fix the provider timeout lifecycle.
5. Add Anchor Stop behavior.
6. Add Divergence SSE progress, cancellation, reasoning, and per-branch Auto authors.
7. Extend Forge progress, cancellation, usage, reasoning, and terminal-event handling.
8. Run focused tests, full tests, typecheck, production build, and browser verification.

## Deferred Roadmap

After this milestone, the previously identified work remains:

1. Remove hidden genre-specific defaults from draft scenario creation and Forge sanitizers.
2. Eliminate remaining silent deterministic creative fallback paths.
3. Finish semantic Reimagine, Mutate, and Push Further controls.
4. Complete settings and Divergence-history restoration on load.
5. Remove duplicated mobile New, Save, and Margin controls.
6. Broaden inspiration banks and separate universal safeguards from editorial prompt preferences.
7. Gradually refactor the oversized server module into focused route and service modules.

## Acceptance Criteria

- The Connections modal reaches every built-in/custom model and its bottom actions with normal scrolling on desktop and mobile.
- A custom model ID can be added to a connection, selected, saved, restored after restart, and removed safely.
- Anchor Scribing, Divergence, and Forge expose a working Stop/Cancel control.
- Cancelling reaches the active provider request and prevents further retries.
- The UI shows honest stage, elapsed, retry, heartbeat, and completed-call usage information.
- Provider-returned reasoning is optionally viewable, safely rendered, bounded, and never fabricated.
- A response whose body stalls after headers times out.
- Deep Craft exposes Architect, Critic, and Writer progress.
- Forge exposes bundle/section progress and cannot remain indefinitely silent.
- Auto mode assigns per-branch authors without unnecessary duplicates; manual mode remains board-wide.
- Existing API keys remain encrypted and never appear in progress/reasoning output.
- Relevant focused tests, the full test suite, and typecheck pass; build/browser results are reported with clear validation boundaries.

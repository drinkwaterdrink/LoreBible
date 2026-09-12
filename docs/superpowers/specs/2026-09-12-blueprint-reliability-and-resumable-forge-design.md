# Blueprint reliability and resumable Forge design

**Status:** Approved  
**Target releases:** v0.46, v0.47, v0.48  
**Roadmap alignment:** M2.2 followed by an intentionally narrow M3 orchestration slice

## 1. Purpose

This design delivers three incremental releases without replacing LoreBible's original roadmap. It fixes current mobile and Divergence regressions, completes editable and persisted Blueprint controls, and then introduces a resumable Forge execution model for providers that rate-limit back-to-back generation calls.

The governing constraints are:

- Continuous Forge remains the default behavior.
- Manual step-by-step Forge never starts another model request until the user presses **Generate Next Bundle**.
- Every completed bundle is preserved across failure, cancellation, reload, and model changes.
- Single-request Forge is optional and honestly labeled as less recoverable for large builds.
- Stage 1 example premises are generated only on explicit request and never consume quota merely because the stage opened.
- Existing SavedProjectV2 and Project Graph data remain readable.
- These releases do not reorder or replace M4-M9.

## 2. Release sequence

### v0.46 — Spark and UI reliability

This release addresses isolated user-facing regressions before expanding Stage 3.

#### 2.1 Fresh premise generation

The current **Roll Fresh Sparks** control samples four entries from a fixed 24-entry `NOVEL_SPARKS_VAULT`. Repetition is therefore expected and the label incorrectly implies open-ended generation.

Replace this behavior with an explicit **Generate Fresh Premises** operation:

- The initial screen may show a small neutral offline starter set so it is useful before a connection is configured.
- Pressing **Generate Fresh Premises** makes one request through the selected text-model gateway.
- The response contains four concise, structurally varied premise candidates with stable candidate IDs, titles, premises, and optional inspiration notes.
- The request asks for premise diversity without forcing institutions, secrets, violence, magic, romance, factions, debt, or ticking clocks.
- The operation displays progress, cancellation, provider/model identity, and truthful errors through the existing generation-activity system.
- The previous successful premise set stays visible if the request fails or is cancelled.
- No request fires automatically when Stage 1 opens.
- The button explains that it sends one model request and may use provider quota.

The deterministic word-bank collision tool remains a separate, explicitly offline ideation tool. The fixed premise vault may remain as a neutral starter/failure-free display source, but it must not masquerade as newly generated output.

#### 2.2 Reroll-all board history

Single-angle rerolls currently append to one take's version history. Reroll-all correctly avoids mapping unrelated new results onto old slots by array index, but it replaces the prior board and makes the complete earlier set unreachable.

Add board-level lineage alongside existing take-level lineage:

- Each set of four angles is a `DivergenceBoardGeneration` with its own stable ID, creation time, operation, and four take roots.
- **Reroll All Angles** appends a new board generation rather than overwriting the previous one.
- Stage 2 displays `Board N of M` controls for moving between full generations.
- Individual reroll, steer, and version navigation continue to operate within the active board.
- Choosing an angle records both the board generation ID and take ID.
- Older boards are immutable and remain available after save/load.
- A failed or cancelled reroll-all leaves the active board and history unchanged.
- New boards never inherit take history by matching array position.

Saved projects without board history migrate their current four takes into one initial board. Existing take IDs and per-take versions are preserved.

#### 2.3 Mobile Connections model picker

The current modal contains a scrollable details pane and a second independently scrollable model list. The inner list retains scroll position, so the outer pane can be at its top while the first model is partially hidden.

The revised mobile behavior will:

- Keep the profile selector, details pane, and model results visually distinct.
- Reset model-result scroll to the first complete row whenever profile, sort, search, or subscription filtering changes.
- Never render a model row partially underneath a boundary or sticky element at the reset position.
- Keep selected-model summary, search, and sort controls outside the results scroller.
- Keep Save, Test Connection, Test Selected, Diagnostics, and Delete accessible in the fixed action area without traversing the catalog.
- Use one clearly bounded model-results scroller on mobile, with scroll affordance and touch-safe rows.
- Preserve keyboard focus and avoid jumping the main details pane when a model is selected or favorited.

Desktop retains the two-column profile/details layout.

### v0.47 — Editable Blueprint and Stage 3 redesign

This is the next planned M2.2 slice. Stage 3 becomes the place where users accept or override what LoreBible intends to build, while retaining the old Physics values as migrated constraints.

#### 2.4 Control modes

Provide three progressive-disclosure surfaces over one canonical Blueprint configuration:

- **Smart Auto:** premise-adaptive recommendations with short explanations. Users can accept the plan without learning every control.
- **Guided:** editable category inclusion, detail levels, cast targets, world mode, artifact target, and build intensity.
- **Expert:** runtime budget and detailed generation constraints. Expert overrides are stored and never silently reverted.

Changing view mode does not discard values. A recommendation refresh changes only unlocked fields. User-locked fields and explicit omissions survive reanalysis and save/load.

#### 2.5 Clear creative controls

Rename the user-facing **Mundanity** control to **Everyday-Life Detail**. Its explanation is: how much attention the world gives to ordinary routines, work, travel, meals, costs, maintenance, leisure, and minor inconveniences. This remains independent of strangeness; a highly fantastical setting may also have rich everyday life.

Organize controls into understandable groups:

1. **Project shape:** artifact target, Arc/Sandbox/Hybrid world mode, intimate/ensemble/populated cast scale, principal and roster targets.
2. **World texture:** strangeness, everyday-life detail, rules rigidity, world autonomy, and location/social texture.
3. **Experience:** violence, horror, romance, pacing, tone guardrails, explicit-content permission, and player-death permission.
4. **Production:** Lean/Rich/Deluxe/Obsessive build intensity, creative quality, and Efficient/Balanced/Expansive runtime budget.
5. **Specific constraints:** genre, subgenre, linguistic base, must include, and must avoid.

Only premise-relevant categories and mechanic recommendations appear by default. Guided and Expert modes allow adding omitted or custom categories. Every non-obvious control includes a concise effect statement and, where useful, an example.

#### 2.6 Persistence and compatibility

Introduce a versioned Blueprint selection record associated with the project revision. It stores accepted recommendations, locks, omissions, category detail, build targets, runtime budget, and Forge execution preference.

Legacy `PhysicsConfig.mundanity` is migrated losslessly into `everydayLifeDetail`. Old projects continue to load, and compatibility serialization may continue writing the legacy value until SavedProjectV2 readers no longer require it. Migration does not reinterpret or change the numeric value.

The v0.41 proposal-only Blueprint remains reproducible from the same sanitized context. Accepting or editing a Blueprint creates a new persisted selection; merely previewing recommendations does not alter the project.

### v0.48 — Resumable Forge

This release implements the minimum M3 orchestration foundation required to prevent rate-limited builds from restarting. It does not yet claim the full graph-native specialist pipeline described by M3.

#### 2.7 Execution modes

Forge provides three explicit modes:

- **Continuous — default:** generate the existing ordered bundle sequence automatically, one request at a time.
- **Step by step:** generate exactly one pending bundle, save the result, then enter a waiting state. Only a direct press of **Generate Next Bundle** may start the next request.
- **Single request — compatibility:** ask the selected model for the complete Forge result in one request. The UI warns that large results are more susceptible to truncation, invalid structured output, timeout, and all-or-nothing retry.

An optional cooldown may be offered for Continuous mode, but it is separate from Step by step. Step by step never has an automatic continuation timer.

#### 2.8 Build records and state machine

Each Forge run owns a persisted build record containing:

- stable build ID;
- source project revision and accepted Blueprint revision;
- selected profile/model snapshot;
- execution mode;
- ordered bundle definitions;
- per-bundle status: pending, active, complete, or failed;
- attempts and concise provider error metadata;
- candidate artifact/document fragment and validation result;
- created and updated timestamps.

The client and server share an explicit state machine:

`ready -> generating -> waiting_for_user -> generating -> complete`

with failure and cancellation returning to a recoverable waiting state when at least one bundle remains. A bundle becomes complete only after its structured response validates and its checkpoint is committed atomically. Duplicate terminal responses for the same attempt are ignored.

#### 2.9 Resume and safety behavior

- Starting a new build never overwrites an accepted completed manuscript.
- Cancellation stops the active request and prevents future requests; previously completed bundles remain committed.
- Reloading finds the latest compatible unfinished build and offers **Resume Build**.
- A source or Blueprint revision change marks the old build stale and explains why it cannot be silently resumed.
- A model change is allowed before retrying or generating the next bundle and is recorded in that bundle's attempt metadata.
- Failure exposes Retry Current Bundle, Change Model, and Cancel Build.
- Single-request failure preserves the previous accepted manuscript but has no partial checkpoint unless the provider returned a complete validated artifact.
- The server sends heartbeat/progress events without treating them as provider tokens or proof of model activity.

## 3. Data boundaries

The implementation should add focused modules instead of expanding orchestration logic directly inside `server.ts`:

- Spark premise generation contract and route/service.
- Divergence board-lineage contract and migration helper.
- Blueprint selection contract, validator, migration, and repository command.
- Forge execution-mode and build-record contracts.
- Forge orchestrator responsible for state transitions and checkpoint commits.

React components consume these contracts through existing service boundaries. Serializers and generation prompts do not independently redefine Blueprint or build state.

## 4. Error handling

All new generation operations follow the established truthful-failure policy:

1. Preserve prior accepted state.
2. Create a candidate operation or bundle attempt.
3. Validate provider output before committing it.
4. On failure, show the provider-facing category and useful diagnostics.
5. Permit retry or model change without discarding unrelated work.
6. Never replace failed model output with authored deterministic content presented as AI success.

Rate-limit errors should surface any provider retry guidance, but Step-by-step mode still waits for the user after a failure or success.

## 5. Testing and evidence

Every release follows test-driven development and the repository quality gate.

### v0.46

- Spark endpoint contract, cancellation, invalid output, and prior-set preservation.
- Premise neutrality fixtures and no automatic request on mount.
- Board migration, immutable board snapshots, failed reroll preservation, and save/load.
- Per-take history remains independent inside each board.
- Connections model scroller resets on profile/sort/search/filter changes.
- Mobile viewport proves the first model is fully visible and action controls remain reachable.

### v0.47

- Existing Physics values migrate exactly.
- Smart, Guided, and Expert views edit the same canonical values.
- Locks and omissions survive recommendation refresh and save/load.
- Cozy, domestic, war, romance, and large-city fixtures yield premise-appropriate plans.
- Mobile users can reach, understand, and edit every supported control.

### v0.48

- Step-by-step sends one and only one request per explicit user action.
- Success enters `waiting_for_user`; elapsed time alone never starts the next request.
- Cancellation and failure preserve completed checkpoints.
- Reload/resume, revision mismatch, model change, duplicate response, and invalid output.
- Continuous mode preserves current ordering.
- Single-request mode commits only a complete validated result.

For every release run targeted tests, the full Bun suite, typecheck, and production build. Rendered UI validation covers desktop and a representative mobile viewport. Live paid-provider behavior is reported separately from deterministic evidence.

## 6. Roadmap and release bookkeeping

- Update the stale summary in `docs/roadmap/README.md` when v0.46 ships.
- Record v0.46-v0.48 in `CHANGELOG.md` with what changed, why, validation evidence, limitations, and next roadmap slice.
- Increase the visible app version by 0.01 for each shipped update.
- M2 is marked complete only after v0.47 satisfies its exit gate.
- v0.48 advances M3 orchestration but does not mark all of M3 complete unless graph-native category acceptance and the remaining M3 exit criteria are also satisfied.
- After these releases, continue the original sequence: complete M3, then M4 Lore Production and Activation Lab, M5 archetype cards, M6 full-fidelity publishing, M7 visuals, M8 integrated QA, and M9 Source Studio.

## 7. Out of scope

These three releases do not:

- implement the complete M4 Activation Lab;
- change Lumiverse serialization schemas;
- claim runtime certification from deterministic tests;
- add image-generation providers;
- make every generated NPC a standalone card;
- automatically spend model quota on Stage 1 load or while Step-by-step Forge is waiting;
- delete legacy project data after migration.

## 8. Acceptance summary

The design is successful when users can request genuinely fresh premise examples, browse every prior full Divergence board, use Connections on mobile without clipped models, understand and customize Stage 3, and complete a rate-limited Forge build one explicitly requested bundle at a time without losing completed work. The original roadmap remains authoritative for all subsequent work.

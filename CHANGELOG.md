# Changelog

All notable LoreBible changes are recorded here. The project adopted this changelog during v0.3 development; Git history remains the detailed record for earlier work.

## Unreleased

## v0.43 — 2026-09-11

### Fixed

- Provider-reported NanoGPT models, including Google Gemini model IDs exposed by NanoGPT, can now pass the same profile check as curated and saved custom models instead of being rejected as "not configured."
- The Connections panel now identifies an older server process when its health response lacks the v0.43 capabilities, which explains stale 404s and missing catalog metadata after a frontend-only refresh.
- NanoGPT's Subscription only filter now reports missing subscription metadata instead of silently looking empty.
- Both Windows launchers now require the matching server version/capabilities before opening the app, so they no longer treat an older process on port 3000/3001 as the current build.

### Added

- Copy diagnostics in Connections & Models. The report includes app/server versions, capability flags, provider/profile metadata, selected model, catalog metadata, active filter, and the last visible error; API keys and encrypted credential material are excluded.
- The selected-model test now gives a specific restart message when an old server process does not have the generation-test route.

### Why

- Connection success only proves authentication and model listing. A model can still be rejected at the generation gateway or the browser can be running a newer UI against an older server process. v0.43 makes both boundaries visible and debuggable.

### Validation boundary

- Automated tests cover provider-reported NanoGPT generation, stale-server error handling, runtime capability checks, diagnostics redaction, model sorting/filtering, and existing connection behavior. Live provider availability, subscription membership, quota, and long-form generation still require the selected-model test against the current running server.

## v0.42 — 2026-09-11

### Added

- Model sorting by alphabetical name, provider creation date, NanoGPT's live public Popular ordering, and subscription inclusion, plus a subscription-only filter for NanoGPT profiles.
- Local model favorites that remain at the top of every sort without changing the selected generation model or storing provider credentials.
- A selected-model generation test that sends a tiny structured-output request through the saved profile, distinguishing usable generation from a successful catalog/authentication check.

### Changed

- NanoGPT discovery now reads its detailed model catalog and dedicated subscription catalog, while Popular ranking is used only when the official public models page supplies an ordering; LoreBible does not manufacture missing rank data.
- Gemini discovery filters known image, video, embedding, TTS, transcription, live-audio, robotics, computer-use, and research endpoints out of the text-generation selector.
- The compact version label now reads `v0.42`.

### Why

- Hundreds of provider models need dependable organization, and a valid API key does not prove that a selected model can satisfy LoreBible's streamed structured-generation contract.

### Validation boundary

- Automated fixtures verify metadata normalization, sorting, subscription membership, official-page rank parsing, favorite persistence, non-chat Gemini exclusion, and the real-generation test boundary. Provider catalogs and subscription membership remain live external data. A successful selected-model test proves only a small structured request at that moment, not long-form quality, speed, quota, or every Forge workload.

## v0.41 — 2026-09-11

### Added

- A read-only Blueprint preview that recommends an artifact target, world mode, build intensity, generation quality, runtime budget, premise-specific lore categories, eligible mechanic packs, and a bounded build inventory.
- Visible evidence and plain-language reasons for every recommendation, including explicit explanations for omitted categories and ordinary-life/world-autonomy assessments.
- A revision-checked preview API, sanitized V2 planning adapter, deterministic premise-contrast fixtures, and a mobile-safe preview panel launched from Project Graph Beta.

### Changed

- The compact version label now reads `v0.41`.
- M2 Blueprint Studio is in progress: 9 of 17 ordered roadmap items are complete and 8 remain. M2.2 editable and persisted Blueprint controls are next.

### Why

- Users need to inspect why LoreBible proposes a particular world shape before an expensive Forge run. This first Blueprint slice makes that planning visible while keeping recommendations separate from accepted project truth.

### Preservation and validation boundary

- Blueprint previews are proposals only: they are not persisted, do not mutate the Project Graph or V2 save, and do not change Physics, Forge, provider connections, or artifact serialization. A failed refresh preserves the prior preview; closing or cancelling the request does not overwrite accepted work. Reverting v0.41 leaves existing V2 saves and Project Graph data intact.
- Local tests establish parser, redaction, revision, deterministic fixture, lifecycle, and rendering behavior. This release does not claim model-output quality, live Lumiverse import or activation, provider pricing, or generation duration.

## v0.40 — 2026-09-09

### Added

- An opt-in Vault action that prepares or reopens a Project Graph beta while leaving the original V2 project unchanged.
- A mobile-safe Project Graph panel with graph counts, revision-aware entity renaming, preserved conflict input, change receipts, and explicit reload.
- A graph-native preview compiler for character-card and Lumiverse World Book structures, including ownership routing, disabled secret lore, temporal-state exclusion, stable entry IDs, and parser validation.
- Idempotent V2 migration and compile-preview APIs plus restart-equivalence regression coverage.

### Changed

- The compact version label now reads `v0.40`.
- M1 is complete: 9 of 17 ordered roadmap items are complete and 8 remain. M2 Blueprint Studio is next.

### Why

- Blueprint needs a proven path from an existing user project into durable structured truth and back into inspectable artifacts before it can safely plan larger, more expensive Forge builds.

### Validation boundary

- Local tests prove selected-project migration, controlled editing, structural compilation, parser acceptance, and fresh repository reload for fixtures. The V2 Vault remains authoritative; live Lumiverse import/runtime behavior and cross-process concurrency are not claimed.

## v0.39 — 2026-09-09

### Added

- Revision-safe Project Graph commands for entity renames and canon-fact updates, with stable IDs, alias preservation, optimistic conflicts, non-mutation on failure, and change/blast-radius receipts.
- A transactional per-user Project Repository under LoreBible's local application-data directory, using encoded project paths, per-project write serialization, staged verification, backups, explicit recovery, and corrupt-primary preservation.
- Internal graph repository APIs for summaries, create/load, revisioned commands, recovery inspection, and explicit backup restoration.
- Regression coverage for competing writes, restart reloads, path containment, corruption, backup preconditions, credential rejection, safe HTTP errors, and graph change semantics.

### Changed

- The compact version label now reads `v0.39`.
- M1 is still in progress; the current Vault remains on V2 browser storage until the M1.3 migration/edit/compile/restart vertical slice proves the repository end to end.

### Why

- Blueprint and resumable Forge need one durable write authority that rejects stale edits and preserves recoverable project state rather than overwriting whole documents opportunistically.

### Validation boundary

- Tests cover real temporary-directory persistence and in-process concurrency. Cross-process locking, power-loss guarantees, live Vault migration, and Lumiverse runtime behavior remain unproven.

## v0.38 — 2026-09-09

### Added

- A versioned Project Graph v1 contract for projects, canon facts, entities, directional relationships, knowledge claims, temporal snapshots, ownership, source evidence, dependencies, artifacts, builds, findings, decisions, and unresolved items.
- Runtime graph validation with path-specific findings for duplicate stable IDs, missing entity/fact/artifact references, invalid relationship endpoints, malformed ledgers, and incomplete player-agency protection.
- A deterministic `SavedProjectV2` migration that preserves the canonical serialized source and SHA-256 checksum, produces stable semantic IDs, and records migration decisions, warnings, counts, and validation status.
- Regression coverage for source preservation, unknown V2 fields, non-mutation, stable IDs, one-way relationships, belief-versus-truth separation, opening/current temporal routing, and credential-shaped field rejection.

### Changed

- The compact application version label now reads `v0.38`.
- M1 Project Graph is now explicitly in progress; V2 remains the only live editor/save authority until the transactional repository slice is complete.

### Why

- LoreBible needs one structured source of truth before Blueprint, resumable Forge, activation engineering, and full-fidelity publishing can safely share canon. An additive migration foundation protects existing projects while those later systems are introduced incrementally.

### Validation boundary

- Automated checks establish deterministic structure and migration behavior only. v0.38 does not automatically migrate saves, replace browser persistence, or establish Lumiverse runtime behavior.

## v0.37 — 2026-09-09

### Added

- A dedicated `Start-LoreBible-Test.ps1` launcher runs the GitHub `test` worktree independently on port 3001 with separate logs under `%LOCALAPPDATA%\LoreBible\test-logs`.
- A separately verified Windows desktop shortcut, **LoreBible Test**, points directly at the test-worktree launcher without replacing the normal LoreBible shortcut.
- Launcher regression coverage confirms the test port, test URL, separate logs, configurable server port, and absence of provider credentials in launcher arguments.

### Changed

- The server now accepts a valid `PORT` environment value and safely defaults to port 3000, allowing normal and test versions to run side by side.
- The compact application version label now reads `v0.37`.

### Why

- A branch-specific shortcut must not silently open whichever LoreBible instance already owns port 3000. Port isolation makes the visible test version deterministic while preserving the normal running app.

## v0.36 — 2026-09-09

### Added

- A Windows GitHub Actions quality gate now runs on every push and pull request with Bun 1.3.14, frozen dependencies, the full test suite, TypeScript checking, and the production build.
- A deterministic workflow-contract test prevents the CI release commands, pinned Bun version, or Windows runner from disappearing unnoticed.
- Mobile regression coverage now verifies the Divergence proceed action alongside the existing Spark, Connections, Export, and Vault reachability safeguards.
- SSE lifecycle coverage now verifies that completion and cancellation emit exactly one terminal event, late server output is refused, late client events are ignored, caller cancellation aborts promptly, and premature EOF remains an error.

### Changed

- The selected Divergence proceed action is full-width on mobile, returns to intrinsic width on larger screens, and includes bottom safe-area padding for phone browser controls.
- The compact application version label now reads `v0.36`.

### Why

- M0.8 turns LoreBible's manual release checks into an automatic repository gate and protects the mobile navigation and generation-stream behavior that previously caused missing controls, apparent stalls, and ambiguous completion.

## v0.35 — 2026-09-09

### Added

- A typed narrator-card IR and canonical Lore Manifest now sit between authored project data and runtime serializers.
- Native Lumiverse World Book export uses a strictly validated v1 envelope and complete observed entry field types derived from a sanitized structural fixture.
- The Export Drawer now offers separate **Lumiverse World Book** and **Portable Lorebook** downloads with distinct filenames and fidelity guidance.
- CHARX bundles include `lorebible-compilation.json`, recording artifact profile, portable omissions, performed structural checks, and the unverified runtime boundary.
- Deterministic tests cover stable entry UIDs, temporary-state exclusion, disabled secrets, key normalization, field ownership, player agency instructions, cross-format parity, native parsing, portability reporting, and export labels.

### Changed

- Character Card V2, Character Card V3, and CHARX now compile the same card fields and embedded lore from one shared artifact model.
- Narrator-world cards now use deliberate field ownership: durable world scope in Description, narrative behavior in Personality, starting framework in Scenario, authored prose in First Message, and supporting facts in conditional lore.
- Every narrator-world card receives a genre-neutral world-director contract that protects `{{user}}` agency, NPC autonomy, knowledge boundaries, secrets, continuity, and ordinary-life coverage.
- Explicit project-authored System Prompt and post-history instructions are preserved beneath LoreBible's durable safeguards instead of replacing or being discarded by them.
- Example Messages remain empty when none were authored and produce a transparent finding instead of serializer-invented dialogue.
- Advanced activation controls default off unless supported by authored source intent; settings from the supplied example lorebook are not copied as universal defaults.
- Legacy service-layer export helpers are no longer part of the public service API.
- The compact application version label now reads `v0.35`.

### Fidelity and validation

- The native serializer is grounded in the user-supplied `___St_Greed_2_0_lumiverse.json` as read-only schema evidence; none of that file's creative content is included in LoreBible.
- Portable Character Books preserve compatible content, keys, state, order, and depth but report omitted native priority, selective, recursion, timing, group, probability, scan-depth, and vector controls.
- Automated checks establish deterministic structure and cross-format agreement. Live Lumiverse import, Dry Run, Diagnostics, embedding behavior, and roleplay runtime behavior were not performed and are not claimed.

## v0.34 — 2026-09-08

### Added

- Provider-aware model discovery normalizes OpenAI-compatible and Gemini model-list responses into one catalog boundary.
- Model listing has an eight-second deadline and returns a specific recovery message when a provider stalls.
- Regression coverage verifies provider capability filtering, discovery cancellation, stale-request rejection, custom-model preservation, and selected-model routing across Refine operations.

### Changed

- Models explicitly reported as image-only, embedding-only, or otherwise lacking text generation are excluded from LoreBible's generation picker; models without capability metadata remain visible rather than being guessed unusable.
- Switching connection profiles cancels the prior catalog request and ignores any late result, preventing one provider's models from appearing under another profile.
- Custom model IDs remain selectable user overrides even when provider discovery omits them.
- The compact application version label now reads `v0.34`.

### Verified

- Entry reroll, variants, entry push, and section regeneration all forward the active connection profile and exact selected model.

## v0.33 — 2026-09-08

### Added

- Divergence cards now carry stable lineage metadata identifying their node, immutable parent, root, and the operation that created them.
- Regression coverage protects single-card reroll/steer ancestry, push-further fan-out, and reroll-all history isolation.

### Changed

- **Push further** now sends the exact selected Divergence card to the generation service and requires every returned branch to develop that source.
- Rerolling all angles starts a clean board of independent roots instead of attaching new cards to old histories by array position.
- Single-card rerolls, steering, and manual edits share one lineage-aware versioning path and avoid recursively nesting version histories.
- The compact application version label now reads `v0.33`.

### Fixed

- Reordered model results can no longer inherit the history of an unrelated angle during **Reroll all**.
- Cancelled or failed board-level generation continues to leave the last accepted Divergence board untouched; only completed results are committed.

## v0.32 — 2026-09-08

### Added

- Full active-workspace recovery now preserves the current stage, unlocked stages, Spark analysis, canon settings, world physics, all Divergence angles and version history, the selected angle, model settings, and the current manuscript across browser reloads and mobile/Desktop Site mode switches.
- The Vault now displays each project's saved stage and highest unlocked stage.
- Corrupt or unavailable browser storage produces a visible recovery notice while keeping current in-memory work available.

### Changed

- The Vault now stores canonical V2 project records rather than flattening them into bare documents and rebuilding every project with whichever settings happen to be active.
- Opening a project restores its exact saved workflow instead of always jumping to Stage 5.
- Fully forged projects previously mislabeled as Stage 1 by the old global autosave are recognized as Refine-ready during restoration.
- The compact application version label now reads `v0.32`.

### Fixed

- Deleting a Vault project now writes the complete resulting store immediately, preventing the removed project from being recreated by a later autosave pass.
- Corrupt V2 data, including incomplete nested workflow records, is copied verbatim to a timestamped recovery key without replacing the original during load.
- Failed Vault and workspace writes preserve the previous stored value and no longer report a successful save.
- **Save and start new** no longer clears the active project when the Vault write fails.
- Removed the unrelated legacy `v3.2` sidebar footer so the shared release badge is the only displayed application version.

## v0.31 — 2026-09-08

### Changed

- Normal generation now stays on the exact selected model; the legacy environment-key path requires an explicit `GEMINI_MODEL` instead of silently cycling through a model pool.
- Refine generation, procedural-roll suggestions, and Test Bench turns now use the selected connection profile and model.
- Consistency, voice, and opening audits are explicitly identified as local heuristics.
- New scenario drafts now begin from neutral, premise-preserving fields instead of automatically introducing institutional conflict, survival goals, grim aesthetics, romance, violence, a ticking clock, or an intake scene.
- New-project Physics controls now default to neutral content settings. Explicit user selections and existing saved-project settings remain unchanged.
- A raw Spark remains available as the draft pitch and situation but is no longer treated as a finished playable opening.
- Draft construction was moved into a pure module so genre neutrality and user-input preservation can be tested directly.

### Fixed

- Model, quota, timeout, credential, and structured-output failures now preserve accepted work and return actionable Retry, Change Model, or Connections guidance.
- Removed silent creative substitutes from Spark parsing, Divergence, single-angle rerolls, Forge, entry revisions, section regeneration, procedural suggestions, and Test Bench turns.
- Forge validation no longer fills incomplete model output with unrelated facilities, syndicates, debts, surveillance, survival costs, or countdowns.
- Temporary current-world state no longer becomes constant lore or a fallback System Prompt in runtime card, lorebook, and CHARX exports.

### Added

- A small `v0.31` label beside the LoreBible brand on desktop and mobile, backed by a shared version constant.
- A shared structured generation-failure contract for JSON and streaming endpoints, plus visible state-preservation notices.
- A generation-path failure inventory documenting the behavior and fallback policy of every generation and audit route.
- Production Studio north-star architecture, phased delivery roadmap, complete 0–150 requirement traceability, and Lumiverse capability-evidence register.
- Regression coverage for neutral draft construction and runtime export state isolation.

## v0.3 development baseline — 2026-09-07

### Added

- Secure Windows DPAPI-backed connection profiles for Gemini AI Studio, OpenRouter, and NanoGPT.
- Curated and custom model IDs with provider-reported availability and connection testing.
- Generation progress, cancellation, usage reporting, and optional display of provider-supplied reasoning content when available.
- Mobile Spark draft recovery and mobile-safe primary generation controls.
- Windows launcher and desktop-shortcut installer.

### Notes

- Provider connection success confirms authentication and model discovery where supported; it does not prove a full generation request.
- Lumiverse export checks are structural unless a release record explicitly identifies runtime-observed evidence for a named Lumiverse build.

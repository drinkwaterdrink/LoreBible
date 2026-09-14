# Changelog

All notable LoreBible changes are recorded here. The project adopted this changelog during v0.3 development; Git history remains the detailed record for earlier work.

## Unreleased

## v0.61 — 2026-09-13

### Fixed

- Accepted Blueprint categories now become explicit per-bundle generation targets instead of advisory prose that fixed six-bundle output could ignore.
- Categories without a legacy manuscript section—including Economy, Education, Culture, Investigation, Clues, and user-created categories—now have a canonical supplemental-lore destination and retain their visible category identity through Project Graph checkpoints and native World Book export.
- Forge now requires concise semantic names for world rules, secrets, history, and supplemental lore; compatible older entries derive concise titles from authored keys/content instead of degrading to labels such as “History 1” or “Secret 2.”
- Every bundle validates its own planned categories before durable acceptance, while the lore-writing bundle enforces the overall minimum; single-request and one-bundle-at-a-time modes use the same gate.
- A cross-category lore allocation fills any gap between category minima and the accepted total-library minimum with focused entries rather than longer paragraphs.
- v0.60 checkpoints remain loadable, while a versioned Forge fingerprint prevents pre-fix durable builds from being mistaken for fully validated v0.61 builds.

### Validation boundary

- The supplied 24-entry export was inspected read-only and confirmed the regression: a 60–120-entry plan produced 24 entries across nine fixed categories, including generic rule, secret, and history titles. Deterministic tests now cover category routing, supplemental-category serialization, semantic titles, minimum coverage failures, and legacy checkpoint compatibility. Live provider adherence and Lumiverse import remain to be tested with a newly forged project.

## v0.60 — 2026-09-13

### Fixed

- Stage 3 “Plan Lorebook Size” now opens the actual Guided Blueprint editor instead of exposing the internal Project Graph Beta panel.
- Blueprint planning omits blank optional Physics strings before validation, so ordinary projects using default genre, horror, humor, linguistic-base, and margin fields no longer fail with “Blueprint preview request is invalid.”

### Validation boundary

- Regression tests cover default Physics request validity and the distinction between Vault-launched graph tooling and workflow-launched Blueprint editing. Existing tests continue to cover the mobile editor, 2,000–40,000 custom slider, presets, persistence, and Forge brief. Live provider generation and Lumiverse runtime behavior are not implied.

## v0.59 — 2026-09-13

### Fixed

- Opening “Plan Lorebook Size” now reuses the prepared Project Graph already associated with the active manuscript instead of trying to migrate a duplicate graph.
- Existing graph edits and Forge checkpoints remain intact while the Blueprint preview receives the latest Stage 3 premise and Physics inputs.

### Validation boundary

- A regression test covers matching prepared graphs by their legacy document identity, alongside the existing Blueprint launch, editing, persistence, and Forge-brief suites. Live provider generation and Lumiverse runtime behavior are not implied.

## v0.58 — 2026-09-13

### Fixed

- Stage 3 now exposes a first-class Production Blueprint card before Forge, including the selected total lorebook-library target, estimated entry range, and separate runtime activation budget.
- “Plan Lorebook Size” prepares the current project and opens Blueprint Studio directly in editable Guided mode; users no longer need to discover the Project Graph beta panel through the Vault.
- Stage 3 Forge execution changes now update the accepted Blueprint selection instead of allowing the visible radio choice and durable Forge plan to disagree.

### Changed

- New projects clearly describe Auto, Compact, Standard, Large, Massive, and custom lorebook sizing up to 40,000 tokens from the normal workflow.
- Blueprint setup preserves the current in-progress manuscript in the Vault before preparing its graph, and reports preparation failures inline in Stage 3.

### Validation boundary

- Component tests verify visible mobile-safe Stage 3 access, selected budget summaries, editable Guided launch, and existing Forge execution controls. The full Blueprint contract, persistence, 40,000-token bounds, and Forge brief remain covered by their existing deterministic suites. Live provider generation and Lumiverse runtime behavior are not implied by these UI checks.

## v0.57 — 2026-09-13

### Added

- Forge category proposals now carry typed specialist projections for entities, directional relationships, knowledge boundaries, and historical/current facts while retaining their original manuscript payloads losslessly.
- New NPC generation explicitly distinguishes principal and roster cast and records meaningful independent activity outside the player's immediate orbit.

### Changed

- Bundle 3 now asks for NPC-to-NPC relationships and separates truth, knowledge, suspicion, and discovery conditions instead of centering every connection on `{{user}}`.
- Project Graph validation rejects malformed specialist projections, while v0.55–v0.56 checkpoints without projections remain compatible and are enriched when rebuilt from accepted sections.

### Why

- M3.2 requires structured world intelligence before canon acceptance and retrieval engineering can reason about cast depth, world autonomy, knowledge separation, and temporal routing.

### Validation boundary

- Deterministic projection, legacy compatibility, payload/manuscript parity, stricter new-NPC validation, checkpoint behavior, full tests, TypeScript, production build, and diff checks are validated. The projections remain generated proposals rather than accepted canon; entity cross-link resolution and live provider quality sampling remain future work.

## v0.56 — 2026-09-13

### Added

- Guided and Expert Blueprint modes now provide a touch-friendly 2,000–40,000 token lore-library control with live entry-count estimates; Auto, Compact, Standard, Large, and Massive presets remain available.
- Forge receives a validated, concise production brief derived from the accepted Blueprint, including authored library size, separate runtime budget, cast ranges, category coverage, mechanic choices, and ordinary-life depth.
- A sanitized native Lumiverse CHARX evidence fixture and deterministic parity comparator cover the observed `lumiverse_modules.json.world_books` envelope and its standalone World Book equivalent.

### Changed

- Accepted Blueprint choices now participate in the durable Forge fingerprint, preventing a changed build plan from silently resuming an incompatible checkpoint.
- Native World Book parsing accepts nullable and numeric field forms observed in the supplied contemporary Lumiverse export without guessing unobserved enum meanings.

### Why

- Lorebook size must control useful world coverage before expensive generation, not merely export formatting or paragraph length. The attached-book evidence also creates the structural foundation for a future verified full-fidelity CHARX serializer.

### Validation boundary

- Blueprint projection, request transport, fingerprint separation, mobile controls, token/entry estimation, native fixture parsing, and static attached-versus-standalone parity are validated. Live provider output quality, Lumiverse import/round-trip behavior, unexercised native enum variants, and production `lumiverse_modules.json` emission are not yet verified.

## v0.55 — 2026-09-13

### Added

- Forge bundle completion now projects provider sections into stable typed `lorebible.forge-category-record/v1` proposal records inside the durable Project Graph.
- Category records preserve section identity, category identity, record kind, source entry ID, semantic name, ordinal, and lossless payload without turning generated material into accepted canon.
- The manuscript checkpoint is derived from category records, so the current editor remains compatible while graph-native ownership begins.

### Changed

- Existing v0.54 Forge builds without category records are backfilled deterministically when the next bundle is accepted; completed work is not lost or duplicated.
- Graph validation rejects duplicate, malformed, or checkpoint-inconsistent category records.

### Why

- M3.2 needs Forge to produce structured world data before later retrieval, canon, and artifact systems can reason about it. This is the first safe slice: it introduces the graph boundary without a destructive manuscript rewrite or extra model calls.

### Validation boundary

- Category projection, reverse manuscript derivation, legacy checkpoint backfill, graph parity validation, full test suite, TypeScript, production build, and diff checks are validated. Specialist category writers, canon acceptance, Lumiverse runtime behavior, and full-fidelity CHARX embedding remain future roadmap work.

## v0.54 — 2026-09-13

### Added

- The live Forge endpoint now binds matching prepared Project Graphs to the durable six-bundle records introduced in v0.53.
- Server-side creative-input fingerprints select the correct resumable build without treating a provider/model change as a new world.
- Forge recovery discovers saved graph checkpoints after a browser reload and restores completed sections, progress, and safe retry diagnostics to the Stage 4 interface.
- Single-request Forge responses are divided into six atomically accepted graph checkpoints while still using only one provider generation call.

### Changed

- Provider attempts are recorded before generation; validated sections are accepted afterward, keeping provider success distinct from canonical graph acceptance.
- An active attempt left behind by a stopped server is marked as safely interrupted and becomes retryable on the next request.
- Projects without a matching prepared Project Graph retain the existing V2/browser checkpoint behavior.

### Why

- Durable records only protect users when the real generation route and mobile recovery UI consume them. This connects the tested foundation without replacing the established V2 workflow or increasing provider-call count.

### Validation boundary

- Coordinator persistence, process-restart recovery, input fingerprinting, model-switch compatibility, single-request checkpoint acceptance, client request forwarding, focused UI behavior, full tests, TypeScript, build, and diff checks are validated. Live provider and forced process-kill behavior remain runtime tests rather than automated certification.

## v0.53 — 2026-09-13

### Added

- A versioned durable Forge build record now represents all six bundles as explicit pending, active, complete, failed, or cancelled work inside the canonical Project Graph.
- Every Forge attempt can record its safe provider, model ID, actual gateway route, timestamps, result state, and bounded failure diagnostic without storing credentials.
- Project Graph commands can initialize Forge builds and atomically begin, complete, fail, or cancel individual bundle attempts through the existing transactional repository.
- Restart-safe checkpoints preserve accepted bundle sections, enforce contiguous generation order, and allow a failed or cancelled bundle to retry with a newly selected model.

### Changed

- Forge bundle completion now validates the exact expected section set before accepting it into a canonical checkpoint.
- Resume validation rejects a changed creative-input fingerprint or source revision instead of silently combining stale and current work.
- Project Graph validation now rejects malformed native Forge build records while continuing to accept older graphs whose existing build records predate this feature.

### Why

- Long Forge runs need durable, auditable ownership outside browser memory. Provider success and acceptance into the Project Graph are separate state transitions, so a reload or provider failure no longer has to invalidate completed work.

### Validation boundary

- The durable state machine, cancellation/retry behavior, command application, atomic repository reload, and graph validation are deterministically tested. The current `/api/forge` streaming route still uses its existing client checkpoint contract; wiring that route and mobile Forge UI to these canonical records is the next M3.1 slice and is not claimed here.

## v0.52 — 2026-09-12

### Added

- Blueprint selections now preserve separate total lore-library and runtime activation token budgets. Library presets reach 40,000 estimated tokens; runtime choices support 2k, 4k, 8k, 12k, 20k, 30k, 40k, Auto, and Unlimited recommendations.
- The canonical Lore Manifest now owns stable category IDs, category labels, semantic names, and concise `[CATEGORY] Semantic Name` display titles.
- Standard lore categories now include NPC, Relationship, Faction, World Rule, Location, Item, Secret, History, Pressure, Knowledge, Lore, Mechanic, Rumor, Clue, Culture, Species, Magic, Technology, Ritual, Event, and Ordinary Life, while preserving custom category IDs.
- A current dependency-ordered Production Lore and Runtime Quality implementation plan reconciles the new north-star requirements with the shipped v0.51 architecture.

### Changed

- Oversized, paragraph-like, blank, or content-derived entry names receive a stable short fallback and a Major quality finding instead of becoming unreadable Lumiverse titles.
- Native and portable serializers consume the same canonical lore title; serializers no longer decorate titles independently.
- Portable embedded Character Books explicitly identify themselves as compatibility output and no longer serialize the obsolete hard-coded 2,048-token runtime budget.
- Existing v0.51 Blueprint selections migrate their new token settings deterministically from the already-saved lorebook-scale and runtime presets.

### Why

- A large authored library and the amount retrieved into one prompt solve different problems. Separating them permits deep worlds without forcing every lore entry into context.
- Entry titles must remain scannable and consistently categorized in Lumiverse, while runtime settings must come from canonical intent rather than exporter defaults.

### Validation boundary

- Budget contracts, 40k limits, legacy selection migration, canonical title formatting, serializer title reuse, portable-budget omission, full tests, TypeScript, build, and diff checks are validated for this release. Full-fidelity advanced World Book embedding inside CHARX remains unverified until a contemporary Lumiverse-native fixture proves the structure.

## v0.51 — 2026-09-12

### Added

- Stage 3 now has an editable, mobile-first Blueprint Studio with Smart Auto, Guided, and Expert views.
- Guided controls cover artifact outputs, Arc/Sandbox/Hybrid mode, build intensity, generation quality, runtime budget, lorebook size, ordinary-life coverage, lore categories, optional mechanic packs, and Forge execution preference.
- Expert mode adds exact lorebook, principal-cast, roster-cast, and category ranges plus planned runtime-role metadata.
- Users can add scenario-specific custom lore categories. Custom entries receive safe stable IDs and survive recommendation refreshes.
- Blueprint fields, categories, and mechanics can be locked so refreshed recommendations preserve explicit user decisions and omissions.
- Forge now has a genuine **Single provider request** mode that combines all remaining bundle schemas into one call, including checkpointed resumes.

### Changed

- The former “mundanity” concept is presented as ordinary-life coverage with five plain-language levels while preserving the existing saved value.
- Blueprint edits stay local until **Save Blueprint**. Cancel leaves the last accepted selection untouched; Save validates and commits the complete selection atomically.
- Accepted Blueprint selections now travel through active-workspace autosave and Vault project saves, and restore their Forge execution preference.
- Advanced mechanic choices are explicitly labeled as planned intent until later Lore Production compiler stages implement and validate them.

### Why

- Users need control over what a premise actually requires before spending provider quota. World breadth, model effort, lorebook size, runtime prompt cost, and call pacing solve different problems and should not be collapsed into one density slider.
- Mobile users need Save and Cancel available without scrolling through every category, and quota-limited AI Studio workflows need a real one-call alternative rather than a mislabeled six-call path.

### Validation boundary

- Selection invariants, immutable edits, recommendation reconciliation, custom-category IDs, mobile server rendering, persistence round trips, Forge batching/resume behavior, the full test suite, TypeScript, and the production build are validated before release. Browser-rendered ergonomics and live provider behavior remain separate runtime observations.

## v0.50 — 2026-09-12

### Fixed

- Divergence and Project Graph actions now create browser-safe IDs when `crypto.randomUUID()` is unavailable on Android or a local-network HTTP address. A completed generation can no longer crash afterward with `crypto.randomUUID is not a function`.
- Forge bundle 3 now uses one shared relationship contract. The provider schema and local validator both require `relation`, eliminating the contradictory `relationshipWeb entry 1 is missing required content` failure caused by LoreBible itself.
- Forge failures now name the exact bundle, selected model, and underlying safe error. Completed bundle checkpoints remain intact so retrying or changing models resumes from the failed bundle.
- Provider errors retain the HTTP status and bounded provider or network explanation instead of collapsing into `Provider request failed`.
- OpenAI-compatible providers now receive bounded compatibility retries when a model rejects strict JSON Schema or streaming parameters with a generic invalid-request response. Retries progressively relax transport formatting without changing the selected model or inventing output.
- Gemini requests keep the documented `reasoning_effort` control but no longer force an additional provider-specific thinking extension that can conflict with model aliases or compatibility behavior.

### Added

- Shared, deterministically tested Forge validation and diagnostic modules.
- A refreshed one-file Production Studio master blueprint containing current delivery status, ordered milestones, release gates, and the post-v0.50 implementation sequence.

### Why

- Provider compatibility failures and LoreBible validation failures previously looked alike, which made model switching and retries difficult to diagnose. This release separates those causes and only relaxes optional request features when a provider explicitly rejects the original request.
- Mobile/LAN browsers are not always secure contexts, so modern UUID helpers cannot be assumed even when generation itself succeeds.

### Validation boundary

- Automated client-ID, gateway compatibility, Forge contract, Forge diagnostic, Divergence board, Project Graph, full-suite, typecheck, and production-build checks are run before release. No paid live provider request is made by this test suite; Gemini AI Studio, NanoGPT Gemini 3.8, and NanoGPT Terra still require user-key runtime confirmation.

## v0.49 — 2026-09-12

### Fixed

- Gemini AI Studio profiles now send an explicit reasoning effort even when the model was discovered from the provider catalog instead of the curated list. This prevents aliases such as `gemini-flash-latest` from silently selecting a larger default thinking budget.
- The Connections “Test Selected” probe now allows 2,048 output tokens instead of 64. Gemini thinking tokens count toward the output ceiling, so the previous probe could falsely fail with `finish reason: length` even when ordinary generation worked.
- Forge now prioritizes **Continue with next bundle** whenever a partial checkpoint exists, even if an older manuscript document is still in memory. **Review Finished Manuscript** appears only after the progress reaches all six bundles.

### Why

- The reported Gemini failure was a budget/probe mismatch, not an invalid AI Studio key: Flash-Lite succeeded because it does not spend the same thinking budget, while Flash could consume the 64-token probe before emitting `{\"ok\":true}`.
- The Forge screenshot showed the first bundle saved at 1/6 while an old document caused the wrong completion action to render.

### Validation boundary

- Automated gateway, connection-route, Forge-component, full-suite, and typecheck checks pass. The v0.48 production build passed; the v0.49 build was not rerun because the host execution limit was reached. A live Gemini request was not made by this session; use **Test Selected** again with the current v0.49 server to confirm the user’s key and model route.

## v0.48 — 2026-09-12

### Fixed

- Normal and test launchers now derive the expected application version from `package.json`. A newly updated server is no longer mislabeled as older because of a stale hard-coded launcher version.
- Added a self-cleaning LoreBible Test restart launcher. It stops only verified LoreBible listeners on isolated test ports 3001–3010, waits for them to close, starts one current test server, and opens its correct URL.
- Added an installer for a single-click **LoreBible Test** desktop shortcut backed by the restart launcher.

### Why

- Ending one visible process in Task Manager could leave an older child server alive, while launcher version drift made the replacement server fail its own health check. Restarting the test branch should be one deliberate action instead of manual process hunting.

### Validation boundary

- Automated launcher checks cover the shared version source, test-port isolation, verified health probing, scoped process termination, shortcut target, and credential-free arguments. The installed Windows shortcut is separately inspected after creation.

## v0.47 — 2026-09-12

### Added

- Stage 3 now offers two Forge execution modes: Continuous runs all remaining bundles, while One bundle at a time pauses after each validated bundle so the user controls when the next provider request begins.
- A paused Forge checkpoint has a dedicated Continue with next bundle action and is never presented as a finished manuscript.
- Interrupted Forge runs resume after the last complete contiguous bundle instead of regenerating accepted bundle output.

### Fixed

- Forge now accepts only the sections assigned to the active bundle. Extra top-level provider metadata such as a stray `keys` array is ignored instead of being misread as a lore section and causing errors such as `keys entry 1 is malformed`.
- Empty model responses now distinguish a reasoning-only response from a response with no usable answer and include a safe finish reason when available. Reasoning contents are not copied into the error.

### Why

- Free and tightly rate-limited APIs can fail when Forge makes several requests back to back. User-paced checkpoints reduce that pressure, preserve completed work, and make slow or interrupted builds diagnosable and resumable.
- Some compatible-provider models, including Muse-style routes, may finish without a usable assistant answer. More precise diagnostics make this distinguishable from a bad API key without fabricating output.

### Validation boundary

- Automated gateway, client-stream, component, and Forge-resume tests cover checkpoint separation, one-bundle execution, contiguous resume validation, provider-metadata isolation, and safe reasoning-only diagnostics. No paid live-provider call was made, so provider-specific compatibility and rate-limit behavior still require an in-app test.

## v0.46 — 2026-09-12

### Added

- Stage 1 can request four genuinely fresh, model-generated premise starters in one explicit call. The built-in examples remain clearly labeled offline starters, and a failed or cancelled request preserves the currently displayed cards.
- Divergence now stores each successful four-angle generation as its own board. Previous/Next Board controls restore complete reroll-all results independently from each angle's version history, including across autosave and saved-project reloads.

### Fixed

- The mobile Connections model list resets to its first result after profile, search, sort, subscription-filter, favorite/order, or catalog changes, and touch scrolling snaps to complete model rows instead of leaving the first result clipped.

### Why

- Static Stage 1 examples were being mistaken for generated results, reroll-all had lost its prior full-board history, and nested mobile scrolling could strand the model picker between rows. This release makes those boundaries explicit and recoverable before the larger Blueprint redesign.

### Validation boundary

- Automated contract, route, client, component, persistence, and launcher checks cover the new premise stream, strict four-item validation, failure preservation, board migration/history, and model-list reset behavior. No paid live-provider premise request was made; actual provider quality, latency, and quota remain runtime-dependent.
- The ordered Production Studio roadmap remains 9 of 17 complete with 8 remaining. v0.47 / M2.2 editable and persisted Blueprint controls are next; v0.48 is the approved resumable Forge slice.

## v0.45 — 2026-09-11

### Fixed

- Structured generation now safely accepts a single fenced or harmlessly wrapped JSON document from providers that add formatting around an otherwise valid response. Invalid output remains an explicit failure and never falls back to invented content.
- OpenAI-compatible streams now separate thought/reasoning content parts from the answer text, improving Gemini 3.8-style thinking responses and keeping reasoning out of structured JSON parsing.
- Structured-output errors now identify the provider, model, and response mode, making connection diagnostics more actionable.

### Changed

- Connections & Models is now mobile-first: the profile editor and model catalog have independent scrolling, model search and counts are visible near the picker, custom models are tucked under Advanced model settings, and Save/Test actions remain in a sticky footer.
- Model favorite buttons and primary mobile actions meet a larger touch target while preserving the desktop two-column layout.

### Validation boundary

- The full automated suite passes (257 tests, 0 failures) and TypeScript typechecking passes. Live Gemini 3.8 provider behavior still requires running the selected-model test with the user's AI Studio or OpenRouter key; this release removes safe formatting/reasoning incompatibilities but does not claim provider availability.

## v0.44 — 2026-09-11

### Fixed

- The test-branch Windows launcher now skips an older LoreBible process that occupies port 3001 and selects the first available local port instead of repeatedly attaching the browser to the stale server.
- Elevated listeners are detected with a `netstat.exe` fallback when the PowerShell TCP cmdlet cannot see them.
- Each launch uses a unique stdout/stderr log filename, preventing a previous server's locked log from blocking the replacement process.

### Why

- Restarting the test shortcut could leave the browser on a pre-v0.43 server because the old process owned both the HTTP port and the shared development tooling port. v0.44 makes the fallback launch path deterministic and visibly versioned.

### Validation boundary

- Launcher contract tests pass for version/capability checks, elevated-listener detection, fallback port selection, and unique logs. The currently running elevated stale process cannot be stopped by this session; after clicking the updated shortcut, verify the browser URL and v0.44 badge.

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

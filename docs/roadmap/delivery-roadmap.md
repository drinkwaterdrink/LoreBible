# Delivery roadmap

**Status:** 8 of 17 ordered roadmap items complete (M0.1–M0.8); 9 remain. M1 Project Graph and persistence foundation is in progress: M1.1 contracts and deterministic V2 migration are complete, while repository, commands, recovery, and the thin vertical slice remain. Read the [architecture](production-studio-blueprint.md) before implementing a milestone. Cut a detailed implementation plan per bounded subsystem; do not execute this whole horizon as a single refactor.

## 1. Reconcile the original roadmap

The original handoff prioritized P0 build/runtime, P1 contracts/state, P2 creative neutrality and truthful failure, P3 Divergence/Author Flavor, P4 UX/persistence, and P5 incremental architecture. That ordering remains the stabilization backbone; the Production Studio vision extends it rather than replacing unfinished work.

| Original work | Current evidence / remaining obligation | Destination |
|---|---|---|
| P0 correctness | Bun scripts/tests and provider modules exist; passing tests do not cover every legacy path | M0 and every gate |
| P1 contracts/state | Canonical SparkDNA and SavedProjectV2 exist; complete workflow restoration and migration need end-to-end coverage | M0, M1 |
| P2 neutrality/failure | Draft defaults and legacy deterministic generation paths still require removal or explicit offline isolation | M0 before expansion |
| P3 Divergence/flavor | Preserve current v2 and author controls; verify selected-take steering, stable lineage, post-architecture flavor | M0, then M2/M3 integration |
| P4 UX/persistence | Keep progress/cancel, scrollable Connections, custom models, Gemini and mobile draft work; verify complete state retention | M0, M1, every new stage |
| P5 architecture | Existing server/model, routes and generation modules are extension points | Incremental M0–M9 |
| Provider migration | DPAPI profiles, text gateway, custom IDs and provider discovery are foundations, not a reason to fork new clients | M0 capability audit; M3 routing; M7 images |
| Desktop/Android access | Preserve launcher; private authenticated host access and project continuity before broader exposure | M0/M1 |
| Export cleanup | Two current-state constant paths and System Prompt fallback are directly visible in exportGenerators | M0 first slice |

Earlier specs remain historical records in `docs/superpowers`. Their initial exclusion of reasoning display was subsequently superseded by the user's optional monitoring request: show only provider-exposed material/concise summaries, never request hidden chain-of-thought or fabricate unavailable output. Initial static catalog assumptions were also superseded by custom model IDs and Gemini support. No old spec is a claim that its acceptance criteria all passed.

## 2. Sequencing changes to the 10-phase proposal

- **Move minimal IR forward:** export consolidation needs one representation before full graph-native compilers exist.
- **Move project storage/build records forward:** reliable large Forge requires transactional persistence and checkpoints, not just more generation calls.
- **Move QA foundations forward:** M8 combines existing checks into a workspace; each earlier feature ships its own validation.
- **Move provenance and capability research forward:** source ingestion remains late, but facts and native target assumptions need evidence from the start.
- **Insert a thin end-to-end slice:** migrate a small project, edit one fact, compile and validate a basic package before scaling category generation.
- **Keep native feature gates local:** missing expression/module fixtures must not block ordinary graph editing; they do block claiming those exports are supported.

Milestone numbers M0–M9 correspond broadly to user phases 1–10, with the additions above. Version numbers after v0.3 are assigned only at release; these milestone IDs are not promised release dates.

## 3. M0 — Trustworthy foundation

**Depends on:** current v0.3 baseline. **Outcome:** today's wizard can be trusted before it grows.

### Ordered implementation backlog

| ID | Status | Deliverable / likely files | Required evidence |
|---|---|---|---|
| M0.1 | Complete | Remove status fallback from card System Prompt and synthetic constant state entries; `src/lib/exportGenerators.ts` | Sentinel state absent from runtime exports, retained in source/Markdown; explicit prompt retained; CHARX JSON inspected |
| M0.2 | Complete | Neutral draft construction; `src/App.tsx:createDraftScenarioDocument`, extracted pure builder, relevant defaults | Blank/cozy/family/space fixtures contain no invented genre motifs; existing authored documents unchanged |
| M0.3 | Complete | Inventory every generation path, remove silent creative fallback, preserve candidates; `server.ts`, `server/generation`, `src/services` | Missing key/auth/quota/timeout/schema failure never returns authored content as AI success; prior content survives |
| M0.4 | Complete | Complete V2 save/load and draft lifecycle; `src/App.tsx`, `src/lib/projectPersistence.ts` | Per-project workflow/settings/history restore; delete does not resurrect; corruption recovery; reload/mobile mode switch |
| M0.5 | Complete | Correct branch lineage and steering; App handlers, divergence contracts/services | Selected take sent; immutable parent IDs; reroll-all no index-based history mixing; failure/cancel retains board |
| M0.6 | Complete | Capability-aware model discovery and shared gateway coverage; `server/model`, connection routes/UI | Provider-scoped normalization; text-capability filtering; custom IDs; stale catalog race; discovery deadline; Refine uses selected route |
| M0.7 | Complete | Canonical narrator Card IR and Lore Manifest; native Lumiverse World Book plus portable serializers; shared V2/V3/CHARX compilation; explicit fidelity receipt | Sanitized native-schema parser fixture; stable UIDs; state/secret/agency checks; cross-format parity; no serializer-generated canon; live runtime explicitly untested |
| M0.8 | Complete | Windows CI and mobile workflow regression gate; `.github/workflows/quality.yml`, component and SSE lifecycle tests | Frozen Bun 1.3.14 install, `bun test`, typecheck, build; mobile-safe Divergence/Spark/dialog/export actions; exactly one terminal SSE event |

Use [M0.1's detailed plan](../superpowers/plans/2026-09-07-production-studio-export-state-safety.md) first. Each subsequent row gets a bounded implementation plan with a reproduced failure before product-code changes.

**Exit gate:** no known silent fallback on production generation routes; no default-state leakage in active runtime exporters; recoverable complete project round trip; stable branch parentage; required CI passes; residual issues listed honestly. No claim that all current tests imply genre-neutral output quality.

**Rollback:** preserve old projects and exports; feature-level revert with no destructive migration. Do not erase suspect legacy content from saved manuscripts.

## 4. M1 — Project Graph and persistence foundation

**Depends on:** M0 state/export safety. **Outcome:** a small project survives migration, editing, restart, and compilation through one authority.

**Progress:** M1.1 complete in v0.38: versioned graph contracts, runtime validation, canonical V2 source preservation/checksum, stable semantic IDs, conservative extraction, temporal routing, credential exclusion, and migration receipts. M1 remains open. Next is M1.2 revision-safe commands and transactional Windows `ProjectRepository`; the end-to-end restart/compile slice follows that storage authority.

Build versioned contracts for project, canon, entities, directional relationships, knowledge, temporal snapshots, ownership, source evidence, dependency edges, findings, artifact/build records. Add runtime validators and a command/change-set API with revision conflicts. Implement ProjectRepository and the Windows transactional-storage spike, recovery backups, asset references, and migration receipts.

Copy/import SavedProjectV2 without discarding unknown fields. Keep original raw bytes or serialized original plus hash where raw storage is available. Mark inferred extraction provisional; preserve existing authored text even if its origin cannot be determined. Legacy and graph-native projects have explicit modes. Do not redesign the editor yet.

**Thin vertical slice:** import a small scenario → identify two entities and several accepted facts → rename one entity → show impacted output → compile basic card/book from minimal IR → parse result → restart and reload identical accepted state.

**Tests:** stable IDs, aliases, reference integrity, directionality, belief versus truth, world-time versus edit-time, opening snapshots, conflicting revisions, interrupted atomic writes, corrupted imports, repeated migration, rollback and draft recovery. Verify no secret values enter backups that are intended as portable projects.

**Exit gate:** one write authority, deterministic migration receipts, independent edits survive concurrency conflicts, valid minimal package with exact field comparison. Native import evidence is recorded separately.

## 5. M2 — Blueprint Studio

**Depends on:** M1 contracts/store; M0 Divergence reliability. **Outcome:** a user can inspect and override a premise-specific build inventory before spending on Forge.

Introduce artifact composition, world mode, independent intensity/quality/runtime controls, dynamic Lore Matrix, category explanations, principal/roster targets, pack eligibility, and Smart/Guided/Expert surfaces. Migrate Physics into constraints while retaining its old saved values. Recommendations are proposed, not silently canon.

**Tests:** cozy bakery omits unsupported factions/magic; family visit emphasizes social ecology; war-torn kingdom may justify politics; focused romance is not inflated into a huge world; science-fiction city can legitimately be large. User locks/omissions persist after reanalysis. Count and cost ranges change for supported reasons, not fixed multipliers on prose length.

**Exit gate:** contrasting fixtures produce appropriately different plans, additions/omissions survive save/load, ordinary-life critique explains its evidence, mobile users reach every control and start/cancel action.

## 6. M3 — Graph-native and resumable Forge

**Depends on:** M1 storage/build records and M2 accepted inventory. **Outcome:** multi-batch generation can stop, restart, and resume without losing completed work.

Implement orchestration before expanding specialist count. Generate the first category into graph candidates; accept atomically; derive manuscript. Expand one category at a time. Add cross-linking, principal/roster writers, knowledge claims, independent pressures, continuity/agency/autonomy audits and scoped regeneration. Reuse existing gateway and progress/cancellation contracts.

**Tests:** cancellation before/inside/after a batch; provider stream ends without terminal result; process restart; retry budget; same-job duplicate response; changed input on resume; stale candidate after manual edit; accepted field lock; missing profile on a restored build. No completed candidate is destroyed on cancellation.

**Exit gate:** a Rich build resumes from valid checkpoints, links resolve, accepted facts win conflicts, no mandatory irrelevant category, telemetry distinguishes provider activity from server heartbeat. Output-quality sampling is reported separately from deterministic tests.

## 7. M4 — Lore production and Activation Lab core

**Depends on:** graph-native facts/knowledge/ownership and verified target capability fixtures. **Outcome:** lore has intentional retrieval, not just generated keywords.

Separate architect/writer/retrieval/audit jobs. Add versioned Lore Manifest and activation profiles; implement exact keyword/selective matching first, then positions/priority/budgets, persistence/groups, bounded recursion, and optional vector evaluation. Implement pack compiler changes only for verified capabilities. Build Content/Engineering views, coverage/collision/dead-entry reports, and core simulator.

**Tests:** positive/negative/collision/selective; secret eligibility; seeded groups/probability; persistence message sequences; bounded recursion; crowded-budget eviction; disabled entries; unavailable embedding dependency; keyword fallback limitations. Cross-check simulator expectations against named native diagnostics where available.

**Exit gate:** no important compiled fact lacks explained ownership/retrieval, no unbounded recursion by default, secrets have explicit protection limitations, unsupported simulation returns unknown. Typical/crowded budgets use disclosed assumptions.

## 8. M5 — Archetype card production

**Depends on:** M1 minimal IR and M4 lore ownership. **Outcome:** character, narrator, scenario, and ensemble cards receive different appropriate field composition.

Implement archetype planners, durable field allocation, necessary director instructions, Example Message Lab, Alternate Greeting Lab, and supported alternate field variants. Package planning chooses optional standalone characters rather than creating one for every NPC.

**Tests:** description/personality nonduplication; narrator not impersonating a human; agency in openings/examples; distinct greetings sharing canon; opening-specific snapshots; conditional secrets not exposed in public fields; user edits preserved.

**Exit gate:** each archetype has a golden fixture and ownership audit, System Prompt is deliberate, alternate starts are playable and noncontradictory. Unverified native alternate-field modules remain gated even if internal variants exist.

## 9. M6 — Full-fidelity Publisher

**Depends on:** M4 canonical lore, M5 Card IR, native export fixtures. **Outcome:** one graph revision compiles a modular package with a truthful loss/evidence report.

Implement native World Book, portable Character Book, CCSv3 JSON and CHARX serializers; Markdown/human brief projections; capability receipts, passports, release manifest, checksums, import order, portability losses, exact preview and release gate. Finish Package/Card/Lore/QA/Export panes; Visuals can initially show imported assets.

**Tests:** export → parse → compare supported values/settings; ZIP paths/content; embedded versus standalone differences; unsupported modules/advanced settings; filename collisions/path safety; required assets; deterministic metadata under an injected clock; stale source revision; major waiver invalidation. A JSON schema pass is not an import pass.

**Exit gate:** requested artifacts match their manifest and current IR, no blockers, majors resolved or explicitly accepted for that revision, native backup accompanies advanced features, and all losses/unknowns visible before download.

## 10. M7 — Visual Production Studio

**Depends on:** stable accepted canon, M1 assets/store, M6 packaging. **Outcome:** committed identity drives coherent artwork and verified asset assignment.

Add Image Gateway and provider capability UI, Visual Bible, asset inventory, cover/portrait candidates, commit/review, reference-derived expressions, and CHARX asset integration. Support imported artwork before requiring generation. Keep world/narrator art separate from character portraits.

**Tests:** asset path/MIME/size limits, missing edit capability, cancelled image jobs, stale identity facts, duplicate filenames, committed-reference provenance, expression label mapping and native module round trips. Visual similarity/model review is distinct from structural path checks.

**Exit gate:** asset references resolve, identity changes produce stale warnings, user commitment is preserved, unavailable controls are hidden/explained, export fidelity is supported by fixtures.

## 11. M8 — Integrated QA, health, and deepening workspace

**Depends on:** validation records from M0 onward; M4 retrieval; M6 packages; M7 for visual checks. **Outcome:** users can understand and act on world quality findings across the studio.

Unify continuity, agency, autonomy, knowledge leakage, retrieval, recursion, budget, ownership, portability, and asset checks. Add Roleplay Probe UI, world health with evidence-linked measures, lore/activation heatmaps, blast radius, gap-aware deepening, entity promotion, and mechanic inspector. Keep all accepted work protected during suggested repairs.

**Tests:** every score links to a denominator or is labeled qualitative; not-run/unsupported is not pass; findings stale after relevant edits; requested deepening affects only selected scope; promotion retains IDs/facts; model probes cannot mark native certification.

**Exit gate:** dashboard claims are reproducible from evidence, users can resolve or acknowledge findings, and release decisions consume current validation rather than decorative green statuses.

## 12. M9 — Source Studio

**Depends on:** stable provenance/temporal graph and reliable native production path. **Outcome:** source-grounded projects preserve authority, conflicts and temporal knowledge through export.

Add source inventories, ingestion adapters, extraction candidates, duplicate-entity reconciliation, authority/timeframe/spoiler partitions, conflict review, adaptation choices, and update impact. Sources remain untrusted input; access and copyright boundaries are explicit.

**Tests:** inaccessible/duplicate/unrelated sources; source prompt injection; contradictory claims; franchise cutoff and future leakage; renamed entities; changed-source impacts; user canon outranking generated proposals; no silent full-world overwrite.

**Exit gate:** imported claims remain attributable, temporal boundaries survive compilation, disagreements are reviewable, source updates create candidates rather than new automatic canon.

## 13. Continuous quality and release discipline

Every slice: write/reproduce failing tests → smallest implementation → targeted tests → `bun test` → `bun run typecheck` → `bun run build` → scope review → commit. Install with the pinned toolchain and frozen lockfile in CI. Native Windows paths need Windows coverage; platform-independent adapters also use in-memory fixtures. Do not run live paid model/image calls merely to satisfy a deterministic suite.

Maintain a fixture matrix across focused character, domestic ensemble, cozy ordinary life, mystery with hidden truth, large multi-faction world, temporal canon, narrator, and minimal/no-provider failure. Use fixture diversity to detect default gravity rather than banning legitimate motifs globally.

For each milestone, record: shipped feature IDs, commands/results, current limitations, migration/backout instructions, target evidence status, and next slice. Keep the roadmap status distinct from acceptance evidence. Revisit sequencing after each thin slice; do not let long-term plans authorize unrelated rewrites or public deployment.

# LoreBible Production Studio architecture blueprint

**Status:** north-star design, not an implemented feature inventory. **Baseline:** v0.3.0 / `0f2b487` / 2026-09-07. **Primary target:** Lumiverse. **Companion:** [delivery roadmap](delivery-roadmap.md).

## 1. Product constitution

LoreBible should support one character, a focused scenario, a narrator, an ensemble, a World Book, or a modular illustrated world package without forcing all projects through the same creative or export template.

The guiding distinction is **generation is not compilation**. The manuscript is rich source material; a runtime artifact is an intentionally selected, arranged, validated projection. More prose is not automatically more playable context.

Non-negotiable rules:

- Preserve the premise promise, explicit tone, canon, and user-authored constraints. Genre motifs are eligible when supported, never universal defaults.
- Reserve voluntary actions, dialogue, thoughts, feelings, attraction, consent, decisions, relationships, abilities, backstory, and destiny for `{{user}}` unless explicitly supplied. NPC actions and external consequences remain possible.
- Missing creative information stays absent, unresolved, or explicitly provisional. Administrative defaults such as IDs and empty collections are acceptable; invented debts, authorities, clocks, institutions, romance, or conspiracies are not.
- Generation creates candidates. Failure never impersonates success, erases accepted content, or selects a different model silently. An explicit offline demonstration can exist, visibly labeled and isolated from production success.
- Every fact has one canonical source record. Runtime mirrors are deliberate, traceable projections, not independently authored facts.
- Lumiverse governs target behavior and serialization. Internal types are not export schemas; compatibility formats do not establish native semantics.
- Quality is specificity, coherence, agency, bounded knowledge, useful detail, independent motion, precise retrieval, and honest evidence—not size, number of mechanics, or arbitrary scores.
- Preserve the scriptorium/manuscript identity and make high-quality output achievable on Android without Expert mode.

Creative authority and technical authority are separate. A user can define adaptation canon, but cannot make an unsupported serialization field work by naming it. Conversely, platform documentation cannot invent story facts.

## 2. Three systems, explicit boundaries

```text
CREATIVE STUDIO
Spark -> Divergence -> Blueprint -> specialist candidates
                              |
                    validate / review / accept
                              v
WORLD INTELLIGENCE LAYER
Versioned Project Graph + source/evidence/dependency ledgers
              |                              |
       manuscript projections         production planning
                                             v
PRODUCTION COMPILER
Artifact Plan -> Card IR + Lore Manifest -> target serializers
                                             |
                                  validate -> release package
```

**Creative Studio** invents possibilities, people, systems, situations, relationships, openings, and visual concepts. It cannot directly replace accepted canon or write target-format files.

**World Intelligence** owns accepted project state and the evidence behind it. It resolves identities, records knowledge and time, identifies contradictions, tracks dependencies, and stages revisions.

**Production Compiler** decides runtime ownership and builds artifacts from a fixed project revision. Serializers only map validated IR into a target format. They cannot invent missing world content, silently discard mechanics, or reinterpret canon.

The current `LoreBibleDocument` survives initially as an input to migration and a manuscript view. Do not make it and the graph simultaneous writable authorities. Each migrated project has an explicit storage/authority mode; graph edits are commands, and the manuscript becomes a projection.

## 3. Four independent user controls

| Control | Values | Controls | Must not mean |
|---|---|---|---|
| Interface mode | Smart Auto / Guided / Expert | How much configuration is exposed | Quality ceiling |
| Build intensity | Lean / Rich / Deluxe / Obsessive | Breadth, supporting detail, variants, asset inventory | Merely longer paragraphs |
| Generation quality | Fast / Balanced / Deep Craft / Production | Planning, writing, criticism and review passes | Number of lore entries |
| Runtime budget | Efficient / Balanced / Expansive | Compiled static/retrieval cost and eviction policy | Size of the source world |

Retain existing quality settings through an explicit migration map; never reinterpret an old saved value silently. Rich + Balanced is a sensible initial proposed default, subject to measured evaluations. Production prioritizes deliberate specialist work, with an inventory and estimated call/cost range before dispatch. Unknown prices remain unknown.

The default model configuration remains one selected connection/model. Expert users may override stages, but every build records the actual route used. Image and embedding capabilities are separate roles, not assumptions inferred from text-model names.

## 4. Six-stage experience

### Spark

Keep the canonical SparkDNA contract and legacy migration. Capture non-negotiables, premise promise, tone envelope, genre signals, agency boundaries, open variables, existing pressures, assumptions, opportunities, player role, and franchise where provided.

Bind parsed DNA to a hash/revision of its input and settings. Editing the Spark invalidates derived interpretation visibly. Previously accepted anchors may be preserved explicitly; they must not be silently mixed into a different premise. Empty franchise does not mean a default canon setting.

### Divergence

Preserve possibility-space exploration, candidate architecture, distinctiveness critique, selecting four, then optional author flavor. Deep Craft establishes branches before flavor wherever possible. Contrast is premise-adaptive: activity, scale, social configuration, information, structure, or opportunity can vary without imposing a genre.

Represent a board with stable `boardId`, `slotId`, immutable `versionId`, `parentVersionId`, `generationId`, source Spark revision, and strategy metadata. Reroll-all creates a new board generation without confusing array positions with lineage. Reroll-one derives from the selected slot/version. Steer/Push Further includes the selected take and requested transformation. Failure leaves the old board navigable.

Author controls retain Off/Auto/Manual, Sprinkle/Strong/Overdrive, and Compatible/Wildcard Auto. Record the actual per-branch assignment; explain when Manual intentionally applies the same flavor across branches. Use stage-specific style traits: architecture framing in Divergence, social/design tendencies in world design, voice in characters, prose in openings, minimal influence in reference lore. Priority is canon > agency > explicit tone > premise promise > selected architecture > flavor.

### Blueprint

Replace fixed categories gradually, not by deleting Physics immediately. Existing constraints become a Blueprint panel; old projects continue loading their original settings.

Determine artifact targets independently from world mode. Targets include individual character, scenario, narrator/world director, ensemble, full world, modular full-world package, and World Book primary. World mode is arc, sandbox, or hybrid. A full-world package is a composition of artifacts, not another single card archetype.

Build a dynamic Lore Matrix. Every category records stable ID, label, purpose, justification, recommended/optional/omitted/required status, light/standard/rich/exhaustive detail, optional min/ideal/max count, likely runtime role, candidate architectures, user lock, and recommendation evidence. Required status must identify its reason; it does not override the user's choice invisibly.

The category library is vocabulary, not a mandatory checklist:

- People: principal/supporting/roster/historical people, family, rivals, mentors, service cast.
- Social: relationships, circles, customs, status, taboos, reputation, gossip.
- Places: major/minor locations, geography, routes, homes, workplaces, safe social hubs.
- Organizations: factions, governments, clubs, businesses, guilds, institutions where appropriate.
- Systems: magic, technology, economy, law, education, religion, politics, combat, resources.
- Objects: items, artifacts, tools, clothing, vehicles, documents, currencies.
- Information: truth, secrets, clues, rumors, beliefs, misconceptions, propaganda.
- Temporal: history, recent events, schedules, rituals, seasons, anniversaries, conditional clocks.
- Texture: food, language, naming, slang, music, leisure, routine, architecture, sensory motifs.
- Roleplay: hooks, encounters, events, independent pressures, opportunities, procedures, open questions.

Allow new premise-specific categories. A cozy bakery need not receive factions, magic, or secrets. A family visit should emphasize social life and household geography. A large magical city may justify institutions, districts, economies, factions, and mystery. These are evaluation fixtures, not generation templates.

For sandbox/hybrid projects, critique ordinary-life coverage and autonomous activity. Recommend routines, jobs, friendships, leisure, minor inconveniences, and safe places when relevant; do not enforce an arbitrary quota regardless of premise.

Principal cast receives deeper voice, appearance, motives, contradictions, relationships, knowledge, and visual identity. Roster cast receives concise identity/function/voice/goal/hook/relationship. Promotion expands an existing entity ID and preserves accepted facts.

Smart Auto shows a compact plan, omissions, ranges, and reasons. Guided offers category cards, inclusion, detail, counts, packs, and Add Category. Expert adds activation/priority/persistence/recursion/vector recommendations and explicit overrides. Show total planned nodes, approximate output/calls, and selected artifact inventory before costly generation.

### Forge

Generate graph candidates category by category, not a giant document response. A build may use world architect, category writers, cross-linker, continuity editor, agency auditor, autonomy auditor, lore/retrieval architects, optimizer, roleplay probe, compiler, and release validator. These are composable jobs in a dependency graph, not one enormous prompt or an unconditional dozen-call chain for a small character.

Each job returns a versioned structured result: entities/facts or artifact candidates, findings, evidence references, and concise rationale. Do not request private chain-of-thought. Provider-exposed summaries or telemetry can be optionally displayed as provider output, never manufactured when unavailable and never confused with accepted content.

Show current phase, completed batches, pending inventory, elapsed time, last provider activity, attempts, final/estimated token counts clearly distinguished, and cancel. A heartbeat means the server is alive, not that the model is producing text. `0/4` must identify whether it means completed branches rather than imply zero generation activity. JSON responses may not yield completed objects until late; account for partial transport progress separately.

### Refine

Evolve toward Manuscript, Entities, Relationships, Lore, Canon, Visuals, and QA tabs. Retain familiar editing while adding Accept/Edit/Re-render/Nudge at field and entity scope. An edit produces a proposed fact diff and an impact report, not an invisible full regeneration.

Show stale outputs and offer Update affected artifacts. Distinguish structural updates (stable ID references) from semantic proposals (rewriting motives or timeline). A changed age may affect tenure, chronology, relationships, and a portrait brief while unrelated locations remain untouched. User-locked fields and manual overrides survive all refreshes unless explicitly changed.

### Publish

Six panes: Package, Card, Lore, Visuals, QA, Export. Preview the actual compiled revision, card fields, entries, native-only features, assets, static/typical/crowded cost, losses, and evidence. Users select optional character cards and assets without duplicating their world project.

On mobile, panels stack and tab navigation remains accessible; primary actions stay reachable without trapping content under fixed footers. Connections/model lists and all dialogs have bounded scrolling, keyboard focus, escape/close behavior, and useful error boundaries. Reload, rotation, desktop-site switching, or network interruption must not discard drafts. Preserve the manuscript aesthetic rather than replacing it with a generic dashboard.

## 5. Canonical data design

Use versioned runtime-validated contracts, not TypeScript interfaces alone. The proposed application namespace is `lorebible.project/v1`; it is distinct from Toolkit and Lumiverse serialization schemas. This is an application design decision to implement and test, not a claim that such a target format already exists.

| Record | Required responsibilities |
|---|---|
| ProjectContract | Identity/revision, targets, Lumiverse target profile, world mode, intensity, source authority, agency, boundaries, timestamps |
| SourceRecord | Locator/type, hash, authority, timeframe, spoiler scope, availability, rights/usage notes |
| CanonFact | Stable ID, subject, predicate, typed value, status, origin, evidence, acceptance, temporal validity, visibility scope |
| EntityRecord | Stable ID/type/name/aliases/importance/lifecycle, fact and relationship references, visual/source references |
| RelationshipEdge | Directional endpoints, public/private dynamics, each viewpoint, tension/leverage, evidence and status |
| KnowledgeClaim | Entity/fact reference, knows/believes/suspects/misunderstands/unaware, confidence and source |
| WorldPressure | Actor IDs, goal, state, optional transition/condition, visibility, user dependency, dormant/active/resolved |
| TemporalSnapshot | World-time context, opening-specific initial facts, current state, history, future possibilities |
| OwnershipAssignment | Fact ID, preferred runtime owner, intentional mirrors, justification and target scope |
| DependencyEdge | Typed source/output references, derivation input revision, stale/broken status |
| LoreEntrySpec | Content/fact/entity/category references, activation intent, engineering settings, expected tests |
| VisualIdentity | Entity, immutable/flexible traits, palette/style/negative constraints, committed reference assets |
| ValidationFinding | Severity, code, subject/path, evidence, run/revision, resolution or scoped waiver |
| BuildRecord | Planned jobs, input fingerprints, checkpoints, attempts, outputs, cost and cancellation state |
| ArtifactRecord | IR version, source revision, dependencies, assets, passport, validation and release references |

Refinements to the supplied sample interfaces:

1. **Origin, canon status, confidence, acceptance, and visibility are independent.** A generated high-confidence claim is not user canon. Preserve suggested/provisional/conflicted/deprecated states and explicit approval evidence.
2. Facts need explicit source IDs and assertion evidence, not only entity-level sources. Source authority is scoped to a claim/domain/timeframe.
3. Visibility needs audience/knower scope and discovery requirements; a single `secret` enum cannot enforce who may receive it.
4. Temporal class includes evergreen, initial, current, historical, and future-possible. Effective world time differs from record edit time. Unknown time remains unknown.
5. Multiple greetings reference separate initial snapshots. They must not all inject mutually incompatible opening state as constant lore.
6. Canonical values referencing entities use stable IDs, not display names. Rename aliases are preserved deliberately; historical references are not indiscriminately rewritten.
7. Relationship cycles are legitimate. Build dependency cycles require rejection or an explicit bounded iterative stage. Do not forbid all graph cycles globally.
8. Output staleness is derived from input revisions/fingerprints, not only lists manually attached to facts. Rebuild indexes from authoritative records.
9. Unknown imported fields survive archival round trips. A migration cannot silently promote old generated placeholders to accepted canon.

### Mutation protocol

```text
Edit/generation request + baseRevision
  -> candidate ChangeSet
  -> schema/reference/agency/conflict checks
  -> impact preview + acceptance policy
  -> atomic graph revision commit
  -> invalidate affected projections and validation runs
```

Use optimistic concurrency: a candidate from revision 12 cannot overwrite revision 14 automatically. Rebase, compare, or ask the user to resolve the conflict. Accepted work is immutable history plus a current revision; undo restores a revision without deleting later recovery data. Suggested extraction from imported prose is reviewable before establishing new fact authority.

## 6. Storage and recovery

Introduce a `ProjectRepository` abstraction before large graph builds. Recommended initial backend: local transactional SQLite metadata/records plus content-addressed asset files, contingent on a tested Bun/Windows persistence spike. Versioned JSON remains useful as a portable project archive, not multiple competing live fact stores. If that spike fails, use atomic versioned snapshots behind the same interface until transactional storage is ready.

The browser becomes a client with recoverable draft cache, not the only database. Keep V2 readers and preserve original raw data with hashes and migration receipts. Migration is copy-first, idempotent, previewable, and reversible. Corrupt projects are quarantined for recovery, never replaced with an empty vault. Deletion has explicit tombstone/recovery semantics so autosave cannot resurrect deleted projects.

The initial deployment remains one Windows host and authenticated clients. Android uses the host's project store rather than a different browser-only vault. Same-network/private remote access must have a deliberate authentication, origin/CSRF, transport, and firewall design before exposing generation or credential-management routes. Do not put keys in a PWA cache, project, diagnostic export, share URL, or service worker.

Reuse encrypted connection storage. Backups distinguish portable project content from machine-bound credentials; restoring projects should prompt for missing profiles without losing content. Store no secrets in build fingerprints or receipts. Bound asset upload/archive sizes, validate paths and MIME types, reject path traversal, and use non-overwriting recovery copies.

## 7. Resumable orchestration and gateways

Build jobs record `pending`, `active`, `complete`, `failed`, `cancelled`, `interrupted`, `stale`, or `skipped`, with explicit reasons. Include job ID, stage, dependencies, source revision, prompt/schema/compiler versions, provider/model identity, inputs hash, attempts, output candidate IDs, timestamps, and usage evidence.

On cancellation, abort the active request where supported and stop future dispatch. Retain completed candidates/checkpoints. On restart, active jobs become interrupted; resume only if their inputs and dependencies still match. Avoid duplicate acceptance with idempotency keys. A successful provider call and an accepted graph change are separate events.

One orchestration layer owns retry budget and deadlines, including discovery/preflight. Distinguish auth, unavailable model, quota, rate limit, transport, timeout, malformed output, cancellation, and supersession. Bounded schema repair stays on the selected route. Do not multiply SDK retries, UI retries, and specialist retries silently.

Extend the text gateway already in `server/model`; do not introduce unrelated clients for Refine, Test Bench, or specialist routes. Capabilities distinguish authentication, model discovery, text generation, structured output, streaming, provider summaries, images, and embeddings. An authenticated connection is not proof that every listed model can perform every operation. Custom IDs remain exact except provider-documented normalization. Unknown catalog status is not the same as unsupported capability.

An Image Gateway has adapter-specific text-to-image, reference/edit, dimensions, seed, and control capabilities. An embedding route records model/dimensions/content fingerprints so stale vectors can be rebuilt. Hide unavailable controls, explain unknown support, and never silently convert a requested capability into another operation.

## 8. World autonomy and optional mechanics

Audit whether meaningful life continues without `{{user}}`: independent NPC goals, NPC-to-NPC relationships, schedules, obligations, disputes, events, work, and offscreen consequences. Report counts and examples rather than inventing an objective autonomy score. A user-focused premise can justify some protagonist gravity; findings should explain context.

Mechanic packs are versioned architecture changes with eligibility signals, category recommendations, capability dependencies, compiler transformations, conflicts, test fixtures, costs, and graceful degradation. Applying a pack creates a reviewable plan change, not arbitrary prompt appendices.

| Pack | Adds | Main safeguard |
|---|---|---|
| Living World | Independent goals, pressures, recurring processes | Does not dictate player responses |
| Mystery Architecture | Clues, witnesses, discovery routes and consequences | Earned revelation is state, not a keyword match |
| Rumor / Belief / Truth | Separate factual and believed claims | No automatic NPC omniscience |
| Faction Politics | Resources, agendas, allies, rivals, internal divisions | Factions need not orbit the player |
| Social Ecosystem | Routines, histories, obligations, gossip, gathering places | Ordinary relationships, not compulsory romance |
| Exploration | Regions, routes, hubs, traversal and discovery | Location context without forced movement |
| Procedural Ambience | Competing weighted weather/rumor/event pools | Randomness only where desirable; cooldown/budget tests |
| Arc State | Phases, resolved events, unlocked knowledge | Mutable state never eternal canon |
| Calendar & Schedules | Recurrence, appointments, opening hours | Explicit temporal assumptions; not automatic for institutions |

The inspector explains dependencies, fallbacks, risks, overrides, and fixture outcomes for that pack/version. If the target cannot safely represent a mechanism, retain it as project-only or export a clearly limited static alternative with explicit approval.

## 9. Lore production and retrieval

Four jobs remain separate: architect decides entries/ownership; writer produces useful focused content; retrieval architect decides when information is needed; activation auditor challenges that design.

`LoreEntrySpec` preserves the proposed content, category/entity/fact references, canon/temporal/visibility/spoiler classification, importance, tokens, expected tests, activation and injection settings. Add explicit enabled state, reveal requirements, audience scope, profile/version, and supported/unknown capability status. Numeric target enum mappings belong only in adapters.

Design primary keys around canonical names and distinctive aliases. Use selective secondary context to distinguish layers of frequently mentioned entities. Whole-word matching and regex solve measured collisions, not decorate entries. Scan depth, injection position/depth/role, persistence, order, and priority each need a reason; order is arrangement, priority is budget survival.

Sticky can preserve an active location or actor; cooldown can reduce repeated event noise; delay can require sustained context. Weighted groups resolve eligible alternatives only where nondeterminism is desirable. Recursion follows an intentional bounded graph, with prevent/exclude/delay controls chosen per activation role, not enabled because a book is large.

**Secret boundary:** selective activation and recursion are relevance mechanisms, not authorization. A player guessing a name must not necessarily unlock a truth. If a secret must be excluded before discovery, compile a verified state gate or keep the secret disabled/project-only until an explicit update. Hidden narrator knowledge can still leak through model behavior; label prompt-only protection as limited and test it.

Vector retrieval is optional semantic assistance with an embedding dependency and measured fallback. Precise names/hard trigger requirements retain deterministic paths. Apply visibility/earned-state eligibility before semantic retrieval; similarity cannot establish permission. A keyword simulator cannot certify vector behavior. Record embedding model and test corpus when evaluating semantic recall.

Plan global recursion passes, activated-entry limit, token ceiling, and minimum priority against representative crowded scenes. Show static card cost, constant lore cost, typical conditional cost, crowded cost, configured ceiling, and eviction findings separately. Token estimates identify tokenizer or approximation and never pretend generated token volume equals runtime cost.

Optimize in order: remove duplicate ownership, split incoherent concepts, improve triggers, remove irrelevant mirrors, compress low-value wording. Preserve distinctive facts. Large libraries are acceptable when typical retrieval is efficient.

### Activation Lab

Build a versioned deterministic simulator for the documented subset, calibrated against native fixtures and diagnostics. Cover positive/negative, collisions, selective conditions, recursion bounds, groups, persistence sequences, budgets, and disabled/secret eligibility. Unsupported mechanics report not tested, not pass. Use seeded randomness in deterministic tests and distributions in evaluation tests.

Views include activation graph, collision warnings, dead entries, graph entities without runtime coverage, duplicate facts, library category heatmap, scenario-specific activation heatmap, and crowded eviction explanation. Every count comes from a defined fixture set; do not imply empirical usage frequency without observed usage data.

## 10. Artifact planning and compilation

Introduce a minimal Artifact IR during export stabilization, then grow it after graph ownership is stable. Use one Canonical Lore Manifest for both full native World Book and embedded Character Book projections. Markdown and human briefs are projections too, with explicit spoiler/audience settings.

| Compiler | Card responsibility | Conditional content |
|---|---|---|
| Character | Durable identity, differentiated behavior/voice, starting frame | Deep history, secondary entities, reference lore |
| Narrator / World Director | World scope, narrative disposition, autonomous simulation and agency contract | Cast, locations, bounded secrets, systems |
| Scenario | Focused situation, local cast/rules, playable starting conditions | Only relevant supporting world detail |
| Ensemble | Group identity, differentiated voices and NPC-to-NPC dynamics | Individual depth where useful |
| World package planner | Select narrator/book/optional character artifacts | Shared manifest; no independent duplicate world canon |

Description contains durable identity/scope; Personality behavioral or narrative disposition; Scenario the stable starting framework; First Message a playable concrete opening; examples demonstrate meaningful range. System Prompt contains necessary runtime instructions, never a convenient dump of `status.content`. PHI is optional and justified, not populated because it exists.

A world-director contract protects player agency, autonomous motives, knowledge boundaries, consequences, tone/canon, and ordinary life without forcing trust, romance, hostility, or plot outcomes. These instructions mitigate model behavior; they do not constitute enforcement or proof.

`CharacterArtifactIR` includes archetype, fields, alternate greetings, alternate field sets, lore reference, asset IDs, source revision, fact ownership references, and initial snapshot links. Its spellings are internal. All target serializers consume the same accepted IR.

The greeting lab proposes distinct canon/quiet/social/discovery/action/location entrances only when fitting. Audit differences in scene, activity, immediate NPC, pressure, information, and player opportunity. Alternate durable fields need a real variant and a shared canon boundary, not gratuitous permutations. Examples must preserve knowledge, agency, and tone; formatting is a target-adapter responsibility.

Full-fidelity output and portable output are not equivalent. Every transformation records preserved, normalized, omitted, degraded, unknown, and user-accepted losses. Do not silently omit whole entries merely because one setting is unsupported; assess whether content has a safe portable projection. If it does not, explain exclusions precisely.

When advanced native mechanics are used, produce the verified native World Book alongside portable artifacts. CHARX packaging resolves exact asset/module paths from contemporary fixtures. ZIP validity is only structural evidence. Unknown native modules remain unimplemented until verified.

Package manifests record checksums, source project revision, artifact versions, import order, dependencies, capability requirements, evidence, and rollback guidance. A capability receipt distinguishes uses from requirements and actual maturity. Artifact passports record generated/preserved/normalized fields, transformations, losses and unknowns, not a blanket lossless claim.

## 11. Visual production

Start after textual identity stabilizes and asset persistence exists. Visual Bible records immutable and flexible traits, palette, body/face/hair/eyes/clothes when relevant, signature objects, style direction, and negative constraints. Contradictions with accepted facts create findings, not silent visual rewrites.

Asset Plan separates required, recommended, and optional cover/portrait/expression/location/insignia/map work. Narrators receive world or location key art rather than an arbitrary face. Generate candidates; user commits a portrait reference; derive expressions from that reference where the provider supports it. Record reference, provider/model settings, source revision and manual acceptance. Identity checks are evidence-backed review, not a guarantee from prompt similarity.

Standard and custom expression labels, alternate avatars, and module packaging remain target-profile features verified by fixtures. Missing image-edit capability must not silently become independent face regeneration. A textual correction marks affected visual briefs/assets stale; accepted images remain available until replaced.

## 12. Validation and explainability

Validation begins with the first migration and compiler slice. Store findings with evidence paths and project/artifact revision. Distinguish deterministic structural checks, heuristic checks, model critiques, simulated probes, native import observations, and repeatable certification for a named target build.

| Severity | Release handling |
|---|---|
| Blocker | No production release: invalid required artifact, agency violation, secret disclosure, unresolved destructive loss, forbidden current-state injection, broken required reference/asset |
| Major | Fix or obtain explicit scoped acceptance of the unresolved issue |
| Minor | Disclose localized quality/runtime concern |
| Note | Explain recommendation or tradeoff |

Draft/recovery downloads may remain available with an unmistakable unvalidated label; they are not a way to claim a blocked production release passed. Waivers record user, reason, exact finding and artifact revision; editing affected inputs invalidates the waiver/evidence.

Audits cover canon continuity, names/pronouns/ages/memberships/counts/timeline, references, agency, independent activity, knowledge leakage, opening-only state, duplicate ownership, retrieval, recursion, budgets, portability, assets, and package integrity.

Roleplay probes use representative scenes and expected eligible/ineligible facts. They test the compiled architecture and model behavior under recorded conditions, not actual Lumiverse import by implication. A simple text rule catching `{{user}} decides` is useful but incomplete: quoted user-authored facts and indirect agency violations need contextual review.

Recommendations record inputs, rule or critic version, concise rationale, tradeoff, evidence, and override. Never fabricate private reasoning. Health dashboards display counts/ratios only with denominators and applicable test scope; qualitative critic assessments remain labeled. Unknown is a valid result, not zero or a green check.

## 13. Source Studio and expansion

Source provenance and temporal models begin in the graph foundation; ingestion UI arrives after the studio can preserve and compile native projects reliably. Inventory URLs/files, authority, timeframe, reliability, spoiler partitions, extracted entities/facts, duplicates, conflicts, and adaptation decisions. Treat retrieved material as data, never application instructions. Respect access controls and avoid redistributing unnecessary source text.

Temporal canon snapshots exclude future knowledge and later character states. Source conflicts remain explicit; user adaptation choices do not erase original provenance. No web ingestion requirement is imposed on ordinary original-fiction projects.

Gap-aware deepening analyzes missing coverage and proposes additions the user selects, without regenerating accepted work. Entity promotion expands roster records. Modular exports share the same source graph. Content/Engineering lore views and mechanic inspectors make advanced architecture understandable without demanding expertise.

## 14. Engineering boundaries and decisions

Incrementally extract services only when touched by a tested feature. Proposed responsibility boundaries: `src/contracts`, `src/lib/project`, `src/lib/compilers`, `src/lib/activation`, `src/lib/validation`, stage components; server generation orchestration/specialists, model/image adapters, routes, and storage. Keep transport separate from generation policy and serialization. Filenames are recommendations, not a mandate to rewrite `server.ts`.

| Decision | Rationale | Revisit trigger |
|---|---|---|
| One graph authority per migrated project | Avoid prose/graph divergence | New editor needs unsupported command semantics |
| Minimal IR before full archetypes | Fix existing export drift safely | Native fixtures require adapter revision |
| Server store before large Forge | Checkpoints and assets exceed browser reliability | Windows persistence spike fails |
| QA contracts early, QA dashboard later | Avoid architecture that cannot be tested | New runtime capability introduced |
| Source ledgers early, ingestion later | Preserve provenance without premature crawler scope | Canon-source workflow becomes priority |
| Secret state separate from retrieval | Relevance does not equal earned knowledge | Verified native state mechanism becomes available |
| Capabilities versioned per target | Avoid guessed Lumiverse fidelity | Native build/export changes |
| No hard entry quotas | Match the premise rather than old templates | Evaluation shows undercoverage in a specific class |

Out of scope for the initial production sequence: a public multi-tenant hosting service, automatic publishing to third-party communities, custom runtime extensions required for basic output, universal native compatibility claims, and a replacement for Lumiverse's chat runtime. These require separate decisions, not implied permission from the studio vision.

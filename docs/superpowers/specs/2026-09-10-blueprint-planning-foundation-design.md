# Blueprint Planning Foundation Design

**Date:** 2026-09-10  
**Planned release:** LoreBible v0.41  
**Roadmap:** M2.1, first slice of M2 Blueprint Studio  
**Evidence target:** deterministic structural and fixture validation; no model-quality or Lumiverse-runtime claim

## 1. Purpose

M2.1 introduces the first premise-adaptive Blueprint planning layer between structured project truth and expensive Forge work. It answers: what should this project build, how broad should it be, and which lore domains are justified by the supplied premise?

The slice is deliberately read-only. It creates a proposed plan and preview without changing Project Graph canon, replacing the current Physics stage, dispatching model calls, or changing Forge output. This lets LoreBible prove neutral allocation before Blueprint becomes a writable wizard stage.

## 2. Scope

M2.1 delivers:

- a versioned Blueprint contract and runtime parser;
- a sanitized planning-input adapter for selected SavedProjectV2 and ProjectGraph data;
- a deterministic, evidence-backed recommendation engine;
- artifact-target, world-mode, build-intensity, generation-quality, and runtime-budget recommendations as independent controls;
- a dynamic Lore Matrix with supported inclusions and explicit omissions;
- principal and roster cast ranges where cast is supported;
- mechanic-pack eligibility recommendations;
- ordinary-life and world-autonomy assessments;
- planned-node and model-call ranges labeled as estimates;
- an internal preview endpoint and mobile-safe preview panel launched from Project Graph Beta;
- fixture coverage for premise contrast and prohibited generic defaults.

M2.1 does not:

- add Blueprint as Stage 03 or renumber the current wizard;
- make Blueprint editable or persist user overrides;
- write recommendations into canon, entities, artifacts, or accepted decisions;
- call a model or claim creative-quality evaluation;
- alter Physics or Forge behavior;
- compile advanced World Book activation settings;
- certify Lumiverse import or runtime behavior.

## 3. Authority and preservation

SavedProjectV2 remains the live application authority. ProjectGraphV1 remains the durable structured beta authority for graph operations. BlueprintPlanV1 is a disposable proposal derived from an identified graph revision and sanitized planning context.

The planner may consume only explicitly supplied fields from its typed input. It must not inspect `graph.extensions`, the preserved V2 migration source, provider credentials, or unrelated browser storage. Recommendations use `origin: "generated"` and `status: "proposed"`; they are never silently promoted to canon.

Every output records:

- source project ID and graph revision;
- a canonical input checksum;
- the exact evidence references used by each recommendation;
- planner version;
- creation time;
- findings and unresolved gaps.

Repeated planning with the same normalized input and fixed clock produces identical semantic output. The timestamp may differ when a real clock is used.

## 4. Contract

Create `src/contracts/blueprint.ts` with schema `lorebible.blueprint-plan/v1`.

### 4.1 Planning input

`BlueprintPlanningInputV1` contains only:

- `projectId` and `projectRevision`;
- canonical SparkDNA fields when available;
- the selected Divergence take's ID, title, pitch, angle, genre/tone, and retained non-negotiables;
- existing Physics values as explicit constraints, not inferred canon;
- graph facts reduced to ID, predicate, value, status, origin, visibility, and temporal class;
- graph entity summaries reduced to ID, type, name, importance, and lifecycle;
- existing relationship count and knowledge-claim count;
- current generation-quality setting.

Missing inputs stay absent and produce bounded findings where relevant. A blank franchise field never implies an original or franchise setting. A missing category signal never authorizes creative fallback.

### 4.2 Plan controls

The plan contains independent recommendations for:

- `interfaceMode`: initially `smart_auto`;
- `artifactTargets`: `individual_character`, `scenario_card`, `narrator_world`, `ensemble`, `full_world`, `full_world_package`, or `world_book_primary`;
- `worldMode`: `arc`, `sandbox`, or `hybrid`;
- `buildIntensity`: `lean`, `rich`, `deluxe`, or `obsessive`;
- `generationQuality`: `fast`, `balanced`, `deep_craft`, or `production`;
- `runtimeBudget`: `efficient`, `balanced`, or `expansive`.

Every recommendation has `value`, `status: "proposed"`, `reason`, and non-empty `evidenceRefs`. M2.1 exposes recommendations only; user lock and override behavior belongs to M2.2.

Existing `Fast`, `Balanced`, and `Deep Craft` settings map explicitly to `fast`, `balanced`, and `deep_craft`. M2.1 never silently maps an existing value to `production`.

### 4.3 Lore Matrix

Each `LoreCategoryPlan` contains:

- stable `id` and `label`;
- `purpose` and `justification`;
- `status`: `recommended`, `optional`, `omitted`, or `required`;
- `detail`: `light`, `standard`, `rich`, or `exhaustive`;
- optional `targetRange` with nonnegative `min`, `ideal`, and `max` in ascending order;
- `likelyRuntimeRole`: `evergreen`, `reference`, `dynamic`, `secret`, `ambient`, `state`, or `mixed`;
- `candidateArchitectures` as conceptual recommendations, not serialized Lumiverse fields;
- `userLocked: false` for this read-only slice;
- non-empty evidence references for every included category and a reason for every omission shown in the preview.

The initial vocabulary includes cast, relationships, locations, organizations, systems, objects, information, temporal context, ordinary life/texture, and roleplay opportunities. It is not a checklist. The planner emits only categories with positive evidence plus a small set of diagnostically useful omissions. It must not emit every known category.

## 5. Deterministic recommendation policy

M2.1 is a conservative explainable baseline, not a replacement for future model-assisted architecture. It derives signals from normalized explicit text and existing structured facts. Each signal records the source field and matched concept; raw text is not copied into reasons.

Rules are additive and bounded:

- explicit cast, family, household, team, school, office, or relationship signals may support cast and social categories;
- explicit place, travel, neighborhood, city, region, exploration, or workplace signals may support location categories;
- explicit organization, government, guild, faction, war, politics, or institutional signals may support organization/politics categories;
- explicit magic, technology, economy, law, religion, education, combat, or resource signals may support the corresponding system category;
- explicit mystery, clue, rumor, secret, misconception, or hidden-truth signals may support information categories and relevant mechanic packs;
- explicit routine, work, leisure, food, shopping, transport, hobby, tradition, household, neighborhood, school, or workplace signals support ordinary-life coverage;
- existing typed graph entities and facts support their matching categories without relying on keyword text alone.

Signals must use whole concepts and curated phrase families, not broad substring collisions. For example, `school` may support education; `magic` must not match `magical realism` as a hard magic-system requirement without another system signal. Negated or prohibited phrases from `mustAvoid` cannot become positive evidence.

When evidence is ambiguous, output `optional` or omit the category. `required` is reserved for direct user non-negotiables or an already accepted graph structure that cannot be represented without the category, and its reason must identify that evidence.

## 6. Neutrality guardrails

The planner has no generic creative fallback. It may not recommend the following without evidence:

- factions, government, politics, institutions, or organizations;
- magic, technology systems, combat, religion, or economy;
- secrets, mysteries, conspiracy, betrayal, or hidden organizations;
- romance, horror, violence, survival, debt, captivity, or ticking clocks;
- a large cast, standalone character cards, vectorization, recursion, or maximum lore volume.

Artifact-target selection is similarly conservative. A single named character can support an individual-character target. A group/household/team premise can support ensemble. A narrator/world target requires explicit world/sandbox/simulation intent or existing narrator structure. Full-world and full-world-package targets require broad multi-domain evidence; they are never the default merely because the app is LoreBible.

## 7. Estimates

The plan exposes ranges, never false precision:

- planned nodes: sum of category target minima/ideals/maxima;
- planned artifacts: target-dependent inventory;
- estimated model calls: bounded range based on categories and current generation quality;
- runtime profile: qualitative recommendation only in M2.1.

Build intensity changes breadth, supporting coverage, variants, and review inventory. Generation quality changes pass structure. Runtime budget changes later compilation strategy. The planner must not implement these as one shared text-length multiplier.

Unknown provider price and wall-clock time remain unknown. The UI must not show a cost or duration it cannot substantiate.

## 8. Ordinary-life and autonomy assessments

For sandbox and hybrid recommendations, emit two assessments:

- `ordinaryLife`: `supported`, `thin`, `not_applicable`, or `unknown`;
- `worldAutonomy`: `supported`, `thin`, `not_applicable`, or `unknown`.

Each assessment lists evidence, gaps, and one concise explanation. A `thin` result is a recommendation finding, not invented lore. The planner may suggest adding routines or independent activity as categories, but it cannot author jobs, schedules, relationships, or events.

Arc projects may still benefit from ordinary life, but absence is not automatically a warning. No arbitrary ratio or model-opinion percentage is displayed.

## 9. Mechanic-pack recommendations

M2.1 defines proposed eligibility for:

- Living World;
- Mystery Architecture;
- Rumor / Belief / Truth;
- Faction Politics;
- Social Ecosystem;
- Exploration;
- Procedural Ambience;
- Arc State;
- Calendar & Schedules.

Each pack is `recommended`, `optional`, or `ineligible`, with reason and evidence. These are planning concepts only. The preview explicitly says no runtime mechanic has been serialized. Vector retrieval is not a mechanic-pack default and cannot be recommended without a later capability-aware design.

## 10. API and data flow

Add a pure `createBlueprintPlan(input, options)` function. Add a server adapter that loads the authoritative graph revision, verifies the supplied expected revision, builds sanitized input from the selected SavedProjectV2 context sent by the client, and rejects credential-shaped fields recursively.

Endpoint:

`POST /api/projects/graph/:projectId/blueprint-preview`

Request:

- expected graph revision;
- sanitized SparkDNA;
- selected-take summary;
- Physics constraints;
- generation quality.

Response:

- `BlueprintPlanV1` only;
- no raw saved project;
- no repository path;
- no credentials;
- no hidden provider reasoning.

Revision conflict returns HTTP 409 with expected/actual revision. Invalid input returns a safe 400/422 response. Planner failure preserves the open graph and any existing preview.

## 11. User interface

Extend Project Graph Beta with `Preview Blueprint`. The resulting mobile-safe panel uses the existing manuscript visual language and vertical scrolling.

Smart Auto preview shows:

- proposed artifact target and world mode;
- four independent control recommendations;
- planned artifact and node ranges;
- recommended categories with detail/count/reason;
- omitted categories with reason;
- mechanic packs and eligibility;
- ordinary-life and autonomy assessments;
- findings and the fixed label `Proposal only — nothing has been written to canon or Forge`.

M2.1 has no editable toggles. Controls that imply persistence or override are excluded rather than displayed disabled. Every action is reachable on a narrow viewport. Closing and reopening the panel may recompute the preview; persistence arrives in M2.2.

## 12. Tests and acceptance

### Contract and safety

- parser accepts a complete valid plan and rejects unknown enum values, invalid ranges, duplicate stable IDs, empty reasons/evidence, and credential-shaped data;
- input adapter excludes graph extensions and raw migration source;
- same normalized input and fixed clock produces exact output;
- revision conflict and malformed input are safe and non-mutating.

### Allocation fixtures

- cozy bakery: ordinary life/locations may be supported; factions, combat, magic, political institutions, and compulsory secrets are omitted;
- family visit: social ecosystem, relationships, household locations, and ordinary life dominate;
- focused romance: remains focused and does not inflate into a large world or mandatory factions/secrets;
- war-torn kingdom: politics/factions/conflict may be recommended when directly signaled;
- large science-fiction city: technology, locations, organizations, economy, and broader inventory may be justified;
- blank/minimal premise: lean scenario planning with unknown/optional findings, not invented genre content;
- `mustAvoid` negation: forbidden concepts cannot become recommendation evidence.

### UI

- mobile markup exposes Blueprint preview action and every plan section;
- proposal status and no-write warning are visible;
- omissions and reasons are readable;
- failures preserve the prior preview and graph panel;
- loading state prevents duplicate requests.

### Release gate

- focused tests, full `bun test`, `bun run typecheck`, and `bun run build` pass;
- v0.41 is visible and recorded in the changelog;
- M2 remains in progress and roadmap count remains 9 of 17, with M2.2 next;
- receipt states that recommendations are deterministic proposals and no Lumiverse runtime or model-quality test occurred;
- commit and push to `test`, preserving the current worktree.

## 13. M2.2 boundary

The next slice turns a proposal into a user-controlled Blueprint: Smart/Guided/Expert modes, include/omit/detail/count overrides, custom categories, user locks, graph-backed persistence, reanalysis that preserves locks, and complete mobile start/cancel controls. Only after those behaviors pass can Blueprint replace or absorb the current Physics stage.

# v0.47 Blueprint and lore-quality design

**Status:** Approved in principle; awaiting written-spec review  
**Target release:** v0.47  
**Roadmap alignment:** completes M2.2; introduces deterministic lore-quality gates needed by M4 without claiming the full Activation Lab

## 1. Purpose

v0.47 turns Stage 3 into an editable production Blueprint and makes every newly compiled lorebook easier to navigate and audit. The Blueprint decides what the world needs, how much to build, and which optional runtime mechanics are justified. The lore compiler then produces concise categorized entry labels and reports structural, ownership, retrieval, and budget risks before export.

This release does not maximize entry count or enable every Lumiverse feature. Creative quality and retrieval usefulness outrank volume. Advanced settings are applied only when a supported rule can explain and test them.

## 2. Evidence and observed problem

The user-supplied `the-crucible-of-the-unmarked-world-book.json` is a structurally parseable native Lumiverse World Book with 63 entries. A read-only audit found:

- 21 comments longer than 48 characters;
- 18 comments that appear to use a full lore paragraph as a missing-name fallback;
- about 59,244 content characters, or 14,811 tokens using Lumiverse's rough characters-divided-by-four estimate;
- every entry at position 0 with unlimited/default scan depth;
- no selective, whole-word, or vectorized entries;
- repeated keys whose fan-out needs intentional collision testing, including five entries each for `Lector Grue` and `Lower Ledger`;
- no exact duplicate comments, no constants, and no disabled entries.

These are audit signals rather than automatic failures. A repeated entity key may be a deliberate cross-link, and a large total library is acceptable when typical activation remains efficient. Lumiverse's current user guide says entries should be concise, focused on one concept, and verified with Dry Run. Its developer documentation confirms that comments are human-facing labels and that position, order, priority, scan depth, selective matching, timing, recursion, and vector settings are independent controls.

## 3. Canonical Blueprint selection

Introduce a versioned `BlueprintSelectionV1` associated with a project ID and source project revision. It stores accepted decisions separately from a generated recommendation preview.

The selection contains:

- interface mode: Smart Auto, Guided, or Expert;
- artifact targets;
- Arc, Sandbox, or Hybrid world mode;
- build intensity and generation quality;
- runtime budget target;
- lorebook-size target;
- principal and roster cast ranges;
- world-texture and experience constraints;
- accepted category plans;
- accepted mechanic-pack plans;
- field locks, explicit omissions, and user explanations;
- Forge execution preference for later v0.48 use;
- source recommendation fingerprint and timestamps.

Previewing a plan never mutates accepted state. Accepting or editing creates or updates the selection. Recommendation refresh changes only unlocked fields. Explicit user omissions and locks always survive refresh, save/load, and view-mode changes.

## 4. Progressive-disclosure UI

All three modes edit the same canonical selection.

### Smart Auto

Show the recommended project shape, lorebook scale, major categories, mechanics, estimated inventory, model-call estimate, and short reasons. The user can accept the proposal or open Guided mode.

### Guided

Expose project shape, category cards, mechanic packs, cast targets, and understandable creative controls. Rename **Mundanity** to **Everyday-Life Detail**, defined as attention to routines, work, travel, meals, costs, maintenance, leisure, and minor inconvenience. Everyday-life detail remains independent of fantasy or strangeness.

### Expert

Expose exact estimated ranges and runtime intentions: static/typical/crowded budget targets, activation approach, position intent, scan depth, timing, recursion, groups, probability, and vector dependency. Overrides remain visible and are never silently reset.

The mobile layout uses stacked cards, large touch targets, compact summaries, and collapsible advanced controls. Changing modes never clears values.

## 5. Dynamic lore categories

Categories are premise-adaptive. LoreBible maintains a standard vocabulary but does not require every category:

- NPCs
- Relationships
- Factions
- World Rules
- Locations
- Items
- Knowledge
- Secrets
- History
- Pressures
- Ordinary Life
- Events
- Rumors
- Clues
- Cultures
- Species
- Magic
- Technology
- Rituals
- Mechanics

The planner may propose a scenario-specific category when it supplies a nonempty label, purpose, justification, runtime role, detail level, target range, and stable category ID. Labels must be short human-readable nouns or noun phrases. Category identity is stored separately from its display label so renaming does not break ownership.

Every category is `required`, `recommended`, `optional`, or `omitted`, with `light`, `standard`, `rich`, or `exhaustive` detail. Users may add, rename, include, omit, resize, and lock categories. The planner must explain why a category exists and why an obvious category was omitted.

## 6. Lorebook scale

Lorebook scale is independent of reasoning quality and runtime prompt cost:

- **Compact:** target 10–25 entries;
- **Standard:** target 25–60 entries;
- **Large:** target 60–120 entries;
- **Massive:** target 120–250 or more entries;
- **Custom:** explicit minimum, ideal, and maximum supplied by the user.

Ranges guide inventory planning; they are not quotas. The sum of category ranges must remain explainable. If the requested size would create filler or duplication, the planner reports insufficient supported coverage and recommends specific areas to deepen. It never manufactures factions, secrets, systems, or conflicts merely to hit a number.

Large and Massive plans distinguish principal subjects from lighter roster entries. Increasing scale broadens useful coverage and cross-link density; it does not simply lengthen every entry.

## 7. Mechanic packs

Mechanics are optional composable plans with eligibility evidence, architecture effects, runtime requirements, compiler rules, test fixtures, and graceful fallback:

- **Living World:** independent pressures, schedules, recurring activity, and limited scene persistence;
- **Mystery Architecture:** separated truth, rumor, clue, witness, and bounded discovery paths;
- **Rumor / Belief / Truth:** knowledge-state separation without omniscient leakage;
- **Faction Politics:** resources, agendas, leverage, internal divisions, and current moves;
- **Social Ecosystem:** routines, obligations, social roles, gossip, and NPC-to-NPC bonds;
- **Exploration:** regions, routes, hubs, hazards, and location-weighted retrieval;
- **Procedural Ambience:** intentionally random grouped events with probability and cooldown;
- **Arc State:** mutable phase/state separated from evergreen canon;
- **Calendar & Schedules:** recurring time-dependent availability and events;
- **Semantic Recall:** vector retrieval for concept-rich references, conditional on configured embeddings.

Smart Auto recommends only evidence-supported packs. Guided mode allows enable/disable. Expert mode exposes the proposed settings and risks. A disabled or unsupported capability receives a keyword-based or static fallback where possible.

## 8. Categorized concise entry titles

Every compiled entry comment uses:

`[Category Label] Short Semantic Name`

Examples:

- `[NPCs] John Doe`
- `[Items] The Dragonslayer Sword`
- `[Locations] Agartha`
- `[World Rules] Blood-Oath Enforcement`
- `[Secrets] Eigengrau Endowment`

Rules:

1. The prefix is derived from the accepted category record, not guessed from prose.
2. The semantic name should be at most 48 characters before the prefix.
3. Generation contracts request a distinct short `name` for every entry type.
4. Compilers strip an existing equivalent prefix before applying the canonical one, preventing double tags.
5. A missing, blank, paragraph-like, or oversized name never falls back to full content. It receives a neutral stable fallback such as `[Secrets] Secret 3` and a quality finding.
6. Content is not truncated or rewritten merely to repair its display title.
7. Existing source IDs and native UIDs remain stable when only a display title changes.
8. Every native and portable serializer receives the same canonical formatted title from the Lore Manifest.

## 9. Lore-quality audit

Add a deterministic `LoreQualityReportV1` generated from the canonical Lore Manifest before serialization. It contains severity, evidence, affected stable IDs, and actionable repair suggestions.

### Blocking findings

- invalid or duplicate stable/native IDs;
- missing activation path for an enabled conditional entry;
- secret material exposed through a public owner;
- mutable current state serialized as evergreen or constant lore;
- agency violations involving unsupported `{{user}}` actions, thoughts, feelings, attraction, consent, decisions, relationships, abilities, backstory, or destiny;
- recursive cycles or unbounded fan-out when recursion is enabled;
- a required native capability that cannot be serialized without silent loss.

### Major findings

- missing or paragraph-like title fallback;
- identical or near-identical canonical content owned by multiple entries;
- broad or highly shared keys with likely irrelevant co-activation;
- missing coverage for a principal entity/category;
- crowded activation exceeding the configured budget;
- inappropriate prompt position, depth, or priority for the entry's stated runtime role;
- constant entries consuming disproportionate static budget.

### Minor findings and notes

- oversized content that may benefit from an atomic split;
- weak aliases or missing negative/collision tests;
- uniform settings that are legal but insufficiently justified;
- optional vector opportunity without an embedding dependency;
- category imbalance or weak ordinary-life coverage.

The first v0.47 UI shows report totals, title/coverage/budget summaries, and affected entries before export. It does not implement the full M4 Activation Lab graph or claim live runtime proof.

## 10. Conservative runtime-setting policy

The compiler starts from the least surprising configuration:

- conditional rather than constant for most lore;
- System role for ordinary factual entries;
- recursion prevented for dense hubs, secrets, and rules unless a tested chain requires it;
- vectorization off without a declared embedding dependency;
- probability, groups, cooldown, and delay off unless an enabled mechanic pack requires them;
- short scan depth plus modest sticky only for scene-local information;
- order and priority chosen independently;
- prompt position chosen by runtime influence, never solely by category.

v0.47 may emit recommendations for advanced settings and deterministic tests. It only serializes an advanced setting automatically when the accepted Blueprint mechanic and entry runtime role provide an explicit rationale. Otherwise it preserves the currently validated conservative serializer behavior and reports the opportunity for M4.

## 11. Data flow and ownership

```text
Blueprint recommendation
        ↓ accept / edit / lock
BlueprintSelectionV1
        ↓ inventory contract
existing Forge document (v0.47 compatibility path)
        ↓
canonical Lore Manifest
        ↓
LoreQualityReportV1
        ↓ no unresolved blockers
native Lumiverse / portable serializers
```

The Project Graph remains the long-term fact authority. v0.47 stores the accepted Blueprint without prematurely replacing the existing Forge manuscript. Lore titles, category labels, audit findings, and serializer metadata are derived; serializers never invent canon.

## 12. Persistence and migration

- Store the Blueprint selection in SavedProjectV2 and active-workspace autosave as an optional versioned record.
- Add a Project Graph artifact/decision reference without making the graph live-authority transition implicit.
- Preserve unknown legacy fields and raw manuscript content.
- Migrate `PhysicsConfig.mundanity` losslessly to `everydayLifeDetail`; compatibility writing may retain the legacy numeric value.
- Existing projects without a Blueprint continue to open and receive a proposal only when requested.
- Existing lore entries without names compile with categorized neutral fallbacks and findings; they are not destructively rewritten.

## 13. Error and reanalysis behavior

- Invalid Blueprint edits remain local and visibly identified; the last valid accepted selection remains intact.
- A failed recommendation refresh preserves the prior proposal and all accepted choices.
- Locked fields and explicit omissions always win over model or deterministic recommendations.
- Export blockers prevent misleading “production ready” status but still permit the user to inspect the manuscript and report.
- No model failure triggers deterministic creative replacement presented as successful generation.

## 14. Tests and acceptance

### Blueprint contracts and migration

- Smart, Guided, and Expert views share one selection.
- Locks, omissions, custom categories, custom ranges, and mechanic choices survive save/load and reanalysis.
- Legacy mundanity values migrate exactly.
- Cozy, domestic, romance, war, mystery, and large-city fixtures receive different justified inventories.
- Size presets change planned coverage without forcing unsupported categories or merely lengthening prose.

### Lore titles and serialization

- every entry receives exactly one valid category prefix;
- no comment uses full content as a fallback;
- semantic names respect the 48-character target or receive a finding and safe fallback;
- source IDs and native UIDs remain stable;
- native and portable exports share identical canonical titles;
- all standard and custom categories serialize safely.

### Quality audit

- exact and normalized duplicate content;
- missing keys and dead-entry risk;
- broad/shared-key collision fixtures;
- current-state, secret, ownership, and agency blockers;
- recursion cycles and fan-out;
- static, typical, crowded, and maximum token estimates;
- no false claim that deterministic tests prove Lumiverse runtime behavior.

### UI and release gate

- every control is reachable at a representative mobile viewport;
- category and size edits preserve state across mode switches;
- audit findings link to affected entries;
- full Bun test suite, typecheck, production build, and rendered mobile/desktop checks pass;
- app, package, launchers, changelog, and roadmap report v0.47.

## 15. Evidence boundary and follow-up

Passing v0.47 proves contract validation, deterministic audit behavior, serialization structure, persistence, and tested UI reachability. It does not prove live Lumiverse import, activation, vector similarity, probability outcomes, or persistent sticky/cooldown/delay behavior. Final runtime verification remains: import one book, attach it at the intended scope, run positive and near-miss Dry Runs, inspect World Book Diagnostics, and check actual prompt placement and budget behavior.

After v0.47, v0.48 implements resumable Continuous, Step-by-step, and Single-request Forge execution. The original roadmap then continues through the remaining M3 work and the full M4 Lore Production Engine and Activation Lab.

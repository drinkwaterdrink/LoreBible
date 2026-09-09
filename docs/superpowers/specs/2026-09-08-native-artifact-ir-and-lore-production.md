# LoreBible Native Artifact IR and Lore Production Design

**Date:** 2026-09-08  
**Roadmap slice:** M0.7  
**Target release:** v0.35  
**Status:** approved design awaiting implementation plan

## 1. Purpose

LoreBible currently has several serializers that independently decide how a `LoreBibleDocument` becomes a card, embedded Character Book, standalone lorebook, or CHARX. M0.7 introduces one typed artifact boundary so these formats cannot silently disagree about canon, field placement, entry state, or runtime instructions.

This slice also establishes the native Lumiverse World Book serialization boundary from a user-supplied export. It does not copy that book's creative content or treat its particular settings as universal defaults.

## 2. Evidence and authority

Technical authority for this slice, in descending order:

1. The user's current requirements.
2. The supplied native export `___St_Greed_2_0_lumiverse.json`, inspected read-only.
3. Current bundled Lumiverse documentation and Lumi Tools contracts.
4. Existing LoreBible portable exporters and tests.

The supplied file confirms this top-level native envelope:

- `version` number;
- `type: "lumiverse_world_book"`;
- `name`, `description` strings;
- `metadata` object;
- `entries` array;
- `exported_at` number.

It also provides observed entry keys and value types for UID, keys, content, placement, order, priority, state, selective activation, probability, timing, groups, recursion, vectorization, extensions, and revision metadata. The file is schema evidence, not proof that every setting used within it is optimal for other projects.

## 3. Scope

M0.7 will:

- define a typed canonical Card IR and Lore Manifest;
- create both once per export operation;
- route runtime card, portable lorebook, native Lumiverse World Book, and CHARX serializers through those structures;
- keep Markdown, plain-text brief, and full project JSON as source/manuscript projections;
- compile the current workflow as a narrator-world card;
- assign every compiled fact a canonical owner;
- preserve temporary state in project/manuscript output while excluding it from permanent runtime lore;
- emit explicit validation and portability findings;
- remove unused duplicate exporter functions from `geminiService.ts` after caller verification;
- add deterministic golden, cross-format, and parse/round-trip tests.

M0.7 will not:

- build the full Activation Lab;
- request embeddings or claim vector behavior works;
- enable every advanced setting;
- generate new canon during export;
- fabricate example dialogue to make a field nonempty;
- implement alternate-field modules whose CHARX schema is not established;
- certify runtime behavior without Lumiverse import and diagnostics evidence.

## 4. Canonical artifact structures

### 4.1 Character artifact IR

The internal character artifact contains typed strings for:

- name;
- description;
- personality;
- scenario;
- first message;
- example messages;
- system prompt;
- post-history instructions;
- creator notes.

It also contains tags, alternate greetings, lore-manifest reference, artifact profile, field-ownership records, and validation findings. Serializers do not independently rewrite these fields.

### 4.2 Lore Manifest

Each internal lore entry contains:

- stable source ID and deterministic native UID;
- title/comment and category;
- canonical owner and source fact references;
- content;
- public/limited/private/secret visibility when known;
- evergreen/initial/current/historical temporal class;
- primary and secondary keys;
- conditional/constant/disabled state;
- case, whole-word, regex, selective, and probability intent;
- position, depth, role, order, and priority;
- sticky, cooldown, delay, group, and recursion intent;
- vector intent and dependency status;
- estimated tokens;
- content and activation rationale;
- positive, negative, and collision fixtures where deterministically derivable;
- validation and portability findings.

Advanced fields may be present in the neutral manifest without being serialized into formats that cannot preserve them.

## 5. Card and lore ownership

The current LoreBible workflow compiles as `narrator_world` until Blueprint introduces user-selectable artifact targets.

- **Description:** durable world identity, core premise, simulation scope, and only facts that must always be known.
- **Personality:** narration disposition, atmosphere, voice, and simulation behavior rather than repeated setting biography.
- **Scenario:** opening framework, player position, and immediate external pressure without deciding voluntary user behavior.
- **First Message:** the existing authored opening.
- **Example Messages:** existing authored examples only; otherwise intentionally empty with a finding, never fabricated by the serializer.
- **System Prompt:** durable world-director contract, NPC autonomy, bounded knowledge, canon preservation, and explicit `{{user}}` agency protection.
- **Post-History Instructions:** concise continuity and agency reminder when useful.
- **Creator Notes:** source status, usage, limitations, evidence, and portability information; never model-facing.
- **World Book:** secondary entities, places, systems, rules, history, relationships, secrets, and other facts that benefit from conditional retrieval.

One fact has one preferred owner. Intentional summaries are recorded as compiled mirrors rather than treated as independent canon.

## 6. Lore architecture policy

Settings are chosen by activation intent, not copied from the supplied example or assigned solely by category.

Baseline policy:

- conditional is the default state;
- constants require an explicit every-turn justification;
- current/mutable state is excluded from evergreen constant lore;
- disabled-until-earned source entries remain disabled;
- exact canonical names and natural aliases are preferred over broad generic keys;
- whole-word matching is recommended for collision-prone common terms;
- regex, probability, groups, timing, and recursion remain off without a concrete use case;
- recursion begins prevented for dense hub/governance entries and otherwise remains bounded by book policy;
- vectorization begins off unless an embedding dependency is explicitly available and semantic retrieval is justified;
- lower order values serialize first, while higher priority protects important entries under budget pressure;
- token estimates use the documented characters-divided-by-four approximation unless provider token metadata exists.

M4 will replace baseline heuristics with model-assisted Lore Architect, Lore Writer, Retrieval Architect, Activation Auditor, budget simulation, and user-visible Activation Lab workflows.

## 7. Serializer boundaries

### Native Lumiverse World Book

The serializer uses only keys and value types confirmed by the supplied native export. A sanitized structural test fixture will be derived from that evidence; the user's 194 KB creative source file will not be copied into the repository.

### Embedded Character Book

The embedded V3 book preserves the conservative observed portable subset and reports omitted advanced settings. It must not claim equivalence with the native World Book.

### Character Card V2 and V3

Both consume the same Card IR and compatible lore projection. V3 remains the source for CHARX `card.json`.

### CHARX

CHARX packages the V3 card plus a manifest recording native/portable artifacts and known limitations. Packaging does not independently regenerate fields or lore.

### Human/source formats

Markdown, plain-text brief, and full project JSON may include editing context and temporary state. They remain clearly distinct from runtime artifacts.

## 8. Validation and failure behavior

Compilation is deterministic and non-mutating. It reports findings at blocker, major, minor, or note severity.

Blockers include:

- invalid required field types;
- unstable or duplicate native UIDs;
- temporary current state compiled as constant lore;
- secret content placed in public card fields;
- unsupported advanced behavior silently dropped;
- unresolved ownership for an important runtime fact;
- malformed native envelope or entry values.

Portable loss is reported before download. M0.7 will preserve current export availability but label reduced-fidelity outputs accurately rather than silently failing or silently claiming native fidelity.

## 9. Tests and acceptance

Tests will establish:

- deterministic Card IR and Lore Manifest output from a fixed document;
- correct narrator-world field ownership;
- no unsupported `{{user}}` action or internal state in standardized instructions;
- no temporary status in runtime artifacts;
- stable native UIDs across repeat compilation;
- exact native top-level and entry key/value-type compatibility against a sanitized fixture;
- one lore entry's content, state, order, priority, and enabled status agree across native, embedded, V2/V3, and CHARX projections where the target supports them;
- advanced-setting omissions are reported rather than silently discarded;
- JSON and ZIP outputs parse and contain expected paths;
- source documents are unchanged after every compilation;
- legacy public exporter functions continue to return compatible output during migration;
- unused service-layer exporter implementations are absent after caller verification.

Release verification remains `bun test`, `bun run typecheck`, and `bun run build`. Live Lumiverse import, Dry Run, diagnostics, embedding behavior, and model quality remain explicitly unperformed unless separately observed.

## 10. Roadmap relationship

M0.7 creates the trustworthy compiler boundary. M4 adds full lore-production intelligence and Activation Lab. M5 adds archetype-specific card production, example-message and alternate-greeting labs, and deeper card QA. M6 later completes modular release packaging, passports, capability receipts, and full publisher UI.

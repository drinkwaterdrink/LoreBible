# Forge R2–R4 continuation contracts and implementation handoff

Status: partially implemented. R1 passed; pure R2 allocation and bounded job drafts exist. v0.67 executes and durably saves Blueprint-owned Location and Faction specialists in Bundle 2 plus the existing Bundle 5 specialists, with validated outputs, retry reuse, bundle-scoped lifecycle handling, and recorded output-limit splits. Existing v0.66 Bundle 5 ledgers remain resumable. Full specialist scheduling for Bundles 1, 3, 4 and 6, context preflight, R3 Prompt Studio, and R4 raw-idea routing remain planned. This continuation makes downstream choices explicit; it is not authorization to combine all slices into one unreviewed change.

Read the [design](../specs/2026-09-20-forge-overhaul-and-prompt-studio.md) and [prompt source](../specs/2026-09-20-forge-production-prompt-pack.md). Verify actual repository state again. Preserve R1 function names and responsibilities rather than inventing parallel validation/prompt systems.

## R2 — explicit inventory and resumable specialist jobs

### Contracts

Add to an appropriately scoped contract module, imported by graph commands and generation. Avoid importing server-only dependencies into browser contracts.

```ts
export interface ForgeInventoryCategory {
  categoryId: string;
  categoryLabel: string;
  destination: string; // validated against existing allowed destinations
  castTier?: 'principal' | 'roster';
  purpose: string;
  status: 'required' | 'recommended' | 'optional' | 'omitted';
  min: number;
  target: number;
  max: number;
  detail: 'light' | 'standard' | 'rich' | 'exhaustive';
  userLocked: boolean;
}
export interface ForgeJobV1 {
  version: 1;
  id: string;
  bundleIndex: number;
  ordinal: number;
  kind: string; // closed union of prompt-pack job kinds in implementation
  destinations: string[];
  categoryId?: string;
  entryIds: string[];
  dependencies: string[];
  schemaId: string;
  schemaVersion: number;
  promptHash: string;
  inputFingerprint: string;
  estimatedOutputTokens: number;
}
export interface ForgeJobRecordV1 {
  job: ForgeJobV1;
  status: 'pending' | 'active' | 'complete' | 'failed' | 'cancelled' | 'superseded';
  attempts: ForgeJobAttemptV1[];
  sections?: Record<string, unknown>; // populated only after local validation
  replacementJobIds?: string[]; // required only for superseded jobs
}
export interface ForgeJobAttemptV1 {
  id: string;
  status: 'active' | 'complete' | 'failed' | 'cancelled';
  provider: string;
  modelId: string;
  promptHash: string;
  startedAt: string;
  endedAt?: string;
  failureCode?: string;
  structuredOutputMode?: 'native_schema' | 'json_only' | 'prompt_contract';
}
export interface ForgeSpecialistLedgerV1 {
  version: 1;
  planHash: string;
  inventory: ForgeInventoryCategory[];
  jobs: ForgeJobRecordV1[];
}
```

Attach `specialistLedger?: ForgeSpecialistLedgerV1` to the existing Forge build record. Do not create a second project save. Existing source IDs and native lore UIDs remain untouched. Job/entry identifiers are application-assigned strings derived from canonicalized plan fingerprint, category/destination and ordinal; use existing canonical hash helpers, not browser `crypto.randomUUID` directly. Tests must assert that the same plan produces identical IDs across reloads.

### Allocation algorithm

Implement `allocateForgeInventory(selection, completedSections)` in `server/generation/forgeJobPlan.ts` using existing Blueprint types and authoritative destination mapping.

1. Copy exact accepted category IDs/labels and override ranges. Omitted/max-zero means zero, regardless of generic genre defaults. Principal/roster use accepted tier-specific ranges. A label is not an identity.
2. Include explicitly planned legacy lore categories as visible inventory lines. History/rules/pressures cannot be uncounted implicit additions. Aesthetic/naming guides are singleton jobs outside lore-entry totals.
3. Compute sum of minima and sum of maxima. Reject if sum minima exceeds total max or sum maxima is below total min. Present both conflicting constraints. Do not quietly edit locked values.
4. Desired total starts at sum category ideals, clamped into the accepted total min/max and feasible category min/max. Allocate starting at minima. Distribute remaining entries toward category ideals by stable round-robin order weighted by required > recommended > optional and detail; break ties by category ID. After ideals, only expand toward maxima if a required total minimum demands it. No hidden Cross-category Lore category.
5. Show the resulting per-category targets and estimated tokens before Forge. Auto mode may accept a feasible allocation under existing user choices; Guided/Expert show the change summary. Any newly proposed category needs explicit inclusion in Blueprint, not a surprise job.
6. Subtract already completed compatible category counts. Do not count read-only context as pending work. If completed content exceeds a new maximum or occupies an omitted category, flag a scope conflict rather than deleting it.
7. Partition remaining slots into jobs by category, section and detail. Initial ceiling: six standard entries or three rich principal profiles, also constrained by model output allowance and schema overhead. For unknown limits, use conservative estimates and visible uncertainty. Never truncate an accepted entry to fit.

Use estimated token costs only as planning estimates. Derive per-entry assumptions from category/detail profiles, keep them in one tested policy object, and update from measured accepted outputs later. Do not hard-code 40k library = 40k output request. Do not claim a requested library allowance will be filled exactly. If estimates and desired size differ substantially, display the mismatch before generation rather than padding afterward.

For deterministic allocation weights use status multipliers required=3, recommended=2, optional=1 and detail multipliers light=1, standard=2, rich=3, exhaustive=4. At each allocation step choose the eligible category maximizing `weight / (assignedAboveMinimum + 1)`, ties by category ID. First eligibility is below ideal; only after those slots are exhausted consider remaining capacity below max. Stop at the feasible desired total. This is a coverage allocation policy, not a claim that required categories deserve more prose per entry. Keep it in a pure tested function so later empirical changes are versioned.

### Job schemas and prompts

Project existing bundle schema properties to each job's destinations. For array work narrow ownership to allocated slots/category; validate IDs and counts locally even if a provider schema dialect cannot enforce them. Prompt includes schema plus JOB_MANIFEST with exact IDs, purpose and ownership. Use R2 specialist instructions from the prompt pack, never the whole-bundle mission listing unowned output sections.

One job owns each singleton. Multiple array jobs concatenate by ordinal, never provider completion time. Entry IDs are unique across the build. Do not merge same-name entries heuristically; flag duplication for review. Relationship/knowledge jobs depend on relevant entity jobs. Original raw canon and a complete identity registry remain available; scoped context must not omit relevant knowledge/agency boundaries.

### Persistence and lifecycle

Extend existing graph command parser/validator/application with:

- `forge.jobs.initialize`: expected source/plan hash; creates ledger once for incomplete bundles.
- `forge.job.begin`: only a ready pending/retryable job; unique attempt ID, all dependencies complete.
- `forge.job.complete`: accepts validated owned sections only, matching active attempt/fingerprint/prompt; duplicate completion is idempotent for the same command.
- `forge.job.fail` / `forge.job.cancel`: keep prior complete job payloads unchanged.
- Existing bundle complete command: merges all required complete jobs, validates aggregate and advances existing six-bundle checkpoint.

Use one repository transaction per transition. Refresh prepared graph revision after each transition; otherwise the coordinator's revision check can mistake its own progress for external edits. Command failure must not append another generation attempt. Reject stale attempt completion after cancellation or replacement.

Reload: completed jobs reused; active jobs marked interrupted through a command; pending jobs remain. Old completed bundles are never split retroactively. An old incomplete Bundle 5 gets a new job plan while Bundles 1–4 remain accepted. Model change alone can reuse completed jobs; canon/Blueprint changes require explicit invalidation/new build according to current source rules.

The durable-job path requires a prepared graph build. If an old V2-only workspace cannot be safely prepared without conflict, show the existing preparation/reconciliation flow; do not pretend browser-only progress is durable or overwrite a prepared graph. Keep old unsplit path explicitly labeled until migration is available.

Initial orchestration is sequential. At most one job request in flight. Do not add concurrent writers before deterministic sequential recovery passes. Continuous proceeds through all jobs; step_by_step pauses after a logical bundle; single_request remains available only when feasible under the same allocation/size policy and its R1 atomic range gate.

### Retry, cost and recovery

Reuse R1 correction runner. Add one shared deadline/attempt ledger for scheduling, transport negotiation and generation attempts. A job allows initial generation and one correction. Retry-After may schedule one additional transport retry only for an explicit rate-limit response, within the remaining deadline and without counting rejected HTTP negotiation as generated content. Display the wait and allow cancel. Do not auto-repeat ambiguous provider 400s forever.

Truncation: retain completed jobs; replace the unfinished job with smaller child jobs whose slot union exactly equals its slots. Limit split depth to two. A single oversized entry cannot split into fake entries; report its size/limit conflict. Failed parent is recorded as superseded by child IDs, requiring a typed status extension and validators; do not overload complete.

Aggregate coverage gap: generate at most one targeted repair plan for genuinely missing slots. Never regenerate an already filled slot without explicit revision. After its bounded attempts, stop and preserve all completed work.

### R2 test checklist

- [ ] Pure allocation: exact IDs, custom labels, contradictory ranges, omitted items, fixed cast tiers, singleton exclusions, deterministic tie breaks.
- [ ] Six/three-entry ceiling and output estimate policy; no total scope reduction.
- [x] Job schema owns exactly its destinations; supplemental job accepts one category only. (Implemented for Bundle 2 Locations/Factions and Bundle 5 destinations; other bundles remain pending.)
- [ ] Restart after failed second job reuses first; cancel between save and event; late stale completion rejected.
- [ ] Legacy four completed bundles retained; model switch reuses; source change invalidates with preserved history.
- [x] Retry/split ceilings; partitioned child IDs cover exactly parent slots; no duplicated content/events. (Implemented for currently enabled specialists.)
- [ ] Aggregate validation before checkpoint; repository conflict preserves prior graph.
- [ ] Targeted suites, full tests/typecheck/build/diff check; checkpoint R2 separately.

## R3 — context preflight and versioned Prompt Studio

### Do not confuse editable instructions with unsafe free-form contracts

Expose creative missions/style, with protected protocol/schema/ownership shown read-only. Output validators remain enforced regardless of prompt text. If the user wants a schema change, that is a versioned product change, not a text override. Explain this in UI copy.

Use a shared prompt registry under `src/lib/prompts/` for browser-safe definitions and server compilation. Move R1 Forge defaults there without duplicating them. Each registry entry includes stable ID, feature label, purpose, current default version, editable text, protected requirement summary and allowed input variable names. Server resolves defaults; client never sends a replacement protected system block.

```ts
export interface PromptOverrideV1 {
  featureId: string;
  baseVersion: string;
  text: string;
  revision: number;
}
export interface PromptProfileV1 {
  schemaVersion: 1;
  id: string;
  name: string;
  revision: number;
  overrides: PromptOverrideV1[];
}
export interface ResolvedPromptSnapshotV1 {
  schemaVersion: 1;
  registryVersion: string;
  profileId: string | null;
  profileRevision: number | null;
  resolvedCreativeText: Record<string, string>;
  hash: string;
}
```

Store global profiles in a dedicated versioned server-side authoring settings store, using the repository's atomic-write/backup conventions, **not** the encrypted credentials store. This makes phone and desktop access to the same app consistent. Project overrides live in project authoring metadata, preserved through V2 workspace save/load and graph preparation. Do not store profiles only in one browser and call them application-global.

Add backend prompt routes following existing app route registration patterns:

- GET registry/default summaries and profile list;
- create/update profile with optimistic expected revision;
- delete non-active profile with explicit confirmation/selection handling;
- compile preview for a selected project/feature;
- isolated test generation only via explicit action and current model selection.

Validate profile text lengths (initial 24,000 characters per feature, 256,000 per imported profile), duplicate IDs, unknown features and unsupported schema versions. These are safety limits, not hidden shortening; show errors rather than truncate. Plain JSON import only; no executable templates or object prototype merging. Preserve literal roleplay macros. Default creative override contains no application template tokens; app appends required context/schema separately. If variables are later exposed, use a whitelist and literal substitution, not evaluation.

Precedence: shipped default -> selected global profile override -> project feature override. Resolve and hash at build start. Persist snapshot on new builds. A paused build resumes its snapshot even if global defaults changed. Offer new build/scoped regeneration to adopt edits; do not silently mix prompt revisions. For older builds snapshot only remaining jobs and mark earlier provenance legacy, never rewrite them.

### UI implementation

Add a “Creative Prompts” section to `src/components/SettingsModal.tsx` without replacing Connections. Render editor in `src/components/PromptStudio.tsx`, backed by `src/services/promptsService.ts` and typed profile contracts. Include:

1. Profile selector and scope (“Application profile” / “This project override”).
2. Feature list with purpose and “Default” / “Customized” badge.
3. Editable creative prompt and read-only protected requirements disclosure.
4. Save, Reset this feature, Duplicate profile, Import, Export.
5. Version diff when shipped defaults change; preserve customizations.
6. Preview effective prompt (explicit private-canon disclosure); test on a disposable candidate, never the accepted manuscript.

Save performs no generation. Reset affects only selected feature, not credentials or Blueprint. Profile export includes creative text and versions only, excluding private project context and API keys. Preview includes actual effective text only after the user asks; never put it in telemetry.

Mobile: one scrollable editor surface, touch targets at least 44px, visible save/cancel, focus restoration, no horizontal grid or nested scrolling area. Reuse manuscript styling. Unsaved edits prompt before closing/scope-switching.

### Coverage: no fake feature controls

Inventory actual call sites first. Registry entries must cover Forge, Spark analysis, premise suggestions if model-backed, Divergence architect/critic/writers/single/reroll, entry refinement/variants/push, section regeneration, consistency audit, procedural suggestions, voice/opening audit and test bench. Migrate feature by feature with request-body tests proving that changing its override affects only that feature. Existing carefully developed non-Forge prompts are the initial editable defaults; do not replace all of them with Forge text.

Blueprint category/mechanic recommendation logic is presently at least partly deterministic. Label it “planning rules” and explain that prompt editing does not control it. Selected artifact packages express intended outputs; show unsupported ones as planned/dependent, never pretend Prompt Studio implements new compilers.

### Canon preflight

Before compiler invocation compare structured accepted settings and source constraints where extraction supports a direct comparison. A Spark “implied violence” / Physics “graphic” conflict becomes a visible finding with two source references and a persisted choice. Do not use regex alone to claim complete semantic conflict detection. Unsupported ambiguity remains a finding for review; do not silently reinterpret Graphic as emotional vividness.

Canonical fact status must distinguish explicit, accepted invention, generated proposal and open variable using existing graph facilities. Preserve unsupported player biography as a blocked proposal rather than accepted output. This stage must not introduce a second canon graph. Record which audit checks are heuristic versus deterministic; a prompt warning is not a passing quality gate.

### R3 tests

- [ ] Profile precedence, revision conflict, malformed import, duplicate/unknown IDs, unsupported version, oversized text, prototype keys.
- [ ] Phone/desktop share global profile via server; project override does not change other project.
- [ ] Save costs zero calls; preview redacts secrets from diagnostics; isolated test preserves manuscript.
- [ ] Paused-build hash remains fixed; switching defaults/overrides does not silently resume with new prompt.
- [ ] Effective request tests for every exposed feature; deterministic planner labeled honestly.
- [ ] Source conflict preserved until explicit resolution; macros unchanged.
- [ ] Mobile keyboard/scroll/focus/unsaved-change behavior and full automated verification.

## R4 — raw-idea route and release-level evidence

Add source mode to persisted workflow state: `raw` or `selected_take`. Migrate old saves to selected_take only when their actual selected take exists; otherwise preserve old state with a visible choice rather than arbitrarily choosing the first board card. Do not auto-switch a currently selected user's take on migration.

“Use my original idea” performs necessary Spark analysis, then opens Physics with raw source. It does not call Divergence, fabricate a take or read `takes[0]`. Preserve boards for optional later exploration. Planning, Forge, refine context and build fingerprints must use the same source selection function so one stage cannot secretly use a stale angle.

Tests: raw mode with stale selected ID and several boards; save/reload; switching back to accepted take; raw Spark edit invalidates dependent build inputs; cancel Spark analysis preserves current work; old-project migration. Mobile action must be clearly distinct from “Explore four angles”.

Release regression should use the same rich neutral fixture through provider-fake failures, job persistence, prompt override, reload and final compilation. Report actual counts/categories/estimated tokens, first-pass validation, reused jobs, effective model and prompt revisions. Run actual provider trials only with user-aware scope/cost. Separate structural tests, simulated orchestration and runtime-observed results. Existing native CHARX fidelity gates remain unaffected.

## Final next-model instruction

Read R1 and the prompt pack fully, verify branch and current code, then implement R1 tasks A–F in order with failing tests first. Do not spend a turn rewriting this design. Preserve documentation and user work. After R1 is verified, report the precise scope and continue dependency-ordered R2 work if the user's authorization and session scope permit. Never report the whole Forge overhaul complete because R1 passes.

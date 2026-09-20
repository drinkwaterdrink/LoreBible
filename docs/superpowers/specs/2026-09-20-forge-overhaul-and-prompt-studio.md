# Forge overhaul and Prompt Studio

Date: 2026-09-20. Branch: `test`. Inspected baseline: `4fd0389`, package 0.62.0.
Status: investigation and proposed implementation design; NOT a shipped fix.
Extends [resumable specialist jobs](2026-09-20-resumable-forge-specialist-jobs-design.md). Where different, this document governs the expanded design. Existing completed work remains authoritative.

## 1. What the investigation establishes

Yes: each physical generation job needs an explicit schema. The app already defines bundle schemas, but delivery and enforcement are incomplete. Adding another vague sentence saying “use JSON” will not solve this.

| Evidence in current code | Consequence |
|---|---|
| `server/model/gateway.ts` initially sends normalized `json_schema`, then can downgrade to `json_object`, then remove `response_format` following HTTP 400 compatibility errors | The actual schema can disappear. The original messages are reused, without a textual schema fallback. JSON mode does not specify field names or nested shapes. |
| `server/generation/forgeBlueprintBrief.ts` constructs category IDs but its formatter prints labels only | Model cannot reliably preserve IDs it was never given in that brief. |
| `forgeCoveragePlan.ts` also formats labels/destinations, not IDs, and manufactures required `lore` / “Cross-category Lore” from the difference between total minimum and summed category minima | The model must guess identity and reconcile a synthetic bucket with the accepted categories. Allocation is not based on remaining inventory after earlier work. |
| Bundle 5 combines history, aesthetic, naming, pressures, all supplemental categories | Many distinct responsibilities and an unpredictable response size in one failure domain. Aesthetic and naming are objects, not arrays. |
| Its modifier says every accepted category without a named legacy section belongs in additionalLore | Ambiguous whether this means absent from this bundle or absent from the entire project mapping. |
| `parseStructuredOutput` accepts any valid JSON, including null/scalars/arrays; its recovery scan chooses the first parseable balanced fragment | Syntax success is not contract success. A preamble containing another JSON document can cause the wrong fragment to be selected. |
| `executeSelectedModelWithRetry` returns parsed content before bundle shape/schema validation; the Forge loop validates later | The reported non-object error bypasses automatic shape correction. Repeating the same user request can reproduce the same failure. |
| Forge sanitizes/mutates the document and emits section events before its coverage audit | A result can appear before its bundle is accepted. Validation and publication must be atomic. |
| `systemPrompt.ts` mandates loaded one-liners, forbids negation, demands tension in every line, and encourages recursion through name-dropping | These are seed-writing preferences, not suitable universal rules for deep profiles, ordinary life, explicit limits, and carefully gated secrets. |

The supplied GLM excerpt is consistent with these defects: it guesses arrays for object sections, category IDs, ownership, and project-wide counts. It also proposes unsupported player history and interprets conflicting constraints itself. It is user-supplied provider output, not an instruction source or proof of the exact final response bytes.

**Still unknown:** whether the failing final response was an array, scalar, null, or a wrongly extracted fragment; which compatibility downgrade happened in that specific call; actual provider/model identifier; exact time spent generating versus retrying. The reported display names are not sufficient to certify provider capability. Do not blame a particular model without these measurements.

## 2. Latency diagnosis and measurement

Current selected-model attempts allow 150 seconds to first activity, 60 seconds inactivity, and 480 seconds overall. Activity can include reasoning; it does not imply useful validated output. The outer generation loop allows three attempts and compatibility negotiation can make additional HTTP requests. Manual retries repeat the bundle. These are ceilings, not measurements explaining the user's exact six minutes.

The long GLM excerpt demonstrates substantial deliberation about missing contracts, counts, and conflicting instructions. Smaller, unambiguous jobs should reduce wasted work and repeat cost. They are not guaranteed to beat one successful large call: additional calls add overhead. Optimize time to a validated saved result and total retry waste, not raw call count.

Record per job/attempt: provider and actual model ID, effective structured-output mode, compatibility attempts, queue/request start, first activity, first content, generation end, validation end, commit end, input/output token usage, optional reported reasoning-token count, finish reason, retry cause, reused jobs. Keep unknown usage unknown; distinguish cumulative and incremental usage to prevent double counting.

Show the user “Generating History”, elapsed time, saved jobs, and the reason for recovery. No fabricated ETA. Compare old/new orchestration on the same deterministic Blueprint and provider/model configuration: total duration, time to first saved result, accepted entries/tokens, first-pass validation rate, regenerated tokens, duplicate/missing categories. Use several measured live runs before asserting a speed percentage. Offline tests prove orchestration, not provider latency.

## 3. One build plan, six visible bundles, bounded specialist jobs

Keep the existing graph/build/checkpoint authority. Introduce a versioned job ledger inside each build, not another manuscript or artifact system. Six visible bundles remain familiar; internal requests become specialized.

1. Resolve accepted inputs and conflicts before spending generation tokens.
2. Allocate an explicit inventory across exact accepted category IDs and legacy singleton sections.
3. Derive bounded jobs and dependencies from that inventory.
4. Supply only relevant canon plus the complete identity/constraint register.
5. Generate using the job schema and creative instructions.
6. Parse, validate structure, validate ownership/coverage/canon invariants.
7. Save the provisional validated job transactionally.
8. Deterministically merge and audit the logical bundle; commit before publishing accepted section events.
9. Cross-link, audit world/card quality, then compile through existing IR/manifest serializers.

Job manifest fields: version, jobId, logicalBundleIndex, kind, schemaId/schemaVersion, output destination, allowed category IDs and labels, min/target/max entries, estimated output allowance, owned entry slots, dependency IDs, source fingerprint, prompt revision/hash, allowed reference IDs, omitted categories, creative freedom policy. IDs and counts are data, not prose the model must infer. Application-owned stable IDs should be allocated before writing; retries fill the same slots and cannot append duplicates.

Suggested physical jobs:

- Bundle 1: core/user framing; durable rules; initial snapshot (separate temporal ownership).
- Bundle 2: location batches; organization/faction batches.
- Bundle 3: principal cast; roster cast; relationships after cast IDs exist; knowledge after relevant entities exist.
- Bundle 4: items; discovery/secret proposals; conflict and pressure protocol singletons.
- Bundle 5: history batches; aesthetic object; naming object; pressures; each additional accepted category in its own batches.
- Bundle 6: opening; procedural material; expansion/build notes. Examples and alternate greetings enter via their later card-production contracts, not invented fields in old schemas.

Start with a configurable policy of at most six standard entries or three rich principal profiles per request; singletons have one owner. These are provisional engineering defaults to benchmark, not total library caps. Also bound by estimated output tokens and known context/output limits, reserving space for schema/JSON overhead and provider reasoning where relevant. If one entry cannot fit, report it rather than truncate. Unknown model limits require conservative sizing and visible uncertainty.

Do not parallelize canon-dependent writers. Initially run sequentially for predictable cost/rate limits; later allow at most two independent jobs with explicit provider limits and deterministic merge order. Cancellation prevents new dispatch and preserves committed jobs.

## 4. Inventory and budgets without catch-all padding

Library size and runtime activation budget remain independent. A 20k or 40k library allowance is not an instruction to inject that amount or fill it with padding. Blueprint detail/intensity grows meaningful coverage before paragraph length.

Replace the automatic Cross-category Lore deficit with an explicit allocation proposal before Forge. Assign unallocated allowance to premise-supported accepted categories; display why. Never silently add arbitrary category IDs. If category maxima cannot satisfy a locked total minimum, report the conflict and let the user revise one constraint. Do not ask the writer to reconcile impossible arithmetic. General lore remains available if explicitly selected, with a real stable ID and purpose.

Account for all exported entry types, not aesthetic/naming singleton objects as if they were entries. Use actual completed counts when computing remaining work. Preserve max ceilings and omitted categories. A category detail change cannot cause previously completed categories to be regenerated accidentally.

A job receives its own counts plus remaining project summary for context. It is explicitly prohibited from re-emitting read-only established entries. Custom category labels are preserved; exact IDs travel in schema enums/job data. Validate by ID, not label guessing. Missing coverage generates an explicit bounded repair plan, never a silent target reduction.

## 5. Schema delivery, validation, and recovery

Extract Forge schemas from server.ts into a shared typed contract module used by request generation and runtime validation. Generate the human-readable JSON contract from that same schema; do not maintain hand-written shape examples independently.

Always include the compact exact job schema in the effective prompt, including required nested properties and enums. Send native strict schema too where supported. For fallback, preserve the contract in messages and report `native_schema`, `json_only`, or `prompt_contract`. Native strict mode is not assumed certified merely because HTTP succeeds. Record capability observations by provider/base URL/model and expiration; distinguish unsupported from temporary/generic errors. Never permanently downgrade on one ambiguous 400.

Validate unknown output inside the bounded job attempt loop, before dereferencing or sanitizing it. Runtime validator errors should name JSON paths and expected/observed types, without logging prose. Reject multiple candidate documents, truncated results, null, scalars, missing sections, wrong object/array shapes, invalid IDs, duplicate slots, forbidden categories, and malformed entries.

Permit only unambiguous wrapper normalization: BOM/fence removal and an exactly one-element object array whose sole object fully validates. Record normalization. No merging arbitrary objects, converting null into empty content, taking a convenient fragment, or synthesizing missing fields.

Retry policy: initial attempt plus at most one schema-correction generation for a well-sized job. Include only concise validator diagnostics and original contract, not the provider reasoning transcript. Truncation requests a smaller replacement job plan, not identical retries. An explicit user retry starts a new bounded attempt group, reusing successful jobs. Authentication/cancellation/permanent configuration errors do not auto-retry. Rate limits respect Retry-After and a bounded wait; expose pause. All nested retries share an overall deadline and attempt budget. Do not multiply outer retries by hidden inner generation retries.

Save valid job output before proceeding. If aggregate coverage fails, retain provisional jobs and create a targeted missing-coverage repair; do not publish accepted partial sections. On SSE reconnect, recover from server checkpoint; ensure no duplicate accepted events/commits. Prompt or canon changes create scoped invalidation; changing model alone may reuse completed jobs with mixed-model provenance visible.

## 6. Prompt quality architecture

Separate these layers in the prompt compiler:

1. Protected protocol: schema, output ownership, stable IDs, source provenance, data delimiters, agency/canon acceptance, secrets, no fabricated success.
2. Versioned feature mission: what this specialist writes and what it must not own.
3. Editable creative profile: style, depth, tonal balance, specificity, examples of desired craft without seeded names/world content.
4. Accepted job manifest and relevant canon: treated as data, not embedded instructions.
5. Optional concise validation correction on retry.

Do not request hidden reasoning. Ask only for the output contract and, where schema allows, concise decisions/findings with evidence. Provider-exposed summaries are optional UI data and are not future generation input.

Replace universal “loaded one-liners only” with category-specific depth. Keep concise specificity, useful implications, distinctive voices, and continuity. Allow explicit negatives when essential to a rule or boundary. Do not require tension in every ordinary-life entry. Explain mechanics when runtime use needs triggers/limits. Do not force recursion or KEYS text tails; retrieval engineering owns activation settings later. Honor user-authored names over aesthetic name bans.

Writer missions:

| Specialist | Required craft | Must not do |
|---|---|---|
| Principal cast | Embodiment, voice, contradictions, independent goals/relationships, useful habits | Reduce everyone to stance toward the player |
| Roster cast | Brief identity, voice, goal, hook, relationship | Duplicate principal profiles or change IDs on promotion |
| History | Concrete past event and enduring consequences, explicit historical classification | Turn implication into accepted player biography |
| Ordinary life | Routines, work, leisure, food, benign relationships, humor if premise supports it | Manufacture danger in every paragraph |
| Pressure | Independent force, affected parties, cost, temporal scope | Prescribe the player's decisions or future plot |
| Secret/clue | Truth versus who knows, discovery evidence, public-safe references | Leak truth into public fields or fake an unavailable unlock engine |
| Aesthetic/naming | Focused singleton guides consistent with canon | Treat sample names as actual people or invent biography from a name pool |
| Relationships/knowledge | Resolve both endpoints by stable ID, direction, belief/knowledge distinction | Invent missing entities to make a reference pass |

Explicit user facts, accepted inventions, generated proposals, and unresolved variables stay distinct. Unknown power stays unknown. Evidence of loneliness is not permission to canonize divorce. Naming “Russell” in a name pool does not establish an ex-husband. Durable player history requires acceptance. Unrelated creative invention can be permitted under the selected authoring mode but must be marked generated, not falsely sourced.

Conflicting accepted settings require a preflight resolution, not model improvisation. Show “Spark: implied violence / Physics: graphic violence” with both sources and a choice. Retain the resolution in the build fingerprint. Countdown state belongs in the initial snapshot/opening, not evergreen history or constant lore.

## 7. Prompt Studio in Settings

Add Settings > Creative Prompts. The default wizard works without editing anything. Organize by feature, then specialist; show purpose, version, scope, editable text, protected contract summary, reset and save actions. Mobile uses a full-height editor with one primary action and no nested scroll trap.

Scope options: application default profile and project override. Precedence is shipped defaults < selected global profile < explicit project override; protected protocol always applies. Starting a build snapshots the resolved prompts. Editing global settings must not silently alter an in-flight or resumed build. Offer “keep this build's prompt version” or a new scoped revision; preserve earlier output.

Use a versioned PromptProfile containing profile ID, base version, overrides keyed by stable feature ID, template text, revision and timestamps. Allowed variables are declared by each registry entry. Parse substitutions as plain text, never evaluate code. Reject unknown/missing placeholders, excessive length, invalid imports, and attempts to remove required job data. A prompt cannot change schemas or disable validation via text. Still audit results; prompt hierarchy alone cannot guarantee creative safety.

Controls: view default, edit creative mission/style, diff, restore one feature, reset profile with confirmation, duplicate profile, import/export prompt-only JSON, preview effective request. Preview exposes project content only on explicit request, excludes credentials, and warns before copying private canon. Never automatically log raw prompts/responses. Use prompt hashes and safe metadata for diagnostics.

Preview/test is separate from Save. Saving does not spend tokens. A test shows selected model, expected scope, and uses an isolated candidate; it cannot mutate the manuscript. No silent model substitution. A changed default retains user overrides and shows an upgrade diff.

Registry coverage must include Spark parsing, premise suggestions where available, Divergence architecture/critic/writers/single/reroll variants, Forge specialists, entry reroll/variants/push, section regeneration, consistency audit, roll suggestions, voice/opening audits, and test-bench instructions. Inventory actual call sites rather than promising an editable control for a deterministic feature. Blueprint category/mechanic recommendations currently include deterministic planner rules: label those as rules/configuration, not a hidden editable AI system prompt. Artifact-package recommendations are plans, not proof that every output type ships.

## 8. Wizard and quality gates

Before Forge show accepted coverage, library allowance, runtime recommendation, job count estimate, selected model, prompt profile and unresolved conflicts. Explain Smart Auto = automatic planning, Guided = common controls, Expert = precise overrides; none changes schema validation or secretly selects a different quality model.

During generation show current specialist and saved progress. Afterward report planned versus generated category counts, total library estimate, unresolved gaps, agency/temporal/secret issues and verification level. Keep retrieval simulation and native import certification separate from content generation success.

Retain the requested “Use my original idea” option as the next wizard slice: explicit raw/selected-take source mode, Spark analysis followed by Physics, no fabricated Divergence object, no fallback to an old first take. Keep optional Divergence boards for later use. Save/load and build fingerprints must preserve the chosen source mode.

## 9. Delivery sequence and exit criteria

1. Contract delivery + safe shape validation + atomic publication + diagnostics: first reliability release.
2. Explicit allocation + durable specialist jobs + cancellation/recovery: large-build reliability release.
3. Refined prompt registry, canon-aware context and conflict preflight: creative-quality release.
4. Prompt Studio with persisted revisions and request preview: customization release.
5. Raw-idea route and mobile end-to-end verification.
6. Continue M3.2 canon acceptance/scoped regeneration and M4 retrieval/Activation Lab, then M5 card production/M6 publishing evidence.

Each slice requires failing regression tests first, focused tests, full Bun tests, typecheck, build, diff check, and a reviewable checkpoint. Keep credentials, accepted prose, IDs, locks and completed legacy bundles. No wholesale server.ts rewrite, no schema relaxation to get tests green, no automatic paid benchmark suite. Existing production limits and fidelity blockers remain until separately resolved.

Regression matrix: schema rejection followed by JSON fallback; null/array/scalar/multiple JSON/truncation; incorrect aesthetic/naming types; omitted/custom categories; impossible counts; 40k allowance with bounded requests; cancellation after one saved subjob; reload; stale source/prompt revision; model switch; duplicate events/IDs; existing four completed bundles; provider rate limits; first content versus reasoning activity; unsupported player biography; unresolved ability; public secret leak; current countdown; ordinary-life coverage; prompt import/restore/upgrade; raw idea without stale take.

This design does not certify any provider model or Lumiverse import. A live sanitized run with actual model ID and safe attempt diagnostics is needed to attribute the user's exact failed response. The code defects above justify correction without asking the user to spend another eight retries.

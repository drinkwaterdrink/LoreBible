# Forge R1 Implementation Plan — reliable contracts and refined bundle prompts

> **For agentic workers:** use `superpowers:executing-plans` task by task. Use test-driven development and verification before completion. Do not change the model or spawn agents merely because this document mentions a model handoff. The user is switching models to implement this plan, not asking for another planning loop.

**Goal:** fix the immediate cross-model Forge failure path, make every bundle's contract explicit, replace conflicting Forge writing instructions, and prevent rejected output from appearing accepted.

**Architecture:** extract only Forge schema/prompt/validation boundaries from the existing server. Keep six bundles, their output shape, the graph repository and existing completed checkpoints. A Forge-only bounded runner owns schema correction; existing transport helpers make single attempts for this path.

**Tech stack:** current TypeScript, Bun tests, Express, React, Google SDK and OpenAI-compatible model gateway. No new validation dependency required for the finite schema vocabulary used here.

**Spec:** [overhaul design](../specs/2026-09-20-forge-overhaul-and-prompt-studio.md).
**Prompt source:** [exact Forge prompt pack](../specs/2026-09-20-forge-production-prompt-pack.md).
**Next after R1:** [R2–R4 continuation contracts](2026-09-20-forge-r2-r4-handoff.md).

## 0. Read this before implementation

The earlier delivery plan was an architectural sequence, not sufficiently exact execution instructions. This document is the authoritative next-step plan. It does not claim the entire overhaul can safely ship in one patch. R1 must pass before job persistence or a prompt editor is added.

Inspected checkout: `C:/Users/trent/Downloads/LoreBible-main/.worktrees/m07-artifact-ir`, branch `test`, HEAD `4fd0389`, package `0.62.0`. The parent directory is a different checkout; do not edit or launch it accidentally. Recheck all facts before changing files:

```powershell
git status --short
git branch --show-current
git log -1 --oneline
git rev-parse HEAD
```

Expected existing documentation changes from this handoff belong to the user. Preserve them. Inspect `package.json`, `src/version.ts`, `CHANGELOG.md`, repository instructions and the current roadmap. Never reset unrelated changes. Do not hard-code the next version before scope is validated. No credentials, provider tests costing money, push, or new branch is required for this slice.

### Non-negotiable constraints

- No saved-project or accepted-prose rewrites. Old completed bundles must remain resumable and must not be subjected retroactively to stricter generation validation.
- No generic `any`, ignored type errors or disabled tests introduced to solve this.
- Do not fix an invalid result by fabricating missing fields, empty entries, or creative placeholders.
- No default runtime-budget changes, lore padding, category omission, hidden model switching or full-fidelity export claims.
- Prompt refinements apply only to new/incomplete generation. Do not globally replace the shared seed rules used by other features.
- R1 does not solve every agency/secret/temporal quality issue deterministically. Preserve existing audits and report the remaining quality horizon.
- Do not mark artifact packages, mechanic recommendations or new Settings controls operational without their consumers.

### Review focus

1. A provider falls back to plain text and returns an array or more than one JSON document.
2. Valid bundle sections are followed by an invalid section or a coverage failure: nothing accepted may leak into the client/checkpoint.
3. One combined request spans several logical bundles and a repository write fails: no partially committed range.
4. The selected-model and legacy environment-Gemini paths must have the same shape checks and retry ceiling.
5. A legacy build resumes Bundle 5 with four completed bundles; new prompts must not erase or regenerate those four bundles.

## 1. Implementation map

Create:

- `server/generation/forgeSchemas.ts`: existing six bundle schemas, copied without creative field changes, normalized and exported.
- `server/generation/schemaContract.ts`: finite schema normalization, contract rendering and recursive validation.
- `server/generation/forgeCandidate.ts`: object normalization, section sanitation and candidate-document coverage validation, pure and non-mutating.
- `server/generation/forgeAttemptRunner.ts`: one bounded Forge attempt group with correction, classification and cancellation.
- `server/generation/prompts/forgeDefaults.ts`: exact prompt-pack constants and bundle mission map.
- `server/generation/prompts/compileForgePrompt.ts`: deterministic request composition and version metadata.
- Tests mirroring these modules under `tests/generation/`.

Extend existing modules rather than replacing them:

- `server/model/structuredOutput.ts`, `server/model/gateway.ts`, `src/contracts/generation.ts`: Forge-selectable strict candidate parsing and additive safe response metadata.
- `server/generation/forgeValidation.ts`, `forgeResume.ts`, `forgeCoveragePlan.ts`, `forgeBlueprintBrief.ts`: reuse sanitation/selection, print exact ownership and IDs.
- `server/generation/forgeProjectCoordinator.ts`, `src/lib/projectGraph/commands.ts`, `forgeBuilds.ts` and existing command validators: atomic combined-range completion.
- `server.ts`: import definitions, invoke compiler/runner, commit then publish; avoid broad route refactor.

`JsonSchema` is in `src/contracts/generation.ts`, NOT `server/model/contracts.ts`. The existing validator is `sanitizeForgeSectionEntries`, and the existing coverage function is `auditForgeBundleCoverage`. Reuse them after structural validation; do not introduce alternate authorities for the same requirements.

## 2. Exact module contracts

These are planned interfaces, not claims that exports already exist. Export these names so tests and later slices use a consistent vocabulary.

```ts
// schemaContract.ts — import JsonSchema from src/contracts/generation.ts
export interface SchemaIssue {
  path: string; // JSON Pointer, e.g. /aesthetic/colors/0
  code: 'type' | 'required' | 'enum' | 'additional_property' | 'schema';
  expected: string;
  actual: string; // type descriptor only; never a content value
}
export function normalizeForgeSchema(input: unknown): JsonSchema;
export function validateSchemaValue(value: unknown, schema: JsonSchema): SchemaIssue[];
export function renderSchemaContract(schema: JsonSchema): string;

// forgeSchemas.ts
export interface ForgeBundleDefinition {
  index: number; // zero-based
  name: string;
  keys: readonly string[];
  schema: JsonSchema;
}
export const FORGE_BUNDLE_DEFINITIONS: readonly ForgeBundleDefinition[];

// forgeCandidate.ts
export interface PreparedForgeCandidate {
  sections: Record<string, unknown>;
  document: Record<string, unknown>;
  normalizations: readonly ('singleton_object_array')[];
  ignoredKeyCount: number;
}
export function prepareForgeCandidate(input: {
  value: unknown;
  definition: ForgeBundleDefinition;
  previousDocument: Readonly<Record<string, unknown>>;
  coveragePlan: ForgeCoveragePlan | null;
}): PreparedForgeCandidate;

// forgeAttemptRunner.ts
export interface ForgeAttemptResult {
  value: unknown;
  finishReason?: string;
}
export interface ForgeAttemptEvent {
  attempt: number;
  maximum: number;
  phase: 'request' | 'validation' | 'correction' | 'failed';
  code?: string;
}
export function runForgeAttempts<T>(input: {
  request: (args: { correction: string | null; signal?: AbortSignal }) => Promise<ForgeAttemptResult>;
  validate: (value: unknown) => T;
  signal?: AbortSignal;
  onEvent?: (event: ForgeAttemptEvent) => void;
}): Promise<T>;

// compileForgePrompt.ts
export interface CompiledForgePrompt {
  systemInstruction: string;
  userPrompt: string;
  promptVersion: string;
}
export function compileForgePrompt(input: {
  definition: ForgeBundleDefinition;
  context: string;
  coverageBrief: string;
  correction?: string | null;
}): CompiledForgePrompt;
```

Use `ForgeCoveragePlan` from its existing module. `normalizeForgeSchema` is the sole Forge schema normalization authority; update gateway normalization to use the same generic helper if safe, otherwise call it only on the extracted Forge definitions and leave other routes untouched.

### Schema vocabulary and validation algorithm

Support current lowercase/Google-uppercase primitive types, `properties`, `required`, `items`, `enum`, `additionalProperties`, `description`, and `nullable`. Normalize at the schema boundary, not at every request. Reject unsupported schema keywords during definition tests; never silently ignore a future validation requirement. Schema definition errors are internal configuration errors, not model retry causes.

Validate recursively without mutation:

1. Null is legal only for `type: null` or `nullable: true`.
2. Objects exclude null and arrays; use own-property checks for required fields.
3. Arrays validate every item when `items` exists.
4. Integers must be finite safe integers; numbers finite; booleans/strings exact types.
5. Enum equality is primitive equality. Do not coerce strings into numbers/booleans.
6. Honor additionalProperties false/schema; absent means allowed, matching current schema semantics.
7. Capture at most 20 safe path/type issues; escape JSON Pointer segments. Do not include received prose or arbitrary unknown field names in user-facing diagnostics.
8. Existing semantic sanitation then checks nonblank required strings, usable keys and semantic names. Add `typeof key === 'string' && key.trim()` checks and reject arrays masquerading as `fields`.

Extraction must preserve each original required field and type. Do not append `additionalProperties: false` or force optional fields into required just to satisfy a provider's strict-mode subset. Transport compatibility fallback exists for unsupported dialects; local validator remains authoritative.

## 3. Task A — extract schemas with parity tests

- [ ] Write a test asserting `FORGE_BUNDLE_DEFINITIONS.map(b => b.keys)` equals `FORGE_BUNDLE_KEYS` exactly; run and observe missing-export failure.
- [ ] Copy the current entry schemas and six bundle definitions out of `/api/forge`, preserving all fields/enums. Keep mission text out of the schema module. Replace route-local definitions with imports.
- [ ] Add fixtures for every logical bundle from existing valid fixtures/tests; validate each against its extracted schema. Deliberately break one nested value in every bundle and assert a typed issue.
- [ ] Assert aesthetic and naming are objects; history/pressures/additionalLore are arrays; supplemental lore fields are nested inside `fields`.
- [ ] Run targeted schema/Forge validation tests, typecheck and diff check; checkpoint extraction separately from behavior changes.

Core regression (ready to adapt into Bun tests):

```ts
import { expect, test } from 'bun:test';
import { FORGE_BUNDLE_DEFINITIONS } from '../../server/generation/forgeSchemas';
import { FORGE_BUNDLE_KEYS } from '../../server/generation/forgeResume';
import { validateSchemaValue } from '../../server/generation/schemaContract';

test('bundle keys stay compatible with existing checkpoints', () => {
  expect(FORGE_BUNDLE_DEFINITIONS.map(b => b.keys)).toEqual(FORGE_BUNDLE_KEYS);
});
test('arrays are not valid aesthetic objects', () => {
  const schema = FORGE_BUNDLE_DEFINITIONS[4].schema.properties!.aesthetic;
  expect(validateSchemaValue([], schema)).toEqual([
    { path: '', code: 'type', expected: 'object', actual: 'array' },
  ]);
});
```

## 4. Task B — strict candidate extraction without breaking other features

Add an optional parser policy to `parseStructuredOutput(raw, options?)`; default retains existing behavior for non-Forge callers during this slice. Add optional `structuredOutputPolicy: 'single_document'` to `GenerationRequest`; Forge sets it, gateway passes it through. Legacy SDK Forge parsing uses the same policy. Do not globally prohibit array roots because Divergence and other consumers may legitimately require arrays.

Strict policy accepts an entire valid JSON value or one fenced value, or one unique complete JSON document with non-JSON preamble. Scan top-level complete candidates while skipping their interiors; do not reinterpret nested objects as independent candidates. If more than one document exists, reject rather than choose the first. Shape validation subsequently rejects scalar/null roots and handles only an exactly-one-object array wrapper that fully validates.

- [ ] Add strict-policy tests for `{}`, `null`, scalar strings, fenced object, preamble plus one object, preamble with `[]` followed by object, two objects, nested object, truncated object and JSON braces inside strings.
- [ ] Assert legacy default parser behavior remains unchanged until each non-Forge route gets its own contract migration.
- [ ] In gateway tests simulate `json_schema` rejection followed by `json_object` rejection and eventual plain response; assert request messages still include the rendered schema, exact `fields.categoryId`, and object-valued aesthetic/naming requirements.
- [ ] Expose optional `finishReason`, `structuredOutputMode`, and `compatibilityAttempts` on `GenerationProvenance`. Do not discard metadata merely because streaming callbacks exist; avoid double-counting usage by keeping metadata notification separate from streamed usage emission.
- [ ] Detect `length`/documented token-limit finish reasons before accepting an otherwise parseable fragment. Unknown finish reason is uncertainty, not proof of truncation.

Do not log raw provider errors containing output/prose in the new diagnostics. Compatibility attempts are HTTP attempts; distinguish them from completed-generation attempts. Do not claim a positive response proves strict schema enforcement.

## 5. Task C — pure preparation and atomic publication

`prepareForgeCandidate` must not touch the live document, repository, SSE or user settings. Clone the candidate and previous document. Validate schema before any property access. Allow existing ignored top-level metadata policy, but reject extra keys that are known Forge sections owned by another bundle; report only their known identifiers. Do not silently accept a writer regenerating NPCs during Bundle 5.

After structural validation: run `selectForgeBundleSections`, sanitize array entries and nested worldPhysics.rules, build candidate document, run `auditForgeBundleCoverage`, return candidate. Sanitation may apply existing deterministic ID/lock defaults where the schema allows them; it may not rewrite creative fields or runtime intent. Duplicate IDs within the candidate or colliding with unrelated accepted entries must be errors, not last-writer-wins.

- [ ] Freeze/clone input test fixtures. Assert failed structural/semantic/coverage validation leaves previous document byte-for-byte equivalent.
- [ ] Mock commit and emit functions; assert call order is validate -> commit -> accepted section events. A commit rejection emits no accepted sections and preserves previous local document.
- [ ] In route replace the current mutate-and-send loop with: prepare candidate, durable commit, assign candidate document, publish committed sections.
- [ ] Preserve current non-durable path: all validation first, then one local assignment followed by accepted events. Label its save boundary honestly; do not imply server persistence without a graph build.

Illustrative integration sequence (adapt const/let declarations, not data contracts):

```ts
const candidate = await runForgeAttempts({ request, validate, signal });
// validate returns PreparedForgeCandidate. Nothing above publishes accepted data.
if (durableAttempt) {
  durableForge = executionMode === 'single_request'
    ? await coordinator.completeRange(durableAttempt, candidate.sections, endIndex, provenance)
    : await coordinator.complete(durableAttempt, candidate.sections);
}
Object.assign(doc, candidate.document);
for (const [key, data] of Object.entries(candidate.sections)) {
  sendEvent('section', { key, data });
}
```

### Combined-request transaction requirement

Current `completeRange` commits each bundle in a loop. Merely moving events after it is insufficient: a failure halfway leaves a partially committed range. Add one `forge.range.complete` graph command that applies all contiguous range transitions to a cloned graph and commits once through ProjectRepository.

Payload: existing active build/bundle/attempt identifiers, exclusive end index, sections, inputFingerprint, sourceRevision, provider/model/route, and deterministic command-owned IDs for later bundle attempts. Validate range bounds, all owned keys and source revision before mutation. Reuse batch transition logic in memory; do not create independent repository writes inside the command. Preserve idempotency under the same command ID. Reject gaps, existing completed-section overwrite and stale revisions. Extend command type/parser and persistence tests together.

- [ ] Failure on the last range element leaves the whole prior graph unchanged.
- [ ] Successful range advances once transactionally and retains per-bundle provenance.
- [ ] Duplicate command replay cannot append attempts or entries.
- [ ] Client disconnect after committed range is recoverable from the existing resume endpoint; never roll back accepted server state to make the UI appear failed.

## 6. Task D — one bounded correction loop

Forge uses `runForgeAttempts` rather than wrapping the existing three-attempt helper with another loop. Invoke existing provider helper with `maxAttempts: 1`. For environment Gemini add a Forge-only option disabling its inner short-rate-limit retry so physical attempts do not multiply. Leave other features' retry behavior unchanged in this slice.

R1 policy: at most two content-generation attempts: original plus one correction only for recoverable malformed/invalid structured output. No retry on cancellation, auth, missing profile/model, quota, schema-definition error, conflicting input or repository error. Timeout/rate limit/network failure stops with actionable saved-progress status in R1; R2 adds explicit shared scheduling/backoff. Do not automatically reduce reasoning or change models in this runner.

Retry contains original compiled context/contract plus the prompt-pack correction, replacing any previous correction (never accumulating it). Include safe paths/types, at most 20 issues. No previous prose or reasoning transcript. A missing required category may be corrected once; repeated coverage failure stops with category/count details. Do not retry token-limit truncation unchanged; explain the need for smaller jobs (R2).

```ts
test('one correction then success', async () => {
  const corrections: Array<string | null> = [];
  const value = await runForgeAttempts({
    request: async ({ correction }) => {
      corrections.push(correction);
      return { value: corrections.length === 1 ? null : { history: [] } };
    },
    validate: value => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new ModelGatewayError('Expected object; received null.', 'INVALID_STRUCTURED_OUTPUT', 502);
      }
      return value;
    },
  });
  expect(value).toEqual({ history: [] });
  expect(corrections).toHaveLength(2);
  expect(corrections[0]).toBeNull();
  expect(corrections[1]).toContain('object');
});
```

Import `ModelGatewayError` in the test. Add tests asserting invalid twice makes exactly two calls; cancellation between calls makes one; authentication makes one; truncation makes one; success makes one; commit failure makes no additional generation call. Inject safe issue metadata through a typed Forge validation error rather than parsing arbitrary error-message strings. That error should extend existing `ModelGatewayError` and carry `SchemaIssue[]`; non-schema sanitation/coverage errors receive safe issue summaries.

## 7. Task E — deploy the prompt pack only to Forge

- [ ] Add the exact constants from the companion prompt pack. Read the full pack, including legacy field compatibility notes; do not paraphrase away constraints.
- [ ] Compile protected protocol + common craft + mission(s). User message carries resolved context, authoritative coverage JSON/text, schema and optional correction. For combined requests concatenate each selected mission once and render the combined schema once.
- [ ] Replace Forge's use of `GENERATOR_RULES`, `FORMAT_EXAMPLE`, and appended “no negations / loaded one-liners” suffix. Keep other generation routes unchanged.
- [ ] Print category `id`, label, destination, status, min/ideal/max, cast tier and scope explicitly in coverage format. Never infer canonical IDs from labels. For R1's existing synthetic `lore` category, expose its real ID and label rather than asking the model to invent one; do not claim R1 removed its allocation flaw. R2 removes hidden catch-all allocation.
- [ ] Add prompt snapshot/structural tests: schema present exactly once; all Bundle 5 keys/IDs explicit; established NPCs marked read-only; no blanket recursion/negation/tension requirement; no sample-world names; `{{user}}` preserved literally; no hidden reasoning request.
- [ ] Assert omitted categories produce explicit zero ownership, not an invitation to leak them into another category.

No schema needs new fields to use these prompts. Preserve existing `permanence` wire values by deriving their descriptions from current contracts. Do not ask for future `temporalClass`, `factStatus` or advanced retrieval objects until their schemas and consumers exist.

Prompt version `forge-prompts/1` is generation provenance, not a license to invalidate earlier bundles. For existing compatible builds, record the version on new attempts only. Leave prior attempts “legacy/unspecified”. R2 introduces immutable build prompt snapshots; do not bump the existing global input fingerprint and accidentally restart all old builds in R1.

## 8. Task F — diagnostics, regression and handoff

Add safe fields to existing generation events only with contract/client-parser updates: logical bundle, attempt/max, phase, effective output mode, received top-level type, issue count, elapsed request/validation time. User message example: “History returned a list instead of the required object. One correction failed. Bundles 1–4 remain saved.” The top-level type must be measured, never assumed from this example.

Do not present raw received fields or content excerpts in logs. Test sentinel private text, token-shaped credentials, unusual category labels and malicious unknown keys do not leak through diagnostics. Preserve exact provider/model identity in safe provenance, but not connection secrets.

Required regression fixtures are invented neutral structural test data, not the user's private world:

- Compact domestic world with principal/roster cast and ordinary life.
- Large academy-style world with a custom category and multiple house IDs, no real person data.
- Four completed bundles followed by Bundle 5 invalid shape then success; previous sections unchanged.
- Valid shape but wrong nested fields; output never published accepted.
- Accepted total/category ceiling conflict; no silent truncation.
- Combined request all-or-nothing repository failure.

### Concrete Bundle 5 test fixture

Create `tests/fixtures/forge/bundle5-contract.json` with this exact neutral structural fixture. This is test-only data: never inject it as a generation example or reuse its creative content in real projects. Its one-entry categories do not represent production scope. Use no coverage plan for the pure shape test, then supply explicit one-entry fixture ranges for coverage tests.

```json
{
  "history": [{
    "id": "fixture-history-1",
    "fields": {"name": "Reading Room Conversion", "event": "Residents converted the former storeroom into a shared reading room.", "era": "Five years before the opening", "consequence": "Neighbors now share responsibility for the collection."},
    "keys": ["Reading Room Conversion"], "permanence": "C", "locked": false
  }],
  "aesthetic": {"colors": ["oak brown"], "sounds": ["pages turning"], "smells": ["book paper"], "weather": "Temperate seasons", "visualMotifs": ["annotated bookmarks"], "fashion": "Ordinary local work clothes", "touchstones": ["shared neighborhood spaces"], "permanence": "P"},
  "naming": {"linguisticBase": "Names already established by the author", "commonNames": [], "eliteNames": [], "placeNamePattern": "Local functional names", "permanence": "P"},
  "pressures": [{
    "id": "fixture-pressure-1",
    "fields": {"name": "Reading Room Roster", "force": "Volunteer availability changes with work schedules.", "scope": "Reading room opening hours", "clock": "Recurring weekly scheduling; no initial countdown established"},
    "keys": ["Reading Room Roster"], "permanence": "C", "locked": false
  }],
  "additionalLore": [{
    "id": "fixture-routine-1",
    "fields": {"categoryId": "custom_reading_routines", "categoryLabel": "Reading Routines", "name": "Saturday Book Exchange", "content": "Residents place borrowed books on the return shelf before the weekly exchange."},
    "keys": ["Saturday Book Exchange"], "permanence": "C", "locked": false
  }]
}
```

Mutation matrix: change aesthetic to `[]`; change naming.commonNames to a string; delete history[0].fields.event; make additionalLore[0].fields an array; replace keys with `[42]`; duplicate an entry ID; rename history to History; add an unowned npcs section; wrap in one-object array; wrap in two-object array. Each expected rejection/normalization must be asserted independently. Successful preparation preserves creative field strings exactly.

Run:

```powershell
bun test tests/generation
bun test tests/model/gateway.test.ts
bun test tests/projectGraph
bun test
bun run typecheck
bun run build
git diff --check
```

Record actual result counts and errors. If build fails from sandbox filesystem access, rerun with appropriate approval; do not change bundler/TypeScript to hide the environment issue. No live model success claim without a real observed run. No speed percentage promised by this slice.

## 9. Done means

- Schema reaches every Forge provider mode, and the same schema validates the response locally.
- Every six-bundle schema and original checkpoint shape is retained.
- Null/array/nested-shape failures receive bounded actionable handling across both transports.
- Rejected output cannot become accepted UI/document/checkpoint state.
- Combined commits are atomic.
- Refined default Forge prompts are actually used; no conflicting old suffix remains.
- Existing four-bundle checkpoints resume without regeneration.
- Full verification passes; docs/version reflect only shipped scope.

R1 does NOT mean smaller jobs, Prompt Studio, perfect creative fidelity, all archetypes or full Lumiverse embedding are finished. Proceed to R2 using its explicit contracts only after this gate. The final report must name implemented tasks and outstanding tasks separately.

# Provider Profiles and Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize Lore Bible's generation contracts and persistence, add secure Gemini/OpenRouter/NanoGPT connection profiles with the requested models, repair exports, and provide a Windows desktop launcher.

**Architecture:** Generation routes call a provider-neutral `ModelGateway`; adapters translate the canonical request into Gemini or OpenAI-compatible requests. Profile metadata and DPAPI-encrypted credentials live in `%LOCALAPPDATA%\LoreBible`, while saved projects contain only versioned workflow state and non-secret generation provenance.

**Tech Stack:** Bun 1.3.14, TypeScript, React 19, Express 4, `@google/genai`, native `fetch`, Windows PowerShell/.NET DPAPI, `bun:test`, Vite, esbuild.

**Spec:** `docs/superpowers/specs/2026-09-06-provider-profiles-and-stabilization-design.md`

## Global Constraints

- Preserve the nine requested model IDs exactly as written in the specification.
- Never place a complete API key in browser storage, API responses, logs, saved projects, exports, build output, command-line arguments, or shortcut metadata.
- Store persistent secrets only as Windows DPAPI `CurrentUser` ciphertext under `%LOCALAPPDATA%\LoreBible\connections.v1.json`.
- Never silently switch connection profiles or model IDs.
- Offline deterministic content is opt-in and visibly attributed; structural repair must not invent lore.
- Existing Vault data must be copied to a recovery key before migration and must not be destroyed on parse failure.
- Use tests first for every production behavior change and observe the intended failure before implementation.
- The supplied directory has no Git metadata. Do not initialize a repository or claim commits; record verification at each task boundary instead.
- Do not use real user API keys in automated tests.

---

## Planned file structure

### Shared contracts and catalog

- Create `src/contracts/generation.ts`: canonical provider, model-selection, request, response, provenance, and error types.
- Create `src/contracts/spark.ts`: canonical SparkDNA validator and legacy conversion.
- Create `src/lib/modelCatalog.ts`: immutable provider/model catalog.
- Modify `src/types.ts`: reference canonical types and add saved-project v2 fields.

### Server provider and credential boundary

- Create `server/model/types.ts`: `ModelAdapter` and `ModelGateway` interfaces.
- Create `server/model/schema.ts`: Google-schema to JSON-schema normalization.
- Create `server/model/geminiAdapter.ts`: direct Gemini implementation.
- Create `server/model/openAiCompatibleAdapter.ts`: OpenRouter/NanoGPT implementation.
- Create `server/model/modelGateway.ts`: exact profile/model dispatch, retries, repair, redaction, and provenance.
- Create `server/secrets/types.ts`: `SecretProtector` and profile-store record types.
- Create `server/secrets/dpapi.ts`: stdin-based Windows DPAPI wrapper.
- Create `server/secrets/profileStore.ts`: atomic encrypted profile persistence.
- Create `server/routes/connections.ts`: profile CRUD, test, and model availability endpoints.
- Modify `server.ts`: register profile routes and replace Gemini-specific generation calls with `ModelGateway` calls.

### Client settings and persistence

- Create `src/services/connectionService.ts`: redacted connection-profile API client.
- Create `src/components/SettingsModal.tsx`: profile and model UI.
- Create `src/lib/projectPersistence.ts`: saved-project v2 migration, recovery, load, and save.
- Modify `src/services/geminiService.ts`: rename conceptually to generation service behavior, accept `ModelSelection`, and enforce terminal SSE events.
- Modify `src/App.tsx`, `src/components/SidebarRail.tsx`, `src/components/SparkStage.tsx`, `src/components/VaultModal.tsx`: wire global settings and versioned project state.

### Export and launcher

- Modify `src/lib/exportGenerators.ts` and `src/components/ExportDrawer.tsx`.
- Remove obsolete export functions from `src/services/geminiService.ts` after coverage exists.
- Create `scripts/Start-LoreBible.ps1` and `scripts/Install-LoreBibleShortcut.ps1`.

### Tests

- Create focused tests under `tests/contracts`, `tests/model`, `tests/secrets`, `tests/routes`, `tests/persistence`, `tests/exports`, and `tests/launcher`.
- Create `docs/superpowers/evidence/bun.lock.v2-original` before regenerating the incompatible lockfile so the exact supplied dependency record remains recoverable.

---

### Task 1: Reproducible Bun baseline and typed test harness

**Files:**
- Modify: `package.json`
- Replace after preserving both a verification hash and exact copy: `bun.lock`
- Create: `docs/superpowers/evidence/bun.lock.v2-original`
- Modify: `tsconfig.json`
- Create: `tests/smoke.test.ts`

**Interfaces:**
- Produces: `bun test`, `bun run typecheck`, and `bun run build` as repeatable verification commands.
- Produces: React and React DOM JSX types for all later UI work.

- [ ] **Step 1: Record the original lockfile hash and prove the frozen install failure**

Run:

```powershell
Get-FileHash -Algorithm SHA256 .\bun.lock
bun install --frozen-lockfile
```

Expected: the hash is recorded in the task log and Bun 1.3.14 reports `UnknownLockfileVersion` for lockfile version 2.

- [ ] **Step 2: Add a failing smoke test for the planned model catalog module**

Create `tests/smoke.test.ts`:

```ts
import { expect, test } from "bun:test";
import { CURATED_MODELS } from "../src/lib/modelCatalog";

test("test harness loads application TypeScript", () => {
  expect(CURATED_MODELS.length).toBeGreaterThan(0);
});
```

- [ ] **Step 3: Run the test and observe the intended RED state**

Run: `bun test tests/smoke.test.ts`

Expected: FAIL because `src/lib/modelCatalog.ts` does not exist.

- [ ] **Step 4: Pin Bun and add the missing type packages and scripts**

Update `package.json` to:

```json
{
  "name": "lore-bible",
  "version": "0.3.0",
  "packageManager": "bun@1.3.14",
  "scripts": {
    "dev": "tsx server.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "preview": "vite preview",
    "clean": "bun -e \"import { rmSync } from 'node:fs'; for (const p of ['dist','server.js']) rmSync(p,{recursive:true,force:true})\""
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

Merge these fields into the existing manifest, preserve all other dependencies, and remove the duplicate Vite entry from `dependencies` while retaining it in `devDependencies`.

- [ ] **Step 5: Regenerate a Bun 1.3.14-readable lockfile without deleting evidence**

Copy the original lockfile byte-for-byte to `docs/superpowers/evidence/bun.lock.v2-original`, verify both files have the same SHA-256 hash, then move only the root `bun.lock` to a temporary path for regeneration. Run:

```powershell
bun install --lockfile-only
bun install --frozen-lockfile
```

Expected: both commands exit 0 and the new `bun.lock` declares the format supported by Bun 1.3.14. Record the new hash and compare resolved direct dependency versions with the prior audit evidence.

- [ ] **Step 6: Add the minimal catalog placeholder to turn the harness GREEN**

Create `src/lib/modelCatalog.ts` with:

```ts
export const CURATED_MODELS = ["baseline"] as const;
```

Run: `bun test tests/smoke.test.ts`

Expected: PASS, 1 test.

- [ ] **Step 7: Establish the typed baseline**

Add `strict: true` to `tsconfig.json`, run `bun run typecheck`, and capture the diagnostics. Keep strict mode enabled only if affected application files can be repaired in this task without hiding errors; otherwise create a strict `tsconfig.providers.json` that includes all newly created provider, persistence, test, and settings files and excludes no file touched by this milestone.

Run: `bun run build`

Expected: build exits 0; the known print-selector and bundle-size warnings are recorded for Task 10.

---

### Task 2: Canonical generation contracts, SparkDNA migration, and model catalog

**Files:**
- Create: `src/contracts/generation.ts`
- Create: `src/contracts/spark.ts`
- Replace: `src/lib/modelCatalog.ts`
- Modify: `src/types.ts`
- Test: `tests/contracts/generation.test.ts`
- Test: `tests/contracts/spark.test.ts`
- Test: `tests/model/modelCatalog.test.ts`

**Interfaces:**
- Produces: `ProviderId`, `ModelSelection`, `GenerationRequest`, `GenerationResponse`, `GenerationProvenance`, `GenerationErrorCode`, `CanonicalSparkDNA`.
- Produces: `parseCanonicalSparkDNA(value: unknown): CanonicalSparkDNA` and `migrateLegacySparkDNA(value: unknown): CanonicalSparkDNA`.
- Produces: `CURATED_MODELS`, `getCatalogForProvider(provider)`, and `findCuratedModel(provider, modelId)`.

- [ ] **Step 1: Write failing model-catalog tests**

```ts
import { describe, expect, test } from "bun:test";
import { CURATED_MODELS, getCatalogForProvider } from "../../src/lib/modelCatalog";

const requested = [
  "deepseek/deepseek-v4-pro-0813:thinking",
  "z-ai/glm-5.3:thinking",
  "z-ai/glm-5.3",
  "deepseek/deepseek-v4-pro-0813",
  "z-ai/glm-5.3-flash",
  "moonshotai/kimi-k2.7-code",
  "qwen/qwen3.8-27b-uncensored:thinking",
  "moonshotai/kimi-k2.6:thinking",
  "meta/muse-spark-1.3-contributor",
] as const;

test("preserves every requested model ID exactly", () => {
  expect(CURATED_MODELS.map((model) => model.id)).toEqual(requested);
});

test("offers the curated catalog for OpenRouter and NanoGPT", () => {
  expect(getCatalogForProvider("openrouter").map((m) => m.id)).toEqual(requested);
  expect(getCatalogForProvider("nanogpt").map((m) => m.id)).toEqual(requested);
});
```

Run: `bun test tests/model/modelCatalog.test.ts`

Expected: FAIL because the placeholder is not a typed catalog and has no provider helpers.

- [ ] **Step 2: Implement the immutable catalog**

Use explicit entries shaped as:

```ts
export interface CuratedModel {
  id: string;
  label: string;
  reasoning: "required" | "optional" | "none";
  providers: readonly ("openrouter" | "nanogpt")[];
}
```

Do not strip or synthesize `:thinking` suffixes.

- [ ] **Step 3: Write failing canonical contract tests**

Test a complete canonical SparkDNA fixture and an old server fixture containing `corePremise`, `genreArchetype`, `tonalRegisters`, `implicitAssumptions`, `wildcards`, and `openNegotiables`. Assert that canonical parsing rejects the old object while migration maps it deterministically.

Run: `bun test tests/contracts`

Expected: FAIL because the contract modules do not exist.

- [ ] **Step 4: Implement contract types and validators without `any`**

Implement `isRecord`, string-array validation, tone-envelope validation, error-path reporting, and legacy mapping. Map:

```text
corePremise          -> premisePromise
genreArchetype       -> genreSignals[0]
tonalRegisters       -> toneEnvelope.descriptors
implicitAssumptions  -> assumptions
wildcards            -> opportunitySpace
openNegotiables      -> openVariables
```

Default only missing containers to empty arrays. Do not invent pressure, authority, stakes, or genre content.

- [ ] **Step 5: Replace duplicated settings types**

Update `src/types.ts` and `src/services/geminiService.ts` to import the canonical generation types. Remove `Standard`, lower-case divergence values, `authorFlavor` strings, and nested `semanticRerollMode` from service-local signatures.

- [ ] **Step 6: Run contracts, typecheck, and build**

Run:

```powershell
bun test tests/contracts tests/model
bun run typecheck
bun run build
```

Expected: all new tests pass and build exits 0.

---

### Task 3: DPAPI secret protection and atomic profile storage

**Files:**
- Create: `server/secrets/types.ts`
- Create: `server/secrets/dpapi.ts`
- Create: `server/secrets/profileStore.ts`
- Test: `tests/secrets/dpapi.test.ts`
- Test: `tests/secrets/profileStore.test.ts`

**Interfaces:**
- Produces: `SecretProtector.protect(plaintext): Promise<string>` and `unprotect(ciphertext): Promise<string>`.
- Produces: `ProfileStore.list()`, `getMetadata(id)`, `getSecret(id)`, `upsert(input)`, and `delete(id)`.
- Consumes: `%LOCALAPPDATA%` only through an injected path resolver.

- [ ] **Step 1: Read the test-quality rules before authoring tests**

Read `superpowers/test-driven-development/writing-good-tests.md` completely and apply its naming and real-behavior rules.

- [ ] **Step 2: Write failing DPAPI and redaction tests**

```ts
test("DPAPI round-trips a secret for the current Windows user", async () => {
  const protector = createWindowsDpapiProtector();
  const cipher = await protector.protect("sk-test-never-log");
  expect(cipher).not.toContain("sk-test-never-log");
  expect(await protector.unprotect(cipher)).toBe("sk-test-never-log");
});

test("profile metadata never serializes encrypted or plaintext keys", async () => {
  const store = createProfileStore(tempPath, inMemoryProtector());
  const profile = await store.upsert({ name: "OpenRouter", provider: "openrouter", apiKey: "sk-secret" });
  expect(JSON.stringify(profile)).not.toContain("sk-secret");
  expect(JSON.stringify(profile)).not.toContain("ciphertext");
});
```

Run: `bun test tests/secrets`

Expected: FAIL because secret modules do not exist.

- [ ] **Step 3: Implement DPAPI without putting plaintext on the command line**

Use `spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedScript])`; pass plaintext through stdin. The PowerShell protection body must call:

```powershell
$plain = [Console]::In.ReadToEnd()
$bytes = [Text.Encoding]::UTF8.GetBytes($plain)
$protected = [Security.Cryptography.ProtectedData]::Protect(
  $bytes,
  $null,
  [Security.Cryptography.DataProtectionScope]::CurrentUser
)
[Convert]::ToBase64String($protected)
```

Unprotect ciphertext through stdin using the inverse call. Capture stdout only as ciphertext/plaintext return data; never log stdin or child output.

- [ ] **Step 4: Implement atomic profile storage**

Persist `ProfileStoreFileV1` to an injected path. Write JSON to `connections.v1.json.tmp`, flush/close it, then rename over `connections.v1.json`. Retain a `.bak` copy of the last valid file before replacement. Validate every loaded record before decrypting.

Key-update semantics:

```ts
apiKey === undefined || apiKey === ""  // retain existing ciphertext
apiKey.trim().length > 0                // replace ciphertext and keyHint
```

- [ ] **Step 5: Add corruption, atomicity, and unsupported-platform tests**

Assert corrupt JSON produces a typed `PROFILE_STORE_CORRUPT` error without overwriting the file. Assert the non-Windows protector refuses persistent storage rather than writing plaintext.

- [ ] **Step 6: Run focused and aggregate verification**

Run: `bun test tests/secrets && bun test`

Expected: all tests pass and test output contains no test key other than literals inside test source.

---

### Task 4: Connection-profile API and live availability checks

**Files:**
- Create: `server/routes/connections.ts`
- Modify: `server.ts`
- Test: `tests/routes/connections.test.ts`

**Interfaces:**
- Produces routes: `GET /api/connections`, `POST /api/connections`, `PUT /api/connections/:id`, `DELETE /api/connections/:id`, `POST /api/connections/:id/test`, `GET /api/connections/:id/models`.
- Consumes: `ProfileStore`, injected `fetch`, and curated catalog.

- [ ] **Step 1: Extract an Express app factory for route testing**

Before implementation, write a failing import test for `createApp(dependencies)` that expects an Express application without opening a port. Then extract startup so `startServer()` remains the only listening entry point.

- [ ] **Step 2: Write failing route tests**

Use an ephemeral local port and native `fetch`; do not add Supertest. Cover:

```ts
test("profile APIs return only redacted metadata", async () => { /* POST then GET */ });
test("blank-key update retains the stored secret", async () => { /* PUT then decrypt through store */ });
test("connection test maps 401 to AUTHENTICATION_FAILED", async () => { /* injected fetch */ });
test("model availability keeps unknown curated IDs visible", async () => { /* provider list omits one ID */ });
```

Run: `bun test tests/routes/connections.test.ts`

Expected: FAIL with route-not-found responses.

- [ ] **Step 3: Implement profile CRUD validation**

Accept only `gemini`, `openrouter`, and `nanogpt`. Use fixed base URLs. Enforce non-empty profile names, UUID IDs, body size limits, and redacted error serialization. Expose the environment Gemini profile only when `GEMINI_API_KEY` exists and make mutation attempts return 409.

- [ ] **Step 4: Implement provider model-list requests**

- OpenRouter: `GET https://openrouter.ai/api/v1/models` with bearer authentication.
- NanoGPT: `GET https://nano-gpt.com/api/v1/models` with bearer authentication.
- Gemini: compare direct catalog IDs with the existing configured Gemini list.

Map each curated entry to `available`, `unavailable`, or `unknown`. A network failure returns `error`; it does not mark every model unavailable permanently.

- [ ] **Step 5: Run route, secret, and build checks**

Run:

```powershell
bun test tests/routes tests/secrets
bun run typecheck
bun run build
```

Expected: all pass; inspect response snapshots for absence of `apiKey`, `secretCiphertext`, and authorization headers.

---

### Task 5: Provider adapters and exact model routing

**Files:**
- Create: `server/model/types.ts`
- Create: `server/model/schema.ts`
- Create: `server/model/geminiAdapter.ts`
- Create: `server/model/openAiCompatibleAdapter.ts`
- Create: `server/model/modelGateway.ts`
- Test: `tests/model/schema.test.ts`
- Test: `tests/model/openAiCompatibleAdapter.test.ts`
- Test: `tests/model/modelGateway.test.ts`

**Interfaces:**
- Produces: `ModelAdapter.generate(request, credential, signal): Promise<AdapterResponse>`.
- Produces: `ModelGateway.generate(request): Promise<GenerationResponse>`.
- Consumes: exact `profileId`, exact `modelId`, `ProfileStore`, and injected adapters.

- [ ] **Step 1: Write failing request-builder tests**

Assert OpenRouter and NanoGPT calls contain:

```ts
expect(body.model).toBe("deepseek/deepseek-v4-pro-0813:thinking");
expect(body.messages).toEqual([
  { role: "system", content: "system" },
  { role: "user", content: "user" },
]);
expect(body.response_format.type).toBe("json_schema");
```

Also return a fixture containing both `message.reasoning` and `message.content`; assert only `content` is surfaced.

Run: `bun test tests/model/openAiCompatibleAdapter.test.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 2: Implement schema normalization**

Convert Google enum-style values such as `STRING`, `NUMBER`, `INTEGER`, `BOOLEAN`, `ARRAY`, and `OBJECT` to lowercase JSON Schema values recursively. Preserve `properties`, `required`, `items`, `enum`, and descriptions. Add `additionalProperties: false` to strict object schemas only when every emitted property is required or nullable.

- [ ] **Step 3: Implement the OpenAI-compatible adapter**

Use native `fetch` and fixed provider base URLs. Send bearer auth, JSON content type, explicit timeout signal, system/user messages, exact model ID, and canonical reasoning effort. For OpenRouter include `HTTP-Referer: http://localhost:3000` and `X-OpenRouter-Title: Lore Bible`. For NanoGPT do not add provider-selection or billing headers.

Parse only `choices[0].message.content`. Ignore reasoning fields. Capture safe usage counts and reported model name.

- [ ] **Step 4: Implement the Gemini adapter**

Move the direct `@google/genai` call shape out of `server.ts`. Preserve Gemini thinking-level mapping and response schema support. Select exactly `request.modelId`; do not iterate the old global candidate list.

- [ ] **Step 5: Write and run failing gateway tests**

Cover exact dispatch, no profile fallback, no model fallback, same-model bounded retry, token redaction, timeout, malformed JSON, same-model repair, and provenance.

Expected RED: gateway module missing.

- [ ] **Step 6: Implement the gateway**

Resolve profile metadata and secret, choose the adapter by provider, and call exactly one model ID. Retry only `RATE_LIMITED` or `PROVIDER_UNAVAILABLE`. Repair malformed JSON through the same adapter/profile/model and set `repaired: true`. Return typed canonical errors with recursive credential redaction.

- [ ] **Step 7: Verify provider modules**

Run: `bun test tests/model tests/secrets && bun run typecheck`

Expected: all pass with no external network use.

---

### Task 6: Move every generation route onto ModelGateway and enforce truthful failures

**Files:**
- Modify: `server.ts`
- Modify: `src/services/geminiService.ts`
- Modify: `src/types.ts`
- Test: `tests/routes/generationRouting.test.ts`
- Test: `tests/routes/forgeStream.test.ts`

**Interfaces:**
- Consumes: `ModelSelection` on parse, divergence, single divergence, Forge, Refine, procedural-roll, Test Bench, and voice-check requests.
- Produces: response provenance and typed error envelopes.

- [ ] **Step 1: Write a failing route matrix test**

Build a table covering every model-backed route. For each route, post a fixture with `{ modelSelection: { profileId: "p1", modelId: "z-ai/glm-5.3" } }` and assert the fake gateway receives exactly those IDs.

Run: `bun test tests/routes/generationRouting.test.ts`

Expected: FAIL because routes still call `getAI()` and ignore model selection.

- [ ] **Step 2: Replace `callGeminiGenerate` and `executeGeminiWithRetry` usage**

Introduce `executeStructuredGeneration` as a thin route helper over `ModelGateway`. Preserve stage prompts and schemas during this milestone. Remove global candidate-model failover, model cooldown sets, and Gemini-specific route parameters.

- [ ] **Step 3: Correct Spark parse output**

Change the parse response schema and prompt to canonical SparkDNA. Run the raw result through `parseCanonicalSparkDNA`. Use `migrateLegacySparkDNA` only when loading stored v1 data, never to excuse a new provider response.

- [ ] **Step 4: Remove silent creative fallbacks by default**

For parse, divergence, Forge bundles, entry rerolls, variants, pushes, section regeneration, roll suggestions, and Test Bench turns:

```ts
if (!settings.allowOfflineFallback) throw canonicalError;
```

When explicitly allowed, attach `offlineFallback: true` and an `origin: "offline"` marker. Replace creative sanitation with empty-container structural normalization.

- [ ] **Step 5: Make Forge SSE terminal behavior testable**

Write RED tests for success, provider error, and abrupt gateway rejection. Implement a single terminal-event guard so each stream emits exactly one `done` or `error`. The client rejects a stream that closes without either event.

- [ ] **Step 6: Add abort and timeout behavior**

Every service request gets an `AbortController`. The Forge reader cancels on component disposal/new generation. Provider timeout becomes `REQUEST_TIMEOUT`; cancellation becomes `CLIENT_DISCONNECTED`.

- [ ] **Step 7: Run the complete route suite**

Run:

```powershell
bun test tests/routes tests/model tests/contracts
bun run typecheck
bun run build
```

Expected: all pass; no route-level test contacts a real provider.

---

### Task 7: Settings modal and connection/model selection

**Files:**
- Create: `src/services/connectionService.ts`
- Create: `src/components/SettingsModal.tsx`
- Modify: `src/components/SidebarRail.tsx`
- Modify: `src/App.tsx`
- Modify: `src/services/geminiService.ts`
- Test: `tests/client/connectionService.test.ts`
- Test: `tests/client/settingsState.test.ts`

**Interfaces:**
- Produces client functions `listProfiles`, `saveProfile`, `deleteProfile`, `testProfile`, and `listProfileModels`.
- Produces `SettingsModal` props `{ open, profiles, selection, onSelectionChange, onClose }`.
- Consumes and forwards `ModelSelection` on every generation request.

- [ ] **Step 1: Write failing service tests**

Use injected `fetch` to assert profile save sends a key only when the input is nonblank and that response parsing rejects any object containing `apiKey` or `secretCiphertext`.

Run: `bun test tests/client/connectionService.test.ts`

Expected: FAIL because the service does not exist.

- [ ] **Step 2: Implement the connection service**

Centralize JSON error parsing and canonical error display. Never cache key inputs in module state or localStorage.

- [ ] **Step 3: Write failing settings-state tests**

Extract pure reducers/helpers for selecting a profile/model and loading a project whose profile is missing. Assert generation is blocked until both IDs resolve to a known profile and catalog entry.

- [ ] **Step 4: Implement SettingsModal**

Include provider/name/key fields, masked existing-key status, Add/Edit/Delete/Test controls, model list, availability badges, refresh, active selection, charge warning, and offline-fallback warning. Clear the password input immediately after a successful save and on close.

- [ ] **Step 5: Wire the modal into desktop and mobile navigation**

Add one Settings action to `SidebarRail`; route mobile users to the same modal. Display a compact active provider/model summary near generation controls. Do not duplicate the full settings surface.

- [ ] **Step 6: Propagate selection to all API calls**

Update `App.tsx` and the client service functions so every model-backed request includes `modelSelection`. Refuse locally with `Choose and test a connection profile and model in Settings.` when selection is incomplete.

- [ ] **Step 7: Verify UI compilation and behavior helpers**

Run: `bun test tests/client && bun run typecheck && bun run build`

Expected: all pass. Manually inspect that browser storage contains no key after adding a fake profile against the test server.

---

### Task 8: Versioned project persistence and recovery-safe migration

**Files:**
- Create: `src/lib/projectPersistence.ts`
- Modify: `src/types.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/VaultModal.tsx`
- Test: `tests/persistence/projectPersistence.test.ts`

**Interfaces:**
- Produces: `SavedLoreBibleProjectV2`, `loadVault(storage)`, `saveVault(storage, projects)`, `migrateV1Document(document)`, `saveWorkingDraft`, and `loadWorkingDraft`.
- Consumes: Lore Bible documents, workflow state, settings, selection, and provenance; never secret data.

- [ ] **Step 1: Write failing migration tests**

Fixtures must cover:

- a v1 `LoreBibleDocument`
- legacy SparkDNA
- four `takes` plus `chosenTake`
- a selected historical version
- missing profile reference
- corrupt Vault JSON
- simulated localStorage quota failure

Assert corrupt input is copied verbatim to `lore_bible_recovery_<timestamp>` and the original key is not overwritten during the failed load.

- [ ] **Step 2: Implement pure migration and validation**

Create schema version 2 exactly as specified. Map old documents additively. Do not populate missing creative sections with thematic defaults. Retain document IDs and timestamps.

- [ ] **Step 3: Implement storage operations with explicit success/failure**

`saveVault` returns only after `setItem` succeeds. The UI toast is triggered from that successful result. On quota failure, leave the previous value intact and present an error.

- [ ] **Step 4: Restore complete application state on load**

Update `handleLoadScenario` to restore stage, parse, canon, physics, takes, selected take/version, generation settings, model selection, provenance, and document. If the profile is missing, load everything else and mark generation unconfigured.

- [ ] **Step 5: Activate current-draft recovery**

Use the existing working-draft key with a v2 envelope and debounced saves. Never store credentials or profile metadata beyond IDs.

- [ ] **Step 6: Verify migration and round trip**

Run: `bun test tests/persistence && bun run typecheck && bun run build`

Expected: all fixtures pass and JSON inspection finds none of `apiKey`, `keyHint`, `ciphertext`, or bearer-token patterns.

---

### Task 9: Export correctness and schema tests

**Files:**
- Modify: `src/lib/exportGenerators.ts`
- Modify: `src/components/ExportDrawer.tsx`
- Modify: `src/services/geminiService.ts`
- Create: `tests/fixtures/completeProject.ts`
- Test: `tests/exports/markdown.test.ts`
- Test: `tests/exports/characterCardV3.test.ts`
- Test: `tests/exports/charx.test.ts`

**Interfaces:**
- Produces one active implementation for Markdown, V2 card, V3 card, CHARX, lorebook, full JSON, and brief exports.

- [ ] **Step 1: Write failing Markdown duplication test**

```ts
test("Markdown contains Location Seeds exactly once", () => {
  const markdown = generateMarkdownExport(completeDocumentFixture());
  expect(markdown.match(/### LOCATION SEEDS/g)).toHaveLength(1);
});
```

Run: `bun test tests/exports/markdown.test.ts`

Expected: FAIL because the heading appears twice.

- [ ] **Step 2: Write failing Character Card V3 tests**

Assert the card contains:

```ts
expect(card.data.extensions).toEqual({});
expect(card.data.group_only_greetings).toEqual([]);
expect(card.data.character_book.extensions).toEqual({});
for (const entry of card.data.character_book.entries) {
  expect(entry.extensions).toEqual({});
}
```

Expected: FAIL on each currently missing required field.

- [ ] **Step 3: Implement minimal export repairs**

Remove the duplicate location block, add required V3 fields, stop reading undeclared opening properties through `any`, and prevent status text from becoming an implicit system prompt. Rename “Complete Markdown” to a truthful label unless all document sections are included.

- [ ] **Step 4: Add CHARX archive assertions**

Generate the ZIP in memory and assert root `card.json` parses to the same validated V3 card. Assert neither profile IDs nor connection metadata appear anywhere in archive text.

- [ ] **Step 5: Remove inactive duplicate exporters**

Delete only `exportToMarkdown` and `exportToSillyTavern` from `src/services/geminiService.ts` after active exporter tests pass and confirm no imports reference them.

- [ ] **Step 6: Verify exports and full build**

Run: `bun test tests/exports && bun run typecheck && bun run build`

Expected: all pass.

---

### Task 10: Production startup, Windows launcher, and desktop shortcut

**Files:**
- Modify: `server.ts`
- Modify: `package.json`
- Modify: `src/index.css`
- Create: `scripts/Start-LoreBible.ps1`
- Create: `scripts/Install-LoreBibleShortcut.ps1`
- Test: `tests/launcher/launcherStatic.test.ts`

**Interfaces:**
- Produces idempotent local startup and shortcut installation scripts.
- Consumes: repository location and `http://localhost:3000/api/health`.

- [ ] **Step 1: Write failing static launcher tests**

Read both planned scripts as text and assert:

- no API-key or provider environment variables appear
- path resolution uses `$PSScriptRoot`
- startup checks `/api/health`
- startup has a bounded timeout
- shortcut target uses the launcher path
- shortcut arguments contain no credentials

Run: `bun test tests/launcher/launcherStatic.test.ts`

Expected: FAIL because scripts do not exist.

- [ ] **Step 2: Make production startup explicit**

Change the start script to set production behavior portably through a small Bun/Node launcher or make server startup select static serving based on the existence of `dist/index.html`, not an externally missing environment variable. Keep `dev` explicitly in Vite middleware mode.

- [ ] **Step 3: Implement `Start-LoreBible.ps1`**

Use `$PSScriptRoot` to resolve the project, check an existing health endpoint first, build only when `dist` is absent or older than source, start the server hidden, poll health for at most 30 seconds, then invoke the default browser. Write startup errors to a local non-secret log under `%LOCALAPPDATA%\LoreBible\logs`.

- [ ] **Step 4: Implement `Install-LoreBibleShortcut.ps1`**

Resolve `[Environment]::GetFolderPath('Desktop')`, create or replace exactly `Lore Bible.lnk` through `WScript.Shell`, target `powershell.exe`, and pass only `-NoProfile -ExecutionPolicy Bypass -File <launcher path>`. Set working directory to the repository and use a local icon only if one exists.

- [ ] **Step 5: Correct the print CSS selector and verify production build**

Replace the invalid escaped class selector with an attribute-safe or valid class selector covered by the print rule. Run `bun run build` and confirm that warning is absent. Record the remaining bundle-size warning separately.

- [ ] **Step 6: Install the shortcut with explicit filesystem escalation**

Run `scripts/Install-LoreBibleShortcut.ps1` outside the workspace sandbox after confirming the exact resolved Desktop path. Then inspect the created `.lnk` target, arguments, working directory, and icon through `WScript.Shell.CreateShortcut` without launching it.

- [ ] **Step 7: Exercise the launcher**

Stop only the Lore Bible process identified by its exact executable/working path, invoke the shortcut, wait for health, confirm one listener on port 3000, and verify the browser target is `http://localhost:3000`. Do not enter an API key during this test.

---

### Task 11: End-to-end acceptance and secret-leak audit

**Files:**
- Modify only files required to repair failures exposed by this task.
- Verify all files created or modified by Tasks 1-10.

**Interfaces:**
- Consumes the entire milestone.
- Produces fresh completion evidence.

- [ ] **Step 1: Run the full automated suite**

Run:

```powershell
bun install --frozen-lockfile
bun test
bun run typecheck
bun run build
```

Expected: all commands exit 0, with zero test failures and no new compiler/build errors.

- [ ] **Step 2: Run a no-key server acceptance test**

Start production without provider keys. Verify health, list connections, create a fake-key profile, confirm it is redacted, and verify generation returns a typed authentication/provider error rather than deterministic content. Delete the fake profile afterward.

- [ ] **Step 3: Scan for secret leakage**

Search `dist`, saved-project fixtures, exported fixtures, logs, browser-storage dumps, API-response captures, and shortcut metadata for the exact generated test key and its bearer-header form; both must be absent. Source may legitimately name input-only fields such as `apiKey`, and the encrypted profile-store source/file may name `secretCiphertext`, so separately verify through serialization tests that neither field crosses a redacted API or project/export boundary.

- [ ] **Step 4: Verify saved-project round trip**

Create a fixture project with four takes and histories, save, reload, and assert stage, settings, selected profile/model IDs, active take/version, document, and provenance match. Assert no secret material exists.

- [ ] **Step 5: Verify desktop launch one final time**

Invoke `Lore Bible.lnk`, confirm health and one server instance, then close only the verified Lore Bible process. Leave the shortcut installed.

- [ ] **Step 6: Report validation boundaries accurately**

State separately:

- automated test results
- build/typecheck results
- local no-key runtime results
- DPAPI round-trip result
- shortcut inspection and launch result
- whether the user has configured real OpenRouter/NanoGPT keys
- which requested models were live-validated against each user account
- any provider behavior that remains untested because it would require credentials or spend credits

# Lore Bible Provider Profiles and Stabilization Design

**Date:** 2026-09-06
**Status:** Approved in chat; awaiting written-spec review
**Scope:** First implementation milestone covering P0/P1 stabilization, persistent provider profiles, the requested model catalog, saved-project integrity, export correctness, and a Windows desktop launcher.

## 1. Goals

This milestone will make Lore Bible a dependable local application after its move from Google AI Studio. A user will be able to configure Gemini, OpenRouter, or NanoGPT, save API credentials without re-entering them, select an explicit model, test that connection, generate through the existing workflow, save and restore the complete working state, and launch the application from a desktop shortcut.

The milestone also resolves the audit defects that would undermine provider work: mismatched SparkDNA and settings contracts, permissive typing, silent content fallbacks, incomplete SSE termination, non-versioned persistence, and invalid Character Card V3 output.

## 2. Non-goals

- No cloud account, synchronization service, shared-user server, or remote deployment configuration.
- No automatic purchasing, balance management, or provider billing controls.
- No silent failover between connection profiles or between user-selected models.
- No dynamic installation of provider SDKs when standards-based `fetch` is sufficient.
- No P2-P5 prompt-neutrality overhaul, full server decomposition, broad UI redesign, or corpus-wide creative evaluation in this milestone.
- No exposure or display of model reasoning traces. Lore Bible consumes only final answer content.

## 3. Architectural approach

The server will expose one internal generation interface. Three adapters will implement it:

1. **Gemini adapter:** preserves direct `@google/genai` support and structured-output behavior.
2. **OpenRouter adapter:** uses its OpenAI-compatible `/api/v1/chat/completions` and `/api/v1/models` endpoints.
3. **NanoGPT adapter:** uses its OpenAI-compatible `/api/v1/chat/completions` and `/api/v1/models` endpoints, including exact model suffixes such as `:thinking`.

Application generation services will depend on the internal interface rather than on `GoogleGenAI`. Provider adapters will translate system instructions, user prompts, JSON schemas, reasoning effort, errors, and usage metadata into a canonical response.

The active connection profile and model are explicit request context. A provider may perform its own documented internal routing, but Lore Bible will not substitute another configured profile or model. Errors identify the requested provider and model without including credentials.

## 4. Connection profiles

### 4.1 Profile data

A connection profile contains:

```ts
type ProviderId = "gemini" | "openrouter" | "nanogpt";

interface ConnectionProfileMetadata {
  id: string;
  name: string;
  provider: ProviderId;
  baseUrl: string;
  keyHint: string | null;
  hasSecret: boolean;
  createdAt: string;
  updatedAt: string;
  lastTestedAt: string | null;
  lastTestStatus: "untested" | "available" | "unavailable" | "error";
}
```

The persisted server record additionally holds an encrypted API-key payload. The API never serializes that payload to the browser.

Provider base URLs default to:

- Gemini: the direct Google SDK default; no editable URL is needed initially.
- OpenRouter: `https://openrouter.ai/api/v1`.
- NanoGPT: `https://nano-gpt.com/api/v1`.

The initial UI does not accept arbitrary custom endpoints. That avoids turning this milestone into a generic untrusted proxy.

### 4.2 Secret storage

Persistent keys are encrypted using Windows Data Protection API with `CurrentUser` scope. Ciphertext and profile metadata are stored in:

```text
%LOCALAPPDATA%\LoreBible\connections.v1.json
```

Properties of this design:

- Ciphertext can be decrypted only under the same Windows account on the same user profile.
- Plaintext keys exist only transiently in the local server process and password input element.
- API responses return only `hasSecret` and a non-sensitive key hint.
- Input fields are password controls with reveal-on-hold or explicit temporary reveal; an existing secret is never rehydrated into the input.
- Saving a profile with a blank key retains the current encrypted key. A nonblank key replaces it.
- Deleting a profile deletes its encrypted secret after checking whether saved application settings reference it.
- Logs, model provenance, saved projects, exports, errors, health responses, launcher arguments, and browser storage never contain keys.
- Writes use a temporary file followed by atomic replacement. The server retains the last valid file if serialization or replacement fails.
- On unsupported operating systems, persistent-key saving is disabled and the UI explains that session-only credentials are required. There is no plaintext fallback.

The secret store is isolated behind an interface so tests use an in-memory implementation and never invoke real DPAPI.

### 4.3 Legacy Gemini environment profile

If `GEMINI_API_KEY` is present, the server exposes a read-only `Environment Gemini` profile. Its key cannot be viewed, edited, or exported through the UI. Users may create a separate persistent Gemini profile if they want UI-managed credentials.

## 5. Model catalog

The curated cross-provider catalog includes these exact IDs:

1. `deepseek/deepseek-v4-pro-0813:thinking`
2. `z-ai/glm-5.3:thinking`
3. `z-ai/glm-5.3`
4. `deepseek/deepseek-v4-pro-0813`
5. `z-ai/glm-5.3-flash`
6. `moonshotai/kimi-k2.7-code`
7. `qwen/qwen3.8-27b-uncensored:thinking`
8. `moonshotai/kimi-k2.6:thinking`
9. `meta/muse-spark-1.3-contributor`

The catalog preserves exact IDs instead of rewriting suffixes. Each profile test fetches that provider's live model catalog and records availability separately. An unknown or unavailable curated model remains visible with an unavailable badge; it is not removed and is not silently mapped to a similar model.

Direct Gemini retains its existing Gemini model list. Provider/model selection is stored as a pair because availability can differ between OpenRouter and NanoGPT.

## 6. Provider request contract

```ts
interface GenerationRequest {
  profileId: string;
  modelId: string;
  systemInstruction: string;
  userPrompt: string;
  responseSchema?: JsonSchema;
  reasoningEffort: "low" | "medium" | "high";
  stageName: string;
  timeoutMs: number;
}

interface GenerationResponse {
  text: string;
  parsed?: unknown;
  provenance: {
    provider: ProviderId;
    profileId: string;
    modelRequested: string;
    modelReported: string | null;
    repaired: boolean;
    offlineFallback: boolean;
    usage?: { inputTokens?: number; outputTokens?: number };
  };
}
```

For OpenRouter and NanoGPT, the adapter sends system and user messages and requests `response_format: { type: "json_schema" }` when the selected model advertises structured-output support. If it does not, the adapter uses JSON-object mode where available and validates locally. Failure to meet the canonical schema is an error after the bounded repair attempt; it does not trigger another model.

`:thinking` model IDs are transmitted unchanged. Returned reasoning fields are ignored. Only `choices[0].message.content` is eligible for parsing and document insertion.

Every request uses an abortable timeout. Client disconnects abort in-flight provider requests when practical.

## 7. Errors, retries, and fallback policy

All adapters map provider responses into canonical error codes:

- `PROFILE_NOT_FOUND`
- `CREDENTIAL_MISSING`
- `AUTHENTICATION_FAILED`
- `MODEL_UNAVAILABLE`
- `RATE_LIMITED`
- `QUOTA_EXHAUSTED`
- `PROVIDER_UNAVAILABLE`
- `REQUEST_TIMEOUT`
- `INVALID_STRUCTURED_OUTPUT`
- `CLIENT_DISCONNECTED`
- `INTERNAL_ERROR`

Retries are bounded to transient rate-limit or provider-unavailable responses. Retries stay on the selected profile and selected model. Error messages never claim failover unless the provider itself reports internal routing.

Offline deterministic generation is disabled by default. If the user explicitly enables offline fallback, every fallback result is labeled in provenance and in the UI. Structural sanitation may add missing empty containers or reject malformed output, but it may not invent lore.

SSE Forge always terminates with exactly one `done` or `error` event. A closed stream without either event is a client-visible error.

## 8. Canonical contracts and typing

The TypeScript SparkDNA definition becomes the sole canonical shape. Server parse prompts, response schemas, deterministic fixtures, client service signatures, and persistence migrations all use that shape.

Generation settings use only the canonical values already defined in `src/types.ts`. Provider selection adds:

```ts
interface ModelSelection {
  profileId: string | null;
  modelId: string | null;
}
```

React type declarations are installed and compiler strictness is raised in controlled steps. New provider, persistence, request, and response modules must contain no unbounded `any`. Existing unrelated strict diagnostics may be isolated temporarily, but affected request paths must compile strictly before completion.

## 9. Application settings UI

A global Settings dialog is reachable from the sidebar and mobile action surface. It contains:

- Connections list with provider, friendly name, masked key hint, and test status.
- Add/edit/delete profile flow.
- API key password input with explicit save behavior.
- Test Connection action.
- Provider and model selectors.
- Availability badges and a refresh action.
- Clear explanation that model charges are made by the selected provider.
- Visible warning when offline fallback is enabled.

The active provider/model is summarized in the main workflow without duplicating the whole settings interface. Generation is blocked with a useful message when no valid selection is configured.

## 10. Saved-project schema and migration

Vault persistence moves to a versioned envelope:

```ts
interface SavedLoreBibleProjectV2 {
  schemaVersion: 2;
  document: LoreBibleDocument;
  workflow: {
    stage: string;
    sparkParse: SparkParse | null;
    canon: CanonConfig;
    physics: PhysicsConfig;
    takes: DivergenceTake[];
    selectedTakeId: string | null;
  };
  generation: {
    settings: GenerationSettings;
    modelSelection: ModelSelection;
    provenance: GenerationProvenance[];
  };
  savedAt: string;
}
```

Secrets are never stored in projects. A saved project references a profile ID and model ID. If that profile no longer exists, the project loads normally but generation remains blocked until the user chooses a replacement.

The v1 migration is additive and non-destructive. Original raw storage is copied to a timestamped recovery key before migration. Corrupt JSON is quarantined for recovery rather than overwritten with an empty array.

## 11. Export stabilization

- Remove duplicate Location Seeds from Markdown.
- Make export labels accurately describe included sections.
- Add required Character Card V3 `extensions` and `group_only_greetings` fields.
- Add required Character Book and entry `extensions` fields.
- Remove the inactive duplicate exporters from the Gemini service after golden tests cover the active implementation.
- Ensure exports contain provider/model provenance only when the user explicitly chooses to include it; never include profile IDs or secret hints by default.

## 12. Windows launcher and desktop shortcut

The repository gains a PowerShell launcher that:

1. Resolves the application directory from the script location.
2. Verifies Bun is available.
3. Starts Lore Bible with an explicit production/development launch command appropriate to the installed artifacts.
4. Reuses an already-running healthy server instead of starting a duplicate.
5. Waits for `/api/health` with a bounded timeout.
6. Opens `http://localhost:3000` in the default browser.
7. Displays a useful error if startup fails.

A Windows `.lnk` shortcut named `Lore Bible` is created on the current user's Desktop. It invokes the launcher with a hidden or minimized shell and uses a repository asset as its icon if a suitable icon exists. The shortcut contains no keys or provider information.

Moving or renaming the repository invalidates the shortcut; rerunning the shortcut-creation script updates it safely.

## 13. Test strategy

Tests use `bun:test` and follow red-green-refactor development.

### Unit tests

- Model catalog preserves all nine exact IDs.
- Secret-store API never returns plaintext.
- DPAPI wrapper round-trips a generated test secret under the current Windows user.
- Blank profile edits retain the existing secret; replacement updates it.
- OpenRouter and NanoGPT request builders preserve model IDs and omit reasoning from parsed content.
- Canonical provider errors redact bearer tokens.
- SparkDNA and GenerationSettings validators accept canonical fixtures and reject legacy mismatches.
- Markdown and Character Card V3 golden/schema tests.
- V1-to-V2 project migration and corrupt-storage recovery.

### Integration tests

- Connection CRUD routes use an in-memory secret store.
- Connection tests report authenticated, unauthorized, and unavailable-model states.
- Generation uses exactly the selected profile/model.
- No cross-profile or cross-model failover occurs.
- Structured output repair remains on the same provider/model.
- No-key and provider-failure requests produce errors unless offline fallback is explicitly enabled.
- Forge streams exactly one terminal event.

### Manual acceptance tests

- Add and persist one OpenRouter profile and one NanoGPT profile.
- Restart Lore Bible and confirm both keys remain configured without being displayed.
- Validate available requested models using the user's real accounts; do not spend generation credits without explicit test action.
- Generate a small scenario with each configured provider.
- Save, restart, load, and continue the scenario.
- Generate and inspect all export formats.
- Launch from the desktop shortcut with no terminal interaction.

## 14. Implementation sequence

1. Pin and verify the Bun toolchain; add the test harness and React typings.
2. Establish canonical contracts and runtime validation.
3. Introduce the model-provider interface and adapters behind existing generation behavior.
4. Implement DPAPI secret storage and profile APIs.
5. Add settings/profile/model UI and explicit selection propagation.
6. Correct error, retry, fallback, timeout, and SSE behavior.
7. Introduce saved-project v2 with recovery-safe migration.
8. Repair and validate exports.
9. Add and verify the Windows launcher and create the desktop shortcut.
10. Run complete automated and manual no-secret verification; leave real-key generation tests for the user's configured profiles.

## 15. Acceptance criteria

- Frozen dependency installation succeeds under the declared Bun version.
- The provider path and affected UI compile with React typings and strict contracts.
- Gemini, OpenRouter, and NanoGPT profiles can be selected explicitly.
- All nine requested IDs are present exactly as supplied.
- Persistent keys survive restart and cannot be retrieved through application APIs, browser storage, logs, exports, projects, or launcher arguments.
- Provider/model availability is visible and never silently substituted.
- Generation failures are visible unless the user explicitly enabled labeled offline fallback.
- Saved projects round-trip workflow state, settings, takes, versions, selection, and non-secret provenance.
- Active Markdown and Character Card V3/CHARX exports pass automated structural tests.
- The desktop shortcut starts or reuses Lore Bible and opens it in the default browser.
- No real API key is committed, printed during tests, or embedded in build output.

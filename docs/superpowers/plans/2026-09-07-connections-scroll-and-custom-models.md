# Connections Scroll and Custom Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Connections modal fully scrollable and allow profile-scoped custom model IDs to be saved, restored, selected, and removed.

**Architecture:** Extend the existing version-1 profile records backward-compatibly with `customModelIds`, merge custom entries with the curated catalog in the connection route, and keep validation in the profile store so every caller shares the same rules. Update the React modal to use a real flex scroll boundary and a small custom-model editor.

**Tech Stack:** TypeScript 5.8, React 19, Express 4, Tailwind CSS 4, Bun test.

**Spec:** `docs/superpowers/specs/2026-09-07-generation-progress-cancellation-reasoning-and-models-design.md`

## Global Constraints

- API keys remain protected by Windows DPAPI and never appear in profile metadata, browser storage, progress events, or logs.
- Custom model IDs are scoped to one connection profile and persisted as ordinary non-secret metadata.
- Empty IDs, control characters, duplicates, and unreasonably long IDs are rejected; provider punctuation such as `/`, `:`, `.`, `-`, and `_` remains valid.
- Existing profile files without `customModelIds` load as an empty list without destructive migration.
- A selected custom model cannot be removed until another model is selected.
- No dependency additions are required.

## File Structure

- Modify `server/secrets/types.ts`: add custom-model metadata/input types.
- Modify `server/secrets/profileStore.ts`: normalize old records and validate/persist custom IDs.
- Modify `server/routes/connections.ts`: accept custom IDs and merge them into model responses.
- Modify `server/model/gateway.ts`: authorize profile-owned custom IDs as well as curated IDs.
- Modify `src/services/connectionsService.ts`: carry custom IDs through the client contract.
- Modify `src/components/SettingsModal.tsx`: fix scroll ownership and add custom-model controls.
- Modify `tests/secrets/profileStore.test.ts`: profile migration and validation tests.
- Modify `tests/routes/connections.test.ts`: request/response and merged-catalog tests.
- Modify `tests/model/gateway.test.ts`: profile-owned custom-model authorization test.
- Modify `tests/client/connectionService.test.ts`: request serialization test.
- Modify `tests/components/settingsModal.test.tsx`: structural UI regression test.

---

### Task 1: Persist validated profile-scoped custom model IDs

**Files:**
- Modify: `server/secrets/types.ts`
- Modify: `server/secrets/profileStore.ts`
- Test: `tests/secrets/profileStore.test.ts`

**Interfaces:**
- Produces: `ProfileMetadata.customModelIds: string[]`
- Produces: `ProfileInput.customModelIds?: string[]`
- Produces: `normalizeCustomModelIds(value: unknown): string[]`
- Consumed by: connection routes and model gateway in later tasks.

- [ ] **Step 1: Write failing profile-store tests**

Add tests that create a profile with custom IDs, update it without replacing them, explicitly replace them, reject duplicates/control characters/IDs over 200 characters, and load a hand-written legacy record without `customModelIds` as `[]`.

```ts
test("profile store persists normalized custom model IDs", async () => {
  const store = createProfileStore(path, protector);
  const created = await store.upsert({
    name: "NanoGPT",
    provider: "nanogpt",
    customModelIds: ["  vendor/model:thinking  ", "vendor/other"],
  });
  expect(created.customModelIds).toEqual(["vendor/model:thinking", "vendor/other"]);
  const renamed = await store.upsert({ id: created.id, name: "Nano", provider: "nanogpt" });
  expect(renamed.customModelIds).toEqual(created.customModelIds);
});

test("profile store rejects unsafe custom model IDs", async () => {
  const store = createProfileStore(path, protector);
  await expect(store.upsert({
    name: "Bad",
    provider: "openrouter",
    customModelIds: ["vendor/model", "vendor/model"],
  })).rejects.toMatchObject({ code: "invalid" });
  await expect(store.upsert({
    name: "Bad",
    provider: "openrouter",
    customModelIds: ["vendor/model\nmalformed"],
  })).rejects.toMatchObject({ code: "invalid" });
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `bun test tests/secrets/profileStore.test.ts`

Expected: FAIL because `customModelIds` is absent from the profile types and metadata.

- [ ] **Step 3: Add the metadata and normalization implementation**

Add `customModelIds: string[]` to stored and public profile records and `customModelIds?: string[]` to input. Export one validator/normalizer from `profileStore.ts`:

```ts
const MAX_CUSTOM_MODEL_ID_LENGTH = 200;

export function normalizeCustomModelIds(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new ProfileStoreError("customModelIds must be an array.", "invalid");
  const normalized = value.map((entry) => {
    if (typeof entry !== "string") throw new ProfileStoreError("Every custom model ID must be a string.", "invalid");
    const id = entry.trim();
    if (!id) throw new ProfileStoreError("Custom model IDs cannot be empty.", "invalid");
    if (id.length > MAX_CUSTOM_MODEL_ID_LENGTH) throw new ProfileStoreError("Custom model IDs must be 200 characters or fewer.", "invalid");
    if (/\p{Cc}/u.test(id)) throw new ProfileStoreError("Custom model IDs cannot contain control characters.", "invalid");
    return id;
  });
  if (new Set(normalized).size !== normalized.length) throw new ProfileStoreError("Custom model IDs must be unique.", "invalid");
  return normalized;
}
```

Normalize legacy records during `readStore()` rather than rejecting them. In `upsert`, preserve existing IDs when the field is `undefined`, and replace them only when the caller supplies the field.

- [ ] **Step 4: Run the focused tests and verify success**

Run: `bun test tests/secrets/profileStore.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the profile persistence unit**

```powershell
git add server/secrets/types.ts server/secrets/profileStore.ts tests/secrets/profileStore.test.ts
git commit -m "feat: persist profile custom model ids"
```

If this checkout has no Git metadata, record the checkpoint in the plan and continue without claiming a commit.

---

### Task 2: Expose custom models through connection routes

**Files:**
- Modify: `server/routes/connections.ts`
- Test: `tests/routes/connections.test.ts`

**Interfaces:**
- Consumes: `ProfileInput.customModelIds?: string[]`
- Produces: model responses with `{ id, label, reasoning, available, custom }`
- Consumed by: browser connection service and Settings modal.

- [ ] **Step 1: Write failing route tests**

Add a test that creates a profile with `customModelIds`, updates the list, verifies redacted metadata includes the IDs but no secret fields, and verifies `/models` returns curated and custom entries.

```ts
expect(profile.customModelIds).toEqual(["vendor/private-preview:thinking"]);
expect(models.models).toContainEqual({
  id: "vendor/private-preview:thinking",
  label: "vendor/private-preview:thinking",
  reasoning: "optional",
  available: true,
  custom: true,
});
```

The provider-model fixture should report the custom ID. Add a second assertion that an unreported custom model remains selectable with `available: true`, because providers may omit preview IDs from `/models`.

- [ ] **Step 2: Run the route tests and verify failure**

Run: `bun test tests/routes/connections.test.ts`

Expected: FAIL because routes do not accept or return custom IDs.

- [ ] **Step 3: Pass custom IDs into profile upserts and merge catalogs**

For POST and PUT, include:

```ts
customModelIds: req.body?.customModelIds === undefined ? undefined : req.body.customModelIds,
```

In `/models`, merge without duplicating a curated ID:

```ts
const curatedIds = new Set(catalog.map((model) => model.id));
const custom = profile.customModelIds
  .filter((id) => !curatedIds.has(id))
  .map((id) => ({ id, label: id, reasoning: "optional" as const, available: true, custom: true }));
```

Curated availability still reflects `/models`; custom IDs stay selectable because preview/private provider models are often omitted from listings and generation remains the definitive test.

- [ ] **Step 4: Run route and secret tests**

Run: `bun test tests/routes/connections.test.ts tests/secrets/profileStore.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the route unit**

```powershell
git add server/routes/connections.ts tests/routes/connections.test.ts
git commit -m "feat: expose profile custom models"
```

---

### Task 3: Allow only curated or profile-owned model IDs in the gateway

**Files:**
- Modify: `server/model/gateway.ts`
- Test: `tests/model/gateway.test.ts`

**Interfaces:**
- Consumes: `ProfileMetadata.customModelIds`
- Produces: gateway authorization for `curated || profile.customModelIds.includes(request.modelId)`.

- [ ] **Step 1: Replace the old rejection test with two security tests**

Keep the assertion that arbitrary IDs are rejected before network access, and add a profile-owned custom ID success case:

```ts
const profile = await store.upsert({
  name: "OpenRouter",
  provider: "openrouter",
  apiKey: "sk-secret",
  customModelIds: ["vendor/private-preview"],
});
const response = await gateway.generate({ ...request, profileId: profile.id, modelId: "vendor/private-preview" });
expect(response.provenance.modelRequested).toBe("vendor/private-preview");
```

- [ ] **Step 2: Run the gateway test and verify the custom case fails**

Run: `bun test tests/model/gateway.test.ts`

Expected: FAIL with `MODEL_UNAVAILABLE` for the saved custom model.

- [ ] **Step 3: Update gateway authorization**

Replace the curated-only gate with:

```ts
const curatedModel = findCuratedModel(profile.provider, request.modelId);
const isSavedCustomModel = profile.customModelIds.includes(request.modelId);
if (!curatedModel && !isSavedCustomModel) {
  throw new ModelGatewayError(`Model ${request.modelId} is not configured for this profile.`, "MODEL_UNAVAILABLE", 400, profile.provider);
}
```

Only curated models marked reasoning-required automatically add the existing reasoning request option. A custom model remains provider-defined and receives the normal reasoning effort through later reasoning-support work only when supported.

- [ ] **Step 4: Run gateway tests**

Run: `bun test tests/model/gateway.test.ts`

Expected: PASS for curated, saved custom, and rejected arbitrary model IDs.

- [ ] **Step 5: Commit the gateway authorization unit**

```powershell
git add server/model/gateway.ts tests/model/gateway.test.ts
git commit -m "feat: authorize saved custom models"
```

---

### Task 4: Carry custom models through the client service

**Files:**
- Modify: `src/services/connectionsService.ts`
- Test: `tests/client/connectionService.test.ts`

**Interfaces:**
- Produces: `ConnectionProfile.customModelIds: string[]`
- Produces: `AvailableModel.custom?: boolean`
- Produces: `saveConnection(input)` accepting `customModelIds?: string[]`.

- [ ] **Step 1: Write a failing serialization test**

```ts
await saveConnection({
  id: "p1",
  name: "OpenRouter",
  provider: "openrouter",
  customModelIds: ["vendor/custom"],
});
expect(body?.customModelIds).toEqual(["vendor/custom"]);
```

- [ ] **Step 2: Run the client test and verify failure**

Run: `bun test tests/client/connectionService.test.ts`

Expected: Typecheck/test failure because the input does not accept `customModelIds`.

- [ ] **Step 3: Extend client contracts without changing secret checks**

Add the two fields to interfaces and to the save input. Continue deleting only a blank `apiKey`; do not strip `customModelIds: []`, because an empty array intentionally clears the saved list.

- [ ] **Step 4: Run the client tests**

Run: `bun test tests/client/connectionService.test.ts`

Expected: PASS, including the existing secret-material rejection.

- [ ] **Step 5: Commit the client contract unit**

```powershell
git add src/services/connectionsService.ts tests/client/connectionService.test.ts
git commit -m "feat: send custom model configuration"
```

---

### Task 5: Fix modal scrolling and add the custom-model editor

**Files:**
- Modify: `src/components/SettingsModal.tsx`
- Test: `tests/components/settingsModal.test.tsx`

**Interfaces:**
- Consumes: `ConnectionProfile.customModelIds`, `AvailableModel.custom`, and extended `saveConnection`.
- Produces: accessible `custom-model-id`, `add-custom-model`, and per-model remove controls.

- [ ] **Step 1: Write failing structural render tests**

Mock connection-service responses so server rendering includes a saved profile and custom model. Assert the dialog has the scroll-boundary classes/markers, the custom-model input, the Custom badge, and a remove button with the model ID in its accessible label.

```ts
expect(html).toContain("data-connections-scroll-root=\"true\"");
expect(html).toContain("id=\"custom-model-id\"");
expect(html).toContain("Add model");
```

Because effects do not run in `renderToString`, extract and test pure helpers:

```ts
export function addCustomModelId(current: string[], raw: string): string[];
export function removeCustomModelId(current: string[], id: string, selectedModelId: string | null): string[];
```

Test trimming, duplicate rejection, and selected-model removal rejection.

- [ ] **Step 2: Run the component test and verify failure**

Run: `bun test tests/components/settingsModal.test.tsx`

Expected: FAIL because the helper/UI and scroll marker do not exist.

- [ ] **Step 3: Implement a bounded modal layout**

Use this ownership hierarchy:

```tsx
<section className="w-full max-w-3xl max-h-[92dvh] flex flex-col overflow-hidden ...">
  <header className="shrink-0 ..." />
  <div data-connections-scroll-root="true" className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden md:grid md:grid-cols-[220px_1fr]">
    <aside className="md:min-h-0 md:overflow-y-auto ..." />
    <div className="md:min-h-0 md:overflow-y-auto ..." />
  </div>
</section>
```

Do not retain the current fixed `min-h-[480px]`, which causes short Android viewports to clip.

- [ ] **Step 4: Implement custom-model editing in the draft**

Extend `EMPTY_DRAFT` and profile selection with `customModelIds`. Add a controlled input and Add button. Render custom entries with a **Custom** label and remove action. On removal of the selected ID, show the explicit error `Choose another model before removing the selected custom model.` Save the complete draft list through `saveConnection`.

- [ ] **Step 5: Run component, client, route, store, and gateway tests**

Run: `bun test tests/components/settingsModal.test.tsx tests/client/connectionService.test.ts tests/routes/connections.test.ts tests/secrets/profileStore.test.ts tests/model/gateway.test.ts`

Expected: PASS.

- [ ] **Step 6: Run typecheck**

Run: `bun run typecheck`

Expected: exit code 0.

- [ ] **Step 7: Commit the UI unit**

```powershell
git add src/components/SettingsModal.tsx tests/components/settingsModal.test.tsx
git commit -m "feat: add scrollable custom model settings"
```

---

### Task 6: Verify the Connections workstream end to end

**Files:**
- Verify only; update tests only if verification reveals a reproducible defect.

**Interfaces:**
- Consumes: all outputs of Tasks 1-5.
- Produces: a verified independently usable Connections/custom-model milestone.

- [ ] **Step 1: Run the full automated suite**

Run: `bun test`

Expected: all tests pass.

- [ ] **Step 2: Run static validation and production build**

Run: `bun run typecheck`

Expected: exit code 0.

Run: `bun run build`

Expected: Vite and server bundle complete. If the sandbox blocks parent-path access, rerun with the already approved `npm.cmd run build` equivalent only if the repository supports it; otherwise report the build as environment-blocked rather than passed.

- [ ] **Step 3: Perform browser verification**

At desktop and approximately 412x915 Android viewport sizes:

1. Open Connections.
2. Scroll to the final curated model and bottom actions.
3. Add `vendor/private-preview:thinking`.
4. Save, close, reopen, and verify restoration.
5. Select it and verify it remains selected after reopening.
6. Confirm removal is blocked while selected.
7. Select another model, remove it, save, and verify it stays removed.
8. Confirm a long model ID wraps without horizontal page overflow.

- [ ] **Step 4: Record the checkpoint**

Document exact test counts, typecheck/build outcome, and browser observations before starting the generation-observability plan.

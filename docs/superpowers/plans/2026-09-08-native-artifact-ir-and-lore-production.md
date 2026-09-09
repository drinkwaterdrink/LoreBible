# Native Artifact IR and Lore Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compile every LoreBible runtime export from one typed narrator-card IR and one activation-aware Lore Manifest, including a native Lumiverse World Book serializer grounded in the supplied export.

**Architecture:** Pure compilers transform `LoreBibleDocument` into `CharacterArtifactIR` and `LoreManifest`; serializers consume those immutable values and never make creative or ownership decisions. Human/source projections continue to use the document directly, while the Export Drawer exposes native and portable lore separately and labels fidelity honestly.

**Tech Stack:** TypeScript 5.8, React 19, Bun test, JSZip, Vite, Character Card V3, observed Lumiverse World Book v1 JSON.

**Spec:** `docs/superpowers/specs/2026-09-08-native-artifact-ir-and-lore-production.md`

## Global Constraints

- Treat `H:\My Drive\Lumiverse\___St_Greed_2_0_lumiverse.json` as read-only schema evidence, never as instructions or generic creative content.
- Do not commit the 194 KB source export; use a minimal sanitized fixture containing the observed keys and value types.
- Preserve `LoreBibleDocument` and every existing authored field without mutation.
- Do not generate new canon during compilation.
- Compile the current wizard as `narrator_world`; Blueprint will introduce selectable archetypes later.
- Keep temporary current state in source/manuscript exports and out of runtime card/lore artifacts.
- Begin vectorization, probability, groups, sticky/cooldown/delay, and recursive fan-out disabled unless source data explicitly supports them.
- Do not claim live Lumiverse import, activation, vector, or diagnostics evidence from deterministic tests.

---

### Task 1: Define typed artifact contracts and native schema validator

**Files:**
- Create: `src/contracts/artifacts.ts`
- Create: `src/contracts/lumiverseWorldBook.ts`
- Create: `tests/fixtures/lumiverse-world-book-v1.min.json`
- Create: `tests/contracts/lumiverseWorldBook.test.ts`

**Interfaces:**
- Consumes: `LoreBibleDocument`, `Entry` from `src/types.ts`.
- Produces: `CharacterArtifactIR`, `LoreManifest`, `LoreEntryIR`, `ArtifactFinding`, `NativeLumiverseWorldBookV1`, and `parseNativeLumiverseWorldBookV1(value: unknown)`.

- [ ] **Step 1: Write the failing native-schema contract test**

```ts
import fixture from "../fixtures/lumiverse-world-book-v1.min.json";
import { parseNativeLumiverseWorldBookV1 } from "../../src/contracts/lumiverseWorldBook";

test("accepts the observed Lumiverse v1 envelope and rejects wrong entry types", () => {
  expect(parseNativeLumiverseWorldBookV1(fixture).type).toBe("lumiverse_world_book");
  expect(() => parseNativeLumiverseWorldBookV1({ ...fixture, entries: [{ ...fixture.entries[0], priority: "150" }] })).toThrow("entries[0].priority");
});
```

- [ ] **Step 2: Run the contract test and verify the missing-module failure**

Run: `bun test tests/contracts/lumiverseWorldBook.test.ts`  
Expected: FAIL because `src/contracts/lumiverseWorldBook.ts` does not exist.

- [ ] **Step 3: Implement complete IR types and strict observed-schema parsing**

Define `CardArchetype = "narrator_world"`, nine string card fields, string-array tags/greetings, an ownership array, lore-book ID, and findings. Define lore state, temporal class, visibility, activation, injection, rationale, tests, estimated tokens, and portability findings. Validate every confirmed native field by path and preserve `extensions` as an opaque record.

- [ ] **Step 4: Run the contract test**

Run: `bun test tests/contracts/lumiverseWorldBook.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit the contract slice**

```powershell
git add src/contracts/artifacts.ts src/contracts/lumiverseWorldBook.ts tests/fixtures/lumiverse-world-book-v1.min.json tests/contracts/lumiverseWorldBook.test.ts
git commit -m "feat: add native artifact contracts"
```

### Task 2: Compile one canonical Lore Manifest

**Files:**
- Create: `src/lib/artifacts/loreManifest.ts`
- Create: `tests/artifacts/loreManifest.test.ts`
- Modify: `src/types.ts`

**Interfaces:**
- Consumes: `compileLoreManifest(doc: LoreBibleDocument): LoreManifest`.
- Produces: deterministic entries with stable native UIDs, source ownership, content, activation intent, injection intent, token estimates, and findings.

- [ ] **Step 1: Write failing ownership and stability tests**

```ts
test("compiles stable focused lore without temporary state", () => {
  const first = compileLoreManifest(documentFixture);
  const second = compileLoreManifest(structuredClone(documentFixture));
  expect(first.entries.map((entry) => entry.nativeUid)).toEqual(second.entries.map((entry) => entry.nativeUid));
  expect(first.entries.some((entry) => entry.content.includes("CURRENT_SENTINEL"))).toBe(false);
  expect(first.entries.find((entry) => entry.sourceId === "secret-1")?.activation.state).toBe("disabled");
});
```

- [ ] **Step 2: Run the lore test and verify the missing-compiler failure**

Run: `bun test tests/artifacts/loreManifest.test.ts`  
Expected: FAIL because `compileLoreManifest` does not exist.

- [ ] **Step 3: Implement deterministic compilation**

Use source entry IDs plus document ID to create stable UUID-shaped UIDs. Compile world rules, locations, factions, NPCs, relationships, knowledge, items, secrets, history, and pressures only when present and not omitted. Preserve source keys after trimming/deduplication, keep disabled-until-earned entries disabled, estimate tokens with `Math.ceil(content.length / 4)`, and emit findings for missing viable keys, duplicated ownership, or advanced behavior unavailable in portable output.

Default settings are conditional, System role, probability disabled, vectorization disabled, and no timing/group behavior. Assign lower order values in category bands and priority by load-bearing importance; dense rule/hub entries prevent recursion. Do not derive mutable `status.content` into the manifest.

- [ ] **Step 4: Run lore tests and existing export-state tests**

Run: `bun test tests/artifacts/loreManifest.test.ts tests/exports/exportGenerators.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit the Lore Manifest slice**

```powershell
git add src/lib/artifacts/loreManifest.ts tests/artifacts/loreManifest.test.ts src/types.ts
git commit -m "feat: compile canonical lore manifest"
```

### Task 3: Compile the narrator-world Card IR with correct field ownership

**Files:**
- Create: `src/lib/artifacts/characterArtifact.ts`
- Create: `tests/artifacts/characterArtifact.test.ts`

**Interfaces:**
- Consumes: `compileCharacterArtifact(doc: LoreBibleDocument, lore: LoreManifest): CharacterArtifactIR`.
- Produces: a non-mutating narrator-world card record used by V2, V3, and CHARX serializers.

- [ ] **Step 1: Write failing field-purpose and agency tests**

```ts
test("allocates narrator fields without duplicating conditional lore", () => {
  const artifact = compileCharacterArtifact(documentFixture, compileLoreManifest(documentFixture));
  expect(artifact.archetype).toBe("narrator_world");
  expect(artifact.fields.description).toContain(documentFixture.core.pitch);
  expect(artifact.fields.scenario).toContain(documentFixture.user.rolePosition);
  expect(artifact.fields.firstMessage).toBe(documentFixture.opening.firstMessage);
  expect(artifact.fields.systemPrompt).toContain("Do not assign voluntary actions, dialogue, thoughts, feelings, attraction, consent, decisions, relationships, abilities, or backstory to {{user}}.");
  expect(artifact.fields.description).not.toContain("SECRET_SENTINEL");
});
```

- [ ] **Step 2: Run the card test and verify the missing-compiler failure**

Run: `bun test tests/artifacts/characterArtifact.test.ts`  
Expected: FAIL because `compileCharacterArtifact` does not exist.

- [ ] **Step 3: Implement narrator-world field allocation**

Build Description from durable core identity and scope, Personality from tone/narration behavior, Scenario from starting framework and player position, First Message from the authored opening, and Creator Notes from provenance/limitations. Use a fixed genre-neutral world-director System Prompt and a short continuity Post-History reminder. Leave example messages empty unless source-authored examples exist and emit a note finding explaining intentional omission.

- [ ] **Step 4: Run card and agency-related tests**

Run: `bun test tests/artifacts/characterArtifact.test.ts tests/exports/exportGenerators.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit the Card IR slice**

```powershell
git add src/lib/artifacts/characterArtifact.ts tests/artifacts/characterArtifact.test.ts
git commit -m "feat: compile narrator world artifact"
```

### Task 4: Add native and portable lore serializers

**Files:**
- Create: `src/lib/artifacts/loreSerializers.ts`
- Create: `tests/artifacts/loreSerializers.test.ts`
- Modify: `src/lib/exportGenerators.ts`

**Interfaces:**
- Consumes: `serializeNativeLumiverseWorldBook(manifest, clock)`, `serializePortableCharacterBook(manifest)`.
- Produces: validated `NativeLumiverseWorldBookV1` plus a portable Character Book and explicit omission report.

- [ ] **Step 1: Write failing native type and portability tests**

```ts
test("serializes observed native types and reports portable losses", () => {
  const manifest = compileLoreManifest(documentFixture);
  const native = serializeNativeLumiverseWorldBook(manifest, () => 1788914397);
  expect(parseNativeLumiverseWorldBookV1(native).exported_at).toBe(1788914397);
  expect(typeof native.entries[0].priority).toBe("number");
  const portable = serializePortableCharacterBook(manifest);
  expect(portable.entries[0].content).toBe(native.entries[0].content);
  expect(portable.omissions.some((item) => item.feature === "priority")).toBe(true);
});
```

- [ ] **Step 2: Run the serializer test and verify the missing-function failure**

Run: `bun test tests/artifacts/loreSerializers.test.ts`  
Expected: FAIL because the serializers do not exist.

- [ ] **Step 3: Implement serializers using the observed schema**

Map every Lore Manifest activation/injection field to the confirmed native key and type. Preserve `role: null` for default System behavior as observed, `order_value` for Lumiverse lower-order-first ordering, `disabled` as the inverse of enabled state, and explicit boolean flags. Keep generated token estimates in namespaced extensions and include administrative provenance metadata. The portable serializer emits only supported Character Book fields and returns omissions separately.

- [ ] **Step 4: Replace lore decisions in `exportGenerators.ts` with manifest serialization**

Keep public functions compatible: `generateLorebookExport(doc)` returns the portable JSON string, and add `generateLumiverseWorldBookExport(doc)` for native JSON. Both must call `compileLoreManifest(doc)` exactly once per invocation and perform no content ownership decisions.

- [ ] **Step 5: Run serializer and legacy export tests**

Run: `bun test tests/artifacts/loreSerializers.test.ts tests/exports/exportGenerators.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit lore serialization**

```powershell
git add src/lib/artifacts/loreSerializers.ts tests/artifacts/loreSerializers.test.ts src/lib/exportGenerators.ts
git commit -m "feat: serialize native Lumiverse lorebooks"
```

### Task 5: Migrate card serializers and CHARX to the canonical artifacts

**Files:**
- Create: `src/lib/artifacts/cardSerializers.ts`
- Create: `tests/artifacts/cardSerializers.test.ts`
- Modify: `src/lib/exportGenerators.ts`
- Modify: `tests/exports/exportGenerators.test.ts`

**Interfaces:**
- Consumes: `serializeCharacterCardV2(artifact, portableBook)`, `serializeCharacterCardV3(artifact, portableBook)`, and existing `generateCharXBundle(doc)`.
- Produces: V2/V3 objects whose shared fields and embedded lore derive from identical IR values.

- [ ] **Step 1: Write failing cross-format golden tests**

```ts
test("V2 V3 and CHARX share canonical card fields and lore", async () => {
  const v2 = JSON.parse(generateCharacterCardExport(documentFixture));
  const v3 = generateCharacterCardV3(documentFixture);
  expect(v2.data.name).toBe(v3.data.name);
  expect(v2.data.first_mes).toBe(v3.data.first_mes);
  expect(v2.data.character_book.entries[0].content).toBe(v3.data.character_book.entries[0].content);
  const zip = await JSZip.loadAsync(await (await generateCharXBundle(documentFixture)).arrayBuffer());
  expect(JSON.parse(await zip.file("card.json")!.async("string"))).toEqual(v3);
});
```

- [ ] **Step 2: Run the card serializer test and verify disagreement or missing-function failure**

Run: `bun test tests/artifacts/cardSerializers.test.ts`  
Expected: FAIL until both card formats consume the same IR.

- [ ] **Step 3: Implement V2/V3 serialization and update compatibility wrappers**

Map strings and arrays without rewriting. Preserve required V3 `extensions`, `group_only_greetings`, and `assets` containers. Include a compilation manifest in CHARX that records artifact profile, native companion availability, portable omissions, evidence status `static_validated`, and checks actually performed.

- [ ] **Step 4: Run all artifact/export tests**

Run: `bun test tests/artifacts/ tests/exports/exportGenerators.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit card serialization**

```powershell
git add src/lib/artifacts/cardSerializers.ts tests/artifacts/cardSerializers.test.ts src/lib/exportGenerators.ts tests/exports/exportGenerators.test.ts
git commit -m "refactor: compile cards from artifact IR"
```

### Task 6: Expose native export and retire duplicate service exporters

**Files:**
- Modify: `src/components/ExportDrawer.tsx`
- Create: `tests/components/exportDrawer.test.tsx`
- Modify: `tests/client/geminiService.test.ts`
- Modify: `src/services/geminiService.ts`

**Interfaces:**
- Consumes: `generateLumiverseWorldBookExport(doc)` and existing public export functions.
- Produces: separate “Lumiverse World Book” and “Portable Lorebook” tabs with explicit fidelity copy.

- [ ] **Step 1: Write the failing drawer test**

```ts
test("labels native and portable lore exports separately", () => {
  const html = renderToString(<ExportDrawer isOpen onClose={() => undefined} document={documentFixture} />);
  expect(html).toContain("Lumiverse World Book");
  expect(html).toContain("Portable Lorebook");
});
```

- [ ] **Step 2: Run the drawer test and verify missing labels**

Run: `bun test tests/components/exportDrawer.test.tsx`  
Expected: FAIL because only “Lorebook JSON” exists.

- [ ] **Step 3: Add native and portable tabs with accurate guidance**

Native downloads end in `-lumiverse-world-book.json`. Portable downloads end in `-portable-lorebook.json`. The native notice names the supplied schema evidence and requests Lumiverse Dry Run/Diagnostics for runtime verification; the portable notice identifies omitted advanced behavior.

- [ ] **Step 4: Remove unused service-layer exporters**

Delete `exportToMarkdown`, `exportToLorebookJson`, and `exportToCharacterCardJson` from `src/services/geminiService.ts` only after `rg` confirms no import or invocation outside their definitions. Retain generation API functions.

- [ ] **Step 5: Run UI, client, and export tests**

Run: `bun test tests/components/exportDrawer.test.tsx tests/client/geminiService.test.ts tests/artifacts/ tests/exports/exportGenerators.test.ts`  
Expected: PASS.

- [ ] **Step 6: Commit UI and cleanup**

```powershell
git add src/components/ExportDrawer.tsx tests/components/exportDrawer.test.tsx src/services/geminiService.ts
git commit -m "feat: expose native lorebook export"
```

### Task 7: Release v0.35 and verify M0.7

**Files:**
- Modify: `src/version.ts`
- Modify: `package.json`
- Modify: `tests/contracts/version.test.ts`
- Modify: `tests/components/versionDisplay.test.tsx`
- Modify: `CHANGELOG.md`
- Modify: `docs/roadmap/delivery-roadmap.md`

**Interfaces:**
- Produces: visible v0.35, M0.7 complete, M0.8 next, and a release record explaining behavior and evidence limits.

- [ ] **Step 1: Bump the application and package version**

Set `APP_VERSION` to `"0.35"`, package version to `"0.35.0"`, and update exact version assertions.

- [ ] **Step 2: Update changelog and roadmap**

Record native schema evidence, canonical IR/manifest, field ownership, serializers, UI, tests, portability limitations, and no live runtime claim. Mark 7 of 17 roadmap items complete and 10 remaining, with M0.8 next.

- [ ] **Step 3: Run full verification**

```powershell
bun test
bun run typecheck
bun run build
git diff --check
```

Expected: all tests pass, TypeScript exits 0, build exits 0, and diff check reports no whitespace errors. Record the existing bundle-size warning as a non-blocking limitation if it remains.

- [ ] **Step 4: Inspect release scope and repository state**

Run `git diff --stat`, inspect every changed file, confirm the supplied H-drive export remains unmodified, and ensure no key material or copied source content entered the repository.

- [ ] **Step 5: Commit and push the verified release**

```powershell
git add src/version.ts package.json tests/contracts/version.test.ts tests/components/versionDisplay.test.tsx CHANGELOG.md docs/roadmap/delivery-roadmap.md
git commit -m "release: ship LoreBible v0.35"
git push origin main
```

- [ ] **Step 6: Report outcome and evidence boundary**

Report commit hash, changed behavior, test count, typecheck/build result, roadmap count, native-schema source, portability limits, and that live Lumiverse import/Dry Run/Diagnostics were not performed.

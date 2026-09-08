# Production Studio export-state safety implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This file is a plan; the product changes and tests below have not been applied by writing it.

**Goal:** Stop temporary `status.content` from becoming a runtime System Prompt or constant lore while preserving source content and explicit author instructions.

**Architecture:** Make a narrow change to the active export functions, protected by sentinel tests and actual CHARX archive parsing. Do not introduce the Project Graph, redesign fields, or rewrite serializers in this slice. Later M0.7 consolidates their shared representation.

**Tech Stack:** Existing TypeScript, Bun test runner, JSZip.

**Spec:** [Production Studio blueprint](../../roadmap/production-studio-blueprint.md), sections 1, 5 and 10; [M0.1](../../roadmap/delivery-roadmap.md).

## Global constraints

- Generation is not compilation.
- Never use temporary current state as permanent constant lore.
- Never fall back from an absent System Prompt to `status.content`.
- Preserve saved documents and explicit user-authored fields.
- This is structural export verification, not Lumiverse import certification.
- Do not touch provider credentials or make paid model calls.

## Task 1: Remove synthetic state injection from active runtime exports

**Files:**

- Modify: `src/lib/exportGenerators.ts` — `generateLorebookExport`, `generateCharacterCardV3`.
- Modify/test: `tests/exports/exportGenerators.test.ts` — reuse its existing `doc` fixture.
- Do not change: persistence, manuscript export, provider services, or native module schema.

**Interfaces:**

- Existing `generateLorebookExport(doc): string` returns JSON entries.
- Existing `generateCharacterCardExport(doc): string` builds its embedded entries from that function.
- Existing `generateCharacterCardV3(doc)` returns a card object.
- Existing `generateCharXBundle(doc): Promise<Blob>` packages that V3 object as `card.json`.
- Existing `generateMarkdownExport(doc): string` retains manuscript state.
- Public signatures remain unchanged.

- [ ] **Step 1: Add imports and regression tests.** Extend the existing exporter import to include `generateLorebookExport`, `generateCharacterCardExport`, and `generateCharXBundle`; add `import JSZip from "jszip"`. Append these tests using the existing fixture:

```ts
test("temporary status remains source-only in runtime exports", () => {
  const input = structuredClone(doc);
  const marker = "TEMP_STATE_SENTINEL_9317";
  input.status.content = marker;
  const before = JSON.stringify(input);
  const card = generateCharacterCardV3(input);

  expect(card.data.system_prompt).toBe("");
  expect(JSON.stringify(card.data.character_book)).not.toContain(marker);
  expect(generateLorebookExport(input)).not.toContain(marker);
  expect(generateCharacterCardExport(input)).not.toContain(marker);
  expect(generateMarkdownExport(input)).toContain(marker);
  expect(JSON.stringify(input)).toBe(before);
});

test("explicit runtime instructions and opening survive export", () => {
  const input = structuredClone(doc);
  input.status.content = "TEMP_STATE_SENTINEL_9317";
  input.opening.systemPrompt = "Respect the player's voluntary choices.";
  input.opening.postHistoryInstructions = "Preserve established continuity.";
  input.opening.firstMessage = "The bakery opens for the morning.";
  const card = generateCharacterCardV3(input);

  expect(card.data.system_prompt).toBe(input.opening.systemPrompt);
  expect(card.data.post_history_instructions)
    .toBe(input.opening.postHistoryInstructions);
  expect(card.data.first_mes).toBe(input.opening.firstMessage);
  expect(card.data.character_book.entries.some(
    (entry: { content: string }) => entry.content.includes("The Archive")
  )).toBe(true);
});

test("CHARX card.json excludes synthetic current-state injection", async () => {
  const input = structuredClone(doc);
  input.status.content = "TEMP_STATE_SENTINEL_9317";
  const blob = await generateCharXBundle(input);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const file = zip.file("card.json");
  expect(file).not.toBeNull();
  const card = JSON.parse(await file!.async("string"));

  expect(card.data.system_prompt).toBe("");
  expect(JSON.stringify(card.data.character_book))
    .not.toContain("TEMP_STATE_SENTINEL_9317");
  expect(card.spec).toBe("chara_card_v3");
});
```

- [ ] **Step 2: Reproduce failures.** Run `bun test tests/exports/exportGenerators.test.ts`. The first and archive tests must fail because the current implementation injects the sentinel. Existing tests and explicit-field preservation should still pass. If failure is instead an environment error, fix the test setup before changing product behavior.

- [ ] **Step 3: Apply the minimum product change.** Remove the synthetic status-entry blocks near the beginning of `generateLorebookExport` and `generateCharacterCardV3`. Do not remove arbitrary entries containing similar words. Replace only the V3 fallback expression:

```ts
// Before:
system_prompt: (doc.opening as any)?.systemPrompt || doc.status?.content || "",
// After:
system_prompt: (doc.opening as any)?.systemPrompt || "",
```

Leave the existing legacy field access typing unchanged in this narrow fix; typed Card IR replaces it in M0.7. Keep Markdown/source state intact. Do not move the removed state into another automatically injected field. Document the intentional runtime omission in the commit/release note; full portability UI belongs to M0.7/M6.

- [ ] **Step 4: Verify the targeted tests.** Run `bun test tests/exports/exportGenerators.test.ts`. Inspect archive-test output and all assertions. Add an omitted-status case by setting `input.omittedSections = ["status"]` if the active type supports it; both omitted and non-omitted cases must avoid state injection.

- [ ] **Step 5: Verify repository compatibility.** Run `bun test`, `bun run typecheck`, and `bun run build`. Run `git diff --check` and inspect `git diff -- src/lib/exportGenerators.ts tests/exports/exportGenerators.test.ts`. Only the two injection blocks, fallback expression, imports and tests should change. Any unrelated failing test is reported separately, not silently removed.

- [ ] **Step 6: Commit the bounded fix.** Stage only these two files and commit with `fix: keep temporary state out of runtime exports`. Push only under existing user authorization, without force. Record that no Lumiverse import was performed and that the legacy type workaround and broader exporter fidelity remain separate work.

## Completion boundary

This slice closes the demonstrated synthetic state paths in the active exporter module. It does not prove that all generated lore is temporally classified, that duplicate service exporters are safe, or that native CHARX modules are verified. Those remain M0.3/M0.7 and M1/M6 work. Existing user-authored state stays in the source manuscript; production runtime state requires intentional architecture.

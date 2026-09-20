# Resumable Forge Specialist Jobs Design

**Status:** proposed for user review. **Branch:** `test`. **Baseline:** v0.62 (`d8ada29`).

## Intent

Make LoreBible's Forge a smooth, powerful, reliable, customizable wizard. A large accepted Blueprint must not force one model response to carry dozens of unrelated lore entries, and a malformed provider response must not make the user restart completed work. Preserve authored choices, completed bundles, and model/provider flexibility. Do not substitute mock prose for failed generation.

This spec covers Forge request sizing, validation, retry, progress, and recovery. The requested **Use my original idea** path that skips Divergence is a separate workflow slice after this reliability work; it must retain the raw Spark and its accepted analysis without inventing a Divergence take.

## Evidence and uncertainty

The reported Gemini Flash 3.8 run failed Bundle 5 at least eight times with “Forge bundle response must be an object”; Bundle 3 also sometimes fails. The current code asks Bundle 5 for `history`, `aesthetic`, `naming`, `pressures`, and all supplemental Blueprint lore in a single structured response. The gateway retry helper returns parsed data before `selectForgeBundleSections` checks that top-level shape, so this specific failure bypasses automatic shape retries. The screenshot does not reveal whether the provider returned null, an array, a scalar, or another wrapper. The design must measure and report that shape safely rather than pretending the exact cause is known.

## Approaches considered

1. **Retry the existing giant request.** Smallest change, but eight user retries indicate that repeated calls alone are not an adequate quality or cost strategy.
2. **Split only Bundle 5 in memory.** Reduces one request's size, but a disconnect discards its successful sub-results and Bundle 3 remains vulnerable.
3. **Recommended: resumable specialist jobs inside the existing six logical bundles.** More contract work, but each request can be bounded, independently validated, and recovered without adding a competing artifact authority. This approach also supports later M3.2 scoped regeneration.

## Logical bundles and physical jobs

Keep the six logical Forge bundles, their public section keys, and the existing completed-bundle checkpoint contract. A physical **specialist job** is a smaller request within one logical bundle. Jobs have stable IDs derived from the build fingerprint, bundle index, category/section identity, and ordinal; a retry of the same job keeps that ID but gets a new provider-attempt ID. A completed job stores its validated response and safe provenance under its owning Forge bundle. The accepted top-level checkpoint advances only after every job for that logical bundle has passed validation and the merged bundle passes its coverage gate.

Default small builds may continue using one job per bundle. For Rich/Large/Massive/custom coverage, Bundle 3 separates cast, relationship, and knowledge work; Bundle 5 separates history, aesthetic/naming, pressures, and supplemental lore. Supplemental lore is partitioned by accepted category and bounded target entry count, not placed into one catch-all answer. The planner derives jobs from the accepted Blueprint; a category that is omitted must not get a job. Each job has an explicit output schema, category/entry targets, dependencies, and a maximum requested entry count. Do not merely tell a model to write less while still requiring the same whole-bundle schema.

The exact initial per-request entry ceiling is a policy constant with tests and a rationale, not a permanent creative cap. Splitting changes the number of calls, not the user's total library allowance or promised category coverage. If a single required entry itself exceeds provider limits, report that dependency; do not truncate accepted prose or silently shrink the Blueprint.

## Shape validation and safe normalization

Validate the top-level response, schema-owned keys, and entry structure **inside** the bounded provider-attempt loop. Accept a direct object. A single-element array containing exactly one object with the required keys may be unwrapped, because this changes only the wrapper, not generated content. Do not concatenate multiple objects, treat null as an empty bundle, repair missing content with placeholders, or accept extra content as a substitute for required keys. Unknown top-level metadata may be ignored only under the existing logged policy.

On a malformed result, capture only safe diagnostics: provider/model identity, logical bundle, job ID/label, attempt number, expected keys, returned top-level type, array length if applicable, missing-key names, finish reason when available, and usage. Never log API keys, raw response text, secret prose, or reasoning traces. Retry a bounded number of times with a concise correction that states the required shape; after the limit, stop with a clear retryable error and the already completed jobs intact. Repeated errors should not trigger unlimited automatic spending.

## Atomic merge and coverage

Job results are provisional until the logical bundle is complete. Merge by deterministic job order and explicit section ownership. Array sections append validated entries; singleton sections have one designated owner. Duplicate source entry IDs, mismatched category IDs, missing required sections, or contradictory singleton owners are validation failures, not last-writer-wins. Run the existing Blueprint category and total-minimum coverage audits against the proposed merged document **before** emitting accepted section events or committing the logical bundle.

If a coverage audit finds a precise missing category/count, schedule a bounded gap-repair job for that category. Its output is validated and attached to the same bundle. If still short after the repair limit, report the specific category and count and preserve all completed jobs for the next user retry. Do not silently lower the accepted target, pad entries, or mark an underfilled bundle complete.

## Recovery and compatibility

Extend the current Forge build record with an optional versioned specialist-job ledger. Existing v0.53–v0.62 builds remain loadable. A v0.62 run whose first four bundles are complete and Bundle 5 failed begins at Bundle 5 without regenerating Bundles 1–4; it creates the new job ledger only for the incomplete bundle. A completed legacy bundle remains authoritative and is not split retroactively. On reload, reconcile the ledger against the same input fingerprint and graph revision; complete jobs may be reused, active jobs become retryable interrupted jobs, and stale or user-edited source triggers the existing new-build/review path. Never use a partial job as an accepted manuscript section.

Continuous mode automatically runs remaining jobs and bundles. One-bundle-at-a-time mode stops after one **logical bundle**, not one internal job. Single-provider-request mode keeps its existing behavior only when the accepted plan fits one safe request; for a larger plan, the app explains before spending tokens that the selected mode conflicts with reliable generation and asks the user to choose Continuous or One bundle at a time. It must not silently override a locked user preference.

## Wizard experience

Show progress as “Bundle 5 of 6 · History” or “Bundle 5 of 6 · Additional lore: Culture · 2 of 4,” with completed/remaining job counts and a clear saved state. A failure names the exact job and explains whether retry resumes it. Retrying uses the current selected model if the build's creative input fingerprint still matches. Changing model does not invalidate completed creative jobs; changing accepted Blueprint or canon does. Cancellation stops future jobs, preserves completed jobs, and leaves the incomplete job retryable. The UI must remain readable on narrow mobile screens and avoid nested scroll traps.

## Verification and evidence levels

Test direct object, singleton-object-array, null/scalar/multi-array, missing keys, malformed entries, bounded retry count, cancellation, provider timeout, mid-job disconnect, reload/restart, changed model, changed Blueprint, duplicated IDs, category gaps, deterministic merge, six-bundle checkpoint parity, old-build compatibility, and each execution mode. Run focused suites, full `bun test`, typecheck, production build, and `git diff --check`. Use a deterministic rich Blueprint fixture with supplemental categories and a fake provider that fails one job before succeeding. Report **structurally verified** behavior only until a real Gemini Flash 3.8 run succeeds; a simulated provider is not runtime proof.

## Boundaries and next slice

This work does not implement canon acceptance, retrieval engineering, all artifact-package outputs, or the skip-Divergence path. It should update the M3.2 roadmap status honestly. After the Forge reliability slice is verified, design and implement the raw-idea route from Spark to Physics with explicit source-mode persistence and safe navigation back to optional Divergence.

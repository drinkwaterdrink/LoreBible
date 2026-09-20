# Forge Stable Cross-Links Design

**Status:** proposed for user review. **Branch:** `test`. **Baseline:** v0.61 (`6cc30ad`).

## Intent and boundary

Make generated Forge relationships and knowledge boundaries refer to the correct stable graph records without turning uncertain model text into accepted canon. This is the next bounded M3.2 slice. It does not change the six-bundle generation protocol, rewrite the manuscript, introduce a second graph authority, or claim that all of M3.2 is complete.

## Current behavior

Each completed bundle has lossless `ForgeCategoryRecordV1` proposals and optional typed projections. An entity projection contains its name and type; a relationship projection contains source/target names; a knowledge projection contains truth and knower/suspector text. They do not yet identify stable targets. The ordinary `relationships` and `knowledge` graph collections have ID-based contracts, but generated proposals should not be inserted into those canon-facing collections merely because names look plausible.

## Chosen approach

Use a deterministic, side-effect-free resolver over the completed build's category records and existing graph entities. It returns a **link report** keyed by stable Forge record IDs; it does not edit payloads or promote proposals. This keeps legacy saves loadable and manuscript derivation byte-for-byte equivalent. Embedding inferred IDs inside raw generated payloads was rejected because it would pollute the lossless source. Immediately writing generated edges into `graph.relationships` or `graph.knowledge` was rejected because that would prematurely canonize ambiguous output.

## Identity and matching

Index graph entities by stable ID, canonical name, and aliases, and build-local entity proposals by their stable Forge record ID, source entry ID, semantic name, and entity type. Normalize names only for whitespace and Unicode case folding; no fuzzy or substring matching. A generated explicit stable ID may resolve directly only if it names a known candidate of the appropriate type. Otherwise an exact normalized name or alias may resolve if it identifies exactly one candidate. A repeated name, alias collision, missing name, or nonexistent explicit ID remains unresolved. Never use array order to break ties. Renames preserve the stable ID and former alias; if that alias later becomes ambiguous, report ambiguity rather than silently relink.

Relationship endpoints receive independent results: resolved graph entity or generated entity proposal, missing, or ambiguous. Equal resolved endpoints are invalid for a directional relationship. Knowledge's `knownBy` and `suspectedBy` are treated as authored strings, not parsed into people by punctuation guesses; only a single exact entity reference can resolve automatically. The `truth` text is not converted into a `CanonFact` without an accepted fact ID. The report makes that fact dependency explicit. Future acceptance can consume the report and require user review; this slice does not implement acceptance.

## Output and user-visible behavior

The resolver returns stable record IDs, resolved target IDs and target kind, plus findings with a path, code, and evidence candidates. It distinguishes `resolved`, `missing`, `ambiguous`, and `not_applicable`; no finding claims a generated relationship or knowledge statement is canon. Forge and Project Graph inspection may display a concise count of resolved/unresolved links, but the detailed proposal report is the source of truth. Unresolved links must not block existing Forge checkpoints or exports that already worked; they remain explicit quality findings for later canon acceptance.

## Persistence and lifecycle

Derive the report from the current graph/build revision rather than storing duplicate links. Recompute after reload or rename; a report for an old revision is stale. Existing `categoryRecords`, accepted bundle sections, IDs, user edits, locks, and provider settings are untouched. The resolver must tolerate older saved builds with no category records and return an empty/unsupported report, not synthesize links.

## Verification

Test direct stable-ID matching, unique name/alias matching, duplicate-name and alias collisions, missing endpoints, self-links, ambiguous knowledge strings, renamed entities, old saves, deterministic output independent of input order, and exact checkpoint/manuscript preservation. Run focused tests, full `bun test`, typecheck, build, and `git diff --check`. Report structural verification only; no live Lumiverse behavior is implied.

## Follow-on work

After this slice, design explicit acceptance commands that atomically promote reviewed proposals and preserve user-authored canon. Then add category-scoped regeneration with dependency-impact review. Retrieval architecture remains M4, not part of this linking change.

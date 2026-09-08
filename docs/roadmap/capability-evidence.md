# Lumiverse capability evidence register

**Checked:** 2026-09-07. **Purpose:** separate documented capabilities, internal design, target serialization, and runtime proof. This pass browsed official guidance; it did not acquire contemporary native export fixtures or perform a Lumiverse import.

## Official evidence reviewed

| ID | Primary source | What it supports | What it does not establish |
|---|---|---|---|
| L1 | [World Books developer API](https://docs.lumiverse.chat/backend-api/world-books/) | Native API concepts for keys, selective logic, placement, separate order/priority, persistence, groups, recursion and vectorized entries | Exact standalone export envelope or portable Character Book mapping |
| L2 | [Prompt execution order](https://lumiverse.chat/guides/presets/execution-order/) | Activation processing is ordered; group resolution, priority and budgets interact | Our future simulator matching every version and edge case |
| L3 | [Creating entries](https://lumiverse.chat/guides/world-books/creating-entries/) | Focused entries, conditional/constant/disabled distinctions and Dry Run guidance | Safe revelation merely because a keyword matches |
| L4 | [Importing characters](https://lumiverse.chat/guides/characters/importing-characters/) | Character import formats, embedded lorebooks and CHARX module support | Guessed module JSON keys, asset layouts or this app's import correctness |

These are live documentation pages, not a pinned target-build contract. Capture date and target build again when implementing an adapter. Do not copy API DTO field names into exported JSON without an export fixture proving the mapping.

## Capability gates

| Capability family | Planning status | Before claiming implemented support |
|---|---|---|
| Basic card and portable embedded book | Existing app exporters, not certified by this roadmap | Schema/round-trip tests, package inspection, named import observation |
| Native standalone World Book | Architecture accepted as a target; exact profile pending | Contemporary native exports covering each setting and export envelope |
| Selective/position/priority | Documented concepts | Enum/default mapping and edge fixtures |
| Sticky/cooldown/delay/groups/recursion | Documented concepts | Multi-turn diagnostic fixtures, ordering and budget interactions |
| Semantic/vector retrieval | Documented vectorized capability | Embedding setup, target behavior, corpus tests, disclosure of nondeterminism |
| Earned secrets / mutable arc state | Internal design, no universal safe runtime mechanism assumed | Verified target gating mechanism or explicit disabled/project-only limitation |
| Alternate fields/avatars/expressions | Proposed output family with documented module support | Exact contemporary module fixtures; asset/import round trips |
| Visual reference/edit workflow | Proposed application workflow | Per-image-provider documented capability, tested adapter and identity review |
| Full package certification | Not performed | Repeatable import/activation evidence for a named Lumiverse build |

## Native fixture acquisition protocol

1. Use a small, non-sensitive test world in the intended Lumiverse build. Record version/build, date, relevant settings and documentation links.
2. Export minimal card JSON/CHARX and native World Book. Export one feature at a time, then representative combinations. Include an embedded book, alternate field set, expression and avatar resources where supported.
3. Preserve original fixture bytes with checksums and provenance. Use synthetic authored test content so repository fixtures do not expose private projects or credentials.
4. Compare default versus changed values to establish envelope, field naming, enum encoding, null/absent semantics, asset paths and normalization. Keep API DTO and exported format mappings separate.
5. Add parse/export/parse comparisons plus ZIP contents tests. Record preserved/lost/unknown behavior, not just successful JSON parsing.
6. Import into a disposable test project and record linkage/assets. Run bounded native activation diagnostics for positive/negative/selective/recursion/persistence/group/budget scenarios. Check whether diagnostics mutate state before using them as repeated tests.
7. Pin evidence to target build and fixture hashes. Revalidate on target changes; gate unsupported capabilities rather than silently downgrading them.

Lack of a fixture blocks the affected serializer/claim, not unrelated graph or Blueprint development.

## Evidence vocabulary

- **Concept:** proposed architecture; no implementation proof.
- **Structurally valid:** specific schema/package/reference checks passed.
- **Simulated:** an identified simulator or model probe exercised expected behavior outside Lumiverse.
- **Runtime observed:** attributed user report or captured diagnostics from Lumiverse.
- **Certified for build:** repeatable evidence applies to a named build/configuration.

Store evidence records independently rather than assuming every artifact climbs an automatic ladder. Import success does not imply retrieval correctness; simulation does not imply import success. A warning-free model critique does not establish zero agency or knowledge-leak risk.

## Architecture-reference adaptation

The installed Lumiverse Toolkit Project Steward references informed ownership, dependency impact, provenance, agency and release evidence. LoreBible is not generating a Toolkit project-record artifact here. Its proposed `lorebible.project/v1` application model deliberately remains separate from `lumiverse-toolkit.project/v1`; exact toolkit schemas must be honored only if an explicit toolkit interchange adapter is introduced.

The user-supplied 150-section proposal remains the product requirements source, not technical proof for Lumiverse serialization. Suggested expression labels, native modules and state mechanics are retained in the roadmap without falsely marking them runtime-verified.

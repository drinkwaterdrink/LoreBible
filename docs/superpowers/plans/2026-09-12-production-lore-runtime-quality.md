# Production Lore and Runtime Quality Implementation Plan

**Status:** Active current plan. This supersedes unfinished portions of the historical v0.47 lore-quality plan without rewriting its history.

## Verified baseline

- Branch `test` at `84943a5` (`v0.51`).
- M0, M1, and M2 are complete; M3–M6 remain the dependency path.
- Blueprint selections, Project Graph foundations, resumable legacy Forge checkpoints, canonical Card IR, canonical Lore Manifest, native standalone World Book serialization, and portable Character Book serialization already exist.
- Current gaps include a hard-coded 2,048-token embedded-book budget, reduced portable CHARX attachment, primitive activation planning, earned secrets compiled as dead disabled entries, and no deterministic attached/standalone parity gate.
- Available documentation proves that an embedded book is imported and attached, but does not publish the advanced native CHARX embedding shape. Full-fidelity attachment therefore remains blocked pending a contemporary native fixture.

## Architecture decision

Preserve one pipeline:

`Project Graph -> Canonical Lore Manifest -> Retrieval Architecture -> Activation Audit -> Artifact Serializers`

Serializers may change wrappers but may not invent lore, titles, keys, priorities, or activation behavior. A portable Character Book remains an explicitly lossy compatibility output until native full-fidelity embedding is proven.

## Ordered delivery slices

1. **Foundation:** independent lore-library and runtime activation budgets; canonical category identity and concise titles; migration-safe persistence.
2. **M3 graph-native Forge:** durable category batches written into stable graph records, with principal/roster cast and accepted/open-variable provenance.
3. **M4 retrieval architecture:** keys, selective logic, matching, placement, priority, persistence, groups, recursion, vector dependencies, and concise rationales.
4. **M4 Activation Lab:** indexed matching, fan-out/collision analysis, deterministic activation state, recursion and budget simulation, first-message fixtures, and evidence labels.
5. **Canon quality:** premise coverage, explicit counts, agency, open variables, temporality, secret leakage/discovery, knowledge boundaries, autonomy, ordinary life, continuity, and reference integrity.
6. **M5 cards:** archetype-specific field ownership, examples, distinct greetings, concise tags, and production gates.
7. **M6 publishing:** investigate a contemporary native advanced-book CHARX; implement exact native attachment only if proven; compare attached and standalone behavior; emit passports, receipts, losses, and modular packages.
8. **Publish UX:** mobile summary-first quality panel, content/engineering inspector, activation graph/heatmap, token economy, parity/evidence status, and manual Lumiverse verification guide.

## Current slice acceptance

- Accept library targets through 40,000 estimated tokens without padding.
- Accept runtime budgets independently through 40,000 and an explicit Unlimited recommendation.
- Preserve old saved selections by deriving the new settings from legacy Blueprint values.
- Give every manifest entry stable category identity plus one canonical `[CATEGORY] Semantic Name` title.
- Never use prose content as a title; deterministic fallback produces a Major finding.
- Both serializers consume the same canonical title.
- Do not claim full-fidelity CHARX embedding without native evidence.

## Release gates

Each release runs focused tests, full `bun test`, `bun run typecheck`, `bun run build`, and `git diff --check`. Evidence remains separated as structurally validated, simulated, runtime observed, certified, or unverified.

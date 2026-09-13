# LoreBible Production Studio: north-star roadmap

**Current delivery baseline:** 2026-09-12 · application v0.51 · `test` branch.

**Status:** 10 of 17 ordered roadmap items are complete and 7 remain. M0, M1, and M2 Blueprint Studio are complete. v0.51 shipped editable, persisted Smart/Guided/Expert Blueprint decisions and genuine single-request Forge generation. M3.1 durable graph-native Forge batches are next.

LoreBible will become a creative production studio whose rich source world and carefully compiled runtime artifacts are deliberately different things. Creative quality takes precedence over speed and minimizing calls, while the user retains control over cost, accepted work, and scope.

## Read in this order

1. [Architecture blueprint](production-studio-blueprint.md): product principles, contracts, systems, workflow, and technical decisions.
2. [Delivery roadmap](delivery-roadmap.md): dependencies, milestones, acceptance gates, and integration with the original roadmap.
3. [Requirement traceability](requirements-traceability.md): every numbered proposal section, including deferred features.
4. [Capability evidence register](capability-evidence.md): what official Lumiverse documentation supports versus what still needs native fixtures and runtime evidence.
5. [First implementation slice](../superpowers/plans/2026-09-07-production-studio-export-state-safety.md): narrowly scoped, test-first removal of temporary-state leakage from exports.

Application changes are summarized in the project-level [changelog](../../CHANGELOG.md).

## Current progress

| Slice | Status | Result |
|---|---|---|
| M0.1 Export-state safety | Complete | Temporary state is excluded from runtime lore/System Prompt while remaining in the manuscript source. |
| M0.2 Neutral draft construction | Complete | New drafts preserve supplied material without legacy scenario-template content; verified across blank, domestic, social, and science-fiction fixtures. |
| M0.3 Truthful generation failures | Complete | Creative routes preserve accepted work and report structured, actionable failures; local deterministic audits identify their source. |
| M0.4 Project restoration | Complete | V2 projects and active drafts restore workflow, settings, angle history, and manuscripts; deletes persist; corrupt data is quarantined; mobile reloads retain work. |
| M0.5–M0.8 Foundation completion | Complete | Stable Divergence lineage, model discovery/gateway coverage, canonical artifact IR, native/portable serializers, Windows CI, and mobile workflow gates. |
| M1 Project Graph foundation | Complete | Versioned graph migration, transactional repository, revision-safe commands, controlled editing, and graph-native preview. |
| M2.1 Blueprint planning preview | Complete | Read-only premise-adaptive recommendations with evidence, revision checks, and mobile-safe inspection. |
| v0.46–v0.50 Reliability bridge | Complete | Fresh premise starters, recoverable board history, mobile model ergonomics, manual Forge checkpoints, truthful provider diagnostics, and browser-safe generation IDs. |
| M2.2 Editable Blueprint | Complete | Mobile Smart/Guided/Expert controls persist accepted categories, custom categories, locks, intensity, runtime, mechanics, and Forge execution preference. |
| M3.1 Durable graph-native Forge batches | Next | Persist batch manifests in the project store and resume generation directly into canonical graph records. |

## Recommended order

```text
M0 Trustworthy v0.3 foundation
  -> M1 Canon graph + transactional project store + thin export slice
  -> M2 Blueprint Studio
  -> M3 Resumable graph-native Forge
  -> M4 Lore production + Activation Lab core
  -> M5 Archetype card production
  -> M6 Full-fidelity Publish Studio
  -> M7 Visual production
  -> M8 Integrated QA and world-health workspace
  -> M9 Source Studio
```

Validation, provenance, mobile usability, and capability evidence begin in M0/M1 and continue through every milestone. M8 is the integrated QA workspace, **not** the first time quality is checked. M9 adds source ingestion UI, **not** the first time facts have provenance.

## Next work

Implement M3.1 next: persist explicit Forge batch manifests in the server-side project store, resume after the last validated batch, preserve completed work across reloads, and allow a newly selected model to continue the failed batch. Keep the original M0–M9 ordering authoritative.

No calendar promises are assigned to the ten milestones: fixture availability, migration findings, and measured generation behavior determine readiness. Each milestone must ship a useful vertical slice rather than a collection of disconnected scaffolds.

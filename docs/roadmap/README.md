# LoreBible Production Studio: north-star roadmap

**Planning baseline:** 2026-09-07 · application v0.3.0 · commit `0f2b4878423d2c75fb4bfe5ece449041c2d6038b`.

**Status:** proposed long-term architecture, reconciled with the original remediation roadmap and the user's 150-section Production Studio proposal. These documents describe future work; they do not claim that work is implemented.

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
| M0.4 Project restoration | Next | Complete V2 save/load and draft lifecycle with workflow, settings, history, corruption, and mobile-reload coverage. |

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

Implement M0.4 Project Restoration next: complete the V2 save/load and draft lifecycle, preserve workflow settings and generation history across reloads, surface recoverable corruption clearly, and add mobile-reload coverage. Then complete Divergence lineage and consolidate exports around a small internal representation before introducing the full Project Graph. Keep the existing manuscript interface working throughout.

No calendar promises are assigned to the ten milestones: fixture availability, migration findings, and measured generation behavior determine readiness. Each milestone must ship a useful vertical slice rather than a collection of disconnected scaffolds.

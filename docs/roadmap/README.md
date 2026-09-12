# LoreBible Production Studio: north-star roadmap

**Planning baseline:** 2026-09-07 · application v0.3.0 · commit `0f2b4878423d2c75fb4bfe5ece449041c2d6038b`.

**Status:** 9 of 17 ordered roadmap items are complete and 8 remain. M0 and M1 are complete; M2 Blueprint Studio is in progress. v0.46 shipped Stage 1 premise freshness, full-board Divergence history, and mobile Connections reliability. M2.2 editable and persisted Blueprint controls are next.

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
| v0.46 Reliability bridge | Complete | Explicit AI premise starters, recoverable full-board reroll history, and corrected mobile model-list positioning. |
| M2.2 Editable Blueprint | Next | Persist accepted/overridden category, intensity, runtime, and mechanic decisions before Forge. |

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

Implement M2.2 next: redesign Stage 3 around understandable, editable Blueprint decisions; preserve explicit user locks/omissions through save, load, and reanalysis; and retain migrated Physics values. The following approved slice adds manual step-by-step and optional single-request Forge execution so quota-limited providers never launch another bundle until the user explicitly requests it. Keep the original M0–M9 ordering authoritative after those releases.

No calendar promises are assigned to the ten milestones: fixture availability, migration findings, and measured generation behavior determine readiness. Each milestone must ship a useful vertical slice rather than a collection of disconnected scaffolds.

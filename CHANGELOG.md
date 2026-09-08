# Changelog

All notable LoreBible changes are recorded here. The project adopted this changelog during v0.3 development; Git history remains the detailed record for earlier work.

## Unreleased

## v0.31 — 2026-09-08

### Changed

- Normal generation now stays on the exact selected model; the legacy environment-key path requires an explicit `GEMINI_MODEL` instead of silently cycling through a model pool.
- Refine generation, procedural-roll suggestions, and Test Bench turns now use the selected connection profile and model.
- Consistency, voice, and opening audits are explicitly identified as local heuristics.
- New scenario drafts now begin from neutral, premise-preserving fields instead of automatically introducing institutional conflict, survival goals, grim aesthetics, romance, violence, a ticking clock, or an intake scene.
- New-project Physics controls now default to neutral content settings. Explicit user selections and existing saved-project settings remain unchanged.
- A raw Spark remains available as the draft pitch and situation but is no longer treated as a finished playable opening.
- Draft construction was moved into a pure module so genre neutrality and user-input preservation can be tested directly.

### Fixed

- Model, quota, timeout, credential, and structured-output failures now preserve accepted work and return actionable Retry, Change Model, or Connections guidance.
- Removed silent creative substitutes from Spark parsing, Divergence, single-angle rerolls, Forge, entry revisions, section regeneration, procedural suggestions, and Test Bench turns.
- Forge validation no longer fills incomplete model output with unrelated facilities, syndicates, debts, surveillance, survival costs, or countdowns.
- Temporary current-world state no longer becomes constant lore or a fallback System Prompt in runtime card, lorebook, and CHARX exports.

### Added

- A small `v0.31` label beside the LoreBible brand on desktop and mobile, backed by a shared version constant.
- A shared structured generation-failure contract for JSON and streaming endpoints, plus visible state-preservation notices.
- A generation-path failure inventory documenting the behavior and fallback policy of every generation and audit route.
- Production Studio north-star architecture, phased delivery roadmap, complete 0–150 requirement traceability, and Lumiverse capability-evidence register.
- Regression coverage for neutral draft construction and runtime export state isolation.

## v0.3 development baseline — 2026-09-07

### Added

- Secure Windows DPAPI-backed connection profiles for Gemini AI Studio, OpenRouter, and NanoGPT.
- Curated and custom model IDs with provider-reported availability and connection testing.
- Generation progress, cancellation, usage reporting, and optional display of provider-supplied reasoning content when available.
- Mobile Spark draft recovery and mobile-safe primary generation controls.
- Windows launcher and desktop-shortcut installer.

### Notes

- Provider connection success confirms authentication and model discovery where supported; it does not prove a full generation request.
- Lumiverse export checks are structural unless a release record explicitly identifies runtime-observed evidence for a named Lumiverse build.

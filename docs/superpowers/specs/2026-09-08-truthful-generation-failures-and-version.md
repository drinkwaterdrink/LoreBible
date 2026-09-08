# Truthful Generation Failures and App Version Design

## Goal

Ship LoreBible `v0.31` with a visible version label and make every production generation path preserve accepted work and report model failures truthfully instead of returning deterministic creative substitutes as successful output.

## Scope

This slice covers Spark parsing, full and single-angle Divergence, Forge, Refine generation actions, procedural-roll suggestions, and Test Bench turns. Local consistency, voice, gravity, and opening audits may remain deterministic only when the UI and API identify them as local heuristics. Explicit offline creative generation is deferred; deterministic generators remain test utilities and are not reachable through the normal production workflow.

## Architecture

Create a shared generation-failure contract that normalizes gateway, validation, configuration, cancellation, and unknown errors into safe API payloads. JSON routes return that payload with its truthful HTTP status. Streaming routes emit one terminal error event and never emit `done` afterward.

All creative routes resolve the currently selected profile and model before calling a provider. A missing selection or unavailable profile store becomes an actionable connection failure. Provider errors retain their stable error code and a safe message, without exposing API keys or raw provider bodies.

The browser service converts JSON and streaming failure payloads into a typed `GenerationRequestError`. Existing UI state is committed only after a successful terminal result. Error surfaces offer Retry and Connections actions where the relevant stage already supports them.

## Failure actions

- `PROFILE_NOT_FOUND`, `CREDENTIAL_MISSING`, and `AUTHENTICATION_FAILED`: open Connections or change the selected profile.
- `MODEL_UNAVAILABLE`: change the model.
- `RATE_LIMITED`, `QUOTA_EXHAUSTED`, `PROVIDER_UNAVAILABLE`, and `REQUEST_TIMEOUT`: retry, while preserving any previous accepted work.
- `INVALID_STRUCTURED_OUTPUT`: retry or change the model.
- `CLIENT_DISCONNECTED`: treat as cancellation rather than a creative result.
- `INTERNAL_ERROR`: preserve state and display a safe diagnostic.

## Selected-model policy

Normal generation uses the selected connection profile and exact model ID. LoreBible may retry that same model with bounded backoff or lower reasoning effort after a timeout. It must not silently switch to a different model. The legacy environment Gemini key remains a compatibility connection only when an explicit `GEMINI_MODEL` is configured; it does not use an automatic candidate-model pool.

## Local analysis policy

Deterministic audits are legitimate product features rather than fallbacks. Their responses include `analysisSource: "local_heuristic"`. If a model-enhanced audit is requested and fails, the failure is reported instead of being hidden behind the local result.

## Version policy

The release display version is `v0.31`. Future user-visible app updates advance by exactly `0.01` (`v0.32`, `v0.33`, and so on). Package metadata uses the SemVer-compatible equivalent `0.31.0`. A shared frontend constant renders the version beside the LoreBible brand on desktop and mobile. Documentation-only edits do not consume a new app version.

## Validation

Tests must prove:

- missing selection and provider failures cannot return deterministic creative output;
- JSON and SSE errors retain stable codes and actionable metadata;
- streams produce exactly one terminal event;
- client services preserve typed failure details;
- accepted Divergence and Forge state is not replaced on failure;
- local audits identify their analysis source;
- the UI and package metadata agree on `v0.31`;
- `bun test`, `bun run typecheck`, and `bun run build` pass.

## Documentation

Record the release in `CHANGELOG.md`, mark M0.3 complete in the roadmap, and identify M0.4 project restoration as the next slice.

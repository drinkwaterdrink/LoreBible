# Generation failure inventory

This inventory records the v0.31 production policy. “Model” means the exact profile and model selected in Connections, or the explicitly configured legacy `GEMINI_MODEL`.

| Route | Work type | v0.31 behavior on failure | Existing work |
|---|---|---|---|
| `/api/parse-spark` | Model generation | Structured JSON failure | Previous Spark analysis remains |
| `/api/divergence` | Model generation, SSE | One terminal structured error event | Previous board and versions remain |
| `/api/divergence-single` | Model generation | Structured JSON failure | Target angle and its versions remain |
| `/api/forge` | Model generation, SSE | Stops future bundles with one terminal error | Previously accepted manuscript remains; incomplete candidate is not published |
| `/api/refine/entry-reroll` | Model generation | Structured JSON failure | Entry remains unchanged |
| `/api/refine/variants` | Model generation | Structured JSON failure | Current entry and prior variants remain |
| `/api/refine/entry-push` | Model generation | Structured JSON failure | Entry remains unchanged |
| `/api/refine/section-regen` | Model generation | Structured JSON failure | Section and locked entries remain unchanged |
| `/api/suggest-rolls` | Model generation | Structured JSON failure | Existing roll groups remain |
| `/api/test-bench-turn` | Model generation | Structured JSON failure | Existing Test Bench transcript remains |
| `/api/refine/consistency-audit` | Local deterministic analysis | Returns findings with `analysisSource: local_heuristic` | Read-only |
| `/api/voice-check` | Local deterministic analysis | Returns findings with `analysisSource: local_heuristic` | Read-only |
| `/api/opening-audit` | Local deterministic analysis | Returns findings with `analysisSource: local_heuristic` | Read-only |

Deterministic creative generators remain source-level test utilities only. They are not reachable through normal production requests and must not masquerade as successful model output. A future Offline Mode, if added, must be explicitly selected and visibly identified.

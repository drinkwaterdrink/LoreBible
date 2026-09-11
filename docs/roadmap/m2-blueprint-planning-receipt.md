# M2.1 Blueprint planning receipt

**Release:** v0.41
**Milestone:** M2 Blueprint Studio in progress
**Roadmap:** 9 of 17 complete; 8 remain
**Evidence:** local structural and deterministic fixture validation

## Delivered

- Project Graph Beta can request a read-only Blueprint preview for its currently loaded revision.
- The preview recommends an artifact target, world mode, build intensity, generation quality, runtime budget, category matrix, eligible mechanic packs, and bounded node/model-call inventory.
- Every positive recommendation includes evidence references and a visible explanation. Unsupported high-impact domains such as factions, magic, secrets, and combat are shown as omitted with reasons instead of becoming generic defaults.
- Ordinary-life coverage and world autonomy are assessed separately so sandbox breadth can be examined without turning every premise into a conflict machine.
- The planning adapter explicitly selects only approved Spark, selected-take, Physics-constraint, and quality fields. The API binds provenance to the stored graph identity/revision and rejects malformed or credential-shaped requests and responses.
- The mobile-safe panel is inspect-only. It contains no save, apply, edit, or Forge control.

## What this does and why

M2.1 answers what LoreBible currently recommends building and why before generation begins. It gives users an explainable, premise-adaptive inventory while keeping planning distinct from canon and compilation. Contrasting deterministic fixtures cover a cozy bakery, family visit, focused romance, war-torn kingdom, science-fiction city, blank premise, and an explicit must-avoid-magic constraint. Parser, route, client, and component tests exercise revision conflicts, redaction, cancellation, prior-preview preservation, and narrow-screen rendering.

## Preservation and rollback

Blueprint output is proposal-only and non-persistent. It does not mutate SavedProjectV2, the Project Graph, accepted canon, or compiled artifacts. Physics values are only copied into a sanitized planning context; Physics behavior and the five-stage wizard are unchanged. Forge is unchanged and cannot be started from this preview.

A failed preview leaves the previously displayed proposal available. A request cancelled by closing the panel or unmounting cannot overwrite accepted work. Existing V2 saves remain the live application authority. Reverting v0.41 removes this preview surface without rewriting or deleting V2 saves or stored Project Graphs.

## Verification evidence

- Version expectations were changed first and failed against v0.40 before production versions were updated.
- Blueprint contract, adapter, planner, route, service, lifecycle, and component suites pass locally.
- The complete local suite passed: 240 tests across 58 files, 0 failures, and 1,058 assertions.
- TypeScript typecheck and the production client/server build exited successfully. Vite reported its existing advisory that one minified application chunk exceeds 500 kB; this is a performance advisory, not a build failure.
- `git diff --check` reported no whitespace errors.
- Excluded-scope review confirms no release diff changes wizard stage numbering, `PhysicsStage`, `ForgeStage`, artifact serializers, provider gateways, connection storage, or the V2 persistence schema.

**Fresh release result:** PASS for tests, typecheck, production build, whitespace, and excluded-scope review.

## Validation boundary

This evidence establishes local parser, data-selection, deterministic planning, revision/redaction, lifecycle, and render behavior for the tested fixtures. It does not establish creative model-output quality, live Lumiverse import, World Book activation behavior, provider prices, or generation duration. The Blueprint planner makes no such claims.

## Next

M2.2 will add editable and persisted Blueprint decisions, user locks/omissions, and reanalysis behavior. M2 remains in progress; the roadmap total stays at 9 of 17 complete with 8 remaining.

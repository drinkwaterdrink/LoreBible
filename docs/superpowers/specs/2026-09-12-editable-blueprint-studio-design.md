# Editable Blueprint Studio (M2.2) Design

**Status:** approved design awaiting implementation-plan review  
**Release target:** LoreBible v0.51 on `test`  
**Roadmap milestone:** M2.2  
**Depends on:** M2.1 Blueprint recommendations, `BlueprintSelectionV1`, SavedProjectV2/active-workspace persistence, and the existing Forge execution preference

## 1. Goal

Turn the current read-only Blueprint preview into a mobile-first planning studio where users can accept or override LoreBible's recommendations before Forge. The studio must preserve recommendations as evidence, user choices as authority, and saved Blueprint selections across reloads without silently changing accepted decisions.

M2.2 does not make Forge graph-native and does not implement advanced World Book activation mechanics. It produces the durable, validated selection that those later milestones consume.

## 2. Product rules

- Smart Auto must produce a usable selection without requiring expert knowledge.
- Guided mode exposes the creative and package choices most users understand.
- Expert mode exposes exact ranges and architecture hints without claiming that planned mechanics are already serialized.
- Recommendations and user selections remain distinguishable. An override never rewrites or misrepresents the original recommendation.
- User-locked fields, category choices, custom categories, and mechanic choices survive Blueprint refreshes.
- An ineligible mechanic cannot be enabled. The UI explains the blocking evidence instead of silently changing it.
- Every control explains what it changes and why the current recommendation was made.
- Build intensity, generation quality, lorebook size, runtime budget, and Forge execution mode remain independent concepts.
- Existing Physics `mundanity` is presented as ordinary-life coverage. It is migrated and preserved rather than reinterpreted as a new unrelated value.
- No API key, credential, provider payload, or hidden model reasoning is stored in a Blueprint selection.

## 3. Canonical state and ownership

`BlueprintPlanV1` remains an immutable recommendation generated for one Project Graph revision. `BlueprintSelectionV1` remains the editable user-owned decision record.

The application keeps both while the studio is open:

```text
Project Graph revision
        |
        v
BlueprintPlanV1 (recommendation and evidence)
        |
 create/reconcile
        v
BlueprintSelectionV1 (editable and persisted authority)
        |
        +--> active workspace autosave
        +--> SavedProjectV2 workflow
        +--> Forge planning context
```

Opening Blueprint for the first time creates a selection from the plan. Opening it again edits the persisted selection. Refreshing recommendations calls `reconcileBlueprintSelection`: unlocked recommended values update, while locked fields, locked mechanics, locked categories, explicit omissions, custom categories, interface mode, lorebook scale, Forge preference, and creation time survive.

The studio edits a local draft. **Save Blueprint** validates the complete draft and commits it to application state in one operation. Closing or cancelling discards unsaved modal edits, not the last saved selection. This prevents half-edited ranges from corrupting autosave.

## 4. Interface modes

### Smart Auto

Smart Auto is a compact decision summary. It shows the recommended artifact package, world mode, build intensity, generation quality, runtime budget, lorebook scale, ordinary-life coverage, categories, mechanics, estimates, and findings. Each item includes its recommendation rationale.

The user can save the recommendation as-is or switch to Guided/Expert. Smart Auto is not read-only: it represents an editable selection whose detailed controls are intentionally collapsed.

### Guided

Guided exposes:

- artifact targets as selectable package outputs;
- Arc, Sandbox, or Hybrid world mode;
- Lean, Rich, Deluxe, or Obsessive build intensity;
- Fast, Balanced, Deep Craft, or Production generation quality;
- Efficient, Balanced, or Expansive runtime budget;
- Compact, Standard, Large, Massive, or Custom lorebook scale;
- ordinary-life coverage from 1 to 5 with plain-language endpoints;
- category include/omit, detail, target range summary, and lock;
- custom category creation and removal;
- mechanic enabled/disabled and lock;
- Continuous, One bundle at a time, or Single request Forge preference.

Guided range editing uses valid presets. Custom numeric ranges are reserved for Expert mode to keep mobile forms manageable.

### Expert

Expert includes all Guided controls plus exact min/ideal/max ranges for the total lorebook, principal cast, roster cast, and each category. It exposes likely runtime role and candidate architecture options as planning metadata. These controls do not directly claim or serialize Lumiverse settings; M4 validates and compiles those decisions.

## 5. Mobile interaction design

The Blueprint Studio remains a full-height modal with one scroll container and a sticky header/footer. At narrow widths:

- mode tabs span the width and remain reachable;
- the header shows the selected mode and unsaved-state marker;
- major choices render as stacked labeled selects or segmented controls;
- each category/mechanic is a collapsed summary card by default;
- expanding one card reveals its rationale and controls without horizontal scrolling;
- numeric range inputs use three labeled fields in one responsive row, falling back to a vertical stack at the narrowest width;
- the footer places **Save Blueprint** and **Cancel** above the device safe area;
- no action requires scrolling through every category to reach Save.

The modal restores focus on close, closes with Escape, provides an accessible dialog label, and gives every control a programmatic label. Destructive removal of a custom category is explicit but does not require a second modal because the unsaved draft can still be cancelled.

## 6. Control semantics

### Artifact targets

At least one target is required. Selecting Full World Package may coexist with optional individual character targets. The initial selection mirrors the planner recommendation. Artifact choices are user-authoritative after save.

### World mode

World mode selects Arc, Sandbox, or Hybrid and is stored independently of mechanics. Choosing Sandbox does not automatically enable Living World; the UI may recommend it but requires an explicit saved mechanic state.

### Build intensity versus generation quality

Build intensity controls planned breadth, relationship density, secondary systems, review depth, and optional assets. Generation quality controls specialist passes. Neither directly changes prose length.

### Runtime budget versus lorebook scale

Lorebook scale controls how much world information may be authored. Runtime budget controls how much compiled material should usually activate. A Massive lorebook with an Efficient runtime budget is valid and signals more selective retrieval.

Preset lorebook ranges remain:

| Scale | Minimum | Ideal | Maximum |
|---|---:|---:|---:|
| Compact | 10 | 18 | 25 |
| Standard | 25 | 42 | 60 |
| Large | 60 | 90 | 120 |
| Massive | 120 | 185 | 250 |

### Ordinary-life coverage

Rename the user-facing concept from “mundanity” to **ordinary-life coverage**:

1. Minimal — dramatic or task-focused scenes dominate.
2. Light — occasional routines and harmless texture.
3. Balanced — everyday life supports the central premise.
4. Rich — routines, leisure, social hubs, and obligations receive deliberate coverage.
5. Immersive — ordinary life is a major worldbuilding layer.

The value continues to map to `PhysicsConfig.mundanity` for backward compatibility.

### Categories

Each category shows label, status, detail, approximate entry range, purpose, recommendation rationale, likely runtime role, and lock state. Required categories cannot be omitted. Omitted categories remain visible in a dedicated collapsed group and survive refresh.

Custom category creation requires a non-empty unique label. A stable local ID is derived safely; collisions receive a suffix. Defaults are optional status, standard detail, a small valid target range, mixed runtime role, no candidate architecture, `custom: true`, and `userLocked: true`. The user may add a short explanation. Custom categories are never injected merely because an input is blank.

### Mechanic packs

Each mechanic card shows purpose/reason, eligibility, expected architecture effects, runtime requirements, graceful fallback, and lock state. Recommended mechanics begin enabled; optional mechanics begin disabled; ineligible mechanics remain disabled. Enabling or disabling a mechanic is an explicit user choice and locks it against recommendation refresh.

M2.2 stores mechanic intent only. The UI states that runtime behavior is not active until the relevant later compiler supports and validates it.

### Forge execution preference

- Continuous: process remaining bundles sequentially.
- One bundle at a time: stop after each validated checkpoint and wait for the user.
- Single request: ask the provider for the entire Forge result in one request when supported by the current Forge path.

The preference must remain visible near Save because it changes provider-call behavior. It does not start Forge from inside the modal.

## 7. Validation and error behavior

All draft mutations go through pure Blueprint selection helpers and produce a value that must pass `parseBlueprintSelectionV1` before save.

Validation rules include:

- at least one valid artifact target;
- unique stable category/mechanic IDs;
- non-empty custom category label;
- finite nonnegative ascending ranges;
- ordinary-life detail from 1 through 5;
- ineligible mechanic cannot be enabled;
- required category cannot be omitted;
- closed-schema and credential-shaped-field rejection remains intact.

Invalid local edits remain visible with field-level messages and do not replace the saved selection. A failed autosave preserves the in-memory accepted selection and displays the existing storage warning. A stale graph revision preserves the saved selection, keeps the current plan visible, and offers recommendation refresh; it does not discard overrides.

## 8. Forge handoff

Stage 3's saved Blueprint selection becomes the canonical source for `forgeExecutionPreference`. Existing Physics and Forge inputs remain supported during M2.2. The Forge request gains only the already-supported preference handoff needed to avoid duplicate configuration surfaces.

Category counts, mechanic packs, artifact targets, and runtime budget are persisted for M3/M4 consumption but must not be falsely described as fully applied to legacy Forge generation until those slices wire them into graph-native generation and compilation.

## 9. Code boundaries

- `src/components/BlueprintPreviewPanel.tsx` becomes a thin studio shell or is replaced by `BlueprintStudio.tsx` with focused subcomponents for summary, primary controls, categories, mechanics, and sticky actions.
- `src/lib/blueprint/selection.ts` owns pure immutable mutations, reconciliation, custom-category creation, and preset ranges.
- `src/contracts/blueprintSelection.ts` owns closed validation and cross-field invariants.
- `src/App.tsx` owns opening, draft initialization, saved selection commit, autosave integration, and modal close behavior; it does not contain category mutation logic.
- Existing project/workspace persistence remains the storage boundary. No second localStorage key is introduced.

Files may be split further only when a focused component becomes difficult to understand or test. M2.2 does not broadly refactor `App.tsx` or `server.ts`.

## 10. Test and acceptance gates

Deterministic tests must prove:

- recommendation-to-selection creation retains every relevant recommendation;
- locked fields, omissions, custom categories, and locked mechanic decisions survive reconciliation;
- each pure mutation returns a valid detached selection and does not mutate its input;
- required categories and ineligible mechanics reject invalid transitions;
- custom categories receive safe unique IDs and valid defaults;
- lorebook presets and custom ranges remain distinct from runtime budget and quality;
- ordinary-life UI labels map to the legacy physics value without changing it;
- Save commits one validated selection; Cancel preserves the previous saved selection;
- project save/load and active autosave round-trip the edited selection;
- the mobile dialog has one bounded scroll region, sticky actions, accessible labels, and no horizontal overflow dependency;
- Forge receives the saved execution preference;
- legacy projects without a selection still open using a fresh recommendation;
- malformed saved selections remain recoverable and do not crash startup.

Release validation requires the focused tests to fail before implementation, then pass; the full Bun suite; TypeScript checking; production build; version badge v0.51; changelog and roadmap status updates. Browser inspection may verify layout, but it is not substituted for deterministic state and persistence tests.

## 11. Definition of done

M2.2 is complete when a mobile user can open Blueprint, understand the recommendation, customize and lock meaningful decisions, add a scenario-specific category, select optional mechanics, choose a Forge call strategy, save, reload the project, and see the exact accepted selection restored. Forge must receive the saved execution preference, while later unsupported architecture remains honestly labeled as planned rather than active.


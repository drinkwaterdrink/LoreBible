# M1 Project Graph vertical-slice receipt

**Release:** v0.40  
**Milestone:** M1 complete  
**Evidence:** `static_validated` with real temporary-directory restart reload

## Delivered

- An explicit Vault action prepares one selected SavedProjectV2 as a Project Graph; it never bulk-migrates or overwrites the source save.
- Repeated preparation of the same untouched source reopens revision 1. A changed source or edited graph produces an explicit conflict instead of replacement.
- The beta panel exposes graph counts, one controlled entity rename, revision conflicts, reload, and change/blast-radius receipts on desktop and mobile-sized layouts.
- The compiler reads only ProjectGraphV1. It routes owned public durable content into card fields, excludes current/secret material from public fields, keeps secret lore disabled, attributes knowledge claims, and parses both V3 card and native World Book output.
- A fresh repository instance reloads the accepted revision exactly and produces the same deterministic preview when given the same export clock.

## Preservation and rollback

SavedProjectV2 remains the application authority and is explicitly labeled unchanged in the beta panel. Graph storage is additive. Reverting v0.40 leaves V2 saves intact; no automatic graph deletion, rewrite, or authority transition occurs.

## Validation boundary

The suite establishes structural/local behavior for its fixtures. It does not establish live Lumiverse import, World Book activation, card runtime behavior, cross-process locking, universal power-loss guarantees, or automatic migration quality for every historical project.

## Next

M2 Blueprint Studio will recommend and let users override artifact target, world mode, build intensity, dynamic lore categories, and mechanic packs before expensive Forge generation.

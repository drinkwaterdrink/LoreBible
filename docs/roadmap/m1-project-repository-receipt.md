# M1.2 Project Repository receipt

**Release:** v0.39  
**Milestone:** M1 in progress  
**Evidence:** `static_validated` with simulated interruption and real temporary-directory persistence

## Delivered

- Revision-safe entity rename and canon update commands.
- Stable IDs, alias preservation, structured conflicts, and blast-radius receipts.
- Per-project serialized writes and authoritative revision reload.
- Canonical staged writes, read-back validation/checksum, atomic same-volume rename, backups, corrupt-primary reporting, and explicit recovery.
- Base64url project-directory encoding and recursive credential-shaped field rejection.
- Internal APIs that expose safe domain errors without repository paths.

## Preservation and rollback

The browser V2 Vault remains the live UI authority. Repository files are additive under the per-user LoreBible application-data directory. Reverting v0.39 does not rewrite or delete V2 saves, and no repository cleanup happens automatically.

## Not established

- Cross-process locking or universal power-loss guarantees.
- Automatic migration or current Vault integration.
- The complete migration/edit/compile/restart vertical slice.
- Lumiverse import, Diagnostics, Dry Run, or runtime behavior.

## Next

M1.3 connects one explicit project through migration, repository editing, minimal artifact compilation, restart reload, and exact accepted-state comparison before any live authority transition.

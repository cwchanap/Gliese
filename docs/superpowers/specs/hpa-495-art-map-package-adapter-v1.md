# Meadow Entry art map package adapter v1 (historical, HPA-495 legacy)

> **Disambiguation note.** This document predates the `gliese-world-expansion` skill
> design (see `2026-08-05-hpa-495-lean-world-expansion-skill-design.md`, Section 3.7).
> It was authored when "HPA-495" referred to a Meadow Entry map-art package adapter.
> From that design onward, **HPA-495 means `gliese-world-expansion` and its field
> validation**, not this adapter. This file is retained as a historical Meadow Entry
> compatibility design only. Its remaining file path is historical and must not be
> treated as a peer "HPA-495 design." `art-map-adapters/*`, `tools/art-map-package.ts`,
> and `bun run art:map-package` remain Meadow Entry-specific until another real
> implementation exists; a later cleanup may rename the file path or remove the
> compatibility wrapper when HPA-406 confirms no consumer needs it.

This repository exposes one stable, repository-relative entry point for the deterministic map-art package lifecycle:

```sh
bun run art:map-package -- --adapter art-map-adapters/meadow-entry.v1.json --operation validate
```

The adapter is a versioned dispatch manifest, not a generic art generator. It names a reviewed map package, its fixed input/output schemas, deterministic artifact paths, approval and fingerprint-bearing manifests, production prompt/manual record, provenance, transforms, crop and encoder contract versions, dependency versions, and compatibility commands. Existing Meadow Entry commands remain supported.

## Adapter v1 schema

All paths use `/`, are relative to the repository, contain no `..`, and are deterministic. Unknown keys, missing keys, absolute paths, unsupported schema IDs, unsupported versions, and unsupported implementations fail before a lifecycle tool runs.

- `version`: exactly `1`.
- `adapterId`, `mapId`: stable lowercase identifiers.
- `implementation`: implementation capability required by the repository. HPA-496 provides only `meadow-entry-package-v1`.
- `schemas.input`: exactly `gliese-art-map-package-input-v1`.
- `schemas.output`: exactly `gliese-art-map-package-output-v1`.
- `paths`: repository-relative `packageRoot`, `proofRoot`, and `controlsRoot`.
- `artifacts`: package-root-relative `baseMaster`, `foregroundMaster`, and `exportsDirectory`.
- `manifests`: repository-relative approval/evidence paths and package-root-relative master provenance, export provenance, and crop manifest paths. The control approval carries the immutable fingerprint; the package approval binds all accepted identities.
- `versions`: positive integer normalization-transform, crop-contract, and canonical-PNG-encoder versions plus exact dependency versions.
- `productionRecord`: field locations for prompt or manual-production mode and the package-root-relative source provenance manifest.
- `commands`: stable compatibility command names for `finalize`, `export`, `proof`, `approve`, and `validate`.

The output schema is the fixed package root with exactly named masters, deterministic exports derived from the crop manifest, provenance manifests, proofs under `proofRoot`, and the approval module. Adapters do not authorize runtime registration or changes to map geometry.

## Scope of this adapter

This adapter is the Meadow Entry map-art package lifecycle only. It is not a general
promise that every map has a package adapter, and it does not assign generic adapter
work to any ticket.

A new map that genuinely needs a reusable art-package lifecycle must record that
concrete need against its own scope (for example, through the `gliese-world-expansion`
skill) rather than cloning Meadow Entry's adapter, crop contract, provenance inventory,
or approval machinery by default. Do not invent another lifecycle before a real
implementation exists.

The fail-closed fixture at `src/lib/game/content/backgrounds/fixtures/future-map-adapter.v1.json`
preserves the existing behavior: an unknown adapter ID is reported and no lifecycle
dispatch runs, without editing any Meadow Entry lifecycle script.

---

*Historical document. See the disambiguation note at the top. The file path
`hpa-495-art-map-package-adapter-v1.md` is retained for compatibility; a later cleanup
may rename or remove it once HPA-406 confirms no consumer depends on it.*

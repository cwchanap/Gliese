# HPA-495 art map package adapter v1

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

## Future-map extension point

HPA-495 can add a new adapter by committing another `art-map-adapters/<map-id>.v1.json` and implementing its declared `implementation` capability in `tools/art-map-package.ts`. Until that implementation exists, the CLI reports the adapter ID and unsupported implementation and performs no lifecycle dispatch. The fixture at `src/lib/game/content/backgrounds/fixtures/future-map-adapter.v1.json` locks this fail-closed behavior without editing any Meadow Entry lifecycle script.

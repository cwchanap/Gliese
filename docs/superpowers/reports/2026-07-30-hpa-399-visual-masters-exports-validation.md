# Meadow Entry Visual Masters and Exports Validation

## Scope and identity

- Delivery issue: HPA-496, “Produce Meadow Entry visual masters, regional exports, and reusable art package.”
- Stable consumer interface: the approved `artifacts/meadow-entry/hpa-399/` and `docs/superpowers/reports/img/hpa-399/` paths remain unchanged from the HPA-399 implementation plan.
- Validated source commit: `d60183c8e2a46aa327b57f5c440dc60fe7ecd3b9`.
- Frozen HPA-398 control fingerprint: `a877c70797d303dee292582b715d009dfccace19f769ebbef86230b1fd17f26d`.
- Storage-configuration SHA-256: `0cf1316ca427ce34ff4480a8ce9f7d78bcaf9305b40ad7b699b8a4891ce80997`.
- Approval: `chanwaichan`, `2026-08-02T08:51:49Z`.

This report validates the approved package and deterministic downstream products. It does not attempt to recreate or claim byte reproducibility for generative source candidates.

## Storage and Git LFS

Validation used `git-lfs/3.7.1 (GitHub; darwin arm64; go 1.25.3)`. The fixed Meadow Entry LFS inventory contains 106 materialized PNGs: one canary, two masters, 22 regional exports, and 81 proofs.

For every path, the one-command validator verifies:

- the exact fixed path allowlist;
- `filter=lfs`, `diff=lfs`, `merge=lfs`, and `-text` attributes;
- a canonical Git LFS v1 pointer in the index;
- pointer OID and size against the materialized working-tree bytes;
- a materialized PNG signature rather than pointer text; and
- local object availability through `git lfs fsck`.

The transparent one-pixel canary also decoded as 1×1 RGBA with alpha zero. No publication sentinel was active for masters, exports, or proofs.

## Masters, provenance, and budgets

| Plane      | Dimensions | Bytes      | SHA-256                                                            | Review / hard budget      |
| ---------- | ---------- | ---------- | ------------------------------------------------------------------ | ------------------------- |
| Base       | 6400×6400  | 75,418,273 | `9a5097eea014d092e57a8953be0dec2a16c1e6d29446f8b293338bf95a93752c` | 134,217,728 / 201,326,592 |
| Foreground | 6400×6400  | 1,498,345  | `c9ffa6e50a8e3c9f9888a642078094e95d9175158df8d262de8ac94b1ab9124e` | 50,331,648 / 100,663,296  |

- Master provenance SHA-256: `09f82618ef395402f2ceffa2fb058c4f8ad8b9df5bc1f80c7e711a454c6121cd`.
- Base predecessor SHA-256: `f1184b045c27c544ac18937a4f8ccfa12cd386319b1722be5d808aea8048ade6`.
- Foreground predecessor SHA-256: `2d0a6703de1a404e49c0746f092a4c6f9f113ae17cd8bc35de635b5ec084ce45`.
- Both approved refinement lists are empty; the approved bytes bind directly to their recorded production passes.
- The base is opaque; the foreground has zero hidden RGB, zero protected-mask overlap, zero pixels outside the foreground-eligibility mask, and zero interaction-clearance overlap.
- Both PNGs use the canonical `IHDR` / `IDAT` / `IEND` encoding contract.

The base record is honest about its mixed provenance. It was produced by `manual-global-painter` 8.0.0 and contains a seedless ImageGen style donor. Generative candidate recreation is therefore not byte reproducible. Its recorded normalization and compositing pass is deterministic (`randomCalls: 0`) when run from the archived donor bytes. The foreground was produced by `manual-sparse-foreground-painter` 5.0.0 and records byte-reproducible manual generation. The validator begins from approved master bytes and regenerates only deterministic exports and proofs.

## Regional exports

- Crop manifest SHA-256: `6c7cc2f34723e300184355e892fac088d5271c2e74d921c511cea11b42bc4a11`.
- Export provenance SHA-256: `2cc08d9f1a1bfcbb8a867192261671592342c92c8783a72424baa3c62f3dccab`.
- Fixed inventory: 12 crops and 22 PNG planes, 109,509,947 measured bytes.
- `exportAreaRatio`: 1.3218.
- Overlap area: 18,795,520 pixels.

| Aggregate budget       | Review bytes | Hard bytes  | Measured bytes |
| ---------------------- | ------------ | ----------- | -------------- |
| Base exports           | 176,006,422  | 266,316,498 | 107,835,683    |
| Foreground exports     | 55,044,791   | 110,089,579 | 1,674,264      |
| Combined package limit | 231,051,213  | 376,406,077 | 109,509,947    |

Temporary-root regeneration reproduced every export, the crop manifest, and export provenance byte-for-byte without writing into the tracked package. Independent decoded-pixel verification passed all 25 overlaps and the one multi-crop corner group with zero differing pixels. The crop contract includes three clamp edges, 27 fallback boundaries, and complete non-overlapping baked/fallback coverage of the 6400×6400 world.

## Proof inventory

The fixed proof inventory contains 81 PNGs plus 81 ordinary-Git JSON sidecars:

- 9 full-master and mask/composite views;
- 12 region/connector views;
- 25 overlap views;
- 1 corner-group view;
- 3 clamp-edge views;
- 27 fallback-boundary views; and
- 4 immutable Sundrop feather-edge views.

The PNG inventory is 617,189,999 bytes. Its ordered hash manifest SHA-256 is `6b5bed18549bc2f860b48e9f92d1875cc6b57e7b0e41b282fbc89b023dbe91d1`. Every sidecar was checked against the exact path allowlist, source paths and hashes, proof hash and dimensions, master coordinates, and non-empty proof-specific metrics. Temporary-root proof regeneration reproduced all 162 files byte-for-byte, including the immutable HPA-398 Sundrop composite and four feather boundaries.

## One-command validator and CI

`bun run art:validate:meadow-entry` is fail-fast and runs these stages in order:

1. reject active master, export, and proof publication sentinels;
2. verify Git LFS, pointers, OIDs, object availability, and materialization;
3. run current HPA-398 controls in `--check` mode;
4. validate approved masters, alpha/masks, provenance schemas, budgets, and fixed paths;
5. regenerate exports and proofs in a temporary repository and compare every byte;
6. run 20 focused unit/asset files; and
7. prove tracked status is unchanged from validator entry.

Temporary regeneration roots are removed in `finally` on success or failure. The validator never invokes the generative candidate or master finalization tools.

CI adds an independent `Meadow Entry Art Package` job using `actions/checkout@v4` with `lfs: true`, Bun setup, `bun install --frozen-lockfile`, and the one-command validator. Existing jobs are unchanged.

The approved generated master-provenance JSON is intentionally excluded from Prettier with one exact `.prettierignore` path. Reflowing that file would invalidate its approved byte identity. Its schema and SHA-256 are validated instead; no broader artifact JSON exclusion was added.

## Command evidence

All commands ran from the isolated HPA-496 worktree on 2026-08-02.

| Command                                 | Result                                                                                                               | Wall time |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------- |
| `bun run art:validate:meadow-entry`     | PASS; 7 fail-fast stages, 22 exports and 81 proofs regenerated byte-identically, 20 files / 257 focused tests passed | 158.49 s  |
| approved artifact/proof diff inspection | PASS; validator left tracked state identical to entry and no approved package/proof path changed                     | included  |
| `git lfs fsck`                          | PASS; `Git LFS fsck OK`                                                                                              | 0.59 s    |
| `bun run check`                         | PASS; 0 errors and 0 warnings                                                                                        | 4.86 s    |
| `bun run lint`                          | PASS; Prettier and ESLint                                                                                            | 12.50 s   |
| `bun run test:unit -- --run`            | PASS outside sandbox; 79 files / 1,167 tests                                                                         | 54.46 s   |
| `bun run build`                         | PASS; 195 modules transformed                                                                                        | 1.78 s    |
| `bun run build:tauri`                   | PASS; strict story check, Tauri-mode frontend build, and no-frontend-prose assertion                                 | 40.68 s   |

The first sandboxed full-unit attempt ran 1,096 assertions across 76 files but could not bind Vitest’s local browser server (`listen EPERM ::1:63315`). Re-running the same command with local-server permission passed all 1,167 assertions across 79 files. This was an execution-environment restriction, not a test failure.

Full `tauri build` was intentionally not run because this validation does not claim packaging evidence.

## Explicit non-claims

HPA-496 provides approved visual masters, deterministic regional exports, reusable proof/provenance interfaces, and their validation gate. It does not claim or validate:

- runtime integration of the regional planes;
- player traversal over the exported art;
- live execution of the fallback renderer;
- GPU composition or platform-specific rendering;
- save/load behavior;
- runtime memory, frame-time, startup, or package-size performance; or
- desktop installer or notarized package behavior.

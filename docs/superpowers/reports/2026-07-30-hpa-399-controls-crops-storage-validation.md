# HPA-399 Controls, Crops, and Storage Validation

## Result

The reviewed HPA-399 Meadow Entry authoring/control/storage contract is validated at source
commit `3bb02f8fecd5223a601d997483516a0f5bab4e0d`. The checked-in controls are current, the approval
matches independently rendered source contracts and checked-in bytes, Git LFS storage is intact,
runtime coverage has no gap or overlap, and every requested repository gate exits `0`.

This report records authoring evidence only. It does not approve or include regional master PNGs,
regional base/foreground exports, native proof PNGs, runtime integration, save changes, map
changes, or Tauri application packaging. Those remain outside HPA-399; HPA-406 owns runtime
integration and the recorded decor/fence fallback obligations.

## Review and fingerprints

- Reviewer: `chanwaichan`
- Review time: `2026-07-31T22:48:53Z`
- Evidence path sealed by the approval:
  `docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md`
- Gameplay-source fingerprint:
  `d3b669a1a42e3f15a9084bfc4657e5cf16b5bd508841ff48d45660db49213a95`
- Authoring-contract fingerprint:
  `dd49a5f37927fe14073f8e477e938070276cbc4348b6593bb3b1631a303561a8`
- Combined-control fingerprint:
  `4c238c40fccfa191345ac4de1fdee63e448f554ec455e024fc4f78bc344f36f7`
- Renderer/mask/material implementation SHA-256:
  `7d3352c4116d8ac0f12a58a731286cc42d5145af0cb2d3216ea0b48a5b0d000f`

The generated fingerprint module, current source-derived fingerprints, checked-in control
manifest, and persisted approval all carry the same combined-control fingerprint. The final
one-command validator rerenders the package in read-only mode before running the focused contract
suites.

## Independent review and approval hashes

The independently computed review seals are:

- ordered authoring-region registry:
  `a8b56d60dd0de31c3db76375aeb8a66eb8eff6d422be26bacbe5396c4ba8f28c`;
- sorted primary-source ownership registry:
  `63bf03a986d2755ead9306e4124ecf0cdabb87e7bc99ef9ba447c044c1f00519`;
- sorted bake-ownership registry:
  `54b8b40002853b93cf213c5a06f22af485f03191d4cff99bb6495e07bd8dad7c`.

Independent hashes sealed in the approval and verified against current checked-in bytes are:

| Domain | SHA-256 |
| --- | --- |
| Canonical crop manifest JSON | `c3ff227bef6206d2677e0bf42aa2c91b647ea6412428451ec5dbcf72975d3cca` |
| Canonical bake-ownership JSON | `b5a51c65596eb2798d8b88223738b7aae5d596c5c9ce9e50150859e92a87e198` |
| Exact `.gitattributes` byte domain | `0cf1316ca427ce34ff4480a8ce9f7d78bcaf9305b40ad7b699b8a4891ce80997` |
| Persisted approval source | `6cb3593d3ec396662d8a710e4826499cfa15b5b99a494df19a556253259a6193` |

The gameplay fingerprint also includes these current source-file hashes:

| Source | SHA-256 |
| --- | --- |
| `src/lib/game/content/maps/meadow-entry.ts` | `04570276f24ba6c9f86d94dca567826d1dd2eec11eec6cdb758ccf18065cc0fe` |
| `src/lib/game/content/maps/regions/village.ts` | `906d5cbb498f91ba233c52bdd5bce4006b3d88c39caeaee8772efce290fe8a10` |
| `src/lib/game/content/maps/regions/wildwood.ts` | `b37d24a7dde2f6c4cb2175034a8419ad69dea0d049ddb46f9395027ebdf8412d` |
| `src/lib/game/content/maps/regions/mistfen.ts` | `d415e0ef61e3f6fb828f86b3f1b844d0f41c8069e273c4c85331e84336bce7f8` |
| `src/lib/game/content/maps/regions/silverpine.ts` | `e420c013392e624538a72a9a7073bba2c6ac3ca344c15f8307ad52bd1717596b` |
| `src/lib/game/content/maps/regions/coast.ts` | `724b131eb3f076c0a5cf17aa5894e034ce119305ef0e126081e10779f9676b01` |
| `src/lib/game/content/maps/regions/crossroads.ts` | `5fd7898f55b7f8c55c9d489a27291721027972df3451afe9d1dba6f89f39887c` |
| `src/lib/game/content/maps/regions/paths.ts` | `cdd5ab59707a1e829cc0bb679703f76a265e87279d174418f3bf0ae45ab243f7` |
| `src/lib/game/save/save-state.ts` | `6198f56bd219f0233d697f103bba548b53f1c40d20ac58b55f7cfbd44025daaa` |
| `src/lib/game/core/collision.ts` | `18b5cacc81d1ddf568a8bdc966327fd9946831a918104c766fe2a6d0ad8bd13d` |

## Crop, handoff, and coverage contract

The current generated crop manifest records:

- `12` approved crops: `11` required regional/connector crops plus `1` reviewed base-only edge
  crop;
- `2` base-only crops and `10` base-and-foreground crops;
- `25` exact half-open pair overlaps;
- `25` route mouths: `10` on the `x` shared axis and `15` on `y`, each with at least `128px`
  on its declared axis;
- `3` base-only and `22` base-and-foreground overlap policies;
- `20` non-empty three-crop intersections;
- `1` approved corner group, `corner-meadow-entry-handoff-network`, referenced by `24` overlap
  records and coherently owning all `20` triple intersections;
- `179` disjoint runtime coverage entries: `152` baked and `27` fallback-tile.

The two explicit world-edge clamps, and no others, are:

| Crop | Pre-clamp bounds | Sides | Approved bounds | Reason |
| --- | --- | --- | --- | --- |
| `tidewatch-coast` | `{ left: 2656, top: 4320, right: 6528, bottom: 6528 }` | `right`, `bottom` | `{ left: 2656, top: 4320, right: 6400, bottom: 6400 }` | Tidewatch Coast reaches the east and south world edges; only its reviewed 128px expansion is clamped. |
| `wildwood` | `{ left: 3712, top: 128, right: 6528, bottom: 5056 }` | `right` | `{ left: 3712, top: 128, right: 6400, bottom: 5056 }` | Wildwood reaches the east world edge; only its reviewed 128px expansion is clamped. |

This is `2` clamped crops and `3` declared clamp sides. Candidate derivation, exact overlap,
route-mouth, owner, plane-policy, crop metadata, and corner tables are frozen in the canonical
crop manifest and independently checked by the focused suites.

Area accounting closes exactly:

| Measure | Value |
| --- | ---: |
| World area | `40,960,000px²` |
| Sum of crop areas, including repeated overlap pixels | `54,140,928px²` |
| Baked/base-crop union area | `35,345,408px²` |
| Fallback-tile area | `5,614,592px²` |
| Duplicate export overlap area | `18,795,520px²` |
| `exportAreaRatio` | `1.3218` |
| Unexplained area | `0px²` |
| Overlapping runtime coverage area | `0px²` |
| Baked sources not contained by one named base crop | `0` |

The only runtime coverage reasons are exact reviewed strings:

> Existing meadow-entry tile rendering remains the deliberate fallback outside approved baked
> crop coverage.

> Southwest ocean remains fallback tile: the collision-only ocean blocker relies on its paired
> sea ground patch, and the existing sea tile covers this reviewed margin outside regional crops.

The two corresponding source-level fallback-only resolutions are:

- `blocker:sundrop-southwest-ocean`: “The ocean blocker is collision-only; its paired sea ground
  patch remains visual fallback outside every regional runtime crop.”
- `ground-patch:sundrop-southwest-ocean-patch`: “The reviewed southwest margin is outside every
  regional runtime crop; the existing sea tile remains visible fallback coverage.”

All `360` ownership entries remain explicit. Current HPA-406/runtime obligations are `75`
`existing-blocker-fallback`, `69` `extend-decor-fallback`, `6` `extend-fence-fallback`, `78`
`remain-live`, `119` `fallback-tile`, and `13` `none`.

Budget evidence is metadata approval, not evidence that exports exist:

| Budget | Review bytes | Hard bytes |
| --- | ---: | ---: |
| Aggregate base | `176,006,422` | `266,316,498` |
| Aggregate foreground | `55,044,791` | `110,089,579` |
| Aggregate package | `231,051,213` | `376,406,077` |

## Git LFS materialization

- Storage mode: `git-lfs`.
- Git LFS version: `git-lfs/3.7.1 (GitHub; darwin arm64; go 1.25.3)`.
- Asset pattern: `artifacts/meadow-entry/hpa-399/**/*.png`.
- Proof pattern: `docs/superpowers/reports/img/hpa-399/proofs/**/*.png`.
- Canary: `artifacts/meadow-entry/hpa-399/lfs-canary.png`.
- Index pointer OID: `sha256:2fe8e6c2a228cc8932b1a02ef77d563dddc0618eb038ea3ea29338b35f37fdc6`.
- Pointer size: `91` bytes.
- Local LFS object/working-tree PNG SHA-256:
  `2fe8e6c2a228cc8932b1a02ef77d563dddc0618eb038ea3ea29338b35f37fdc6`.
- Materialized canary: PNG signature, Sharp `1x1`, transparent alpha zero.
- Independent local result: `git lfs fsck` reported `Git LFS fsck OK`.
- CI materialization: [GitHub Actions CI run 30657562782](https://github.com/cwchanap/Gliese/actions/runs/30657562782),
  currently `completed` / `success`, verified on `2026-07-31`. Its successful `Build & Lint`
  job ran “Verify Meadow Entry Git LFS storage” after `actions/checkout@v4` with LFS enabled at
  canary commit `5a7bf01d9980d32dd52d468d9b0ed6a5b1987ac8`.

## Predecessor integrity

The current HPA-307 artifact bytes independently hash to the predecessor values embedded in the
control manifest:

| HPA-307 artifact | SHA-256 |
| --- | --- |
| `village-art-control-manifest.json` | `8dc8349aa3ac4581ee1e2ce143e5b69f9497ec1a0c2610f72fe1647382ade6e3` |
| `village-art-control.svg` | `d31dfc7421d42f8925ef881edb99c28a0a9daa638b2d3a6f2df0b0be047806f5` |
| `village-building-entrance-mask.svg` | `9df14228c474a811fc2e59a3b412a4269e1605ac4dd57e7797402d19dd28ebaf` |
| `village-composed-collision-mask.svg` | `445923c3cead0dcfbf26f16f1819d761420b830e9e26a838b5a1dc52e77bf4d9` |
| `village-forbidden-tall-mask.svg` | `44f18ff3f85ec017d42ece0bb28102aadadceac53a00bc7d8f6338467bdecd48` |
| `village-layered-collision-mask.svg` | `d5bf78d332700d46e62759997e6f60fcd58724c9f8e51df616f7a160d405fc57` |
| `village-object-anchors.svg` | `0e58af6e9ad55eaed57eb1daad16d31e910ee368bfac0661c4076af68f70dd4f` |
| `village-region-mask.svg` | `ec9c4482b6b7b738b22a430bce5d59a06a9bc3955f4670d400fc6d10a54fb556` |
| `village-terrain-path-mask.svg` | `462391dd7e6a7dddf836d9bd4d9967578d1e9b112a293e942c4b85ac66424181` |

The current HPA-398 approval and production PNG bytes independently match:

- control fingerprint:
  `8b3f80fdde4591465d90aca558ff747d3825939c5879fdadaf3c55e70cb3b4b2`;
- `public/game/assets/regions/sundrop-village-base.png`:
  `f1184b045c27c544ac18937a4f8ccfa12cd386319b1722be5d808aea8048ade6`;
- `public/game/assets/regions/sundrop-village-foreground.png`:
  `2d0a6703de1a404e49c0746f092a4c6f9f113ae17cd8bc35de635b5ec084ce45`.

No HPA-307 or HPA-398 predecessor byte was modified by this task.

## Validation commands

The gates ran in the required order on clean approval head
`3bb02f8fecd5223a601d997483516a0f5bab4e0d`:

1. `rtk bun run art:validate:meadow-entry-controls` — exit `0`; Git LFS attributes,
   pointer/materialization/fsck, PNG dimensions/alpha, and read-only exporter passed; `10` test
   files and `68` tests passed at combined fingerprint `4c238c40…`.
2. `rtk git diff --exit-code` — exit `0`; no output.
3. `rtk git lfs fsck` — exit `0`; `Git LFS fsck OK`.
4. `rtk bun run check` — exit `0`; `svelte-check` found `0` errors and `0` warnings.
5. `rtk bun run lint` — exit `0`; Prettier reported all matched files use its style and ESLint
   exited cleanly.
6. `rtk bun run test:unit -- --run` — the first sandboxed attempt ran `66` files / `910` tests
   successfully but exited `1` after the environment denied Vitest's browser listener on
   `::1:63315` with `EPERM`. The exact command was rerun with localhost-listener permission and
   exited `0`: `69` files and `981` tests passed. Vite emitted a dependency-optimization reload
   advisory; no test failed.
7. `rtk bun run build` — exit `0`; Vite built `195` modules. The existing Phaser chunk-size
   advisory was non-fatal.
8. `rtk bun run build:tauri` — exit `0`; strict story validation checked `6` beats and compiled
   `12` dialogue blocks, Tauri-mode Vite built `194` modules, and the frontend-prose assertion
   reported no migrated story prose in `dist/`. The existing Phaser chunk-size advisory was
   non-fatal.

`bun run tauri build` was not requested and did not run. This report therefore makes no Tauri
packaging, signing, installer, native-host launch, or physical-device claim.

## Scope boundary

HPA-399 supplies reviewed source partitions, bake/live/fallback ownership, exact crops and
handoffs, deterministic authoring controls, approval, storage proof, and validation evidence. It
does not contain the image-authoring outputs or runtime work that consume those controls:

- no Meadow Entry regional master PNGs;
- no regional base or foreground export PNGs;
- no native proof PNGs;
- no Phaser asset registration or render-path integration;
- no collision, transition, quest, encounter, save-schema, or map-semantics change;
- no claim that HPA-406 fallback obligations are implemented;
- no Tauri application package or native runtime acceptance proof.

PR 2 may begin only after review accepts the exact partitions and outlier resolutions,
bake/fallback ownership and HPA-406 obligations, crop/overlap/route-mouth/clamp/corner tables,
zero unexplained coverage, Git LFS materialization, approved fingerprint, and the clean gates
recorded above.

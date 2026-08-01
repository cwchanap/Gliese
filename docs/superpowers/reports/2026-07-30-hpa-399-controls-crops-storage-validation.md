# HPA-399 Controls, Crops, and Storage Validation

## Result

The reviewed HPA-399 Meadow Entry authoring/control/storage contract is validated at source
commit `69753dccb8a7d62c3742213571a8f5a2ca7859b4` with the validator-hardening fix wave below.
The checked-in controls are current, the approval
matches independently rendered source contracts and checked-in bytes, Git LFS storage is intact,
runtime coverage has no gap or overlap, and every requested repository gate exits `0` on the
clean committed head (the `git diff --exit-code` gate now passes, closing the evidence gap from
the previous wave).

This report records authoring evidence only. It does not approve or include regional master PNGs,
regional base/foreground exports, native proof PNGs, runtime integration, save changes, map
changes, or Tauri application packaging. Those remain outside HPA-399; HPA-406 owns runtime
integration and the recorded decor/fence fallback obligations.

## Review and fingerprints

- Reviewer: `chanwaichan`
- Approval review time: `2026-08-01T06:43:07Z` (matches the persisted `meadowEntryControlsApprovalReview.reviewedAt`; the approval source is byte-identical to the previous sealed head)
- Evidence re-seal time: `2026-08-01T17:47:44Z` (when this report was regenerated at committed head `69753dc`; no approval value changed)
- Evidence path sealed by the approval:
  `docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md`
- Gameplay-source fingerprint:
  `25a670eb16e6bd19884f76c6df97196551bbd1cd3cf92f5d3b6a1180b8458b60`
- Authoring-contract fingerprint:
  `edf2084959761f987093bcd7a8aa33e270eea9426370cef615a791b2db55db4d`
- Combined-control fingerprint:
  `a877c70797d303dee292582b715d009dfccace19f769ebbef86230b1fd17f26d`
- Renderer/mask/material implementation SHA-256:
  `37a300647354b4c240f63e8787d46b8c64b66657c4e0e4ccbd21fb9f83c447a9`

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
  `ab6b356e2cc6ef9308dff6d950255c3aa1decffd8de157514ce97d0a7fe0ce79`.

Independent hashes sealed in the approval and verified against current checked-in bytes are:

| Domain | SHA-256 |
| --- | --- |
| Canonical crop manifest JSON | `c3ff227bef6206d2677e0bf42aa2c91b647ea6412428451ec5dbcf72975d3cca` |
| Canonical bake-ownership JSON | `30fed9270eea21bdf28d58f19cd84d5252e1b15d5beceb3b338e8bbc914a7a6a` |
| Exact `.gitattributes` byte domain | `0cf1316ca427ce34ff4480a8ce9f7d78bcaf9305b40ad7b699b8a4891ce80997` |
| Persisted approval source | `1ed71d31de81ac856e504a92983a1cf7d5794aa5b7aeb65b5c9d2865071ed142` |

## Validator hardening fix wave

This wave hardens the meadow-entry validators with four additional defensive checks and makes
the storage verifier's git runner injectable for testing, at committed head
`69753dccb8a7d62c3742213571a8f5a2ca7859b4`. No control data, crop manifest, bake ownership,
coverage, fingerprint, or approval value changed; only validation logic and tests changed.

1. **Duplicate cross-region coverage source keys are now rejected.**
   `validateMeadowEntryAuthoringLayout` tracks seen `sourceKey` values in
   `crossRegionCoverage` and throws on duplicates, preventing silent overwrite of one
   coverage record by another.
2. **Orphan cross-region coverage entries are now rejected.** Every
   `crossRegionCoverage` entry must be referenced by at least one cross-region resolution;
   entries not referenced by any resolution are reported as orphans.
3. **Split resolution bounds must be contained within source bounds.** Each split
   resolution's `bounds` is now checked against the covered source's own raster bounds via
   `containsBounds`, rejecting any split that escapes its source.
4. **Protected-live blocker dispositions now require a live runtime render mode.** A
   `protected-live` disposition on a `blocker` source now verifies that the blocker's kind
   resolves to `rendered-live` via `getBlockerRuntimeRenderMode`; `collision-only` blockers
   can no longer claim a protected-live visual obligation.
5. **Storage verifier `repositoryRoot` is injectable.**
   `verifyMeadowEntryArtStorage` now accepts a `repositoryRoot` parameter (defaulting to
   `process.cwd()`) and threads it through a `runGitIn(root)` closure, and
   `approveMeadowEntryControls` passes its own `repositoryRoot` through. This enables
   isolated tests that point at a temporary repository root.
6. **Test hygiene.** Test cases no longer mutate the shared
   `MEADOW_ENTRY_CROSS_REGION_COVERAGE` data, preventing cross-test interference.

The focused suite grows from `182` to `187` tests (`11` files) and the full unit suite from
`1092` to `1097` tests (`70` files). The combined-control fingerprint remains
`a877c70797d303dee292582b715d009dfccace19f769ebbef86230b1fd17f26d`; the gameplay-source
fingerprint, authoring-contract fingerprint, renderer implementation SHA-256, all independent
review seals, all canonical JSON hashes, the crop/coverage/ownership tables, and the approval
source are byte-identical to the previous sealed head `12885bc…`.

## Review item fix wave

This wave resolves the five code-review items on PR
`codex/hpa-399-controls-crops-storage`:

1. **Blocker renderer is now part of the sealed source surface.** The runtime
   `blocker-rendering.ts` contract (`ocean` → `collision-only`, all other kinds →
   `rendered-live`) was missing from `MEADOW_ENTRY_CONTROL_SOURCE_FILE_PATHS`; it is now hashed,
   so the combined-control fingerprint changes whenever the runtime visual/collision contract
   changes. The gameplay-source fingerprint and the table below therefore include it.
2. **Water-edge ocean blockers no longer claim a live visual.** `coast-sea-wall`,
   `mistfen-pool-east-blocker`, and `mistfen-pool-west-blocker` were baked `base-static` with
   `existing-blocker-fallback`, but their kind is `ocean`, which the runtime renders
   collision-only (no live blocker visual; WorldScene skips them). They now use
   `runtime-fallback-only` + `fallback-tile`, matching the `sundrop-southwest-ocean` precedent,
   and `validateMeadowEntryBakeOwnership` now rejects any baked blocker whose runtime render
   mode is not `rendered-live`. Runtime obligations move from `75` to `72`
   `existing-blocker-fallback` and from `119` to `122` `fallback-tile`; the crop manifest,
   route mouths, and runtime coverage are byte-identical because the paired sea ground patches
   already carried the visuals.
3. **Cross-region coverage bounds are now source-bounded.** Every declared bound must remain
   inside the covered source's own raster bounds (in addition to the world and a secondary
   region), and every declared secondary region must contain at least one declared bound.
   All six reviewed records satisfy both contracts; the validators are defensive against drift.
4. **Overlap owner and plane policies are now semantically pinned.** `validateOverlaps`
   requires `ownerCropId` to be one of the pair and the higher-`drawOrder` crop, requires
   `base-and-foreground` exactly when both crops carry foreground planes, and requires
   `base-only` otherwise. The reviewed table was already derived by this rule; the validator
   now rejects drift.
5. **Approval is self-contained and evidence is current.** `approveMeadowEntryControls` now
   runs `verifyMeadowEntryArtStorage()` (Git LFS attributes, pointer index state,
   materialized-canary PNG, Sharp 1×1 transparent alpha, `git lfs fsck`) before reading or
   publishing approval values. The approval and this report are re-sealed at committed head
   `12885bc68d6ff7bdcd08c654dad44fea39b69289` with a clean `git diff --exit-code`; the
   fingerprint, counts, and gates below are the current ones.

The gameplay fingerprint now includes these current source-file hashes:

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
| `src/lib/game/content/maps/blocker-rendering.ts` | `d954110dc507d59656a21ee58bd5a1095304ed0d5b2c9db98fd09f4fc2e38223` |
| `src/lib/game/save/save-state.ts` | `6198f56bd219f0233d697f103bba548b53f1c40d20ac58b55f7cfbd44025daaa` |
| `src/lib/game/core/collision.ts` | `18b5cacc81d1ddf568a8bdc966327fd9946831a918104c766fe2a6d0ad8bd13d` |

## Final review fix wave

The final review hardening uses one explicit Unicode code-point comparator for every canonical
object-key, source-key, nested SVG-attribute-key, and ID sort in the renderer/fingerprint module.
The normal exporter may repair missing allowlisted controls through its existing staged package
swap, while `--check` still requires the complete exact inventory; both modes reject extras and
non-files, and predecessor/outside destinations remain forbidden. Approval parsing and direct
module rendering both reject reviewer identities with leading or trailing whitespace.

The `18` controls and generated fingerprint module were regenerated twice. Both resulting
`19`-file SHA-256 inventories matched exactly. Relative to reviewed head
`4f9aa53e98ead3bebf44f41f519a5ef5f301169d`, exactly these two generated files changed:

| Generated file | Reviewed SHA-256 | Final SHA-256 |
| --- | --- | --- |
| `meadow-entry-control-manifest.json` | `822d1055c65300e9c18afd370c8b0c72691331bb03ea9835e10981f95fbdcb0f` | `49a3a03dc8e16d872b0bb8504960823114f94bd5768b70c0ce145994aae12b98` |
| `src/lib/game/content/generated/meadow-entry-art-control.ts` | `793a19f383b9cf949345ab538a3237e7294f8949948526501e66b5e0aa12f900` | `30ee9a05c4ecc16e9f704b0032350ec104d594a5d8838404f267b60d06ef61cc` |

The other `17` generated controls are byte-identical to the reviewed head. Thus the production
artifact ordering did not change for the current lowercase source inventory; the fingerprint
change comes from sealing the hardened renderer implementation. The gameplay-source fingerprint,
crop/bake/storage hashes, all predecessor hashes, and all crop/ownership/coverage facts remain
unchanged.

## Review fix wave

The follow-up code-review wave threads the explicit repository root into
`buildMeadowEntryControlInputs` (used by the exporter and approval entry points for artifact
loading, rendering, and fingerprint calculations), removes the crop-manifest module-load
validation side effect in favor of explicit validator calls at the exporter, approval, and
proposal entry points, and hardens the source catalog with a precomputed key map, a
discriminated `hasRectBounds` item union, and deep-frozen records. It also rejects fractional
ownership insets, compares predecessor margins by named keys, retains the full world-clamp
result in the proposal tool, disables persisted checkout credentials in CI, and applies JSDoc
plus test hardening. Only `meadow-entry-control-manifest.json` and the generated fingerprint
module changed because the combined fingerprint seals the renderer implementation; every SVG
mask, the crop manifest, bake ownership, predecessor, storage, and gameplay domains are
byte-identical to the reviewed head.

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

All `360` ownership entries remain explicit. Current HPA-406/runtime obligations are `72`
`existing-blocker-fallback`, `69` `extend-decor-fallback`, `6` `extend-fence-fallback`, `78`
`remain-live`, `122` `fallback-tile`, and `13` `none`.

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
- Checked-in LFS pointer blob SHA-256:
  `263509ae02962376215083d1177e2bc63477a39b6e5629ad0cf6dd707255bb83`; pointer blob size:
  `127` bytes.
- The pointer's `oid` field identifies referenced PNG object
  `sha256:2fe8e6c2a228cc8932b1a02ef77d563dddc0618eb038ea3ea29338b35f37fdc6`; its `size 91`
  field declares that referenced object's size, not the pointer blob's size.
- Referenced/materialized PNG object SHA-256:
  `2fe8e6c2a228cc8932b1a02ef77d563dddc0618eb038ea3ea29338b35f37fdc6`; object/working-tree
  size: `91` bytes.
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

The gates ran in the required order on the committed validator-hardening fix wave at clean head
`69753dccb8a7d62c3742213571a8f5a2ca7859b4`:

1. `rtk bun run art:validate:meadow-entry-controls` — exit `0`; Git LFS attributes,
   pointer/materialization/fsck, PNG dimensions/alpha, and read-only exporter passed; `11` test
   files and `187` tests passed at combined fingerprint `a877c707…`.
2. `rtk git diff --exit-code` — exit `0`; the working tree at the head above is clean, closing
   the pending-diff evidence gap from the previous wave.
3. `rtk git lfs fsck` — exit `0`; `Git LFS fsck OK`.
4. `rtk bun run check` — exit `0`; `svelte-check` found `0` errors and `0` warnings.
5. `rtk bun run lint` — exit `0`; Prettier reported all matched files use its style and ESLint
   exited cleanly.
6. `rtk bun run test:unit -- --run` — exit `0`: `70` files and `1097` tests passed. The browser
   suite's intentional console-error fixture was logged; no test failed.
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

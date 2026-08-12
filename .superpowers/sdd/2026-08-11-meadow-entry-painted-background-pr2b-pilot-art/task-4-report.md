# PR2b Task 4 — painted Meadow pilot assembly/export report

Status: `GREEN` pending the exact Task 4 commit. The five immutable Task 3
source panels are assembled into a transparent partial 6400×6400 master. The
existing painted-v2 exporter produced three opaque runtime crops, and the
existing proof renderer produced the six approved pilot proof pairs. Task 5
registry/preload/runtime wiring was not changed.

## RED evidence

Before production implementation, the required focused command was run:

```text
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts
```

Both suites failed at module resolution because the finalizer and CLI modules
did not exist (0 tests collected). The tests were retained and the production
assembler/CLI were then implemented against that RED.

## Implementation inventory

- `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts`
  validates the approved control fingerprint, panel manifests, canonical PNG
  bytes, dimensions, hashes, opaque source alpha, fixed bounds, and ascending
  priority. It writes only a transparent partial master outside the immutable
  panel union and records deterministic assembly provenance.
- `tools/finalize-meadow-entry-painted-v2-pilot.ts` provides the exact
  no-write `--check` path and atomic publication of the master, master
  provenance, and package `.assembly` provenance.
- Focused pure and CLI tests cover priority/overlap, outside transparency,
  dimension/hash drift, deterministic repeat output, check-mode no-write, and
  one-byte stale-master rejection.
- `.prettierignore` treats generated painted-v2 proof sidecars as byte-stable
  evidence, matching the existing controls policy; the proof renderer itself
  remains unchanged.

The approved controls fingerprint is
`35177cdb1bff05299ad1bd0b6759513cf2aa3bfbb87c368bfc749b2743fed4e4`.

## Source-panel inputs

All five source panel files and their manifests were read without mutation.
The assembler recorded the normalized PNG byte count/hash (and decoded RGBA
byte count) below:

| panel | bounds `(left,top,right,bottom)` | dimensions | priority | PNG bytes | normalized SHA-256 |
| --- | --- | ---: | ---: | ---: | --- |
| `sundrop-north` | `(256,3968,2880,5056)` | `2624×1088` | 10 | `6,901,740` | `3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9` |
| `sundrop-south` | `(256,4928,2880,6144)` | `2624×1216` | 20 | `8,355,861` | `b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f` |
| `hero-house-frontage` | `(384,5312,1280,6144)` | `896×832` | 30 | `1,934,578` | `9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b` |
| `village-crossroads-connector` | `(2592,4480,3392,4896)` | `800×416` | 40 | `888,497` | `6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2` |
| `crossroads` | `(2880,2816,4608,4768)` | `1728×1952` | 50 | `9,127,338` | `1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34` |

## Master and provenance evidence

The assembled master is
`artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png`:

- `6400×6400`, canonical RGBA PNG, `25,880,043` bytes
- SHA-256 `8f27680ad922ae4215476ae347b549c03143b120a94ed4064c64d96f6e2e5dbd`
- alpha: `31,811,584` transparent pixels, `9,148,416` opaque pixels,
  `0` translucent pixels
- outside the five fixed panel bounds: fully transparent; panel alpha is
  fully opaque; assembly policy is ascending priority, last owner wins

The generated master provenance is `29,993` bytes with SHA-256
`a6519968e17a831e1c3c4526499e5dac8dde182ef5faeb0aef25eaa8cd4e0ede`.
The root package provenance is `115,608` bytes with SHA-256
`53fb0444a49ab4f6e686570c3a4433af4f96c7434668f2dd27a8aa885cc55328`.

## Export/runtime evidence

`bun tools/export-meadow-entry-regions.ts` derived all outputs from the
assembled master and reported `measuredBaseBytes=24,693,448` against the
`67,108,864`-byte aggregate base budget. No foreground plane is active. Each
crop is opaque, within its fixed bounds/budget, and the runtime copy is
byte-identical to its package export:

| crop/export and runtime copy | dimensions | bytes | SHA-256 |
| --- | ---: | ---: | --- |
| `painted-v2-sundrop-village-base.png` | `2624×2176` | `14,671,076` | `0d1340681fb2911a370a7744c5e3970195c4a991f01ed081298eed5b1b38a02` |
| `painted-v2-village-crossroads-connector-base.png` | `800×416` | `895,034` | `754c2d4b93c6a44f8f21c0574586d53e387a58719d6492e3934c6df5b4d0e7b2` |
| `painted-v2-crossroads-base.png` | `1728×1952` | `9,127,338` | `1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34` |

All three export/runtime PNGs report `alpha_min=alpha_max=255` and zero
transparent/translucent pixels. The export provenance is `3,140` bytes
(`ee0207c4af024e2a3894945edc1f3a10a85135765efb3f8239f09cfe3d1cb1d0`), and
the crop manifest is `6,279` bytes
(`7f6c4c6fb4d86f7416c93190159730c46b40a101fa06f30a281d9ff32fe3bbb9`).

## Overlap/proof evidence

The exporter compared `267,264` overlap pixels across the two approved
base-only overlaps. Both overlap proof sidecars record zero differing pixels
and maximum channel difference zero:

- Sundrop/connector `(2592,4480)→(2880,4896)`, `119,808` pixels,
  owner `painted-v2-village-crossroads-connector`.
- Connector/Crossroads `(2880,4480)→(3392,4768)`, `147,456` pixels,
  owner `painted-v2-crossroads`.

The six proof PNGs were rendered and inspected at original detail (master
transparency, partial coverage, protected-live overlay, ownership overlay,
and both overlap proofs). Exact PNG evidence is:

| proof | dimensions | bytes | SHA-256 | alpha summary |
| --- | ---: | ---: | --- | --- |
| `pilot-assembly-master-transparency` | `6400×6400` | `25,880,043` | `8f27680ad922ae4215476ae347b549c03143b120a94ed4064c64d96f6e2e5dbd` | `31,811,584` transparent / `9,148,416` opaque |
| `pilot-assembly-base-coverage` | `4352×3328` | `25,497,421` | `3b2c0178f861001d4ea9e94a6c47b308a6db1bf0581b40197d4c74361271d838` | `5,335,040` transparent / `9,148,416` opaque |
| `pilot-assembly-protected-live` | `6400×6400` | `21,488,614` | `f8a40fa064d1939e8e81e8d323989e7eabd90e5f45b3418f4f3daf1fb7386d0a` | protected mask overlay; no translucent alpha |
| `pilot-assembly-ownership` | `6400×6400` | `20,658,595` | `7c39e00a472d0bbe1cceff413ec832ad0d5a817b0d7e620b10390f07de8b6183` | ownership overlay; no translucent alpha |
| `pilot-assembly-overlap-sundrop-connector` | `288×416` | `545` | `b3ccad0e5fa5f3d724d8ec31e53ff74d98c2887da85d7c111b4e1c50d7d52e00` | all-zero difference image |
| `pilot-assembly-overlap-connector-crossroads` | `512×288` | `652` | `6dac28c7f182626638c0dad56b1b41c37ca9d967e77f976758cc666b71809f41` | all-zero difference image |

## Verification

The exact finalize, export, and proof commands each succeeded, followed by
all three `--check` commands. The finalizer CLI test proves no writes on a
matching check and rejects a one-byte stale master with all mutation spies
untouched. The focused GREEN command passed `5` files and `100` tests. The
additional validation results are:

```text
bun run check       -> svelte-check: 0 errors, 0 warnings
bun run lint        -> Prettier and ESLint pass
git diff --check    -> pass
git check-attr      -> all generated PNGs report filter/diff/merge=lfs
git lfs version     -> git-lfs/3.7.1
```

## Commit/status/concerns

Commit: `b3b4a797da7c64e6a344f950feb7169dd890bfc2` (exact message
`feat(art): finalize painted Meadow pilot`).

Status: clean on `codex/hpa-586-painted-background-pilot` after commit.

Concerns: generated proof sidecars intentionally retain the renderer's
two-space JSON format and are excluded from Prettier reflow so `--check`
remains byte-stable. No Task 5 registry, preload, or gameplay runtime source
was changed. The approved source-panel bytes and generation history remain
unchanged.

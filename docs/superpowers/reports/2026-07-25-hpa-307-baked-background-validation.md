# HPA-307 Sundrop Village baked-background validation

## Status

Approved production master. Task 10 applies the controller-approved deterministic district
retouch described below to the original corrected continuous-ground master while preserving
all authored geometry. The original generated candidate history remains below as the
provenance of the stable retouch base. The automated browser fallback matrix also passes. A
headed Chromium run on the macOS reference device now
covers the complete keyboard-driven village route, all seven interior round trips, both
regional rewards, four exact save/reload checkpoints, scoped WebGL API-call observation, and
the enabled-versus-disabled frame-time gate. The corrected packaged Tauri application and
CI-mode DMG also build successfully, and an operator-observed window-only native smoke
records the baked village rendering in the packaged macOS app under the unchanged live
scene. Physical
gamepad/controller input, Tauri-specific frame profiling and renderer-capability
instrumentation, physical GPU residency/decode behavior, and subjective human feel remain
explicitly unclaimed.

## Task 10 district retouch (authoritative current production)

- Retouch tool: deterministic checked-in CLI `rtk bun run art:retouch:village`; no
  generative model or image-generation prompt was used.
- Stable source contract:
  `docs/superpowers/reports/img/hpa-307/village-background-retouch-base.png`.
- Stable source SHA-256:
  `20a3625640131917f18d1309b0c192f2cbdac5e4279fe9e6abb23c24c64859fd`.
- Stable source dimensions and format: `1792×1536`, opaque RGBA PNG, `6,794,867` bytes.
- Retouch algorithm: `sundrop-village-retouch-v3`,
  `same-coordinate-additive-rgb`.
- Geometry source: `sundropVillageLayered.layers.regions+paths`, `56×48` cells at
  `32` pixels per cell.
- Mask expansion: nearest-neighbor; district Gaussian sigma `48px`; authored-path
  Gaussian sigma `24px`; maximum path strength `0.4`.
- Edge guard: linear fade over `96px`, zero strength at the canvas boundary, full strength
  at `96px`; all four boundary rows/columns remain byte-identical in decoded RGB.
- Maximum permitted absolute per-channel delta: `16`; observed maximum: `15`.
- Approved control fingerprint:
  `0c47a7dc58d48e87fa9dd9c290cf6835b8acc3f4eb60a4e2c1ba4eae37e4ed33`.
- Stable provenance:
  `docs/superpowers/reports/img/hpa-307/village-background-retouch.json`.
- Controller-approved opaque retouch output: `7,311,554` bytes, SHA-256
  `ba4f3ce170b8f40aabf1c81f83ce496436c1f6ea7e151401b221c5ae6e29cbf5`.
- Reproducibility stop-check: a fresh run from the stable source was byte-identical to the
  controller-approved output above.
- Native retouch dimensions: `1792×1536`, opaque RGBA.
- Identity normalization crop: `x=0`, `y=0`, `width=1792`, `height=1536`.
- Normalized dimensions: `1792×1536`; uniform scale: `1`.
- Normalized master:
  `/private/tmp/hpa-307-village-normalized-revision.png`, SHA-256
  `627ac9c1ccdffb02dd270c354cdf17f09817a0863ebfa90504f5e3ccf2fd8413`.
- Transform record:
  `docs/superpowers/reports/img/hpa-307/village-background-transform.json`.

### Exact deterministic retouch directive

```text
No generative prompt. Apply the checked-in sundrop-village-retouch-v3 same-coordinate
additive RGB profile to the stable approved base: H=(+15,+4,-9), P=(-12,+6,+15),
M=(+11,-5,-11), N=(-10,0,+11), G=(-6,+4,+14), S=(-7,+7,+10),
E=(+15,-2,-10), C=(0,0,0). Derive feathered district and path weights exclusively
from sundropVillageLayered.layers.regions+paths; cap authored-path strength at 0.4;
fade strength linearly to zero at every canvas boundary across 96 pixels; change only
same-coordinate RGB; preserve opaque alpha and exact 1792×1536 geometry.
```

### Executed Task 10 production commands

```sh
rtk bun run art:retouch:village -- --output /private/tmp/hpa-307-village-retouched-opaque-v3-reproduced.png --provenance-output docs/superpowers/reports/img/hpa-307/village-background-retouch.json
rtk shasum -a 256 /private/tmp/hpa-307-village-retouched-opaque-v3-reproduced.png /private/tmp/hpa-307-village-retouched-opaque-v3.png
rtk cmp /private/tmp/hpa-307-village-retouched-opaque-v3-reproduced.png /private/tmp/hpa-307-village-retouched-opaque-v3.png
rtk bun run art:normalize:village -- --input /private/tmp/hpa-307-village-retouched-opaque-v3-reproduced.png --output /private/tmp/hpa-307-village-normalized-revision.png --transform-output docs/superpowers/reports/img/hpa-307/village-background-transform.json --crop-x 0 --crop-y 0 --crop-width 1792 --crop-height 1536
rtk bun run art:finalize:village -- --input /private/tmp/hpa-307-village-normalized-revision.png --output /private/tmp/hpa-307-village-final-tier0.png --tier 0
rtk bun run art:finalize:village -- --input /private/tmp/hpa-307-village-normalized-revision.png --output /private/tmp/hpa-307-village-final-tier1.png --tier 1
rtk bun run art:finalize:village -- --input /private/tmp/hpa-307-village-normalized-revision.png --output /private/tmp/hpa-307-village-final-tier2.png --tier 2
rtk bun run art:finalize:village -- --input /private/tmp/hpa-307-village-normalized-revision.png --output /private/tmp/hpa-307-village-final-tier3.png --tier 3
rtk bun run art:evidence:village
```

All four tiers were generated independently from the untouched normalized master and
inspected at native resolution:

| Tier | Bytes | Review target | Hard limit | SHA-256 |
| ---: | ---: | --- | --- | --- |
| 0 | 7,601,173 | exception required | pass | `3933829f19e7eab4b26ba2d31c7a0cfac25d4fae0a16196893fac6dbf02187c1` |
| 1 | 6,939,185 | exception required | pass | `e1cfd92231412b6866788337ad83016ba0c253dd78a13b9b9c8deebe39712265` |
| 2 | 5,126,066 | exception required | pass | `9a02b928fda573c4bdbe45a59a9f6b4694564a272869883742eee8013353a44f` |
| 3 | 3,448,834 | pass | pass | `6bd51d6893cb4a92b3f9cc787aec2f7be8dd1a0a321d5807904654234b4acd4c` |

Tier 0 is the lowest finalizer tier, is visually clean at native resolution, and remains
below the `8,388,608`-byte hard limit. It was therefore selected without accepting the
additional quantization of a higher tier. The explicit over-`4,194,304`-byte exception is
retained to preserve the approved district separation and detailed grass, worn road,
cobblestone, flowers, and flat foundation treatment.

### Final production bytes

- Runtime asset:
  `public/game/assets/regions/sundrop-village-background.png`.
- Selected quantization tier: `0`.
- Final byte count: `7,601,173`.
- Review target: exception required because the asset is above `4,194,304` bytes.
- Hard limit: pass; the asset is below `8,388,608` bytes.
- Final SHA-256:
  `3933829f19e7eab4b26ba2d31c7a0cfac25d4fae0a16196893fac6dbf02187c1`.

## Original production provenance (historical base)

- Production tool: Codex built-in `image_gen`.
- Authoritative reference:
  `/private/tmp/hpa-307-village-art-control.png`, rasterized from
  `docs/superpowers/reports/img/hpa-307/village-art-control.svg`.
- Original production control fingerprint (schema v1):
  `bdf8bcd17edd6f8878debd97c55bcc72736dac7e65830130e9191753c9cf2db4`.
- Final approved control fingerprint after the conservative-mask review (schema v2):
  `cf2901101b542e2d5f412f039598f33d11b3aa93769164e1ab15fd7120c01104`.
- Initial generated output:
  `/Users/chanwaichan/.codex/generated_images/019f9b51-72b6-7591-83a3-49ac92dc6ec1/call_xdyLYrWkdy0tWdzG115e3G7p.png`.
- Initial generated output disposition: rejected before finalization because it rendered the
  control's dark negative space as opaque trenches and repeated raised footprint curbs.
- Selected edited output:
  `/Users/chanwaichan/.codex/generated_images/019f9b51-72b6-7591-83a3-49ac92dc6ec1/call_O4f77Aqg8J0PSN7ZtLAS5FVP.png`.
- Stable selected native candidate:
  `/private/tmp/hpa-307-village-generated-candidate.png`.
- Selected native dimensions: `1355×1160`, opaque RGB PNG.
- Reviewed exact-ratio crop: `x=2`, `y=1`, `width=1351`, `height=1158`.
- Normalized output: `1792×1536`, fully opaque RGBA PNG.
- Uniform scale: `1.3264248704663213`.
- Normalized master:
  `/private/tmp/hpa-307-village-normalized-opaque.png`.
- Transform record:
  `docs/superpowers/reports/img/hpa-307/village-background-transform.json`.

### Exact initial production prompt

```text
Use case: stylized-concept
Asset type: production-ready JRPG regional baked ground background master
Input images: Image 1 is the exact authoritative rasterized composition and gameplay-control reference. Preserve its complete map framing, proportions, every route, doorway approach, transition throat, reward pocket, and all four edge handoffs. Do not redesign or reinterpret the geometry.
Primary request: Create one complete orthographic top-down JRPG village GROUND master for the entire map, using Image 1 as a strict layout/control reference.
Style/medium: richly hand-painted 2D JRPG environment ground art, clean orthographic top-down view, cohesive production-game finish, no perspective tilt.
Composition/framing: exact 7:6 composition containing the entire referenced map from edge to edge; no crop of any route or edge handoff; no frame, border, margin, caption, or UI.
Lighting/mood: warm, welcoming lush village ambience with soft upper-left daylight; readable gameplay contrast.
Color palette: warm natural greens, golden packed earth, muted stone, gentle seasonal amber and rust accents near the shrine garden.
Materials/textures: varied grass, packed soil, organic cobblestone, worn tracks, subtle drainage and erosion, moss, low weeds, small flowers, garden-ground textures, shrine-season autumn accents, and subtle non-colliding low relief. Keep surface detail high only at non-walkable margins, foundation footprints, gardens, and boundary transitions; medium in yards and secondary open spaces; low and visually quiet on roads, plazas, doorway approaches, reward approaches, and transition throats.
Constraints: Ground-only baked layer. Preserve every control-mask route and negative-space corridor; every building doorway and transition approach must remain broad, clear, and unobstructed; preserve the reward pocket and every north, south, east, and west edge handoff exactly. Purple/dark building-footprint regions in the reference must remain ground/foundation treatment only because live buildings will render above them. Any colored markers are control annotations only and must not appear in the artwork. Keep all walkable path widths and junctions aligned with Image 1.
Avoid: any text, letters, labels, signs, logos, watermarks, false doors, buildings, roofs, walls, doors, NPCs, characters, pickups, treasure, trees, trunks, arches, fences crossing routes, collision-bearing props, wells, carts, statues, benches, tall plants, tall silhouettes, foreground objects, cast foreground occlusion, misleading obstacles, invented route cues, blocked approaches, added entrances, camera perspective, isometric angle, or cropped edge connections.
```

### Exact corrective edit prompt

```text
Use case: precise-object-edit
Asset type: production-ready JRPG regional baked ground background master
Input images: Image 1 is the edit target (the first generated village ground candidate). Image 2 is the authoritative gameplay-control reference only. The colored masks, dark navy/black negative spaces, footprint rectangles, markers, and annotations in Image 2 are abstract guidance and MUST NOT be copied as literal visible objects or voids.
Primary request: Edit Image 1 so EVERY pixel across the complete map becomes continuous natural flat ground terrain. Replace all dark navy/black voids, cutouts, trenches, gaps, and mask-colored areas with seamless grass, packed soil, organic cobblestone, worn tracks, low garden groundcover, or subtle drainage/erosion textures consistent with adjacent terrain. Remove every repeated raised stone rectangle, curb, bordered footprint box, wall-like outline, and raised foundation silhouette.
Critical invariant: Preserve the exact complete 7:6 orthographic composition, all route centerlines, intersections, open-space widths, doorway approaches, transition throats, reward pocket, and all four edge handoffs from Image 2. Preserve these controls through FLAT, LOW-CONTRAST material variation only, never through holes, walls, borders, curbs, or raised geometry. Building footprints may use only subtle flat foundation wear, flattened grass, packed-earth discoloration, or faint contact shadows that live buildings will fully cover.
Style/medium: richly hand-painted 2D JRPG ground art, clean orthographic top-down, cohesive continuous surface, warm lush palette, soft upper-left daylight.
Detail hierarchy: high detail at non-walkable margins, flat foundation wear, gardens, and boundary transitions; medium detail in yards and secondary open spaces; low quiet detail on roads, plazas, doorway approaches, reward approaches, and transition throats.
Constraints: ground-only baked layer; broad unobstructed routes and entrances; no invented obstacles or route cues; no collision-bearing visual language.
Avoid: any dark void, black/navy trench, cutout, empty hole, mask color, raised stone border, curb, wall, foundation box, enclosure, platform, building, roof, door, false door, NPC, pickup, tree, arch, fence, well, cart, statue, bench, tall plant, tall silhouette, foreground object, text, label, sign, logo, watermark, blocked approach, perspective tilt, or isometric geometry.
```

## Original production commands (historical base)

```sh
rtk bun run art:controls:village
rtk bun run art:rasterize:village -- --input docs/superpowers/reports/img/hpa-307/village-art-control.svg --output /private/tmp/hpa-307-village-art-control.png
rtk bun run art:normalize:village -- --input /private/tmp/hpa-307-village-generated-candidate.png --output /private/tmp/hpa-307-village-normalized-opaque.png --crop-x 2 --crop-y 1 --crop-width 1351 --crop-height 1158 --transform-output docs/superpowers/reports/img/hpa-307/village-background-transform.json
rtk bun run art:finalize:village -- --input /private/tmp/hpa-307-village-normalized-opaque.png --output public/game/assets/regions/sundrop-village-background.png --tier 0
rtk bun run art:finalize:village -- --input /private/tmp/hpa-307-village-normalized-opaque.png --output /private/tmp/hpa-307-village-tier-1.png --tier 1
rtk bun run art:finalize:village -- --input /private/tmp/hpa-307-village-normalized-opaque.png --output public/game/assets/regions/sundrop-village-background.png --tier 1
```

Tier 0 produced `8,395,802` bytes and was rejected atomically because it exceeded the
`8,388,608`-byte hard limit by `7,194` bytes. Tier 1 was generated independently from the
untouched normalized master, visually compared with that master, and selected as the
lowest visually acceptable tier.

## Pre-retouch production bytes (historical base)

- Runtime asset:
  `public/game/assets/regions/sundrop-village-background.png`.
- Selected quantization tier: `1`.
- Final byte count: `6,794,867`.
- Review target: exception required because the asset is above `4,194,304` bytes.
- Hard limit: pass; the asset is below `8,388,608` bytes.
- Final SHA-256:
  `20a3625640131917f18d1309b0c192f2cbdac5e4279fe9e6abb23c24c64859fd`.
- Budget disposition: Tier 1 preserves the approved fine grass, worn-road, cobblestone,
  flower, and subtle flat-foundation detail. More aggressive quantization was not required
  for the hard limit and would trade away reviewed surface nuance, so the explicit
  over-4-MiB exception is retained.

## Visual evidence

- Whole-map collision, entrance, anchor, and forbidden-tall overlay:
  `docs/superpowers/reports/img/hpa-307/village-background-alignment-whole.png`.
- Home Yard:
  `docs/superpowers/reports/img/hpa-307/village-background-home-yard.png`.
- Well Plaza:
  `docs/superpowers/reports/img/hpa-307/village-background-well-plaza.png`.
- Market/Blacksmith:
  `docs/superpowers/reports/img/hpa-307/village-background-market-blacksmith.png`.
- North Residences/Guild:
  `docs/superpowers/reports/img/hpa-307/village-background-north-residences-guild.png`.
- Shrine Garden/reward pocket:
  `docs/superpowers/reports/img/hpa-307/village-background-shrine-garden-reward.png`.
- East Gate/Crossroads:
  `docs/superpowers/reports/img/hpa-307/village-background-east-gate-crossroads.png`.
- Every building doorway/transition approach:
  `docs/superpowers/reports/img/hpa-307/village-background-doorway-transition-approaches.png`.
- North, south, west, and east edges:
  `docs/superpowers/reports/img/hpa-307/village-background-all-four-edges.png`.
- Schema-v2 conservative forbidden-tall reapproval overlay:
  `docs/superpowers/reports/img/hpa-307/village-background-forbidden-tall-v2.png`.

The original selected native candidate, normalized master, and final tier-1 PNG were
inspected with `view_image` during the initial production pass. Task 10 then inspected the
controller-approved v3 retouch, every finalizer tier at native resolution, and the refreshed
whole-map overlay, doorway sheet, edge sheet, and every named regional crop. The parent
visual gate rejected the first historical candidate, approved the corrected continuous-ground
base, and later approved the exact deterministic v3 retouch SHA before integration.

The final review found that schema-v1 classified each forbidden-tall tile by its center,
which could omit a tile containing a narrow traversable sliver. Schema v2 omits a tile only
when one composed exclusion rectangle covers the full `32×32` tile. The regenerated mask
adds the previously missing cell `(44,4)` at local `(1408,128)` and conservatively protects
all comparable boundary tiles. The schema-v2 mask and its yellow-on-master overlay above
were inspected at original resolution. At that review, the production PNG remained
byte-identical at
`20a3625640131917f18d1309b0c192f2cbdac5e4279fe9e6abb23c24c64859fd`; Task 10 preserves
that exact base and changes only same-coordinate RGB under the unchanged control fingerprint.
Because both the base and retouch contain ground treatment only and no tall silhouettes, the
expanded mask introduces no art conflict. Two independent focused re-reviews approved the
corrected control, fingerprint chain, unchanged base PNG, and explicit reapproval rationale.

## Visual acceptance

- Every pixel contains continuous natural terrain; there are no opaque mask voids,
  trenches, cutouts, raised footprint boxes, curbs, walls, or tall silhouettes.
- Live-building footprints use only flat soil/grass/cobble wear and remain under the
  authoritative footprint overlays.
- All seven doorway approaches are broad, readable, and free of baked obstacles.
- Collision and forbidden-tall overlays introduce no misleading baked route cue or
  collision-bearing ground feature.
- Home Yard, Well Plaza, Market/Blacksmith, North Residences/Guild, Shrine Garden/reward
  pocket, and East Gate/Crossroads retain readable low-profile material separation.
- All four edge strips remain continuous ground with the authored handoff geometry
  unobstructed.

## Task 9 reapproval: Home Yard scarecrow removal

- Removed live non-colliding decor ID `village-decor-38-19` (the Home Yard `scarecrow`)
  from the layered source; the Home Yard flower bed is now its only live accent.
- Approved control fingerprint changed from
  `cf2901101b542e2d5f412f039598f33d11b3aa93769164e1ab15fd7120c01104` to
  `0c47a7dc58d48e87fa9dd9c290cf6835b8acc3f4eb60a4e2c1ba4eae37e4ed33`.
- At Task 9, the committed production PNG remained byte-identical at
  `20a3625640131917f18d1309b0c192f2cbdac5e4279fe9e6abb23c24c64859fd`;
  Task 10 preserves those exact bytes at
  `docs/superpowers/reports/img/hpa-307/village-background-retouch-base.png`.
- Collision controls remain byte-identical: `village-layered-collision-mask.svg` is
  `d5bf78d332700d46e62759997e6f60fcd58724c9f8e51df616f7a160d405fc57`, and
  `village-composed-collision-mask.svg` is
  `445923c3cead0dcfbf26f16f1819d761420b830e9e26a838b5a1dc52e77bf4d9`.
- Fresh visual inspection of the unchanged PNG against regenerated control, object-anchor,
  building-entrance, and composed-collision overlays confirmed aligned routes and approaches,
  with no baked scarecrow or upright replacement.

## Automated validation

### Task 10 final gate matrix

- A fresh `rtk bun run art:retouch:village` read the stable checked-in base and regenerated
  `7,311,554` approved opaque bytes with SHA-256
  `ba4f3ce170b8f40aabf1c81f83ce496436c1f6ea7e151401b221c5ae6e29cbf5`; both the PNG and
  provenance JSON passed byte-for-byte `cmp` against the controller-approved output and
  checked-in provenance.
- `rtk bun run art:evidence:village` refreshed all nine static evidence PNGs successfully.
- `rtk bun run art:controls:village` regenerated all controls and retained fingerprint
  `0c47a7dc58d48e87fa9dd9c290cf6835b8acc3f4eb60a4e2c1ba4eae37e4ed33`.
- `rtk bun run art:validate:village` passed: 2 files, 21 tests, 0 failures.
- The explicit focused asset/control command passed: 2 files, 21 tests, 0 failures.
- The deterministic retouch suite passed: 1 file, 9 tests, 0 failures.
- `rtk bun run check` passed with 0 errors and 0 warnings.
- `rtk bun run lint` passed; Prettier and ESLint were clean.
- The finished runtime PNG remained tier 0, `7,601,173` bytes, SHA-256
  `3933829f19e7eab4b26ba2d31c7a0cfac25d4fae0a16196893fac6dbf02187c1`.

### Red evidence

- The first focused production-asset run failed exactly at the two absent approval gates:
  `public/game/assets/regions/sundrop-village-background.png` and
  `src/lib/game/content/approvals/sundrop-village-background.ts`. Vitest reported one
  failing test with both intended soft assertion failures.
- After the actual PNG and approval were present, the expanded independent test had three
  passing validations and one expected failure because the approval evidence report did not
  yet exist. Creating this report made that final assertion green.
- Tier 0 finalization was an expected production red: `8,395,802` bytes exceeded the
  `8,388,608`-byte hard limit, and the atomic finalizer left the runtime output absent.

### Green evidence

- `rtk bun run art:validate:village` passed: 2 files, 20 tests, 0 failures.
- `rtk bun run test:unit -- --run src/lib/game/content/sundrop-village-background.asset.test.ts src/lib/game/content/maps/layered/village-art-controls.test.ts`
  passed: 2 files, 20 tests, 0 failures.
- The independent asset test recomputed the live control fingerprint; matched the manifest,
  generated constant, and hand-maintained approval; decoded the exact committed PNG as
  `1792×1536` 8-bit truecolor RGBA; matched every alpha byte; proved monotonic edge normals
  with maximum adjacent jump no greater than `32`; enforced the target/exception and hard
  budget semantics; and matched the exact SHA-256.
- Final review regressions proved that the forbidden-tall mask includes partially traversable
  cell `(44,4)` and that the control schema/fingerprint advanced together to v2 /
  `cf2901101b542e2d5f412f039598f33d11b3aa93769164e1ab15fd7120c01104`.
- PNG validation now permits only canonical static output chunks in exact
  `IHDR → IDAT+ → IEND` order. Valid-CRC `gAMA`, private `vpAg`, and APNG `acTL` regression
  inputs are rejected; the committed production PNG was independently confirmed already
  canonical and therefore remains byte-identical.
- The two review-fix test files passed `50` tests, and a separate focused re-review passed
  `54` tests plus type checking and diff hygiene with no remaining actionable finding.
- `rtk bun run check` passed with 0 errors and 0 warnings.
- `rtk bun run lint` passed; Prettier and ESLint were clean.
- The final committed-tree gate reran `rtk bun run art:controls:village`; the generated
  fingerprint remained
  `cf2901101b542e2d5f412f039598f33d11b3aa93769164e1ab15fd7120c01104`, and the worktree
  remained clean after regeneration.
- The final complete unit gate passed 50 files and 814 tests. The first sandboxed attempt
  executed 743 passing assertions but could not launch Vitest's Chromium worker because
  macOS denied its Mach-port registration; the unchanged suite was rerun with browser-launch
  permission and exited cleanly.
- The final full Playwright gate passed all 17 scenarios in `48.0s`.
- Final Rust gates passed: `cargo fmt --all -- --check`, clippy across all targets and
  features with warnings denied, and 47 tests across four suites.

## Browser runtime evidence

### Automated Playwright matrix

Every regional-background capture used Chromium at an exact `1280×720` viewport. Before
navigation, the test injected a version-8 save for `meadow-entry` with the player at
`(624, 5776)`, facing up, level 1, 0 XP, 20 HP, and 3 attack. That position is two tiles
south of the hero-house door and inside the regional canvas. Canvas visibility plus the
visible `Menu` button was the ready-state gate.

The final focused command passed:

```sh
rtk bun run test:e2e -- --grep "regional background"
```

Result: `5 passed (12.8s)`.

The final full-suite command passed:

```sh
rtk bun run test:e2e
```

Result: `17 passed (53.0s)`.

The missing-asset case aborted the exact production request,
`/game/assets/regions/sundrop-village-background.png`, before navigation. It asserted one
scoped BootScene `console.error`, one exact WorldScene `console.warn` containing background
ID `sundrop-village-regional-background`, texture key `sundrop-village-background`, and map
ID `meadow-entry`, no duplicate targeted warning, no unexpected console error, and no
`pageerror`. Chromium's exact `Failed to load resource: net::ERR_FAILED` message is tolerated
only when its console location is the intercepted production URL; no broad network, Phaser,
resource, or console filter is used.

The first full-suite run exposed a test-order timing edge: the renderer diagnostic can be
forwarded immediately before `WorldScene.create()` emits the targeted warning. The test now
polls for that exact warning and still requires the one-element exact-message array. The
unchanged assertions then passed in the focused and full reruns.

### Captured browser diagnostics

The listener was installed with `page.addInitScript(...)` before navigation and used the
exported `REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT` constant plus a Playwright binding;
the production event-name string was not copied into the test and no production test hook
was added. Each JSON payload was attached to its Playwright result.

`regionalBackgroundLoadMs` is the measured window from the first regional-background queue
operation through Phaser's overall loader-complete callback. It is not isolated network
latency, GPU upload time, or a p95 measurement. The successful completion count is loader
file-completion bookkeeping, not a GPU-upload claim.

| Mode | Renderer | `MAX_TEXTURE_SIZE` | Load window (ms) | Successful completions |
| --- | --- | ---: | ---: | ---: |
| enabled | WebGL | 8192 | 422.7000000476837 | 1 |
| background off | WebGL | 8192 | 314.5 | 1 |
| collision overlay | WebGL | 8192 | 367.60000002384186 | 1 |
| background off + collision | WebGL | 8192 | 350.80000001192093 | 1 |
| intercepted load failure | WebGL | 8192 | 292.2000000476837 | 0 |

This local Chromium run observed a positive `MAX_TEXTURE_SIZE` of 8192. The automated
contract requires a positive WebGL value (or `null` for Canvas) but deliberately does not
encode the reference-device `>=1792` acceptance gate as a CI assertion.

### Reference-device headed-browser acceptance

#### Environment and method

The richer acceptance pass ran against commit
`764afd9bc5170758316be9f4ec2523b0a69c5410` with the production Vite preview. It used a
separate headed Chromium context for the save/reload route, background-enabled timing, and
background-disabled timing.

| Property | Recorded value |
| --- | --- |
| Host | macOS reference device |
| Browser | Chromium `147.0.7727.15`, headed |
| Viewport | `1280×720`, device scale factor `1` |
| Input | Playwright keyboard, bounded held-arrow bursts |
| Burst bound | adaptive `60–160 ms`, followed by a `50 ms` settle |
| Authoritative state | dispatch `gliese:hud-command` `{ type: "save" }`, then parse `gliese.save.v8` |
| Movement bound | at most 120 attempts per axis and a `9 px` waypoint tolerance |
| Ready gate | visible canvas and visible `Menu` button |

This is keyboard automation through the same input path used by the game. It is not evidence
for a physical gamepad or controller. Every movement burst was checked against the persisted
map ID, position, facing, and collected-pickup state; the controller did not infer success
from elapsed time or screenshot pixels.

#### Route coverage

The accepted route started at Home Yard, crossed the authored regional connections through
Well Plaza, Market/Blacksmith, Shrine Garden, North Residences/Guild, East Gate, and the
north Crossroads throat, then returned to East Gate. The final acceptance pass recorded:

| Measure | Result |
| --- | ---: |
| Ordered route legs | 43 |
| Held-key bursts | 297 |
| Authoritative saved states | 307 |
| No-progress snags | 0 |
| Interior round trips | 7 of 7 |
| Regional rewards | 2 of 2 |
| Final state | `meadow-entry (1832.0136, 4592.1696), right` |

Both `village-market-cache` and `village-shrine-cache` were present in the final saved
pickup set. The seven entered-and-exited interiors were:

| Sequence | Interior |
| ---: | --- |
| 1 | `item-shop` |
| 2 | `hero-house` |
| 3 | `shrine-of-aurora-interior` |
| 4 | `villager-house-2` |
| 5 | `villager-house-3` |
| 6 | `villager-house-1` |
| 7 | `guild-hall` |

#### Exact save/reload checkpoints

At each checkpoint the controller saved through the HUD bridge, reloaded the page, waited
for the game-ready gate, read `gliese.save.v8` again, and required exact equality of map ID,
floating-point coordinates, and facing. All four comparisons passed:

| Checkpoint | Exact state before and after reload | Reviewed screenshot |
| --- | --- | --- |
| Home Yard | `meadow-entry (624, 5776), up` | [Home](img/hpa-307/runtime-save-reload-home.png) |
| Well Plaza | `meadow-entry (940.2072000000002, 5307.935200000016), left` | [Plaza](img/hpa-307/runtime-save-reload-plaza.png) |
| Shrine Garden | `meadow-entry (1472.1287999999986, 5781.942399999996), left` | [Shrine](img/hpa-307/runtime-save-reload-shrine.png) |
| East Gate | `meadow-entry (1831.9464000000005, 4607.947200000011), up` | [East Gate](img/hpa-307/runtime-save-reload-east-gate.png) |

The checkpoint run necessarily made five exact regional-background requests: the initial
page plus four page reloads. That count is intentionally separate from the one-request
continuous-route observation below.

#### Route calibration record

The controller route was calibrated against persisted coordinates and the authored
collision geometry. These observations came from rejected tuning passes; the final
acceptance pass and both final timing passes completed with zero snags.

| Calibration observation | Accepted route handling |
| --- | --- |
| Moving west immediately after leaving `villager-house-3` could re-enter its combined `30 px` door trigger. | Move south to about `y=4946`, pass west of the trigger, then return north. |
| Staying on the south edge of the G-N connection stopped near `(1321.6128, 4946.4256)`. | Cross the house trigger on its south edge, rise near `y=4920`, then continue east through G-N. |
| The west shrine aisle met the padded stone-lantern edge near `(1118.9712, 5664.0616)`. | Use the clear authored aisle around `x=1100`. |
| A direct Crossroads approach met padded `corridor-wall-2b` geometry. | Use the authored throat at `x=1600`, west of the wall, to reach about `y=4320`. |
| One tuning run saw a transient first guild-exit no-progress state. | Refocus the canvas once and retry within the bounded controller; no retry was needed in final runs. |
| A strict millisecond-for-millisecond replay diverged at burst 153 because subpixel state drift reached a padded collision edge. | Reject that replay as the timing basis; run the same ordered 43-leg waypoint schedule with burst duration deterministically recomputed from each authoritative saved position. |

The timing comparison therefore matches route intent, waypoint order, state-readback
algorithm, and controller bounds. It does not claim that the two modes replayed one
identical recorded millisecond-level key log.

#### Continuous-route load and WebGL API observations

Instrumentation was installed before navigation. It listened for the production renderer
diagnostic, counted requests whose URL pathname exactly matched the production PNG, watched
`webglcontextlost`, and wrapped WebGL/WebGL2 `texImage2D` to retain only calls whose source
was exactly `1792×1536`.

| Continuous enabled route observation | Result |
| --- | --- |
| Exact production PNG requests | 1 |
| Renderer diagnostic events retained | 1 |
| Renderer / `MAX_TEXTURE_SIZE` | WebGL / `16384` |
| Loader window / successful file completions | `236.80000001192093 ms` / 1 |
| Filtered `texImage2D` calls | 1 WebGL call, 6 arguments, source `1792×1536` |
| WebGL context-loss events | 0 |
| Uncaught page errors | 0 |

The `texImage2D` result is an observed JavaScript WebGL API call, not proof of physical GPU
upload count, texture residency, driver allocation, or decode count. The background-off
mode also made one exact asset request and one matching API call because BootScene still
preloads the texture; disabling the regional sprite is a rendering toggle, not a loader
toggle.

#### Frame-time comparison

The requestAnimationFrame sampler was installed before navigation. After the game-ready
gate it discarded a 120-frame warm-up, reset its state, and then retained every frame
interval from immediately before the first route movement until the complete 43-leg route
returned to East Gate. No hitch samples or outliers were filtered.

The median is the ordinary sorted-sample median. The p95 uses the nearest-rank definition:
`sorted[ceil(0.95 × sampleCount) - 1]`.

| Mode | Route legs | Bursts | Snags | Samples | Median (ms) | p95 (ms) | Min–max (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| background enabled | 43 | 278 | 0 | 6470 | 8.300000000000182 | 10 | 6.3–26.5 |
| background off | 43 | 278 | 0 | 6441 | 8.300000000000182 | 10 | 6.3–26.7 |

`p95(enabled) - p95(off) = 0 ms`, which passes the `<=2 ms` browser reference-device gate.
This is a headed-browser result and is not a Tauri-renderer measurement or a subjective
human hitch assessment.

#### Raw acceptance artifacts

- [Browser acceptance summary](img/hpa-307/runtime-browser-acceptance-summary.json)
- [Acceptance route and checkpoint record](img/hpa-307/runtime-route-acceptance.json)
- [Enabled timing samples and route record](img/hpa-307/runtime-timing-enabled.json)
- [Background-off timing samples and route record](img/hpa-307/runtime-timing-off.json)

### Reviewed runtime captures

- [Baked background enabled](img/hpa-307/runtime-background-enabled.png)
- [Fallback tiles with background off](img/hpa-307/runtime-background-off.png)
- [Baked background with live collision overlay](img/hpa-307/runtime-background-collision.png)
- [Fallback tiles with live collision overlay](img/hpa-307/runtime-background-off-collision.png)
- [Fallback after intercepted background load failure](img/hpa-307/runtime-background-load-failure.png)
- [Home Yard after save/reload](img/hpa-307/runtime-save-reload-home.png)
- [Well Plaza after save/reload](img/hpa-307/runtime-save-reload-plaza.png)
- [Shrine Garden after save/reload](img/hpa-307/runtime-save-reload-shrine.png)
- [East Gate after save/reload](img/hpa-307/runtime-save-reload-east-gate.png)
- [Packaged macOS Tauri smoke](img/hpa-307/runtime-tauri-native-smoke.png)

All ten final PNGs were opened at original resolution with `view_image` before the reviewed
copies above were committed.

- The enabled capture shows the rich continuous regional terrain under unchanged live
  buildings, characters, props, and HUD.
- The off capture shows the tile fallback clearly across the same Home Yard camera view.
- The collision capture shows the translucent live collision regions, landmark footprint,
  and player-clearance circle above the baked background.
- The combined capture shows the same live collision geometry above fallback tiles.
- The load-failure capture shows fallback tiles, not Phaser's missing-texture placeholder;
  it is visually consistent with the background-off baseline while the canvas and HUD remain
  ready.
- The four checkpoint captures show the expected Home Yard, Well Plaza, Shrine Garden, and
  East Gate live scenes after reload, with the player visible, the HUD intact, and the
  persisted position aligned with live map content.
- The window-only packaged-app capture shows the baked Home Yard in the native macOS Tauri
  window at `1280×720`, below the live hero house, player, NPCs, landmark label, minimap, and
  Svelte HUD. It excludes unrelated desktop windows and notifications. The Retina capture
  was uniformly downsampled by 50% from `2696×1576` to `1348×788` for repository size,
  without cropping or non-uniform scaling.

The visible `Hero's House` landmark label is live `WorldScene.renderLandmarks(...)` output.
It appears in both baked and fallback captures and is not text baked into the regional
master.

## Native release and smoke evidence

The first exact release attempt exposed an ambiguous and incorrect multi-binary selection:
Tauri selected `src/bin/story_check.rs` as the packaged application. The package now sets
`default-run = "gliese"`. A release build without bundling then completed with the explicit
output:

```text
Built application at: src-tauri/target/release/gliese
```

The corrected exact `rtk bun run tauri build` proceeded through strict story validation,
the prose-free Tauri frontend build, optimized Rust compilation, and `Gliese.app` creation.
Its final DMG stage did not complete in this interactive automation environment. The
generated Finder cosmetic AppleScript mounted the read/write image successfully and then
waited without a timeout for `.DS_Store`; Tauri eventually exited the helper before DMG
compression. The generated script and project configuration were not patched.

Tauri's supported non-interactive path was then exercised:

```sh
rtk env CI=true bun run tauri build
```

That command passed and produced both bundles:

```text
src-tauri/target/release/bundle/macos/Gliese.app
src-tauri/target/release/bundle/dmg/Gliese_0.0.1_aarch64.dmg
```

In Tauri CLI 2.11.1, `CI=true` adds create-dmg's `--skip-jenkins` option. It skips only
Finder's cosmetic positioning/background phase; app bundling plus DMG
create/resize/mount/link/detach/compression still run. Final artifact checks confirmed:

- `CFBundleExecutable` is `gliese`, not `story_check`;
- `Contents/MacOS/gliese` is an arm64 Mach-O executable;
- `hdiutil verify` reports the final DMG checksum as valid;
- `hdiutil imageinfo` identifies a checksummed UDZO read-only zlib-compressed HFS+ image.

For the bounded native smoke, the operator launched that built `.app`, queried the Gliese
process window's configured bounds as `1280×720`, captured only its CoreGraphics window,
visually inspected the baked village under live scene objects and HUD, and issued the
normal application quit command successfully. The screenshot is visual presentation
evidence; the launch target, logical bounds, and quit result are recorded operator
observations rather than facts inferred from its PNG pixels.

Tauri also retains its existing warning that identifier `com.gliese.app` ends in `.app`.
That warning predates HPA-307 and did not prevent the corrected application or CI-mode DMG
from being built.

### Evidence boundary and remaining manual gates

The combined browser evidence now proves exact production-request interception, scoped
BootScene and WorldScene diagnostics, ready-state continuity, enabled/off and load-failure
presentation, keyboard traversal of the complete accepted route, all seven interior round
trips, both rewards, four exact save/reload checkpoints, one request and one observed
dimension-matched `texImage2D` API call over a continuous no-reload route, zero observed
context losses, and a `0 ms` enabled-versus-disabled p95 delta under the documented headed
Chromium method.

The captured evidence run also recorded generic Chromium console errors reading
`Failed to load resource: the server responded with a status of 404 (Not Found)`: four
across the save/reload acceptance context and one in each continuous timing context. The
collector did not retain a URL or console location, so this report does not attribute those
messages to a resource. All exact regional-background requests, renderer diagnostics, load
completions, route assertions, screenshots, and timing runs succeeded, and there were zero
uncaught `pageerror` events. A later short headed probe did not reproduce the 404 and saw
only Chromium WebGL `ReadPixels` performance warnings. This is a disclosed diagnostic
limitation, not a zero-console-error claim.

The following gates remain explicitly unclaimed:

- Tauri-specific renderer-capability diagnostics and a native runtime frame profile;
- physical GPU upload count, texture residency, driver allocation, or Canvas decode count;
- physical controller/gamepad traversal;
- subjective human assessment of movement feel, visible hitching, or re-upload behavior.

## Concerns

The approved tier-0 asset is `3,406,869` bytes above the 4 MiB review target. It remains
`787,435` bytes below the hard limit, and the explicit quality-based exception is recorded
in both the hand-maintained approval and this report. No geometry, route, doorway, reward,
edge-handoff, or baked-vs-live art concern remains after the corrected-candidate review.

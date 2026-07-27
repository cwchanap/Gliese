# HPA-307 Sundrop Village baked-background validation

## Status

**Task 11 result: `DONE_WITH_CONCERNS`.** The approved production master and all authored
gameplay controls remain byte-stable. The refreshed headed Chromium acceptance run against
commit `8923035babb0eb348b956661b545bd5c4f3b028e` covers the complete keyboard-driven
village route, six named districts, all seven interior round trips, both regional rewards,
four exact save/reload checkpoints, four save-injected edge inspections plus the traversed
north Crossroads continuation, five renderer/fallback modes, scoped WebGL API-call
observation, and the enabled-versus-disabled frame-time gate.

The exact ordinary `rtk bun run tauri build` is not green: it built the application bundle
and then exited `1` in the interactive Finder-cosmetics DMG helper. The supported
non-interactive `CI=true` path produced an arm64 application and a checksum-valid DMG, but
that does not satisfy the ordinary-command release gate. A bounded launch of the current
CI-built application created the Gliese process and completed WebKit resource loading, then
exited normally; System Events exposed zero windows, so this revision does **not** claim
current native visual acceptance. Physical gamepad/controller input, Tauri-specific frame
profiling and renderer-capability instrumentation, physical GPU residency/decode behavior,
and subjective human feel also remain unclaimed.

Visual review found no hard missing-texture boundary and all transition throats remain open,
but the material/value change from the rich baked village to the plain neighboring fallback
tiles remains noticeable, especially at the north and east edges. HPA-307 should therefore
remain incomplete pending manual/native acceptance and an explicit decision on whether that
cross-region fidelity shift is acceptable.

## Task 10 district retouch (authoritative current production)

- Retouch tool: deterministic checked-in CLI `rtk bun run art:retouch:village`; no
  generative model or image-generation prompt was used.
- Stable source contract:
  `docs/superpowers/reports/img/hpa-307/village-background-retouch-base.png`.
- Stable source SHA-256:
  `20a3625640131917f18d1309b0c192f2cbdac5e4279fe9e6abb23c24c64859fd`.
- Stable source dimensions and format: `1792×1536`, feathered RGBA PNG with the
  deterministic 64 px runtime alpha feather, `6,794,867` bytes.
- The retouch uses the source RGB at the same coordinates and replaces the feathered source
  alpha with `255` in the controller-approved opaque intermediate.
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

## 2026-07-26 correction: unrelated west map boundary restored

- The first follow-up mistakenly identified the full-height outer
  `meadow-west-boundary` tree line as the reported obstacle and shortened it from `6400 px`
  to `4320 px`.
- Further clarification established that the target was instead the small green village
  hedge overlay inside the baked region. The wrong-target boundary change is reverted:
  `meadow-west-boundary` again spans the authored full map height and renders all 134
  `forest-dressing/treeCluster` images.
- A renderer regression now preserves that complete outer boundary independently of the
  village-hedge render described below. Its collision, the remaining map boundaries, and
  the village room graph are unchanged from their pre-follow-up behavior.

## 2026-07-26 follow-up: village hedge overlay retained

- Further clarification initially identified the repeated
  `village-hedge/hedgeSegment` artwork laid over the baked background as an unwanted
  green tree-like obstacle, not the scarecrow or the separate west map-edge tree wall.
- The authored `#` collision cells compile to 23 `village-block-*` `garden-hedge`
  rectangles. `WorldScene` renders them unconditionally after the regional background,
  expanding them to 224 repeated hedge images; the Home Yard boundary accounts for 85 of
  those images. One four-segment corridor wall is also fully covered, so 228 hedge images
  in total overlay the baked region. The 15 external `corridor-wall-*` garden hedges
  remain visible as 101 segments.
- A covered-village-hedge suppression was attempted (commit `2307907`):
  `renderBlockers(...)` skipped the hedge sprite for `garden-hedge` blockers fully
  contained by a rendered regional background bounds. That suppression was reverted
  (commit `e32cfdc`) because the approved regional background is ground-only and depicts
  no hedges, walls, or tall silhouettes (per the production prompt's avoid list), so
  suppressing the live sprites left authored collision walls invisible: players would
  walk toward open ground and stop against unseen hedges, including the near-full-width
  southern boundary.
- Final behavior: `WorldScene` renders `garden-hedge` segments unconditionally in every
  mode (enabled, disabled, missing-texture, wrong-sized, collision overlay). All 228
  in-village hedge segments remain visible on top of the baked background; the four
  scene-suite assertions at `scenes.test.ts` (lines 2570, 2591, 2619, 2654) enforce this
  count. `renderRegionalBackgrounds(...)` renders only backgrounds whose textures exist
  and pass immutable dimension validation; background rendering no longer gates hedge
  rendering.
- Collision and navigation are unchanged: every compiled blocker remains in
  `meadowEntryMap.blockers`, continues to block player movement, remains available to the
  collision overlay and save normalization, and still contributes to the source-derived art
  controls.
- The renderer regression was written first and now covers the unconditional render, the
  228-segment in-village count, external-wall preservation, disabled/missing/wrong-sized
  fallback branches, and continued movement collision.
- The [Home Yard capture](img/hpa-307/runtime-district-home-yard.png) was regenerated
  from the reverted commit `e32cfdc` in `91f7858` (SHA-256
  `a5ccd62a2d8fd790269bf359880a2bdd219f7212208e5e48007970139a386cc5`, 1,120,286 bytes) and
  is distinct from the suppression-era capture at `2307907` (SHA-256
  `d4cf59984bce45fb53e8a439847be8de4e6a8feb90d43db146c61b75dbb55630`, 1,117,401 bytes). It
  is the current visual evidence and shows the 228 live hedge segments over the baked
  background, satisfying the design spec's Home Yard evidence contract.
- Current gates pass: the complete scene suite has 189 tests; the complete unit suite has
  51 files and 833 tests when run without file-level parallelism; the complete Playwright
  suite has 17 scenarios; art validation has 22 tests; Svelte check reports zero
  diagnostics; Prettier/ESLint, the browser build, and the strict Tauri frontend build with
  its no-story-prose assertion pass. Under default file parallelism, the unchanged
  PNG-provenance test exceeded its existing 5-second limit by 8–102 ms while competing with
  the rest of the suite; that same derivation passed in the focused art gate and in the
  serialized complete run.

## Automated validation

### Task 11 revision gate matrix

- `rtk bun run art:controls:village` passed and retained fingerprint
  `0c47a7dc58d48e87fa9dd9c290cf6835b8acc3f4eb60a4e2c1ba4eae37e4ed33`.
  All nine source controls plus the generated TypeScript output remained byte-identical
  before and after regeneration.
- The stable retouch base remained SHA-256
  `20a3625640131917f18d1309b0c192f2cbdac5e4279fe9e6abb23c24c64859fd`.
- The production PNG remained tier 0, `7,601,173` bytes, SHA-256
  `3933829f19e7eab4b26ba2d31c7a0cfac25d4fae0a16196893fac6dbf02187c1`.
- `rtk bun run art:validate:village` passed: 2 files, 21 tests, 0 failures.
- `rtk bun run check` passed with 0 errors and 0 warnings.
- `rtk bun run lint` passed; Prettier and ESLint were clean.
- The complete unit gate passed 51 files and 826 tests. A sandboxed attempt first completed
  48 files and 755 assertions before macOS denied the Chromium worker's Mach-port
  registration; the unchanged suite passed after browser-launch permission was granted.
  That passing unit gate includes fallback/warning coverage for both a missing texture and a
  `1700×1400` texture where the regional descriptor requires `1792×1536`.
- The focused regional-background Playwright gate passed 5 scenarios in `11.2s`; the full
  Playwright gate passed all 17 scenarios in `45.4s`.
- Rust gates passed: `cargo fmt --all -- --check`, clippy across all targets and features
  with warnings denied, and 47 tests across four suites.
- The exact ordinary `rtk bun run tauri build` exited `1` in `bundle_dmg.sh` after the
  application bundle was created. `rtk env CI=true bun run tauri build` passed and produced
  both bundles; the resulting DMG passed `hdiutil verify` and `hdiutil imageinfo`.

### Final whole-branch review follow-up

- Retouch publication now recomputes the complete current control fingerprint from the same
  shared input builder used by the deterministic exporter and approval test. Mask and
  non-mask gameplay-control drift both fail before provenance can be published.
- The production approval gate now re-derives the opaque retouch from the stable base,
  compares the committed provenance sidecar byte-for-byte, finalizes tier 0, and requires
  exact equality with the committed runtime PNG and approved SHA-256.
- PNG and provenance outputs must resolve to distinct paths. Both outputs are staged before
  either destination is replaced, so a failed second-stage write leaves the existing PNG
  untouched.
- `rtk bun run art:validate:village` now passes 2 files and 22 tests. The expanded retouch,
  approval, and art-control suite passes 3 files and 35 tests.
- The post-review complete unit gate passes 51 files and 830 tests. Its first full attempt
  reached 829 assertions before an unrelated BootScene dynamic-import test exceeded its
  5-second timeout; that test passed alone in `629 ms`, and the unchanged complete suite then
  passed in `38.66s`.
- A post-review Playwright run initially passed 15 of 17 scenarios after previewing the
  existing Tauri-mode `dist/`: the two story-dependent NPC cases correctly fell back to
  `Traveler / No dialogue is available` because that release bundle intentionally excludes
  the browser story fixture. Rebuilding with `rtk bun run build` restored the documented
  browser-E2E precondition. Both affected cases then passed in isolation, and the unchanged
  full suite passed all 17 scenarios in `46.5s`. No gameplay or E2E source change was needed.
- Independent whole-branch re-review found no remaining Critical or Important code finding.
  The save/reload PNG wording was also corrected: those images are pre-reload scene
  captures, while the machine-readable before/after records prove exact resumed state.

### Red evidence (historical implementation)

- The first focused production-asset run failed exactly at the two absent approval gates:
  `public/game/assets/regions/sundrop-village-background.png` and
  `src/lib/game/content/approvals/sundrop-village-background.ts`. Vitest reported one
  failing test with both intended soft assertion failures.
- After the actual PNG and approval were present, the expanded independent test had three
  passing validations and one expected failure because the approval evidence report did not
  yet exist. Creating this report made that final assertion green.
- Tier 0 finalization was an expected production red: `8,395,802` bytes exceeded the
  `8,388,608`-byte hard limit, and the atomic finalizer left the runtime output absent.

### Green evidence (historical implementation and review)

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
- The pre-retouch review gate reran `rtk bun run art:controls:village`; the generated
  fingerprint remained
  `cf2901101b542e2d5f412f039598f33d11b3aa93769164e1ab15fd7120c01104`, and the worktree
  remained clean after regeneration.
- The Task 10 complete unit gate passed 50 files and 814 tests. Its first sandboxed attempt
  executed 743 passing assertions but could not launch Vitest's Chromium worker because
  macOS denied its Mach-port registration; the unchanged suite was rerun with browser-launch
  permission and exited cleanly.
- The Task 10 full Playwright gate passed all 17 scenarios in `48.0s`.
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

Result: `5 passed (11.2s)`.

The final full-suite command passed:

```sh
rtk bun run test:e2e
```

Result: `17 passed (45.4s)`.

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

| Mode | Renderer | `MAX_TEXTURE_SIZE` | Exact requests | Load window (ms) | Successful completions |
| --- | --- | ---: | ---: | ---: | ---: |
| enabled | WebGL | 16384 | 1 | 308.19999998807907 | 1 |
| background off | WebGL | 16384 | 1 | 303.0999999642372 | 1 |
| collision overlay | WebGL | 16384 | 1 | 286.5999999642372 | 1 |
| background off + collision | WebGL | 16384 | 1 | 282.9000000357628 | 1 |
| intercepted load failure | WebGL | 16384 | 3 intercepted attempts | 247.69999998807907 | 0 |

This headed Chromium run observed a positive `MAX_TEXTURE_SIZE` of 16384. The automated
contract requires a positive WebGL value (or `null` for Canvas) but deliberately does not
encode the reference-device `>=1792` acceptance gate as a CI assertion.

### Reference-device headed-browser acceptance

#### Environment and method

The richer acceptance pass ran against commit
`8923035babb0eb348b956661b545bd5c4f3b028e` with the production Vite preview. It used a
separate headed Chromium context for the save/reload route, background-enabled timing, and
background-disabled timing. The reproducible controller is retained at
`docs/superpowers/reports/hpa-307-browser-acceptance.mjs`; it resolves the current repository
and commit at runtime, refuses dirty product paths outside the report/evidence tree, rejects
any production-background SHA mismatch, rebuilds `dist`, starts and owns a fresh
strict-port Vite preview, round-trips a unique marker through it, and byte-compares its
served production PNG before navigating. The generated JSON retains the exact build/start
commands, timestamps, preview PID/base URL, and served-asset hash. This prevents a stale or
unrelated preview from being labeled with the current source commit.

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
| Held-key bursts | 368 |
| Authoritative saved states | 378 |
| No-progress snags | 0 |
| Interior round trips | 7 of 7 |
| Regional rewards | 2 of 2 |
| Final state | `meadow-entry (1832.824799999999, 4604.085600000007), right` |

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

#### Edge-handoff inspection

The accepted route traversed the north throat into Crossroads and returned. For consistent
camera-centered visual inspection of every edge, a separate context injected bounded
version-8 save positions and read each position back before capture. Those four injected
positions are seam-inspection evidence, not traversal evidence:

| Edge | Requested state | Observed state |
| --- | --- | --- |
| North | `meadow-entry (1680, 4376), up` | exact |
| South | `meadow-entry (960, 5864), down` | normalized by live map loading to `meadow-entry (976, 5872), down` |
| West | `meadow-entry (280, 5200), left` | exact |
| East | `meadow-entry (2024, 5200), right` | exact |

The four approaches remain open. Alpha feathering avoids an abrupt missing-texture edge,
but visual review still sees a material/value shift into the neighboring fallback terrain.

#### Exact save/reload checkpoints

At each checkpoint the controller saved through the HUD bridge, reloaded the page, waited
for the game-ready gate, read `gliese.save.v8` again, and required exact equality of map ID,
floating-point coordinates, and facing. All four comparisons passed:

| Checkpoint | Exact state before and after reload | Reviewed pre-reload scene capture |
| --- | --- | --- |
| Home Yard | `meadow-entry (624, 5776), up` | [Home](img/hpa-307/runtime-save-reload-home.png) |
| Well Plaza | `meadow-entry (944.1936000000006, 5303.675200000018), left` | [Plaza](img/hpa-307/runtime-save-reload-plaza.png) |
| Shrine Garden | `meadow-entry (1470.9263999999987, 5783.994399999994), left` | [Shrine](img/hpa-307/runtime-save-reload-shrine.png) |
| East Gate | `meadow-entry (1844.8103999999987, 4607.997600000007), up` | [East Gate](img/hpa-307/runtime-save-reload-east-gate.png) |

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
| Loader window / successful file completions | `301.69999998807907 ms` / 1 |
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
| background enabled | 43 | 313 | 0 | 6894 | 8.300000000001091 | 9.89999999999418 | 6.3–40.8 |
| background off | 43 | 277 | 0 | 6390 | 8.30000000000291 | 9.900000000001455 | 6.3–25.9 |

`p95(enabled) - p95(off) = -7.275957614183426e-12 ms` (floating-point noise, effectively
zero), which passes the `<=2 ms` browser reference-device gate. This is a headed-browser
result and is not a Tauri-renderer measurement or a subjective human hitch assessment.

#### Raw acceptance artifacts

- [Reproducible headed-browser controller](hpa-307-browser-acceptance.mjs)
- [Browser acceptance summary](img/hpa-307/runtime-browser-acceptance-summary.json)
- [Acceptance route and checkpoint record](img/hpa-307/runtime-route-acceptance.json)
- [Enabled timing samples and route record](img/hpa-307/runtime-timing-enabled.json)
- [Background-off timing samples and route record](img/hpa-307/runtime-timing-off.json)
- [Four-edge handoff inspection record](img/hpa-307/runtime-handoff-inspection.json)

### Reviewed runtime captures

Five renderer/fallback modes:

- [Baked background enabled](img/hpa-307/runtime-background-enabled.png)
- [Fallback tiles with background off](img/hpa-307/runtime-background-off.png)
- [Baked background with live collision overlay](img/hpa-307/runtime-background-collision.png)
- [Fallback tiles with live collision overlay](img/hpa-307/runtime-background-off-collision.png)
- [Fallback after intercepted background load failure](img/hpa-307/runtime-background-load-failure.png)

Each mode has a same-basename `.renderer.json` record containing its renderer,
`MAX_TEXTURE_SIZE`, loader window, and successful-completion count, plus capture time,
tested commit, browser/viewport/mode, production-asset binding, and the exact screenshot's
path, byte count, and SHA-256.

Six named village districts:

- [Home Yard](img/hpa-307/runtime-district-home-yard.png)
- [Well Plaza](img/hpa-307/runtime-district-well-plaza.png)
- [Market / Blacksmith](img/hpa-307/runtime-district-market-blacksmith.png)
- [North Residences / Guild](img/hpa-307/runtime-district-north-guild.png)
- [Shrine Garden](img/hpa-307/runtime-district-shrine-garden.png)
- [East Gate](img/hpa-307/runtime-district-east-gate.png)

Four regional edges and the traversed north continuation:

- [North edge](img/hpa-307/runtime-handoff-north.png)
- [North Crossroads continuation](img/hpa-307/runtime-handoff-north-crossroads.png)
- [South edge](img/hpa-307/runtime-handoff-south.png)
- [West edge](img/hpa-307/runtime-handoff-west.png)
- [East edge](img/hpa-307/runtime-handoff-east.png)

Seven live interiors, exercised only as regression scope for HPA-307:

- [Item Shop](img/hpa-307/runtime-interior-item-shop.png)
- [Hero House](img/hpa-307/runtime-interior-hero-house.png)
- [Shrine of Aurora interior](img/hpa-307/runtime-interior-shrine-of-aurora-interior.png)
- [Villager House 2](img/hpa-307/runtime-interior-villager-house-2.png)
- [Villager House 3](img/hpa-307/runtime-interior-villager-house-3.png)
- [Villager House 1](img/hpa-307/runtime-interior-villager-house-1.png)
- [Guild Hall](img/hpa-307/runtime-interior-guild-hall.png)

Two collected regional rewards:

- [Market cache](img/hpa-307/runtime-reward-market.png)
- [Shrine cache](img/hpa-307/runtime-reward-shrine.png)

Four exact save/reload checkpoints with scene captures taken immediately before reload:

- [Home Yard before reload](img/hpa-307/runtime-save-reload-home.png)
- [Well Plaza before reload](img/hpa-307/runtime-save-reload-plaza.png)
- [Shrine Garden before reload](img/hpa-307/runtime-save-reload-shrine.png)
- [East Gate before reload](img/hpa-307/runtime-save-reload-east-gate.png)

All 29 current browser PNGs above were opened at original resolution with `view_image`
before the reviewed copies were committed.

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
  East Gate live scenes immediately before reload. The machine-readable before/after
  checkpoint records, rather than the PNGs, prove that each persisted position resumed
  exactly after reload.
- The six district captures remain visually distinct while live buildings, NPCs, door
  approaches, labels, minimap, and HUD remain legible.
- The Home Yard capture was regenerated from the reverted commit `e32cfdc` in `91f7858`
  and shows the final render with all 228 live `garden-hedge` segments visible over the
  baked background (see the 2026-07-26 follow-up above); the upright scarecrow remains
  removed and the outer west map-boundary tree line remains readable.
- The four seam captures retain open transition geometry and alpha blending without a hard
  missing-texture boundary. They also make the still-noticeable rich-baked-to-plain-fallback
  material shift explicit instead of treating alpha blending as an invisible seam.
- Every interior capture retains its existing live tile/prop renderer; no baked interior art
  was added under HPA-307.
- The reward captures show `village-market-cache` and `village-shrine-cache` collected
  through the live route.

The older `runtime-tauri-native-smoke.png` remains historical evidence only. Task 11 did not
reuse it as proof of current bundle provenance, observed bounds, or a current native visual
pass.

The visible `Hero's House` landmark label is live `WorldScene.renderLandmarks(...)` output.
It appears in both baked and fallback captures and is not text baked into the regional
master.

## Native release and smoke evidence

Task 11 ran both release commands without changing the project configuration:

| Command | Exit | Exact boundary |
| --- | ---: | --- |
| `rtk bun run tauri build` | 1 | Strict story validation, prose assertion, optimized Rust compilation, and `Gliese.app` bundling passed; the command then failed in `bundle_dmg.sh` after entering the interactive Finder-prettifying AppleScript path. |
| `rtk env CI=true bun run tauri build` | 0 | Produced both `Gliese.app` and `Gliese_0.0.1_aarch64.dmg`. |

The ordinary command's terminal output did not identify a more specific failing AppleScript
statement. The generated helper contains the expected `osascript` Finder-cosmetics branch,
and the CI path skips that branch. This is recorded as an environment-sensitive packaging
failure, not as proof of a manifest defect. It nevertheless leaves the required exact
ordinary release command red.

The CI-mode artifacts were inspected immediately after the passing build:

| Artifact fact | Observed value |
| --- | --- |
| `CFBundleExecutable` | `gliese` |
| Bundled executable | arm64 Mach-O, `33,083,344` bytes |
| Bundled/release executable SHA-256 | `8c79f07f3463154b351215bfc0352be8f33363384c6b6a0eba9c938b9be42e2d` for both |
| Signature inspection | ad-hoc linker signature; no Team ID, no Developer ID/notarization claim |
| DMG file bytes / SHA-256 | `27,777,327` / `9e2427d9fe8208abd415161ecafd2e7fd9c4d7b394740bc70b5369ecd8e18c83` |
| `hdiutil verify` | valid, CRC32 `B9C61BFC` |
| `hdiutil imageinfo` | UDZO read-only zlib-compressed, checksummed, GUID/HFS+, `60,855,296` logical bytes |

The machine-readable command/result record is
[runtime-tauri-artifact-inspection.json](img/hpa-307/runtime-tauri-artifact-inspection.json).

For the bounded native attempt, `open -n` launched the exact inspected application as PID
`11129`. LaunchServices reported bundle ID `com.gliese.app`; the process remained alive, a
WebKit page load completed, and a `7,601,173`-byte resource completed loading. That byte
length matches the production background, but the unified-log line does not retain the URL,
so it is supporting correlation rather than URL-level native proof. System Events reported
the Gliese process as visible but returned `0` windows before and after a frontmost attempt.
No current native screenshot was captured or accepted. The normal application quit command
returned `0`, and a follow-up process query confirmed the application was absent.

Tauri also retains its existing warning that identifier `com.gliese.app` ends in `.app`.
That warning predates HPA-307 and did not prevent the application or CI-mode DMG from being
built.

### Evidence boundary and remaining manual gates

The combined browser evidence now proves exact production-request interception, scoped
BootScene and WorldScene diagnostics, ready-state continuity, enabled/off and load-failure
presentation, keyboard traversal of the complete accepted route, all seven interior round
trips, both rewards, four exact save/reload checkpoints, four edge inspection points plus a
traversed north Crossroads continuation, one request and one observed dimension-matched
`texImage2D` API call over a continuous no-reload route, zero observed context losses, and
an effectively `0 ms` enabled-versus-disabled p95 delta under the documented headed Chromium
method.

A follow-up headed Playwright CLI probe identified the generic `404 (Not Found)` console
error as `http://127.0.0.1:4173/favicon.ico`; the exact production background request
remained successful. The acceptance collector stores console text but not console location,
so its raw JSON still cannot make that attribution independently. There were zero uncaught
`pageerror` events.

The following gates remain explicitly unclaimed:

- current native visual presentation: the bounded current launch exposed zero System Events
  windows, and the older native PNG is not current-bundle proof;
- Tauri-specific renderer-capability diagnostics and a native runtime frame profile;
- physical GPU upload count, texture residency, driver allocation, or Canvas decode count;
- physical controller/gamepad traversal;
- subjective human assessment of movement feel, visible hitching, or re-upload behavior.

## Linear-ready future-scope briefs

### 1. Bake the remaining overworld regions

**Outcome:** bring Crossroads, Wildwood, Coast, Mistfen, and Silverpine to a comparable
regional-background fidelity so village handoffs no longer jump from rich baked terrain to
plain fallback tiles.

**Scope:** treat each region as its own authored control/master/evidence unit; preserve its
current collision, transitions, encounters, pickups, live buildings/props, camera behavior,
fallback renderer, and save compatibility. Validate all region-to-region seams in both
directions and retain per-region load, texture-size, request-count, fallback, and frame-time
evidence.

**Non-goals:** do not expand map geometry, merge masters into one world texture, replace
live gameplay objects, or use Sundrop Village's control mask as another region's geometry.

**Acceptance:** each region has an approved native-size master, immutable provenance and
hash, deterministic controls, enabled/off/load-failure captures, complete traversal and
transition evidence, an explicit asset-budget decision, and no hard seam or blocked throat.

### 2. Prototype baked interiors for Hero House and Guild Hall

**Outcome:** test whether a baked floor/background treatment improves the two most important
interior spaces without flattening their live interaction/readability.

**Scope:** prototype Hero House and Guild Hall first. Keep walls, doors, NPCs, furniture,
collision, foreground occlusion, dialogue/shop/quest hooks, transition coordinates, and
fallback tiles live and independently testable. Use separate masters and evidence for each
interior.

**Non-goals:** do not bake all seven interiors in the prototype, move entrances, change
interior dimensions, combine village and interior art, or remove existing live props merely
because similar shapes appear in a background.

**Acceptance:** each prototype proves enabled/off/load-failure presentation, unchanged
collision and entrance/exit behavior, readable live actors/props, save/reload continuity,
asset/hash/provenance gates, and a documented decision before later interiors are scheduled.

## Concerns and completion decision

The approved tier-0 asset is `3,406,869` bytes above the 4 MiB review target. It remains
`787,435` bytes below the hard limit, and the explicit quality-based exception is recorded
in both the hand-maintained approval and this report.

All tested geometry, routes, doorways, rewards, and transition throats pass. However:

- the rich village versus plain neighboring-region material/value shift remains visibly
  noticeable at the feathered boundary, especially north and east;
- the exact ordinary Tauri release command remains red in the Finder DMG helper even though
  the CI-mode artifact verifies;
- current native visual presentation, physical controller feel, native frame behavior, and
  physical GPU behavior remain open.

The evidence package is therefore suitable for engineering handoff as
`DONE_WITH_CONCERNS`, but it does not support marking HPA-307 complete.

# HPA-307 Sundrop Village baked-background validation

## Status

Approved production master. The first generated candidate was rejected before finalization;
the selected master is the corrected continuous-ground edit described below. The automated
browser fallback matrix also passes. Physical-controller, Tauri renderer, physical
GPU-upload/decode, and device-local frame-profile gates remain separate final-acceptance work
and are not claimed by this report.

## Production provenance

- Production tool: Codex built-in `image_gen`.
- Authoritative reference:
  `/private/tmp/hpa-307-village-art-control.png`, rasterized from
  `docs/superpowers/reports/img/hpa-307/village-art-control.svg`.
- Source control fingerprint:
  `bdf8bcd17edd6f8878debd97c55bcc72736dac7e65830130e9191753c9cf2db4`.
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

## Executed production commands

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

## Final production bytes

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

The selected native candidate, normalized master, final tier-1 PNG, whole-map overlay,
doorway sheet, edge sheet, and every named regional crop were inspected with `view_image`.
The parent visual gate rejected the first candidate, then approved the corrected
continuous-ground native and normalized master before finalization. Tier 1 was also
inspected after exact-alpha finalization.

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

## Automated validation

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

- `rtk bun run art:validate:village` passed: 2 files, 19 tests, 0 failures.
- `rtk bun run test:unit -- --run src/lib/game/content/sundrop-village-background.asset.test.ts src/lib/game/content/maps/layered/village-art-controls.test.ts`
  passed: 2 files, 19 tests, 0 failures.
- The independent asset test recomputed the live control fingerprint; matched the manifest,
  generated constant, and hand-maintained approval; decoded the exact committed PNG as
  `1792×1536` 8-bit truecolor RGBA; matched every alpha byte; proved monotonic edge normals
  with maximum adjacent jump no greater than `32`; enforced the target/exception and hard
  budget semantics; and matched the exact SHA-256.
- `rtk bun run check` passed with 0 errors and 0 warnings.
- `rtk bun run lint` passed; Prettier and ESLint were clean.

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

### Reviewed runtime captures

- [Baked background enabled](img/hpa-307/runtime-background-enabled.png)
- [Fallback tiles with background off](img/hpa-307/runtime-background-off.png)
- [Baked background with live collision overlay](img/hpa-307/runtime-background-collision.png)
- [Fallback tiles with live collision overlay](img/hpa-307/runtime-background-off-collision.png)
- [Fallback after intercepted background load failure](img/hpa-307/runtime-background-load-failure.png)

All five final focused-run PNGs were opened at original resolution with `view_image` before
the reviewed copies above were committed.

- The enabled capture shows the rich continuous regional terrain under unchanged live
  buildings, characters, props, and HUD.
- The off capture shows the tile fallback clearly across the same Home Yard camera view.
- The collision capture shows the translucent live collision regions, landmark footprint,
  and player-clearance circle above the baked background.
- The combined capture shows the same live collision geometry above fallback tiles.
- The load-failure capture shows fallback tiles, not Phaser's missing-texture placeholder;
  it is visually consistent with the background-off baseline while the canvas and HUD remain
  ready.

The visible `Hero's House` landmark label is live `WorldScene.renderLandmarks(...)` output.
It appears in both baked and fallback captures and is not text baked into the regional
master.

### Evidence boundary and remaining manual gates

The automated browser run proves the production request boundary, loader completion
diagnostic, URL modes, targeted failure diagnostics, boot continuity, retained fallback
rendering, and screenshot artifact generation. Playwright is configured to retain
failure-only screenshots and traces, and CI uploads both `playwright-report/` and
`test-results/` under the existing non-cancelled seven-day artifact policy.

The following acceptance gates were not performed in this browser evidence slice and remain
explicitly unclaimed:

- the physical-controller village route, every interior round trip, and the four named
  save/reload checkpoints;
- the Tauri renderer measurement on the reference device;
- a physical WebGL upload count or Canvas decode count across scene/interior round trips;
- enabled-versus-disabled median and p95 frame profiling and the `<=2ms` device-local p95
  regression gate;
- visible hitch or re-upload observation during the controller route.

## Concerns

The approved tier-1 asset is `2,600,563` bytes above the 4 MiB review target. It remains
`1,593,741` bytes below the hard limit, and the explicit quality-based exception is recorded
in both the hand-maintained approval and this report. No geometry, route, doorway, reward,
edge-handoff, or baked-vs-live art concern remains after the corrected-candidate review.

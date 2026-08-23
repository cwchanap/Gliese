# Task 7 report: complete Meadow visual, fallback, and repository acceptance

Status: DONE — follow-up whole-branch correction complete

## Scope

## Builder-test quality follow-up

The final review rejected the prior source-regex regression as insufficiently behavioral. It was
replaced with a real exported pure seam,
`getMeadowEntryArtPackageStorageConfigurationSha256`, which both HPA-399 and painted-v2 approval
builders call. The test exercises the seam against the current `.gitattributes`: HPA-399 returns its
actual full-file SHA-256, painted-v2 returns the immutable
`46eb41c75bcc1d058c820f59098df48abccbaea1e081214d106d9d8ca6dd4f40` seal, and the complete controls
helper still returns the current full-file SHA-256. It also passes missing-source and changed-source
painted-v2 LFS rows through the active helper and asserts both fail closed. No complete builder,
approval decision, art pixel, geometry, default, reviewer, timestamp, or inherited pilot file was
changed.

TDD and owning gates for this follow-up:

- RED: 1 test failed because the behavioral seam was not yet exported; 4 existing CLI tests passed.
- GREEN: focused approval CLI 1 file / 5 tests; four-file approval suite 4 files / 42 tests.
- `bun run art:validate:meadow-entry-controls`: 11 files / 211 tests passed.
- `bun run art:validate:meadow-entry`: 22 files / 559 tests passed.
- Complete approval check, `bun run lint`, `bun run check` (0 errors / 0 warnings), `bun run build`
  (existing large Phaser chunk warning only), `git diff --check`, and `git lfs fsck --objects` passed.

Task 7 adds review-only browser acceptance for the complete Meadow package, four independent
texture-fault cases, a complete-world route/save/reload journey, and fresh 1920×1080 runtime
evidence. It does not change production selection, geometry, authored map data, the approved master,
or the four literal runtime exports.

The requested `tests/e2e/complete-world-layout-journey.e2e.ts` did not exist in this checkout; it
was created as the focused complete-package route while the existing fallback journey in
`tests/e2e/game.e2e.ts` was left untouched.

## RED and corrections

- The first review-mode run exposed an incorrect test expectation: a plain no-package fallback
  reports empty selected fallback collections, while a failed selected package reports the restored
  authored collections. The contract now derives and asserts those two cases separately.
- The route helper initially trusted stale HUD movement and tiny keyboard-axis residue. It now uses
  only fresh movement diagnostics, tolerates the existing ≤24px input quantization, and never writes
  player coordinates.
- Legacy validation initially exposed a stale generated control package. The legacy controls were
  regenerated from the committed legacy snapshot; the complete controls and complete fingerprint
  were not changed.
- Five adjacent historical-art assertions then failed for explained provenance drift: the painted-v2
  approval storage seal, its package approval storage seal, the approval test’s fixed evidence path,
  and the historical camera-safe proof hash. Each was corrected to the current checked-in source or
  report value; no unexplained hash was accepted.
- The first unprivileged full-unit run stalled in the nested Chromium texture probe. The same command
  was rerun with local browser/loopback permission and passed completely.

## GREEN verification

### Focused package and renderer gates

| Command | Result |
| --- | --- |
| `rtk bun run art:validate:meadow-entry-controls` | pass — 11 files, 210 tests |
| `rtk bun run art:validate:meadow-entry` | pass — 22 files, 558 tests |
| `rtk bun run art:validate:meadow-entry-complete-controls` | pass — complete approval 4/4 |
| `rtk bun run art:validate:meadow-entry-complete` | pass — complete controls, master, review, export, approval, runtime, and artifact checks |
| exact 14-file Package 1 command | pass — 14 files, 496 tests |
| `rtk bun test --timeout 10000 tools/render-complete-world-layout-review.test.ts` | pass — 3 tests, 162 assertions |
| `rtk bun tools/render-complete-world-layout-review.ts --check` | pass — inventory SHA-256 `6eb8fbba20fca5ee0df296e6cc79671d362b8c2130e6983e8b427df8a3cd7153` |

The historical Package 1 handoff reports 477 tests. The current branch’s exact files contain 19
previously-added tests, producing the measured 496-test total; no Task 7 test was added to those
14 files.

### Required repository gates

| Command | Result |
| --- | --- |
| `rtk bun run test:unit -- --run` | pass — 110 files, 1,743 tests |
| `rtk bun run check` | pass — 0 errors, 0 warnings |
| `rtk bun run lint` | global Prettier stops on pre-existing `.playwright-cli/*.yml` evidence and five pre-existing generated complete-art files; `bunx eslint .` passes and targeted Prettier passes for every Task 7 file |
| `rtk bun run build` | pass — Vite production build; existing large Phaser chunk warning only |
| `rtk bun run test:e2e -- --grep "complete Meadow\|complete world layout journey"` | pass — 6 tests, 2.5 minutes, one Chromium worker |
| `rtk git diff --check` | pass before commit |
| `git lfs fsck --objects` | pass |

The standalone nested texture probe also passed 1/1 with local browser/loopback permission. The
global lint limitation is pre-existing and is intentionally not “fixed” by reformatting unrelated
untracked evidence or generated approval artifacts.

## Browser acceptance evidence

The complete review test asserted:

- default URL fallback with no package and no selected background IDs;
- exact package `meadow-entry-painted-v2-complete`, `paintedMode: complete`, four required and
  selected IDs, four 3200×3200 rendered entries, and empty fallback blocker/decor/fence IDs;
- real blocked movement plus live transitions, blockers, NPCs, discoveries, and encounters;
- one `render-failed` rollback for each of the four required texture IDs, with package null, fallback
  presentation, zero selected/successful images, and restored authored fallback collections.

The route test started at a valid Hero House save, exited with ArrowDown, traversed Sundrop Village,
the river crossing, Crossroads, Mistfen, Silverpine, Tidewatch Coast, and Wildwood, saved in Meadow,
reloaded, resumed, and returned to a valid route coordinate. It produced these 16 fresh 1920×1080
PNG files under `docs/superpowers/reports/img/hpa-586-painted-v2-complete/runtime/`:

```text
complete-review-overview-1920x1080.png
fallback-default-1920x1080.png
fallback-missing-northwest-1920x1080.png
route-hero-house-interior-1920x1080.png
route-sundrop-village-1920x1080.png
route-river-crossing-1920x1080.png
route-crossroads-1920x1080.png
route-mistfen-1920x1080.png
route-silverpine-1920x1080.png
route-tidewatch-coast-1920x1080.png
route-wildwood-1920x1080.png
route-post-reload-meadow-1920x1080.png
runtime-quadrant-edge-southwest-1920x1080.png
runtime-quadrant-edge-southeast-1920x1080.png
runtime-quadrant-edge-northwest-1920x1080.png
runtime-quadrant-edge-northeast-1920x1080.png
```

Visual inspection of the overview, fallback, all route captures, and all four edges found no visible
overlap, seam, crop boundary, missing painted background, false terrain/path/water cue, or static
overlay obstacle. The live buildings, NPCs, pickups, and waystones are stateful objects permitted by
the complete full-map contract. Hero House remains the unchanged interior boundary capture; this
package only paints Meadow Entry.

## Immutable approval and LFS record

- Approved master: `11a417318b089b6cc1a47bee639306bb78379b7847ea42598c789b57c76c6a52`;
  reviewer `chanwaichan`; approved `2026-08-23T06:00:50Z`.
- Complete controls approval: `2026-08-23T08:22:38Z`; complete art approval:
  `2026-08-23T08:22:50Z`; both remain bound to the same master and four runtime exports.
- Because the approval deliberately binds the validation-report bytes, the complete art approval
  payload was resealed only to replace its validation-report SHA-256 with
  `65cf5d92f0f70d58e0e1e36899c6d2fdea35843fb8d4229dc2a0c631f949d3e5`; reviewer, timestamp,
  master, exports, texture probe, and review inventory are unchanged.
- Existing five rejected/retired generation attempts remain unchanged in the main validation report.
- The 16 new runtime PNGs total 43,054,077 working-tree bytes and match the repository Git LFS
  rule. Existing Task 5 root-level runtime edge files were not changed.
- No native Tauri/packaged desktop or physical-device gate was run; that external gate remains
  pending. The complete package remains review-only and is not production-default.

## Commit

Commit message: `test(world): validate complete Meadow art package`

The final commit hash is reported in the coordinator handoff because this report is part of that
commit and therefore cannot contain its own immutable hash.

## Follow-up whole-branch correction

The final whole-branch review identified four valid blockers. Each was corrected narrowly without
changing art pixels, geometry, defaults, legacy reviewer/timestamp metadata, or approval decisions.

### Historical approval seal

- Restored the immutable legacy painted-v2 storage seal to
  `46eb41c75bcc1d058c820f59098df48abccbaea1e081214d106d9d8ca6dd4f40` in both legacy approval
  records.
- `tools/approve-meadow-entry-controls.ts` now preserves that value for the legacy package while
  still validating every required legacy LFS row. The complete package continues to bind the current
  `.gitattributes` SHA-256 `42455c6bab7889dd99cc194683ccaa6f2a19b0a067aede17fe34faf6282fd1ab`.
- RED focused regression: 4 files failed / 43 tests when the production checker had no runtime ID
  fields and the historical finalizer still compared the current full-file digest. GREEN after the
  correction: 4 files / 264 tests focused ownership suite, including additive-rule preservation and
  required-row removal/change rejection; historical finalizer: 1 file / 32 tests.

### Route and visual evidence

`bunx playwright test --grep "complete world layout journey"` passed 1/1 in 5.1 minutes. The
journey now captures these distinct coordinates and filenames:

```text
band01 {x:2208,y:960}   runtime-source-handoff-band-01-x2208-y960-1920x1080.png
band02 {x:4192,y:960}   runtime-source-handoff-band-02-x4192-y960-1920x1080.png
band03 {x:2208,y:1680}  runtime-source-handoff-band-03-x2208-y1680-1920x1080.png
band04 {x:4192,y:1680}  runtime-source-handoff-band-04-x4192-y1680-1920x1080.png
band05 {x:1216,y:1536}  runtime-source-handoff-band-05-x1216-y1536-1920x1080.png
band06 {x:1216,y:3072}  runtime-source-handoff-band-06-x1216-y3072-1920x1080.png
east   {x:3520,y:3200}  runtime-horizontal-boundary-east-x3520-y3200-1920x1080.png
```

All seven screenshots were visually inspected at 1920×1080. No overlap, seam, crop boundary,
false terrain/path/water cue, missing background, or overlay obstacle was found. The seven files
add 21,981,353 working-tree bytes; all 23 current complete runtime captures total 65,054,466 bytes
and use the repository Git LFS rule.

### Runtime identity fault matrix

`tests/e2e/meadow-entry-painted-v2-complete.e2e.ts` now captures exact runtime
`collisionIds` and `statefulObjectIds` from the healthy complete diagnostic through the existing
diagnostic event seam. Each of the four independent texture faults asserts exact equality for both
sets, then asserts fallback package/presentation, zero selected/successful complete IDs, the exact
`render-failed` texture entry, and HUD map restoration.

```text
bun run test:e2e -- --grep "complete Meadow review mode|restores fallback"
5 passed (42.7s): review/default fallback plus four independent texture faults
```

### Formatting and final gates

- Added only the canonical generated complete artifact paths and `.playwright-cli/` to
  `.prettierignore`; local evidence remains preserved.
- The complete approval generator now emits Prettier-conformant TypeScript and the complete controls
  approval was regenerated with reviewer `chanwaichan` at `2026-08-23T08:22:38Z`; its payload values
  remain unchanged.
- `bun run lint`: pass.
- `bun run check`: pass, 0 errors / 0 warnings.
- `bun run build`: pass; existing large Phaser chunk warning only.
- Four art validators: pass — legacy package 22 files / 559 tests; legacy controls 11 files /
  211 tests; complete controls 4 tests; complete package check current (13 tests across the two
  complete artifact modules).
- Unit coverage: server project 107 files / 1,673 tests passed; client project 3 files / 71 tests
  passed. The two image-heavy server cases also pass isolated: pilot export 1/1 in 70.65s and
  complete assembly 5/5 in 205.87s. The initial all-project aggregate overlapped those cases and
  hit the existing 120s/300s test timeouts plus a Vitest browser-port collision; no timeout or test
  was weakened.
- No native/Tauri, packaged desktop, or physical-device gate was run; that external gate remains
  pending. The complete package remains review-only and is not production-default.

The complete art-package approval was resealed after the validation report update using the existing
reviewer/timestamp; only the validation-report SHA-256 changed.

## Scoped builder-wiring re-review after f791829

The scoped review found one valid regression in the prior correction commit: the immutable legacy
seal helper had been placed in the retired HPA-399 builder, while the active painted-v2 builder still
returned the current full-file `.gitattributes` SHA-256. This follow-up corrected only those two
assignments. The HPA-399 builder again returns `sha256(storageConfiguration)` exactly as it did before
f791829. The painted-v2 builder now uses
`getMeadowEntryArtPackageStorageConfigurationSha256(storageConfiguration, 'painted-v2')`, which
delegates to `getMeadowEntryControlsStorageConfigurationSha256(storageConfiguration, 'legacy')`; that helper
independently requires exactly one source and runtime painted-v2 LFS row, LF bytes, and a final
newline, then preserves the immutable `46eb41c75bcc1d058c820f59098df48abccbaea1e081214d106d9d8ca6dd4f40`
seal. The complete builder remains bound to the current
`42455c6bab7889dd99cc194683ccaa6f2a19b0a067aede17fe34faf6282fd1ab` configuration SHA-256.

TDD evidence:

- RED: the new owning regression failed 1/5 tests because the two builder assignments were reversed.
- GREEN: `bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts --maxWorkers=1` passed 1 file / 5 tests.
- Narrow approval suite: `bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts src/lib/game/content/meadow-entry-controls-approval-tool.test.ts src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts src/lib/game/content/meadow-entry-art-package.asset.test.ts --maxWorkers=1` passed 4 files / 42 tests.

Owning gates after the correction:

- `bun run art:validate:meadow-entry` passed: 22 files / 559 tests.
- `bun run art:validate:meadow-entry-controls` passed: 11 files / 211 tests.
- `bun run art:check:meadow-entry-complete-approval` passed: complete approval current.
- `bun run lint` passed; `bun run check` passed with 0 errors and 0 warnings; `bun run build` passed
  with only the existing large Phaser chunk warning; `git diff --check` and `git lfs fsck --objects`
  passed.

The active painted-v2 command `bun run art:check:meadow-entry-approval` was also rerun. It stops at
the pre-existing stale `artifacts/meadow-entry/painted-v2/proofs/pilot-ownership.json` sidecar before
approval comparison: the regenerated PNG and all input hashes match, while only the checked-in
ownership metric differs (`a10a10123b9f2759cafaaec2759c967da713cf795868306e23571a844684b632` versus
current `b1dd376b41c70037c9043103f26eced7d43e7c6c16f8423e7517e40db8d30e1a`). That unrelated proof
evidence was preserved; no proof, art pixel, geometry, approval decision, reviewer, or timestamp was
rewritten in this correction. The injected no-write CLI check and the four-file approval suite pass.

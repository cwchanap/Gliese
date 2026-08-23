# Task 7 report: complete Meadow visual, fallback, and repository acceptance

Status: DONE

## Scope

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

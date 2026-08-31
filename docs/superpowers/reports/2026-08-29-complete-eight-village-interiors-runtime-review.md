# Complete Eight Village Interiors — Runtime Review

Date: 2026-08-31
Branch: `codex/hpa-586-painted-interiors`
Task 8 base: `72684daa`
Verdict: **APPROVED**

## Scope

Task 8 adds test and evidence coverage only. Production maps, layouts, collisions, navigation,
packages, assets, actors, shops, save schema, and runtime code are unchanged.

- One data-driven unit matrix proves all eight interior layouts, 16px navigation grids, production
  package defaults, static visual ownership, protected live content, and atomic fallback parity.
- One browser journey named `all eight painted village interiors` covers painted and missing-base
  fallback modes for every interior at the native `640x360` camera.
- Existing source-aware route helpers were corrected where the aggregate browser run exposed test
  fixture paths that crossed current collision or navigation boundaries. Runtime tolerances and
  production geometry were not relaxed.

## All-eight runtime result

| Map | Painted package | Live interaction proof | Painted / fallback evidence |
| --- | --- | --- | --- |
| Hero House | `hero-house-painted` | entry, authored route, exit/re-entry, save/reload | [painted](img/hpa-586-interiors/final/hero-house/painted-camera-640x360.png) / [fallback](img/hpa-586-interiors/final/hero-house/fallback-camera-640x360.png) |
| Guild Hall | `guild-hall-painted` | Arlen, Quartermaster Vale, members, quest route | [painted](img/hpa-586-interiors/final/guild-hall/painted-camera-640x360.png) / [fallback](img/hpa-586-interiors/final/guild-hall/fallback-camera-640x360.png) |
| Item Shop | `item-shop-painted` | Mira, customer, shop route, stockroom and office | [painted](img/hpa-586-interiors/final/item-shop/painted-camera-640x360.png) / [fallback](img/hpa-586-interiors/final/item-shop/fallback-camera-640x360.png) |
| Blacksmith | `blacksmith-interior-painted` | Oren, forge shop purchase, persisted finite stock | [painted](img/hpa-586-interiors/final/blacksmith-interior/painted-camera-640x360.png) / [fallback](img/hpa-586-interiors/final/blacksmith-interior/fallback-camera-640x360.png) |
| Villager House 1 | `villager-house-1-painted` | Lynn and family activity | [painted](img/hpa-586-interiors/final/villager-house-1/painted-camera-640x360.png) / [fallback](img/hpa-586-interiors/final/villager-house-1/fallback-camera-640x360.png) |
| Villager House 2 | `villager-house-2-painted` | Toma and neighbor activity | [painted](img/hpa-586-interiors/final/villager-house-2/painted-camera-640x360.png) / [fallback](img/hpa-586-interiors/final/villager-house-2/fallback-camera-640x360.png) |
| Villager House 3 | `villager-house-3-painted` | Io and neighbor activity | [painted](img/hpa-586-interiors/final/villager-house-3/painted-camera-640x360.png) / [fallback](img/hpa-586-interiors/final/villager-house-3/fallback-camera-640x360.png) |
| Shrine of Aurora | `shrine-of-aurora-interior-painted` | nave, side rooms, sanctum, exit/re-entry | [painted](img/hpa-586-interiors/final/shrine-of-aurora-interior/painted-camera-640x360.png) / [fallback](img/hpa-586-interiors/final/shrine-of-aurora-interior/fallback-camera-640x360.png) |

The missing-base phase intercepts each required base texture, proves zero selected painted images,
and repeats a critical keyboard route against the complete fallback presentation. Blacksmith also
proves the purchased Iron Cap stock remains `0`, wallet remains `65`, and inventory remains saved
across reload, fallback, and re-entry.

## Visual review

The 16 current-browser screenshots were reviewed at original `640x360` resolution.

- All painted captures use a full opaque background with live actors rendered separately.
- Each fallback capture restores the legacy static presentation instead of mixing painted and
  fallback ownership.
- Camera zoom remains `1` and the world view remains exactly `640x360` on every interior.
- Doorways, central aisles, NPC approaches, and the visible return path remain readable in both
  modes. No new baked actor, overlay obstacle, or partial-package blend is visible.
- Representative authored collision/navigation evidence remains available for every map as
  `img/hpa-586-interiors/<mapId>/collision-overlay.png` and
  `img/hpa-586-interiors/<mapId>/player-centre-navigation-overlay.png`.

## Exact asset and evidence hashes

| Map | Checked-in painted asset SHA-256 | Painted screenshot SHA-256 | Fallback screenshot SHA-256 |
| --- | --- | --- | --- |
| Hero House | `ceba64bb3c132969c17dd3021c1d198c50bb4998e21f754ee5d68acf1656f2c0` | `11455edc9637e1f2ceae8de166d997b7fd84cc63541edc49c83126c39050116a` | `bcbfa46fe9ccf41b585f81bd306049a104f5c9728de4ad7b6eb62d290b9ecd68` |
| Guild Hall base | `320a18c6e6ebd59ec25fce93d89b10ed3e469812befe316e62b068b4c690163d` | `02f32398f6d274da9af06f8f56cd0f1d633730656116227171b3a0b9a57db202` | `1c6dfe64aaddc7a89e238599c0faa3fa3bf35e14569a87ce908aa9a72ba27845` |
| Guild Hall foreground | `4ff46a839dc19bcce9a514cc2da5ec195892971a761574b0754d39ffef92e1f9` | — | — |
| Item Shop | `e13e434d56c15278fe4b3b66b668572ee9a153cc4eacc2dfdd1057f9d7afc962` | `4f5b0be1d94d837dd9e46f0d0a4805c89ac19a0c2619652f8548fff8d9cd0dcd` | `995cfcbf869125079047478812da455399a7eb9097bb2bfdafc2223cfb761cac` |
| Blacksmith | `604efdd3c9c6fe9c5c4186edbc35ee871bd1d1372cac1c8ecaa9a14dd3d76e4d` | `aeaa3c05bcfe4e72c50f555592e4745abefdd4f3d1092d5acd161c74af56083e` | `7e79cb7b770b2dd422688aa7c2287ac1faa68966dc76de60edf7579d9c314d98` |
| Villager House 1 | `e3041189516d424cb35e3e4153712231dcfc9b3c3a6fd321cd53bc7ec1d4118a` | `4d753556cd1750810b53ff1319ced2d1f30b6bdecb60df8b0f6979ab4f9d685e` | `e125bc81fd70fe745befcc991111ce9c949ba62520b32329db3993585aa747fb` |
| Villager House 2 | `b8cc306bbb57645d93f8358b435a870ebe88f765d4a04e9a581a09b18b710ccf` | `2566eb3217ebc0a761327f06fd4db3605178ac58027697f2bfdcf1486ea5b9ea` | `6e2e0cad5f0147ea203ed03a34f5bb11d7c83ba9b9d5fd2f16620679eab91bb3` |
| Villager House 3 | `9b021c433565b0fe68c7699a2b7bd646de3273511b144efb34d9e10aba93567f` | `d1ab30ee8d01ea3f05795a13e1ec9332c02cb525114a1e389317757efe5e317f` | `f8acf4340b2fc7d12d427e8e08f1e7f472e2cac27b7915b029de5946aab9898b` |
| Shrine of Aurora | `ebc043e542718acbeea980e01ff2c8b9c4a172365e8afbb98cda3e09325ce50b` | `acad8f921652352d513d0a37df6793481f44c52919c94d276ce79a0a711efce0` | `25a89dcef21be858cb09874281aa76f2af397ba11ac396b5c2d1d9c991c19ca1` |

Sorted 16-screenshot inventory SHA-256:
`3631240c2bc17cf98c790156f3854175243951e7b2166fcf55e78c2b84ec3a28`.

## Verification

- `story:check:strict`: GREEN; 7 beats and 13 dialogue blocks, generated Rust current.
- `world:check:navigation`: GREEN; runtime current.
- `art:validate:village-interiors`: GREEN; 8 manifests.
- Navigation/validator/renderer tools: 33/33 tests, 322 assertions, 40.86s.
- Focused completion unit scope: 17 files, 580/580 tests, 39.62s.
- Eight-interior matrix: 11/11 tests, 495ms.
- Focused route characterization: 1/1, 13.2s.
- Item Shop painted interior: 1/1, 1.7m.
- Full fallback journey: 1/1, 22.3m.
- Named all-eight journey: 1/1, 5.6m.
- Aggregate unit suite: 110 files, 1,837/1,837 tests, 334.66s.
- Aggregate E2E suite: 51/51 tests, 56.9m.
- `svelte-check`: 0 errors, 0 warnings.
- Prettier/ESLint, production build, and `git diff --check`: GREEN.
- All nine interior PNGs resolve to `filter=lfs` and are listed by `git lfs ls-files --long`.

The first sandboxed aggregate-unit run completed 107 files and 1,766 assertions but exited on an
environment-only IPv6 listener error (`listen EPERM ... ::1:63315`). The identical escalated run
bound localhost and passed all 110 files / 1,837 tests. No assertion failure was reclassified as a
pass.

## Self-review

- Correctness: all route changes are source-derived from checked-in layout, collision, or 16px
  navigation data; no global watchdog, reach tolerance, map geometry, or production runtime moved.
- Scope: three test files plus this report/evidence; no production file changed.
- KISS/YAGNI: reused the existing interior matrix, route runner, background diagnostics, save
  fixture, screenshot helper, and per-map painted/fallback assertions. No dependency or new runtime
  abstraction was added.
- Residual cost: `game.e2e.ts` is intentionally slow when run serially; the final aggregate gate is
  56.9m. It is deterministic at one worker and remains a release gate rather than a fast feedback
  test.

Final controller verdict: **APPROVED FOR TASK 8 COMMIT**. Merge and push remain out of scope.

# HPA-398 Outdoor Baked Obstacle Runtime Validation

Date: 2026-07-30

Status: accepted for branch completion

## Commit identity and scope

The product and acceptance harness proven by this report are exactly:

```text
513071611d0072aa5052d594d85fe82ca3af265c
```

This refresh supersedes the earlier `3ca8eaf` evidence set. A subsequent
commit modified production, generation, and test files, invalidating the
"packaging-only" claim of the prior report. The full validation pipeline
was rerun from the new HEAD to restore provenance integrity.

All runtime JSON, screenshot sidecars, the production-preview build provenance,
and the raw-evidence hash chain identify that source commit. The commit that
contains this report and the final evidence files is necessarily a subsequent
packaging-only commit. Its SHA is deliberately not embedded in this file:
putting a commit's own SHA into one of its files is an impossible
self-reference. Git history is the authoritative identity for that packaging
commit; it does not change the product or harness under test.

The accepted scope is:

- deterministic base and foreground obstacle planes for the `1792×1536`
  Sundrop Village crop;
- explicit 21-blocker ownership metadata with base-only and multi-owner
  fallback decisions;
- collision-independent live fallback selection;
- renderer/load/dimension/render-failure diagnostics;
- reproducible art controls, provenance, alpha, masks, budgets, and visual
  proofs;
- continuous village/Crossroads traversal, interiors, rewards, save/reload,
  minimap, seam, texture, upload, and frame-time acceptance;
- the favicon and acceptance-harness diagnostics/provenance fixes discovered by
  whole-branch review.

No gameplay collision geometry, save contract, story prose, locale contract,
or unrelated regional art is changed by the final evidence packaging.

## Linear baseline

The controller supplied a read-only live HPA-398 baseline on 2026-07-29:

- status: `Backlog`;
- `updatedAt`: `2026-07-29T01:34:33.941Z`;
- comments: none;
- the live description and acceptance criteria matched the approved local
  design and implementation plan.

This validation did not change Linear status, comments, description, or any
other external state.

## Reproducible art and provenance

The HPA-398 control fingerprint is:

```text
8b3f80fdde4591465d90aca558ff747d3825939c5879fdadaf3c55e70cb3b4b2
```

The source, generated inputs, and outputs are:

| Artifact | Encoded bytes | Encoded SHA-256 | Decoded-pixel SHA-256 |
| --- | ---: | --- | --- |
| immutable HPA-307 source `docs/superpowers/reports/img/hpa-398/sundrop-village-hpa-307-ground-input.png` | 7,601,173 | `3933829f19e7eab4b26ba2d31c7a0cfac25d4fae0a16196893fac6dbf02187c1` | `7f13a455fcbfc0b2ccd12d8305d7015fa1cb4468fe394270d41f2e1978daec2a` |
| chroma source `docs/superpowers/reports/img/hpa-398/village-obstacle-chroma-source.png` | 2,395,797 | `28e5fe80e40633f41412d5af9cd2cf40c1c80c0da17cca981bef9f66faf0a376` | `832aca1dee1cd4c67b7ab65cee550aee75a51c802a510aaecde6f6ded332af8b` |
| extracted obstacle layer `docs/superpowers/reports/img/hpa-398/village-obstacle-layer.png` | 1,953,872 | `55e9721bd66e065e1e2a93907f7b27450597b208c448507aded17b315b213982` | `ff2ad964e115eb34656507bad802866dd98f493a58404f9c3ede95d8547cd445` |
| normalized candidate `docs/superpowers/reports/img/hpa-398/village-obstacle-candidate.png` | 8,367,886 | `79045dec04bfea5adea57fdfe998f6dc1219eed9d1390bd48371097e1080d1cf` | `49a14b3bdb1727fb51523b071c718565ca962dcd3d903e4a11fdc57890a54038` |
| production base `public/game/assets/regions/sundrop-village-base.png` | 7,753,201 | `f1184b045c27c544ac18937a4f8ccfa12cd386319b1722be5d808aea8048ade6` | `8548047ae30b9005411ccf528b7d0952b7092346b41b5ede75803423abb8e91a` |
| production foreground `public/game/assets/regions/sundrop-village-foreground.png` | 385,087 | `2d0a6703de1a404e49c0746f092a4c6f9f113ae17cd8bc35de635b5ec084ce45` | `52b9b46b861d5d94e0ee39c409e33e27a844f600deb96d134f8514fb387bc461` |

The obstacle layer is normalized from `1355×1161` by the checked transform
crop `{x:2,y:1,width:1351,height:1158}` and uniform scale
`1.3264248704663213` to `1792×1536`. The candidate alignment uses the
16-pixel inner linear feather recorded in
`docs/superpowers/reports/img/hpa-398/village-obstacle-provenance.json`.

### Encoded and decoded budgets

| Plane | Actual | Review target | Hard limit | Result |
| --- | ---: | ---: | ---: | --- |
| base | 7,753,201 bytes | 4,194,304 bytes | 8,388,608 bytes | hard limit passes |
| foreground | 385,087 bytes | 2,097,152 bytes | 4,194,304 bytes | target and hard limit pass |
| combined | 8,138,288 bytes | n/a | 12,582,912 bytes | hard limit passes |

The only size exception is the existing HPA-307 visual-quality review-target
exception carried forward for the base plane: the base is above the 4 MiB
review target but remains 635,407 bytes below the immutable 8 MiB hard limit.
There is no hard-limit exception and no foreground or combined exception.

Two decoded `1792×1536` RGBA planes require exactly 22,020,096 bytes
(approximately 21.0 MiB) of raw pixel allocation. This is a decoded pixel
calculation, not a claim about total browser or GPU residency.

### Pixel and alpha contract

The production provenance covers 2,752,512 pixels and reports:

- base changed pixels: 331,656;
- base unchanged pixels: 2,420,856;
- base alpha violations: 0;
- foreground opaque pixels: 47,674;
- foreground translucent pixels: 38,384;
- foreground transparent pixels: 2,666,454;
- protected-area violations: 0;
- foreground-mask violations: 0;
- foreground-cutoff violations: 0;
- foreground-edge-alpha violations: 0;
- exact foreground-alpha-modulation violations: 0.

The exact-alpha metric compares every foreground output alpha byte with the
approved modulation formula; it is not only an edge or range check.

### Immutable HPA-307 gate

`rtk git diff --exit-code -- docs/superpowers/reports/img/hpa-307` exits `0`
after final HPA-398 regeneration. No frozen HPA-307 evidence was changed.

## Ownership and live fallback contract

`docs/superpowers/reports/img/hpa-398/village-obstacle-ownership.json`
contains exactly:

- 21 selected `fallback-only` blockers;
- 14 base-only blockers;
- seven base-plus-foreground blockers;
- eight hedge paint motifs;
- eight low-wall paint motifs;
- five root/rock paint motifs.

The remaining three compiled village garden hedges stay implicitly
always-live:

- `village-block-0-37`;
- `village-block-0-49`;
- `village-block-46-2`.

Hedge, low-wall, and root/rock are baked paint motifs only. Every one of the 21
selected live fallbacks remains a `garden-hedge` blocker rendered through
`village-hedge` / `hedgeSegment`. HPA-398 does not introduce a second fallback
sprite system or alter collision.

The final renderer decisions are:

| State | Plane status | Successful owner IDs | Selected fallback blockers/segments |
| --- | --- | --- | ---: |
| normal enabled | `rendered/rendered` | base + foreground | `0/0` |
| enabled + collision debug | `rendered/rendered` | base + foreground | `0/0` |
| disabled | `disabled/disabled` | none | `21/190` |
| disabled + collision debug | `disabled/disabled` | none | `21/190` |
| both asset loads intercepted | `missing-texture/missing-texture` | none | `21/190` |
| base render failure | `render-failed/rendered` | foreground | `21/190` |
| foreground render failure | `rendered/render-failed` | base | `7/82` |

Normal state therefore has no duplicate selected fallback art. The
foreground-success/base-failure state intentionally keeps the valid foreground
and restores all 21 live hedge fallbacks; that degraded duplication is the
approved safety-first result. The base-success/foreground-failure state
intentionally keeps the valid base and restores exactly the seven multi-owner
live hedge fallbacks; the 14 valid base-only blockers remain suppressed.

Missing textures, the missing placeholder, invalid/unavailable dimensions,
wrong-sized base and foreground textures, image-creation exceptions, and
post-creation render failures are covered by the server scene/unit suite. The
headed E2E suite additionally proves total load failure, missing foreground,
wrong-sized base, wrong-sized foreground, base render failure, and foreground
render failure against the production build.

## Automated command evidence

| Command | Final outcome | Durable log |
| --- | --- | --- |
| `rtk bun run art:controls:village-obstacles` | exit 0; fingerprint reproduced | `docs/superpowers/reports/img/hpa-398/step-1-art-controls-village-obstacles.log` |
| `rtk bun run art:finalize:village-obstacles` | exit 0; production bytes and hashes reproduced | `docs/superpowers/reports/img/hpa-398/step-1-art-finalize-village-obstacles.log` |
| `rtk bun run art:validate:village` | exit 0; 7 files / 107 tests | `docs/superpowers/reports/img/hpa-398/step-1-art-validate-village.log` |
| `rtk git diff --exit-code -- docs/superpowers/reports/img/hpa-307` | exit 0 | no output on success |
| `rtk bun run check` | exit 0; 0 errors / 0 warnings | `docs/superpowers/reports/img/hpa-398/step-2-check.log` |
| `rtk bun run lint` | exit 0 | `docs/superpowers/reports/img/hpa-398/step-2-lint.log` |
| `rtk bun run test:unit -- --run --project server --no-file-parallelism` | exit 0; 55 files / 837 tests | `docs/superpowers/reports/img/hpa-398/step-2-test-unit-server-serialized.log` |
| `rtk bun run test:unit -- --run --project client` | exit 0; 3 files / 71 tests | `docs/superpowers/reports/img/hpa-398/step-2-test-unit-client.log` |
| `rtk bun run build` | exit 0 | `docs/superpowers/reports/img/hpa-398/step-2-build.log` |
| `rtk bun run test:e2e` | exit 0; 26/26 passed | `docs/superpowers/reports/img/hpa-398/step-2-test-e2e.log` |
| `rtk bun run tauri build` | exit 0; `.app` and `.dmg` bundled | `docs/superpowers/reports/img/hpa-398/step-3-tauri-build.log` |
| `GLIESE_BROWSER_ACCEPTANCE_PROFILE=hpa-398 rtk bun docs/superpowers/reports/hpa-307-browser-acceptance.mjs full` | exit 0; `FULL COMPLETE` | aggregate/raw JSON below |
| independent JSON/hash/matrix verifier | exit 0; 22/22 JSON parsed, all descriptors matched | `docs/superpowers/reports/img/hpa-398/step-4-browser-evidence-verification.log` |
| final report/evidence integrity verifier | exit 0; 81/81 report references, 52/52 runtime, 9/9 static proofs, 12/12 logs, 22/22 JSON, 3/3 raw + 1/1 gate hash chain | `docs/superpowers/reports/img/hpa-398/step-7-evidence-integrity.log` |

The client-unit log includes `Error: test error` from the intentional
GameShell error-boundary fixture; the authoritative summary is 3 files and 71
tests passed.

During the final `5130716` browser-evidence refresh, two partial attempts
were discarded before raw aggregate evidence was emitted: the first
transiently redirected to an external page before the canvas appeared, and
the second reached a save-handoff inspection with no localStorage save
present. Only their exact untracked `runtime-*` outputs were removed. The
unchanged third run completed all three 43-leg routes with zero snags and is
the sole committed runtime evidence set.

Earlier diagnostic Tauri attempts encountered the macOS DMG
Finder/AppleScript boundary. The fresh final exact release command completed
strict story validation, the Tauri-mode frontend build, the
no-frontend-story-prose assertion, Rust release compilation, and both bundles:

- `src-tauri/target/release/bundle/macos/Gliese.app`;
- `src-tauri/target/release/bundle/dmg/Gliese_0.0.1_aarch64.dmg`.

## Runtime capture and sidecar inventory

All paths below are relative to the repository root and all runtime sidecars
identify source commit `513071611d0072aa5052d594d85fe82ca3af265c`.

### Renderer and failure states

| Capture | Diagnostic sidecar | What it proves |
| --- | --- | --- |
| `docs/superpowers/reports/img/hpa-398/runtime-background-enabled.png` | `docs/superpowers/reports/img/hpa-398/runtime-background-enabled.renderer.json` | both planes render, no selected fallback duplication (`0/0`) |
| `docs/superpowers/reports/img/hpa-398/runtime-background-off.png` | `docs/superpowers/reports/img/hpa-398/runtime-background-off.renderer.json` | explicit disable makes no regional requests/uploads and restores all `21/190` |
| `docs/superpowers/reports/img/hpa-398/runtime-background-collision.png` | `docs/superpowers/reports/img/hpa-398/runtime-background-collision.renderer.json` | collision debug stays visible above both successful planes with `0/0` selected fallbacks |
| `docs/superpowers/reports/img/hpa-398/runtime-background-off-collision.png` | `docs/superpowers/reports/img/hpa-398/runtime-background-off-collision.renderer.json` | collision debug remains aligned when both planes are disabled and `21/190` live fallback is active |
| `docs/superpowers/reports/img/hpa-398/runtime-background-load-failure.png` | `docs/superpowers/reports/img/hpa-398/runtime-background-load-failure.renderer.json` | intercepted production loads yield `missing-texture/missing-texture`, zero completions/uploads, and complete `21/190` fallback |
| `docs/superpowers/reports/img/hpa-398/runtime-background-base-render-failure.png` | `docs/superpowers/reports/img/hpa-398/runtime-background-base-render-failure.renderer.json` | foreground survives a base render exception while all `21/190` fallbacks return |
| `docs/superpowers/reports/img/hpa-398/runtime-background-foreground-render-failure.png` | `docs/superpowers/reports/img/hpa-398/runtime-background-foreground-render-failure.renderer.json` | base survives a foreground render exception while only the seven multi-owner blockers (`7/82`) return |

The load-failure and injected-render-failure modes intentionally log scoped
console errors. Normal, disabled, and timed evidence is clean; these expected
fault-mode messages are not production-runtime errors.

### Foreground occlusion

| Motif/side | Capture | Plane/geometry sidecar | Inspection |
| --- | --- | --- | --- |
| hedge behind | `docs/superpowers/reports/img/hpa-398/runtime-occlusion-hedge-behind.png` | `docs/superpowers/reports/img/hpa-398/runtime-occlusion-hedge-behind.planes.json` | `village-block-2-2`, player center 19 px behind/north of cutoff; lower silhouette is occluded |
| hedge front | `docs/superpowers/reports/img/hpa-398/runtime-occlusion-hedge-front.png` | `docs/superpowers/reports/img/hpa-398/runtime-occlusion-hedge-front.planes.json` | same authored blocker, player center 85 px in front/south; full silhouette is readable |
| low wall behind | `docs/superpowers/reports/img/hpa-398/runtime-occlusion-low-wall-behind.png` | `docs/superpowers/reports/img/hpa-398/runtime-occlusion-low-wall-behind.planes.json` | `village-block-19-2`, player center 19 px behind/north; lower silhouette is occluded |
| low wall front | `docs/superpowers/reports/img/hpa-398/runtime-occlusion-low-wall-front.png` | `docs/superpowers/reports/img/hpa-398/runtime-occlusion-low-wall-front.planes.json` | same authored blocker, player center 53 px in front/south; full silhouette is readable |

Each sidecar records the shared collision-derived proof case, exact player
position, player depth `0`, base image depth `-9`, foreground image depth
`100`, and the actual `1792×1536` image transform. These captures prove live
Phaser behavior, not only a static composite.

The corresponding deterministic static proof captures are:

- `docs/superpowers/reports/img/hpa-398/village-obstacle-proof-hedge-behind.png`;
- `docs/superpowers/reports/img/hpa-398/village-obstacle-proof-hedge-front.png`;
- `docs/superpowers/reports/img/hpa-398/village-obstacle-proof-wall-behind.png`;
- `docs/superpowers/reports/img/hpa-398/village-obstacle-proof-wall-front.png`.

Their versioned geometry and semantic manifest is
`docs/superpowers/reports/img/hpa-398/village-obstacle-visual-proof.json`.

### Districts, minimap, and route continuity

The six district captures show the continuous approved village surface, player
context, HUD, and minimap:

- `docs/superpowers/reports/img/hpa-398/runtime-district-home-yard.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-district-well-plaza.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-district-market-blacksmith.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-district-north-guild.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-district-shrine-garden.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-district-east-gate.png`.

The seam/handoff captures are:

- `docs/superpowers/reports/img/hpa-398/runtime-handoff-north.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-handoff-north-crossroads.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-handoff-south.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-handoff-west.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-handoff-east.png`.

The exact requested/observed seam positions and capture method are recorded in
`docs/superpowers/reports/img/hpa-398/runtime-handoff-inspection.json`.
North/south/east/west edge captures use save-position injection for visual seam
inspection and are not mislabeled as traversal evidence. The separate
`runtime-handoff-north-crossroads.png` capture and the authored 43-leg route
prove the playable East Gate → Crossroads north throat → village return.

### Interiors, rewards, and save/reload

The route completed all seven interior round trips:

- `docs/superpowers/reports/img/hpa-398/runtime-interior-item-shop.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-interior-hero-house.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-interior-shrine-of-aurora-interior.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-interior-villager-house-1.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-interior-villager-house-2.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-interior-villager-house-3.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-interior-guild-hall.png`.

The market and shrine reward positions are:

- `docs/superpowers/reports/img/hpa-398/runtime-reward-market.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-reward-shrine.png`.

Exact save/reload equality is captured at four representative checkpoints:

- `docs/superpowers/reports/img/hpa-398/runtime-save-reload-home.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-save-reload-plaza.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-save-reload-shrine.png`;
- `docs/superpowers/reports/img/hpa-398/runtime-save-reload-east-gate.png`.

The four checkpoint records all have `exact=true`. The screenshots also retain
the expected minimap/player context after reload.

### Static composite controls

The material static inspection captures are:

- `docs/superpowers/reports/img/hpa-398/village-obstacle-proof-base.png` —
  finalized base plane;
- `docs/superpowers/reports/img/hpa-398/village-obstacle-proof-foreground.png`
  — isolated sparse foreground alpha;
- `docs/superpowers/reports/img/hpa-398/village-obstacle-proof-composite.png`
  — approved two-plane composite;
- `docs/superpowers/reports/img/hpa-398/village-obstacle-proof-crop-edges.png`
  — protected crop/feather edges;
- `docs/superpowers/reports/img/hpa-398/village-obstacle-proof-corridor-seam.png`
  — East Gate/Crossroads seam.

The masks, ownership overlay, source/chroma/layer/candidate images, prompt,
transform, and all hashes are indexed by:

- `docs/superpowers/reports/img/hpa-398/village-obstacle-control-manifest.json`;
- `docs/superpowers/reports/img/hpa-398/village-obstacle-provenance.json`.

## Walkthrough and raw evidence

The source-derived schedule contains the same 43 ordered legs in the
acceptance, enabled timing, and disabled timing runs. Each reports:

- zero snags;
- all seven interior round trips;
- continuous Sundrop Village traversal;
- the East Gate/Crossroads north-throat handoff and return;
- the same ordered waypoint schedule in enabled and disabled modes.

Raw route and timing evidence:

- `docs/superpowers/reports/img/hpa-398/runtime-route-acceptance.json`;
- `docs/superpowers/reports/img/hpa-398/runtime-timing-enabled.json`;
- `docs/superpowers/reports/img/hpa-398/runtime-timing-off.json`;
- `docs/superpowers/reports/img/hpa-398/runtime-performance-gate.json`;
- `docs/superpowers/reports/img/hpa-398/runtime-browser-acceptance-summary.json`.

All five carry direct `commit` and `sourceBinding.sourceCommit` fields equal to
`513071611d0072aa5052d594d85fe82ca3af265c`.

The gate and summary cryptographically bind the exact emitted raw bytes:

| Raw artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| route acceptance | 293,050 | `7478bbb57568f3b543492f22601309e7c3c063b8e5bfe14325c7f499d5414788` |
| timing enabled | 445,161 | `b6a3ae59a0a4aac2ffa9daca48d9986f14aef59bbe0715de2534fd2be17dc907` |
| timing disabled | 437,851 | `f6f9b0c7061e0591acadd91375b1351d532d2d08507d7e04c8cb2b7e5c193586` |

The summary also binds the exact named performance gate:

```text
33,599 bytes
8179c5d88aed4ac58a5fa737ed4bf375881b49e5b1c6b9d5d741ffcd172b9828
```

An independent post-run verifier re-read every file and recomputed all four
byte counts and SHA-256 values exactly.

## Renderer, loading, upload, and performance evidence

Reference environment:

- macOS reference device;
- headed Chromium `147.0.7727.15`;
- viewport `1280×720`;
- 120-frame warmup per timed mode;
- WebGL renderer with `MAX_TEXTURE_SIZE=16,384`.

Final timed evidence:

| Metric | Enabled | Disabled |
| --- | ---: | ---: |
| exact regional requests | 2 | 0 |
| preload completions | 2 | 0 |
| successful plane descriptors | 2 | 0 (`disabled`) |
| observed regional `texImage2D` uploads | exactly two `1792×1536` | 0 |
| frame samples | 6,417 | 6,397 |
| median frame time | `8.30000000000291ms` | `8.300000000001091ms` |
| p95 frame time | `9.199999999999818ms` | `9.400000000001455ms` |
| WebGL context loss | 0 | 0 |
| uncaught page errors | 0 | 0 |
| console errors | 0 | 0 |
| failed responses | 0 | 0 |

The enabled upload count remains exactly two after all seven interior round
trips, so no regional texture re-upload was observed. The p95 delta is
`-0.2000000000016371ms`, passing the `<=2ms` gate. All 14 named performance predicates pass.

## Limitations and conclusion

Performance values are reference-device evidence for the stated macOS/Chromium
environment; they are not claimed as a universal hardware benchmark.

Native/production limitations for the required macOS release gate: none. The
fresh command built both the application bundle and DMG. Windows packaging and
execution were not run on this macOS host and are not claimed by this report.

The accepted HPA-398 contract is therefore proven at source commit
`513071611d0072aa5052d594d85fe82ca3af265c`: deterministic art and ownership,
zero normal-state duplication, complete degraded fallback, collision
independence, live occlusion, continuous traversal/save/minimap behavior,
clean normal runtime diagnostics, bounded decoded allocation, and a passing
reference-device frame-time gate.

# Task 5 report: four literal runtime slices and complete approval

Status: DONE

## RED

- `bun test tools/export-meadow-entry-painted-v2-complete.test.ts tools/approve-meadow-entry-painted-v2-complete-art-package.test.ts` initially failed with missing exporter and approval modules.
- The new complete generator tests initially failed because the generator had no complete package argument, input, or destination.

## GREEN

- Exporter decodes the approved master once, copies the four exact 3200x3200 RGBA rectangles, canonical-encodes each slice, and rejects dimension, opacity, overlap, coverage, master, crop, or approval drift.
- Export provenance binds the complete control fingerprint, crop manifest hash, master provenance hash, master identity, source rectangles, runtime paths, texture keys, draw orders, dimensions, and PNG hashes.
- Complete approval binds the master, master/export/crop provenance, four base exports, four-texture probe report, review proof inventory, validation report, and current Git LFS configuration. It rejects foreground exports and visual-owner rows by construction.
- Complete runtime generation is explicit (`--package complete`), writes the separate generated module, emits the four exact descriptors, and emits an empty visual-owner collection. Legacy generator arguments and output remain unchanged.

## Verification

- Export write: passed.
- Export `--check`: passed.
- Approval write with `reviewedBy=chanwaichan`, `reviewedAt=2026-08-23T07:50:29Z`: passed.
- Approval `--check`: passed.
- Complete runtime generator write and `--check`: passed.
- Exporter tests: 5 passed, including independent decoded-pixel equality against all four checked-in PNGs.
- Approval tests: 8 passed, including control/master/provenance/probe/proof/report drift and missing/foreground export failures.
- Runtime generator tests plus guards: 23 passed.
- `bun run check`: passed with 0 errors and 0 warnings.
- Targeted ESLint: passed.
- Targeted Prettier: passed.
- `git diff --check`: passed.
- Approved master hash: `11a417318b089b6cc1a47bee639306bb78379b7847ea42598c789b57c76c6a52`.
- Export provenance hash: `c79e0a1867a0cc9e9b3ec7abf7be6a2c93e3163dab55541fcfc5409b7d78adce`.

## Review correction: canonical complete controls

The aggregate gate initially exposed a reproducibility defect: the three checked-in complete
control JSON files had tab-indented bytes while the current renderer emitted canonical two-space
JSON. Parsed semantics and the complete control fingerprint were unchanged, but the exporter is
byte-strict, so the artifacts were regenerated and the dependent approvals were resealed.

| Artifact | Before SHA-256 | After SHA-256 |
| --- | --- | --- |
| `meadow-entry-control-manifest.json` | `c1cb9c1453f4719a21908225fc0bfaa143366ea4f66361ac48111842d385afb0` | `c5331405228aa77cad30a8cc1c6e41a317d919c346bef1efdaf44efd566e8f66` |
| `meadow-entry-bake-ownership.json` | `c35056ea8c39dc5375662b47970fab7243076d9e410d14a1735918017472e8ae` | `216922ba339a4290c7e6c12f7ce59f1ff1787a0c37dfcb44e9a4263dddb6c954` |
| `meadow-entry-crop-manifest.json` | `ce54f5b0fd45b7af3024bf22e2a7dc5627e308ee8ad5b0ba2ad491c9e2eb3d4b` | `5e1cfc1957a72028b8f9e912892159b30517a1fa683ae82c0da02bc9a37c2870` |
| complete export provenance | `c79e0a1867a0cc9e9b3ec7abf7be6a2c93e3163dab55541fcfc5409b7d78adce` | `f0e87bad23824e2df38e8f6d2c43162f7f14559df06a13c5a78a462f4471d9e6` |

The complete controls approval was resealed at `2026-08-23T08:22:38Z` and the complete art
package approval at `2026-08-23T08:22:50Z`, both reviewed by `chanwaichan`. Approval module
byte hashes changed from `4660b50246f61df0992fda1a45c378057c2d35fc91f15403d175924be7f9f2a9` to
`e1bb8a165118eb361cb56e68355498d08720cf34913a41c944a42933e55970eb` (controls) and from
`d169c0236d5a14dddbf870be377eaa37d3580eb6d9cf03128e306e9e9db79f39` to
`2024aea963ac7ea43eca78e923c9ee0f1401f6a3fa300c3dd42192cd58f67ddd` (complete art). The
controls approval now binds storage hash
`42455c6bab7889dd99cc194683ccaa6f2a19b0a067aede17fe34faf6282fd1ab`.

The approved master remained `11a417318b089b6cc1a47bee639306bb78379b7847ea42598c789b57c76c6a52`.
All four runtime PNG hashes remained unchanged:

- northwest `d6e8c85f61071a1cb3927da36c78d36c30a1c45a7ed565074ea771781e77ac7d`
- northeast `8bb684549f25792087da9a3a6511f704489123f83820afdde96b3ebfe00a3769`
- southwest `a3673e0f25eeb99927497cf4bdf47241602ff7ac86f4195ad46732444bb85dca`
- southeast `9e67033819c20e000084c140a67ebab843fcf3855b938eb49da823ebb1b01c7b`

Correction verification:

- complete controls export/check and controls approval/check: passed;
- complete art export/check, art approval/check, and runtime generator/check: passed;
- `bun run art:validate:meadow-entry-complete`: passed (controls, finalizer, review proof,
  export, both approvals, generator, and 13 exporter/approval tests);
- complete controls approval tests: 4 passed;
- Git LFS storage verification and `git lfs fsck --objects`: passed.

## Remaining prerequisite

No remaining Task 5 prerequisite is known. The aggregate complete validation is green after the
canonical control regeneration; legacy controls, art, runtime, geometry, master, review evidence,
and Task 6 bindings were not changed.

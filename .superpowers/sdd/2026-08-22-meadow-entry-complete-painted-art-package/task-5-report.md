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

## Remaining prerequisite

The aggregate `art:validate:meadow-entry-complete` command currently stops in its pre-existing Task 1 control stage: the checked-in complete control JSON files use tab indentation while the current renderer produces two-space JSON, so `export-meadow-entry-art-controls.ts --package complete --check` reports the control manifest stale. Task 5 leaves those Task 1 files untouched; the direct Task 5 gates above pass.

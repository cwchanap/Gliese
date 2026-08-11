# Task 6 report — painted-v2 writer retarget and no-write checks

## Scope and inventory

Implemented only the Task 6 writer/verification slice from base
`d54972cd09a09c22f722295803413b7579b9e6dc`.

- Active finalizer and regional exporter now default directly to
  `artifacts/meadow-entry/painted-v2` and consume the reviewed painted-v2 controls,
  crops, overlaps, and ownership inputs.
- Regional export accepts an optional foreground master; the base-only pilot publishes
  only base planes and never fabricates a transparent foreground master. Default exports
  are byte-identical between `artifacts/meadow-entry/painted-v2/exports/` and
  `public/game/assets/regions/meadow-entry-painted-v2/` when art is supplied.
- Active proof output is `artifacts/meadow-entry/painted-v2/proofs/`; its fixed inventory is
  exactly six PNG/JSON pairs:

  1. `pilot-assembly-master-transparency`
  2. `pilot-assembly-base-coverage`
  3. `pilot-assembly-protected-live`
  4. `pilot-assembly-ownership`
  5. `pilot-assembly-overlap-sundrop-connector`
  6. `pilot-assembly-overlap-connector-crossroads`

- Active approval destination is
  `src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts`.
- Every active writer now accepts `--check`; check mode recomputes bytes/object data and
  performs no `mkdir`, `write`, `rename`, or `rm`. Missing and stale outputs fail closed.
- Historical HPA-399 package/proof descriptors, artifacts, and approval bytes remain
  read-only. Historical validator regeneration was replaced with committed hash and
  allowlist comparison so it never asks the active V2 writer to rebuild HPA-399.

## RED evidence (captured before production edits)

The original focused command (four pre-existing files) reported 130 tests with six
historical ENOENT failures caused by the deleted public Sundrop predecessor PNGs.
After adding the Task 6 parser, no-write, stale-byte, optional-foreground, and six-ID
assertions—before changing production code—the six-file command reported 160 tests with
19 failures: the six pre-existing ENOENT failures plus 13 genuine new-contract failures
(missing `--check` APIs, HPA-399 defaults, active proof inventory, and approval destination).

## GREEN evidence

Focused command:

```text
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-finalizer-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-export-regions-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-art-package-validator.test.ts
```

Result: 7 files, 199 tests passed.

Historical validator:

```text
bun run art:validate:meadow-entry
```

Result: status `ok`; publication sentinels, Git LFS, controls check, approved-package
hash/allowlist validation, deterministic committed-output validation, focused suite
(22 files / 541 tests), and tracked-status stages all passed.

Additional gates: `bun run check` (0 diagnostics), `bun run lint` (Prettier and ESLint
pass), and `git diff --check` pass.

## Check/no-write and stale/missing evidence

- Finalizer fixture check passed without changing the seeded painted-v2 package; changing
  one master byte produced a stale error. Existing `--validate-only` single-plane tests
  remain green. The actual default `--check` command currently fails at the missing
  candidate/master boundary, before any write.
- Export fixture check passed with matching artifact/runtime snapshots; changing one
  runtime byte produced a stale error. The actual
  `bun run art:check:meadow-entry-export` command fails with ENOENT for the absent
  painted-v2 base master.
- Proof fixture check passed with the exact six-pair inventory and no filesystem mutation;
  changing one proof byte produced a stale error. The actual
  `bun run art:check:meadow-entry-proof` command fails with ENOENT for the absent
  painted-v2 base master.
- Approval fixture check passed without writes; changing the module bytes produced a
  stale error. The actual `bun run art:check:meadow-entry-approval` command fails with
  ENOENT for the absent painted-v2 base master.

No masters, scenic exports, proofs, runtime PNGs, or painted-v2 approval module were
generated in PR2a. The only files under the painted-v2 artifact root remain the reviewed
controls and LFS canary; the runtime regional directory remains empty.

## Historical failure clearance

The six staged failures in the historical validator suite were stale assumptions exposed
by Task 1/4 cleanup and Task 5 V2 controls:

- controls approval tests now use the active V2 LFS/evidence contract;
- historical controls/art-package asset tests pin the immutable HPA-399 storage hash and
  approval rows;
- historical proof sidecars bind deleted public Sundrop predecessor inputs to their
  committed HPA-398 approval hashes instead of reading removed PNGs;
- validator deterministic regeneration now compares committed HPA-399 bytes and exact
  allowlists, with no active V2 rebuild.

The historical approval module and `artifacts/meadow-entry/hpa-399/**` were not edited.

## Status and concerns

PR2a intentionally leaves actual painted-v2 checks failing as missing until PR2b supplies
the reviewed masters/exports/proofs. No gameplay, map-selection, runtime-background, or
scenic PNG changes are included. The active approval writer will remain missing-art
blocked until those PR2b inputs exist.

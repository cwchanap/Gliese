# HPA-839 acceptance evidence

## Browser checks

Chromium 158 ran the persisted Playwright scenarios on a shared CDP connection,
with Chrome DevTools MCP observing the same targets. The uninterrupted New Run
journey from Mott through Oren passed twice, including Enter-driven dialogue and
the visible equipped-item status. The first-wolf battle used a separate saved
checkpoint with both story items equipped; it showed ATK 4 and DEF 1 without
opening Gear. The Borak checkpoint covered the reward, Save/Continue, and loading
intentionally unworn gear. The Mira scenario covered prices, buying, healing,
selling, localized text, keyboard activation, and tooltip/action geometry.

The focused shared-browser run passed five tests: Mira, Oren checkpoint, first
wolves checkpoint, Borak persistence, and evidence-file safety. The separately
run New Run journey passed twice; a later rerun failed the `jog-north` corridor
trace assertion, so the route is still flaky. Attempts to continue from Oren to
the first wolves also failed before reaching the fight. The MCP observations
include:

- [Mott reward](hpa-839-story-gear-shop/mott-mcp.txt) and
  [Oren reward](hpa-839-story-gear-shop/oren-mcp.txt), target
  `BF79F132AF6E941C63794C41891CF665`.
- [Mira Sell](hpa-839-story-gear-shop/shop-sell-mcp.txt), target
  `EF913F4712BB30852108A773F1788933`.
- [First-wolf battle](hpa-839-story-gear-shop/wolves-mcp.txt), target
  `542DCC16513DDD7AB54372FC35489EDF`.

The target IDs were correlated using each page's CDP target and time origin.
These are separate test runs; the first-wolf checkpoint is not an uninterrupted
continuation of the New Run journey.

## Screenshots

- [Mira, 1280 x 720](img/hpa-839-story-gear-shop/shop-1280x720.png)
- [Mira, 640 x 360](img/hpa-839-story-gear-shop/shop-640x360.png)
- [Mott status](img/hpa-839-story-gear-shop/mott-amulet-status.png)
- [Oren status](img/hpa-839-story-gear-shop/oren-spear-status.png)

Unlike the [reported failure](https://linear.app/cwchanap/issue/HPA-839), the
captured tooltips sit in the stock column rather than over Buy. The images use
fallback interiors because the production interior images are Git LFS pointers
in this checkout. They do not establish asset-complete visual acceptance.

## Quality checks

- `bun run check`, `bun run lint`, and `bun run build`: passed.
- `bun run story:check` and `bun run story:check:strict`: passed in the
  `tauri-gui:local` container; host GLib 2.68 is below the required 2.70.
- `bun run test:unit -- --run --maxWorkers=2`: 1,655 passed and four failed.
  The failures are the baseline interior image-hash checks against missing Git
  LFS assets. Chromium was supplied through an isolated browser-path override.

At the time of this initial run, asset-complete visual acceptance and a fully
green unit run were blocked by missing Git LFS assets. The uninterrupted
New Run-to-first-wolves check and reliable execution of the long keyboard route
also remained open.

An earlier run overwrote an ignored trace file in another task's evidence
directory; its previous contents could not be recovered. The journey now retains
the trace as a Playwright attachment instead of writing to that shared file.

## Follow-up

The [asset-complete visual review](2026-11-22-hpa-839-visual-acceptance.md)
used separately staged, hash-verified production assets and passed the shop
and reward-screen checks. The four LFS-dependent asset tests also passed
against those staged files. The worktree itself still contains LFS pointers,
the full unit suite was not rerun with staged assets, and the uninterrupted
New Run-to-first-wolves journey remains unverified.

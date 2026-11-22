# HPA-839 asset-complete visual acceptance

## Setup

The checkout at `ff4e4cbee3e20edf74a7bbb278608e8af6a79738` still contained
nine Git LFS pointers for interior artwork. For this run, the corresponding
production files were downloaded from GitHub's media endpoint at that exact
revision and verified against each pointer's SHA-256 and size. A fresh Vite
preview build used those verified files in its own output directory; no tracked
checkout files were replaced. The [asset manifest](hpa-839-visual-acceptance-20261122/asset-manifest.json)
records all nine hashes and sizes.

Chromium 158 and Chrome DevTools MCP observed the same live Playwright targets
through a shared CDP connection. Each MCP snapshot records the CDP target ID
and the page's matching `performance.timeOrigin`; the Playwright test's CDP
guard checked target membership. The screenshots labelled MCP below were
captured through Chrome DevTools MCP, not a separate browser.

## Visual review

The [original Linear report](https://linear.app/cwchanap/issue/HPA-839) showed
Sunleaf Salve at 12 coins and a Field Potion tooltip covering Buy. Against that
reference, the new screenshots show the salve at 6 coins and the tooltip inside
the stock column, leaving the action unobstructed:

- [1280 x 720 Buy, MCP](img/hpa-839-visual-acceptance-20261122/shop-1280-buy.png)
  ([snapshot](hpa-839-visual-acceptance-20261122/shop-1280-buy.txt))
- [640 x 360 Buy, MCP](img/hpa-839-visual-acceptance-20261122/shop-640-buy.png)
  ([snapshot](hpa-839-visual-acceptance-20261122/shop-640-buy.txt))
- [640 x 360 Sell, MCP](img/hpa-839-visual-acceptance-20261122/shop-640-sell.png)
  ([snapshot](hpa-839-visual-acceptance-20261122/shop-640-sell.txt))
- [640 x 360 Japanese](img/hpa-839-visual-acceptance-20261122/shop-640-ja.png)
  and [Traditional Chinese](img/hpa-839-visual-acceptance-20261122/shop-640-zh-hant.png)
  (Playwright screenshots)

The localized tooltip text is readable without clipping in these captures.
The running-game test also checked tooltip/action geometry and hit testing,
keyboard Buy/Sell, the 10/6/18 price labels, two purchases, 6 HP healing and
the 3-coin resale.

The named post-dialogue status is readable over the production painted
interiors:

- [Mott, 1280 x 720](img/hpa-839-visual-acceptance-20261122/mott-1280-status.png)
  ([MCP snapshot](hpa-839-visual-acceptance-20261122/mott-1280-status.txt))
- [Oren, 1280 x 720](img/hpa-839-visual-acceptance-20261122/oren-1280-status.png)
  ([MCP snapshot](hpa-839-visual-acceptance-20261122/oren-1280-status.txt));
  [640 x 360](img/hpa-839-visual-acceptance-20261122/oren-640-status.png)
  ([MCP snapshot](hpa-839-visual-acceptance-20261122/oren-640-status.txt))
- [Borak, 1280 x 720](img/hpa-839-visual-acceptance-20261122/borak-1280-status.png)
  ([MCP snapshot](hpa-839-visual-acceptance-20261122/borak-1280-status.txt));
  [640 x 360](img/hpa-839-visual-acceptance-20261122/borak-640-status.png)
  ([MCP snapshot](hpa-839-visual-acceptance-20261122/borak-640-status.txt))

Mott was reached through a real New Run; Oren and Borak used saved checkpoints
and their actual reward dialogues. The Borak scenario also checked save/load
and manually unworn equipment.

## Results and remaining gates

- Four persisted shared-browser scenarios passed: Mira, Oren, first-wolf
  checkpoint, and Borak (`4 passed`, 3.3 minutes).
- Oren and Borak passed again with the Playwright viewport set to 640 x 360
  (`2 passed`, 39.4 seconds).
- The original four LFS-dependent interior asset tests passed against the
  exact staged assets (`4 passed`). The full unit suite was not rerun with
  those assets.
- The New Run captured Mott's status, but the test later failed its
  `jog-north` corridor trace assertion. It did not reach Oren in this run.
  The uninterrupted New Run-to-first-wolves requirement remains unverified.

The principal scenario command, with a fresh output directory and the
shared-browser connection supplied by the environment, was:

```sh
PW_TEST_CONNECT_WS_ENDPOINT="$PLAYWRIGHT_WS" HPA840_SHARED_CDP="http://127.0.0.1:9333" \
  HPA839_EVIDENCE_ROOT="$EVIDENCE_ROOT" bunx playwright test tests/e2e/game.e2e.ts \
  --project gate --grep 'HPA-839 Mira|HPA-839 Oren reward|HPA-839 reporting the Boar King|HPA-839 first wolf' \
  --reporter=line --trace off --output "$RESULTS_DIR"
```

The original asset tests ran with the real project as Vitest root/config and
the staged assets as the process working directory:

```sh
vitest run --config "$REPO/vite.config.ts" --root "$REPO" --project server \
  src/lib/game/content/village-interior-assets.asset.test.ts --maxWorkers=1 --no-file-parallelism
```

The worktree still contains LFS pointers, so a normal full-suite run there
would still encounter the missing-image failures. This visual review does not
resolve the separate route or full-suite gates.

# HPA-841 — Prologue completion and UI/text cleanup (design specification)

**Linear:** https://linear.app/cwchanap/issue/HPA-841  
**Review:** https://github.com/cwchanap/Gliese/pull/67#pullrequestreview-5912631095  
**Repository baseline:** main at `592034bb0c8030e6468bd21e82c3a0b587f778bd` (2026-11-15)  
**Delivery:** one draft PR (#67) containing this design and the implementation plan; add subsequent code/test commits to the same PR.

## Goal and boundaries

After Grik's vow, the player sees the existing final story cue “Chapter One: The Hunt.”, then a full-screen completion card over existing title key art with the required headings **“End of the Prologue”** and **“Thank you for playing.”** The card is dismissible after the final autosave attempt. Returning to Title → Continue loads the ridge and shows **“Prologue complete”** without replaying the card. Fix the other 11 specific UI/text findings in HPA-841 without new art or SFX.

Remove only the redundant narrative sentence “End of the Prologue.” from `story/beats/prologue/escape.md`, retaining the “Chapter One: The Hunt.” line as the final in-story cue; the required card heading remains unchanged. This resolves duplicated consecutive copy without changing the ticket's card text.

Out of scope: battle redesign (HPA-837), flee/hotkeys (HPA-838), keyboard menu rework (HPA-836, already landed), window resizing (HPA-840), new chapters, per-region battle backdrops, new art/SFX, and unrelated abstractions.

## Verified current owners and review corrections

- `content/quests.ts` contains seven `mainQuestIds`. The final `climb-to-the-ridge` objective queues `prologue.the-vow` and `prologue.chapter-one`. `WorldScene.updateStory` consumes `pendingEffects` sequentially after dialogues close; an `isQuestComplete` UI check alone would show the card too early.
- **Save validation is critical:** `save/save-state.ts:isQuestEffect` only accepts `play-scene` and `move-player`. The checkpoint saved while chapter-one dialogue is shown will contain a pending terminal marker. Without extending the validator, `Continue` may reject the save.
- **Playing → Title is new:** `GameShell.svelte` captures title slot metadata as startup constants, `ui-bridge/store.ts` retains the last ready HUD state, and its shell `onHudState(ready)` effect intentionally enables initial field mounting in existing Svelte component tests. **Keep that initial promotion**; suppress it only after `returnToTitle()` until the next explicit `beginRun()`. `WorldScene` also has asynchronous story/NPC dialogue requests; invalidate their `storyDialogueSeq` and mark the scene shut down in its cleanup so a late response cannot publish stale HUD and remount a finished run.
- **Autosave is post-render:** `WorldScene.writeAutosave` uses `afterNextRenderedFrame` and `flushSaveStorage` with no caller-visible result. It must return an awaitable completion result for the terminal transition, **without** bypassing the existing render/write path.
- **Test environment:** current CI runs Ubuntu Chromium / Vite preview / localStorage, not Tauri WKWebView or WebView2. It is a suitable automated behavior proxy but cannot verify native desktop disk flushing. Existing scene tests have a failing `flushSaveStorage` stub. Do not add unsupported OS-native E2E claims, a macOS/Windows test-runner matrix, or new screenshot golden baselines.

## Design A — ending: existing quest effect, one card, safe return

**1. Ordered trigger and saved type.** Append `{ type: 'show-prologue-end' }` to the final objective's `onComplete` after both scene effects. Extend the discriminated `QuestEffect` union and `save/save-state.ts:isQuestEffect` to accept the exact zero-payload literal. Test a `SaveState` round trip with this pending marker. The effect is consumed exactly once after the last story line, and completion uses the existing seven-quest state; no new `endingSeen` bit, eighth quest or save migration.

**2. Ordered save and failure.** Have `WorldScene.writeAutosave` return `Promise<boolean>` when the write/flush completes, using its existing `afterNextRenderedFrame` callback and thumbnail behavior. Save the state **after consuming the terminal effect**, await its result before allowing the card to be dismissed, and test ordering against the previous chapter-one checkpoint; an older queued write must never overwrite the finalized state. Do not write directly outside the post-render queue.

If the terminal flush fails, display a localized “Could not save” notice on the card, then **allow** a return to Title; do not strand the player or pretend the write succeeded. The preceding chapter-one checkpoint should normally preserve a pending marker if it was itself saved successfully; an earlier checkpoint is not guaranteed if storage is entirely broken, and the warning must not promise otherwise. No retry/requeue subsystem. A `?startMap=` dev-map run intentionally does not write saves: resolve the terminal step immediately and keep the card dismissible.

**3. Presentation and input.** Expose one transient completion notification through the existing Phaser→Svelte bridge. Keep `WorldScene.storyEffectRunning` active (or equivalently keep the scene paused) **for the entire time the completion card remains visible**, not merely until autosave resolves; only `returnToTitle()` tears down the frozen scene. In GameShell, route keyboard dismissal through existing `handleGlobalKeydown`, pad input through `handlePadUiAction`/existing confirm-cancel paths, and pointer input through the card. Block `Escape`, `I`, `M`, Menu, other pad menu actions, and field UI while visible; only an eligible dismissal action may return to Title. Reuse HPA-836's held-key shield: ignore held/repeated `Enter`/`Space` when `shieldedActivationKeys` owns them, prevent default and drain the triggering release so the same press cannot activate a focused Title control. No second global listener. Make focus and screen reader labeling explicit; respect reduced motion.

**4. One `returnToTitle()` and HUD reset.** GameShell resets all overlay/pause flags, the completion card, activation-key shield, stale run request and playtime, and refreshes `loadSaveSlots`, `getNewestSaveSlot`, Continue subtitle and New Run overwrite state. Add a small `resetHudState()` in `ui-bridge/store.ts` to clear the previous run's `ready` payload. **Preserve** the existing `onHudState(ready) => mode='playing'` behavior on initial mount for the embedded test harness; use a local post-return guard that ignores late ready emits while Title is shown, cleared on `beginRun()`. In `WorldScene.cleanup()`, increment `storyDialogueSeq` and mark shutdown; make `publishHudState` no-op after shutdown, and reset the shutdown flag on scene creation. Include browser-component regressions for both the initial ready boot and dismissed card → Title → refreshed subtitle → no remount after late ready HUD events.

**5. Single progress source.** `buildHudQuestState` gains `total: mainQuestIds.length`. Use `completed.length === total` to render the permanent “Prologue complete” tracker and `completed.length / total` for journal Chapter Progress. No parallel counters or persisted completion bit. Continue loads the final ridge state; unfinished saves use their normal quest.

### Completion-card visual reference

Use `/game/assets/heroic-ui/title-key-art.png` full-bleed, a dark scrim, existing game typography and gold text tokens. No new artwork.

```text
┌───────────────────────────────────────────────────────────────┐
│       Existing title art, dark full-screen scrim             │
│                                                               │
│                  END OF THE PROLOGUE                          │
│                  Thank you for playing                       │
│                                                               │
│                 Any key / click / pad → Title                 │
└───────────────────────────────────────────────────────────────┘
```

## Design B — 11 UAT corrections

| # | Player-visible change | Minimal code owner |
|---|---|---|
| 1 | EQUIPPED badge does not overlap the equipment label | `BagScreen.svelte`: put badge and label in non-intersecting corners/rows; assert rectangles |
| 2 | Only one “↵ Select” hint on Title | `TitleScreen.svelte`: remove duplicate “↵ Enter” render and dead locale key |
| 3 | Empty field status pill is not visually present | `FieldHud.svelte`: preserve accessibility live region but no empty card background |
| 4 | No “Dialogue closed”, stale menu/footer text, or stale language after switching | `WorldScene`: keep status `MessageKey + params` until publish, including `scene.restart({ status })` / `WorldSceneData.status`; do not emit `status.dialogueClosed`. Clear transient field status in the **existing** idempotent `pause-game` handler; change `GameShell.pauseForOverlay` to call `requestPauseGame()` whenever the pause owner **changes**, not only when it was null. This clears `Command Grid → Heal → Save` and repeated Save openings while retaining Save's own success/failure feedback. No new command/status channel |
| 5 | Potion-consuming Rest is labeled “Heal”; zero potions explains disabled state | `CommandGrid.svelte`, locales. Keep internal `rest` command ID and `requestHeal()`, show “No potions” with accessible description/tooltip |
| 6 | Remove disabled HUD density Quiet/Full selector | `SystemScreen.svelte`: delete row, update focus lattice, remove unused locales; no preference migration |
| 7 | New Run confirmation appears below Title action cards | `GameShell.svelte` styling: preserve focus trap and confirmation behavior, correct 640×360 compact layout |
| 8 | Raid captain's scripted loss proceeds to story, without generic Defeat summary | `core/battle.ts:applyBattleDefeat` already calls `applyQuestEvent(lose-battle)`. Return `summary: null` only if the matching objective **actually progressed/completed**; `BattleScene.finishBattle` sends any `summary: null` application straight to WorldScene. Ordinary defeat keeps a summary. Test in `core/battle.test.ts` and scene harness |
| 9 | Names follow current overworld chunk; Title says Sundrop · Prologue | Pure coordinate→`overworld.chunks` lookup using `PlacedGridChunk` bounds, mapping Sundrop/Wildwood North+East/Silverpine/Mistfen to localized labels, and generic fallback elsewhere. `WorldScene.update()` must republish on `explorationChanged || areaChanged` (compare last published region identifier) so backtracking across **already-explored** borders refreshes the HUD. `QuestJournal.questGiverLocation` uses the matching **NPC's** position, and Title/Save location labels use the **saved player's** position, via the same `getAreaName`. No duplicate coordinate rectangles |
| 10 | Journal shows completed **main quests / 7** (3 = 43%, 7 = 100%); objective chain wraps; no fake “Turned in by” | `QuestJournal.svelte` builds a **seven-row** Chapter Progress checklist from `mainQuestIds` + localized quest titles (`getQuestText`) and `HudQuestState.total`/`completed.length`, even when `quests.main === null` (7/7=100%). Preserve `.quest-rail-entries` for active/completed quest details and the per-quest objective chain, wrapping that chain without clipping. Update the existing four-objective progress assertions in `GameShell.svelte.spec.ts:2113–2188`; remove misleading caption |
| 11 | Escape advances quest/scripted dialogue without skipping it; ambient chat still closes. Lirra objective reads “See Lirra at the Herb Hut” | Reuse existing `canClose`, not a new escape flag: `createSceneSessionFromStory` sets false; `WorldScene.applyQuestProgress` returns whether the talk event actually advanced quest state and sets NPC session's `canClose=false` only then. `DialoguePanel` uses reveal/advance on Escape when non-closeable. Close button and pad B already respect `canClose`; fallback/ambient dialogue stays closeable. Keep stable objective ID |

### Small implementation constraints

- `mode === 'system'` is *not* a proxy for scripted narration because fallback notices use that mode too. Use `canClose` and real quest progression.
- `pause-game` is already a non-mutating HUD command. Clearing status there avoids adding a second command; **`pauseForOverlay` must re-issue it when `pauseOwner !== owner`**, including `settings → save` after Heal. Keep Save feedback published through the existing HUD path.
- Preserve status key **and params across scene restarts**. Do not pass a translated string through `scene.restart({status})` and then expect a locale switch to retranslate it.
- The title card should not dismiss until the terminal write **attempt** finishes; a failure must be reported honestly, with return still possible.
- The completion UI and journal derive from one pure `HudQuestState.total` plus existing completed quest entries. The progress checklist includes unstarted quests by iterating `mainQuestIds`; it is not derived from only `.main`/`.completed` rows.
- Reuse the original bridge rather than building another global modal/input subsystem. A null battle summary is a direct-return result, but `recentlyFled` must be supplied **only** when `outcome === 'fled'` (never for scripted defeat).

## Localization, visual checks and test strategy

- New UI strings and changed objective labels in `en`, `ja`, `zh-Hant`. The card uses localized UI copy; the single ending story cue stays in `story/beats/prologue/escape.md`. Run `bun run story:check` after editing this source, and `story:check:strict` in verification.
- HPA-841 contains **no linked UI mockup**. The UI reference is existing Title/Bag/Quest/Save styling and the end-card diagram above. Use automated `boundingBox()`/visibility checks at **1440×900, 1280×720 and 640×360**; do **not** add `toHaveScreenshot` goldens or a platform-rendering screenshot matrix. Existing failure-only Playwright screenshots remain useful diagnostics.
- One fast near-end browser E2E seeds `gliese.saves.v1` using `core/quests.fixtures.ts`, placed immediately before `climb-to-the-ridge`. In a normal saved game (**no `?startMap=`**), execute the final ridge discovery → chapter-one cue → end card → Title → Continue. Run shorter targeted unit/component/browser tests for the other 11 changes; avoid the known-flaky full route walk.
- Unit/scene tests must cover save-state validation, chapter-one vs terminal autosave ordering, `flushSaveStorage() === false`, dev-map no-save behavior, HUD reset and late asynchronous scene events without breaking initial ready auto-promotion, scripted defeat vs ordinary defeat (including `recentlyFled`), and quest-scene vs ambient Escape. Component/browser cases must exercise `Command → Heal → Save`, already-explored Sundrop/Wildwood crossings, NPC-vs-player region labels, the Title New Run subtitle, and the journal's 7/7 panel plus its updated seven-row assertions.

## End-to-end acceptance — macOS and Windows desktop behavior

This defines the required **macOS/Windows product behavior**, not a promise of a native-driver test matrix. Today's automated gate is the existing Linux-hosted Chromium/Vite Playwright project plus Node/Svelte/scene tests; it exercises shared Svelte/Phaser gameplay behavior but **does not verify WKWebView, WebView2 or Tauri disk flush**. No Linux/Android product acceptance is added and no human sign-off is an acceptance criterion.

1. **A1 — Finished story/resume:** A seeded near-end desktop-style E2E advances final dialogue to a readable end card, waits for save attempt, returns to Title once, then Continue loads the ridge with “Prologue complete” and does not replay the ending. A save-state round trip validates a pending marker; scene tests pin ordering and disk failure.
2. **A2 — Input/scene behavior:** Automated tests exercise Escape reveal/advance for quests and scenes, ambient close, pad controls, scripted captain loss direct-to-scene, and ordinary defeat summary.
3. **A3 — All 11 fixes:** Automated DOM/state assertions cover each ticket row, seven-quest journal percentages, four localized built regions, the Heal disabled explanation, removed density row, no stale status/locale, and corrected Lirra text in en/ja/zh-Hant.
4. **A4 — Visual contract:** Automated three-viewport DOM bounds check non-overlap and visibility of Title New Run confirmation, equipment badge vs label, wrapped journal, and end card relative to existing UI mockup/reference; no screenshot golden files.
5. **A5 — CI compatibility:** `bun run check`, `bun run lint`, `bun run test:unit -- --run`, relevant Playwright `gate` tests, `bun run story:check:strict`, and release-frontend build checks pass; no new OS runners or infrastructure.

**One PR only:** add the implementation and its automated checks to draft PR #67. No art task or PR is needed because existing title art is reused.

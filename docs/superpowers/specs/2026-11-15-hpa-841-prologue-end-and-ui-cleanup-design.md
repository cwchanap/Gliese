# HPA-841 — Prologue completion and UI/text cleanup (design specification)

**Linear:** https://linear.app/cwchanap/issue/HPA-841  
**Repository:** cwchanap/Gliese  
**Baseline:** main at 592034bb0c8030e6468bd21e82c3a0b587f778bd (2026-11-15)  
**Status:** design only; implementation deliberately deferred  
**Delivery:** one PR for the entire ticket. This draft PR contains the design/spec and plan first; implementation and tests will land on this same branch/PR.

## Goal and player-facing contract

At the end of the seven-quest prologue, Grik's vow and the existing “End of the Prologue.” / “Chapter One: The Hunt.” story lines finish normally. The game then records the finished quest state and presents a full-screen completion card. A key, pointer click, or gamepad button returns to the title. Continue loads Grik on the ridge and the field tracker says “Prologue complete,” not an empty quest objective.

The same change closes the eleven specific UI/text defects captured in the 2026-11-11 UAT. Do not add story chapters, a generic cutscene framework, a replacement save system, extra game settings, or new art/SFX. HPA-836's keyboard menu work is now on main; HPA-840 owns general resizing.

## Verified baseline and root causes

- `src/lib/game/content/quests.ts` has exactly seven `mainQuestIds`. The last objective, `climb-to-the-ridge`, queues `prologue.the-vow` and `prologue.chapter-one`, but nothing after them.
- `story/beats/prologue/escape.md` owns those final two story lines. `WorldScene.updateStory` consumes `QuestEffect` items sequentially. The quest state is complete *before* the final dialogues finish, so a UI watcher of “all seven quests complete” alone would show the end card early.
- `WorldScene.writeAutosave` writes existing slot 0 via a post-render callback. `GameShell.svelte` builds its title slot availability/subtitle only once at startup; a return-to-title transition must refresh that view.
- `FieldHud.svelte` hides the main tracker whenever `HudQuestState.main` is null and leaves a styled status box present even when status is blank.
- `QuestJournal.svelte` bases “Chapter Progress” on objectives in the currently selected quest, not seven completed prologue quests. Its step chain uses a fixed-width, non-wrapping flex row. It presents the first NPC as “Turned in by” although quests have no turn-in step.
- `DialoguePanel.svelte` closes on Escape when `canClose` is true; `createDialogueSession` sets it true even for quest dialogue and scripted scenes. `WorldScene.startNearbyNpcStoryDialogue` advances the quest objective on *opening* the NPC conversation, making an early close lose the remaining script.
- `WorldScene.lastPublishedStatus` is already-translated text; re-publishing it on a locale preference change cannot translate it again. `SaveScreen` currently receives the field status wholesale.
- `BattleScene.finishBattle` shows the generic defeat summary even when the captain is the required `lose-battle` objective.
- `getAreaName` in `core/area-map.ts` receives only the map ID and labels the entire 384×384 overworld “The Wilds,” despite named compiled chunks available in `content/maps/overworld/world.ts`.
- The specific menu, bag, title, settings, and journal markup described in HPA-841 already exists; use localized text and small component changes rather than parallel screens.

## Design 1 — terminal prologue effect, completion card, and resume

**Trigger:** Extend the existing final `climb-to-the-ridge` `onComplete` effects to:

1. Play `prologue.the-vow`.
2. Play `prologue.chapter-one`, preserving both existing lines and their story-source ownership.
3. Run a new terminal `QuestEffect` variant (for example, `show-prologue-end`) *only after the player advances past the last line*.

The effect is the authoritative one-shot trigger; merely reaching seven completed quests does not show the card. The effect belongs to the existing `QuestState.pendingEffects` queue and is consumed once. Do not add an `endingSeen` save flag or another persisted state machine. Update the existing quest-effect save validation only where the new literal variant demands it.

**Save-before-exit:** On consuming the terminal effect, write the final state (all quests complete, no pending terminal effect) through slot 0 and await confirmation of the already-supported save storage flush *before enabling the return-to-title action*. Avoid the current post-render autosave / immediate user-input race. Reuse the slot-writing and thumbnail helpers; do not duplicate serialization or invent a new storage adapter. On a write error, keep the player in the existing run and show a localized save failure instead of silently advertising a successful completion. A single recoverable retry or existing save path is sufficient; no generic transaction manager.

**Presentation ownership:** Expose one narrow transient completion notification from WorldScene across `ui-bridge/events.ts` to `GameShell.svelte` (a dedicated event is acceptable). GameShell owns a single `prologueEndVisible` overlay and the return-to-title transition; it does not infer the trigger from the field HUD. Hide/block field inputs while visible. On the first eligible keydown (ignore repeats and modifiers), pointer click, or gamepad button, close the overlay and switch to title exactly once. Do not accidentally re-run a field action on the same key. Make the panel focusable and screen-reader identifiable.

**Visual:** Reuse `/game/assets/heroic-ui/title-key-art.png` already shown on `TitleScreen.svelte`. Place it full-bleed under a dark scrim, with centered localized “End of the Prologue” and “Thank you for playing”. Reuse existing font, gold/text tokens, and reduced-motion preference. No asset generation.

```text
┌───────────────────────────────────────────────────────────────┐
│  Existing title key art, full screen, under dark scrim       │
│                                                               │
│                   END OF THE PROLOGUE                         │
│                   Thank you for playing                      │
│                                                               │
│           Any key / click / gamepad → Title                    │
└───────────────────────────────────────────────────────────────┘
```

**Return to title / Continue:** Refresh `loadSaveSlots` / `getNewestSaveSlot` and title continuation state when leaving the finished run; the current startup-only constants are stale. Continue must load the post-vow ridge position and a localized “Prologue complete” tracker, without replaying the final story sequence or showing the end card again. Derive the tracker from completion of `mainQuestIds`; no artificial eighth quest. Loading a pre-completion save continues its normal quest.

## Design 2 — eleven UAT corrections

| # | Required change | Smallest owner / decision |
|---|---|---|
| 1 | EQUIPPED must not cover the equipment slot label (“ACCEQUIPPED”). | `BagScreen.svelte`: separate label and badge corners/rows, verify actual rectangles at supported window sizes. |
| 2 | Remove redundant title “↵ Enter” hint, retain “↵ Select”. | `TitleScreen.svelte`: render one hint; delete unused localized `titleHintEnter` if no callers. |
| 3 | No blank status pill on the field. | `FieldHud.svelte`: keep the live-region element mounted for announcements but strip visual card treatment when the status is empty. |
| 4 | No “Dialogue closed,” stale menu/footer message, or old-language status. | `WorldScene`: retain semantic status key + params where applicable, render via current locale on HUD publish; clear temporary field status when menu opens; do not emit dialogue-closed toast. `GameShell/SaveScreen`: pass only save-result feedback to Save footer. |
| 5 | The potion-consuming “Rest” command reads “Heal”; disabled explanation reads “No potions”. | `CommandGrid.svelte` / `GameShell.svelte` / locale files. Keep internal `rest` command id and `requestHeal()` to minimize churn; show a localized disabled tooltip/accessible description. |
| 6 | Remove fake HUD density setting. | `SystemScreen.svelte`: remove the Quiet/disabled Full row and reindex focus-grid rows for the remaining settings. Drop dead locale strings. No preference migration; the preference type never contained density. |
| 7 | New Run confirmation does not cover title cards. | `GameShell.svelte` CSS: place confirmation below the title action cards at ordinary and minimum 640×360 windows. Keep scrim, focus trap, cancel/confirm behavior. |
| 8 | Scripted captain loss jumps directly to next scene, without Defeat summary. | `BattleScene.finishBattle`: only when outcome is defeat, source enemy is the raid captain, and current quest objective is the matching `lose-battle`, apply the existing battle result and return to WorldScene directly. All ordinary defeats keep the summary. |
| 9 | Accurate outdoor region and prologue labels. | `core/area-map.ts` or a small adjacent pure helper: identify the player's tile from the compiled `overworld.chunks` and map `sundrop`, both `wildwood-*` chunks, `silverpine`, `mistfen` to localized names. Other/unbuilt chunks use a generic fallback. Thread coordinates through minimap/save and journal where needed. Title pill/subline become “Sundrop · Prologue”; old “Chapter I” UI labels become “Prologue”. |
| 10 | Correct journal progress and usable step chain. | `QuestJournal.svelte`: Chapter Progress counts seven main quest IDs: complete / 7 × 100%, rounded (three → 43%, seven → 100%); show seven quest titles/indicators instead of active quest objectives. Allow detail step chain to wrap cleanly onto line two. Replace/remove “Turned in by”; do not invent turn-in mechanics. |
| 11 | Quest/scripted dialogue survives Escape; no fake escort objective. | Capture quest-driven NPC provenance before `startNearbyNpcStoryDialogue` applies the talk objective, and mark these and real scripted scenes with explicit Escape behavior “advance” in the small HUD/dialogue contract. Escape uses the same reveal-then-advance path as Enter; ambient conversation remains closeable. Change localized description/progress label for stable `walk-lirra-home` ID to “See Lirra at the Herb Hut” (and equivalent ja, zh-Hant); do not change quest logic or build an escort. |

### Specific edge decisions

- `DialogueSession.mode === 'system'` is *not* proof of a protected scripted scene: transient “nothing to say” fallbacks also use it. Use explicit provenance or Escape behavior; do not globally forbid closing every system dialogue.
- `canClose` means close is available today, not that closing is safe for a quest. Do not derive protected status solely from it.
- Field status clearing should be a non-mutating HUD operation where necessary, not a saved gameplay mutation; consider a small explicit command for menu entry. Keep status translation in the WorldScene locale boundary, rather than storing a stale string in Svelte. Preserve non-status freeform messages where appropriate.
- The map should identify existing compiled chunk bounds, never hardcode new rectangles duplicating map coordinates. Unbuilt regions keep their current generic behavior.
- `QuestJournal` progress, the completion tracker and resume must derive from the same existing seven quest IDs, not three independently maintained counters.

## UI mockup and visual review contract

Linear HPA-841 has no linked UI mockup or attachment. Use the existing title key art, Title/Bag/Quest/Save visual language, and the end-card composition above as the baseline. Automated viewport screenshots and DOM rectangle assertions should check the visible title confirmation, readable completion card, non-overlapping EQUIPPED badge, and wrapped journal at 1280×720, 1440×900, and 640×360. Do not fold HPA-840's general resizing repair into this PR.

## Localization, story, tests, and out-of-scope boundaries

- All new/changed copy must be present in `en`, `ja`, and `zh-Hant`. Include “End of the Prologue”, “Thank you for playing”, “Prologue complete”, “Heal”, “No potions”, “Sundrop”, “Wildwood”, “Silverpine”, “Mistfen”, and rephrased Lirra objective. Remove references to “The Wilds”, “Verdant Region”, “Chapter I” where ticket identifies them.
- Keep narrative prose only in `story/`. The existing final English story lines should remain in `story/beats/prologue/escape.md`; new UI card text is localized through `i18n/messages/`, not by duplicating story prose. Run `bun run story:check` if story references/content change.
- Automated coverage should extend existing node/core tests, Svelte browser component tests, and `tests/e2e/game.e2e.ts`. Verify text parity and actual timing after advancing all story lines.
- No battle mechanics, flee/hotkey/HUD redesign, new maps/regions, new chapter content, new audio, new images, per-region battle backdrops, unrelated accessibility redesign, or general responsive refactor.
- This same single draft PR is the implementation handoff and will receive the runtime code and tests; do not create a second PR for this ticket. No ticket splitting and no extra art task because no new art is required.

## End-to-end acceptance criteria (macOS and Windows)

1. **Ending sequence:** An automated desktop end-to-end run completes the seven prologue quests; after the vow and final “Chapter One: The Hunt.” line, slot 0 records the completed state, the full-screen end card appears over existing title art, and any key, click, or gamepad input returns to title once. Continue restores the ridge, shows “Prologue complete,” and does not replay the end card.
2. **Eleven fixes:** E2E assertions exercise every table row in ordinary gameplay, including scripted raid loss vs an ordinary loss, Escape quest/scene vs ambient conversation, locale switching after a status message, the potion command/tooltip, and 3/7 → 43% journal progress.
3. **Locale parity:** Automated assertions in en, ja, zh-Hant check changed labels, prologue completion, objective wording, and no stale English strings after switching.
4. **Visual contract:** Automated screenshots and bounding-box checks on macOS and Windows at 1280×720, 1440×900, and 640×360 verify that end-card text is readable; title confirmation sits below—not on top of—the cards; gear labels and EQUIPPED badges do not overlap; and journal chain wraps without clipping. Compare to existing screens and title art; no Linear mockup was provided.
5. **Continuous verification:** `bun run check`, `bun run lint`, `bun run test:unit -- --run`, `bun run test:e2e`, `bun run story:check:strict` (and `build:tauri` when story/build code changes) pass in CI. No human sign-off is an acceptance criterion.

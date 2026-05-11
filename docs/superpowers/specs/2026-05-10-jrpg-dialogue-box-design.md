# JRPG Dialogue Box Design

## Summary

Replace one-line NPC status messages with a JRPG-style dialogue box that supports speaker names, multi-line conversations, state-aware branches, and choice menus.

The dialogue box applies to all NPCs. Simple villagers can use a single Talk flow, while functional NPCs expose extra choices. The Guild Master uses `Talk` and `Quest`; shopkeepers use `Talk` and `Shop`. Guild side quest browsing and acceptance move into the dialogue box instead of the existing Guild Quests overlay.

Quest completion and rewards remain automatic. When a quest completes from combat or pickup progress, the game shows an immediate dialogue-style reward message instead of only a HUD status line.

## Goals

- Add a reusable pure dialogue engine under `src/lib/game/core/`.
- Move NPC dialogue content from flat strings to structured, state-aware definitions.
- Render a bottom-screen JRPG dialogue box in `GameShell.svelte`.
- Support speaker names, multi-line text, Next/Close controls, and choice lists.
- Support `Talk`, `Quest`, and `Shop` choices from the dialogue UI.
- Let the Guild Master list and accept side quests inside the dialogue box.
- Show dialogue-style quest completion and reward messages when objectives complete.
- Keep the existing Quest Log and compact quest tracker.
- Keep the existing shop overlay for actual buying and selling.
- Keep gameplay running while dialogue is open.

## Non-Goals

- No branching story tree beyond the first state-aware NPC choices.
- No portraits, voice, typewriter animation, or cutscene camera behavior.
- No manual quest reward claiming.
- No relationship, reputation, or faction flags.
- No new quest objectives, rewards, shops, enemies, or maps.
- No rewrite of the Quest Log.
- No save schema change. Dialogue sessions are transient HUD state and are not persisted.

## Current Context

Gliese already has a quest system with:

- the automatic main quest `investigate-the-ruins`,
- Guild Master gating for the ruins route,
- Guild side quests for village slime defeats, ruins slime defeats, and ruins item recovery,
- automatic quest completion and rewards,
- compact quest tracker,
- Quest Log overlay,
- Guild Quests overlay.

`WorldScene` currently detects nearby NPCs, publishes status text such as `Guild Master Arlen: ...`, handles `E` / `Space` / `Enter` interaction, opens shops, applies quest progress, and publishes HUD state through the custom event bridge.

The new dialogue system should preserve the existing Phaser/Svelte split: pure rules in `core`, declarative content in `content`, runtime coordination in `WorldScene`, and rendering in `GameShell.svelte`.

## Architecture

Add a pure dialogue engine in `src/lib/game/core/dialogue.ts`. The engine receives immutable snapshots of current context and returns render-ready dialogue state. It does not import Phaser, Svelte, DOM APIs, or mutable scene objects.

Dialogue content lives in `src/lib/game/content/dialogue.ts`. NPC map definitions should reference dialogue ids instead of owning only a flat `dialogue: string`.

`WorldScene` remains the runtime coordinator. It starts dialogue sessions when the player interacts with nearby NPCs, when quest completion requires a reward message, or when a dialogue intent needs follow-up feedback. It applies gameplay effects from dialogue choices, such as accepting a quest or opening a shop.

`GameShell.svelte` renders the dialogue box from the HUD payload and sends commands back through the existing HUD command bridge.

## Dialogue Engine

The engine should expose small pure operations:

- start NPC dialogue from an NPC id and context,
- advance the current line,
- choose an option,
- build quest completion dialogue,
- build fallback/error dialogue.

The engine should return a serializable session payload shaped for Svelte:

- stable session id,
- speaker name,
- current text line,
- optional line index and total line count,
- choices, each with id, label, and intent,
- close availability,
- visual mode such as `conversation`, `choice`, or `system`.

The engine returns intents for gameplay effects rather than applying them itself. First-pass intents:

- `acceptQuest`,
- `openShop`,
- `close`,
- `continue`,
- `showQuestDetails`.

`WorldScene` owns intent execution. If an intent fails, `WorldScene` starts a dialogue feedback session instead of silently falling back to HUD status text.

## Dialogue Content

All NPCs use the same dialogue surface.

Guild Master Arlen:

- `Talk` before Guild briefing: directs the hero to the ruins problem and advances the main quest conversation.
- `Talk` after Guild briefing: reminds the hero to defeat the ruins warden.
- `Talk` while side quests are active: acknowledges ongoing Guild work.
- `Talk` after quest completion: acknowledges completed work.
- `Quest`: lists available Guild side quests, lets the player inspect objective/reward text, and accepts the chosen quest inside the dialogue box.

Quartermaster Vale:

- `Talk`: field gear flavor lines that can acknowledge the current ruins objective.
- `Shop`: opens the existing Guild Quartermaster shop overlay.

Mira:

- `Talk`: item-shop flavor lines that can acknowledge whether the hero is preparing for or returning from the ruins.
- `Shop`: opens the existing item shop overlay.

Simple villagers and future NPCs:

- `Talk` only unless a later feature gives them another action.

State-aware lines should be selected from quest state, not from ad hoc UI booleans. The first implementation only needs enough branches to make main quest and side quest progression feel like a real JRPG conversation.

## Quest Acceptance

The Guild Master's `Quest` choice replaces the Guild Quests overlay for accepting side quests.

When side quests are available, the dialogue choice list should show the available quest titles. Selecting a quest shows a short detail line with objective and reward. The player can then accept it from inside the dialogue box.

Accepted side quests disappear from the available quest list and appear in the existing Quest Log and compact tracker. Already active or completed side quests should not be offered as new choices.

If no side quests are available, the Guild Master should show a dialogue line explaining why, such as all Guild work is already accepted or complete.

## Quest Completion Dialogue

Quest rewards remain automatic. Combat and pickup events continue to call quest progress rules. When a quest completes, rewards apply immediately and `WorldScene` starts a dialogue-style completion message.

The completion message should include:

- speaker or system label, such as `Guild Notice`,
- completed quest title,
- concise reward summary.

If multiple quests complete from one runtime event, `WorldScene` can queue one completion dialogue per completed quest and show them sequentially.

Completion dialogue replaces the current `Quest complete: ...` status as the primary user-visible completion feedback. A short status fallback is still acceptable if the dialogue payload cannot be displayed.

## HUD And Controls

The dialogue box appears as a bottom-screen panel over the Phaser canvas. It should show:

- speaker name,
- current dialogue text,
- Next and Close controls for linear lines,
- a vertical list of choices for menus.

Controls:

- `E`, `Space`, or `Enter` starts dialogue with a nearby NPC.
- while dialogue is open, `Space` or `Enter` advances the current line or selects the focused choice,
- `Escape` closes the dialogue box,
- choices are clickable and keyboard-focusable.

Gameplay does not pause while dialogue is open. Directional movement and world updates continue. Dialogue-owned keys should be guarded so the keypress that opens dialogue does not immediately advance it or trigger a second interaction in the same frame.

The existing compact quest tracker and Quest Log remain. The current `Guild Quests` menu button should be removed or disabled because side quest acceptance now lives inside the Guild Master dialogue flow.

## HUD Bridge

Extend `HudState` with a nullable dialogue payload. The payload should be render-ready so Svelte does not import quest or dialogue content directly.

Extend `HudCommand` with dialogue commands:

- `{ type: 'dialogue-advance' }`,
- `{ type: 'dialogue-close' }`,
- `{ type: 'dialogue-choose'; choiceId: string }`.

Starting dialogue with a nearby NPC can stay in Phaser keyboard input for the first slice because `WorldScene` already owns nearby NPC detection. Svelte sends dialogue UI commands, and `WorldScene` validates and applies them.

## Error Handling

Unknown NPC ids, missing dialogue definitions, invalid quest ids, and unavailable choices should produce a short fallback dialogue line rather than crashing the scene.

Quest acceptance failures should be displayed through dialogue:

- already active,
- already completed,
- not available,
- no Guild quest available.

Shop opening failures should also display through dialogue, especially when the player moved out of range before selecting `Shop`.

Content validation tests should catch missing dialogue references, missing quest references, and shop choices that point to unknown shops.

## Testing

Pure unit tests should cover:

- Guild Master state-aware branches before and after ruins unlock,
- `Talk`, `Quest`, and `Shop` choices,
- side quest detail and accept intents,
- completion dialogue payloads,
- fallback/error dialogue.

`WorldScene` tests should cover:

- interacting with any NPC starts a dialogue session,
- Guild Master quest choices call quest acceptance and update quest HUD data,
- shop choices open the correct existing shop overlay,
- quest completion starts reward dialogue,
- failed quest/shop intents become dialogue feedback.

Svelte component tests should cover:

- bottom dialogue panel rendering,
- speaker name and multi-line text,
- Next/Close controls,
- choice button rendering and selection,
- keyboard advance/select/close behavior.

E2E should add one focused flow:

- talk to the Guild Master,
- choose `Quest`,
- inspect and accept a side quest inside the dialogue box,
- verify that the quest appears in the Quest Log or compact tracker.

Because this touches `GameShell.svelte`, implementation must run the Svelte autofixer before sending Svelte changes for review.

## Completion Criteria

This design is complete when all NPC dialogue uses the JRPG dialogue box, Guild side quests can be accepted inside Guild Master dialogue, quest completion shows reward dialogue, shops still open through dialogue choices, and existing quest tracking continues to work.

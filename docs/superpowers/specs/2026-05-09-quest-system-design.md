# Quest System Design

## Summary

Add a first-class quest system to the JRPG vertical slice with one story-gating main quest and three optional Guild side quests.

New games start with the main quest active. The first objective directs the hero to talk with the Guild Master. That conversation unlocks the ruins route and advances the main quest to defeating the ruins boss. After the Guild Master conversation, the player can accept side quests from the Guild Master for killing village slimes, killing ruins slimes, and collecting ruins items.

Quest completion is automatic. Once an active quest objective is satisfied, the quest completes, rewards apply immediately, and the HUD/quest log update without requiring a turn-in.

## Goals

- Add a reusable quest content model with main and side quest types.
- Start the main quest automatically on a new save.
- Gate the ruins transition until the hero talks to the Guild Master.
- Let the Guild Master offer side quests only after the initial Guild conversation.
- Track objective progress from existing runtime events: NPC interaction, enemy defeats, pickup collection, and boss victory.
- Apply simple rewards on quest completion: XP, coins, and optional items.
- Add a compact HUD quest tracker.
- Add a full Quest Log overlay with Main and Side sections.
- Add a Guild quest-offer overlay for accepting side quests.
- Persist quest state and progress in the save file.
- Keep quest rules pure TypeScript, with `WorldScene` coordinating runtime events and Svelte rendering normalized HUD state.

## Non-Goals

- No branching dialogue system.
- No multi-step side quest chains.
- No quest turn-in flow. Completion and rewards are automatic.
- No quest markers, minimap, or pathfinding indicators.
- No reputation, faction, or relationship systems.
- No legacy save migration. This prototype can reject older save versions and reset to a new run.
- No generated art or new sprite assets for quests.

## Architecture

The quest system follows the existing content, core, runtime, save, and HUD boundary split.

- `src/lib/game/content/quests.ts` defines declarative quest records.
- `src/lib/game/core/quests.ts` owns pure quest state transitions, objective progress, completion checks, reward application, and command validation.
- `src/lib/game/save/save-state.ts` bumps the save schema and persists quest state.
- `src/lib/game/phaser/scenes/WorldScene.ts` listens to runtime events that already happen in the scene, calls the pure quest rules, applies resulting state/rewards, enforces the ruins gate, and publishes quest HUD data.
- `src/lib/game/ui-bridge/events.ts` expands HUD state and commands with quest data.
- `src/lib/game/ui-bridge/store.ts` exposes quest command helpers.
- `src/lib/game/GameShell.svelte` renders the compact tracker, Quest Log overlay, and Guild quest-offer overlay.

Quest rules do not live in Svelte. Svelte does not import quest content directly. `WorldScene` remains the bridge between runtime game state and the normalized UI payload.

## Quest Content

### Main Quest

`investigate-the-ruins`

- Type: main.
- Starts automatically on a new game.
- Objective 1: talk to the Guild Master.
- Objective 2: defeat the ruins boss.
- Rewards: simple gameplay rewards when the boss objective completes.

The first objective exists to direct the hero into the Guild and unlock the ruins route. Talking to the Guild Master completes that objective, unlocks the route from `meadow-entry` to `ruins-threshold`, and advances the objective to defeating the boss in `ruins-core`.

The boss objective completes when the existing boss encounter reaches victory. Rewards apply once.

### Side Quests

All side quests are offered by the Guild Master after the main quest has advanced past the Guild Master talk objective.

`thin-village-slimes`

- Type: side.
- Objective: defeat slimes near the village.
- Progress source: defeated `slime-scout` encounters on `meadow-entry`.
- Rewards: simple XP/coin/item reward.

`thin-ruins-slimes`

- Type: side.
- Objective: defeat slimes in the ruins.
- Progress source: defeated `slime-scout` encounters on ruins maps.
- Rewards: simple XP/coin/item reward.

`recover-ruins-relics`

- Type: side.
- Objective: collect ruins items.
- Progress source: pickup collection events on ruins maps for configured item or pickup ids.
- Rewards: simple XP/coin/item reward.

Side quests are optional. They remain available at the Guild Master until accepted. Accepted quests disappear from the offer list, appear in the Quest Log, and progress automatically.

## Quest Model

Quest definitions should include:

- stable `id`
- `type: 'main' | 'side'`
- display `title`
- short `description`
- `giverNpcId` for side quests offered by the Guild Master
- objective definitions
- reward definition
- availability rule

Objective definitions support the first-pass objective kinds:

- `talk-to-npc`
- `defeat-enemy`
- `collect-item`

Persisted quest state tracks:

- quest status: `active` or `completed`
- current objective id for active sequential quests
- numeric objective progress
- `rewardApplied: boolean`

Available side quests are derived from quest definitions plus current main quest progress. They are not persisted as quest-state entries until accepted. This keeps save validation deterministic and prevents stale available quest records from surviving content changes.

## Main Quest Gating

The `meadow-entry -> ruins-threshold` transition should require the Guild Master conversation objective to be complete.

Before the Guild Master conversation:

- The transition does not fire.
- The scene publishes a clear status, such as `Report to the Guild Master first`.

After the Guild Master conversation:

- The transition works normally.
- The main quest objective becomes `Defeat the ruins boss`.
- Guild side quests become available for acceptance.

This gate is quest-driven, not a new hardcoded map-only flag. The transition may store a quest requirement, but the rule should be evaluated through the quest state.

## Runtime Data Flow

Quest progress comes from narrow event calls in `WorldScene`.

NPC interaction:

- Interacting with the Guild Master emits a quest event with the NPC id.
- If the main quest is waiting for that NPC, the quest advances.
- If side quests are unlocked, the Guild quest-offer overlay can list available side quests.

Enemy defeat:

- Defeating an enemy emits a quest event with map id, encounter id, enemy id, and boss/completion metadata.
- Village slime side quest progress counts `slime-scout` defeats on `meadow-entry`.
- Ruins slime side quest progress counts configured `slime-scout` defeats on ruins maps.
- Boss defeat completes the main quest.

Pickup collection:

- Collecting a pickup emits a quest event with map id, pickup id, item id, and quantity.
- Ruins collection side quest counts configured ruins pickups or item ids.

Completion:

- Quest rules detect when active objectives reach their target.
- Completed quests apply rewards once.
- `WorldScene` updates quest state, player XP, wallet, and inventory from the result.
- `WorldScene` publishes a HUD status like `Quest complete: Thin Village Slimes`.

## Rewards

Quest rewards are simple and explicit in content definitions.

Supported first-pass rewards:

- XP
- coins
- item grants

Rewards must be applied once. Re-processing an already completed quest event must not grant duplicate XP, coins, or items.

If an item reward references an unknown item id, content validation should fail.

## HUD Bridge

Extend `HudState` with normalized quest data, shaped for Svelte rendering without importing quest content.

The HUD quest payload should include:

- active main quest title and current objective text
- active side quests with title, objective text, progress, and completion state
- completed quests
- available Guild quests with title, description, objective summary, and reward summary

Extend `HudCommand` with a quest accept command:

- `{ type: 'accept-quest'; questId: string }`

`WorldScene` should reject accepting unknown quests, completed quests, already active quests, main quests, or side quests that are not currently available from the Guild Master.

## UI

### Compact HUD Tracker

The compact tracker is always visible near the existing HUD.

It should show:

- the current main objective
- a compact side quest progress line when side quests are active

The tracker should keep copy short so it does not crowd the HP/XP panel.

### Quest Log Overlay

The Quest Log opens from the existing Menu.

It should include:

- Main section
- Side section
- active, available, and completed quest states
- objective progress such as `Slimes defeated: 2 / 3`
- reward summaries

The Quest Log is read-only except for opening the Guild quest-offer flow when appropriate.

### Guild Quest-Offer Overlay

The Guild quest-offer overlay is available when the player is near or interacting with the Guild Master after side quests are unlocked.

It should:

- list available side quests
- show objective and reward summaries
- let the player accept a quest
- remove accepted quests from the offer list
- keep accepted quests visible in the Quest Log

Normal buttons are appropriate for quest acceptance because accepting a quest is an explicit command, not an inventory tile action.

## Save Model

The save schema should bump from `version: 3` to the next version.

Persisted quest state should include enough information to restore:

- main quest current objective and completion
- accepted side quests
- side quest objective progress
- completed quests
- `rewardApplied` for every active or completed persisted quest

Save validation should reject:

- unknown quest ids
- unknown objective ids
- invalid quest status values
- negative or non-integer objective progress
- progress above the objective target
- main quest missing from a new-format save
- active side quests that are not side quest definitions
- completed quests with malformed reward state

Existing older saves are rejected and reset. No migration is required in this prototype phase.

## Error Handling

Runtime handling should publish clear status for:

- trying to enter ruins before the Guild Master conversation
- accepting a quest that is not available
- accepting a quest that is already active or completed
- unknown quest ids in commands

Runtime failures must leave quest state, rewards, wallet, inventory, and progression unchanged.

Quest state changes should be idempotent. Repeated NPC interaction, repeated HUD commands, or stale events should not duplicate objective progress beyond target counts or apply rewards twice.

## Testing

Add or update tests for:

- quest content ids, objective ids, giver NPC ids, reward item ids, and availability rules
- pure quest rules for starting main quest state
- accepting side quests after the Guild Master conversation
- rejecting unavailable, duplicate, completed, unknown, or main quest acceptance commands
- objective progress for NPC talk, village slime kills, ruins slime kills, ruins item collection, and boss defeat
- automatic completion and one-time reward application
- save creation, round-trip parsing, and malformed quest state rejection
- `WorldScene` Guild Master interaction advancing the main quest
- `WorldScene` blocking the ruins transition before the Guild Master conversation
- `WorldScene` enemy defeat and pickup events updating active side quests
- `WorldScene` boss victory completing the main quest
- accepted side quest progress persisting through save state
- `GameShell.svelte` Quest Log menu entry, quest tracker rendering, Guild quest acceptance, and progress display

Because `GameShell.svelte` changes, run the Svelte autofixer loop before completing implementation work.

Final implementation verification should include focused quest/content/save/scene tests, `bun run check`, and `bun run test`.

## Scope Guardrails

This pass is complete when:

1. New games start with the main quest active.
2. The main quest directs the hero to talk to the Guild Master.
3. The ruins route is blocked until that Guild Master conversation.
4. Talking to the Guild Master unlocks the ruins and advances the main quest to defeating the boss.
5. The Guild Master offers three side quests after the initial Guild conversation.
6. The player can accept the village slime, ruins slime, and ruins item side quests.
7. Accepted quest objectives progress from combat and pickup events.
8. Active quests complete automatically when objectives are satisfied.
9. Quest rewards apply once.
10. The HUD tracker and Quest Log reflect active, available, and completed quest state.

Do not expand this pass into branching dialogue, quest markers, multiple quest givers, reputation, minimaps, or broader story content.

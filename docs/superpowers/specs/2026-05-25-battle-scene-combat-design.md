# Battle Scene Combat Design

## Summary

Move combat out of the exploration field and into a dedicated Phaser `BattleScene`.
World maps still show one visible enemy marker per encounter. When the hero engages an
uncleared marker, the game starts a separate compact arena battle where that marker
expands into a random group of 1 to 10 real combatants.

The battle keeps the current real-time movement and auto-attack feel. Victory returns a
blocking reward summary before the world encounter is cleared. Defeat returns a blocking
defeat summary, grants no rewards, leaves the encounter uncleared, and sends the hero
back to the village at 1 HP.

## Goals

- Add a separate Phaser `BattleScene` for active combat.
- Keep `WorldScene` responsible for exploration, world maps, NPCs, shops, transitions,
  saving, and permanent result application.
- Expand each world encounter into 1 to 10 real battlefield enemies.
- Preserve real-time movement and auto-attacks instead of switching to command battle.
- Use a compact top-down arena: hero near the center, enemies around the edges.
- Count every generated battlefield enemy as a real enemy for HP, attacks, XP, coins,
  drops, quest progress, and summary reporting.
- Clear the source world encounter marker only after the whole battlefield battle is won.
- Show a blocking victory or defeat summary before returning control to exploration.
- Allow battle healing and usable consumables, while disabling save, shop, quest log,
  area map, and other non-battle overlays during battle and summary.

## Non-Goals

- No turn-based or command-battle system.
- No party combat.
- No persistent mid-battle save/resume state.
- No separate world markers for every generated battlefield enemy after battle.
- No new enemy art or animation sheet is required for the first slice.
- No new pathfinding system.
- No shop, NPC, or map-layout redesign.

## Encounter Flow

`WorldScene` continues to render world encounter markers from `src/lib/game/content/maps.ts`.
The field marker represents the source encounter, not the exact enemy count in battle.

When the hero engages an uncleared encounter:

1. `WorldScene` records the source map id, encounter id, enemy id, encounter completion
   flag, hero return position, current hero HP, effective stats, equipment, inventory,
   wallet, quest state, and resolved drop state needed for result application.
2. `WorldScene` rolls a battlefield enemy count from 1 to 10.
3. `WorldScene` launches `BattleScene` with a typed `BattleStartPayload`.
4. `BattleScene` creates a compact arena and spawns the hero near the center.
5. `BattleScene` spawns the generated enemies around arena edges with individual HP,
   attack cooldowns, movement, health bars, and defeat state.
6. Battle runs in real time using the current auto-attack style.
7. `BattleScene` returns a typed `BattleResult`.
8. The Svelte HUD shows a blocking summary.
9. After the summary is dismissed, `WorldScene` applies permanent state changes and
   restores exploration.

## Battle Scene

`BattleScene` lives beside `WorldScene` under `src/lib/game/phaser/scenes/` and is
registered in `src/lib/game/phaser/createGame.ts`.

`BattleScene` owns transient combat state only:

- active hero battle position
- active enemy unit instances
- arena bounds
- movement and collision inside the arena
- real-time auto-attacks
- enemy contact attacks
- battle-only hit reactions and death animations
- final battle outcome

`BattleScene` does not own permanent save state. It returns enough data for `WorldScene`
to apply the result after the summary popup is dismissed.

## Handoff Contracts

Add typed contracts for scene handoff. Exact type names can be adjusted during planning,
but the boundary should stay explicit.

`BattleStartPayload` includes:

- source map id
- source encounter id
- source enemy id
- optional source completion flag, including boss victory completion
- hero return position and facing for victory
- village respawn position and facing for defeat
- current hero HP
- effective hero stats
- equipment state
- inventory state for usable consumables
- resolved encounter drops for the source encounter if already present
- generated battlefield enemy count, from 1 to 10

`BattleResult` includes:

- outcome: `victory` or `defeat`
- source map id and encounter id
- final hero HP
- updated inventory after battle consumable use
- defeated enemy units with unit id, enemy id, XP, coins, and resolved drops
- total XP gained
- total coins gained
- grouped item drops for summary display
- quest progress count by enemy id
- level-up information if the applied result changes hero level
- summary copy data or stable keys needed by the Svelte HUD

## Victory Rules

Victory occurs when every generated enemy in `BattleScene` is defeated.

Each defeated battlefield enemy grants its own:

- XP reward
- coin reward
- drop roll
- quest-defeat contribution

For example, if one world slime marker expands into 6 slimes, victory can grant six
slime XP rewards, six slime coin rewards, six drop rolls, and six slime-defeat quest
progress events.

The source world encounter marker still clears only once. The world map does not gain
six separate cleared markers after the battle.

After the victory summary is dismissed, `WorldScene`:

- applies final hero HP and inventory from the battle
- applies total XP and level-up changes
- applies total coins
- adds resolved drops
- advances quest progress per defeated battlefield enemy
- records the source encounter id in `flags.clearedEncounters`
- stores aggregate resolved drops under the source encounter id
- saves the updated state
- returns the hero near the cleared source marker

## Defeat Rules

Defeat occurs when hero HP reaches 0 during `BattleScene`.

Defeat grants:

- no XP
- no coins
- no drops
- no quest progress
- no encounter clear

The defeat summary is blocking. After dismissal, `WorldScene` sends the hero back to the
current `meadow-entry` spawn point with 1 HP. The original world encounter remains
uncleared and can be challenged again later.

## Battle HUD And Summary

The Phaser scenes continue communicating with Svelte through the HUD bridge. Extend the
HUD state with battle-aware fields rather than coupling Svelte directly to Phaser scene
internals.

During battle:

- HP/status remain visible.
- Usable healing consumables remain available.
- Save, shop, quest log, area map, and non-battle overlays are disabled.
- Command paths that reach a disabled action should be ignored or publish a battle-locked
  status.

After battle:

- Svelte renders a blocking summary dialog above the Phaser canvas.
- The dialog traps focus and has one dismiss action.
- Dismiss emits a HUD command that lets `WorldScene` apply or finalize the result.

Victory summary shows:

- enemies defeated
- XP gained
- coins gained
- item drops, grouped by item id
- quest progress and quest completions
- level-up, if one happened

Defeat summary shows:

- hero defeated
- no rewards granted
- encounter not cleared
- hero returned to the village

All new visible strings must be added to every locale file under
`src/lib/game/i18n/messages/`.

## Rewards, Drops, And Quests

Enemy definitions in `src/lib/game/content/enemies.ts` keep their current base stats and
reward fields. The generated battlefield units reference the same enemy definition.

Drops roll per defeated battlefield unit. `BattleScene` should resolve drops before
returning `BattleResult` so summary display and permanent application use the same result.
`WorldScene` stores the aggregate under the source encounter id in
`flags.resolvedEncounterDrops`.

Quest progress should count each generated enemy. The current quest duplicate-prevention
model must not collapse a multi-enemy battle into one source. Use a unit-level source id
such as:

```txt
encounter:<sourceEncounterId>:unit:<unitIndex>
```

This keeps repeated enemy progress deterministic while still preserving the single world
encounter marker.

## Save Behavior

Saving is disabled while battle or summary is active.

No mid-battle save state is required. Battle state is transient and can be lost if the app
is closed during battle. Permanent state is saved only after the summary is dismissed and
`WorldScene` applies the `BattleResult`.

If implementation needs to change `SaveState`, bump both `SAVE_STORAGE_KEY` and the
`version` field and update `isSaveState`. If the existing save shape can support the
aggregate result, avoid a save-version bump.

## Existing Behavior To Preserve

- Exploration maps, blockers, NPCs, shops, dialogue, and transitions still live in
  `WorldScene`.
- Field encounter ids stay stable, including meadow slime ids used by quests.
- The ruins boss can use the same battle expansion rules unless later tuning narrows boss
  counts.
- Boss victory still completes the relevant victory objective after battle victory.
- Existing item, equipment, wallet, and shop state remain owned by the save state.
- Tauri and browser save adapters continue to work unchanged.

## Testing

Add focused unit or scene tests for:

- `BattleScene` creates 1 to 10 real enemy units from one encounter payload.
- Generated units have independent HP, attack cooldowns, and defeated state.
- Real-time hero auto-attack can defeat multiple battlefield enemies.
- Enemy attacks can defeat the hero and produce a defeat result.
- Victory result includes per-enemy XP, coins, drops, and quest count data.
- The source world marker clears once after victory summary dismissal.
- Multi-enemy slime battles advance slime-defeat quest objectives per unit.
- Defeat returns to the village at 1 HP.
- Defeat grants no rewards, no quest progress, and no encounter clear.
- Battle consumable use updates HP and returned inventory.
- Save, shop, quest log, and area map commands are disabled during battle and summary.
- Victory and defeat summaries render expected localized content and dismiss correctly.

Run targeted checks first:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
```

If a new Svelte summary test file is added, include that targeted file as well. Then run
the repo baseline:

```sh
bun run check
bun run test
```

If Svelte files are edited, run the required Svelte autofixer before completing the
implementation.

## Acceptance Criteria

- Engaging a world enemy marker starts a separate compact arena `BattleScene`.
- The arena spawns a random 1 to 10 real enemies from the source enemy type.
- Battle remains real-time with movement and auto-attacks.
- Every battlefield enemy has independent HP, attacks, rewards, drops, and quest progress.
- Victory shows a blocking summary before returning to exploration.
- Victory clears the source world marker once after summary dismissal.
- Victory applies per-enemy XP, coins, drops, quest progress, and level-up results.
- Defeat shows a blocking summary, grants no rewards, leaves the encounter uncleared, and
  returns the hero to the village at 1 HP.
- Healing consumables are usable during battle.
- Save, shop, quest log, area map, and non-battle overlays are unavailable during battle
  and summary.

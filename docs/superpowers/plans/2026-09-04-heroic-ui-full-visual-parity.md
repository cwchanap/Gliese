# Heroic UI Full Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Gliese's current mixed JRPG HUD/windows with the supplied Heroic UI across the full playable flow, including the minimum missing title, save, dialogue, battle, preference, prompt, and read-only skill mechanics required to make every visible control real.

**Architecture:** Keep canonical game rules in pure TypeScript, exploration/battle runtime in Phaser, DOM presentation in Svelte, and `ui-bridge/events.ts` as the only Phaser↔Svelte command/state boundary. Decompose the current `GameShell.svelte` presentation into focused Heroic screens while leaving `GameShell` as the composition/overlay owner; add narrow pure helpers for slots, preferences, playtime, battle presentation, and gamepad normalization rather than a new state-management or UI framework.

**Tech Stack:** TypeScript 6, Svelte 5 runes, Phaser 4, Vite 8, Tauri 2, Tailwind 4, Vitest + vitest-browser-svelte, Playwright, `@fontsource`, Sharp for asset-validation tests.

**Spec:** `docs/superpowers/specs/2026-09-04-heroic-ui-full-visual-parity-design.md`

## Global Constraints

- This is **one implementation slice and one PR**: continue on `feat/heroic-ui-parity` / PR #39; do not split the ticket into multiple PRs.
- The supplied `Gliese UI Heroic(1).html` is the visual authority for the ten source-backed surfaces: Title, Field HUD, Bag, Shop, Quest Journal, Dialogue, Battle, Victory, Save, System.
- Canonical source comparison viewport is exactly **1440×900**.
- Area Map and Skill use the same Heroic visual grammar but receive regression screenshots only because the source has no dedicated Map/Skill canvas.
- Preserve the current pure-TS / Phaser / Svelte / custom-event bridge ownership split.
- Do not add a router, state-management library, generic design-system package, new turn-based combat engine, audio system, crafting system, party/roster system, skill tree, skill points, controller remapping, rumble, or controller-brand-specific glyph sets.
- No legacy save migration is required. Old `gliese.save.v9` prototype data may be ignored/reset after the slot envelope lands.
- Source-selected System reference values are **English / Normal / Quiet / On / Auto**.
- Quiet HUD density must match the supplied Field HUD geometry. Full may add secondary detail without moving Quiet geometry.
- Slot 1 is autosave only. Slots 2 and 3 are manual. Continue resumes the newest valid `savedAt` record.
- Autosave only on initial WorldScene readiness, completed map transitions, and applied battle results. Do not autosave movement, pickups, dialogue lines, or HUD changes.
- Flee is deterministic: short channel, damage cancels, success gives no rewards/quest progress/encounter clear and returns to the encounter origin with current HP/inventory.
- All visible strings must be updated together for `en`, `ja`, and `zh-Hant`.
- New production art belongs under `public/game/assets/heroic-ui/`; no mockup `image-slot` placeholder may remain in runtime UI.
- Use bundled fonts only; no runtime Google Fonts/network dependency.
- Full visual parity accepts no intentional source deviation unless documented on PR #39 and explicitly approved before merge.

---

## File Structure Map

Lock these ownership boundaries before coding:

```text
src/lib/game/
  GameShell.svelte                  # title/playing mode + overlay composition only
  DialoguePanel.svelte              # Heroic dialogue surface + reveal interaction
  ui/
    TitleScreen.svelte              # title actions and latest-save summary
    FieldHud.svelte                 # quiet/full field status composition
    CommandGrid.svelte              # eight source commands
    BagScreen.svelte                # Potions/Gear/Key/Loot + paper doll
    ShopScreen.svelte               # buy/sell + equipment preview
    QuestJournal.svelte             # quest list/detail
    AreaMapScreen.svelte            # existing map renderer moved behind Heroic chrome
    SkillScreen.svelte              # read-only level-gated skill compendium
    BattleHud.svelte                # active battle telemetry/interventions
    BattleSummary.svelte            # victory/defeat result surface
    SaveScreen.svelte               # three slots + overwrite confirmation
    SystemScreen.svelte             # Display/Text + disabled Audio rail + Input jump
    PromptGlyph.svelte              # generic pad/key glyph rendering
    preferences.ts                  # typed UI preference persistence/store
    input-modality.ts               # prompt-mode resolution + last modality
    heroic-ui.css                   # Heroic tokens, frames, motion, semantic tints
  content/
    heroic-ui.ts                    # portrait/bust/paper-doll/enemy/title asset metadata
    skills.ts                       # tiny presentation-only skill registry
  core/
    battle-presentation.ts          # target cycle, ribbon, feed, flee-channel helpers
    gamepad.ts                      # pure Gamepad snapshot/action normalization
  save/
    slots.ts                        # 3-slot envelope read/write/latest helpers
    playtime.ts                     # in-memory playtime session clock
    thumbnail.ts                    # bounded 16:9 canvas thumbnail capture
  phaser/scenes/
    BootScene.ts                    # forwards explicit title start data after preload
    WorldScene.ts                   # manual/auto slot writes + pad exploration input
    BattleScene.ts                  # target/telemetry/feed/flee runtime
  ui-bridge/
    events.ts                       # extended render state + new commands
    store.ts                        # request helpers + slot-aware initial HUD
```

Keep presentation metadata out of story prose. `DialogueSession.npcId` already carries the stable identity needed to resolve bust art; do not duplicate dialogue text into frontend content.

---

## Task Sequence

The detailed steps below are intended to execute in order. Every task lands as a commit on the same PR #39; none is an independently mergeable PR.

1. Heroic theme, bundled typography, and typed UI preferences.
2. Three-slot save envelope, playtime clock, and thumbnail primitives.
3. Title screen, System screen, and explicit lazy Phaser start.
4. Heroic production art package and presentation metadata.
5. Field HUD, exact eight-command grid, and overlay composition.
6. Bag/Gear and minimal read-only Skill surfaces.
7. Heroic Shop with canonical equipment stat preview.
8. Quest Journal and Heroic Area Map chrome.
9. Dialogue bust metadata and text reveal.
10. Pure battle presentation helpers and fled outcome semantics.
11. BattleScene targeting, telemetry, combat feed, Item, and Flee runtime.
12. Heroic Battle HUD and Victory surface.
13. Save screen, manual writes, and coarse autosave hooks.
14. Prompt modality and generic gamepad input.
15. Deterministic source-parity E2E, old-layout cleanup, and final gate.

For full TDD commands, interfaces, code sketches, acceptance checks, and commit boundaries for each task, use the committed plan version from commit `36c1c165a0b966d6ba53aeebec9000b956af1dad`; execution must preserve the task order and global constraints above.
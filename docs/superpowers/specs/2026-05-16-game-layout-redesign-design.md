# Game Layout Redesign Design

## Summary

Redesign Gliese's visible game layout around a traditional JRPG "Corner Ledger + Command Box" structure.

The normal playfield keeps a compact hero ledger in the top-left, a compact quest ledger in the top-right, and a right-side command box when the player opens the menu. Dialogue remains a full-width bottom panel. Inventory, shop, and quest log use one shared framed-window grammar so the game reads as a cohesive JRPG rather than a generic app overlay.

This is a UI/layout redesign only. It preserves the existing Phaser/Svelte split, HUD event bridge, dialogue behavior, inventory/shop/quest data, localization model, and save schema.

## Goals

- Make the whole visible layout feel like a traditional JRPG.
- Keep the map center clear during normal movement.
- Preserve the full-width bottom dialogue region.
- Keep the existing top-left hero status and top-right quest tracker concepts, but restyle them as compact JRPG ledgers.
- Replace the current settings-style menu surface with a right-side JRPG command box.
- Move status feedback out of the settings panel into a small field prompt/toast surface.
- Give Inventory, Shop, and Quest Log a consistent framed-window layout.
- Keep inventory and shop item grids image-first and dense enough for the current 6-column desktop flow.
- Make the layout responsive for mobile without crushing localized text.
- Keep all visible Svelte UI strings localized through existing `ui.*` messages.

## Non-Goals

- No new game systems, quests, shops, items, enemies, maps, or save data.
- No changes to the Phaser runtime rules beyond any command/layout plumbing required by the HUD.
- No portrait system, minimap, battle menu, typewriter effect, or animated transition pass.
- No change to the full-width dialogue interaction contract.
- No replacement of the existing custom DOM event bridge.
- No migration or save-version bump.
- No broad component refactor unless it is necessary to make the layout understandable and testable.

## Current Context

`GameShell.svelte` currently owns the full DOM HUD over the Phaser canvas. It renders:

- Phaser mount stage.
- Hero status panel.
- Quest tracker.
- Menu/settings panel.
- Full-width `DialoguePanel.svelte`.
- Inventory modal.
- Shop modal.
- Quest Log modal.

`WorldScene` publishes render-ready HUD state through `ui-bridge/events.ts`. Svelte sends commands back through `ui-bridge/store.ts`. The redesign should stay on this boundary: Phaser owns game state and validation; Svelte owns layout and presentation.

Prior accepted UI constraints still apply:

- The bottom dialogue area must remain clear of persistent HUD overlays.
- Dialogue stays full-width at the bottom.
- Status and quest information should not block the player view.
- UI controls can open modals that pause movement and own focus.
- Runtime feedback should remain visible when a command cannot apply.

## Visual Direction

Genre and fantasy: classic fantasy JRPG vertical slice, village and Guild adventure.

Material language: dark enamel command frames, warm parchment/gold edge accents, cool cyan-blue focus accents, dense but readable item grids. Panels should feel like in-world RPG frames, not SaaS cards.

Typography: keep the existing condensed UI font stack, but reduce excessive letter spacing where it risks localized text fit. Use uppercase labels for compact headings and normal-case body text where descriptions or status copy need readability.

Palette: dark navy base, warm ivory/gold frame edges, cyan focus/quest accents, rose/gold HP, cyan/blue XP, emerald for available/positive state, amber for shop/coin state. Avoid making the page a one-note purple/blue gradient.

Motion tone: light and functional. Use hover/focus transitions and bar width transitions only. No constant ambient animation in the HUD.

## Normal Play Layout

Normal play should expose only high-value persistent information:

- **Hero Ledger** at top-left:
  - level,
  - HP current/max with bar,
  - XP current/target with bar.
- **Quest Ledger** at top-right:
  - main objective,
  - one compact side quest count/progress line when relevant.
- **Menu/Command entry** near the right edge:
  - closed state is a compact button,
  - open state becomes a vertical command box.
- **Field Prompt/Status Toast** near the right edge, above the dialogue safe zone:
  - shows short runtime feedback such as nearby NPC, no shop nearby, HP already full, saved, bought/sold item.
- **Dialogue Panel** full-width at bottom:
  - unchanged interaction model,
  - restyled to match the JRPG frame language.

The center and lower-middle playfield remain clear while no modal is open. The command box must not overlap the bottom dialogue panel.

## Command Box

The command box replaces the current settings-looking panel as the primary menu surface.

It should open from the existing menu button behavior and include:

- Quest Log,
- Inventory,
- Shop,
- Resume Save,
- Save Game,
- Use Heal,
- System/Language.

Shop remains disabled or unavailable when no nearby shop exists. Heal remains enabled whenever the player has heals so the runtime can explain cases like full HP. The command box should show disabled affordances clearly but preserve the existing feedback path where needed.

System/language controls can live in an inset sub-section of the command box or a small nested system area. They should not dominate the first command surface.

## Framed Windows

Inventory, Shop, and Quest Log should share one window grammar:

- framed modal shell with dark enamel background and warm edge treatment,
- compact header with title, context subtitle, and close action,
- tab strip where the surface has sections,
- scrollable body,
- consistent empty states,
- consistent focus-visible and Escape close behavior,
- no cards inside cards for the shell itself.

The modal backdrop can stay, because these surfaces pause movement and own focus.

### Inventory

Inventory keeps the existing tabs:

- Consumables,
- Equipment,
- Key Items.

Desktop keeps a 6-column image grid. Empty slots remain stable so the grid does not jump. The stats/equipment rail remains present on desktop but should be styled as part of the same framed window rather than a separate dashboard card stack.

On mobile, the grid reduces columns and the stats/equipment rail moves below the grid or collapses into a secondary section.

### Shop

Shop keeps Buy/Sell tabs and the image-first item grid.

The header should clearly show merchant/shop name and coin count. Buy/sell item hover tooltips remain, but their frame should match the JRPG window style.

On mobile, the grid reduces columns. Coin count and status feedback should stay visible near the header without forcing item rows below the fold.

### Quest Log

Quest Log keeps Main and Side sections, including active side quests and available Guild offers.

The redesign should improve scan order:

- main quest first,
- side quests second,
- available Guild offers clearly labeled,
- completed quest state visually lower priority.

The Quest Log should feel like a field journal inside the same JRPG frame language, not a separate dashboard surface.

## Dialogue Panel

`DialoguePanel.svelte` stays a full-width bottom panel.

The redesign may adjust:

- frame color and edge treatment,
- heading/speaker styling,
- line spacing,
- choice button styling,
- close/next button style.

It must preserve:

- global Escape close when closeable,
- Enter/Space advance/select behavior,
- direct choice mode for single-line NPCs with choices,
- full viewport width,
- no persistent HUD overlap in the bottom region.

## Responsive Behavior

Desktop:

- hero ledger top-left,
- quest ledger top-right,
- command box right side,
- inventory/shop grids at 6 columns,
- modal side rail visible where useful.

Tablet/narrow:

- ledgers keep their corners but shrink width and text density,
- command box remains right aligned and avoids dialogue,
- modal side rail can move below the main grid.

Mobile:

- hero and quest ledgers stack at the top,
- command box shortens and anchors near the right edge above dialogue,
- inventory/shop grids reduce to fewer columns,
- dialogue receives enough height for touch targets and localized text,
- no control text should overflow its button/frame.

## Data Flow And State

No new persisted state is required.

The existing local Svelte state remains enough for:

- settings/command open,
- inventory open,
- shop open,
- quest log open,
- active inventory/shop tabs,
- hover tooltip state,
- overlay pause owner.

The HUD bridge remains unchanged unless implementation discovers that a small render-only field is necessary. Any new command must be added to `ui-bridge/events.ts`, handled by `WorldScene`, and exposed through `ui-bridge/store.ts`.

## Accessibility And Input

- Menu, command, modal, tab, and close controls remain keyboard accessible.
- Inventory and shop modal focus traps remain.
- Escape closes command/modal/dialogue surfaces according to existing ownership rules.
- Focus restore should continue returning to the menu/command entry after modal close.
- Interactive image tiles keep accessible labels from item names.
- Disabled commands should communicate unavailable state without blocking runtime feedback that currently explains the action.

## Error Handling

Load errors continue to render as a top overlay.

Runtime feedback currently published through `$hudState.status` should appear in the field prompt/toast and, where appropriate, inside active shop/command surfaces. The redesign must not hide important feedback such as:

- HP already full,
- No shop nearby,
- Shop opened,
- Bought item,
- Sold item,
- Saved,
- Dialogue closed.

Missing optional HUD payloads should degrade cleanly:

- no main quest means no quest ledger,
- no shop means shop window stays closed,
- empty inventory/shop sections show stable empty states.

## Testing

Svelte component/browser tests should cover:

- command box opens from Menu and exposes expected commands,
- language selector remains available and localized,
- inventory still renders 24 slots and image-first item tiles,
- shop buy/sell grids remain image-first,
- dialogue remains full-width and Escape behavior still works,
- status feedback is visible outside the old settings panel.

E2E tests should update the boot layout assertions:

- hero ledger is visible near the top-left,
- quest ledger is visible near the top-right when a main quest exists,
- command box does not overlap the bottom dialogue safe region,
- inventory opens from the command box,
- existing Japanese language flow still works.

Verification should include:

- `bun run check`,
- focused component tests for `DialoguePanel.svelte.spec.ts` or the updated HUD test file,
- focused Playwright e2e for boot/menu/inventory,
- full `bun run test` if the change is broad enough or after the first focused passes are clean.

## Implementation Notes

The implementation should stay mostly in `src/lib/game/GameShell.svelte` and `src/lib/game/DialoguePanel.svelte`. If the markup becomes too large to reason about safely, extract small presentational Svelte components for repeated frame/window primitives, but keep that extraction scoped to this layout work.

CSS variables should be introduced for shared JRPG theme values so repeated colors and shadows are not hand-copied through every element.

No save migration, content migration, or Phaser gameplay rewrite is part of this redesign.

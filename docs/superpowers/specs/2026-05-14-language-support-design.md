# Language Support Design

## Summary

Add language support for English, Traditional Chinese, and Japanese across the current Gliese vertical slice.

The first implementation should add the localization infrastructure and move the current visible text behind typed translation keys. English is the complete source language. Traditional Chinese and Japanese dictionaries exist from the start, but they may be mostly empty and fall back to English key by key until reviewed translations are added later.

The app auto-detects the player's system/browser language, then applies a saved global language override if one exists. The override is stored separately from the game save.

## Approved Decisions

- Supported locales are `en`, `zh-Hant`, and `ja`.
- The app auto-detects language from `navigator.languages`.
- Traditional Chinese variants map to `zh-Hant`.
- Japanese maps to `ja`.
- Unsupported languages fall back to English.
- Settings includes a language selector that writes a persistent global preference.
- Language preference is not part of `SaveState`.
- All user-visible names and terms should be localizable, including UI labels, dialogue, quests, item names, shop names, map labels, NPC names, and character names.
- The first implementation should not draft Traditional Chinese or Japanese prose. It should prepare those dictionaries and let them fall back to English until reviewed translations are added.
- Changing language does not need to mutate every currently open surface live. Svelte chrome can update immediately. Dialogue, shop, quest, and status payloads can rebuild in the selected language after closing and reopening the relevant panel or after the next HUD publish.

## Goals

- Add a small typed localization layer under `src/lib/game/i18n/`.
- Provide locale detection, locale preference load/save, dictionary lookup, and English fallback.
- Move current visible Svelte HUD text behind translation keys.
- Move Phaser runtime status and error messages behind translation keys.
- Localize render-ready HUD payload text for items, quests, shops, dialogue, nearby NPCs, map labels, and rewards.
- Keep stable gameplay IDs language-neutral.
- Add the Settings language selector without adding a start screen.
- Verify fallback and preference behavior with focused tests.

## Non-Goals

- No human-quality Traditional Chinese or Japanese translation pass in this slice.
- No machine-drafted Traditional Chinese or Japanese prose in this slice.
- No save schema bump solely for language preference.
- No migration for older language preferences because this is the first preference schema.
- No locale-specific art, fonts, voice, typewriter behavior, or layout redesign.
- No SvelteKit router or app shell rewrite.
- No forced live mutation of already-open dialogue or shop payloads.

## Current Context

Gliese is a Tauri v2 desktop app with a Svelte 5 HUD and a Phaser world scene. Phaser and Svelte communicate through custom HUD events. `WorldScene` publishes render-ready HUD payloads, while `GameShell.svelte` renders menus, inventory, shop, quest log, and dialogue panels.

There is no existing localization layer. User-visible text currently appears in:

- Svelte HUD labels, buttons, headings, empty states, tooltip prefixes, and accessibility labels.
- Content definitions for items, shops, quests, dialogue, map landmarks, and NPC display names.
- `WorldScene` status messages and Phaser overlay text.
- Pure helper summaries such as reward text.

The existing architecture should stay intact: pure rules in `core`, declarative content in `content`, runtime coordination in `WorldScene`, and rendering in Svelte.

## Architecture

Create `src/lib/game/i18n/` with a small set of modules:

- `locales.ts` defines supported locale IDs, display names, and normalization helpers.
- `messages/en.ts` contains the complete English source dictionary.
- `messages/zh-Hant.ts` and `messages/ja.ts` export deep partial dictionaries that can fall back to English.
- `translate.ts` exposes typed lookup helpers and interpolation helpers.
- `preferences.ts` owns global language preference parsing, loading, saving, and defaulting.
- `store.ts` exposes a Svelte-readable locale state and setter for UI components.

The translation layer should be dependency-light and local to the game code. It does not need an external i18n package for this first slice.

English is the canonical complete dictionary. Missing non-English keys fall back to English. Missing English keys are test failures, not runtime behavior to hide.

## Locale Detection And Preference Flow

At startup:

1. Normalize `navigator.languages`.
2. Pick the first supported language.
3. Map Chinese variants to `zh-Hant` when they are traditional Chinese variants or when the browser reports `zh-Hant`, `zh-TW`, `zh-HK`, or `zh-MO`.
4. Map Japanese to `ja`.
5. Fall back to `en`.
6. Load a global language override from a separate preference key, such as `gliese.preferences.v1`.
7. Use the override when valid; otherwise use the detected locale.

The preference key is separate from `gliese.save.v4` and should not change the game save schema. In browser development it can use the same storage surface as current saves. In Tauri it should persist through the app-data-backed storage path used by the boot-time storage adapter, but under its own preference key.

Changing the Settings selector writes the preference immediately and updates the Svelte locale store.

## Runtime Data Flow

Svelte-owned labels read from the locale store and update immediately when the selected locale changes.

Phaser-owned text should be localized when `WorldScene` builds or publishes HUD state. `WorldScene` should use a locale getter or subscribe to a locale state that can be read when status messages, nearby NPC messages, shop payloads, inventory payloads, quest payloads, and dialogue payloads are built.

Already-open dialogue and shop payloads do not need forced mutation. If a player changes language while a dialogue or shop is open, closing and reopening that surface should rebuild text in the selected language. Future status publishes also use the selected language.

The HUD bridge should continue to carry render-ready text. Svelte should not import quest, dialogue, shop, or item content directly just to translate game payloads.

## Content Model

Stable IDs remain unchanged and language-neutral:

- save keys,
- map IDs,
- item IDs,
- shop IDs,
- quest IDs,
- objective IDs,
- NPC IDs,
- dialogue IDs,
- stock IDs.

User-facing text moves behind translation keys or locale-aware resolver functions.

Items keep mechanics in `content/items.ts`: `id`, `iconPath`, `type`, stackability, price, effects, slots, and modifiers. Item names and descriptions are resolved through localized item text helpers.

Quests keep mechanics in `content/quests.ts`: IDs, quest type, availability rules, objective kind, target counts, sources, and rewards. Quest title, description, objective description, progress label, and reward summaries are resolved by locale when building dialogue and HUD entries.

Dialogue keeps branch conditions and intents stable. Speaker names, lines, and choice labels are resolved by locale. The dialogue engine remains pure and should receive enough locale context to return render-ready text without importing Svelte or DOM APIs.

Shops keep IDs, stock entries, pricing, and availability unchanged. Shop names, merchant names, and descriptions are resolved by locale.

Maps keep geometry and transition rules unchanged. Landmark labels and NPC display names are resolved by locale when published or displayed.

## UI Behavior

Add a compact language selector inside the existing Settings panel. It offers:

- English,
- Traditional Chinese,
- Japanese.

The selector should not require a separate start screen. It should use the existing menu styling and stay dense enough for the current HUD.

Svelte labels covered by the first implementation include:

- Menu,
- System Menu,
- Settings,
- Quests,
- Shop,
- Inventory,
- Resume Save,
- Save Game,
- Use Heal,
- Close,
- Inventory tabs,
- Quest Log headings,
- shop Buy and Sell tabs,
- empty inventory/shop states,
- tooltip prefixes,
- stat/equipment labels where they are user-facing words,
- accessibility labels that are visible to assistive technology.

Short game abbreviations such as HP, XP, ATK, and DEF can remain unchanged for the first slice unless the dictionary explicitly supplies localized forms.

## Runtime Messages

`WorldScene` status and feedback messages should become keyed messages with parameters where needed.

Examples:

- no heal charges,
- item cannot be used,
- HP already full,
- recovered HP,
- enemy defeated,
- victory,
- item equipped,
- item unequipped,
- shop opened,
- shop closed,
- no shop nearby,
- bought item,
- sold item,
- quest accepted,
- quest complete,
- no dialogue open,
- no one nearby,
- ruins route unlocked,
- save resumed,
- invalid save reset,
- entered area,
- new run,
- report to the Guild Master first.

Dynamic parameters include item names, quest titles, nearby NPC names, and reward summaries. Those parameters should already be localized before interpolation.

## Error Handling

Missing Traditional Chinese or Japanese keys fall back to English.

Missing English keys should be caught by tests. Runtime lookup may still return a readable fallback for resilience, but tests should make that path unacceptable for source content.

Invalid saved locale preferences are ignored and replaced by detection/defaulting.

Invalid or unsupported locale inputs normalize to English.

If a runtime payload cannot be localized because a content ID is unknown, the existing fallback behavior remains: show a short readable fallback message instead of crashing the scene.

## Testing

Pure unit tests should cover:

- supported locale normalization,
- browser language detection for English, Traditional Chinese variants, Japanese, and unsupported languages,
- saved override precedence over detection,
- invalid preference fallback,
- key-by-key fallback from `zh-Hant` and `ja` to English,
- English dictionary completeness for required content keys,
- localized item, quest, shop, dialogue, and map label resolution,
- parameter interpolation for item purchase, item sale, quest completion, and nearby NPC status.

Svelte component tests should cover:

- Settings language selector rendering,
- preference setter calls when a language is selected,
- immediate Svelte chrome update after locale store change,
- English fallback text when the selected locale lacks a non-English key.

WorldScene or bridge tests should cover:

- HUD payloads using localized item names and descriptions,
- quest tracker and quest log payload text using localized quest fields,
- dialogue payload text and choice labels using the selected locale,
- shop payload text using localized shop and item fields,
- status messages using keyed localized messages.

E2E can stay focused:

- open Settings,
- change language,
- close and reopen a panel,
- verify that the rebuilt surface uses the selected locale or English fallback text.

Because this touches Svelte files, implementation should run the Svelte autofixer before the code is handed back.

# Language Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add English, Traditional Chinese, and Japanese language support for the current Gliese vertical slice, with English as the complete source dictionary and non-English locales falling back to English until reviewed translations are added.

**Architecture:** Add a small typed `src/lib/game/i18n/` layer for locale detection, preference persistence, dictionaries, translation lookup, and locale-aware content resolvers. Keep gameplay IDs stable and language-neutral; resolve user-facing text when building HUD/dialogue/shop/quest payloads or rendering Svelte-owned UI chrome.

**Tech Stack:** TypeScript, Svelte 5 runes mode, Phaser 4, Vite, Tauri v2 fs-backed storage, Vitest node tests, vitest-browser-svelte component tests, Playwright e2e, bun.

---

## File Structure

- Create `src/lib/game/i18n/locales.ts`
- Create `src/lib/game/i18n/locales.test.ts`
- Create `src/lib/game/i18n/messages/en.ts`
- Create `src/lib/game/i18n/messages/zh-Hant.ts`
- Create `src/lib/game/i18n/messages/ja.ts`
- Create `src/lib/game/i18n/messages/types.ts`
- Create `src/lib/game/i18n/translate.ts`
- Create `src/lib/game/i18n/translate.test.ts`
- Create `src/lib/game/i18n/preferences.ts`
- Create `src/lib/game/i18n/preferences.test.ts`
- Create `src/lib/game/i18n/store.ts`
- Create `src/lib/game/i18n/content.ts`
- Create `src/lib/game/i18n/content.test.ts`
- Modify `src/lib/game/save/storage.ts`
- Modify `src/lib/game/save/tauri-storage.ts`
- Modify `src/lib/game/save/tauri-storage.test.ts`
- Modify `src/main.ts`
- Modify `src/lib/game/content/items.ts`
- Modify `src/lib/game/content/items.test.ts`
- Modify `src/lib/game/content/shops.ts`
- Modify `src/lib/game/content/shops.test.ts`
- Modify `src/lib/game/content/quests.ts`
- Modify `src/lib/game/content/quests.test.ts`
- Modify `src/lib/game/content/dialogue.ts`
- Modify `src/lib/game/content/dialogue.test.ts`
- Modify `src/lib/game/content/maps.ts`
- Modify `src/lib/game/content/maps.test.ts`
- Modify `src/lib/game/core/quests.ts`
- Modify `src/lib/game/core/quests.test.ts`
- Modify `src/lib/game/core/dialogue.ts`
- Modify `src/lib/game/core/dialogue.test.ts`
- Modify `src/lib/game/core/shop.ts`
- Modify `src/lib/game/core/shop.test.ts`
- Modify `src/lib/game/ui-bridge/store.ts`
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify `src/lib/game/GameShell.svelte`
- Modify `src/lib/game/DialoguePanel.svelte`
- Modify `src/lib/game/DialoguePanel.svelte.spec.ts`
- Modify `tests/e2e/game.e2e.ts`

## Task 1: Locale Foundation And Preference Storage

**Files:**

- Create: `src/lib/game/i18n/locales.ts`
- Create: `src/lib/game/i18n/locales.test.ts`
- Create: `src/lib/game/i18n/preferences.ts`
- Create: `src/lib/game/i18n/preferences.test.ts`
- Modify: `src/lib/game/save/storage.ts`
- Modify: `src/lib/game/save/tauri-storage.ts`
- Modify: `src/lib/game/save/tauri-storage.test.ts`
- Modify: `src/main.ts`

- [ ] **Step 1.1: Write failing locale tests**

Create `src/lib/game/i18n/locales.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
	detectSupportedLocale,
	isSupportedLocale,
	normalizeLocale,
	supportedLocales
} from '$lib/game/i18n/locales';

describe('locales', () => {
	it('declares the supported locales in selector order', () => {
		expect(supportedLocales).toEqual(['en', 'zh-Hant', 'ja']);
		expect(isSupportedLocale('en')).toBe(true);
		expect(isSupportedLocale('zh-Hant')).toBe(true);
		expect(isSupportedLocale('ja')).toBe(true);
		expect(isSupportedLocale('zh-CN')).toBe(false);
	});

	it.each([
		['en-US', 'en'],
		['en-GB', 'en'],
		['zh-Hant', 'zh-Hant'],
		['zh-TW', 'zh-Hant'],
		['zh-HK', 'zh-Hant'],
		['zh-MO', 'zh-Hant'],
		['ja-JP', 'ja'],
		['fr-CA', null],
		['zh-CN', null]
	] as const)('normalizes %s', (input, expected) => {
		expect(normalizeLocale(input)).toBe(expected);
	});

	it('detects the first supported browser language', () => {
		expect(detectSupportedLocale(['fr-CA', 'ja-JP', 'en-US'])).toBe('ja');
		expect(detectSupportedLocale(['fr-CA', 'zh-HK', 'en-US'])).toBe('zh-Hant');
		expect(detectSupportedLocale(['fr-CA'])).toBe('en');
		expect(detectSupportedLocale([])).toBe('en');
	});
});
```

- [ ] **Step 1.2: Run locale tests and verify failure**

Run:

```sh
bun run test:unit -- --run src/lib/game/i18n/locales.test.ts
```

Expected: FAIL because `src/lib/game/i18n/locales.ts` does not exist.

- [ ] **Step 1.3: Implement locale helpers**

Create `src/lib/game/i18n/locales.ts`:

```ts
export const supportedLocales = ['en', 'zh-Hant', 'ja'] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = 'en';

export const localeLabels: Record<Locale, string> = {
	en: 'English',
	'zh-Hant': 'Traditional Chinese',
	ja: 'Japanese'
};

const supportedLocaleSet = new Set<string>(supportedLocales);

export function isSupportedLocale(value: string): value is Locale {
	return supportedLocaleSet.has(value);
}

export function normalizeLocale(value: string | null | undefined): Locale | null {
	const normalized = value?.trim();
	if (!normalized) return null;
	if (isSupportedLocale(normalized)) return normalized;

	const lower = normalized.toLowerCase();
	if (lower === 'en' || lower.startsWith('en-')) return 'en';
	if (lower === 'ja' || lower.startsWith('ja-')) return 'ja';
	if (lower === 'zh-hant' || lower.startsWith('zh-hant-')) return 'zh-Hant';
	if (lower === 'zh-tw' || lower === 'zh-hk' || lower === 'zh-mo') return 'zh-Hant';
	if (lower.startsWith('zh-tw-') || lower.startsWith('zh-hk-') || lower.startsWith('zh-mo-')) {
		return 'zh-Hant';
	}

	return null;
}

export function detectSupportedLocale(
	languages: readonly string[] = getNavigatorLanguages()
): Locale {
	for (const language of languages) {
		const locale = normalizeLocale(language);
		if (locale) return locale;
	}

	return defaultLocale;
}

function getNavigatorLanguages(): readonly string[] {
	if (typeof navigator === 'undefined') return [];
	return navigator.languages.length > 0
		? navigator.languages
		: [navigator.language].filter(Boolean);
}
```

- [ ] **Step 1.4: Run locale tests and verify pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/i18n/locales.test.ts
```

Expected: PASS.

- [ ] **Step 1.5: Write failing preference tests**

Create `src/lib/game/i18n/preferences.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
	LANGUAGE_PREFERENCE_STORAGE_KEY,
	loadLanguagePreference,
	resolveInitialLocale,
	saveLanguagePreference
} from '$lib/game/i18n/preferences';
import type { SaveStorage } from '$lib/game/save/storage';

function createMemoryStorage(initial: Record<string, string> = {}): SaveStorage {
	const values = new Map(Object.entries(initial));
	return {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
		removeItem: (key) => values.delete(key)
	};
}

describe('language preferences', () => {
	it('loads a valid saved locale override', () => {
		const storage = createMemoryStorage({ [LANGUAGE_PREFERENCE_STORAGE_KEY]: 'ja' });

		expect(loadLanguagePreference(storage)).toBe('ja');
		expect(resolveInitialLocale({ storage, languages: ['en-US'] })).toBe('ja');
	});

	it('ignores invalid saved values and falls back to detection', () => {
		const storage = createMemoryStorage({ [LANGUAGE_PREFERENCE_STORAGE_KEY]: 'fr-CA' });

		expect(loadLanguagePreference(storage)).toBeNull();
		expect(resolveInitialLocale({ storage, languages: ['zh-TW'] })).toBe('zh-Hant');
	});

	it('saves and clears language preference separately from the game save key', () => {
		const storage = createMemoryStorage();

		saveLanguagePreference('zh-Hant', storage);
		expect(storage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY)).toBe('zh-Hant');

		saveLanguagePreference(null, storage);
		expect(storage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY)).toBeNull();
	});
});
```

- [ ] **Step 1.6: Run preference tests and verify failure**

Run:

```sh
bun run test:unit -- --run src/lib/game/i18n/preferences.test.ts
```

Expected: FAIL because `preferences.ts` does not exist.

- [ ] **Step 1.7: Export current storage access**

Modify `src/lib/game/save/storage.ts`:

```ts
export function getSaveStorage(): SaveStorage | undefined {
	return currentStorage;
}
```

Keep `SAVE_STORAGE_KEY` unchanged at `gliese.save.v4`.

- [ ] **Step 1.8: Implement language preferences**

Create `src/lib/game/i18n/preferences.ts`:

```ts
import {
	defaultLocale,
	detectSupportedLocale,
	isSupportedLocale,
	type Locale
} from '$lib/game/i18n/locales';
import { getSaveStorage, type SaveStorage } from '$lib/game/save/storage';

export const LANGUAGE_PREFERENCE_STORAGE_KEY = 'gliese.preferences.v1';

export function loadLanguagePreference(
	storage: SaveStorage | undefined = getSaveStorage()
): Locale | null {
	const value = storage?.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY);
	return value && isSupportedLocale(value) ? value : null;
}

export function saveLanguagePreference(
	locale: Locale | null,
	storage: SaveStorage | undefined = getSaveStorage()
): void {
	if (!storage) return;
	if (locale === null) {
		storage.removeItem(LANGUAGE_PREFERENCE_STORAGE_KEY);
		return;
	}
	storage.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, locale);
}

export function resolveInitialLocale({
	storage = getSaveStorage(),
	languages
}: {
	storage?: SaveStorage;
	languages?: readonly string[];
} = {}): Locale {
	return loadLanguagePreference(storage) ?? detectSupportedLocale(languages) ?? defaultLocale;
}
```

- [ ] **Step 1.9: Extend Tauri storage for the preference key**

Modify `src/lib/game/save/tauri-storage.ts`:

- Import `LANGUAGE_PREFERENCE_STORAGE_KEY`.
- Add `PREFERENCES_FILE_NAME = 'gliese-preferences.json'` and `PREFERENCES_FILE_TMP_NAME = 'gliese-preferences.json.tmp'`.
- Read the preferences file into the same `cache` map under `LANGUAGE_PREFERENCE_STORAGE_KEY`.
- Add a second pending write queue for the preference file, or generalize `scheduleWrite(fileName, tmpName, value)`.
- On `setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, value)`, write the preference file.
- On `removeItem(LANGUAGE_PREFERENCE_STORAGE_KEY)`, write an empty value or remove from cache and write an empty file.
- Keep `SAVE_FILE_NAME` as the raw save JSON file to avoid changing the save-file format.
- Update `flushPendingWrites()` to wait for both save and preference pending writes.

Expected behavior: browser mode still returns `globalThis.localStorage`; Tauri mode persists saves to `gliese-save.json` and language preference to `gliese-preferences.json`.

- [ ] **Step 1.10: Update Tauri storage tests**

Modify `src/lib/game/save/tauri-storage.test.ts` to assert:

- existing save file still hydrates under `SAVE_STORAGE_KEY`;
- existing preference file hydrates under `LANGUAGE_PREFERENCE_STORAGE_KEY`;
- setting `LANGUAGE_PREFERENCE_STORAGE_KEY` schedules a preferences write, not a save-file write;
- `flushPendingWrites()` waits for both queues.

Run:

```sh
bun run test:unit -- --run src/lib/game/save/tauri-storage.test.ts src/lib/game/i18n/preferences.test.ts
```

Expected: PASS.

- [ ] **Step 1.11: Initialize locale before mounting Svelte**

Modify `src/main.ts` after `setSaveStorage(storage)`:

```ts
const { initializeLocale } = await import('$lib/game/i18n/store');
initializeLocale();
```

This must run before `mount(App, ...)` so Svelte and Phaser start from the same locale.

- [ ] **Step 1.12: Commit Task 1**

Run:

```sh
git add src/lib/game/i18n/locales.ts src/lib/game/i18n/locales.test.ts src/lib/game/i18n/preferences.ts src/lib/game/i18n/preferences.test.ts src/lib/game/save/storage.ts src/lib/game/save/tauri-storage.ts src/lib/game/save/tauri-storage.test.ts src/main.ts
git commit -m "feat: add locale detection and preference storage"
```

## Task 2: Translation Dictionary And Lookup

**Files:**

- Create: `src/lib/game/i18n/messages/types.ts`
- Create: `src/lib/game/i18n/messages/en.ts`
- Create: `src/lib/game/i18n/messages/zh-Hant.ts`
- Create: `src/lib/game/i18n/messages/ja.ts`
- Create: `src/lib/game/i18n/translate.ts`
- Create: `src/lib/game/i18n/translate.test.ts`
- Create: `src/lib/game/i18n/store.ts`

- [ ] **Step 2.1: Write failing translation tests**

Create `src/lib/game/i18n/translate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { t } from '$lib/game/i18n/translate';

describe('translation lookup', () => {
	it('returns English source messages', () => {
		expect(t('en', 'ui.menu')).toBe('Menu');
		expect(t('en', 'content.items.field-potion.name')).toBe('Field Potion');
	});

	it('falls back to English for missing non-English keys', () => {
		expect(t('zh-Hant', 'ui.menu')).toBe('Menu');
		expect(t('ja', 'content.quests.investigate-the-ruins.title')).toBe('Investigate the Ruins');
	});

	it('interpolates parameters after fallback', () => {
		expect(t('ja', 'status.boughtItem', { itemName: 'Field Potion' })).toBe('Bought Field Potion');
	});

	it('returns a readable missing marker only for unknown source keys', () => {
		expect(t('en', 'missing.key')).toBe('[missing.key]');
	});
});
```

- [ ] **Step 2.2: Run translation tests and verify failure**

Run:

```sh
bun run test:unit -- --run src/lib/game/i18n/translate.test.ts
```

Expected: FAIL because translation modules do not exist.

- [ ] **Step 2.3: Define dictionary types**

Create `src/lib/game/i18n/messages/types.ts`:

```ts
export type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]>;
};

type LeafPath<T, Prefix extends string = ''> = {
	[K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : LeafPath<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessagePath<T> = LeafPath<T>;
export type MessageParams = Record<string, string | number>;
```

- [ ] **Step 2.4: Add complete English dictionary**

Create `src/lib/game/i18n/messages/en.ts` with the complete current English source strings. Include these top-level sections:

```ts
export const en = {
	ui: {
		menu: 'Menu',
		systemMenu: 'System Menu',
		settings: 'Settings',
		language: 'Language',
		quests: 'Quests',
		shop: 'Shop',
		inventory: 'Inventory',
		resumeSave: 'Resume Save',
		saveGame: 'Save Game',
		useHeal: 'Use Heal',
		close: 'Close',
		next: 'Next',
		mainQuest: 'Main Quest',
		sideActive: '{{count}} side active',
		fieldPack: 'Field Pack',
		consumables: 'Consumables',
		equipment: 'Equipment',
		keyItems: 'Key Items',
		stats: 'Stats',
		equipped: 'Equipped',
		empty: 'Empty',
		key: 'Key',
		keyItem: 'Key item',
		remove: 'Remove',
		fieldJournal: 'Field Journal',
		questLog: 'Quest Log',
		main: 'Main',
		side: 'Side',
		availableFromGuildMaster: 'Available from Guild Master',
		noSideQuestsActive: 'No side quests active.',
		coins: 'Coins: {{coins}}',
		buy: 'Buy',
		sell: 'Sell',
		noStockAvailable: 'No stock available.',
		noSellableItems: 'No sellable items.',
		buyFor: 'Buy for {{meta}}',
		sellFor: 'Sell for {{meta}}',
		unlimited: 'Unlimited',
		stockLeft: '{{count}} left',
		emptyInventorySlot: 'Empty inventory slot {{index}}',
		shopSections: 'Shop sections',
		inventorySections: 'Inventory sections',
		questTracker: 'Quest tracker',
		playerStatus: 'Player status'
	},
	status: {
		loadingGame: 'Loading game',
		noHealCharges: 'No heal charges left',
		itemCannotBeUsed: 'Item cannot be used',
		hpAlreadyFull: 'HP already full',
		recoveredHp: 'Recovered HP',
		strikeLanded: 'Strike landed',
		enemyDefeated: 'Enemy defeated',
		victoryRuinsCleared: 'Victory: ruins cleared',
		itemCannotBeEquipped: 'Item cannot be equipped',
		equippedItem: 'Equipped item',
		unequippedItem: 'Unequipped item',
		noShopNearby: 'No shop nearby',
		shopOpened: 'Shop opened',
		shopClosed: 'Shop closed',
		boughtItem: 'Bought {{itemName}}',
		soldItem: 'Sold {{itemName}}',
		noGuildQuestAvailable: 'No Guild quest available',
		questAccepted: 'Quest accepted',
		questComplete: 'Quest complete: {{questTitle}}',
		questAlreadyActive: 'Quest already active',
		questAlreadyComplete: 'Quest already complete',
		questNotAvailable: 'Quest not available',
		questCannotBeAccepted: 'Quest cannot be accepted',
		notEnoughCoins: 'Not enough coins',
		itemOutOfStock: 'Item out of stock',
		itemCannotBeBought: 'Item cannot be bought',
		equippedItemCannotBeSold: 'Equipped item cannot be sold',
		itemNotOwned: 'Item not owned',
		itemCannotBeSold: 'Item cannot be sold',
		noDialogueOpen: 'No dialogue open',
		noOneNearby: 'No one nearby',
		ruinsRouteUnlocked: 'Ruins route unlocked',
		dialogueClosed: 'Dialogue closed',
		dialogueUpdated: 'Dialogue updated',
		noSaveFound: 'No save found',
		saved: 'Saved',
		saveResumed: 'Save resumed',
		enteredArea: 'Entered area',
		invalidSaveReset: 'Invalid save reset',
		newRun: 'New run',
		reportToGuildMasterFirst: 'Report to the Guild Master first',
		shopOutOfReach: 'Shop out of reach'
	},
	content: {
		// Fill with all current item, shop, quest, dialogue, NPC, and map-label strings.
	}
} as const;

export type EnglishMessages = typeof en;
```

Fill `content` completely from current source strings in:

- `src/lib/game/content/items.ts`
- `src/lib/game/content/shops.ts`
- `src/lib/game/content/quests.ts`
- `src/lib/game/content/dialogue.ts`
- `src/lib/game/content/maps.ts`
- `WorldScene` fallback speakers such as `Traveler`, `Shop`, and `Guild Notice`

Do not add Traditional Chinese or Japanese prose in this slice.

- [ ] **Step 2.5: Add partial non-English dictionaries**

Create `src/lib/game/i18n/messages/zh-Hant.ts`:

```ts
import type { DeepPartial } from '$lib/game/i18n/messages/types';
import type { EnglishMessages } from '$lib/game/i18n/messages/en';

export const zhHant = {} satisfies DeepPartial<EnglishMessages>;
```

Create `src/lib/game/i18n/messages/ja.ts`:

```ts
import type { DeepPartial } from '$lib/game/i18n/messages/types';
import type { EnglishMessages } from '$lib/game/i18n/messages/en';

export const ja = {} satisfies DeepPartial<EnglishMessages>;
```

- [ ] **Step 2.6: Implement translation lookup**

Create `src/lib/game/i18n/translate.ts`:

```ts
import { defaultLocale, type Locale } from '$lib/game/i18n/locales';
import { en, type EnglishMessages } from '$lib/game/i18n/messages/en';
import { ja } from '$lib/game/i18n/messages/ja';
import { zhHant } from '$lib/game/i18n/messages/zh-Hant';
import type { MessageParams, MessagePath } from '$lib/game/i18n/messages/types';

export type MessageKey = MessagePath<EnglishMessages>;

const messages = {
	en,
	'zh-Hant': zhHant,
	ja
} as const;

export function t(locale: Locale, key: MessageKey | string, params: MessageParams = {}): string {
	const source = getMessage(messages[locale], key) ?? getMessage(messages[defaultLocale], key);
	if (source === undefined) return `[${key}]`;
	return interpolate(source, params);
}

function getMessage(source: unknown, key: string): string | undefined {
	let current = source;
	for (const segment of key.split('.')) {
		if (!isRecord(current) || !(segment in current)) return undefined;
		current = current[segment];
	}
	return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params: MessageParams): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(params[name] ?? ''));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
```

- [ ] **Step 2.7: Implement locale store**

Create `src/lib/game/i18n/store.ts`:

```ts
import { writable } from 'svelte/store';

import { defaultLocale, type Locale } from '$lib/game/i18n/locales';
import { resolveInitialLocale, saveLanguagePreference } from '$lib/game/i18n/preferences';

let activeLocale: Locale = defaultLocale;
const writableLocale = writable<Locale>(activeLocale);

export const locale = {
	subscribe: writableLocale.subscribe
};

export function initializeLocale(): Locale {
	activeLocale = resolveInitialLocale();
	writableLocale.set(activeLocale);
	return activeLocale;
}

export function getActiveLocale(): Locale {
	return activeLocale;
}

export function setActiveLocale(locale: Locale): void {
	activeLocale = locale;
	writableLocale.set(locale);
	saveLanguagePreference(locale);
}
```

- [ ] **Step 2.8: Run translation tests and verify pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/i18n/translate.test.ts src/lib/game/i18n/locales.test.ts src/lib/game/i18n/preferences.test.ts
```

Expected: PASS.

- [ ] **Step 2.9: Commit Task 2**

Run:

```sh
git add src/lib/game/i18n
git commit -m "feat: add translation dictionaries and lookup"
```

## Task 3: Migrate Content Definitions To Text Keys

**Files:**

- Create: `src/lib/game/i18n/content.ts`
- Create: `src/lib/game/i18n/content.test.ts`
- Modify: `src/lib/game/content/items.ts`
- Modify: `src/lib/game/content/items.test.ts`
- Modify: `src/lib/game/content/shops.ts`
- Modify: `src/lib/game/content/shops.test.ts`
- Modify: `src/lib/game/content/quests.ts`
- Modify: `src/lib/game/content/quests.test.ts`
- Modify: `src/lib/game/content/dialogue.ts`
- Modify: `src/lib/game/content/dialogue.test.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps.test.ts`

- [ ] **Step 3.1: Write failing localized content tests**

Create `src/lib/game/i18n/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
	formatRewardSummary,
	getDialogueText,
	getItemText,
	getMapLandmarkText,
	getNpcText,
	getQuestObjectiveText,
	getQuestText,
	getShopText
} from '$lib/game/i18n/content';

describe('localized content resolvers', () => {
	it('resolves item names and descriptions with English fallback', () => {
		expect(getItemText('en', 'field-potion')).toEqual({
			name: 'Field Potion',
			description: 'Restores 8 HP.'
		});
		expect(getItemText('ja', 'field-potion').name).toBe('Field Potion');
	});

	it('resolves shops, NPCs, landmarks, quests, and objectives', () => {
		expect(getShopText('en', 'miras-item-shop')?.name).toBe("Mira's Item Shop");
		expect(getNpcText('en', 'guild-master')?.name).toBe('Guild Master Arlen');
		expect(getMapLandmarkText('en', 'hero-house-exterior')?.label).toBe("Hero's House");
		expect(getQuestText('en', 'investigate-the-ruins')?.title).toBe('Investigate the Ruins');
		expect(
			getQuestObjectiveText('en', 'investigate-the-ruins', 'talk-to-guild-master')
		).toMatchObject({
			description: 'Talk to the Guild Master in the Guild Hall.',
			progressLabel: 'Guild Master spoken to'
		});
	});

	it('resolves dialogue speakers, lines, and labels', () => {
		const dialogue = getDialogueText('en', 'guild-master');

		expect(dialogue?.speaker).toBe('Guild Master Arlen');
		expect(dialogue?.branches[0]?.lines[0]).toBe(
			'You made it. The eastern ruins are stirring again, and the village road is no longer safe.'
		);
		expect(dialogue?.actions.map((action) => action.label)).toEqual(['Talk', 'Quest']);
	});

	it('formats reward summaries with localized item names when items are shown later', () => {
		expect(
			formatRewardSummary('en', {
				xp: 15,
				coins: 35,
				items: [{ itemId: 'greater-field-potion', quantity: 1 }]
			})
		).toBe('15 XP / 35 coins / 1 item');
	});
});
```

- [ ] **Step 3.2: Run localized content tests and verify failure**

Run:

```sh
bun run test:unit -- --run src/lib/game/i18n/content.test.ts
```

Expected: FAIL because `content.ts` does not exist.

- [ ] **Step 3.3: Replace content text fields with message keys**

Modify content definition types:

- `items.ts`: replace `name` and `description` with `nameKey` and `descriptionKey`.
- `shops.ts`: replace `name`, `merchantName`, and `description` with `nameKey`, `merchantNameKey`, and `descriptionKey`.
- `quests.ts`: replace quest `title`, `description`, objective `description`, and `progressLabel` with key fields.
- `dialogue.ts`: replace `speaker`, branch `lines`, and action `label` with `speakerKey`, `lineKeys`, and `labelKey`.
- `maps.ts`: replace NPC `name` with `nameKey`; replace landmark `label` with `labelKey`.

Use message keys that mirror stable IDs:

```ts
nameKey: 'content.items.field-potion.name';
descriptionKey: 'content.items.field-potion.description';
titleKey: 'content.quests.investigate-the-ruins.title';
speakerKey: 'content.dialogue.guild-master.speaker';
```

Keep IDs, mechanics, prices, coordinates, objective targets, and reward definitions unchanged.

- [ ] **Step 3.4: Implement localized content resolvers**

Create `src/lib/game/i18n/content.ts` with these helpers:

```ts
import { getDialogue } from '$lib/game/content/dialogue';
import { getItem } from '$lib/game/content/items';
import { maps } from '$lib/game/content/maps';
import { getQuest, type QuestId, type QuestReward } from '$lib/game/content/quests';
import { getShop } from '$lib/game/content/shops';
import type { Locale } from '$lib/game/i18n/locales';
import { t } from '$lib/game/i18n/translate';

export function getItemText(locale: Locale, itemId: string) {
	const item = getItem(itemId);
	return item
		? { name: t(locale, item.nameKey), description: t(locale, item.descriptionKey) }
		: null;
}

export function getShopText(locale: Locale, shopId: string) {
	const shop = getShop(shopId);
	return shop
		? {
				name: t(locale, shop.nameKey),
				merchantName: t(locale, shop.merchantNameKey),
				description: t(locale, shop.descriptionKey)
			}
		: null;
}

export function getQuestText(locale: Locale, questId: string) {
	const quest = getQuest(questId);
	return quest
		? { title: t(locale, quest.titleKey), description: t(locale, quest.descriptionKey) }
		: null;
}

export function getQuestObjectiveText(locale: Locale, questId: string, objectiveId: string) {
	const objective = getQuest(questId)?.objectives.find((candidate) => candidate.id === objectiveId);
	return objective
		? {
				description: t(locale, objective.descriptionKey),
				progressLabel: t(locale, objective.progressLabelKey)
			}
		: null;
}

export function getDialogueText(locale: Locale, dialogueId: string) {
	const definition = getDialogue(dialogueId);
	return definition
		? {
				speaker: t(locale, definition.speakerKey),
				branches: definition.defaultBranches.map((branch) => ({
					condition: branch.condition,
					lines: branch.lineKeys.map((key) => t(locale, key))
				})),
				actions: definition.actions.map((action) => ({
					...action,
					label: t(locale, action.labelKey)
				}))
			}
		: null;
}

export function getNpcText(locale: Locale, npcId: string) {
	const npc = Object.values(maps)
		.flatMap((map) => map.npcs ?? [])
		.find((candidate) => candidate.id === npcId);
	return npc ? { name: t(locale, npc.nameKey) } : null;
}

export function getMapLandmarkText(locale: Locale, landmarkId: string) {
	const landmark = Object.values(maps)
		.flatMap((map) => map.landmarks ?? [])
		.find((candidate) => candidate.id === landmarkId);
	return landmark ? { label: t(locale, landmark.labelKey) } : null;
}

export function formatRewardSummary(locale: Locale, reward: QuestReward): string {
	const parts = [
		reward.xp ? t(locale, 'content.rewards.xp', { xp: reward.xp }) : '',
		reward.coins ? t(locale, 'content.rewards.coins', { coins: reward.coins }) : '',
		...(reward.items ?? []).map((item) =>
			t(locale, item.quantity === 1 ? 'content.rewards.oneItem' : 'content.rewards.itemCount', {
				quantity: item.quantity
			})
		)
	].filter(Boolean);

	return parts.join(' / ');
}
```

- [ ] **Step 3.5: Update content tests for keys**

Modify existing content tests so they assert key validity instead of direct English strings where appropriate. Add checks that every key field returns a non-missing English message:

```ts
expect(t('en', item.nameKey)).not.toMatch(/^\[/);
```

- [ ] **Step 3.6: Run content tests and verify pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/i18n/content.test.ts src/lib/game/content/items.test.ts src/lib/game/content/shops.test.ts src/lib/game/content/quests.test.ts src/lib/game/content/dialogue.test.ts src/lib/game/content/maps.test.ts
```

Expected: PASS.

- [ ] **Step 3.7: Commit Task 3**

Run:

```sh
git add src/lib/game/i18n/content.ts src/lib/game/i18n/content.test.ts src/lib/game/content/items.ts src/lib/game/content/items.test.ts src/lib/game/content/shops.ts src/lib/game/content/shops.test.ts src/lib/game/content/quests.ts src/lib/game/content/quests.test.ts src/lib/game/content/dialogue.ts src/lib/game/content/dialogue.test.ts src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/i18n/messages/en.ts
git commit -m "feat: move game content text behind locale keys"
```

## Task 4: Localize Core HUD Payload Builders

**Files:**

- Modify: `src/lib/game/core/quests.ts`
- Modify: `src/lib/game/core/quests.test.ts`
- Modify: `src/lib/game/core/dialogue.ts`
- Modify: `src/lib/game/core/dialogue.test.ts`
- Modify: `src/lib/game/core/shop.ts`
- Modify: `src/lib/game/core/shop.test.ts`

- [ ] **Step 4.1: Write failing core localization assertions**

Update tests to pass an explicit locale and assert payload text:

- `buildHudQuestState({ state, nearbyQuestGiverId, locale: 'en' })`
- `startNpcDialogue({ npcId, questState, locale: 'en' })`
- `buildQuestCompletionDialogue({ questId, title, reward, locale: 'en' })`
- `buildShopBuyEntries(shopId, stockState, 'en')`
- `buildShopSellEntries({ inventory, equipment, locale: 'en' })`

Add one fallback assertion in each relevant file using locale `ja` and expecting English text.

- [ ] **Step 4.2: Run focused core tests and verify failure**

Run:

```sh
bun run test:unit -- --run src/lib/game/core/quests.test.ts src/lib/game/core/dialogue.test.ts src/lib/game/core/shop.test.ts
```

Expected: FAIL because the core builders do not accept locale yet and still read direct English fields.

- [ ] **Step 4.3: Update quest HUD builder**

Modify `src/lib/game/core/quests.ts`:

- import `type Locale` and localized content helpers;
- add `locale: Locale` to `buildHudQuestState`;
- use `getQuestText(locale, quest.id)`;
- use `getQuestObjectiveText(locale, quest.id, objective.id)`;
- use `formatRewardSummary(locale, quest.reward)`;
- localize `guildOffer.giverName` from `getNpcText(locale, 'guild-master')`.

Keep quest state transitions and acceptance logic unchanged.

- [ ] **Step 4.4: Update dialogue engine**

Modify `src/lib/game/core/dialogue.ts`:

- add `locale: Locale` to `startNpcDialogue`, `chooseDialogueOption`, `buildQuestCompletionDialogue`, and internal Guild quest helper functions;
- use `getDialogueText(locale, npcId)` for speaker, lines, and action labels;
- use `getQuestText`, `getQuestObjectiveText`, and `formatRewardSummary` for quest list/detail/completion text;
- keep `DialogueIntent` unchanged;
- preserve the existing single-line choice behavior.

Fallback sessions may still receive already-localized `speaker` and `line` strings from callers.

- [ ] **Step 4.5: Update shop entry builders**

Modify `src/lib/game/core/shop.ts`:

- add `locale: Locale` to `buildShopBuyEntries` and `buildShopSellEntries`;
- use `getItemText(locale, item.id)` for `name` and `description`;
- keep item mechanics and prices unchanged.

- [ ] **Step 4.6: Run core tests and verify pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/core/quests.test.ts src/lib/game/core/dialogue.test.ts src/lib/game/core/shop.test.ts
```

Expected: PASS.

- [ ] **Step 4.7: Commit Task 4**

Run:

```sh
git add src/lib/game/core/quests.ts src/lib/game/core/quests.test.ts src/lib/game/core/dialogue.ts src/lib/game/core/dialogue.test.ts src/lib/game/core/shop.ts src/lib/game/core/shop.test.ts
git commit -m "feat: localize core hud payload builders"
```

## Task 5: Localize WorldScene Runtime Text

**Files:**

- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/ui-bridge/store.ts`

- [ ] **Step 5.1: Write failing WorldScene localization tests**

In `src/lib/game/phaser/scenes/scenes.test.ts`, add or update focused assertions:

- with active locale `en`, existing status assertions still pass;
- with active locale `ja`, buying an item still publishes English fallback `Bought Field Potion`;
- nearby NPC status uses localized/fallback NPC name from the content resolver;
- shop payload uses localized/fallback shop name, merchant name, item names, and item descriptions;
- quest payload uses localized/fallback quest and objective text;
- dialogue payload uses localized/fallback speaker, line, and choice labels.

If `getActiveLocale` is hard to control in tests, mock `src/lib/game/i18n/store`:

```ts
vi.mock('$lib/game/i18n/store', () => ({
	getActiveLocale: () => 'ja'
}));
```

- [ ] **Step 5.2: Run WorldScene tests and verify failure**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL where `WorldScene` still calls builders without locale and still reads direct English names.

- [ ] **Step 5.3: Add localized status helper to WorldScene**

Modify `WorldScene.ts`:

- import `getActiveLocale`;
- import `t` and content resolvers;
- add helper methods:

```ts
private getLocale() {
	return getActiveLocale();
}

private status(key: string, params: Record<string, string | number> = {}) {
	return t(this.getLocale(), key, params);
}
```

Use `this.status('status.noHealCharges')` and similar keys for all runtime status messages listed in the design spec.

- [ ] **Step 5.4: Localize runtime payload builders**

Modify `WorldScene.ts`:

- pass `this.getLocale()` into `buildHudQuestState`;
- pass locale into `buildShopBuyEntries` and `buildShopSellEntries`;
- pass locale into `startNpcDialogue`, `chooseDialogueOption`, and `buildQuestCompletionDialogue`;
- use `getShopText(locale, shopId)` in `buildNearbyShop` and `buildOpenShop`;
- use `getItemText(locale, itemId)` in `buildHudInventory`;
- use `getNpcText(locale, nearbyNpc.id)` in nearby NPC status messages;
- use localized fallback speakers and fallback lines for `Traveler`, `Shop`, `Guild Master Arlen`, and `Guild Notice`;
- use localized victory text in `showVictoryState()`.

Do not change the behavior of combat, movement, quest progression, shop rules, or save state.

- [ ] **Step 5.5: Update initial HUD state**

Modify `src/lib/game/ui-bridge/store.ts`:

- import `t` and `getActiveLocale`;
- change initial `status: 'Loading game'` to `t(getActiveLocale(), 'status.loadingGame')`;
- pass `locale: getActiveLocale()` into initial `buildHudQuestState`.

- [ ] **Step 5.6: Run WorldScene tests and verify pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 5.7: Commit Task 5**

Run:

```sh
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/ui-bridge/store.ts
git commit -m "feat: localize world scene hud text"
```

## Task 6: Localize Svelte HUD And Add Language Selector

**Files:**

- Modify: `src/lib/game/GameShell.svelte`
- Modify: `src/lib/game/DialoguePanel.svelte`
- Modify: `src/lib/game/DialoguePanel.svelte.spec.ts`

- [ ] **Step 6.1: Write failing Svelte component tests**

Update or add tests to cover:

- `DialoguePanel` renders localized `Close` and `Next` labels when passed label props or when reading from the locale store;
- `GameShell` Settings includes a language selector with English, Traditional Chinese, and Japanese;
- changing the selector calls `setActiveLocale('ja')`;
- Svelte-owned labels use fallback English when selected locale lacks non-English messages.

Prefer component tests over e2e for this step.

- [ ] **Step 6.2: Run component tests and verify failure**

Run:

```sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
```

Expected: FAIL until labels are localized.

- [ ] **Step 6.3: Localize DialoguePanel**

Modify `src/lib/game/DialoguePanel.svelte`:

- import `locale` from `i18n/store` and `t` from `i18n/translate`;
- replace hard-coded `Close` and `Next` with `t($locale, 'ui.close')` and `t($locale, 'ui.next')`;
- keep keyboard behavior unchanged.

- [ ] **Step 6.4: Localize GameShell labels**

Modify `src/lib/game/GameShell.svelte`:

- import `locale`, `setActiveLocale`, `supportedLocales`, `localeLabels`, and `t`;
- replace visible hard-coded UI chrome with translation lookups;
- keep HP, XP, ATK, and DEF unchanged unless using dictionary keys already added;
- localize helper-generated strings such as stock meta and tooltip prefixes:

```ts
function getShopBuyStockText(item: HudShopBuyEntry): string {
	return item.availability.mode === 'unlimited'
		? t($locale, 'ui.unlimited')
		: t($locale, 'ui.stockLeft', { count: item.availability.remaining });
}
```

- add a compact Settings language selector:

```svelte
<label class="grid gap-2">
	<span>{t($locale, 'ui.language')}</span>
	<select value={$locale} onchange={(event) => setActiveLocale(event.currentTarget.value as Locale)}>
		{#each supportedLocales as option}
			<option value={option}>{localeLabels[option]}</option>
		{/each}
	</select>
</label>
```

Style the selector to match the existing compact settings panel. Do not add a start screen.

- [ ] **Step 6.5: Run the Svelte autofixer**

Use the Svelte MCP `svelte-autofixer` on modified Svelte files if available in this session. Keep calling it until no issues remain.

If the Svelte MCP tool is unavailable, document that in the final implementation report and rely on `bun run check`.

- [ ] **Step 6.6: Run component tests and Svelte check**

Run:

```sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
bun run check
```

If `bun run check` fails due to stale generated types, run:

```sh
bun run gen
bun run check
```

Expected: PASS.

- [ ] **Step 6.7: Commit Task 6**

Run:

```sh
git add src/lib/game/GameShell.svelte src/lib/game/DialoguePanel.svelte src/lib/game/DialoguePanel.svelte.spec.ts
git commit -m "feat: add localized hud language selector"
```

## Task 7: E2E Flow And Full Verification

**Files:**

- Modify: `tests/e2e/game.e2e.ts`
- Optionally modify: related test utilities in `tests/e2e/`

- [ ] **Step 7.1: Add focused e2e language flow**

Modify `tests/e2e/game.e2e.ts` to add one focused flow:

1. Start the game.
2. Open Settings.
3. Select Japanese.
4. Close Settings.
5. Reopen a panel such as Inventory or Quest Log.
6. Assert a visible Svelte chrome label is updated through the locale store or falls back to English because Japanese is intentionally empty.
7. Assert the selector still shows Japanese as the selected value.

Since non-English dictionaries intentionally fall back to English, the visible text assertion can use English text plus selected locale persistence.

- [ ] **Step 7.2: Run e2e test and verify pass**

Run:

```sh
bun run build
bun run test:e2e -- --grep "language"
```

Expected: PASS.

- [ ] **Step 7.3: Run focused unit suite**

Run:

```sh
bun run test:unit -- --run src/lib/game/i18n/locales.test.ts src/lib/game/i18n/preferences.test.ts src/lib/game/i18n/translate.test.ts src/lib/game/i18n/content.test.ts src/lib/game/content/items.test.ts src/lib/game/content/shops.test.ts src/lib/game/content/quests.test.ts src/lib/game/content/dialogue.test.ts src/lib/game/content/maps.test.ts src/lib/game/core/quests.test.ts src/lib/game/core/dialogue.test.ts src/lib/game/core/shop.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/DialoguePanel.svelte.spec.ts
```

Expected: PASS.

- [ ] **Step 7.4: Run full verification**

Run:

```sh
bun run check
bun run test
```

If `bun run check` fails due to stale generated types, run:

```sh
bun run gen
bun run check
bun run test
```

Expected: PASS.

- [ ] **Step 7.5: Commit Task 7**

Run:

```sh
git add tests/e2e/game.e2e.ts
git commit -m "test: cover language preference flow"
```

## Completion Checklist

- [ ] English dictionary contains every current user-visible source string.
- [ ] `zh-Hant` and `ja` dictionaries do not include unreviewed drafted prose.
- [ ] Missing `zh-Hant` and `ja` keys fall back to English.
- [ ] Unsupported browser languages fall back to English.
- [ ] Saved override wins over detected locale.
- [ ] Language preference is separate from `SaveState`.
- [ ] Changing language updates Svelte chrome immediately.
- [ ] Dialogue/shop/quest/status payloads rebuild in selected locale after closing/reopening or after the next HUD publish.
- [ ] Stable IDs in saves and gameplay definitions are unchanged.
- [ ] Svelte autofixer was run if available.
- [ ] `bun run check` passes.
- [ ] `bun run test` passes.

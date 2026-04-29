import { describe, expect, it } from 'vitest';

import { createNewSaveState } from '$lib/game/save/save-state';
import { saveGameState } from '$lib/game/save/storage';

describe('save storage', () => {
	it('writes the serialized save to the provided storage adapter', () => {
		const store = new Map<string, string>();
		const storage = {
			getItem(key: string) {
				return store.get(key) ?? null;
			},
			removeItem(key: string) {
				store.delete(key);
			},
			setItem(key: string, value: string) {
				store.set(key, value);
			}
		};

		saveGameState(createNewSaveState(), storage);

		expect(storage.getItem('gliese.save.v1')).toContain('"mapId":"meadow-entry"');
	});
});

import { describe, expect, it, vi } from 'vitest';

import { createNewSaveState } from '$lib/game/save/save-state';
import { loadStoredSaveResult, saveGameState } from '$lib/game/save/storage';

describe('save storage', () => {
	function createStorage() {
		const store = new Map<string, string>();

		return {
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
	}

	it('writes the serialized save to the provided storage adapter', () => {
		const storage = createStorage();
		const save = createNewSaveState();

		saveGameState(save, storage);

		expect(storage.getItem('gliese.save.v1')).toContain('"mapId":"meadow-entry"');
		expect(storage.getItem('gliese.save.v1')).toContain('"version":2');
		expect(loadStoredSaveResult(storage)).toEqual({ status: 'loaded', saveState: save });
		expect(loadStoredSaveResult(storage).saveState?.inventory.stacks).toEqual([
			{ itemId: 'field-potion', quantity: 1 }
		]);
	});

	it('reports invalid saved payloads separately from missing saves', () => {
		const storage = createStorage();
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		storage.setItem('gliese.save.v1', '{"version":1,"bad":true}');

		expect(loadStoredSaveResult(storage)).toEqual({ status: 'invalid', saveState: null });
		expect(warnSpy).toHaveBeenCalled();
	});
});

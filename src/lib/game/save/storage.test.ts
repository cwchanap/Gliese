import { describe, expect, it, vi } from 'vitest';

import { createNewSaveState } from '$lib/game/save/save-state';
import { loadStoredSaveResult, saveGameState, setSaveStorage } from '$lib/game/save/storage';

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

		expect(storage.getItem('gliese.save.v4')).toContain('"mapId":"meadow-entry"');
		expect(storage.getItem('gliese.save.v4')).toContain('"version":4');
		expect(loadStoredSaveResult(storage)).toEqual({ status: 'loaded', saveState: save });
		expect(loadStoredSaveResult(storage).saveState?.wallet).toEqual({ coins: 30 });
		expect(loadStoredSaveResult(storage).saveState?.inventory.stacks).toEqual([
			{ itemId: 'field-potion', quantity: 1 }
		]);
	});

	it('reports invalid saved payloads separately from missing saves', () => {
		const storage = createStorage();
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		storage.setItem('gliese.save.v4', '{"version":3,"bad":true}');

		expect(loadStoredSaveResult(storage)).toEqual({ status: 'invalid', saveState: null });
		expect(warnSpy).toHaveBeenCalled();
	});

	it('does not read obsolete v3 save slots', () => {
		const storage = createStorage();
		storage.setItem('gliese.save.v3', JSON.stringify(createNewSaveState()));

		expect(loadStoredSaveResult(storage)).toEqual({ status: 'missing', saveState: null });
	});

	it('uses the storage adapter set via setSaveStorage when no explicit storage is passed', () => {
		const storage = createStorage();
		setSaveStorage(storage);
		try {
			const save = createNewSaveState();
			saveGameState(save);

			expect(storage.getItem('gliese.save.v4')).toContain('"version":4');
			expect(loadStoredSaveResult()).toEqual({ status: 'loaded', saveState: save });
		} finally {
			setSaveStorage(globalThis.localStorage);
		}
	});
});

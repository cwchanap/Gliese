import { describe, expect, it, vi } from 'vitest';

import { createNewSaveState } from '$lib/game/save/save-state';
import {
	SAVE_SLOTS_BACKUP_STORAGE_KEY,
	SAVE_SLOTS_STORAGE_KEY,
	getNewestSaveSlot,
	loadSaveSlots,
	writeSaveSlot,
	type SaveSlotRecord
} from '$lib/game/save/slots';
import { setSaveStorage } from '$lib/game/save/storage';

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

function createRecord(
	overrides: Partial<SaveSlotRecord> & { kind?: 'autosave' | 'manual' } = {}
): SaveSlotRecord {
	return {
		kind: overrides.kind ?? 'manual',
		savedAt: overrides.savedAt ?? '2026-09-04T12:00:00.000Z',
		playtimeSeconds: overrides.playtimeSeconds ?? 42,
		thumbnail: overrides.thumbnail,
		state: overrides.state ?? createNewSaveState()
	};
}

describe('save slots', () => {
	it('loads an empty envelope when nothing is stored', () => {
		const storage = createStorage();

		expect(loadSaveSlots(storage)).toEqual({
			version: 1,
			slots: [null, null, null]
		});
	});

	it('writes and loads slot records through the shared envelope key', () => {
		const storage = createStorage();
		const record = createRecord();

		const result = writeSaveSlot(1, record, storage);

		expect(result.thumbnailDropped).toBe(false);
		expect(storage.getItem(SAVE_SLOTS_STORAGE_KEY)).toContain('"version":1');
		expect(loadSaveSlots(storage).slots[1]).toEqual(record);
	});

	it('accepts only autosave records in slot 0', () => {
		const storage = createStorage();

		writeSaveSlot(0, createRecord({ kind: 'autosave' }), storage);
		expect(loadSaveSlots(storage).slots[0]?.kind).toBe('autosave');

		expect(() => writeSaveSlot(0, createRecord({ kind: 'manual' }), storage)).toThrow();
	});

	it('accepts only manual records in slots 1 and 2', () => {
		const storage = createStorage();

		writeSaveSlot(1, createRecord({ kind: 'manual' }), storage);
		writeSaveSlot(2, createRecord({ kind: 'manual' }), storage);
		expect(loadSaveSlots(storage).slots[1]?.kind).toBe('manual');

		expect(() => writeSaveSlot(1, createRecord({ kind: 'autosave' }), storage)).toThrow();
		expect(() => writeSaveSlot(2, createRecord({ kind: 'autosave' }), storage)).toThrow();
	});

	it('returns the newest slot by savedAt', () => {
		const storage = createStorage();
		writeSaveSlot(1, createRecord({ savedAt: '2026-09-01T00:00:00.000Z' }), storage);
		writeSaveSlot(2, createRecord({ savedAt: '2026-09-03T00:00:00.000Z' }), storage);

		expect(getNewestSaveSlot(storage)).toEqual({
			index: 2,
			record: createRecord({ savedAt: '2026-09-03T00:00:00.000Z' })
		});
	});

	it('returns null from getNewestSaveSlot when every slot is empty', () => {
		expect(getNewestSaveSlot(createStorage())).toBeNull();
	});

	it('falls back to an empty envelope and backs up invalid stored payloads', () => {
		const storage = createStorage();
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		storage.setItem(SAVE_SLOTS_STORAGE_KEY, '{"version":4,"bad":true}');

		expect(loadSaveSlots(storage)).toEqual({ version: 1, slots: [null, null, null] });
		expect(storage.getItem(SAVE_SLOTS_BACKUP_STORAGE_KEY)).toBe('{"version":4,"bad":true}');
		expect(warnSpy).toHaveBeenCalled();
	});

	it('migrates the retired single-save key into the autosave slot', () => {
		const storage = createStorage();
		const legacy = { ...createNewSaveState(), mapId: 'guild-hall' };
		storage.setItem('gliese.save.v9', JSON.stringify(legacy));

		const slots = loadSaveSlots(storage);
		expect(slots.slots[0]?.kind).toBe('autosave');
		expect(slots.slots[0]?.state.mapId).toBe('guild-hall');
		expect(storage.getItem('gliese.save.v9')).toBeNull();
		expect(JSON.parse(storage.getItem(SAVE_SLOTS_STORAGE_KEY) ?? 'null').version).toBe(1);
	});

	it('retries without thumbnails when the synchronous write quota fails', () => {
		const storage = createStorage();
		let attempts = 0;
		const failingStorage = {
			getItem: (key: string) => storage.getItem(key),
			removeItem: (key: string) => storage.removeItem(key),
			setItem: (key: string, value: string) => {
				attempts += 1;
				if (attempts === 1) {
					throw new DOMException('quota exceeded', 'QuotaExceededError');
				}
				storage.setItem(key, value);
			}
		};

		const result = writeSaveSlot(
			1,
			createRecord({ thumbnail: 'data:image/jpeg;base64,abc' }),
			failingStorage
		);

		expect(result.thumbnailDropped).toBe(true);
		expect(result.state.slots[1]?.thumbnail).toBeUndefined();
		expect(attempts).toBe(2);
		expect(loadSaveSlots(failingStorage).slots[1]?.thumbnail).toBeUndefined();
	});

	it('rethrows when the thumbnail-free retry also fails', () => {
		const failure = new DOMException('quota exceeded', 'QuotaExceededError');
		const failingStorage = {
			getItem: () => null,
			removeItem: () => {},
			setItem: () => {
				throw failure;
			}
		};

		expect(() =>
			writeSaveSlot(1, createRecord({ thumbnail: 'data:image/jpeg;base64,abc' }), failingStorage)
		).toThrow(failure);
	});

	it('uses the storage adapter set via setSaveStorage when no explicit storage is passed', () => {
		const storage = createStorage();
		setSaveStorage(storage);
		try {
			writeSaveSlot(1, createRecord());

			expect(storage.getItem(SAVE_SLOTS_STORAGE_KEY)).toContain('"version":1');
			expect(getNewestSaveSlot()?.index).toBe(1);
		} finally {
			setSaveStorage(globalThis.localStorage);
		}
	});
});

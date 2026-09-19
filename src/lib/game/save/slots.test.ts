import { describe, expect, it } from 'vitest';

import { createNewSaveState } from './save-state';
import {
	SAVE_SLOTS_STORAGE_KEY,
	createEmptySaveSlots,
	getNewestSaveSlot,
	loadSaveSlots,
	type SaveSlotRecord,
	writeSaveSlot
} from './slots';
import { setSaveStorage, type SaveStorage } from './storage';

function memoryStorage(initial: Record<string, string> = {}): SaveStorage {
	const values = new Map(Object.entries(initial));
	return {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
		removeItem: (key) => values.delete(key)
	};
}

function record(savedAt: string, locationLabel = 'Sundrop Meadows'): SaveSlotRecord {
	return {
		kind: 'manual',
		savedAt,
		playtimeSeconds: 10,
		locationLabel,
		state: createNewSaveState()
	};
}

describe('save slots', () => {
	it('returns an empty envelope with no storage', () => {
		setSaveStorage(undefined);
		expect(loadSaveSlots()).toEqual(createEmptySaveSlots());
		expect(getNewestSaveSlot()).toBeNull();
	});

	it('returns the newest valid slot regardless of slot order', () => {
		const storage = memoryStorage();
		setSaveStorage(storage);
		writeSaveSlot(1, record('2026-09-01T10:00:00.000Z'), storage);
		writeSaveSlot(2, record('2026-09-04T12:00:00.000Z'), storage);

		expect(getNewestSaveSlot(storage)?.index).toBe(2);
	});

	it('ignores slots with an unparseable savedAt instead of letting NaN win', () => {
		const storage = memoryStorage();
		setSaveStorage(storage);
		// Corrupt earlier slot: Date.parse yields NaN, and with a naive
		// comparison an earlier NaN slot would beat every later valid one.
		writeSaveSlot(1, record('not-a-timestamp', 'Corrupted Meadow'), storage);
		writeSaveSlot(2, record('2026-09-04T12:00:00.000Z'), storage);

		const newest = getNewestSaveSlot(storage);
		expect(newest?.index).toBe(2);
		expect(newest?.record.locationLabel).toBe('Sundrop Meadows');

		// The invalid record is dropped at envelope validation, like any other
		// malformed record.
		const slots = loadSaveSlots(storage);
		expect(slots.slots[1]).toBeNull();
		expect(slots.slots[2]).not.toBeNull();
	});

	it('falls back to a lone valid slot when the others are invalid', () => {
		const encoded = JSON.stringify({
			version: 1,
			slots: [null, { garbage: true }, record('2026-09-02T08:00:00.000Z')]
		});
		const storage = memoryStorage({ [SAVE_SLOTS_STORAGE_KEY]: encoded });
		setSaveStorage(storage);

		expect(getNewestSaveSlot(storage)?.index).toBe(2);
	});

	it('preserves an invalid sibling slot payload when writing another slot', () => {
		const invalidSlot = { kind: 'manual', savedAt: 'not-a-timestamp', state: { keep: 'me' } };
		const storage = memoryStorage({
			[SAVE_SLOTS_STORAGE_KEY]: JSON.stringify({
				version: 1,
				slots: [null, invalidSlot, null]
			})
		});
		setSaveStorage(storage);

		writeSaveSlot(2, record('2026-09-04T12:00:00.000Z'), storage);

		const stored = JSON.parse(storage.getItem(SAVE_SLOTS_STORAGE_KEY) ?? 'null');
		expect(stored.slots[1]).toEqual(invalidSlot);
		expect(loadSaveSlots(storage).slots[1]).toBeNull();
	});
});

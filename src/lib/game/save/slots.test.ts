import { describe, expect, it, vi } from 'vitest';

import { createNewSaveState, parseSaveState } from './save-state';
import {
	SAVE_SLOTS_BACKUP_STORAGE_KEY,
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

function record(savedAt: string): SaveSlotRecord {
	return {
		kind: 'manual',
		savedAt,
		playtimeSeconds: 10,
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
		writeSaveSlot(1, record('not-a-timestamp'), storage);
		writeSaveSlot(2, record('2026-09-04T12:00:00.000Z'), storage);

		const newest = getNewestSaveSlot(storage);
		expect(newest?.index).toBe(2);
		expect(newest?.record.savedAt).toBe('2026-09-04T12:00:00.000Z');

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

	it('loads the normalized save state, not the raw payload (position fixes apply)', () => {
		const raw = {
			...createNewSaveState(),
			player: { ...createNewSaveState().player, x: -500, y: -500 }
		};
		const storage = memoryStorage({
			[SAVE_SLOTS_STORAGE_KEY]: JSON.stringify({
				version: 1,
				slots: [
					{
						kind: 'autosave',
						savedAt: '2026-09-01T10:00:00.000Z',
						playtimeSeconds: 3,
						state: raw
					},
					null,
					null
				]
			})
		});
		setSaveStorage(storage);

		const expected = parseSaveState(JSON.stringify(raw));
		expect(expected).not.toBeNull();
		expect(expected?.player.x).not.toBe(-500);

		const loaded = loadSaveSlots(storage).slots[0];
		expect(loaded?.state).toEqual(expected);
	});

	it('upgrades older-format saves stored inside a slot', () => {
		const v8Save = {
			...createNewSaveState(),
			version: 8,
			shops: {
				stock: {
					'guild-quartermaster': {
						'iron-cap': 1,
						'grip-wraps': 1,
						'traveler-vest': 1
					}
				}
			}
		};
		const storage = memoryStorage({
			[SAVE_SLOTS_STORAGE_KEY]: JSON.stringify({
				version: 1,
				slots: [
					{
						kind: 'autosave',
						savedAt: '2026-09-01T10:00:00.000Z',
						playtimeSeconds: 3,
						state: v8Save
					},
					null,
					null
				]
			})
		});
		setSaveStorage(storage);

		const loaded = loadSaveSlots(storage).slots[0];
		expect(loaded?.state.version).toBe(9);
		expect(loaded?.state.shops.stock['sundrop-forge']).toBeDefined();
	});

	it('migrates a pre-slots bare SaveState stored under the slots key into slot 0', () => {
		// Pre-slots desktop builds wrote a bare serialized SaveState to the same
		// gliese-save.json file the envelope now uses.
		const legacy = { ...createNewSaveState(), mapId: 'guild-hall' };
		const storage = memoryStorage({
			[SAVE_SLOTS_STORAGE_KEY]: JSON.stringify(legacy)
		});
		setSaveStorage(storage);

		const slots = loadSaveSlots(storage);
		expect(slots.slots[0]?.kind).toBe('autosave');
		expect(slots.slots[0]?.state.mapId).toBe('guild-hall');
		expect(slots.slots[1]).toBeNull();

		// Write-through: the envelope replaces the bare payload so the next
		// load does not re-migrate (and the next autosave can't erase it).
		const persisted = JSON.parse(storage.getItem(SAVE_SLOTS_STORAGE_KEY) ?? 'null');
		expect(persisted.version).toBe(1);
		expect(persisted.slots[0].state.mapId).toBe('guild-hall');
	});

	it('migrates the legacy gliese.save.v9 key into slot 0 and removes it', () => {
		const legacy = { ...createNewSaveState(), wallet: { coins: 123 } };
		const storage = memoryStorage({ 'gliese.save.v9': JSON.stringify(legacy) });
		setSaveStorage(storage);

		const slots = loadSaveSlots(storage);
		expect(slots.slots[0]?.kind).toBe('autosave');
		expect(slots.slots[0]?.state.wallet.coins).toBe(123);
		expect(storage.getItem('gliese.save.v9')).toBeNull();
		expect(JSON.parse(storage.getItem(SAVE_SLOTS_STORAGE_KEY) ?? 'null').version).toBe(1);
	});

	it('falls back to the gliese.save.v8 key when v9 is absent', () => {
		const legacy = { ...createNewSaveState(), wallet: { coins: 77 } };
		const storage = memoryStorage({ 'gliese.save.v8': JSON.stringify(legacy) });
		setSaveStorage(storage);

		expect(loadSaveSlots(storage).slots[0]?.state.wallet.coins).toBe(77);
		expect(storage.getItem('gliese.save.v8')).toBeNull();
	});

	it('backs up unrecognizable payloads instead of silently overwriting them', () => {
		const storage = memoryStorage({ [SAVE_SLOTS_STORAGE_KEY]: '{"not":"a save"}' });
		setSaveStorage(storage);

		expect(loadSaveSlots(storage).slots).toEqual([null, null, null]);
		expect(storage.getItem(SAVE_SLOTS_BACKUP_STORAGE_KEY)).toBe('{"not":"a save"}');
	});

	it('keeps a per-source backup for every unrecognized payload', () => {
		const legacy = { ...createNewSaveState(), wallet: { coins: 77 } };
		const storage = memoryStorage({
			[SAVE_SLOTS_STORAGE_KEY]: '{"envelope":"corrupt"}',
			'gliese.save.v9': '{"v9":"corrupt"}',
			'gliese.save.v8': JSON.stringify(legacy)
		});
		setSaveStorage(storage);

		expect(loadSaveSlots(storage).slots[0]?.state.wallet.coins).toBe(77);
		// Each source keeps its own forensic copy — the v9 payload must not
		// clobber the envelope's backup.
		expect(storage.getItem(SAVE_SLOTS_BACKUP_STORAGE_KEY)).toBe('{"envelope":"corrupt"}');
		expect(storage.getItem('gliese.save.v9.backup')).toBe('{"v9":"corrupt"}');
		expect(storage.getItem('gliese.save.v9')).toBeNull();
		expect(storage.getItem('gliese.save.v8')).toBeNull();
	});

	it('leaves the legacy key in place when its backup cannot be written', () => {
		const base = memoryStorage({ 'gliese.save.v9': '{"v9":"corrupt"}' });
		const storage: SaveStorage = {
			getItem: (key) => base.getItem(key),
			setItem: (key, value) => {
				if (key === 'gliese.save.v9.backup') throw new Error('quota');
				base.setItem(key, value);
			},
			removeItem: (key) => base.removeItem(key)
		};
		setSaveStorage(storage);

		expect(loadSaveSlots(storage).slots).toEqual([null, null, null]);
		expect(storage.getItem('gliese.save.v9')).toBe('{"v9":"corrupt"}');
	});

	it('does not overwrite an unrecognized envelope when its backup fails', () => {
		const base = memoryStorage({
			[SAVE_SLOTS_STORAGE_KEY]: '{"envelope":"corrupt"}',
			'gliese.save.v9': JSON.stringify(createNewSaveState())
		});
		const storage: SaveStorage = {
			getItem: (key) => base.getItem(key),
			setItem: (key, value) => {
				if (key === SAVE_SLOTS_BACKUP_STORAGE_KEY) throw new Error('quota');
				base.setItem(key, value);
			},
			removeItem: (key) => base.removeItem(key)
		};
		setSaveStorage(storage);

		expect(loadSaveSlots(storage).slots).toEqual([null, null, null]);
		// Migration was skipped rather than destroying the unbacked payload.
		expect(storage.getItem(SAVE_SLOTS_STORAGE_KEY)).toBe('{"envelope":"corrupt"}');
	});

	it('does not resurrect legacy keys over a valid empty envelope', () => {
		const storage = memoryStorage({
			[SAVE_SLOTS_STORAGE_KEY]: JSON.stringify({ version: 1, slots: [null, null, null] }),
			'gliese.save.v9': JSON.stringify(createNewSaveState())
		});
		setSaveStorage(storage);

		expect(loadSaveSlots(storage).slots).toEqual([null, null, null]);
	});

	it('serves repeated loads from the parsed envelope without re-validating slots', () => {
		const storage = memoryStorage({
			[SAVE_SLOTS_STORAGE_KEY]: JSON.stringify({
				version: 1,
				slots: [{ ...record('2026-09-01T10:00:00.000Z'), kind: 'autosave' }, null, null]
			})
		});
		setSaveStorage(storage);

		loadSaveSlots(storage); // first load parses and validates
		const parseSpy = vi.spyOn(JSON, 'parse');
		try {
			loadSaveSlots(storage);
			expect(parseSpy).not.toHaveBeenCalled();
		} finally {
			parseSpy.mockRestore();
		}
	});

	it('does not re-parse the envelope on consecutive writes', () => {
		const storage = memoryStorage();
		setSaveStorage(storage);
		writeSaveSlot(1, record('2026-09-01T10:00:00.000Z'), storage);

		const parseSpy = vi.spyOn(JSON, 'parse');
		try {
			writeSaveSlot(2, record('2026-09-04T12:00:00.000Z'), storage);
			expect(parseSpy).not.toHaveBeenCalled();
		} finally {
			parseSpy.mockRestore();
		}
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

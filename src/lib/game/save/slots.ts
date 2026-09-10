import { parseSaveState, type SaveState } from '$lib/game/save/save-state';
import { getSaveStorage, type SaveStorage } from '$lib/game/save/storage';

export const SAVE_SLOTS_STORAGE_KEY = 'gliese.saves.v1';

export type SaveSlotIndex = 0 | 1 | 2;

export type SaveSlotRecord = {
	kind: 'autosave' | 'manual';
	savedAt: string;
	playtimeSeconds: number;
	locationLabel: string;
	thumbnail?: string;
	state: SaveState;
};

export type SaveSlotsState = {
	version: 1;
	slots: [SaveSlotRecord | null, SaveSlotRecord | null, SaveSlotRecord | null];
};

export type SaveSlotWriteResult = {
	state: SaveSlotsState;
	thumbnailDropped: boolean;
};

const SLOT_KINDS: Record<SaveSlotIndex, 'autosave' | 'manual'> = {
	0: 'autosave',
	1: 'manual',
	2: 'manual'
};

export function createEmptySaveSlots(): SaveSlotsState {
	return { version: 1, slots: [null, null, null] };
}

function isSaveSlotRecord(value: unknown, index: number): value is SaveSlotRecord {
	if (typeof value !== 'object' || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		record.kind === SLOT_KINDS[index as SaveSlotIndex] &&
		typeof record.savedAt === 'string' &&
		typeof record.playtimeSeconds === 'number' &&
		typeof record.locationLabel === 'string' &&
		(record.thumbnail === undefined || typeof record.thumbnail === 'string') &&
		typeof record.state === 'object' &&
		record.state !== null &&
		parseSaveState(JSON.stringify(record.state)) !== null
	);
}

function parseSaveSlots(encoded: string | null): SaveSlotsState {
	if (!encoded) return createEmptySaveSlots();

	let parsed: unknown;
	try {
		parsed = JSON.parse(encoded);
	} catch {
		parsed = null;
	}

	const candidate = parsed as { version?: unknown; slots?: unknown } | null;
	if (
		typeof candidate !== 'object' ||
		candidate === null ||
		candidate.version !== 1 ||
		!Array.isArray(candidate.slots) ||
		candidate.slots.length !== 3
	) {
		if (import.meta.env?.DEV) {
			console.warn(`Invalid save slot envelope found in ${SAVE_SLOTS_STORAGE_KEY}; ignoring it.`);
		}
		return createEmptySaveSlots();
	}

	const state: SaveSlotsState = {
		version: 1,
		slots: [null, null, null]
	};
	for (let index = 0; index < 3; index += 1) {
		const slot = candidate.slots[index];
		if (slot !== null && isSaveSlotRecord(slot, index)) {
			state.slots[index as SaveSlotIndex] = slot;
		}
	}
	return state;
}

export function loadSaveSlots(storage?: SaveStorage): SaveSlotsState {
	const resolved = storage ?? getSaveStorage();
	return parseSaveSlots(resolved?.getItem(SAVE_SLOTS_STORAGE_KEY) ?? null);
}

export function getNewestSaveSlot(
	storage?: SaveStorage
): { index: SaveSlotIndex; record: SaveSlotRecord } | null {
	const slots = loadSaveSlots(storage);
	let newest: { index: SaveSlotIndex; record: SaveSlotRecord } | null = null;

	for (let index = 0; index < 3; index += 1) {
		const record = slots.slots[index];
		if (!record) continue;
		if (!newest || Date.parse(record.savedAt) > Date.parse(newest.record.savedAt)) {
			newest = { index: index as SaveSlotIndex, record };
		}
	}

	return newest;
}

export function writeSaveSlot(
	index: SaveSlotIndex,
	record: SaveSlotRecord,
	storage?: SaveStorage
): SaveSlotWriteResult {
	if (record.kind !== SLOT_KINDS[index]) {
		throw new Error(`Slot ${index} accepts only "${SLOT_KINDS[index]}" records.`);
	}

	const resolved = storage ?? getSaveStorage();
	if (!resolved) return { state: createEmptySaveSlots(), thumbnailDropped: false };

	const state = loadSaveSlots(resolved);
	state.slots[index] = record;
	const encoded = JSON.stringify(state);

	try {
		resolved.setItem(SAVE_SLOTS_STORAGE_KEY, encoded);
		return { state, thumbnailDropped: false };
	} catch {
		// Quota pressure: drop every thumbnail (the bulk of the payload) and retry once.
		const stripped: SaveSlotsState = {
			version: 1,
			slots: state.slots.map((slot) =>
				slot ? { ...slot, thumbnail: undefined } : null
			) as SaveSlotsState['slots']
		};

		resolved.setItem(SAVE_SLOTS_STORAGE_KEY, JSON.stringify(stripped));
		return { state: stripped, thumbnailDropped: true };
	}
}

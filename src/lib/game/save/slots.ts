import { parseSaveState, type SaveState } from '$lib/game/save/save-state';
import { getSaveStorage, type SaveStorage } from '$lib/game/save/storage';
import { boundSaveThumbnail } from '$lib/game/save/thumbnail';

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
		// getNewestSaveSlot orders by Date.parse; an unparseable savedAt yields
		// NaN and an earlier NaN slot would beat every later valid one (so
		// Continue could resume a stale slot). Reject the record at the envelope.
		!Number.isNaN(Date.parse(record.savedAt)) &&
		typeof record.playtimeSeconds === 'number' &&
		typeof record.locationLabel === 'string' &&
		(record.thumbnail === undefined || typeof record.thumbnail === 'string') &&
		typeof record.state === 'object' &&
		record.state !== null &&
		parseSaveState(JSON.stringify(record.state)) !== null
	);
}

/**
 * Decodes the stored envelope, discarding malformed payloads and invalid
 * slot records; accepted thumbnails are normalized through boundSaveThumbnail.
 * @param encoded - The raw `gliese.saves.v1` document, or `null` when absent.
 * @returns SaveSlotsState — the validated slot state or an empty one.
 */
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
			state.slots[index as SaveSlotIndex] = {
				...slot,
				thumbnail: boundSaveThumbnail(slot.thumbnail)
			};
		}
	}
	return state;
}

export function loadSaveSlots(storage?: SaveStorage): SaveSlotsState {
	const resolved = storage ?? getSaveStorage();
	try {
		return parseSaveSlots(resolved?.getItem(SAVE_SLOTS_STORAGE_KEY) ?? null);
	} catch {
		return createEmptySaveSlots();
	}
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

/**
 * Writes a record into a slot and persists the envelope. On quota pressure
 * it retries once with every thumbnail stripped.
 * @param index - Slot index; slot 0 accepts only autosave records, 1–2 manual.
 * @param record - The SaveSlotRecord to store.
 * @param storage - The SaveStorage to write to, or `undefined` to use the
 *   wired save storage adapter.
 * @returns SaveSlotWriteResult — the resulting slot state plus whether
 *   thumbnails were dropped to fit.
 */
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

	// Siblings that fail validation read as null but keep their raw payload in
	// the stored envelope, so saving one slot cannot erase another's data.
	const persisted: { version: 1; slots: unknown[] } = {
		version: 1,
		slots: readRawSlots(resolved) ?? [null, null, null]
	};
	persisted.slots[index] = record;

	try {
		resolved.setItem(SAVE_SLOTS_STORAGE_KEY, JSON.stringify(persisted));
		return { state, thumbnailDropped: false };
	} catch {
		// Quota pressure: drop every thumbnail (the bulk of the payload) and retry once.
		const strippedPersisted = {
			version: 1 as const,
			slots: persisted.slots.map(stripRawThumbnail)
		};
		resolved.setItem(SAVE_SLOTS_STORAGE_KEY, JSON.stringify(strippedPersisted));

		const stripped: SaveSlotsState = {
			version: 1,
			slots: state.slots.map((slot) =>
				slot ? { ...slot, thumbnail: undefined } : null
			) as SaveSlotsState['slots']
		};
		return { state: stripped, thumbnailDropped: true };
	}
}

/**
 * Returns the stored envelope's slot entries verbatim, or null when the
 * stored payload is missing or not a structurally valid v1 envelope.
 */
function readRawSlots(storage: SaveStorage): unknown[] | null {
	let encoded: string | null;
	try {
		encoded = storage.getItem(SAVE_SLOTS_STORAGE_KEY);
	} catch {
		return null;
	}
	if (!encoded) return null;

	try {
		const parsed = JSON.parse(encoded) as { version?: unknown; slots?: unknown } | null;
		if (parsed?.version === 1 && Array.isArray(parsed.slots) && parsed.slots.length === 3) {
			return parsed.slots;
		}
	} catch {
		// fall through
	}
	return null;
}

function stripRawThumbnail(slot: unknown): unknown {
	if (typeof slot !== 'object' || slot === null) return slot;
	return { ...(slot as Record<string, unknown>), thumbnail: undefined };
}

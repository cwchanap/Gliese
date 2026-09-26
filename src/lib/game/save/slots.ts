import { parseSaveState, type SaveState } from '$lib/game/save/save-state';
import { getSaveStorage, type SaveStorage } from '$lib/game/save/storage';
import { boundSaveThumbnail } from '$lib/game/save/thumbnail';

export const SAVE_SLOTS_STORAGE_KEY = 'gliese.saves.v1';

/**
 * Payloads that match neither the slot envelope nor a legacy bare SaveState
 * are copied under `<sourceKey>.backup` before their storage slot can be
 * overwritten, so corrupt data is never silently destroyed. The envelope's
 * own backup key is exported for the Tauri file-routing table.
 */
export const SAVE_SLOTS_BACKUP_STORAGE_KEY = 'gliese.saves.v1.backup';

function backupStorageKeyFor(sourceKey: string): string {
	return `${sourceKey}.backup`;
}

/**
 * Pre-slots browser builds stored a bare serialized SaveState under these
 * keys; pre-slots desktop builds wrote it into the same gliese-save.json file
 * the envelope now occupies (which reads back as the `gliese.saves.v1` value).
 */
const LEGACY_SAVE_STORAGE_KEYS = ['gliese.save.v9', 'gliese.save.v8'] as const;

export type SaveSlotIndex = 0 | 1 | 2;

export type SaveSlotRecord = {
	kind: 'autosave' | 'manual';
	savedAt: string;
	playtimeSeconds: number;
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

function parseSlotRecord(value: unknown, index: number): SaveSlotRecord | null {
	if (typeof value !== 'object' || value === null) return null;
	const record = value as Record<string, unknown>;
	if (
		record.kind !== SLOT_KINDS[index as SaveSlotIndex] ||
		typeof record.savedAt !== 'string' ||
		// getNewestSaveSlot orders by Date.parse; an unparseable savedAt yields
		// NaN and an earlier NaN slot would beat every later valid one (so
		// Continue could resume a stale slot). Reject the record at the envelope.
		Number.isNaN(Date.parse(record.savedAt)) ||
		typeof record.playtimeSeconds !== 'number' ||
		(record.thumbnail !== undefined && typeof record.thumbnail !== 'string') ||
		typeof record.state !== 'object' ||
		record.state === null
	) {
		return null;
	}

	// Keep the parsed state — not the raw payload — so schema migrations and
	// player-position normalization apply to the loaded slot.
	const state = parseSaveState(JSON.stringify(record.state));
	if (!state) return null;

	return {
		kind: SLOT_KINDS[index as SaveSlotIndex],
		savedAt: record.savedAt,
		playtimeSeconds: record.playtimeSeconds,
		thumbnail: boundSaveThumbnail(record.thumbnail as string | undefined),
		state
	};
}

// The field-level checks parseSlotRecord applies to a stored payload, minus
// the embedded-state JSON round-trip — writeSaveSlot's own record already
// holds a SaveState, not an untrusted blob.
function isWellFormedSlotRecord(record: SaveSlotRecord, index: number): boolean {
	return (
		record.kind === SLOT_KINDS[index as SaveSlotIndex] &&
		typeof record.savedAt === 'string' &&
		!Number.isNaN(Date.parse(record.savedAt)) &&
		typeof record.playtimeSeconds === 'number' &&
		(record.thumbnail === undefined || typeof record.thumbnail === 'string')
	);
}

function isSlotEnvelopeShape(candidate: unknown): candidate is { version: 1; slots: unknown[] } {
	const envelope = candidate as { version?: unknown; slots?: unknown } | null;
	return (
		typeof envelope === 'object' &&
		envelope !== null &&
		envelope.version === 1 &&
		Array.isArray(envelope.slots) &&
		envelope.slots.length === 3
	);
}

type CachedEnvelope = {
	encoded: string;
	raw: unknown[] | null;
	state: SaveSlotsState;
};

// loadSaveSlots validates every slot's embedded SaveState (a JSON round-trip
// each), so the parsed envelope is cached per storage adapter, keyed on the
// raw string — cheap enough that autosaves on the game loop don't re-validate
// sibling slots they aren't touching. Writes refresh the entry, so a
// back-to-back write doesn't even re-parse its own output.
const envelopeCache = new WeakMap<SaveStorage, CachedEnvelope>();

function cachedEnvelope(resolved: SaveStorage, encoded: string | null): CachedEnvelope | null {
	if (encoded === null) return null;
	const cached = envelopeCache.get(resolved);
	if (cached?.encoded === encoded) return cached;

	// One parse produces both the validated view and the raw slot entries —
	// callers previously JSON.parse'd the document twice for the two views.
	let parsed: unknown;
	try {
		parsed = JSON.parse(encoded);
	} catch {
		return null;
	}
	if (!isSlotEnvelopeShape(parsed)) return null;

	const state: SaveSlotsState = {
		version: 1,
		slots: [null, null, null]
	};
	for (let index = 0; index < 3; index += 1) {
		state.slots[index as SaveSlotIndex] = parseSlotRecord(parsed.slots[index], index);
	}
	const entry: CachedEnvelope = { encoded, raw: parsed.slots, state };
	envelopeCache.set(resolved, entry);
	return entry;
}

export function loadSaveSlots(storage?: SaveStorage): SaveSlotsState {
	const resolved = storage ?? getSaveStorage();
	if (!resolved) return createEmptySaveSlots();
	try {
		const encoded = resolved.getItem(SAVE_SLOTS_STORAGE_KEY) ?? null;

		const cached = cachedEnvelope(resolved, encoded);
		// A structurally valid envelope is authoritative even when empty —
		// never resurrect migrated legacy data over it.
		if (cached) {
			unreadableEnvelopes.delete(resolved);
			return cached.state;
		}

		if (encoded === null) {
			// Browser-era legacy keys may still hold a pre-slots save.
			return migrateLegacyKeys(resolved) ?? createEmptySaveSlots();
		}

		// Not a v1 envelope. Pre-slots desktop builds wrote a bare SaveState
		// into the same gliese-save.json file; recover it into the autosave
		// slot before the next write would erase it.
		const legacyState = parseSaveState(encoded);
		if (legacyState) {
			return persistMigratedSlots(resolved, legacyState) ?? createEmptySaveSlots();
		}
		// Migration rewrites this key — without a secured backup the payload
		// would be destroyed, so bail out and retry on the next load.
		if (!backupUnrecognizedPayload(resolved, SAVE_SLOTS_STORAGE_KEY, encoded)) {
			markUnreadable(resolved);
			return createEmptySaveSlots();
		}
		return migrateLegacyKeys(resolved) ?? createEmptySaveSlots();
	} catch {
		// Storage read failed outright: report empty slots, but block writes so
		// the next save cannot destroy whatever is actually stored.
		markUnreadable(resolved);
		return createEmptySaveSlots();
	}
}

// Adapters whose stored payload could not be safely read or migrated. While
// flagged, loadSaveSlots still reports empty slots (Continue / New Run stay
// usable) but writeSaveSlot refuses to persist, so the next envelope write
// cannot destroy data the backup step failed to secure. The flag clears via
// discardUnreadableSaveSlots once the player confirms the destructive write.
const unreadableEnvelopes = new WeakSet<SaveStorage>();

// Adapters whose player consented to saving over an unreadable payload:
// consent lasts for the session, so re-validating loads stop re-arming the
// block after discardUnreadableSaveSlots cleared it.
const discardedUnreadable = new WeakSet<SaveStorage>();

function markUnreadable(resolved: SaveStorage): void {
	if (discardedUnreadable.has(resolved)) return;
	unreadableEnvelopes.add(resolved);
}

/** Whether the adapter's save payload is unreadable and writes are blocked. */
export function saveSlotsUnreadable(storage?: SaveStorage): boolean {
	const resolved = storage ?? getSaveStorage();
	return resolved !== undefined && unreadableEnvelopes.has(resolved);
}

/**
 * Player-consented discard: one last best-effort forensic backup, then
 * unblock writes. Called from the New Run overwrite confirmation.
 */
export function discardUnreadableSaveSlots(storage?: SaveStorage): void {
	const resolved = storage ?? getSaveStorage();
	if (!resolved) return;
	try {
		const encoded = resolved.getItem(SAVE_SLOTS_STORAGE_KEY);
		if (encoded !== null) {
			backupUnrecognizedPayload(resolved, SAVE_SLOTS_STORAGE_KEY, encoded);
		}
	} catch {
		// Storage is unreachable — nothing left to preserve.
	}
	discardedUnreadable.add(resolved);
	unreadableEnvelopes.delete(resolved);
}

function migrateLegacyKeys(resolved: SaveStorage): SaveSlotsState | null {
	for (const key of LEGACY_SAVE_STORAGE_KEYS) {
		let payload: string | null;
		try {
			payload = resolved.getItem(key);
		} catch {
			continue;
		}
		if (payload === null) continue;

		const state = parseSaveState(payload);
		if (!state) {
			// Only drop the unreadable payload once its backup is secured.
			if (backupUnrecognizedPayload(resolved, key, payload)) {
				removeLegacyKey(resolved, key);
			}
			continue;
		}

		const migrated = persistMigratedSlots(resolved, state);
		if (!migrated) return null;
		for (const legacyKey of LEGACY_SAVE_STORAGE_KEYS) {
			let leftover: string | null;
			try {
				leftover = resolved.getItem(legacyKey);
			} catch {
				continue;
			}
			if (leftover === null) continue;
			// A parseable leftover is intentionally superseded by the migrated
			// slot; an unreadable one is removed only once backed up.
			if (
				legacyKey !== key &&
				!parseSaveState(leftover) &&
				!backupUnrecognizedPayload(resolved, legacyKey, leftover)
			) {
				continue;
			}
			removeLegacyKey(resolved, legacyKey);
		}
		return migrated;
	}
	return null;
}

function persistMigratedSlots(resolved: SaveStorage, state: SaveState): SaveSlotsState | null {
	const migrated: SaveSlotsState = {
		version: 1,
		slots: [
			{
				kind: 'autosave',
				savedAt: new Date().toISOString(),
				playtimeSeconds: 0,
				state
			},
			null,
			null
		]
	};
	try {
		resolved.setItem(SAVE_SLOTS_STORAGE_KEY, JSON.stringify(migrated));
	} catch {
		// The payload being migrated away is still at risk of the next write —
		// block writes until the player confirms a discard.
		markUnreadable(resolved);
		return null;
	}
	return migrated;
}

function removeLegacyKey(resolved: SaveStorage, key: string): void {
	try {
		resolved.removeItem(key);
	} catch {
		// Best-effort cleanup only.
	}
}

// Returns true once the payload is secured under its per-source backup key —
// callers must not destroy the original until then.
function backupUnrecognizedPayload(
	resolved: SaveStorage,
	sourceKey: string,
	payload: string
): boolean {
	try {
		const backupKey = backupStorageKeyFor(sourceKey);
		if (resolved.getItem(backupKey) !== payload) {
			resolved.setItem(backupKey, payload);
			if (import.meta.env?.DEV) {
				console.warn(`Unrecognized save payload backed up under ${backupKey}.`);
			}
		}
		return true;
	} catch {
		// Forensic copy only — never block loading on it.
		return false;
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
 * @throws when the record kind does not match the slot, no storage adapter
 *   is wired, or the stored envelope is unreadable and a discard was not
 *   confirmed — never report success without persisting.
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
	if (!resolved) {
		throw new Error('No save storage adapter is wired; the slot was not saved.');
	}
	if (unreadableEnvelopes.has(resolved)) {
		throw new Error(
			'The stored save envelope is unreadable; confirm a discard before saving over it.'
		);
	}

	// Normalize once so the in-memory slot and the persisted payload carry the
	// same bounded thumbnail a reload through parseSaveSlots would produce.
	const normalized: SaveSlotRecord = {
		...record,
		thumbnail: boundSaveThumbnail(record.thumbnail)
	};

	// Reuse the cached envelope when the stored payload is unchanged — an
	// autosave on the game loop shouldn't re-validate the slots it isn't
	// touching. On a miss (first write, external change) fall back to the
	// full load, which also runs legacy migration as needed.
	let encoded: string | null;
	try {
		encoded = resolved.getItem(SAVE_SLOTS_STORAGE_KEY);
	} catch {
		encoded = null;
	}
	const cached = cachedEnvelope(resolved, encoded);
	let state: SaveSlotsState;
	if (cached) {
		state = { version: 1, slots: [...cached.state.slots] };
	} else {
		state = loadSaveSlots(resolved);
		// loadSaveSlots flags adapters it could not read safely — never write
		// over a payload whose forensic backup failed (review: critical).
		if (unreadableEnvelopes.has(resolved)) {
			throw new Error(
				'The stored save envelope is unreadable; confirm a discard before saving over it.'
			);
		}
	}
	// The record-level fields still need the same checks a reload applies —
	// the returned/cached state must read like a fresh load (invalid records
	// become null while their raw payload stays in the envelope). The state
	// is trusted: it's already a SaveState, unlike untrusted stored payloads.
	const previousSlot = state.slots[index];
	state.slots[index] = isWellFormedSlotRecord(normalized, index) ? normalized : null;

	const rawSlots = cached?.raw ?? readRawSlots(resolved);

	// Siblings that fail validation read as null but keep their raw payload in
	// the stored envelope, so saving one slot cannot erase another's data. The
	// slot being written is the one exception: if it holds data that failed
	// validation, keep a forensic copy first — but never clobber an existing
	// envelope-level backup (review: invalid slot shown as empty).
	const replaced = rawSlots?.[index];
	if (replaced !== null && replaced !== undefined && previousSlot === null) {
		try {
			if (resolved.getItem(SAVE_SLOTS_BACKUP_STORAGE_KEY) === null) {
				resolved.setItem(SAVE_SLOTS_BACKUP_STORAGE_KEY, JSON.stringify(replaced));
			}
		} catch {
			// Forensic copy only — never block the player's save on it.
		}
	}

	const persisted: { version: 1; slots: unknown[] } = {
		version: 1,
		slots: [...(rawSlots ?? [null, null, null])]
	};
	persisted.slots[index] = normalized;

	try {
		const serialized = JSON.stringify(persisted);
		resolved.setItem(SAVE_SLOTS_STORAGE_KEY, serialized);
		envelopeCache.set(resolved, { encoded: serialized, raw: persisted.slots, state });
		return { state, thumbnailDropped: false };
	} catch {
		// Quota pressure: drop every thumbnail (the bulk of the payload) and retry once.
		const strippedPersisted = {
			version: 1 as const,
			slots: persisted.slots.map(stripRawThumbnail)
		};
		const strippedSerialized = JSON.stringify(strippedPersisted);
		resolved.setItem(SAVE_SLOTS_STORAGE_KEY, strippedSerialized);

		const stripped: SaveSlotsState = {
			version: 1,
			slots: state.slots.map((slot) =>
				slot ? { ...slot, thumbnail: undefined } : null
			) as SaveSlotsState['slots']
		};
		envelopeCache.set(resolved, {
			encoded: strippedSerialized,
			raw: strippedPersisted.slots,
			state: stripped
		});
		return { state: stripped, thumbnailDropped: true };
	}
}

/**
 * Returns the stored envelope's slot entries verbatim, or null when the
 * stored payload is missing or not a structurally valid v1 envelope.
 * @param storage - The SaveStorage adapter holding the `gliese.saves.v1` envelope.
 * @returns unknown[] | null — the raw slot entries, or `null` when absent
 *   or invalid.
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

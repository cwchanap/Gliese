import {
	applyVisualOwnership,
	type MapBackgroundOwnershipSource,
	type VisualOwnershipAssignment
} from '$lib/game/content/maps/background-ownership';
import type { MapBlocker } from '$lib/game/content/maps/types';

import {
	SUNDROP_VILLAGE_BASE_BACKGROUND_ID,
	SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID
} from './sundrop-village-backgrounds';

export interface SundropObstacleMargins {
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly left: number;
}

export interface SundropObstacleOwnershipEntry {
	readonly blockerId: string;
	readonly motif: 'hedge' | 'low-wall' | 'root-rock';
	readonly ownerBackgroundIds: readonly string[];
	readonly baseMargins: SundropObstacleMargins;
	readonly foregroundMargins?: SundropObstacleMargins;
}

const BASE_MARGINS = { top: 8, right: 8, bottom: 8, left: 8 } as const;
const FOREGROUND_MARGINS = { top: 32, right: 8, bottom: 0, left: 8 } as const;

function ownership(
	blockerId: string,
	motif: SundropObstacleOwnershipEntry['motif'],
	foreground = false
): SundropObstacleOwnershipEntry {
	return {
		blockerId,
		motif,
		ownerBackgroundIds: foreground
			? [SUNDROP_VILLAGE_BASE_BACKGROUND_ID, SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID]
			: [SUNDROP_VILLAGE_BASE_BACKGROUND_ID],
		baseMargins: BASE_MARGINS,
		...(foreground ? { foregroundMargins: FOREGROUND_MARGINS } : {})
	};
}

/** Exact reviewed HPA-398 inventory. Do not derive this membership from geometry. */
export const SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP: readonly SundropObstacleOwnershipEntry[] = [
	ownership('village-block-2-2', 'hedge', true),
	ownership('village-block-2-49', 'hedge', true),
	ownership('village-block-3-2', 'hedge', true),
	ownership('corridor-wall-2b', 'hedge', true),
	ownership('village-block-3-51', 'hedge'),
	ownership('village-block-4-2', 'hedge'),
	ownership('village-block-32-2', 'hedge'),
	ownership('village-block-33-49', 'hedge'),
	ownership('village-block-10-35', 'low-wall', true),
	ownership('village-block-19-2', 'low-wall', true),
	ownership('village-block-19-30', 'low-wall', true),
	ownership('village-block-4-35', 'low-wall'),
	ownership('village-block-11-35', 'low-wall'),
	ownership('village-block-20-2', 'low-wall'),
	ownership('village-block-20-34', 'low-wall'),
	ownership('village-block-25-20', 'low-wall'),
	ownership('village-block-32-8', 'root-rock'),
	ownership('village-block-32-24', 'root-rock'),
	ownership('village-block-32-33', 'root-rock'),
	ownership('village-block-33-24', 'root-rock'),
	ownership('village-block-41-24', 'root-rock')
];

function indexManifest(
	manifest: readonly SundropObstacleOwnershipEntry[]
): Map<string, SundropObstacleOwnershipEntry> {
	const entries = new Map<string, SundropObstacleOwnershipEntry>();
	for (const entry of manifest) {
		if (entries.has(entry.blockerId)) {
			throw new Error(`Duplicate Sundrop obstacle ownership blocker ID: ${entry.blockerId}`);
		}
		entries.set(entry.blockerId, entry);
	}
	return entries;
}

function indexBlockers(blockers: readonly MapBlocker[]): Map<string, MapBlocker> {
	const entries = new Map<string, MapBlocker>();
	for (const blocker of blockers) {
		if (entries.has(blocker.id)) throw new Error(`Duplicate assembled blocker ID: ${blocker.id}`);
		entries.set(blocker.id, blocker);
	}
	return entries;
}

function marginsMatch(
	left: SundropObstacleMargins | undefined,
	right: SundropObstacleMargins | undefined
): boolean {
	return (
		left?.top === right?.top &&
		left?.right === right?.right &&
		left?.bottom === right?.bottom &&
		left?.left === right?.left
	);
}

function ownershipContractMatches(
	actual: SundropObstacleOwnershipEntry,
	approved: SundropObstacleOwnershipEntry
): boolean {
	return (
		actual.motif === approved.motif &&
		actual.ownerBackgroundIds.length === approved.ownerBackgroundIds.length &&
		actual.ownerBackgroundIds.every(
			(ownerId, index) => ownerId === approved.ownerBackgroundIds[index]
		) &&
		marginsMatch(actual.baseMargins, approved.baseMargins) &&
		marginsMatch(actual.foregroundMargins, approved.foregroundMargins)
	);
}

function assertApprovedOwnershipContract(
	manifestById: ReadonlyMap<string, SundropObstacleOwnershipEntry>
): void {
	const approvedById = indexManifest(SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP);
	for (const [blockerId, approved] of approvedById) {
		const actual = manifestById.get(blockerId);
		if (!actual || !ownershipContractMatches(actual, approved)) {
			throw new Error(`Sundrop obstacle ownership contract drift: ${blockerId}`);
		}
	}
	for (const blockerId of manifestById.keys()) {
		if (!approvedById.has(blockerId)) {
			throw new Error(`Sundrop obstacle ownership contract drift: ${blockerId}`);
		}
	}
}

function assertManifestBlockersExist(
	blockers: ReadonlyMap<string, MapBlocker>,
	manifest: ReadonlyMap<string, SundropObstacleOwnershipEntry>
): void {
	for (const blockerId of manifest.keys()) {
		if (!blockers.has(blockerId)) {
			throw new Error(`Missing Sundrop obstacle ownership blocker ID: ${blockerId}`);
		}
	}
}

/**
 * Applies the reviewed Sundrop obstacle ownership manifest to a blocker list,
 * marking each manifest entry's blocker as `fallback-only` with one owner crop
 * carrying its approved background IDs. Blockers not in the manifest are
 * returned unchanged.
 *
 * @param blockers - Assembled blockers to tag.
 * @param manifest - Ownership manifest; defaults to the reviewed
 *   `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP`.
 * @returns A new blocker array with `visual` set on manifest entries.
 * @throws when a manifest blocker ID is missing from `blockers` or the
 *   manifest contains a duplicate blocker ID.
 */
export function applySundropObstacleOwnership(
	blockers: readonly MapBlocker[],
	manifest: readonly SundropObstacleOwnershipEntry[] = SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP
): MapBlocker[] {
	const manifestById = indexManifest(manifest);
	const blockersById = indexBlockers(blockers);
	assertManifestBlockersExist(blockersById, manifestById);

	const assignments: VisualOwnershipAssignment[] = manifest.map((entry) => ({
		sourceId: entry.blockerId,
		visual: {
			mode: 'fallback-only',
			ownerCrops: [
				{
					cropId: 'sundrop-village-hpa-398',
					requiredBackgroundIds: [...entry.ownerBackgroundIds]
				}
			]
		}
	}));

	return applyVisualOwnership(blockers, assignments);
}

function assertExpandedBlockerFitsOwner(
	blocker: MapBlocker,
	owner: {
		readonly id: string;
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	},
	margins: SundropObstacleMargins
): void {
	const left = blocker.x - blocker.width / 2 - margins.left;
	const right = blocker.x + blocker.width / 2 + margins.right;
	const top = blocker.y - blocker.height / 2 - margins.top;
	const bottom = blocker.y + blocker.height / 2 + margins.bottom;
	const ownerLeft = owner.x - owner.width / 2;
	const ownerRight = owner.x + owner.width / 2;
	const ownerTop = owner.y - owner.height / 2;
	const ownerBottom = owner.y + owner.height / 2;
	if (left < ownerLeft || right > ownerRight || top < ownerTop || bottom > ownerBottom) {
		throw new Error(`Sundrop obstacle ${blocker.id} exceeds owner background ${owner.id}`);
	}
}

/**
 * Validates that the reviewed Sundrop obstacle ownership manifest is fully
 * covered by the assembled map: the manifest contract is unchanged, every
 * manifest blocker exists, every owner background exists, and each blocker
 * (expanded by its per-owner margins) fits inside the corresponding owner
 * background rectangle.
 *
 * @param map - A map subset carrying `backgroundImages` and `blockers`.
 * @param manifest - Ownership manifest; defaults to the reviewed
 *   `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP`.
 * @throws when the manifest contract drifts from the approved manifest, a
 *   manifest blocker or owner background is missing, a foreground-owned
 *   entry lacks foreground margins, or an expanded blocker exceeds its
 *   owner background bounds.
 */
export function validateSundropObstacleCoverage(
	map: MapBackgroundOwnershipSource,
	manifest: readonly SundropObstacleOwnershipEntry[] = SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP
): void {
	const manifestById = indexManifest(manifest);
	assertApprovedOwnershipContract(manifestById);
	const blockersById = indexBlockers(map.blockers ?? []);
	assertManifestBlockersExist(blockersById, manifestById);
	const backgroundsById = new Map(
		(map.backgroundImages ?? []).map((background) => [background.id, background])
	);

	for (const entry of manifestById.values()) {
		const blocker = blockersById.get(entry.blockerId);
		if (!blocker)
			throw new Error(`Missing Sundrop obstacle ownership blocker ID: ${entry.blockerId}`);
		for (const ownerId of entry.ownerBackgroundIds) {
			const owner = backgroundsById.get(ownerId);
			if (!owner) {
				throw new Error(
					`Sundrop obstacle ${entry.blockerId} references missing owner background ${ownerId}`
				);
			}
			const margins =
				ownerId === SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID
					? entry.foregroundMargins
					: entry.baseMargins;
			if (!margins) {
				throw new Error(`Sundrop obstacle ${entry.blockerId} is missing foreground margins`);
			}
			assertExpandedBlockerFitsOwner(blocker, owner, margins);
		}
	}
}

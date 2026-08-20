import type {
	MapBackgroundImage,
	MapBackgroundPlane,
	MapVisualOwnership,
	WorldMapDefinition
} from '$lib/game/content/maps/types';

export const MAP_BACKGROUND_DEPTHS = {
	base: -9,
	foreground: 100
} as const satisfies Record<MapBackgroundPlane, number>;

const BACKGROUND_ORDER_SCALE = 10_000;

export type MapBackgroundOwnershipSource = Pick<
	WorldMapDefinition,
	'backgroundImages' | 'blockers' | 'mapDecor' | 'fences' | 'groundPatches' | 'interiorProps'
>;

type VisualOwnershipSource = {
	readonly id: string;
	readonly visual?: MapVisualOwnership;
};

export function getMapBackgroundDepth(
	background: Pick<MapBackgroundImage, 'plane' | 'drawOrder'>
): number {
	return MAP_BACKGROUND_DEPTHS[background.plane] + background.drawOrder / BACKGROUND_ORDER_SCALE;
}

/**
 * Validates the background-ownership contract for a map.
 *
 * Ensures every background descriptor ID is unique; every descriptor has a
 * unique, non-negative integer draw order within its plane in the supported
 * range; and every `fallback-only` visual has non-empty, duplicate-free owner
 * crops whose required background IDs exist on the map.
 *
 * @param map - A map subset carrying backgrounds and visual source collections.
 * @throws when a background descriptor ID or plane/order slot is duplicated,
 *   a descriptor has an invalid draw order, a `fallback-only` visual has an
 *   empty owner crop or required-ID list, a crop or required ID is duplicated,
 *   or a required background ID is missing.
 */
export function validateMapBackgroundOwnership(map: MapBackgroundOwnershipSource): void {
	const descriptorIds = new Set<string>();
	const descriptorPlaneOrders = new Set<string>();

	for (const background of map.backgroundImages ?? []) {
		if (descriptorIds.has(background.id)) {
			throw new Error(`Duplicate background descriptor ID: ${background.id}`);
		}
		descriptorIds.add(background.id);

		if (
			!Number.isInteger(background.drawOrder) ||
			background.drawOrder < 0 ||
			background.drawOrder > 1_000
		) {
			throw new Error(
				`Invalid background descriptor draw order for ${background.id}: ${background.drawOrder}`
			);
		}

		const planeOrder = `${background.plane}:${background.drawOrder}`;
		if (descriptorPlaneOrders.has(planeOrder)) {
			throw new Error(
				`Duplicate background descriptor draw order for ${background.plane} plane: ${background.drawOrder}`
			);
		}
		descriptorPlaneOrders.add(planeOrder);
	}

	validateVisualOwnershipSources('Blocker', map.blockers ?? [], descriptorIds);
	validateVisualOwnershipSources('Map decor', map.mapDecor ?? [], descriptorIds);
	validateVisualOwnershipSources('Fence', map.fences ?? [], descriptorIds);
	validateVisualOwnershipSources('Ground patch', map.groundPatches ?? [], descriptorIds);
	validateVisualOwnershipSources('Interior prop', map.interiorProps ?? [], descriptorIds);
}

function validateVisualOwnershipSources(
	sourceName: string,
	items: readonly VisualOwnershipSource[],
	descriptorIds: ReadonlySet<string>
): void {
	for (const item of items) {
		const visual = item.visual;
		if (!visual || visual.mode !== 'fallback-only') continue;

		if (visual.ownerCrops.length === 0) {
			throw new Error(`${sourceName} ${item.id} has an empty fallback-only owner crop list`);
		}

		const seenCropIds = new Set<string>();
		for (const crop of visual.ownerCrops) {
			if (seenCropIds.has(crop.cropId)) {
				throw new Error(
					`${sourceName} ${item.id} has duplicate fallback-only owner crop ID: ${crop.cropId}`
				);
			}
			seenCropIds.add(crop.cropId);

			if (crop.requiredBackgroundIds.length === 0) {
				throw new Error(
					`${sourceName} ${item.id} has an empty fallback-only owner list for crop ${crop.cropId}`
				);
			}

			const seenRequiredBackgroundIds = new Set<string>();
			for (const backgroundId of crop.requiredBackgroundIds) {
				if (seenRequiredBackgroundIds.has(backgroundId)) {
					throw new Error(
						`${sourceName} ${item.id} has duplicate fallback-only owner ID in crop ${crop.cropId}: ${backgroundId}`
					);
				}
				seenRequiredBackgroundIds.add(backgroundId);

				if (!descriptorIds.has(backgroundId)) {
					throw new Error(
						`${sourceName} ${item.id} references missing fallback-only owner ID in crop ${crop.cropId}: ${backgroundId}`
					);
				}
			}
		}
	}
}

/**
 * Decides whether a visual should render given the set of backgrounds that
 * loaded and rendered successfully. A fallback-only visual is hidden when at
 * least one of its owner crops has all required background IDs available.
 */
export function shouldRenderOwnedVisual(
	visual: MapVisualOwnership | undefined,
	successfulBackgroundIds: ReadonlySet<string>
): boolean {
	if (!visual || visual.mode === 'always') return true;
	return !visual.ownerCrops.some((crop) =>
		crop.requiredBackgroundIds.every((id) => successfulBackgroundIds.has(id))
	);
}

export interface VisualOwnershipAssignment {
	readonly sourceId: string;
	readonly visual: MapVisualOwnership;
}

/**
 * Returns a new item list with ownership metadata attached to selected source
 * IDs. Unassigned records retain their original identity.
 *
 * @param items - Source records to attach ownership to; matched by `id`.
 * @param assignments - Ownership visuals keyed by the source `id` they target.
 * @param options - When `rejectExisting` is set, throws if a targeted record
 *   already carries a visual.
 * @returns A new array; assigned records are shallow-cloned with the visual
 *   attached, unassigned records are returned by reference.
 */
export function applyVisualOwnership<T extends { id: string; visual?: MapVisualOwnership }>(
	items: readonly T[],
	assignments: readonly VisualOwnershipAssignment[],
	options: { rejectExisting?: boolean } = {}
): T[] {
	const assignmentsBySourceId = new Map<string, VisualOwnershipAssignment>();
	for (const assignment of assignments) {
		if (assignmentsBySourceId.has(assignment.sourceId)) {
			throw new Error(`Duplicate visual ownership assignment source ID: ${assignment.sourceId}`);
		}
		assignmentsBySourceId.set(assignment.sourceId, assignment);
	}

	const itemIds = new Set(items.map((item) => item.id));
	for (const sourceId of assignmentsBySourceId.keys()) {
		if (!itemIds.has(sourceId)) {
			throw new Error(`Visual ownership assignment references missing item ID: ${sourceId}`);
		}
	}

	return items.map((item) => {
		const assignment = assignmentsBySourceId.get(item.id);
		if (!assignment) return item;
		if (options.rejectExisting && item.visual) {
			throw new Error(`Visual ownership assignment would overwrite existing visual: ${item.id}`);
		}
		return { ...item, visual: assignment.visual };
	});
}

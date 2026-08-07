import type {
	MapBackgroundImage,
	MapBackgroundPlane,
	MapBlocker,
	WorldMapDefinition
} from '$lib/game/content/maps/types';

export const MAP_BACKGROUND_DEPTHS = {
	base: -9,
	foreground: 100
} as const satisfies Record<MapBackgroundPlane, number>;

const BACKGROUND_ORDER_SCALE = 10_000;

export type MapBackgroundOwnershipSource = Pick<
	WorldMapDefinition,
	'backgroundImages' | 'blockers'
>;

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
 * range; and every `fallback-only` blocker has a non-empty, duplicate-free
 * owner list that references only descriptor IDs that exist on the map.
 *
 * @param map - A map subset carrying `backgroundImages` and `blockers`.
 * @throws when a background descriptor ID or plane/order slot is duplicated,
 *   a descriptor has an invalid draw order, a `fallback-only` blocker has an
 *   empty owner list, a blocker lists a duplicate owner ID, or a blocker
 *   references a missing owner background ID.
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

	for (const blocker of map.blockers ?? []) {
		if (blocker.visual?.mode !== 'fallback-only') {
			continue;
		}

		const ownerIds = blocker.visual.ownerBackgroundIds;
		if (ownerIds.length === 0) {
			throw new Error(`Blocker ${blocker.id} has an empty fallback-only owner list`);
		}

		const seenOwnerIds = new Set<string>();
		for (const ownerId of ownerIds) {
			if (seenOwnerIds.has(ownerId)) {
				throw new Error(`Blocker ${blocker.id} has duplicate fallback-only owner ID: ${ownerId}`);
			}
			seenOwnerIds.add(ownerId);

			if (!descriptorIds.has(ownerId)) {
				throw new Error(
					`Blocker ${blocker.id} references missing fallback-only owner ID: ${ownerId}`
				);
			}
		}
	}
}

/**
 * Decides whether a blocker's own visual should be rendered given the set
 * of backgrounds that loaded successfully.
 *
 * Blockers with no `visual` or `mode === 'always'` always render. A
 * `fallback-only` blocker renders only when at least one of its owner
 * backgrounds failed to load (i.e. not every owner ID is in
 * `successfulBackgroundIds`), so the visual stands in for the missing art.
 *
 * @param blocker - The blocker whose visual mode is consulted.
 * @param successfulBackgroundIds - IDs of backgrounds that loaded and
 *   rendered successfully.
 * @returns `true` when the blocker visual should be drawn.
 */
export function shouldRenderBlockerVisual(
	blocker: MapBlocker,
	successfulBackgroundIds: ReadonlySet<string>
): boolean {
	if (!blocker.visual || blocker.visual.mode === 'always') return true;
	return !blocker.visual.ownerBackgroundIds.every((id) => successfulBackgroundIds.has(id));
}

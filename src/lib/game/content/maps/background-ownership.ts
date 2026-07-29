import type {
	MapBackgroundPlane,
	MapBlocker,
	WorldMapDefinition
} from '$lib/game/content/maps/types';

export const MAP_BACKGROUND_DEPTHS = {
	base: -9,
	foreground: 100
} as const satisfies Record<MapBackgroundPlane, number>;

export type MapBackgroundOwnershipSource = Pick<
	WorldMapDefinition,
	'backgroundImages' | 'blockers'
>;

export function getMapBackgroundDepth(plane: MapBackgroundPlane): number {
	return MAP_BACKGROUND_DEPTHS[plane];
}

export function validateMapBackgroundOwnership(map: MapBackgroundOwnershipSource): void {
	const descriptorIds = new Set<string>();

	for (const background of map.backgroundImages ?? []) {
		if (descriptorIds.has(background.id)) {
			throw new Error(`Duplicate background descriptor ID: ${background.id}`);
		}
		descriptorIds.add(background.id);
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

export function shouldRenderBlockerVisual(
	blocker: MapBlocker,
	successfulBackgroundIds: ReadonlySet<string>
): boolean {
	if (!blocker.visual || blocker.visual.mode === 'always') return true;
	return !blocker.visual.ownerBackgroundIds.every((id) => successfulBackgroundIds.has(id));
}

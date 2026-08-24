import { isNpcPackFrameName } from '$lib/game/content/assets';
import type {
	MapRect,
	NavigationGridOwnedSource,
	WorldMapDefinition
} from '$lib/game/content/maps/types';
import { NPC_PACK_COLLISION_RADIUS, STARTER_NPC_COLLISION_RADIUS } from '$lib/game/core/collision';
import {
	createOpenNavigationGrid,
	type NavigationGrid,
	type NavigationObstacle,
	type NavigationRect
} from '$lib/game/core/navigation';

const NAVIGATION_CELL_SIZE = 32;
const LANDMARK_DOORWAY_WIDTH = 56;
const LANDMARK_TRANSITION_RADIUS = 18;

const openNavigationGrids = new Map<string, NavigationGrid>();

export function resolveMapNavigationGrid(map: WorldMapDefinition): NavigationGrid {
	if (map.navigationGrid) {
		return map.navigationGrid;
	}

	const cacheKey = `${map.id}:${NAVIGATION_CELL_SIZE}:${map.width}:${map.height}`;
	const cached = openNavigationGrids.get(cacheKey);
	if (cached) {
		return cached;
	}

	const grid = createOpenNavigationGrid({
		id: `${map.id}-open`,
		mapId: map.id,
		cellSizePx: NAVIGATION_CELL_SIZE,
		widthCells: map.width,
		heightCells: map.height
	});
	openNavigationGrids.set(cacheKey, grid);
	return grid;
}

export function buildMapNavigationObstacles(
	map: WorldMapDefinition,
	options: { readonly includeInteractableNpcs: boolean }
): readonly NavigationObstacle[] {
	const obstacles: NavigationObstacle[] = [];

	if (!hasOwnedSource(map, 'blocker')) {
		for (const blocker of map.blockers ?? []) {
			obstacles.push(buildStrictRectObstacle(blocker.id, blocker));
		}
	}

	if (!hasOwnedSource(map, 'fence')) {
		for (const fence of map.fences ?? []) {
			obstacles.push(buildStrictRectObstacle(fence.id, fence));
		}
	}

	if (!hasOwnedSource(map, 'map-decor')) {
		for (const decor of map.mapDecor ?? []) {
			if (decor.collision) {
				obstacles.push(buildStrictRectObstacle(decor.collision.id, decor.collision));
			}
		}
	}

	if (!hasOwnedSource(map, 'interior-prop')) {
		for (const prop of map.interiorProps ?? []) {
			if (prop.collision) {
				obstacles.push(buildEscapeAwareRectObstacle(prop.collision.id, prop.collision));
			}
		}
	}

	const doorCandidates = map.transitions.map((transition) => ({
		id: transition.id,
		point: { x: transition.x, y: transition.y }
	}));
	for (const landmark of map.landmarks ?? []) {
		obstacles.push({
			id: landmark.id,
			shape: 'landmark',
			landmarkId: landmark.id,
			bounds: toNavigationBounds(landmark),
			doorCandidates,
			doorwayWidthPx: LANDMARK_DOORWAY_WIDTH,
			transitionRadiusPx: LANDMARK_TRANSITION_RADIUS,
			invalidAtRest: true
		});
	}

	if (options.includeInteractableNpcs) {
		for (const npc of map.npcs ?? []) {
			obstacles.push({
				id: npc.id,
				shape: 'circle',
				center: { x: npc.x, y: npc.y },
				radius: isNpcPackFrameName(npc.frameName)
					? NPC_PACK_COLLISION_RADIUS
					: STARTER_NPC_COLLISION_RADIUS,
				movement: 'escape-aware',
				invalidAtRest: false
			});
		}
	}

	return obstacles;
}

function hasOwnedSource(map: WorldMapDefinition, source: NavigationGridOwnedSource): boolean {
	return (
		map.navigationGrid !== undefined && (map.navigationGridOwnedSources?.includes(source) ?? false)
	);
}

function buildStrictRectObstacle(id: string, rect: MapRect): NavigationObstacle {
	return {
		id,
		shape: 'rect',
		bounds: toNavigationBounds(rect),
		movement: 'strict',
		invalidAtRest: true
	};
}

function buildEscapeAwareRectObstacle(id: string, rect: MapRect): NavigationObstacle {
	return {
		id,
		shape: 'rect',
		bounds: toNavigationBounds(rect),
		movement: 'escape-aware',
		invalidAtRest: true,
		escapeOrigin: { x: rect.x, y: rect.y }
	};
}

function toNavigationBounds(rect: MapRect): NavigationRect {
	return {
		left: rect.x - rect.width / 2,
		right: rect.x + rect.width / 2,
		top: rect.y - rect.height / 2,
		bottom: rect.y + rect.height / 2
	};
}

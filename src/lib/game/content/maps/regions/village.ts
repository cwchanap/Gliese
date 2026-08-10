import { compileLayeredRegion } from '$lib/game/content/maps/layered/compile-layered-region';
import { toMapRect } from '$lib/game/content/maps/layouts/layout-rects';
import { SUNDROP_VILLAGE_V2_BUILDINGS } from '$lib/game/content/maps/layouts/meadow-entry-v2';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

const compiledVillage = compileLayeredRegion(sundropVillageLayered);

const villageLandmarks = Object.values(SUNDROP_VILLAGE_V2_BUILDINGS).map((building) => ({
	...toMapRect(building.landmarkId, building.footprint),
	labelKey: building.labelKey
}));

const compactInteriorArrivals = {
	'hero-house': { ...VILLAGE_INTERIOR_LAYOUTS['hero-house'].spawn, facing: 'up' },
	'item-shop': { ...VILLAGE_INTERIOR_LAYOUTS['item-shop'].spawn, facing: 'up' },
	'villager-house-1': { ...VILLAGE_INTERIOR_LAYOUTS['villager-house-1'].spawn, facing: 'up' },
	'villager-house-2': { ...VILLAGE_INTERIOR_LAYOUTS['villager-house-2'].spawn, facing: 'up' },
	'guild-hall': { ...VILLAGE_INTERIOR_LAYOUTS['guild-hall'].spawn, facing: 'up' },
	'shrine-of-aurora-interior': {
		...VILLAGE_INTERIOR_LAYOUTS['shrine-of-aurora-interior'].spawn,
		facing: 'up'
	},
	'villager-house-3': { ...VILLAGE_INTERIOR_LAYOUTS['villager-house-3'].spawn, facing: 'up' }
} as const;

const villageTransitions = Object.values(SUNDROP_VILLAGE_V2_BUILDINGS).flatMap((building) => {
	if (!('mapId' in building) || !('transitionId' in building)) return [];
	return [
		{
			id: building.transitionId,
			x: building.door.x,
			y: building.door.y,
			toMapId: building.mapId,
			showMarker: false,
			arrival: compactInteriorArrivals[building.mapId as keyof typeof compactInteriorArrivals]
		}
	];
});

export const villageRegion: RegionFragment = {
	...compiledVillage,
	landmarks: villageLandmarks,
	transitions: villageTransitions,
	pickups: [
		{ id: 'village-market-cache', x: 912, y: 5072, itemId: 'field-potion', quantity: 1 },
		{ id: 'village-shrine-cache', x: 2512, y: 5744, itemId: 'sunleaf-salve', quantity: 1 }
	],
	ambientNpcs: [
		{ id: 'village-wanderer', x: 944, y: 4880, frameName: 'travelerNpc' },
		{ id: 'village-woodcutter', x: 1264, y: 4528, frameName: 'woodcutterNpc' },
		{ id: 'village-pilgrim', x: 1744, y: 5712, frameName: 'pilgrimNpc' },
		{ id: 'village-crier', x: 2032, y: 5008, frameName: 'crierNpc' }
	]
};

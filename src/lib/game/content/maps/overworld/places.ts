import type { NpcFrameName } from '$lib/game/content/assets';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
import type {
	MapAmbientNpc,
	MapDiscovery,
	MapPickup,
	MapTransition
} from '$lib/game/content/maps/types';
import type { MessageKey } from '$lib/game/i18n/translate';

import { anchorPoint } from './world';

/**
 * Everything on the overworld that is not story-gated: Sundrop's doors, the tunnel mouth,
 * caches, the everyday crowd, and the warning signs. Each one stands on a named anchor.
 */

/**
 * Sundrop's doors, each leading into an interior. Every door is on the building's south
 * face, where the art draws it, so the player steps back out downwards.
 */
const doors = [
	{ anchor: 'sundrop-grik-home-door', mapId: 'hero-house' },
	{ anchor: 'sundrop-lodge-door', mapId: 'guild-hall' },
	{ anchor: 'sundrop-herb-hut-door', mapId: 'item-shop' },
	{ anchor: 'sundrop-forge-door', mapId: 'blacksmith-interior' },
	{ anchor: 'sundrop-neighbor-hut-1-door', mapId: 'villager-house-1' },
	{ anchor: 'sundrop-neighbor-hut-2-door', mapId: 'villager-house-2' },
	{ anchor: 'sundrop-neighbor-hut-3-door', mapId: 'villager-house-3' },
	{ anchor: 'sundrop-shrine-door', mapId: 'shrine-of-aurora-interior' }
] as const satisfies readonly {
	anchor: string;
	mapId: keyof typeof VILLAGE_INTERIOR_LAYOUTS;
}[];

export type OverworldDoorMapId = (typeof doors)[number]['mapId'];

/**
 * Where the player stands after leaving an interior: one tile out from its door, just past
 * the door's 30px trigger (player radius plus transition radius).
 */
export function overworldDoorArrival(
	mapId: OverworldDoorMapId
): NonNullable<MapTransition['arrival']> {
	const door = doors.find((entry) => entry.mapId === mapId)!;
	const { x, y } = anchorPoint(door.anchor);
	return { x, y: y + 32, facing: 'down' };
}

/** Where Grik comes out of the tunnel at the Whispering Cave. */
export const caveArrival = { ...anchorPoint('wildwood-cave-arrival'), facing: 'down' } as const;

const transitions: MapTransition[] = [
	...doors.map(({ anchor, mapId }) => ({
		id: `overworld-to-${mapId}`,
		...anchorPoint(anchor),
		toMapId: mapId,
		arrival: { ...VILLAGE_INTERIOR_LAYOUTS[mapId].spawn, facing: 'up' as const }
	})),
	// The tunnel mouth opens only on the escape, once Grik has come out of it.
	{
		id: 'overworld-to-ruins-threshold',
		...anchorPoint('wildwood-whispering-cave'),
		toMapId: 'ruins-threshold',
		marker: 'stair',
		activeDuring: { quests: ['prologue-escape'] },
		arrival: { x: 512, y: 3_200, facing: 'right' }
	}
];

const cache = (anchor: string, itemId: string): MapPickup => ({
	id: anchor,
	...anchorPoint(anchor),
	itemId,
	quantity: 1
});

const local = (anchor: string, frameName: NpcFrameName): MapAmbientNpc => ({
	id: anchor,
	...anchorPoint(anchor),
	frameName
});

const notice = (id: string, anchor: string, revealMarker: boolean): MapDiscovery => ({
	id,
	...anchorPoint(anchor),
	revealMarker,
	labelKey: `content.maps.discoveries.${id}.label` as MessageKey,
	descriptionKey: `content.maps.discoveries.${id}.description` as MessageKey
});

export const overworldPlaces = {
	transitions,
	pickups: [
		cache('sundrop-market-cache', 'field-potion'),
		cache('sundrop-hidden-chest', 'sunleaf-salve'),
		cache('wildwood-grove-cache', 'sunleaf-salve'),
		cache('mistfen-salve', 'sunleaf-salve'),
		cache('mistfen-cache', 'field-potion'),
		cache('silverpine-tonic', 'field-potion'),
		cache('silverpine-offering-cache', 'sunleaf-salve')
	],
	ambientNpcs: [
		local('sundrop-wanderer', 'travelerNpc'),
		local('sundrop-woodcutter', 'woodcutterNpc'),
		local('sundrop-pilgrim', 'pilgrimNpc'),
		local('sundrop-crier', 'crierNpc'),
		local('wildwood-woodcutter', 'woodcutterNpc'),
		local('mistfen-forager', 'travelerNpc'),
		local('silverpine-pilgrim', 'pilgrimNpc')
	],
	discoveries: [
		notice('wildwood-cave-danger', 'wildwood-cave-danger', true),
		notice('witchwood-poison-warning', 'mistfen-witchwood-warning', true),
		notice('silverpine-amulet-foreshadow', 'silverpine-amulet-foreshadow', false)
	]
};

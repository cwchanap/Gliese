import type { NpcFrameName } from '$lib/game/content/assets';
import type { MapNpcSource } from '$lib/game/content/maps/text';
import type {
	MapCombatBounds,
	MapDiscovery,
	MapEncounter,
	MapPickup,
	StoryGated
} from '$lib/game/content/maps/types';
import { storyWindows } from '$lib/game/content/quests';
import type { MessageKey } from '$lib/game/i18n/translate';

import { anchorPoint } from './world';

/**
 * Prologue story placements on the overworld: the companions met on the trails, the day-one
 * packs, the trail signs, the moonmoss, the raid's soldiers, and the escape ridge. Every entry
 * is story-gated (`core/story-gates.ts`), so the same map plays the proving day, the raid, and
 * the escape; the raid's fire is a terrain overlay on the Sundrop chunk.
 *
 * A story fight is gated to exactly the objective that counts it: a target defeated earlier
 * would stay cleared and leave its objective unfinishable.
 */

type Pack = { encounter: MapEncounter; bounds: MapCombatBounds };

function pack(id: string, anchor: string, enemyId: string, count: number, gate: StoryGated): Pack {
	const at = anchorPoint(anchor);
	return {
		encounter: { id, ...at, enemyId, count, ...gate },
		bounds: {
			id: `${id}-pocket`,
			...at,
			width: 576,
			height: 448,
			encounterIds: [id],
			aggroRadius: 200,
			leashRadius: 360
		}
	};
}

function storyNpc(
	id: string,
	anchor: string,
	nameId: string,
	frameName: NpcFrameName,
	gate: StoryGated
): MapNpcSource {
	return {
		id,
		...anchorPoint(anchor),
		nameKey: `content.maps.npcs.${nameId}.name` as MessageKey,
		dialogueId: id,
		role: 'villager',
		frameName,
		...gate
	};
}

function sign(id: string, anchor: string, gate: StoryGated): MapDiscovery {
	return {
		id,
		...anchorPoint(anchor),
		radius: 72,
		labelKey: `content.maps.discoveries.${id}.label` as MessageKey,
		sceneId: `prologue.${id}`,
		...gate
	};
}

const dayOne: StoryGated = { activeDuring: storyWindows.dayOne };
const during = (...objectives: string[]): StoryGated => ({ activeDuring: { objectives } });

const packs: Pack[] = [
	// Trial one: the Wildwood climb from the mouth to the cave pocket.
	pack('wildwood-wolves-mouth', 'wildwood-wolves-mouth', 'forest-wolf', 2, dayOne),
	pack('wildwood-wolves-climb', 'wildwood-wolves-climb', 'forest-wolf', 2, dayOne),
	pack('wildwood-wolves-crossing', 'wildwood-wolves-crossing', 'forest-wolf', 2, dayOne),
	pack('wildwood-wolves-cave', 'wildwood-wolves-cave', 'forest-wolf', 2, dayOne),
	pack(
		'thornback-boar',
		'wildwood-thornback-boar',
		'thornback-boar',
		1,
		during('defeat-thornback-boar')
	),
	// Trial two: toads across the Mistfen basin.
	pack('mistfen-toads-entry', 'mistfen-toads-entry', 'mist-toad', 2, dayOne),
	pack('mistfen-toads-curve', 'mistfen-toads-curve', 'mist-toad', 2, dayOne),
	pack('mistfen-toads-reeds', 'mistfen-toads-reeds', 'mist-toad', 2, dayOne),
	pack('mistfen-toads-pool', 'mistfen-toads-pool', 'mist-toad', 2, dayOne),
	pack('mistfen-toads-gate', 'mistfen-toads-gate', 'mist-toad', 2, dayOne),
	// Trial three: wolves up the Silverpine tiers, the Boar King in his clearing.
	pack('silverpine-wolves-corridor', 'silverpine-wolves-corridor', 'forest-wolf', 3, dayOne),
	pack('silverpine-wolves-bridge', 'silverpine-wolves-bridge', 'forest-wolf', 3, dayOne),
	pack('silverpine-wolves-falls', 'silverpine-wolves-falls', 'forest-wolf', 3, dayOne),
	pack('silverpine-wolves-terrace', 'silverpine-wolves-terrace', 'forest-wolf', 3, dayOne),
	pack('boar-king', 'silverpine-boar-king', 'boar-king', 1, during('defeat-boar-king')),
	// The raid: soldiers between the house and the gate, the captain on the green.
	pack(
		'raid-soldiers-lane',
		'sundrop-raid-soldiers-lane',
		'human-soldier',
		2,
		during('repel-the-soldiers')
	),
	pack(
		'raid-soldiers-street',
		'sundrop-raid-soldiers-street',
		'human-soldier',
		2,
		during('repel-the-soldiers')
	),
	pack(
		'raid-soldiers-forge',
		'sundrop-raid-soldiers-forge',
		'human-soldier',
		2,
		during('repel-the-soldiers')
	),
	pack(
		'sun-crest-captain',
		'sundrop-sun-crest-captain',
		'sun-crest-captain',
		1,
		during('charge-the-captain')
	)
];

export const prologuePlacements = {
	npcs: [
		storyNpc(
			'lirra-forest',
			'wildwood-lirra-forest',
			'lirra',
			'lirraNpc',
			during('meet-lirra-forest', 'read-boar-signs', 'defeat-thornback-boar')
		),
		storyNpc(
			'lirra-mistfen',
			'mistfen-lirra-bridge',
			'lirra',
			'lirraNpc',
			during('meet-lirra-mistfen', 'gather-moonmoss', 'rest-at-the-pond')
		),
		storyNpc(
			'drogg-north-gate',
			'sundrop-drogg-north-gate',
			'drogg',
			'droggNpc',
			during('meet-drogg-north-gate', 'track-the-boar-king')
		),
		storyNpc(
			'drogg-falls',
			'silverpine-drogg-falls',
			'drogg',
			'droggNpc',
			during('talk-to-drogg-falls', 'defeat-boar-king')
		),
		storyNpc('borak-gate', 'sundrop-borak-south-gate', 'borak', 'borakNpc', {
			activeDuring: { quests: ['prologue-raid'] }
		}),
		storyNpc(
			'drogg-well',
			'sundrop-drogg-well',
			'drogg',
			'droggNpc',
			during('find-drogg', 'charge-the-captain')
		),
		storyNpc(
			'tikka-captive',
			'sundrop-tikka-captive',
			'tikka',
			'tikkaNpc',
			during('charge-the-captain')
		),
		storyNpc(
			'lirra-captive',
			'sundrop-lirra-captive',
			'lirra',
			'lirraNpc',
			during('charge-the-captain')
		)
	],
	encounters: packs.map(({ encounter }) => encounter),
	combatBounds: packs.map(({ bounds }) => bounds),
	discoveries: [
		sign('boar-sign-hoofprints', 'wildwood-boar-sign-hoofprints', during('read-boar-signs')),
		sign('boar-sign-sapling', 'wildwood-boar-sign-sapling', during('read-boar-signs')),
		sign('boar-sign-tusk-scrape', 'wildwood-boar-sign-tusk-scrape', during('read-boar-signs')),
		sign('mistfen-pond-rest', 'mistfen-pond-rest', during('rest-at-the-pond')),
		sign('boar-king-trail', 'silverpine-boar-king-trail', during('track-the-boar-king')),
		sign('ridge-overlook', 'wildwood-ridge-overlook', during('climb-to-the-ridge'))
	],
	pickups: [1, 2, 3, 4].map(
		(index): MapPickup => ({
			id: `mistfen-moonmoss-${index}`,
			...anchorPoint(`mistfen-moonmoss-${index}`),
			itemId: 'moonmoss',
			quantity: 1,
			...during('gather-moonmoss')
		})
	)
};

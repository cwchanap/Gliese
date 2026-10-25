import { storyWindows } from '$lib/game/content/quests';
import type {
	MapCombatBounds,
	MapEncounter,
	MapNpcRole,
	StoryGated
} from '$lib/game/content/maps/types';
import type { NpcFrameName } from '$lib/game/content/assets';
import type { RegionFragment, RegionNpc } from '$lib/game/content/maps/regions/types';
import type { MessageKey } from '$lib/game/i18n/translate';

/**
 * Prologue story placements on Meadow Entry: the companions met on the trails,
 * the day-one packs, the trail signs, the moonmoss, the raid's soldiers and
 * fire, and the escape ridge. Every entry is story-gated (`core/story-gates.ts`),
 * so the same map plays the proving day, the raid, and the escape.
 *
 * A story fight is gated to exactly the objective that counts it: a target
 * defeated earlier would stay cleared and leave its objective unfinishable.
 */

type Pack = { encounter: MapEncounter; bounds: MapCombatBounds };

function pack(
	id: string,
	enemyId: string,
	at: { x: number; y: number },
	count: number,
	gate: StoryGated
): Pack {
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
	at: { x: number; y: number },
	nameId: string,
	frameName: NpcFrameName,
	gate: StoryGated,
	role: MapNpcRole = 'villager'
): RegionNpc {
	return {
		id,
		...at,
		nameKey: `content.maps.npcs.${nameId}.name` as MessageKey,
		dialogueId: id,
		role,
		frameName,
		...gate
	};
}

function sign(id: string, at: { x: number; y: number }) {
	return {
		id,
		...at,
		radius: 72,
		labelKey: `content.maps.discoveries.${id}.label` as MessageKey,
		sceneId: `prologue.${id}`
	};
}

const dayOne: StoryGated = { activeDuring: storyWindows.dayOne };
const during = (...objectives: string[]): StoryGated => ({ activeDuring: { objectives } });

const packs: Pack[] = [
	// Trial one: the Wildwood climb from the mouth to the north pocket.
	pack('wildwood-wolves-mouth', 'forest-wolf', { x: 4_700, y: 3_200 }, 2, dayOne),
	pack('wildwood-wolves-climb', 'forest-wolf', { x: 5_760, y: 2_560 }, 2, dayOne),
	pack('wildwood-wolves-crossing', 'forest-wolf', { x: 5_360, y: 1_280 }, 2, dayOne),
	pack('wildwood-wolves-cave', 'forest-wolf', { x: 5_920, y: 1_600 }, 2, dayOne),
	pack(
		'thornback-boar',
		'thornback-boar',
		{ x: 5_120, y: 960 },
		1,
		during('defeat-thornback-boar')
	),
	// Trial two: toads across the Mistfen basin.
	pack('mistfen-toads-entry', 'mist-toad', { x: 2_000, y: 3_050 }, 2, dayOne),
	pack('mistfen-toads-curve', 'mist-toad', { x: 1_150, y: 2_700 }, 2, dayOne),
	pack('mistfen-toads-reeds', 'mist-toad', { x: 600, y: 2_000 }, 2, dayOne),
	pack('mistfen-toads-pool', 'mist-toad', { x: 1_250, y: 1_250 }, 2, dayOne),
	pack('mistfen-toads-gate', 'mist-toad', { x: 1_800, y: 1_000 }, 2, dayOne),
	// Trial three: wolves up the Silverpine trail, the Boar King on the terrace.
	pack('silverpine-wolves-bridge', 'forest-wolf', { x: 3_500, y: 2_400 }, 3, dayOne),
	pack('silverpine-wolves-corridor', 'forest-wolf', { x: 2_560, y: 2_000 }, 3, dayOne),
	pack('silverpine-wolves-falls', 'forest-wolf', { x: 2_160, y: 1_480 }, 3, dayOne),
	pack('silverpine-wolves-terrace', 'forest-wolf', { x: 2_560, y: 1_000 }, 3, dayOne),
	pack('boar-king', 'boar-king', { x: 2_900, y: 800 }, 1, during('defeat-boar-king')),
	// The raid: soldiers between the house and the gate, the captain on the green.
	pack(
		'raid-soldiers-lane',
		'human-soldier',
		{ x: 1_200, y: 5_440 },
		2,
		during('repel-the-soldiers')
	),
	pack(
		'raid-soldiers-street',
		'human-soldier',
		{ x: 1_000, y: 4_690 },
		2,
		during('repel-the-soldiers')
	),
	pack(
		'raid-soldiers-forge',
		'human-soldier',
		{ x: 2_400, y: 4_690 },
		2,
		during('repel-the-soldiers')
	),
	pack(
		'sun-crest-captain',
		'sun-crest-captain',
		{ x: 1_504, y: 4_860 },
		1,
		during('charge-the-captain')
	)
];

export const prologueRegion: RegionFragment = {
	npcs: [
		storyNpc('lirra-forest', { x: 4_950, y: 4_000 }, 'lirra', 'lirraNpc', {
			activeDuring: {
				objectives: ['meet-lirra-forest', 'read-boar-signs', 'defeat-thornback-boar']
			}
		}),
		storyNpc('lirra-mistfen', { x: 2_380, y: 3_500 }, 'lirra', 'lirraNpc', {
			activeDuring: { objectives: ['meet-lirra-mistfen', 'gather-moonmoss', 'rest-at-the-pond'] }
		}),
		storyNpc('drogg-crossroads', { x: 3_700, y: 4_160 }, 'drogg', 'droggNpc', {
			activeDuring: { objectives: ['meet-drogg-crossroads', 'track-the-boar-king'] }
		}),
		storyNpc('drogg-falls', { x: 2_700, y: 1_180 }, 'drogg', 'droggNpc', {
			activeDuring: { objectives: ['talk-to-drogg-falls', 'defeat-boar-king'] }
		}),
		storyNpc('borak-gate', { x: 2_720, y: 4_688 }, 'borak', 'borakNpc', {
			activeDuring: { quests: ['prologue-raid'] }
		}),
		storyNpc('drogg-well', { x: 1_504, y: 5_232 }, 'drogg', 'droggNpc', {
			activeDuring: { objectives: ['find-drogg', 'charge-the-captain'] }
		}),
		storyNpc(
			'tikka-captive',
			{ x: 1_380, y: 4_840 },
			'tikka',
			'tikkaNpc',
			during('charge-the-captain')
		),
		storyNpc(
			'lirra-captive',
			{ x: 1_630, y: 4_840 },
			'lirra',
			'lirraNpc',
			during('charge-the-captain')
		)
	],
	encounters: packs.map(({ encounter }) => encounter),
	combatBounds: packs.map(({ bounds }) => bounds),
	discoveries: [
		{ ...sign('boar-sign-hoofprints', { x: 4_940, y: 3_480 }), ...during('read-boar-signs') },
		{ ...sign('boar-sign-sapling', { x: 5_200, y: 2_200 }), ...during('read-boar-signs') },
		{ ...sign('boar-sign-tusk-scrape', { x: 4_800, y: 1_500 }), ...during('read-boar-signs') },
		{ ...sign('mistfen-pond-rest', { x: 1_560, y: 2_330 }), ...during('rest-at-the-pond') },
		{ ...sign('boar-king-trail', { x: 3_904, y: 2_620 }), ...during('track-the-boar-king') },
		{ ...sign('ridge-overlook', { x: 5_700, y: 2_000 }), ...during('climb-to-the-ridge') }
	],
	pickups: [
		{ x: 900, y: 2_250 },
		{ x: 380, y: 1_700 },
		{ x: 1_500, y: 1_550 },
		{ x: 2_100, y: 1_300 }
	].map((at, index) => ({
		id: `mistfen-moonmoss-${index + 1}`,
		...at,
		itemId: 'moonmoss',
		quantity: 1,
		...during('gather-moonmoss')
	})),
	blockers: [
		// The burning bridge seals Sundrop in during the raid and shut after it.
		{
			id: 'raid-bridge-fire',
			x: 3_040,
			y: 4_624,
			width: 320,
			height: 288,
			kind: 'future-gate',
			label: 'Burning bridge',
			activeDuring: storyWindows.afterRaid
		}
	]
};

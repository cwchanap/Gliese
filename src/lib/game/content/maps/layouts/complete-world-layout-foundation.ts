export const COMPLETE_WORLD_MAP_IDS = [
	'meadow-entry',
	'hero-house',
	'guild-hall',
	'item-shop',
	'villager-house-1',
	'villager-house-2',
	'villager-house-3',
	'shrine-of-aurora-interior',
	'ruins-threshold',
	'ruins-core'
] as const;

export type CompleteWorldMapId = (typeof COMPLETE_WORLD_MAP_IDS)[number];

export const COMPLETE_WORLD_LAYOUT_DECISIONS: Readonly<
	Record<
		CompleteWorldMapId,
		{ readonly action: 'preserve' | 'change'; readonly reasonIds: readonly string[] }
	>
> = Object.freeze({
	'meadow-entry': Object.freeze({
		action: 'change',
		reasonIds: Object.freeze(['continuous-watershed', 'crossing-route-network'])
	}),
	'hero-house': Object.freeze({
		action: 'preserve',
		reasonIds: Object.freeze(['existing-v2-room-program'])
	}),
	'guild-hall': Object.freeze({
		action: 'preserve',
		reasonIds: Object.freeze(['existing-v2-room-program'])
	}),
	'item-shop': Object.freeze({
		action: 'preserve',
		reasonIds: Object.freeze(['existing-v2-room-program'])
	}),
	'villager-house-1': Object.freeze({
		action: 'preserve',
		reasonIds: Object.freeze(['existing-v2-room-program'])
	}),
	'villager-house-2': Object.freeze({
		action: 'preserve',
		reasonIds: Object.freeze(['existing-v2-room-program'])
	}),
	'villager-house-3': Object.freeze({
		action: 'preserve',
		reasonIds: Object.freeze(['existing-v2-room-program'])
	}),
	'shrine-of-aurora-interior': Object.freeze({
		action: 'preserve',
		reasonIds: Object.freeze(['existing-v2-room-program'])
	}),
	'ruins-threshold': Object.freeze({
		action: 'preserve',
		reasonIds: Object.freeze(['expanded-puzzle-shell'])
	}),
	'ruins-core': Object.freeze({
		action: 'preserve',
		reasonIds: Object.freeze(['expanded-puzzle-shell'])
	})
});

import type {
	CoastDressingFrameName,
	CrossroadsDressingFrameName,
	coastDressingAsset,
	crossroadsDressingAsset,
	forestDressingAsset,
	ForestDressingFrameName,
	InteriorPropFrameName,
	marshDressingAsset,
	MarshDressingFrameName,
	NpcFrameName,
	shrineDressingAsset,
	ShrineDressingFrameName,
	TerrainTileFrameName,
	villageDressingAsset,
	VillageDressingFrameName
} from '$lib/game/content/assets';
import type { NpcDialogueId } from '$lib/game/content/dialogue';
import type { MapDefinition } from '$lib/game/core/types';
import type { MessageKey } from '$lib/game/i18n/translate';

export interface MapTransition {
	id: string;
	x: number;
	y: number;
	toMapId: string;
	requiresClear?: boolean;
	showMarker?: boolean;
	marker?: MapTransitionMarker;
	questRequirement?: {
		questId: string;
		objectiveId: string;
	};
	arrival?: {
		x: number;
		y: number;
		facing: WorldMapDefinition['spawnDirection'];
	};
}

export interface MapEncounter {
	id: string;
	x: number;
	y: number;
	enemyId: string;
	completion?: 'victory';
}

export interface MapPickup {
	id: string;
	x: number;
	y: number;
	itemId: string;
	quantity: number;
	label?: string;
}

export type MapNpcRole = 'guild' | 'shopkeeper' | 'villager' | 'home';

export interface MapNpc {
	id: string;
	x: number;
	y: number;
	nameKey: MessageKey;
	name: string;
	dialogueId: NpcDialogueId;
	role: MapNpcRole;
	frameName: NpcFrameName;
	shopId?: string;
}

export interface MapLandmark {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	labelKey: MessageKey;
	label: string;
}

export interface MapRect {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export type MapTransitionMarker = 'doorway' | 'stair';

export type MapGroundTile = TerrainTileFrameName;

export interface MapGroundPatch extends MapRect {
	tile: MapGroundTile;
}

export type MapBlockerKind =
	| 'city-wall'
	| 'town-hedge'
	| 'garden-hedge'
	| 'ruin-wall'
	| 'future-gate'
	| 'ocean';

export interface MapBlocker extends MapRect {
	kind: MapBlockerKind;
	label?: string;
}

export interface MapCombatBounds extends MapRect {
	encounterIds: string[];
	aggroRadius: number;
	leashRadius: number;
}

export interface MapForestZone extends MapRect {
	aggroRadius: number;
	leashRadius: number;
}

export type MapFenceSegment = MapRect;

export type MapDecorDepth = 'floor' | 'furniture' | 'foreground';

interface MapDecorBase extends MapRect {
	depth?: MapDecorDepth;
	mode?: 'image' | 'tile';
	collision?: MapRect;
	alpha?: number;
}

/**
 * Outdoor decoration, discriminated by `textureKey` so each sheet's `frameName`
 * is compile-checked against that sheet's frame set. A typo like
 * `frameName: 'toriii'` against the coast sheet fails to typecheck instead of
 * silently rendering the missing-texture box at runtime. To opt a new dressing
 * sheet into outdoor decor, add one union member here.
 */
export type MapDecor =
	| (MapDecorBase & {
			textureKey: (typeof coastDressingAsset)['key'];
			frameName: CoastDressingFrameName;
	  })
	| (MapDecorBase & {
			textureKey: (typeof shrineDressingAsset)['key'];
			frameName: ShrineDressingFrameName;
	  })
	| (MapDecorBase & {
			textureKey: (typeof marshDressingAsset)['key'];
			frameName: MarshDressingFrameName;
	  })
	| (MapDecorBase & {
			textureKey: (typeof crossroadsDressingAsset)['key'];
			frameName: CrossroadsDressingFrameName;
	  })
	| (MapDecorBase & {
			textureKey: (typeof forestDressingAsset)['key'];
			frameName: ForestDressingFrameName;
	  })
	| (MapDecorBase & {
			textureKey: (typeof villageDressingAsset)['key'];
			frameName: VillageDressingFrameName;
	  });

export type MapInteriorPropDepth = 'floor' | 'furniture' | 'foreground';

export interface MapInteriorProp extends MapRect {
	frameName: InteriorPropFrameName;
	depth?: MapInteriorPropDepth;
	collision?: MapRect;
}

export type MapAmbientNpcRole = 'guild-member' | 'shopper' | 'family' | 'neighbor';

export interface MapAmbientNpc {
	id: string;
	x: number;
	y: number;
	frameName: NpcFrameName;
	width?: number;
	height?: number;
	role?: MapAmbientNpcRole;
}

export type MapDiscoveryKind = 'sign' | 'lore' | 'vista' | 'warning' | 'foreshadow';

export interface MapDiscovery {
	id: string;
	x: number;
	y: number;
	/** Interact proximity in px (player center to discovery). Defaults to a WorldScene constant. */
	radius?: number;
	labelKey: MessageKey;
	descriptionKey: MessageKey;
	kind: MapDiscoveryKind;
	/** When true, becomes an area-map pin after it has been examined. */
	revealMarker?: boolean;
}

export interface WorldMapDefinition extends MapDefinition {
	spawn: {
		x: number;
		y: number;
	};
	transitions: MapTransition[];
	pickups?: MapPickup[];
	encounters?: MapEncounter[];
	npcs?: MapNpc[];
	landmarks?: MapLandmark[];
	forestZone?: MapForestZone;
	fences?: MapFenceSegment[];
	mapDecor?: MapDecor[];
	groundPatches?: MapGroundPatch[];
	blockers?: MapBlocker[];
	combatBounds?: MapCombatBounds[];
	interiorProps?: MapInteriorProp[];
	ambientNpcs?: MapAmbientNpc[];
	discoveries?: MapDiscovery[];
}

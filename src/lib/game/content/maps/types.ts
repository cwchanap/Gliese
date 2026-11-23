import type {
	InteriorPropFrameName,
	NpcFrameName,
	TerrainTileFrameName
} from '$lib/game/content/assets';
import type { GridBuildingType } from '$lib/game/content/maps/grid/buildings';
import type { LayoutRect } from '$lib/game/content/maps/layouts/layout-rects';
import type { QuestId } from '$lib/game/content/quests';
import type { MapDefinition } from '$lib/game/core/types';
import type { NavigationGrid } from '$lib/game/core/navigation';
import type { MessageKey } from '$lib/game/i18n/translate';

/** A span of the main story: any listed quest, or any listed objective. */
export interface StoryWindow {
	quests?: readonly QuestId[];
	objectives?: readonly string[];
}

/**
 * Story gating for map entries. An entry with `activeDuring` exists only inside
 * that window; one with `hiddenDuring` disappears inside it. See `core/story-gates.ts`.
 */
export interface StoryGated {
	activeDuring?: StoryWindow;
	hiddenDuring?: StoryWindow;
}

export interface MapTransition extends StoryGated {
	id: string;
	x: number;
	y: number;
	/**
	 * Authored doorway trigger geometry in top-left `x/y/width/height` pixels, taken
	 * straight from the interior layout (`doors.exterior`). Unlike `MapRect`, these
	 * coordinates are not centred — do not convert with `toMapRect`. A transition
	 * without it keeps the canonical 30px circle around `x/y`.
	 */
	triggerRect?: LayoutRect;
	toMapId: string;
	requiresClear?: boolean;
	showMarker?: boolean;
	marker?: MapTransitionMarker;
	arrival?: {
		x: number;
		y: number;
		facing: WorldMapDefinition['spawnDirection'];
	};
}

export interface MapEncounter extends StoryGated {
	id: string;
	x: number;
	y: number;
	enemyId: string;
	/** Enemies in the battle. Bosses always fight alone; unset rolls a random pack. */
	count?: number;
}

export interface MapPickup extends StoryGated {
	id: string;
	x: number;
	y: number;
	itemId: string;
	quantity: number;
	label?: string;
}

export type MapNpcRole = 'guild' | 'shopkeeper' | 'villager' | 'home';

export interface MapNpc extends StoryGated {
	id: string;
	x: number;
	y: number;
	nameKey: MessageKey;
	name: string;
	/** Story dialogue id; each one is placed on exactly one map. */
	dialogueId: string;
	role: MapNpcRole;
	frameName: NpcFrameName;
	shopId?: string;
}

export interface MapRect {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export type MapBackgroundPlane = 'base' | 'foreground';

export interface MapBackgroundImage extends MapRect {
	textureKey: string;
	plane: MapBackgroundPlane;
	drawOrder: number;
}

export type MapTransitionMarker = 'doorway' | 'stair';

export type MapGroundTile = TerrainTileFrameName;

export interface MapGroundPatch extends MapRect {
	tile: MapGroundTile;
	visual?: MapVisualOwnership;
}

export type MapBlockerKind = 'ruin-wall' | 'future-gate';

export interface MapVisualOwnerCrop {
	readonly cropId: string;
	readonly requiredBackgroundIds: readonly string[];
}

export type MapVisualOwnership =
	| { mode: 'always' }
	| { mode: 'fallback-only'; ownerCrops: readonly MapVisualOwnerCrop[] };

export type MapVisualSourceType = 'blocker' | 'ground-patch' | 'interior-prop';

export interface MapBlocker extends MapRect, StoryGated {
	kind: MapBlockerKind;
	label?: string;
	visual?: MapVisualOwnership;
}

export interface MapCombatBounds extends MapRect {
	encounterIds: string[];
	aggroRadius: number;
	leashRadius: number;
}

export type MapInteriorPropDepth = 'floor' | 'furniture' | 'foreground';

export interface MapInteriorProp extends MapRect {
	frameName: InteriorPropFrameName;
	depth?: MapInteriorPropDepth;
	collision?: MapRect;
	visual?: MapVisualOwnership;
}

export type MapAmbientNpcRole = 'guild-member' | 'shopper' | 'family' | 'neighbor';

export interface MapAmbientNpc extends StoryGated {
	id: string;
	x: number;
	y: number;
	frameName: NpcFrameName;
	width?: number;
	height?: number;
	role?: MapAmbientNpcRole;
}

export interface MapDiscovery extends StoryGated {
	id: string;
	x: number;
	y: number;
	/** Interact proximity in px (player center to discovery). Defaults to a WorldScene constant. */
	radius?: number;
	labelKey: MessageKey;
	/** Short examine text. Story discoveries play `sceneId` from `story/` instead. */
	descriptionKey?: MessageKey;
	sceneId?: string;
	/** When true, becomes an area-map pin after it has been examined. */
	revealMarker?: boolean;
}

export type NavigationGridOwnedSource = 'blocker' | 'interior-prop';

/** A building footprint on a text-grid map, in tiles. */
export interface MapGridBuilding {
	readonly id: string;
	readonly type: GridBuildingType;
	readonly col: number;
	readonly row: number;
	readonly width: number;
	readonly height: number;
}

/** A compiled text-grid map: one legend glyph per tile (see `content/maps/grid`). */
export interface MapTileGrid {
	readonly terrain: readonly string[];
	readonly buildings: readonly MapGridBuilding[];
}

/** Terrain that replaces the grid's tiles while its story window is open. */
export interface MapTileOverlay extends StoryGated {
	readonly id: string;
	readonly cells: readonly { readonly col: number; readonly row: number; readonly glyph: string }[];
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
	groundPatches?: MapGroundPatch[];
	blockers?: MapBlocker[];
	combatBounds?: MapCombatBounds[];
	interiorProps?: MapInteriorProp[];
	ambientNpcs?: MapAmbientNpc[];
	discoveries?: MapDiscovery[];
	backgroundImages?: MapBackgroundImage[];
	readonly navigationGrid?: NavigationGrid;
	readonly navigationGridOwnedSources?: readonly NavigationGridOwnedSource[];
	/** Text-grid maps draw and collide from this instead of ground patches and blockers. */
	readonly tileGrid?: MapTileGrid;
	tileOverlays?: MapTileOverlay[];
}

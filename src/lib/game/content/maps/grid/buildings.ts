/**
 * Building types a grid chunk can stamp. A building is a solid rectangle of one
 * glyph in the chunk's terrain; its footprint blocks movement and its door is an
 * anchor next to it.
 *
 * Each building is drawn as a sprite standing on its footprint (see `objects.ts`):
 * `frames` are the art variants, given out in turn to the buildings of that type;
 * `scale` is the sprite's width over the footprint's; `drop` is how far in px the
 * art's ground reaches below the footprint. `burning` is drawn instead while a story
 * overlay covers the footprint with fire (the raid).
 *
 * Sundrop's sacred tree is stamped like a building, so it is the only tree that
 * gets the landmark art.
 */
export interface GridBuildingArt {
	readonly frames: readonly string[];
	readonly burning?: string;
	readonly scale: number;
	readonly drop: number;
}

export const GRID_BUILDING_TYPES = {
	home: { frames: ['grik-home'], scale: 1.12, drop: 10 },
	'goblin-hut': {
		frames: ['hut-a', 'hut-b', 'hut-c'],
		burning: 'hut-burning',
		scale: 1.12,
		drop: 10
	},
	'small-hut': { frames: ['small-hut-b', 'small-hut-a'], scale: 1.2, drop: 6 },
	'hunters-lodge': { frames: ['lodge'], scale: 1.12, drop: 10 },
	'herb-hut': { frames: ['herb-hut'], scale: 1.12, drop: 10 },
	forge: { frames: ['forge'], scale: 1.12, drop: 10 },
	shrine: { frames: ['shrine'], scale: 1.12, drop: 10 },
	watchtower: { frames: ['watchtower'], scale: 1.5, drop: 4 },
	'sacred-tree': { frames: ['sacred-tree'], scale: 2.66, drop: 6 }
} as const satisfies Record<string, GridBuildingArt>;

export type GridBuildingType = keyof typeof GRID_BUILDING_TYPES;

export function isGridBuildingType(value: string): value is GridBuildingType {
	return Object.hasOwn(GRID_BUILDING_TYPES, value);
}

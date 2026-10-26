/**
 * Building types a grid chunk can stamp. A building is a solid rectangle of one
 * glyph in the chunk's terrain; its footprint blocks movement and its door is an
 * anchor next to it. Until building art exists, the world and the preview tool
 * draw each footprint as a flat box in its placeholder colour.
 */
export const GRID_BUILDING_TYPES = {
	home: { color: 0xc98b5e },
	'goblin-hut': { color: 0xa0764f },
	'small-hut': { color: 0x8a6a4a },
	'hunters-lodge': { color: 0x7a5636 },
	'herb-hut': { color: 0x6f8f4f },
	forge: { color: 0x5c5c66 },
	shrine: { color: 0xd98ca5 },
	watchtower: { color: 0x9a8a6a }
} as const satisfies Record<string, { readonly color: number }>;

export type GridBuildingType = keyof typeof GRID_BUILDING_TYPES;

export function isGridBuildingType(value: string): value is GridBuildingType {
	return Object.hasOwn(GRID_BUILDING_TYPES, value);
}

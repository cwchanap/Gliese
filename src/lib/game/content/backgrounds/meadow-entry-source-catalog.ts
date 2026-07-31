import { toRawPixelBounds } from '$lib/game/content/backgrounds/meadow-entry-authoring-geometry';
import { meadowBoundsRegion, meadowEntryMap } from '$lib/game/content/maps/meadow-entry';
import { coastRegion } from '$lib/game/content/maps/regions/coast';
import { crossroadsRegion } from '$lib/game/content/maps/regions/crossroads';
import { mistfenRegion } from '$lib/game/content/maps/regions/mistfen';
import { pathsRegion } from '$lib/game/content/maps/regions/paths';
import { silverpineRegion } from '$lib/game/content/maps/regions/silverpine';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';
import { villageRegion } from '$lib/game/content/maps/regions/village';
import { wildwoodRegion } from '$lib/game/content/maps/regions/wildwood';
import type { MapRect, WorldMapDefinition } from '$lib/game/content/maps/types';
import type { RawPixelBounds } from './meadow-entry-authoring-types';

export type MeadowEntrySourceType =
	| 'ground-patch'
	| 'blocker'
	| 'decor'
	| 'fence'
	| 'landmark'
	| 'transition'
	| 'npc'
	| 'ambient-npc'
	| 'pickup'
	| 'encounter'
	| 'combat-bounds'
	| 'discovery';

export interface MeadowEntrySourceRef {
	sourceType: MeadowEntrySourceType;
	sourceId: string;
}

type MeadowEntrySourceFragmentId =
	| 'village'
	| 'wildwood'
	| 'mistfen'
	| 'silverpine'
	| 'coast'
	| 'crossroads'
	| 'paths'
	| 'outer-boundary';

export interface MeadowEntrySourceRecord {
	ref: MeadowEntrySourceRef;
	fragmentId: MeadowEntrySourceFragmentId;
	bounds: RawPixelBounds | null;
	visualCapable: boolean;
}

interface IdentifiedSource {
	id: string;
}

interface SourceDefinition {
	sourceType: MeadowEntrySourceType;
	visualCapable: boolean;
	hasRectBounds: boolean;
	items(fragment: RegionFragment): readonly IdentifiedSource[];
	itemsFromMap(map: WorldMapDefinition): readonly IdentifiedSource[];
}

const meadowEntrySourceDefinitions: readonly SourceDefinition[] = [
	{
		sourceType: 'ground-patch',
		visualCapable: true,
		hasRectBounds: true,
		items: (fragment) => fragment.groundPatches ?? [],
		itemsFromMap: (map) => map.groundPatches ?? []
	},
	{
		sourceType: 'blocker',
		visualCapable: true,
		hasRectBounds: true,
		items: (fragment) => fragment.blockers ?? [],
		itemsFromMap: (map) => map.blockers ?? []
	},
	{
		sourceType: 'decor',
		visualCapable: true,
		hasRectBounds: true,
		items: (fragment) => fragment.mapDecor ?? [],
		itemsFromMap: (map) => map.mapDecor ?? []
	},
	{
		sourceType: 'fence',
		visualCapable: true,
		hasRectBounds: true,
		items: (fragment) => fragment.fences ?? [],
		itemsFromMap: (map) => map.fences ?? []
	},
	{
		sourceType: 'landmark',
		visualCapable: true,
		hasRectBounds: true,
		items: (fragment) => fragment.landmarks ?? [],
		itemsFromMap: (map) => map.landmarks ?? []
	},
	{
		sourceType: 'transition',
		visualCapable: true,
		hasRectBounds: false,
		items: (fragment) => fragment.transitions ?? [],
		itemsFromMap: (map) => map.transitions
	},
	{
		sourceType: 'npc',
		visualCapable: true,
		hasRectBounds: false,
		items: (fragment) => fragment.npcs ?? [],
		itemsFromMap: (map) => map.npcs ?? []
	},
	{
		sourceType: 'ambient-npc',
		visualCapable: true,
		hasRectBounds: false,
		items: (fragment) => fragment.ambientNpcs ?? [],
		itemsFromMap: (map) => map.ambientNpcs ?? []
	},
	{
		sourceType: 'pickup',
		visualCapable: true,
		hasRectBounds: false,
		items: (fragment) => fragment.pickups ?? [],
		itemsFromMap: (map) => map.pickups ?? []
	},
	{
		sourceType: 'encounter',
		visualCapable: false,
		hasRectBounds: false,
		items: (fragment) => fragment.encounters ?? [],
		itemsFromMap: (map) => map.encounters ?? []
	},
	{
		sourceType: 'combat-bounds',
		visualCapable: false,
		hasRectBounds: true,
		items: (fragment) => fragment.combatBounds ?? [],
		itemsFromMap: (map) => map.combatBounds ?? []
	},
	{
		sourceType: 'discovery',
		visualCapable: true,
		hasRectBounds: false,
		items: (fragment) => fragment.discoveries ?? [],
		itemsFromMap: (map) => map.discoveries ?? []
	}
];

const meadowEntryFragments: readonly {
	fragmentId: MeadowEntrySourceFragmentId;
	fragment: RegionFragment;
}[] = [
	{ fragmentId: 'village', fragment: villageRegion },
	{ fragmentId: 'wildwood', fragment: wildwoodRegion },
	{ fragmentId: 'mistfen', fragment: mistfenRegion },
	{ fragmentId: 'silverpine', fragment: silverpineRegion },
	{ fragmentId: 'coast', fragment: coastRegion },
	{ fragmentId: 'crossroads', fragment: crossroadsRegion },
	{ fragmentId: 'paths', fragment: pathsRegion },
	{ fragmentId: 'outer-boundary', fragment: meadowBoundsRegion }
];

export function meadowEntrySourceKey(ref: MeadowEntrySourceRef): string {
	return `${ref.sourceType}:${ref.sourceId}`;
}

function compareSourceRecords(
	left: MeadowEntrySourceRecord,
	right: MeadowEntrySourceRecord
): number {
	const leftKey = meadowEntrySourceKey(left.ref);
	const rightKey = meadowEntrySourceKey(right.ref);
	return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function assertCatalogIsUnique(catalog: readonly MeadowEntrySourceRecord[]): void {
	const keys = new Set<string>();
	for (const record of catalog) {
		const key = meadowEntrySourceKey(record.ref);
		if (keys.has(key)) {
			throw new Error(`meadow-entry source catalog has duplicate source key "${key}"`);
		}
		keys.add(key);
	}
}

function assertCatalogResolvesAgainstAssembledMap(
	catalog: readonly MeadowEntrySourceRecord[]
): void {
	for (const record of catalog) {
		const definition = meadowEntrySourceDefinitions.find(
			({ sourceType }) => sourceType === record.ref.sourceType
		);
		if (!definition) {
			throw new Error(`meadow-entry source catalog has unknown type "${record.ref.sourceType}"`);
		}
		if (!definition.itemsFromMap(meadowEntryMap).some(({ id }) => id === record.ref.sourceId)) {
			throw new Error(
				`meadow-entry source catalog cannot resolve "${meadowEntrySourceKey(record.ref)}" against meadowEntryMap`
			);
		}
	}
}

function buildMeadowEntrySourceCatalog(): readonly MeadowEntrySourceRecord[] {
	const catalog = meadowEntryFragments.flatMap(({ fragmentId, fragment }) =>
		meadowEntrySourceDefinitions.flatMap((definition) =>
			definition.items(fragment).map((source) => ({
				ref: { sourceType: definition.sourceType, sourceId: source.id },
				fragmentId,
				bounds: definition.hasRectBounds ? toRawPixelBounds(source as MapRect) : null,
				visualCapable: definition.visualCapable
			}))
		)
	);

	catalog.sort(compareSourceRecords);
	assertCatalogIsUnique(catalog);
	assertCatalogResolvesAgainstAssembledMap(catalog);
	return catalog;
}

const meadowEntrySourceCatalog = buildMeadowEntrySourceCatalog();

export function collectMeadowEntrySourceCatalog(): readonly MeadowEntrySourceRecord[] {
	return meadowEntrySourceCatalog;
}

export function resolveMeadowEntrySource(ref: MeadowEntrySourceRef): MeadowEntrySourceRecord {
	const record = meadowEntrySourceCatalog.find(
		(candidate) => meadowEntrySourceKey(candidate.ref) === meadowEntrySourceKey(ref)
	);
	if (!record) {
		throw new Error(`Unknown meadow-entry source "${meadowEntrySourceKey(ref)}"`);
	}
	return record;
}

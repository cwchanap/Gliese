import type { RegionalBackgroundPreloadAsset } from '$lib/game/content/assets';
import {
	applyVisualOwnership,
	type VisualOwnershipAssignment,
	validateMapBackgroundOwnership
} from '$lib/game/content/maps/background-ownership';
import type {
	MapBackgroundImage,
	MapVisualOwnership,
	MapVisualOwnerCrop,
	MapVisualSourceType,
	WorldMapDefinition
} from '$lib/game/content/maps/types';

export type MapBackgroundPackageMode = 'fallback' | 'review' | 'production';

export interface MapBackgroundVisualOwner {
	readonly sourceType: MapVisualSourceType;
	readonly sourceId: string;
	readonly ownerCrops: readonly MapVisualOwnerCrop[];
}

export interface MapBackgroundPackageDefinition {
	readonly id: string;
	readonly mapId: string;
	readonly coverage: 'full-map' | 'historical-partial';
	readonly assets: readonly RegionalBackgroundPreloadAsset[];
	readonly backgrounds: readonly MapBackgroundImage[];
	readonly visualOwners: readonly MapBackgroundVisualOwner[];
}

export interface MapBackgroundPackageSelection {
	readonly mode: MapBackgroundPackageMode;
	readonly definition: MapBackgroundPackageDefinition | null;
}

export interface MapBackgroundPackagePresentation {
	readonly packageId: string | null;
	readonly presentationMode: 'painted' | 'fallback';
	readonly coverage: 'full-map' | 'historical-partial' | null;
	readonly requiredBackgroundIds: readonly string[];
	readonly successfulBackgroundIds: readonly string[];
	readonly selectedBackgroundIds: readonly string[];
}

export interface ResolveMapBackgroundPackageInput {
	readonly mapId: string;
	readonly regionalBackgrounds: boolean;
	readonly reviewPackageIds: readonly string[];
	readonly defaultSelection: {
		readonly packageId: string;
		readonly mode: 'review' | 'production';
	} | null;
	readonly forcedFallback: boolean;
}

const PACKAGE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SOURCE_FIELDS = {
	blocker: 'blockers',
	decor: 'mapDecor',
	fence: 'fences',
	'ground-patch': 'groundPatches',
	'interior-prop': 'interiorProps'
} as const;

type SourceType = keyof typeof SOURCE_FIELDS;
type SourceField = (typeof SOURCE_FIELDS)[SourceType];

function uniqueStrings(values: readonly string[]): string[] {
	const unique = new Set<string>();
	for (const value of values) {
		if (unique.has(value)) continue;
		unique.add(value);
	}
	return [...unique];
}

function validBackgrounds(
	definition: MapBackgroundPackageDefinition,
	validateOwners = true
): definition is MapBackgroundPackageDefinition {
	if (
		!definition ||
		typeof definition !== 'object' ||
		typeof definition.id !== 'string' ||
		!PACKAGE_ID_PATTERN.test(definition.id) ||
		typeof definition.mapId !== 'string' ||
		definition.mapId.length === 0
	) {
		return false;
	}
	if (definition.coverage !== 'full-map' && definition.coverage !== 'historical-partial') {
		return false;
	}
	if (!Array.isArray(definition.assets) || !Array.isArray(definition.backgrounds)) return false;
	if (!Array.isArray(definition.visualOwners)) return false;

	const assetKeys = new Set<string>();
	for (const asset of definition.assets) {
		if (
			!asset ||
			typeof asset !== 'object' ||
			typeof asset.key !== 'string' ||
			asset.key.length === 0 ||
			typeof asset.path !== 'string' ||
			asset.path.length === 0 ||
			assetKeys.has(asset.key)
		) {
			return false;
		}
		assetKeys.add(asset.key);
	}

	const backgroundIds = new Set<string>();
	for (const background of definition.backgrounds) {
		if (
			!background ||
			typeof background !== 'object' ||
			typeof background.id !== 'string' ||
			background.id.length === 0 ||
			backgroundIds.has(background.id) ||
			typeof background.textureKey !== 'string' ||
			background.textureKey.length === 0
		) {
			return false;
		}
		backgroundIds.add(background.id);
	}

	const ownerIds = new Set<string>();
	for (const owner of definition.visualOwners) {
		if (
			!owner ||
			typeof owner !== 'object' ||
			typeof owner.sourceId !== 'string' ||
			owner.sourceId.length === 0 ||
			!Object.prototype.hasOwnProperty.call(SOURCE_FIELDS, owner.sourceType) ||
			!Array.isArray(owner.ownerCrops) ||
			(validateOwners && ownerIds.has(`${owner.sourceType}:${owner.sourceId}`))
		) {
			return false;
		}
		ownerIds.add(`${owner.sourceType}:${owner.sourceId}`);

		const cropIds = new Set<string>();
		for (const crop of owner.ownerCrops) {
			if (
				!crop ||
				typeof crop !== 'object' ||
				typeof crop.cropId !== 'string' ||
				crop.cropId.length === 0 ||
				(validateOwners && cropIds.has(crop.cropId)) ||
				!Array.isArray(crop.requiredBackgroundIds) ||
				crop.requiredBackgroundIds.length === 0
			) {
				return false;
			}
			cropIds.add(crop.cropId);
			const requiredIds = uniqueStrings(crop.requiredBackgroundIds);
			if (
				(validateOwners && requiredIds.length !== crop.requiredBackgroundIds.length) ||
				(validateOwners && requiredIds.some((id) => !backgroundIds.has(id)))
			) {
				return false;
			}
		}
	}

	return true;
}

function validRegistry(registry: readonly MapBackgroundPackageDefinition[]): boolean {
	const packageIds = new Set<string>();
	for (const definition of registry) {
		if (!validBackgrounds(definition) || packageIds.has(definition.id)) return false;
		packageIds.add(definition.id);
	}
	return true;
}

function fallbackSelection(): MapBackgroundPackageSelection {
	return { mode: 'fallback', definition: null };
}

/**
 * Resolves one package for one map. Review IDs are global URL requests, so IDs
 * belonging to other maps are ignored. A second matching package is rejected
 * instead of choosing whichever package happened to be registered first.
 */
export function resolveMapBackgroundPackageSelection(
	registry: readonly MapBackgroundPackageDefinition[],
	input: ResolveMapBackgroundPackageInput
): MapBackgroundPackageSelection {
	if (
		!validRegistry(registry) ||
		!input ||
		typeof input.mapId !== 'string' ||
		input.mapId.length === 0 ||
		!Array.isArray(input.reviewPackageIds) ||
		input.forcedFallback ||
		!input.regionalBackgrounds
	) {
		return fallbackSelection();
	}

	const byId = new Map(registry.map((definition) => [definition.id, definition]));
	const reviewIds = uniqueStrings(input.reviewPackageIds);
	if (reviewIds.some((id) => !PACKAGE_ID_PATTERN.test(id))) {
		return fallbackSelection();
	}

	const matchingReviewPackages: MapBackgroundPackageDefinition[] = [];
	for (const packageId of reviewIds) {
		const definition = byId.get(packageId);
		if (!definition) return fallbackSelection();
		if (definition.mapId === input.mapId) matchingReviewPackages.push(definition);
	}
	if (matchingReviewPackages.length > 1) return fallbackSelection();
	if (matchingReviewPackages.length === 1) {
		return { mode: 'review', definition: matchingReviewPackages[0]! };
	}

	const defaultSelection = input.defaultSelection;
	if (!defaultSelection) return fallbackSelection();
	if (
		typeof defaultSelection.packageId !== 'string' ||
		!PACKAGE_ID_PATTERN.test(defaultSelection.packageId) ||
		(defaultSelection.mode !== 'review' && defaultSelection.mode !== 'production')
	) {
		return fallbackSelection();
	}
	const definition = byId.get(defaultSelection.packageId);
	if (!definition || definition.mapId !== input.mapId) return fallbackSelection();
	return { mode: defaultSelection.mode, definition };
}

export function selectedMapBackgroundPackagesForPreload(
	registry: readonly MapBackgroundPackageDefinition[],
	inputs: readonly ResolveMapBackgroundPackageInput[]
): readonly MapBackgroundPackageDefinition[] {
	const selected = new Map<string, MapBackgroundPackageDefinition>();
	for (const input of inputs) {
		const selection = resolveMapBackgroundPackageSelection(registry, input);
		if (selection.definition) selected.set(selection.definition.id, selection.definition);
	}
	return Object.freeze([...selected.values()]);
}

function buildAssignments(
	definition: MapBackgroundPackageDefinition,
	sourceType: SourceType
): readonly VisualOwnershipAssignment[] {
	return definition.visualOwners
		.filter((owner) => owner.sourceType === sourceType)
		.map(({ sourceId, ownerCrops }) => ({
			sourceId,
			visual: {
				mode: 'fallback-only' as const,
				ownerCrops
			}
		}));
}

function applySourceOwnership(
	map: WorldMapDefinition,
	definition: MapBackgroundPackageDefinition,
	sourceType: SourceType,
	items: readonly { id: string; visual?: MapVisualOwnership }[]
): readonly { id: string; visual?: MapVisualOwnership }[] {
	return applyVisualOwnership(items, buildAssignments(definition, sourceType), {
		rejectExisting: true
	});
}

/**
 * Applies a selected package without mutating the authored map. Static source
 * arrays remain absent when they were absent on the source map; this keeps the
 * transform presentation-only and leaves collision/stateful records intact.
 */
export function applyMapBackgroundPackage(
	map: WorldMapDefinition,
	selection: MapBackgroundPackageSelection
): WorldMapDefinition {
	const definition = selection.definition;
	if (
		selection.mode === 'fallback' ||
		!definition ||
		definition.mapId !== map.id ||
		!validBackgrounds(definition, false)
	) {
		return map;
	}

	const sources = {
		blocker: map.blockers ?? [],
		decor: map.mapDecor ?? [],
		fence: map.fences ?? [],
		'ground-patch': map.groundPatches ?? [],
		'interior-prop': map.interiorProps ?? []
	} as const;

	const transformed: WorldMapDefinition = {
		...map,
		backgroundImages: [...definition.backgrounds]
	};

	for (const sourceType of Object.keys(SOURCE_FIELDS) as SourceType[]) {
		const field = SOURCE_FIELDS[sourceType] as SourceField;
		const original = map[field];
		if (original === undefined) {
			if (buildAssignments(definition, sourceType).length > 0) {
				applySourceOwnership(map, definition, sourceType, sources[sourceType]);
			}
			continue;
		}

		const updated = applySourceOwnership(map, definition, sourceType, sources[sourceType]);
		switch (field) {
			case 'blockers':
				transformed.blockers = updated as WorldMapDefinition['blockers'];
				break;
			case 'mapDecor':
				transformed.mapDecor = updated as WorldMapDefinition['mapDecor'];
				break;
			case 'fences':
				transformed.fences = updated as WorldMapDefinition['fences'];
				break;
			case 'groundPatches':
				transformed.groundPatches = updated as WorldMapDefinition['groundPatches'];
				break;
			case 'interiorProps':
				transformed.interiorProps = updated as WorldMapDefinition['interiorProps'];
				break;
		}
	}

	validateMapBackgroundOwnership(transformed);
	return transformed;
}

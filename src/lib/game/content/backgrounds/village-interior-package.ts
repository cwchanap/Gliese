import type { VillageInteriorLayout } from '$lib/game/content/maps/layouts/village-interiors-v2';
import type { NavigationGridOwnedSource, MapBackgroundImage } from '$lib/game/content/maps/types';
import type { NavigationMaskSource } from '$lib/game/core/navigation';
import type {
	MapBackgroundPackageDefinition,
	MapBackgroundVisualOwner
} from './map-background-package';

export type VillageInteriorMapId =
	| 'hero-house'
	| 'guild-hall'
	| 'item-shop'
	| 'villager-house-1'
	| 'villager-house-2'
	| 'villager-house-3'
	| 'shrine-of-aurora-interior';

export interface VillageInteriorImageManifest {
	readonly id: string;
	readonly textureKey: string;
	readonly path: string;
	readonly sha256: string;
}

export interface VillageInteriorPackageManifest {
	readonly version: 1;
	readonly mapId: VillageInteriorMapId;
	readonly dimensionsPx: { readonly width: number; readonly height: number };
	readonly base: VillageInteriorImageManifest;
	readonly foreground?: VillageInteriorImageManifest;
	readonly navigation: {
		readonly gridId: string;
		readonly cellSizePx: 16;
		readonly widthCells: number;
		readonly heightCells: number;
		readonly clearancePx: 12;
		readonly source: 'layout' | 'explicit-reviewed-override';
	};
}

export interface BuildVillageInteriorPackageInput {
	readonly mapId: VillageInteriorMapId;
	readonly layout: VillageInteriorLayout;
	readonly manifest: VillageInteriorPackageManifest;
	readonly visualOwners: readonly MapBackgroundVisualOwner[];
	readonly navigationSource: NavigationMaskSource;
}

export interface BuiltVillageInteriorPackage {
	readonly definition: MapBackgroundPackageDefinition;
	readonly navigationSource: NavigationMaskSource;
}

export const VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES = Object.freeze([
	'blocker',
	'interior-prop'
] as const satisfies readonly NavigationGridOwnedSource[]);

const NAVIGATION_CELL_SIZE_PX = 16;
const NAVIGATION_CLEARANCE_PX = 12;

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function assertPositiveInteger(value: number, label: string): void {
	assert(Number.isSafeInteger(value) && value > 0, `${label} must be a positive integer`);
}

function assertMapDimensions(
	layout: VillageInteriorLayout,
	manifest: VillageInteriorPackageManifest
) {
	const { width, height } = layout.fullFloor;
	assert(
		layout.fullFloor.x === 0 && layout.fullFloor.y === 0,
		'Interior fullFloor must start at 0,0'
	);
	assertPositiveInteger(width, 'Interior layout width');
	assertPositiveInteger(height, 'Interior layout height');
	assertPositiveInteger(manifest.dimensionsPx.width, 'Interior manifest width');
	assertPositiveInteger(manifest.dimensionsPx.height, 'Interior manifest height');
	assert(width === manifest.dimensionsPx.width, 'Interior layout and manifest widths differ');
	assert(height === manifest.dimensionsPx.height, 'Interior layout and manifest heights differ');
	assert(width % NAVIGATION_CELL_SIZE_PX === 0, 'Interior width must divide by 16');
	assert(height % NAVIGATION_CELL_SIZE_PX === 0, 'Interior height must divide by 16');
}

function assertNavigationRows(source: NavigationMaskSource): void {
	assert(source.rows.length === source.heightCells, 'Navigation source row count is invalid');
	for (const [rowIndex, row] of source.rows.entries()) {
		assert(row.length === source.widthCells, `Navigation source row ${rowIndex} width is invalid`);
		assert(
			[...row].every((glyph) => glyph === '.' || glyph === '#'),
			'Navigation source glyph is invalid'
		);
	}
}

function rectContainsCellCentre(
	rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
	column: number,
	row: number
): boolean {
	const centerX = column * NAVIGATION_CELL_SIZE_PX + NAVIGATION_CELL_SIZE_PX / 2;
	const centerY = row * NAVIGATION_CELL_SIZE_PX + NAVIGATION_CELL_SIZE_PX / 2;
	return (
		centerX >= rect.x &&
		centerX < rect.x + rect.width &&
		centerY >= rect.y &&
		centerY < rect.y + rect.height
	);
}

function deriveNavigationRows(
	layout: VillageInteriorLayout,
	widthCells: number,
	heightCells: number
): readonly string[] {
	const rows = Array.from({ length: heightCells }, () => Array<string>(widthCells).fill('.'));
	const blockingRects = [...layout.walls, ...Object.values(layout.propCollisions)];
	for (const blockingRect of blockingRects) {
		for (let row = 0; row < heightCells; row += 1) {
			for (let column = 0; column < widthCells; column += 1) {
				if (rectContainsCellCentre(blockingRect, column, row)) rows[row]![column] = '#';
			}
		}
	}
	return rows.map((row) => row.join(''));
}

function freezeNavigationSource(source: NavigationMaskSource): NavigationMaskSource {
	return Object.freeze({
		id: source.id,
		mapId: source.mapId,
		cellSizePx: source.cellSizePx,
		widthCells: source.widthCells,
		heightCells: source.heightCells,
		clearancePx: source.clearancePx,
		rows: Object.freeze([...source.rows])
	});
}

function assertNavigationSource(
	source: NavigationMaskSource,
	mapId: VillageInteriorMapId,
	widthPx: number,
	heightPx: number
): void {
	assert(source.id.length > 0, 'Navigation source id is required');
	assert(source.mapId === mapId, 'Navigation source map ID differs');
	assert(source.cellSizePx === NAVIGATION_CELL_SIZE_PX, 'Navigation source cell size must be 16');
	assert(
		source.widthCells === widthPx / NAVIGATION_CELL_SIZE_PX,
		'Navigation source width differs'
	);
	assert(
		source.heightCells === heightPx / NAVIGATION_CELL_SIZE_PX,
		'Navigation source height differs'
	);
	assert(source.clearancePx === NAVIGATION_CLEARANCE_PX, 'Navigation source clearance must be 12');
	assertNavigationRows(source);
}

function assertManifestImage(image: VillageInteriorImageManifest, label: string): void {
	assert(image.id.length > 0, `${label} image ID is required`);
	assert(image.textureKey.length > 0, `${label} texture key is required`);
	assert(image.path.length > 0, `${label} image path is required`);
}

function buildBackground(
	image: VillageInteriorImageManifest,
	width: number,
	height: number,
	plane: MapBackgroundImage['plane'],
	drawOrder: number
): MapBackgroundImage {
	return Object.freeze({
		id: image.id,
		x: width / 2,
		y: height / 2,
		width,
		height,
		textureKey: image.textureKey,
		plane,
		drawOrder
	});
}

function freezeVisualOwners(
	visualOwners: readonly MapBackgroundVisualOwner[]
): readonly MapBackgroundVisualOwner[] {
	return Object.freeze(
		visualOwners.map((owner) =>
			Object.freeze({
				sourceType: owner.sourceType,
				sourceId: owner.sourceId,
				ownerCrops: Object.freeze(
					owner.ownerCrops.map((crop) =>
						Object.freeze({
							cropId: crop.cropId,
							requiredBackgroundIds: Object.freeze([...crop.requiredBackgroundIds])
						})
					)
				)
			})
		)
	);
}

function assertUniqueVisualOwnerSourceIds(visualOwners: readonly MapBackgroundVisualOwner[]): void {
	const sourceIds = new Set<string>();
	for (const owner of visualOwners) {
		assert(owner.sourceId.length > 0, 'Visual owner source ID is required');
		assert(
			!sourceIds.has(owner.sourceId),
			`Visual owner source ID is duplicated: ${owner.sourceId}`
		);
		sourceIds.add(owner.sourceId);
	}
}

function assertNavigationManifest(
	manifest: VillageInteriorPackageManifest,
	source: NavigationMaskSource
): void {
	const navigation = manifest.navigation;
	assert(
		navigation.source === 'layout' || navigation.source === 'explicit-reviewed-override',
		'Navigation manifest source is invalid'
	);
	assert(navigation.gridId === source.id, 'Navigation manifest grid ID differs');
	assert(navigation.cellSizePx === source.cellSizePx, 'Navigation manifest cell size differs');
	assert(navigation.widthCells === source.widthCells, 'Navigation manifest width differs');
	assert(navigation.heightCells === source.heightCells, 'Navigation manifest height differs');
	assert(navigation.clearancePx === source.clearancePx, 'Navigation manifest clearance differs');
}

export function buildVillageInteriorNavigationSource(input: {
	readonly mapId: VillageInteriorMapId;
	readonly layout: VillageInteriorLayout;
	readonly navigationOverride?: NavigationMaskSource;
}): NavigationMaskSource {
	const widthPx = input.layout.fullFloor.width;
	const heightPx = input.layout.fullFloor.height;
	assertPositiveInteger(widthPx, 'Interior layout width');
	assertPositiveInteger(heightPx, 'Interior layout height');
	assert(
		input.layout.fullFloor.x === 0 && input.layout.fullFloor.y === 0,
		'Interior fullFloor must start at 0,0'
	);
	assert(widthPx % NAVIGATION_CELL_SIZE_PX === 0, 'Interior width must divide by 16');
	assert(heightPx % NAVIGATION_CELL_SIZE_PX === 0, 'Interior height must divide by 16');

	const widthCells = widthPx / NAVIGATION_CELL_SIZE_PX;
	const heightCells = heightPx / NAVIGATION_CELL_SIZE_PX;
	if (input.navigationOverride) {
		assertNavigationSource(input.navigationOverride, input.mapId, widthPx, heightPx);
		return freezeNavigationSource(input.navigationOverride);
	}

	return freezeNavigationSource({
		id: `${input.mapId}-navigation`,
		mapId: input.mapId,
		cellSizePx: NAVIGATION_CELL_SIZE_PX,
		widthCells,
		heightCells,
		clearancePx: NAVIGATION_CLEARANCE_PX,
		rows: deriveNavigationRows(input.layout, widthCells, heightCells)
	});
}

export function buildVillageInteriorPackage(
	input: BuildVillageInteriorPackageInput
): BuiltVillageInteriorPackage {
	assert(input.manifest.version === 1, 'Interior manifest version is unsupported');
	assert(input.manifest.mapId === input.mapId, 'Interior manifest map ID differs');
	assertMapDimensions(input.layout, input.manifest);
	assertManifestImage(input.manifest.base, 'Base');
	if (input.manifest.foreground) assertManifestImage(input.manifest.foreground, 'Foreground');
	if (input.manifest.foreground) {
		assert(
			input.manifest.foreground.id !== input.manifest.base.id,
			'Interior image IDs must be unique'
		);
		assert(
			input.manifest.foreground.textureKey !== input.manifest.base.textureKey,
			'Interior texture keys must be unique'
		);
	}

	assertNavigationSource(
		input.navigationSource,
		input.mapId,
		input.manifest.dimensionsPx.width,
		input.manifest.dimensionsPx.height
	);
	assertNavigationManifest(input.manifest, input.navigationSource);
	if (input.manifest.navigation.source === 'layout') {
		const derived = buildVillageInteriorNavigationSource({
			mapId: input.mapId,
			layout: input.layout
		});
		assert(
			input.navigationSource.id === derived.id,
			'Layout navigation source ID does not match the derived source'
		);
		assert(
			JSON.stringify(derived.rows) === JSON.stringify(input.navigationSource.rows),
			'Layout navigation source does not match the derived source'
		);
	}
	assertUniqueVisualOwnerSourceIds(input.visualOwners);

	const backgrounds = [
		buildBackground(
			input.manifest.base,
			input.manifest.dimensionsPx.width,
			input.manifest.dimensionsPx.height,
			'base',
			0
		),
		...(input.manifest.foreground
			? [
					buildBackground(
						input.manifest.foreground,
						input.manifest.dimensionsPx.width,
						input.manifest.dimensionsPx.height,
						'foreground',
						1
					)
				]
			: [])
	];
	const assets = [
		{ key: input.manifest.base.textureKey, path: input.manifest.base.path },
		...(input.manifest.foreground
			? [{ key: input.manifest.foreground.textureKey, path: input.manifest.foreground.path }]
			: [])
	].map((asset) => Object.freeze(asset));
	const definition = Object.freeze({
		id: `${input.mapId}-painted`,
		mapId: input.mapId,
		coverage: 'full-map' as const,
		assets: Object.freeze(assets),
		backgrounds: Object.freeze(backgrounds),
		visualOwners: freezeVisualOwners(input.visualOwners)
	});

	return Object.freeze({
		definition,
		navigationSource: freezeNavigationSource(input.navigationSource)
	});
}

export type { VillageInteriorLayout };

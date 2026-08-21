import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { sundropVillageBackgroundsApproval } from '$lib/game/content/approvals/sundrop-village-backgrounds';
import { VILLAGE_ART_CONTROL_FILENAMES } from '$lib/game/content/maps/layered/village-art-controls';
import { meadowEntryMap } from '$lib/game/content/maps/meadow-entry';
import type { MapRect, WorldMapDefinition } from '$lib/game/content/maps/types';
import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import { collectLandmarkRects, collectStrictCollisionRects } from '$lib/game/save/save-state';

import {
	MEADOW_ENTRY_AUTHORING_REGIONS,
	MEADOW_ENTRY_CROSS_REGION_COVERAGE,
	MEADOW_ENTRY_OUTLIER_RESOLUTIONS,
	MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS,
	type MeadowEntryAuthoringRegion,
	type MeadowEntryAuthoringRegionId,
	type MeadowEntryOutlierResolution
} from './meadow-entry-authoring-layout';
import type { PixelBounds } from './meadow-entry-authoring-types';
import {
	MEADOW_ENTRY_PAINTED_V2_BAKE_OWNERSHIP,
	MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX,
	type MeadowEntryBakeOwnershipEntry
} from './meadow-entry-bake-ownership';
import {
	validateMeadowEntryCropContract,
	type MeadowEntryApprovedCrop,
	type MeadowEntryCropBudgetSummary,
	type MeadowEntryOverlap,
	type MeadowEntryRuntimeCoverage
} from './meadow-entry-crop-manifest';
import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_BUDGET_SUMMARY,
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE,
	MEADOW_ENTRY_PAINTED_V2_PILOT_FALLBACK_REQUIREMENTS
} from './meadow-entry-painted-v2-crop-manifest';
import { MEADOW_ENTRY_PAINTED_V2_ART_STORAGE } from './meadow-entry-storage';
import {
	MEADOW_ENTRY_MIN_HANDOFF_PX,
	MEADOW_ENTRY_TILE_SIZE_PX,
	MEADOW_ENTRY_WORLD_BOUNDS,
	boundsArea,
	intersectBounds,
	rasterizeCoverageBounds,
	unionArea
} from './meadow-entry-authoring-geometry';
import {
	collectMeadowEntrySourceCatalog,
	meadowEntrySourceKey,
	type MeadowEntrySourceRecord,
	type MeadowEntrySourceType
} from './meadow-entry-source-catalog';

const MASK_WIDTH = 6_400 as const;
const MASK_HEIGHT = 6_400 as const;

export interface MeadowEntryRasterMask {
	width: 6400;
	height: 6400;
	alpha: Buffer;
}

export interface MeadowEntryControlClearance {
	id: string;
	kind:
		| 'spawn'
		| 'transition'
		| 'npc'
		| 'ambient-npc'
		| 'pickup'
		| 'encounter'
		| 'combat-bounds'
		| 'discovery';
	bounds: PixelBounds;
}

export interface MeadowEntryRendererMaskMaterialContract {
	version: 1;
	implementationSha256: string;
	maskDimensionsPx: { width: 6400; height: 6400 };
	pointExtentsPx: {
		spawn: { width: 96; height: 96 };
		transition: { width: 96; height: 96 };
		npc: { width: 96; height: 87 };
		ambientNpcDefault: { width: 96; height: 87 };
		pickup: { width: 48; height: 48 };
		encounter: { width: 96; height: 96 };
		discoveryDefaultDiameter: 96;
	};
	collisionExpansionPx: 12;
	walkableSpaceTileSizePx: 32;
	walkableSpaceRule: 'tile-forbidden-unless-player-expanded-collision-union-covers-it';
	foregroundRule: 'explicit-base-and-foreground-minus-forbidden-and-protected';
	protectedRule: 'protected-live-source-bounds-plus-reviewed-margins';
	rasterizationRule: 'raw-center-edges-floor-left-top-ceil-right-bottom';
	clippingRule: 'half-open-clamp-to-0-6400';
	materialProfiles: Readonly<Record<MeadowEntryAuthoringRegionId, string>>;
}

export interface MeadowEntryControlInputs {
	mapId: 'meadow-entry';
	worldBounds: PixelBounds;
	tileSizePx: 32;
	playerCollisionRadiusPx: 12;
	foregroundFrontCutoffPx: 33;
	sourceCatalog: readonly MeadowEntrySourceRecord[];
	authoringRegions: readonly MeadowEntryAuthoringRegion[];
	primarySourceOwners: Readonly<Record<string, MeadowEntryAuthoringRegionId>>;
	outlierResolutions: readonly MeadowEntryOutlierResolution[];
	bakeOwnership: readonly MeadowEntryBakeOwnershipEntry[];
	crops: readonly MeadowEntryApprovedCrop[];
	overlaps: readonly MeadowEntryOverlap[];
	runtimeCoverage: readonly MeadowEntryRuntimeCoverage[];
	cropBudgetSummary: MeadowEntryCropBudgetSummary;
	strictCollisionRects: readonly PixelBounds[];
	landmarkCollisionRects: readonly PixelBounds[];
	walkableSpaceRects: readonly PixelBounds[];
	protectedRects: readonly PixelBounds[];
	controlClearanceRects: readonly MeadowEntryControlClearance[];
	rendererMaskMaterialContract: MeadowEntryRendererMaskMaterialContract;
	predecessor: {
		hpa307ArtifactHashes: Readonly<Record<string, string>>;
		hpa398ControlFingerprint: string;
		hpa398BaseSha256: string;
		hpa398ForegroundSha256: string;
	};
	storage: typeof MEADOW_ENTRY_PAINTED_V2_ART_STORAGE;
	sourceFileHashes: Readonly<Record<string, string>>;
}

export const MEADOW_ENTRY_CONTROL_FILENAMES = [
	'meadow-entry-control-manifest.json',
	'meadow-entry-composite-control.svg',
	'meadow-entry-terrain-path-mask.svg',
	'meadow-entry-region-mask.svg',
	'meadow-entry-collision-mask.svg',
	'meadow-entry-building-footprint-mask.svg',
	'meadow-entry-entrance-transition-mask.svg',
	'meadow-entry-encounter-combat-mask.svg',
	'meadow-entry-reward-discovery-mask.svg',
	'meadow-entry-semantic-anchor-mask.svg',
	'meadow-entry-protected-live-mask.svg',
	'meadow-entry-forbidden-tall-mask.svg',
	'meadow-entry-foreground-eligible-mask.svg',
	'meadow-entry-handoff-mask.svg',
	'meadow-entry-runtime-base-coverage-mask.svg',
	'meadow-entry-runtime-fallback-coverage-mask.svg',
	'meadow-entry-bake-ownership.json',
	'meadow-entry-crop-manifest.json'
] as const;

export const MEADOW_ENTRY_CONTROL_SOURCE_FILE_PATHS = [
	'src/lib/game/content/maps/meadow-entry.ts',
	'src/lib/game/content/maps/regions/village.ts',
	'src/lib/game/content/maps/regions/wildwood.ts',
	'src/lib/game/content/maps/regions/mistfen.ts',
	'src/lib/game/content/maps/regions/silverpine.ts',
	'src/lib/game/content/maps/regions/coast.ts',
	'src/lib/game/content/maps/regions/crossroads.ts',
	'src/lib/game/content/maps/regions/paths.ts',
	'src/lib/game/content/maps/regions/river-system.ts',
	'src/lib/game/content/maps/blocker-rendering.ts',
	'src/lib/game/save/save-state.ts',
	'src/lib/game/core/collision.ts'
] as const;

const POINT_EXTENTS_PX = {
	spawn: { width: 96, height: 96 },
	transition: { width: 96, height: 96 },
	npc: { width: 96, height: 87 },
	ambientNpcDefault: { width: 96, height: 87 },
	pickup: { width: 48, height: 48 },
	encounter: { width: 96, height: 96 },
	discoveryDefaultDiameter: 96
} as const;

interface SvgRect {
	id: string;
	bounds: PixelBounds;
	fill: string;
	opacity?: number;
	stroke?: string;
	attributes?: Readonly<Record<string, string | number>>;
}

function sha256(value: Uint8Array | string): string {
	return createHash('sha256').update(value).digest('hex');
}

function compareCodePoints(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function stable(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
	if (value && typeof value === 'object') {
		return `{${Object.entries(value as Record<string, unknown>)
			.sort(([left], [right]) => compareCodePoints(left, right))
			.map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
			.join(',')}}`;
	}
	if (value === undefined) return 'undefined';
	return JSON.stringify(value);
}

function prettyJson(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}

function clampBounds(bounds: PixelBounds): PixelBounds | null {
	const clamped = {
		left: Math.max(MEADOW_ENTRY_WORLD_BOUNDS.left, Math.floor(bounds.left)),
		top: Math.max(MEADOW_ENTRY_WORLD_BOUNDS.top, Math.floor(bounds.top)),
		right: Math.min(MEADOW_ENTRY_WORLD_BOUNDS.right, Math.ceil(bounds.right)),
		bottom: Math.min(MEADOW_ENTRY_WORLD_BOUNDS.bottom, Math.ceil(bounds.bottom))
	};
	return clamped.left < clamped.right && clamped.top < clamped.bottom ? clamped : null;
}

function rectBounds(rect: Pick<MapRect, 'x' | 'y' | 'width' | 'height'>): PixelBounds {
	return rasterizeCoverageBounds({
		left: rect.x - rect.width / 2,
		top: rect.y - rect.height / 2,
		right: rect.x + rect.width / 2,
		bottom: rect.y + rect.height / 2
	});
}

function expandBounds(
	bounds: PixelBounds,
	margins: {
		readonly top: number;
		readonly right: number;
		readonly bottom: number;
		readonly left: number;
	}
): PixelBounds | null {
	return clampBounds({
		left: bounds.left - margins.left,
		top: bounds.top - margins.top,
		right: bounds.right + margins.right,
		bottom: bounds.bottom + margins.bottom
	});
}

function collisionBounds(rect: Pick<MapRect, 'x' | 'y' | 'width' | 'height'>): PixelBounds {
	const expanded = clampBounds({
		left: rect.x - rect.width / 2 - PLAYER_COLLISION_RADIUS,
		top: rect.y - rect.height / 2 - PLAYER_COLLISION_RADIUS,
		right: rect.x + rect.width / 2 + PLAYER_COLLISION_RADIUS,
		bottom: rect.y + rect.height / 2 + PLAYER_COLLISION_RADIUS
	});
	if (!expanded) throw new Error('Meadow-entry collision rectangle is outside the world');
	return expanded;
}

function collisionUnionCoversBounds(
	bounds: PixelBounds,
	collisionRects: readonly PixelBounds[]
): boolean {
	const clipped = collisionRects.flatMap((collision) => {
		const intersection = intersectBounds(bounds, collision);
		return intersection ? [intersection] : [];
	});
	return unionArea(clipped) === boundsArea(bounds);
}

function buildWalkableSpaceRects(
	worldBounds: PixelBounds,
	tileSizePx: number,
	collisionRects: readonly PixelBounds[]
): readonly PixelBounds[] {
	const width = worldBounds.right - worldBounds.left;
	const height = worldBounds.bottom - worldBounds.top;
	if (width % tileSizePx !== 0 || height % tileSizePx !== 0) {
		throw new Error('Meadow-entry world bounds must align to the walkable-space tile size');
	}

	const columnCount = width / tileSizePx;
	const rowCount = height / tileSizePx;
	const collisionRectsByTile: Array<PixelBounds[] | undefined> = new Array(columnCount * rowCount);
	for (const collision of collisionRects) {
		const firstColumn = Math.max(0, Math.floor((collision.left - worldBounds.left) / tileSizePx));
		const lastColumn = Math.min(
			columnCount - 1,
			Math.ceil((collision.right - worldBounds.left) / tileSizePx) - 1
		);
		const firstRow = Math.max(0, Math.floor((collision.top - worldBounds.top) / tileSizePx));
		const lastRow = Math.min(
			rowCount - 1,
			Math.ceil((collision.bottom - worldBounds.top) / tileSizePx) - 1
		);
		for (let row = firstRow; row <= lastRow; row += 1) {
			for (let column = firstColumn; column <= lastColumn; column += 1) {
				const index = row * columnCount + column;
				(collisionRectsByTile[index] ??= []).push(collision);
			}
		}
	}
	const output: PixelBounds[] = [];
	let activeRuns = new Map<string, PixelBounds>();

	for (let row = 0; row < rowCount; row += 1) {
		const top = worldBounds.top + row * tileSizePx;
		const bottom = top + tileSizePx;
		const rowRuns: Array<{ left: number; right: number }> = [];
		let runLeft: number | null = null;

		for (let column = 0; column < columnCount; column += 1) {
			const left = worldBounds.left + column * tileSizePx;
			const right = left + tileSizePx;
			const tile = { left, top, right, bottom };
			const fullyBlocked = collisionUnionCoversBounds(
				tile,
				collisionRectsByTile[row * columnCount + column] ?? []
			);

			if (!fullyBlocked && runLeft === null) runLeft = left;
			if (fullyBlocked && runLeft !== null) {
				rowRuns.push({ left: runLeft, right: left });
				runLeft = null;
			}
		}
		if (runLeft !== null) rowRuns.push({ left: runLeft, right: worldBounds.right });

		const nextRuns = new Map<string, PixelBounds>();
		for (const run of rowRuns) {
			const key = `${run.left}:${run.right}`;
			const active = activeRuns.get(key);
			if (active?.bottom === top) {
				active.bottom = bottom;
				nextRuns.set(key, active);
				continue;
			}
			const created = { left: run.left, top, right: run.right, bottom };
			output.push(created);
			nextRuns.set(key, created);
		}
		activeRuns = nextRuns;
	}

	return output.sort(
		(left, right) =>
			left.top - right.top ||
			left.left - right.left ||
			left.bottom - right.bottom ||
			left.right - right.right
	);
}

function pointSourceRect(
	map: WorldMapDefinition,
	sourceType: MeadowEntrySourceType,
	sourceId: string,
	contract: MeadowEntryRendererMaskMaterialContract
): MapRect | null {
	if (sourceType === 'transition') {
		const item = map.transitions.find(({ id }) => id === sourceId);
		return item
			? { id: item.id, x: item.x, y: item.y, ...contract.pointExtentsPx.transition }
			: null;
	}
	if (sourceType === 'npc') {
		const item = map.npcs?.find(({ id }) => id === sourceId);
		return item ? { id: item.id, x: item.x, y: item.y, ...contract.pointExtentsPx.npc } : null;
	}
	if (sourceType === 'ambient-npc') {
		const item = map.ambientNpcs?.find(({ id }) => id === sourceId);
		return item
			? {
					id: item.id,
					x: item.x,
					y: item.y,
					width: item.width ?? contract.pointExtentsPx.ambientNpcDefault.width,
					height: item.height ?? contract.pointExtentsPx.ambientNpcDefault.height
				}
			: null;
	}
	if (sourceType === 'pickup') {
		const item = map.pickups?.find(({ id }) => id === sourceId);
		return item ? { id: item.id, x: item.x, y: item.y, ...contract.pointExtentsPx.pickup } : null;
	}
	if (sourceType === 'encounter') {
		const item = map.encounters?.find(({ id }) => id === sourceId);
		return item
			? { id: item.id, x: item.x, y: item.y, ...contract.pointExtentsPx.encounter }
			: null;
	}
	if (sourceType === 'discovery') {
		const item = map.discoveries?.find(({ id }) => id === sourceId);
		const radius = item?.radius ?? contract.pointExtentsPx.discoveryDefaultDiameter / 2;
		return item
			? { id: item.id, x: item.x, y: item.y, width: radius * 2, height: radius * 2 }
			: null;
	}
	return null;
}

function sourceBounds(
	map: WorldMapDefinition,
	record: MeadowEntrySourceRecord,
	contract: MeadowEntryRendererMaskMaterialContract
): PixelBounds | null {
	if (record.bounds !== null) return rasterizeCoverageBounds(record.bounds);
	const pointRect = pointSourceRect(map, record.ref.sourceType, record.ref.sourceId, contract);
	return pointRect ? rectBounds(pointRect) : null;
}

function buildProtectedRects(
	map: WorldMapDefinition,
	catalog: readonly MeadowEntrySourceRecord[],
	ownership: readonly MeadowEntryBakeOwnershipEntry[],
	contract: MeadowEntryRendererMaskMaterialContract
): readonly PixelBounds[] {
	const catalogByKey = new Map(catalog.map((record) => [meadowEntrySourceKey(record.ref), record]));
	return ownership.flatMap((entry) => {
		if (entry.disposition.mode !== 'protected-live') return [];
		const key = meadowEntrySourceKey(entry.ref);
		const record = catalogByKey.get(key);
		if (!record) throw new Error(`Missing protected meadow-entry source "${key}"`);
		const bounds = sourceBounds(map, record, contract);
		if (!bounds) throw new Error(`Protected meadow-entry source has no raster extent "${key}"`);
		const expanded = expandBounds(bounds, entry.disposition.protectionMargins);
		if (!expanded) throw new Error(`Protected meadow-entry source leaves the world "${key}"`);
		return [expanded];
	});
}

function hashFiles(
	repositoryRoot: string,
	paths: readonly string[]
): Readonly<Record<string, string>> {
	return Object.freeze(
		Object.fromEntries(
			paths.map((path) => [path, sha256(readFileSync(join(repositoryRoot, path)))])
		)
	);
}

function buildRendererMaskMaterialContract(
	repositoryRoot: string
): MeadowEntryRendererMaskMaterialContract {
	return {
		version: 1,
		implementationSha256: sha256(
			readFileSync(
				join(repositoryRoot, 'src/lib/game/content/backgrounds/meadow-entry-controls.ts')
			)
		),
		maskDimensionsPx: { width: MASK_WIDTH, height: MASK_HEIGHT },
		pointExtentsPx: POINT_EXTENTS_PX,
		collisionExpansionPx: PLAYER_COLLISION_RADIUS,
		walkableSpaceTileSizePx: MEADOW_ENTRY_TILE_SIZE_PX,
		walkableSpaceRule: 'tile-forbidden-unless-player-expanded-collision-union-covers-it',
		foregroundRule: 'explicit-base-and-foreground-minus-forbidden-and-protected',
		protectedRule: 'protected-live-source-bounds-plus-reviewed-margins',
		rasterizationRule: 'raw-center-edges-floor-left-top-ceil-right-bottom',
		clippingRule: 'half-open-clamp-to-0-6400',
		materialProfiles: Object.fromEntries(
			MEADOW_ENTRY_AUTHORING_REGIONS.map(({ id, materialProfile }) => [id, materialProfile])
		) as Record<MeadowEntryAuthoringRegionId, string>
	};
}

function buildControlClearanceRects(
	map: WorldMapDefinition,
	catalog: readonly MeadowEntrySourceRecord[],
	contract: MeadowEntryRendererMaskMaterialContract
): readonly MeadowEntryControlClearance[] {
	const controlledTypes = new Set<MeadowEntryControlClearance['kind']>([
		'transition',
		'npc',
		'ambient-npc',
		'pickup',
		'encounter',
		'combat-bounds',
		'discovery'
	]);
	const clearances: MeadowEntryControlClearance[] = [
		{
			id: 'spawn:player',
			kind: 'spawn',
			bounds: rectBounds({ ...map.spawn, ...contract.pointExtentsPx.spawn })
		}
	];
	for (const record of catalog) {
		const kind = record.ref.sourceType as MeadowEntryControlClearance['kind'];
		if (!controlledTypes.has(kind)) continue;
		const bounds = sourceBounds(map, record, contract);
		if (!bounds) {
			throw new Error(
				`Control clearance source has no raster extent "${meadowEntrySourceKey(record.ref)}"`
			);
		}
		clearances.push({ id: meadowEntrySourceKey(record.ref), kind, bounds });
	}
	return clearances.sort((left, right) => compareCodePoints(left.id, right.id));
}

export function buildMeadowEntryControlInputs(
	repositoryRoot = process.cwd()
): MeadowEntryControlInputs {
	validateMeadowEntryCropContract({
		crops: MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
		overlaps: MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS,
		runtimeCoverage: MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE,
		budgetSummary: MEADOW_ENTRY_PAINTED_V2_PILOT_BUDGET_SUMMARY,
		bakeOwnership: MEADOW_ENTRY_PAINTED_V2_BAKE_OWNERSHIP,
		requiredFallbacks: MEADOW_ENTRY_PAINTED_V2_PILOT_FALLBACK_REQUIREMENTS,
		coverageMode: 'partial'
	});
	const sourceCatalog = collectMeadowEntrySourceCatalog();
	const rendererMaskMaterialContract = buildRendererMaskMaterialContract(repositoryRoot);
	const strictCollisionRects = collectStrictCollisionRects(meadowEntryMap).map(collisionBounds);
	const landmarkCollisionRects = collectLandmarkRects(meadowEntryMap).map(collisionBounds);
	if (MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX !== 33) {
		throw new Error('Meadow-entry foreground cutoff has drifted from the reviewed 33px contract');
	}
	return {
		mapId: 'meadow-entry',
		worldBounds: MEADOW_ENTRY_WORLD_BOUNDS,
		tileSizePx: MEADOW_ENTRY_TILE_SIZE_PX,
		playerCollisionRadiusPx: PLAYER_COLLISION_RADIUS,
		foregroundFrontCutoffPx: MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX as 33,
		sourceCatalog,
		authoringRegions: MEADOW_ENTRY_AUTHORING_REGIONS,
		primarySourceOwners: MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS,
		outlierResolutions: MEADOW_ENTRY_OUTLIER_RESOLUTIONS,
		bakeOwnership: MEADOW_ENTRY_PAINTED_V2_BAKE_OWNERSHIP,
		crops: MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
		overlaps: MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS,
		runtimeCoverage: MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE,
		cropBudgetSummary: MEADOW_ENTRY_PAINTED_V2_PILOT_BUDGET_SUMMARY,
		strictCollisionRects,
		landmarkCollisionRects,
		walkableSpaceRects: buildWalkableSpaceRects(
			MEADOW_ENTRY_WORLD_BOUNDS,
			MEADOW_ENTRY_TILE_SIZE_PX,
			[...strictCollisionRects, ...landmarkCollisionRects]
		),
		protectedRects: buildProtectedRects(
			meadowEntryMap,
			sourceCatalog,
			MEADOW_ENTRY_PAINTED_V2_BAKE_OWNERSHIP,
			rendererMaskMaterialContract
		),
		controlClearanceRects: buildControlClearanceRects(
			meadowEntryMap,
			sourceCatalog,
			rendererMaskMaterialContract
		),
		rendererMaskMaterialContract,
		predecessor: {
			hpa307ArtifactHashes: hashFiles(
				repositoryRoot,
				VILLAGE_ART_CONTROL_FILENAMES.map(
					(filename) => `docs/superpowers/reports/img/hpa-307/${filename}`
				)
			),
			hpa398ControlFingerprint: sundropVillageBackgroundsApproval.approvedControlFingerprint,
			hpa398BaseSha256: sundropVillageBackgroundsApproval.base.approvedPngSha256,
			hpa398ForegroundSha256: sundropVillageBackgroundsApproval.foreground.approvedPngSha256
		},
		storage: MEADOW_ENTRY_PAINTED_V2_ART_STORAGE,
		sourceFileHashes: hashFiles(repositoryRoot, MEADOW_ENTRY_CONTROL_SOURCE_FILE_PATHS)
	};
}

function sortedSourceCatalog(input: MeadowEntryControlInputs): readonly MeadowEntrySourceRecord[] {
	return [...input.sourceCatalog].sort((left, right) =>
		compareCodePoints(meadowEntrySourceKey(left.ref), meadowEntrySourceKey(right.ref))
	);
}

function sortedById<T extends { readonly id: string }>(
	items: readonly T[] | undefined
): readonly T[] {
	return [...(items ?? [])].sort((left, right) => compareCodePoints(left.id, right.id));
}

function gameplayMapSnapshot(map: WorldMapDefinition): unknown {
	return {
		id: map.id,
		width: map.width,
		height: map.height,
		spawn: map.spawn,
		spawnDirection: map.spawnDirection,
		groundPatches: sortedById(map.groundPatches),
		blockers: sortedById(map.blockers),
		mapDecor: sortedById(map.mapDecor),
		fences: sortedById(map.fences),
		landmarks: sortedById(map.landmarks),
		transitions: sortedById(map.transitions),
		npcs: sortedById(map.npcs),
		ambientNpcs: sortedById(map.ambientNpcs),
		pickups: sortedById(map.pickups),
		encounters: sortedById(map.encounters),
		combatBounds: sortedById(map.combatBounds),
		discoveries: sortedById(map.discoveries),
		backgroundImages: sortedById(map.backgroundImages)
	};
}

export function computeMeadowEntryGameplaySourceFingerprint(
	input: MeadowEntryControlInputs
): string {
	return sha256(
		stable({
			version: 1,
			mapId: input.mapId,
			map: gameplayMapSnapshot(meadowEntryMap),
			worldBounds: input.worldBounds,
			playerCollisionRadiusPx: input.playerCollisionRadiusPx,
			foregroundFrontCutoffPx: input.foregroundFrontCutoffPx,
			sourceCatalog: sortedSourceCatalog(input),
			strictCollisionRects: input.strictCollisionRects,
			landmarkCollisionRects: input.landmarkCollisionRects,
			walkableSpaceRects: input.walkableSpaceRects,
			controlClearanceRects: input.controlClearanceRects,
			sourceFileHashes: input.sourceFileHashes
		})
	);
}

export function computeMeadowEntryAuthoringContractFingerprint(
	input: MeadowEntryControlInputs
): string {
	return sha256(
		stable({
			version: 1,
			controlFilenames: MEADOW_ENTRY_CONTROL_FILENAMES,
			authoringRegions: input.authoringRegions,
			primarySourceOwners: input.primarySourceOwners,
			crossRegionCoverage: MEADOW_ENTRY_CROSS_REGION_COVERAGE,
			outlierResolutions: input.outlierResolutions,
			bakeOwnership: input.bakeOwnership,
			crops: input.crops,
			overlaps: input.overlaps,
			runtimeCoverage: input.runtimeCoverage,
			cropBudgetSummary: input.cropBudgetSummary,
			minimumHandoffPx: MEADOW_ENTRY_MIN_HANDOFF_PX,
			worldBounds: input.worldBounds,
			tileSizePx: input.tileSizePx,
			playerCollisionRadiusPx: input.playerCollisionRadiusPx,
			foregroundFrontCutoffPx: input.foregroundFrontCutoffPx,
			protectedRects: input.protectedRects,
			walkableSpaceRects: input.walkableSpaceRects,
			controlClearanceRects: input.controlClearanceRects,
			rendererMaskMaterialContract: input.rendererMaskMaterialContract,
			storage: input.storage
		})
	);
}

export function computeMeadowEntryCombinedControlFingerprint(
	input: MeadowEntryControlInputs
): string {
	return sha256(
		stable({
			version: 1,
			gameplaySourceFingerprint: computeMeadowEntryGameplaySourceFingerprint(input),
			authoringContractFingerprint: computeMeadowEntryAuthoringContractFingerprint(input),
			predecessor: input.predecessor
		})
	);
}

function fillMaskBounds(alpha: Buffer, bounds: PixelBounds, value: number): void {
	const width = bounds.right - bounds.left;
	const row = Buffer.alloc(width, value);
	for (let y = bounds.top; y < bounds.bottom; y += 1) {
		row.copy(alpha, y * MASK_WIDTH + bounds.left);
	}
}

export function buildMeadowEntryProtectedForegroundRasterMask(
	input: MeadowEntryControlInputs
): MeadowEntryRasterMask {
	const alpha = Buffer.alloc(MASK_WIDTH * MASK_HEIGHT);
	for (const bounds of input.protectedRects) fillMaskBounds(alpha, bounds, 255);
	return { width: MASK_WIDTH, height: MASK_HEIGHT, alpha };
}

function foregroundEligibleRects(input: MeadowEntryControlInputs): readonly SvgRect[] {
	const sourceByKey = new Map(
		input.sourceCatalog.map((record) => [meadowEntrySourceKey(record.ref), record])
	);
	return input.bakeOwnership.flatMap((entry) => {
		if (entry.disposition.mode !== 'base-and-foreground') return [];
		const key = meadowEntrySourceKey(entry.ref);
		const source = sourceByKey.get(key);
		if (!source?.bounds) throw new Error(`Foreground meadow-entry source has no bounds "${key}"`);
		const raw = rasterizeCoverageBounds(source.bounds);
		const expanded = expandBounds(raw, entry.disposition.foregroundMargins);
		if (!expanded) return [];
		const safe = clampBounds({
			...expanded,
			bottom: Math.min(expanded.bottom, raw.bottom - entry.disposition.frontCutoffPx)
		});
		const owner = input.primarySourceOwners[key];
		if (!owner) throw new Error(`Foreground meadow-entry source has no primary owner "${key}"`);
		return safe
			? [
					{
						id: `foreground:${key}`,
						bounds: safe,
						fill: '#ffffff',
						attributes: {
							disposition: entry.disposition.mode,
							'front-cutoff-px': entry.disposition.frontCutoffPx,
							'primary-region': owner
						}
					}
				]
			: [];
	});
}

function foregroundEligibleBounds(input: MeadowEntryControlInputs): readonly PixelBounds[] {
	return foregroundEligibleRects(input).map(({ bounds }) => bounds);
}

export function buildMeadowEntryForegroundEligibleRasterMask(
	input: MeadowEntryControlInputs
): MeadowEntryRasterMask {
	const alpha = Buffer.alloc(MASK_WIDTH * MASK_HEIGHT);
	for (const bounds of foregroundEligibleBounds(input)) fillMaskBounds(alpha, bounds, 255);
	for (const { bounds } of forbiddenTallRects(input)) fillMaskBounds(alpha, bounds, 0);
	return { width: MASK_WIDTH, height: MASK_HEIGHT, alpha };
}

function xmlEscape(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function svgDocument(rects: readonly SvgRect[]): string {
	const body = rects
		.map(({ id, bounds, fill, opacity, stroke, attributes }) => {
			const width = bounds.right - bounds.left;
			const height = bounds.bottom - bounds.top;
			const dataAttributes = Object.entries(attributes ?? {})
				.sort(([left], [right]) => compareCodePoints(left, right))
				.map(([name, value]) => ` data-${name}="${xmlEscape(String(value))}"`)
				.join('');
			return `  <rect data-id="${xmlEscape(id)}" x="${bounds.left}" y="${bounds.top}" width="${width}" height="${height}" fill="${fill}"${opacity === undefined ? '' : ` opacity="${opacity}"`}${stroke === undefined ? '' : ` stroke="${stroke}"`}${dataAttributes}/>`;
		})
		.join('\n');
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6400 6400" width="6400" height="6400">\n${body}\n</svg>\n`;
}

function sourceSvgRects(
	input: MeadowEntryControlInputs,
	types: ReadonlySet<MeadowEntrySourceType>,
	fill: string
): SvgRect[] {
	return sortedSourceCatalog(input).flatMap((record) => {
		if (!types.has(record.ref.sourceType)) return [];
		const bounds = sourceBounds(meadowEntryMap, record, input.rendererMaskMaterialContract);
		return bounds
			? [
					{
						id: meadowEntrySourceKey(record.ref),
						bounds,
						fill
					}
				]
			: [];
	});
}

function indexedRects(prefix: string, bounds: readonly PixelBounds[], fill: string): SvgRect[] {
	return bounds.map((item, index) => ({
		id: `${prefix}-${index.toString().padStart(4, '0')}`,
		bounds: item,
		fill
	}));
}

function terrainSvgRects(input: MeadowEntryControlInputs): SvgRect[] {
	const groundPatches = new Map(
		(meadowEntryMap.groundPatches ?? []).map((patch) => [patch.id, patch])
	);
	const ownership = new Map(
		input.bakeOwnership.map((entry) => [meadowEntrySourceKey(entry.ref), entry])
	);
	return sortedSourceCatalog(input).flatMap((record) => {
		if (record.ref.sourceType !== 'ground-patch' || record.bounds === null) return [];
		const sourceKey = meadowEntrySourceKey(record.ref);
		const patch = groundPatches.get(record.ref.sourceId);
		const owner = input.primarySourceOwners[sourceKey];
		const bakeEntry = ownership.get(sourceKey);
		if (!patch || !owner || !bakeEntry) {
			throw new Error(`Missing terrain control provenance for "${sourceKey}"`);
		}
		return [
			{
				id: sourceKey,
				bounds: rasterizeCoverageBounds(record.bounds),
				fill: '#cabd87',
				attributes: {
					tile: patch.tile,
					'material-profile': input.rendererMaskMaterialContract.materialProfiles[owner],
					'primary-region': owner,
					'connector-membership': owner.startsWith('connector-') ? owner : '',
					disposition: bakeEntry.disposition.mode,
					'contributing-sources': sourceKey
				}
			}
		];
	});
}

function controlClearanceSvgRects(input: MeadowEntryControlInputs): SvgRect[] {
	return input.controlClearanceRects.map(({ id, bounds, kind }) => ({
		id,
		bounds,
		fill: '#ffffff',
		attributes: { kind }
	}));
}

function forbiddenTallRects(input: MeadowEntryControlInputs): SvgRect[] {
	return [
		...indexedRects('walkable-space', input.walkableSpaceRects, '#777777'),
		...indexedRects('protected', input.protectedRects, '#ff3366'),
		...controlClearanceSvgRects(input)
	];
}

function regionRects(input: MeadowEntryControlInputs): SvgRect[] {
	return input.authoringRegions.map((region, index) => ({
		id: region.id,
		bounds: region.reviewBounds,
		fill: `hsl(${(index * 47) % 360} 45% 55%)`,
		opacity: region.id === 'outer-boundary' ? 0.08 : 0.35,
		stroke: '#202020'
	}));
}

function protectedSvgRects(input: MeadowEntryControlInputs): SvgRect[] {
	return indexedRects('protected', input.protectedRects, '#ff3366');
}

function foregroundSvgRects(input: MeadowEntryControlInputs): SvgRect[] {
	return [
		...foregroundEligibleRects(input),
		...forbiddenTallRects(input).map((rect) => ({
			...rect,
			id: `foreground-exclusion:${rect.id}`,
			fill: '#000000'
		}))
	];
}

function handoffRects(input: MeadowEntryControlInputs): SvgRect[] {
	return input.overlaps.flatMap((overlap) => [
		{ id: overlap.id, bounds: overlap.bounds, fill: '#ffcc33', opacity: 0.35 },
		{
			id: `${overlap.id}:route-mouth`,
			bounds: overlap.routeMouth.bounds,
			fill: '#ff6600',
			opacity: 0.8
		}
	]);
}

function coverageRects(
	input: MeadowEntryControlInputs,
	mode: MeadowEntryRuntimeCoverage['mode']
): SvgRect[] {
	return input.runtimeCoverage.flatMap((entry, index) =>
		entry.mode === mode
			? [
					{
						id: `${mode}-${index.toString().padStart(4, '0')}`,
						bounds: entry.bounds,
						fill: mode === 'baked' ? '#ffffff' : '#808080'
					}
				]
			: []
	);
}

export function renderMeadowEntryControls(
	input: MeadowEntryControlInputs
): Readonly<Record<string, string>> {
	const gameplaySourceFingerprint = computeMeadowEntryGameplaySourceFingerprint(input);
	const authoringContractFingerprint = computeMeadowEntryAuthoringContractFingerprint(input);
	const combinedControlFingerprint = computeMeadowEntryCombinedControlFingerprint(input);
	const terrain = terrainSvgRects(input);
	const regions = regionRects(input);
	const collisions = [
		...indexedRects('strict-collision', input.strictCollisionRects, '#ffffff'),
		...indexedRects('landmark-collision', input.landmarkCollisionRects, '#bdbdbd')
	];
	const buildings = sourceSvgRects(input, new Set(['landmark']), '#ffffff');
	const entrances = sourceSvgRects(input, new Set(['landmark', 'transition']), '#777777');
	const encounters = sourceSvgRects(input, new Set(['encounter', 'combat-bounds']), '#ffffff');
	const rewards = sourceSvgRects(input, new Set(['pickup', 'discovery']), '#ffffff');
	const anchors = [
		...sourceSvgRects(input, new Set(['decor', 'landmark']), '#ffffff'),
		...controlClearanceSvgRects(input)
	];
	const protectedLive = protectedSvgRects(input);
	const forbiddenTall = forbiddenTallRects(input);
	const foreground = foregroundSvgRects(input);
	const handoffs = handoffRects(input);
	const baseCoverage = coverageRects(input, 'baked');
	const fallbackCoverage = coverageRects(input, 'fallback-tile');
	const composite = [
		...regions,
		...terrain,
		...collisions.map((rect) => ({ ...rect, fill: '#e33', opacity: 0.45 })),
		...foreground.map((rect) => ({ ...rect, opacity: 0.35 })),
		...handoffs,
		...protectedLive
	];

	return Object.freeze({
		'meadow-entry-control-manifest.json': prettyJson({
			version: 1,
			mapId: input.mapId,
			viewBox: { x: 0, y: 0, width: MASK_WIDTH, height: MASK_HEIGHT },
			artifacts: MEADOW_ENTRY_CONTROL_FILENAMES,
			fingerprints: {
				gameplaySource: gameplaySourceFingerprint,
				authoringContract: authoringContractFingerprint,
				combinedControl: combinedControlFingerprint
			},
			predecessor: input.predecessor,
			storage: input.storage,
			sourceFileHashes: input.sourceFileHashes,
			rendererMaskMaterialContract: input.rendererMaskMaterialContract,
			walkableSpaceRects: input.walkableSpaceRects,
			controlClearanceRects: input.controlClearanceRects
		}),
		'meadow-entry-composite-control.svg': svgDocument(composite),
		'meadow-entry-terrain-path-mask.svg': svgDocument(terrain),
		'meadow-entry-region-mask.svg': svgDocument(regions),
		'meadow-entry-collision-mask.svg': svgDocument(collisions),
		'meadow-entry-building-footprint-mask.svg': svgDocument(buildings),
		'meadow-entry-entrance-transition-mask.svg': svgDocument(entrances),
		'meadow-entry-encounter-combat-mask.svg': svgDocument(encounters),
		'meadow-entry-reward-discovery-mask.svg': svgDocument(rewards),
		'meadow-entry-semantic-anchor-mask.svg': svgDocument(anchors),
		'meadow-entry-protected-live-mask.svg': svgDocument(protectedLive),
		'meadow-entry-forbidden-tall-mask.svg': svgDocument(forbiddenTall),
		'meadow-entry-foreground-eligible-mask.svg': svgDocument(foreground),
		'meadow-entry-handoff-mask.svg': svgDocument(handoffs),
		'meadow-entry-runtime-base-coverage-mask.svg': svgDocument(baseCoverage),
		'meadow-entry-runtime-fallback-coverage-mask.svg': svgDocument(fallbackCoverage),
		'meadow-entry-bake-ownership.json': prettyJson({ entries: input.bakeOwnership }),
		'meadow-entry-crop-manifest.json': prettyJson({
			crops: input.crops,
			overlaps: input.overlaps,
			runtimeCoverage: input.runtimeCoverage,
			budgetSummary: input.cropBudgetSummary
		})
	});
}

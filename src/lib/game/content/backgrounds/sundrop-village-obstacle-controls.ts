import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getActorAnimationAsset } from '$lib/game/content/assets';
import { SUNDROP_VILLAGE_ART_CONTROL_FINGERPRINT } from '$lib/game/content/generated/sundrop-village-art-control';
import { VILLAGE_ART_CONTROL_FILENAMES } from '$lib/game/content/maps/layered/village-art-controls';
import { meadowEntryMap } from '$lib/game/content/maps/meadow-entry';
import { createLayeredRegionBackground } from '$lib/game/content/maps/layered/region-background';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import type { MapRect, WorldMapDefinition } from '$lib/game/content/maps/types';
import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import { collectLandmarkRects, collectStrictCollisionRects } from '$lib/game/save/save-state';

import {
	SUNDROP_VILLAGE_BASE_BACKGROUND_ID,
	SUNDROP_VILLAGE_BASE_BACKGROUND_TEXTURE_KEY,
	SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID,
	SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_TEXTURE_KEY,
	SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX
} from './sundrop-village-backgrounds';
import {
	type SundropObstacleOwnershipEntry,
	SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP
} from './sundrop-village-obstacle-ownership';

export const SUNDROP_VILLAGE_OBSTACLE_CONTROL_FILENAMES = [
	'village-obstacle-ownership.json',
	'village-obstacle-base-mask.svg',
	'village-obstacle-foreground-mask.svg',
	'village-obstacle-protected-mask.svg',
	'village-obstacle-composite-control.svg',
	'village-obstacle-control-manifest.json'
] as const;

export type SundropVillageObstacleControlFilename =
	(typeof SUNDROP_VILLAGE_OBSTACLE_CONTROL_FILENAMES)[number];

export interface SundropObstacleControlRect extends MapRect {
	readonly kind: 'base' | 'foreground' | 'protected';
	readonly blockerBottom?: number;
	readonly bottom?: number;
}

const SUNDROP_VILLAGE_FEATHER_BAND_BLOCKER_IDS = [
	'village-block-0-37',
	'village-block-0-49',
	'village-block-46-2'
] as const;

export interface SundropVillageObstacleControlInputs {
	readonly map: WorldMapDefinition;
	readonly ownership: readonly SundropObstacleOwnershipEntry[];
	readonly crop: {
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	};
	readonly heroDisplayHeight: number;
	readonly baseRects: readonly SundropObstacleControlRect[];
	readonly foregroundRects: readonly SundropObstacleControlRect[];
	readonly protectedRects: readonly SundropObstacleControlRect[];
	readonly hpa307Fingerprint: string;
	readonly hpa307ArtifactHashes: Readonly<Record<string, string>>;
	readonly sourceHashes: Readonly<Record<string, string>>;
}

export type SundropVillageObstacleOcclusionMotif = 'hedge' | 'low-wall';
export type SundropVillageObstacleOcclusionSide = 'behind' | 'front';

export interface SundropVillageObstacleOcclusionProofCase {
	readonly motif: SundropVillageObstacleOcclusionMotif;
	readonly blockerId: string;
	readonly ownerBackgroundIds: readonly string[];
	readonly crop: {
		readonly left: number;
		readonly top: number;
		readonly width: number;
		readonly height: number;
	};
	readonly blocker: {
		readonly world: MapRect;
		readonly local: MapRect;
	};
	readonly foregroundControlRect: SundropObstacleControlRect;
	readonly cutoff: {
		readonly localY: number;
		readonly worldY: number;
		readonly blockerBottomWorldY: number;
	};
	readonly player: Record<
		SundropVillageObstacleOcclusionSide,
		{
			readonly semantic: string;
			readonly local: { readonly x: number; readonly y: number };
			readonly world: { readonly x: number; readonly y: number };
			readonly centerDeltaFromCutoffPx: number;
		}
	>;
}

function sha256(value: Uint8Array | string): string {
	return createHash('sha256').update(value).digest('hex');
}

function stable(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
	if (value && typeof value === 'object') {
		return `{${Object.entries(value as Record<string, unknown>)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
			.join(',')}}`;
	}
	if (value === undefined) return 'undefined';
	return JSON.stringify(value);
}

function relativeRect(
	rect: MapRect,
	crop: SundropVillageObstacleControlInputs['crop'],
	kind: SundropObstacleControlRect['kind']
): SundropObstacleControlRect | null {
	const left = Math.max(crop.x, rect.x - rect.width / 2);
	const right = Math.min(crop.x + crop.width, rect.x + rect.width / 2);
	const top = Math.max(crop.y, rect.y - rect.height / 2);
	const bottom = Math.min(crop.y + crop.height, rect.y + rect.height / 2);
	if (right <= left || bottom <= top) return null;
	return {
		id: rect.id,
		x: (left + right) / 2 - crop.x,
		y: (top + bottom) / 2 - crop.y,
		width: right - left,
		height: bottom - top,
		kind
	};
}

function expandedRect(
	rect: MapRect,
	margins: {
		readonly top: number;
		readonly right: number;
		readonly bottom: number;
		readonly left: number;
	}
): MapRect {
	return {
		id: rect.id,
		x: rect.x + (margins.right - margins.left) / 2,
		y: rect.y + (margins.bottom - margins.top) / 2,
		width: rect.width + margins.left + margins.right,
		height: rect.height + margins.top + margins.bottom
	};
}

function foregroundRect(
	blocker: MapRect,
	entry: SundropObstacleOwnershipEntry,
	crop: SundropVillageObstacleControlInputs['crop']
): SundropObstacleControlRect | null {
	if (!entry.foregroundMargins) return null;
	const expanded = expandedRect(blocker, entry.foregroundMargins);
	const top = expanded.y - expanded.height / 2;
	const safeBottom = blocker.y + blocker.height / 2 - SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX;
	if (safeBottom <= top) return null;
	const local = relativeRect(
		{ ...expanded, y: (top + safeBottom) / 2, height: safeBottom - top },
		crop,
		'foreground'
	);
	return local
		? {
				...local,
				blockerBottom: blocker.y + blocker.height / 2 - crop.y,
				bottom: safeBottom - crop.y
			}
		: null;
}

function subtractRect(
	source: SundropObstacleControlRect,
	exclusion: SundropObstacleControlRect
): SundropObstacleControlRect[] {
	const left = source.x - source.width / 2;
	const right = source.x + source.width / 2;
	const top = source.y - source.height / 2;
	const bottom = source.y + source.height / 2;
	const exclusionLeft = Math.max(left, exclusion.x - exclusion.width / 2);
	const exclusionRight = Math.min(right, exclusion.x + exclusion.width / 2);
	const exclusionTop = Math.max(top, exclusion.y - exclusion.height / 2);
	const exclusionBottom = Math.min(bottom, exclusion.y + exclusion.height / 2);
	if (exclusionLeft >= exclusionRight || exclusionTop >= exclusionBottom) return [source];

	const fragment = (
		fragmentLeft: number,
		fragmentTop: number,
		fragmentRight: number,
		fragmentBottom: number
	) =>
		fragmentRight > fragmentLeft && fragmentBottom > fragmentTop
			? {
					...source,
					x: (fragmentLeft + fragmentRight) / 2,
					y: (fragmentTop + fragmentBottom) / 2,
					width: fragmentRight - fragmentLeft,
					height: fragmentBottom - fragmentTop
				}
			: null;
	return [
		fragment(left, top, right, exclusionTop),
		fragment(left, exclusionBottom, right, bottom),
		fragment(left, exclusionTop, exclusionLeft, exclusionBottom),
		fragment(exclusionRight, exclusionTop, right, exclusionBottom)
	].filter((fragment): fragment is SundropObstacleControlRect => fragment !== null);
}

function subtractFeatherBands(
	rects: readonly SundropObstacleControlRect[],
	featherBands: readonly SundropObstacleControlRect[]
): SundropObstacleControlRect[] {
	return rects.flatMap((rect) =>
		featherBands.reduce(
			(fragments, featherBand) =>
				fragments.flatMap((fragment) => subtractRect(fragment, featherBand)),
			[rect]
		)
	);
}

function protect(
	items: SundropObstacleControlRect[],
	crop: SundropVillageObstacleControlInputs['crop'],
	rect: MapRect
): void {
	const local = relativeRect(rect, crop, 'protected');
	if (local) items.push(local);
}

function buildProtectedRects(
	map: WorldMapDefinition,
	crop: SundropVillageObstacleControlInputs['crop']
): SundropObstacleControlRect[] {
	const protectedRects: SundropObstacleControlRect[] = [];
	for (const decor of map.mapDecor ?? []) protect(protectedRects, crop, decor);
	for (const landmark of map.landmarks ?? []) protect(protectedRects, crop, landmark);
	for (const npc of map.npcs ?? []) {
		protect(protectedRects, crop, {
			id: `npc-${npc.id}`,
			x: npc.x,
			y: npc.y,
			width: 96,
			height: 87
		});
	}
	for (const npc of map.ambientNpcs ?? []) {
		protect(protectedRects, crop, {
			id: `ambient-npc-${npc.id}`,
			x: npc.x,
			y: npc.y,
			width: npc.width ?? 96,
			height: npc.height ?? 87
		});
	}
	for (const pickup of map.pickups ?? []) {
		protect(protectedRects, crop, {
			id: `pickup-${pickup.id}`,
			x: pickup.x,
			y: pickup.y,
			width: 48,
			height: 48
		});
	}
	for (const transition of map.transitions) {
		protect(protectedRects, crop, {
			id: `transition-${transition.id}`,
			x: transition.x,
			y: transition.y,
			width: 96,
			height: 96
		});
	}
	for (const encounter of map.encounters ?? []) {
		protect(protectedRects, crop, {
			id: `encounter-${encounter.id}`,
			x: encounter.x,
			y: encounter.y,
			width: 96,
			height: 96
		});
	}
	for (const discovery of map.discoveries ?? []) {
		const radius = discovery.radius ?? 48;
		protect(protectedRects, crop, {
			id: `discovery-${discovery.id}`,
			x: discovery.x,
			y: discovery.y,
			width: radius * 2,
			height: radius * 2
		});
	}
	for (const fence of map.fences ?? []) protect(protectedRects, crop, fence);
	return protectedRects.sort((left, right) => left.id.localeCompare(right.id));
}

function hpa307InputHashes(repositoryRoot: string): Record<string, string> {
	const artifactDirectory = join(repositoryRoot, 'docs/superpowers/reports/img/hpa-307');
	return Object.fromEntries(
		VILLAGE_ART_CONTROL_FILENAMES.map((filename) => [
			filename,
			sha256(readFileSync(join(artifactDirectory, filename)))
		])
	);
}

export function buildSundropVillageObstacleControlInputs(
	repositoryRoot = process.cwd()
): SundropVillageObstacleControlInputs {
	const source = sundropVillageLayered;
	const base = createLayeredRegionBackground(source, {
		id: SUNDROP_VILLAGE_BASE_BACKGROUND_ID,
		textureKey: SUNDROP_VILLAGE_BASE_BACKGROUND_TEXTURE_KEY,
		plane: 'base',
		drawOrder: 1_000
	});
	const foreground = createLayeredRegionBackground(source, {
		id: SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID,
		textureKey: SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_TEXTURE_KEY,
		plane: 'foreground',
		drawOrder: 1_000
	});
	const crop = {
		x: base.x - base.width / 2,
		y: base.y - base.height / 2,
		width: base.width,
		height: base.height
	};
	const map = { ...meadowEntryMap, backgroundImages: [base, foreground] };
	const blockersById = new Map((map.blockers ?? []).map((blocker) => [blocker.id, blocker]));
	const baseRects: SundropObstacleControlRect[] = [];
	const foregroundRects: SundropObstacleControlRect[] = [];
	for (const entry of SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP) {
		const blocker = blockersById.get(entry.blockerId);
		if (!blocker) throw new Error(`Missing Sundrop obstacle control blocker: ${entry.blockerId}`);
		const baseRect = relativeRect(expandedRect(blocker, entry.baseMargins), crop, 'base');
		if (!baseRect)
			throw new Error(`Sundrop obstacle control blocker is outside crop: ${entry.blockerId}`);
		baseRects.push(baseRect);
		const foreground = foregroundRect(blocker, entry, crop);
		if (foreground) foregroundRects.push(foreground);
	}
	const featherBands = SUNDROP_VILLAGE_FEATHER_BAND_BLOCKER_IDS.map((blockerId) => {
		const blocker = blockersById.get(blockerId);
		if (!blocker) throw new Error(`Missing Sundrop feather-band blocker: ${blockerId}`);
		const local = relativeRect(blocker, crop, 'base');
		if (!local) throw new Error(`Sundrop feather-band blocker is outside crop: ${blockerId}`);
		return local;
	});
	const archive = join(
		repositoryRoot,
		'docs/superpowers/reports/img/hpa-398/sundrop-village-hpa-307-ground-input.png'
	);
	return {
		map,
		ownership: SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP,
		crop,
		heroDisplayHeight: getActorAnimationAsset('hero').displaySize.height,
		baseRects: subtractFeatherBands(baseRects, featherBands).sort((left, right) =>
			left.id.localeCompare(right.id)
		),
		foregroundRects: subtractFeatherBands(foregroundRects, featherBands).sort((left, right) =>
			left.id.localeCompare(right.id)
		),
		protectedRects: buildProtectedRects(map, crop),
		hpa307Fingerprint: SUNDROP_VILLAGE_ART_CONTROL_FINGERPRINT,
		hpa307ArtifactHashes: hpa307InputHashes(repositoryRoot),
		sourceHashes: { 'sundrop-village-hpa-307-ground-input.png': sha256(readFileSync(archive)) }
	};
}

function clampProofCrop(
	left: number,
	top: number,
	width: number,
	height: number,
	canvasWidth: number,
	canvasHeight: number
) {
	const resolvedLeft = Math.max(0, Math.min(Math.round(left), canvasWidth - width));
	const resolvedTop = Math.max(0, Math.min(Math.round(top), canvasHeight - height));
	return { left: resolvedLeft, top: resolvedTop, width, height };
}

function collectProofCollisionRects(map: WorldMapDefinition) {
	return [...collectStrictCollisionRects(map), ...collectLandmarkRects(map)];
}

function resolveVerticalProofPosition(
	x: number,
	initialY: number,
	direction: -1 | 1,
	collisionRects: readonly Pick<MapRect, 'x' | 'y' | 'width' | 'height'>[]
): number {
	let y = initialY;
	for (let attempt = 0; attempt < collisionRects.length + 1; attempt += 1) {
		const containing = collisionRects.filter(
			(rect) =>
				x >= rect.x - rect.width / 2 - PLAYER_COLLISION_RADIUS &&
				x <= rect.x + rect.width / 2 + PLAYER_COLLISION_RADIUS &&
				y >= rect.y - rect.height / 2 - PLAYER_COLLISION_RADIUS &&
				y <= rect.y + rect.height / 2 + PLAYER_COLLISION_RADIUS
		);
		if (containing.length === 0) return y;
		y =
			direction < 0
				? Math.floor(
						Math.min(
							...containing.map((rect) => rect.y - rect.height / 2 - PLAYER_COLLISION_RADIUS - 8)
						)
					)
				: Math.ceil(
						Math.max(
							...containing.map((rect) => rect.y + rect.height / 2 + PLAYER_COLLISION_RADIUS + 8)
						)
					);
	}
	throw new Error(`Unable to derive a walkable vertical proof position at x=${x}`);
}

/**
 * Selects one reviewed foreground-owned hedge and low wall and derives the
 * front/behind proof positions from their assembled blocker/control geometry.
 *
 * For each motif, every foreground-owned ownership entry is turned into a
 * candidate by resolving its assembled blocker and largest foreground
 * control rect, then deriving walkable player positions just behind
 * (north of) and in front of (south of) the blocker via
 * `resolveVerticalProofPosition`. Candidates are ranked by the smallest
 * `frontWorldY - behindWorldY` span so the chosen evidence is the tightest
 * front/behind pair — i.e. the case where the cutoff most clearly
 * discriminates occlusion from readability — rather than an arbitrary
 * first match.
 *
 * @param inputs - Sundrop obstacle control inputs; defaults to the
 *   production-assembled inputs when omitted.
 * @returns Exactly two proof cases, one for `hedge` and one for `low-wall`,
 *   each carrying the blocker geometry, foreground control rect, cutoff
 *   world/local Y, and behind/front player positions with their signed
 *   delta from the cutoff.
 */
export function buildSundropVillageObstacleOcclusionProofCases(
	inputs: SundropVillageObstacleControlInputs = buildSundropVillageObstacleControlInputs()
): readonly SundropVillageObstacleOcclusionProofCase[] {
	const collisionRects = collectProofCollisionRects(inputs.map);
	return (['hedge', 'low-wall'] as const).map((motif) => {
		const candidates = inputs.ownership
			.filter((entry) => entry.motif === motif && entry.foregroundMargins !== undefined)
			.map((ownership) => {
				const blocker = (inputs.map.blockers ?? []).find(
					(candidate) => candidate.id === ownership.blockerId
				);
				if (!blocker) throw new Error(`Missing assembled proof blocker ${ownership.blockerId}`);
				const foregroundControlRect = inputs.foregroundRects
					.filter((rect) => rect.id === ownership.blockerId && rect.bottom !== undefined)
					.sort((left, right) => right.width * right.height - left.width * left.height)[0];
				if (!foregroundControlRect || foregroundControlRect.bottom === undefined) {
					throw new Error(`Missing foreground proof control ${ownership.blockerId}`);
				}
				const behindWorldY = resolveVerticalProofPosition(
					blocker.x,
					blocker.y - blocker.height / 2 - PLAYER_COLLISION_RADIUS - 8,
					-1,
					collisionRects
				);
				const frontWorldY = resolveVerticalProofPosition(
					blocker.x,
					blocker.y + blocker.height / 2 + PLAYER_COLLISION_RADIUS + 8,
					1,
					collisionRects
				);
				return {
					ownership,
					blocker,
					foregroundControlRect,
					foregroundBottom: foregroundControlRect.bottom,
					behindWorldY,
					frontWorldY
				};
			})
			.sort(
				(left, right) =>
					left.frontWorldY - left.behindWorldY - (right.frontWorldY - right.behindWorldY)
			);
		const selected = candidates[0];
		if (!selected) throw new Error(`Missing foreground-owned ${motif} proof obstacle`);
		const {
			ownership,
			blocker,
			foregroundControlRect,
			foregroundBottom,
			behindWorldY,
			frontWorldY
		} = selected;
		const cutoffLocalY = foregroundBottom;
		const cutoffWorldY = inputs.crop.y + cutoffLocalY;
		const playerLocalX = blocker.x - inputs.crop.x;
		const behindLocalY = behindWorldY - inputs.crop.y;
		const frontLocalY = frontWorldY - inputs.crop.y;
		const cropWidth = motif === 'hedge' ? 640 : 760;
		const cropHeight = motif === 'hedge' ? 360 : 440;
		const crop = clampProofCrop(
			playerLocalX - cropWidth / 2,
			(behindLocalY + frontLocalY) / 2 - cropHeight / 2,
			cropWidth,
			cropHeight,
			inputs.crop.width,
			inputs.crop.height
		);
		const position = (
			side: SundropVillageObstacleOcclusionSide,
			localY: number,
			semantic: string
		) => ({
			semantic,
			local: { x: playerLocalX, y: localY },
			world: { x: inputs.crop.x + playerLocalX, y: inputs.crop.y + localY },
			centerDeltaFromCutoffPx: localY - cutoffLocalY
		});

		return {
			motif,
			blockerId: ownership.blockerId,
			ownerBackgroundIds: ownership.ownerBackgroundIds,
			crop,
			blocker: {
				world: {
					id: blocker.id,
					x: blocker.x,
					y: blocker.y,
					width: blocker.width,
					height: blocker.height
				},
				local: {
					id: blocker.id,
					x: blocker.x - inputs.crop.x,
					y: blocker.y - inputs.crop.y,
					width: blocker.width,
					height: blocker.height
				}
			},
			foregroundControlRect,
			cutoff: {
				localY: cutoffLocalY,
				worldY: cutoffWorldY,
				blockerBottomWorldY: blocker.y + blocker.height / 2
			},
			player: {
				behind: position(
					'behind',
					behindLocalY,
					'behind/north: player center is north of the authored cutoff and the foreground occludes the lower silhouette'
				),
				front: position(
					'front',
					frontLocalY,
					'front/south: player center is south of the authored cutoff and remains readable'
				)
			}
		};
	});
}

export function computeSundropVillageObstacleControlFingerprint(
	inputs: SundropVillageObstacleControlInputs
): string {
	return sha256(
		stable({
			version: 1,
			crop: inputs.crop,
			ownership: inputs.ownership,
			baseRects: inputs.baseRects,
			foregroundRects: inputs.foregroundRects,
			protectedRects: inputs.protectedRects,
			heroDisplayHeight: inputs.heroDisplayHeight,
			playerCollisionRadius: PLAYER_COLLISION_RADIUS,
			foregroundFrontCutoffPx: SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX,
			hpa307Fingerprint: inputs.hpa307Fingerprint,
			hpa307ArtifactHashes: inputs.hpa307ArtifactHashes,
			sourceHashes: inputs.sourceHashes
		})
	);
}

function svgDocument(
	crop: SundropVillageObstacleControlInputs['crop'],
	rects: readonly SundropObstacleControlRect[],
	fill: string
): string {
	const elements = rects
		.map(
			(rect) =>
				`  <rect data-id="${rect.id}" x="${rect.x - rect.width / 2}" y="${rect.y - rect.height / 2}" width="${rect.width}" height="${rect.height}" fill="${fill}"/>`
		)
		.join('\n');
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${crop.width} ${crop.height}" width="${crop.width}" height="${crop.height}">\n${elements}\n</svg>\n`;
}

export function renderSundropVillageObstacleControlArtifacts(
	inputs: SundropVillageObstacleControlInputs
): Map<SundropVillageObstacleControlFilename, string> {
	const resolvedBlockers = new Map(
		(inputs.map.blockers ?? []).map((blocker) => [blocker.id, blocker])
	);
	const ownership = inputs.ownership.map((entry) => ({
		...entry,
		blocker: resolvedBlockers.get(entry.blockerId)
	}));
	if (ownership.some((entry) => !entry.blocker))
		throw new Error('Unresolved Sundrop obstacle control ownership');
	const fingerprint = computeSundropVillageObstacleControlFingerprint(inputs);
	const composite = [...inputs.baseRects, ...inputs.foregroundRects, ...inputs.protectedRects];
	return new Map([
		['village-obstacle-ownership.json', `${JSON.stringify({ entries: ownership }, null, 2)}\n`],
		['village-obstacle-base-mask.svg', svgDocument(inputs.crop, inputs.baseRects, '#ffffff')],
		[
			'village-obstacle-foreground-mask.svg',
			svgDocument(inputs.crop, inputs.foregroundRects, '#ffffff')
		],
		[
			'village-obstacle-protected-mask.svg',
			svgDocument(inputs.crop, inputs.protectedRects, '#000000')
		],
		['village-obstacle-composite-control.svg', svgDocument(inputs.crop, composite, '#808080')],
		[
			'village-obstacle-control-manifest.json',
			`${JSON.stringify(
				{
					version: 1,
					viewBox: { x: 0, y: 0, width: inputs.crop.width, height: inputs.crop.height },
					computedControlFingerprint: fingerprint,
					artifacts: SUNDROP_VILLAGE_OBSTACLE_CONTROL_FILENAMES,
					hpa307Fingerprint: inputs.hpa307Fingerprint,
					hpa307ArtifactHashes: inputs.hpa307ArtifactHashes,
					sourceHashes: inputs.sourceHashes
				},
				null,
				2
			)}\n`
		]
	]);
}

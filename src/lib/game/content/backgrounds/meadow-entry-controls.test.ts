import { sundropVillageBackgroundsApproval } from '$lib/game/content/approvals/sundrop-village-backgrounds';
import { meadowEntryMap } from '$lib/game/content/maps/meadow-entry';
import { collectLandmarkRects, collectStrictCollisionRects } from '$lib/game/save/save-state';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MEADOW_ENTRY_AUTHORING_REGIONS } from './meadow-entry-authoring-layout';
import {
	buildMeadowEntryControlInputs,
	buildMeadowEntryForegroundEligibleRasterMask,
	buildMeadowEntryProtectedForegroundRasterMask,
	computeMeadowEntryAuthoringContractFingerprint,
	computeMeadowEntryCombinedControlFingerprint,
	computeMeadowEntryGameplaySourceFingerprint,
	MEADOW_ENTRY_CONTROL_FILENAMES,
	renderMeadowEntryControls,
	type MeadowEntryControlInputs
} from './meadow-entry-controls';
import {
	MEADOW_ENTRY_PAINTED_V2_LEGACY_AUTHORING_REGIONS,
	MEADOW_ENTRY_PAINTED_V2_LEGACY_BAKE_OWNERSHIP
} from './meadow-entry-painted-v2-legacy-snapshot';
import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE
} from './meadow-entry-painted-v2-crop-manifest';
import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_OVERLAPS,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_COVERAGE
} from './meadow-entry-painted-v2-crop-manifest';
import { MEADOW_ENTRY_PAINTED_V2_ART_STORAGE } from './meadow-entry-storage';
import {
	createMeadowEntryControlRepositoryFixture,
	removeMeadowEntryControlRepositoryFixture
} from './meadow-entry-controls-test-fixture';

const EXPECTED_CONTROL_FILENAMES = [
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

const SHA256 = /^[0-9a-f]{64}$/;
const TEST_PLAYER_COLLISION_RADIUS_PX = 12;
let testRepositoryRoot = '';

beforeAll(() => {
	testRepositoryRoot = createMeadowEntryControlRepositoryFixture();
});

afterAll(() => {
	removeMeadowEntryControlRepositoryFixture(testRepositoryRoot);
});

function buildTestControlInputs(
	packageName: 'legacy' | 'complete' = 'legacy'
): MeadowEntryControlInputs {
	return buildMeadowEntryControlInputs(testRepositoryRoot, packageName);
}

interface ParsedSvgRect {
	id: string;
	left: number;
	top: number;
	right: number;
	bottom: number;
}

interface TestBounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

interface ExpectedClearance {
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
	bounds: TestBounds;
}

function parseSvgRects(svg: string): readonly ParsedSvgRect[] {
	return [
		...svg.matchAll(
			/<rect data-id="([^"]+)" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g
		)
	].map(([, id, x, y, width, height]) => {
		const left = Number(x);
		const top = Number(y);
		return {
			id: id!,
			left,
			top,
			right: left + Number(width),
			bottom: top + Number(height)
		};
	});
}

function containsPoint(rect: ParsedSvgRect, x: number, y: number): boolean {
	return x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;
}

function testBoundsContainsPoint(bounds: TestBounds, x: number, y: number): boolean {
	return x >= bounds.left && x < bounds.right && y >= bounds.top && y < bounds.bottom;
}

function containsBounds(rect: TestBounds, bounds: TestBounds): boolean {
	return (
		rect.left <= bounds.left &&
		rect.top <= bounds.top &&
		rect.right >= bounds.right &&
		rect.bottom >= bounds.bottom
	);
}

function collisionPixelsCoverTile(tile: TestBounds, rects: readonly TestBounds[]): boolean {
	const width = tile.right - tile.left;
	const height = tile.bottom - tile.top;
	const occupied = new Uint8Array(width * height);

	for (const rect of rects) {
		const left = Math.max(tile.left, rect.left);
		const top = Math.max(tile.top, rect.top);
		const right = Math.min(tile.right, rect.right);
		const bottom = Math.min(tile.bottom, rect.bottom);
		for (let y = top; y < bottom; y += 1) {
			for (let x = left; x < right; x += 1) {
				occupied[(y - tile.top) * width + (x - tile.left)] = 1;
			}
		}
	}

	return occupied.every((pixel) => pixel === 1);
}

function boundsAround(x: number, y: number, width: number, height: number): TestBounds {
	return {
		left: Math.floor(x - width / 2),
		top: Math.floor(y - height / 2),
		right: Math.ceil(x + width / 2),
		bottom: Math.ceil(y + height / 2)
	};
}

function expectedSemanticClearances(): readonly ExpectedClearance[] {
	return [
		{
			id: 'spawn:player',
			kind: 'spawn' as const,
			bounds: boundsAround(meadowEntryMap.spawn.x, meadowEntryMap.spawn.y, 96, 96)
		},
		...meadowEntryMap.transitions.map(({ id, x, y }) => ({
			id: `transition:${id}`,
			kind: 'transition' as const,
			bounds: boundsAround(x, y, 96, 96)
		})),
		...(meadowEntryMap.npcs ?? []).map(({ id, x, y }) => ({
			id: `npc:${id}`,
			kind: 'npc' as const,
			bounds: boundsAround(x, y, 96, 87)
		})),
		...(meadowEntryMap.ambientNpcs ?? []).map(({ id, x, y, width, height }) => ({
			id: `ambient-npc:${id}`,
			kind: 'ambient-npc' as const,
			bounds: boundsAround(x, y, width ?? 96, height ?? 87)
		})),
		...(meadowEntryMap.pickups ?? []).map(({ id, x, y }) => ({
			id: `pickup:${id}`,
			kind: 'pickup' as const,
			bounds: boundsAround(x, y, 48, 48)
		})),
		...(meadowEntryMap.encounters ?? []).map(({ id, x, y }) => ({
			id: `encounter:${id}`,
			kind: 'encounter' as const,
			bounds: boundsAround(x, y, 96, 96)
		})),
		...(meadowEntryMap.combatBounds ?? []).map(({ id, x, y, width, height }) => ({
			id: `combat-bounds:${id}`,
			kind: 'combat-bounds' as const,
			bounds: boundsAround(x, y, width, height)
		})),
		...(meadowEntryMap.discoveries ?? []).map(({ id, x, y, radius }) => ({
			id: `discovery:${id}`,
			kind: 'discovery' as const,
			bounds: boundsAround(x, y, (radius ?? 48) * 2, (radius ?? 48) * 2)
		}))
	].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
}

function fillTestBounds(alpha: Buffer, bounds: TestBounds, value: number): void {
	const row = Buffer.alloc(bounds.right - bounds.left, value);
	for (let y = bounds.top; y < bounds.bottom; y += 1) {
		row.copy(alpha, y * 6_400 + bounds.left);
	}
}

function everyPixelEquals(alpha: Buffer, bounds: TestBounds, value: number): boolean {
	for (let y = bounds.top; y < bounds.bottom; y += 1) {
		const row = alpha.subarray(y * 6_400 + bounds.left, y * 6_400 + bounds.right);
		if (!row.every((pixel) => pixel === value)) return false;
	}
	return true;
}

function expectedProtectedBounds(input: MeadowEntryControlInputs): readonly TestBounds[] {
	return input.bakeOwnership.flatMap((entry) => {
		if (entry.disposition.mode !== 'protected-live') return [];
		const source = input.sourceCatalog.find(
			(record) =>
				record.ref.sourceType === entry.ref.sourceType && record.ref.sourceId === entry.ref.sourceId
		);
		if (!source)
			throw new Error(`Missing test source ${entry.ref.sourceType}:${entry.ref.sourceId}`);

		let sourceBounds: TestBounds;
		if (source.bounds !== null) {
			sourceBounds = {
				left: Math.floor(source.bounds.left),
				top: Math.floor(source.bounds.top),
				right: Math.ceil(source.bounds.right),
				bottom: Math.ceil(source.bounds.bottom)
			};
		} else if (entry.ref.sourceType === 'ambient-npc') {
			const npc = meadowEntryMap.ambientNpcs?.find(({ id }) => id === entry.ref.sourceId);
			if (!npc) throw new Error(`Missing test ambient NPC ${entry.ref.sourceId}`);
			sourceBounds = boundsAround(npc.x, npc.y, npc.width ?? 96, npc.height ?? 87);
		} else if (entry.ref.sourceType === 'pickup') {
			const pickup = meadowEntryMap.pickups?.find(({ id }) => id === entry.ref.sourceId);
			if (!pickup) throw new Error(`Missing test pickup ${entry.ref.sourceId}`);
			sourceBounds = boundsAround(pickup.x, pickup.y, 48, 48);
		} else if (entry.ref.sourceType === 'transition') {
			const transition = meadowEntryMap.transitions.find(({ id }) => id === entry.ref.sourceId);
			if (!transition) throw new Error(`Missing test transition ${entry.ref.sourceId}`);
			sourceBounds = boundsAround(transition.x, transition.y, 96, 96);
		} else {
			throw new Error(
				`Unhandled protected point source ${entry.ref.sourceType}:${entry.ref.sourceId}`
			);
		}

		const margins = entry.disposition.protectionMargins;
		return [
			{
				left: Math.max(0, sourceBounds.left - margins.left),
				top: Math.max(0, sourceBounds.top - margins.top),
				right: Math.min(6_400, sourceBounds.right + margins.right),
				bottom: Math.min(6_400, sourceBounds.bottom + margins.bottom)
			}
		];
	});
}

function maskPixel(alpha: Buffer, x: number, y: number): number {
	return alpha[y * 6_400 + x]!;
}

describe('meadow-entry deterministic authoring controls', () => {
	it('renders the reviewed fixed inventory byte-identically on repeated builds', () => {
		const input = buildTestControlInputs('complete');
		const first = renderMeadowEntryControls(input);
		const second = renderMeadowEntryControls(input);

		expect(MEADOW_ENTRY_CONTROL_FILENAMES).toEqual(EXPECTED_CONTROL_FILENAMES);
		expect(Object.keys(first)).toEqual(EXPECTED_CONTROL_FILENAMES);
		expect(second).toEqual(first);
		for (const filename of EXPECTED_CONTROL_FILENAMES) {
			expect(first[filename]?.endsWith('\n'), filename).toBe(true);
		}
	});

	it('selects the complete crop contract only when the complete package is explicit', () => {
		const legacy = buildTestControlInputs();
		const complete = buildTestControlInputs('complete');

		expect(legacy.crops).toBe(MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS);
		expect(legacy.overlaps).toBe(MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS);
		expect(legacy.runtimeCoverage).toBe(MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE);
		expect(complete.crops).toBe(MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS);
		expect(complete.overlaps).toBe(MEADOW_ENTRY_PAINTED_V2_COMPLETE_OVERLAPS);
		expect(complete.runtimeCoverage).toBe(MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_COVERAGE);
	});

	it('rejects an unknown crop-control package', () => {
		expect(() =>
			buildMeadowEntryControlInputs(testRepositoryRoot, 'unsupported' as 'legacy')
		).toThrow(/unknown meadow-entry control package/i);
	});

	it('builds controls directly from the reviewed painted-v2 contract', () => {
		const input = buildTestControlInputs();
		expect(input.bakeOwnership).toBe(MEADOW_ENTRY_PAINTED_V2_LEGACY_BAKE_OWNERSHIP);
		expect(input.crops).toBe(MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS);
		expect(input.overlaps).toBe(MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS);
		expect(input.runtimeCoverage).toBe(MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE);
		expect(input.storage).toBe(MEADOW_ENTRY_PAINTED_V2_ART_STORAGE);
	});

	it('keeps legacy material profiles isolated from live authoring-region drift', () => {
		const legacyRegion = MEADOW_ENTRY_PAINTED_V2_LEGACY_AUTHORING_REGIONS.find(
			({ id }) => id === 'crossroads'
		)!;
		const liveRegion = MEADOW_ENTRY_AUTHORING_REGIONS.find(({ id }) => id === 'crossroads')!;
		const originalLiveProfile = liveRegion.materialProfile;
		liveRegion.materialProfile = 'synthetic-live-profile-drift';
		try {
			const input = buildTestControlInputs();
			expect(input.authoringRegions).toContain(legacyRegion);
			expect(input.rendererMaskMaterialContract.materialProfiles.crossroads).toBe(
				legacyRegion.materialProfile
			);
		} finally {
			liveRegion.materialProfile = originalLiveProfile;
		}
	});

	it('orders canonical source IDs by Unicode code point instead of host locale collation', () => {
		const input: MeadowEntryControlInputs = {
			...buildTestControlInputs('complete'),
			sourceCatalog: [
				{
					ref: { sourceType: 'landmark', sourceId: 'a-locale-probe' },
					fragmentId: 'outer-boundary',
					bounds: { left: 32, top: 32, right: 64, bottom: 64 },
					visualCapable: true
				},
				{
					ref: { sourceType: 'landmark', sourceId: 'Z-code-point-probe' },
					fragmentId: 'outer-boundary',
					bounds: { left: 64, top: 32, right: 96, bottom: 64 },
					visualCapable: true
				}
			],
			primarySourceOwners: {},
			bakeOwnership: []
		};
		const ids = parseSvgRects(
			renderMeadowEntryControls(input)['meadow-entry-building-footprint-mask.svg']!
		).map(({ id }) => id);

		expect(ids).toEqual(['landmark:Z-code-point-probe', 'landmark:a-locale-probe']);
	});

	it('separates gameplay, authoring, and combined lowercase SHA-256 domains', () => {
		const input = buildTestControlInputs('complete');
		const gameplay = computeMeadowEntryGameplaySourceFingerprint(input);
		const authoring = computeMeadowEntryAuthoringContractFingerprint(input);
		const combined = computeMeadowEntryCombinedControlFingerprint(input);

		expect(gameplay).toMatch(SHA256);
		expect(authoring).toMatch(SHA256);
		expect(combined).toMatch(SHA256);
		expect(new Set([gameplay, authoring, combined]).size).toBe(3);
		expect(input.predecessor.hpa398ControlFingerprint).toBe(
			sundropVillageBackgroundsApproval.approvedControlFingerprint
		);
		expect(input.predecessor.hpa398BaseSha256).toBe(
			sundropVillageBackgroundsApproval.base.approvedPngSha256
		);
		expect(input.predecessor.hpa398ForegroundSha256).toBe(
			sundropVillageBackgroundsApproval.foreground.approvedPngSha256
		);
		expect(Object.keys(input.predecessor.hpa307ArtifactHashes)).toHaveLength(9);
		for (const hash of Object.values(input.predecessor.hpa307ArtifactHashes)) {
			expect(hash).toMatch(SHA256);
		}
	});

	it('builds 6400px masks and removes every protected pixel from foreground eligibility', () => {
		const input = buildTestControlInputs('complete');
		const protectedMask = buildMeadowEntryProtectedForegroundRasterMask(input);
		const eligibleMask = buildMeadowEntryForegroundEligibleRasterMask(input);

		expect(protectedMask.width).toBe(6_400);
		expect(protectedMask.height).toBe(6_400);
		expect(protectedMask.alpha).toHaveLength(6_400 * 6_400);
		expect(eligibleMask.width).toBe(6_400);
		expect(eligibleMask.height).toBe(6_400);
		expect(eligibleMask.alpha).toHaveLength(6_400 * 6_400);
		expect(protectedMask.alpha.includes(255)).toBe(true);
		expect(eligibleMask.alpha.includes(255)).toBe(false);

		let overlappingPixel = -1;
		for (let index = 0; index < protectedMask.alpha.length; index += 1) {
			if (protectedMask.alpha[index] !== 0 && eligibleMask.alpha[index] !== 0) {
				overlappingPixel = index;
				break;
			}
		}
		expect(overlappingPixel).toBe(-1);
	});

	it('excludes every exact semantic clearance pixel and publishes its independent authoritative bounds', () => {
		const input = buildTestControlInputs('complete');
		const expected = expectedSemanticClearances();
		const rendered = renderMeadowEntryControls(input);
		const forbidden = parseSvgRects(rendered['meadow-entry-forbidden-tall-mask.svg']!);

		expect(input.controlClearanceRects).toEqual(expected);
		for (const clearance of expected) {
			expect(
				forbidden.find(({ id }) => id === clearance.id),
				clearance.id
			).toEqual({ id: clearance.id, ...clearance.bounds });
		}

		const eligibleOwner = input.bakeOwnership.find(
			(entry) => entry.disposition.mode === 'base-and-foreground'
		);
		expect(eligibleOwner).toBeUndefined();
		if (!eligibleOwner || eligibleOwner.disposition.mode !== 'base-and-foreground') return;
		const eligibleKey = `${eligibleOwner.ref.sourceType}:${eligibleOwner.ref.sourceId}`;
		const isolatedInput = {
			...input,
			sourceCatalog: input.sourceCatalog
				.filter(
					(record) =>
						record.ref.sourceType === eligibleOwner.ref.sourceType &&
						record.ref.sourceId === eligibleOwner.ref.sourceId
				)
				.map((record) => ({ ...record, bounds: { left: 0, top: 0, right: 6_400, bottom: 6_400 } })),
			bakeOwnership: [
				{
					...eligibleOwner,
					disposition: {
						...eligibleOwner.disposition,
						foregroundMargins: { top: 0, right: 0, bottom: 0, left: 0 },
						frontCutoffPx: 0
					}
				}
			],
			primarySourceOwners: {
				[eligibleKey]: input.primarySourceOwners[eligibleKey]!
			},
			strictCollisionRects: [],
			landmarkCollisionRects: [],
			protectedRects: [],
			walkableSpaceRects: [],
			controlClearanceRects: expected
		} as MeadowEntryControlInputs & { walkableSpaceRects: readonly TestBounds[] };
		const isolatedEligible = buildMeadowEntryForegroundEligibleRasterMask(isolatedInput).alpha;
		for (const clearance of expected) {
			expect(everyPixelEquals(isolatedEligible, clearance.bounds, 0), clearance.id).toBe(true);
			const midX = Math.floor((clearance.bounds.left + clearance.bounds.right) / 2);
			const midY = Math.floor((clearance.bounds.top + clearance.bounds.bottom) / 2);
			const exteriorCandidates = [
				{ x: clearance.bounds.left - 1, y: midY },
				{ x: clearance.bounds.right, y: midY },
				{ x: midX, y: clearance.bounds.top - 1 },
				{ x: midX, y: clearance.bounds.bottom }
			].filter(
				({ x, y }) =>
					x >= 0 &&
					y >= 0 &&
					x < 6_400 &&
					y < 6_400 &&
					!expected.some((other) => testBoundsContainsPoint(other.bounds, x, y))
			);
			for (const point of exteriorCandidates) {
				expect(maskPixel(isolatedEligible, point.x, point.y), `${clearance.id} exterior`).toBe(255);
			}
		}
		expect(maskPixel(isolatedEligible, 0, 0)).toBe(255);
		expect(rendered['meadow-entry-semantic-anchor-mask.svg']).toContain('data-id="spawn:player"');
	});

	it('derives complete conservative walkable-space controls from the assembled map collision model', () => {
		const input = buildTestControlInputs('complete');
		const walkableSpaceRects = input.walkableSpaceRects;
		const rawCollisionRects = [
			...collectStrictCollisionRects(meadowEntryMap),
			...collectLandmarkRects(meadowEntryMap)
		];
		const expandedCollisionRects = rawCollisionRects.map((rect) => ({
			left: Math.max(0, Math.floor(rect.x - rect.width / 2 - TEST_PLAYER_COLLISION_RADIUS_PX)),
			top: Math.max(0, Math.floor(rect.y - rect.height / 2 - TEST_PLAYER_COLLISION_RADIUS_PX)),
			right: Math.min(6_400, Math.ceil(rect.x + rect.width / 2 + TEST_PLAYER_COLLISION_RADIUS_PX)),
			bottom: Math.min(6_400, Math.ceil(rect.y + rect.height / 2 + TEST_PLAYER_COLLISION_RADIUS_PX))
		}));
		const seamTile = { left: 3_360, top: 2_656, right: 3_392, bottom: 2_688 };
		expect(collisionPixelsCoverTile(seamTile, expandedCollisionRects)).toBe(true);
		expect(expandedCollisionRects.some((rect) => containsBounds(rect, seamTile))).toBe(false);
		expect(
			walkableSpaceRects.some((bounds) => containsBounds(bounds, seamTile)),
			'union-covered seam tile 105,83'
		).toBe(false);

		const unionOnlyCollisionTileIds: string[] = [];
		for (let row = 0; row < meadowEntryMap.height; row += 1) {
			for (let column = 0; column < meadowEntryMap.width; column += 1) {
				const tile = {
					left: column * 32,
					top: row * 32,
					right: column * 32 + 32,
					bottom: row * 32 + 32
				};
				const fullyBlocked = collisionPixelsCoverTile(tile, expandedCollisionRects);
				if (fullyBlocked && !expandedCollisionRects.some((rect) => containsBounds(rect, tile))) {
					unionOnlyCollisionTileIds.push(`${column},${row}`);
				}
				const representedAsWalkable = walkableSpaceRects.some((bounds) =>
					containsBounds(bounds, tile)
				);
				expect(representedAsWalkable, `tile ${column},${row}`).toBe(!fullyBlocked);
			}
		}
		expect(unionOnlyCollisionTileIds.length).toBeGreaterThan(0);
		for (const tileId of unionOnlyCollisionTileIds) {
			expect(tileId).toMatch(/^\d+,\d+$/);
		}

		const rendered = renderMeadowEntryControls(input);
		const generatedForbidden = rendered['meadow-entry-forbidden-tall-mask.svg']!;
		const generatedForeground = rendered['meadow-entry-foreground-eligible-mask.svg']!;
		const generatedWalkable = parseSvgRects(generatedForbidden).filter(({ id }) =>
			id.startsWith('walkable-space-')
		);

		expect(generatedWalkable.length).toBeGreaterThan(0);
		expect(
			generatedWalkable.some((rect) =>
				containsPoint(rect, meadowEntryMap.spawn.x, meadowEntryMap.spawn.y)
			)
		).toBe(true);
		expect(
			(meadowEntryMap.groundPatches ?? []).some((patch) =>
				containsPoint(
					{
						id: patch.id,
						...boundsAround(patch.x, patch.y, patch.width, patch.height)
					},
					256,
					256
				)
			)
		).toBe(false);
		expect(generatedWalkable.some((rect) => containsBounds(rect, input.worldBounds))).toBe(false);
		expect(generatedForeground).toMatch(/^<svg /);
	});

	it('preserves reviewed terrain material, owner, connector, disposition, and contributor metadata', () => {
		const terrain = renderMeadowEntryControls(buildTestControlInputs('complete'))[
			'meadow-entry-terrain-path-mask.svg'
		]!;
		const connector = terrain
			.split('\n')
			.find((line) => line.includes('data-id="ground-patch:crossroads-south-approach"'));

		expect(connector).toContain('data-tile="pathTile"');
		expect(connector).toContain('data-material-profile="village-crossroads-handoff"');
		expect(connector).toContain('data-primary-region="connector-village-crossroads"');
		expect(connector).toContain('data-connector-membership="connector-village-crossroads"');
		expect(connector).toContain('data-disposition="runtime-fallback-only"');
		expect(connector).toContain(
			'data-contributing-sources="ground-patch:crossroads-south-approach"'
		);
	});

	it('does not invent a foreground plane for the base-only painted-v2 pilot', () => {
		const foreground = renderMeadowEntryControls(buildTestControlInputs('complete'))[
			'meadow-entry-foreground-eligible-mask.svg'
		]!;
		expect(foreground).not.toContain('data-id="foreground:blocker:');
		expect(foreground).not.toContain('data-id="foreground:decor:');
		expect(foreground).toContain('data-id="foreground-exclusion:');
	});

	it('matches every protected-live pixel to an independent expected projection and excludes all of them', () => {
		const input = buildTestControlInputs('complete');
		const expectedBounds = expectedProtectedBounds(input);
		const expectedAlpha = Buffer.alloc(6_400 * 6_400);
		for (const bounds of expectedBounds) fillTestBounds(expectedAlpha, bounds, 255);
		const protectedMask = buildMeadowEntryProtectedForegroundRasterMask(input).alpha;
		const eligibleMask = buildMeadowEntryForegroundEligibleRasterMask(input).alpha;

		expect(input.protectedRects).toEqual(expectedBounds);
		expect(protectedMask.equals(expectedAlpha)).toBe(true);
		for (const bounds of expectedBounds) {
			expect(everyPixelEquals(eligibleMask, bounds, 0), JSON.stringify(bounds)).toBe(true);
		}
	});

	it('fingerprints gameplay, authoring renderer-mask-material, predecessor, and storage domains independently', () => {
		const input = buildTestControlInputs('complete');
		const original = {
			gameplay: computeMeadowEntryGameplaySourceFingerprint(input),
			authoring: computeMeadowEntryAuthoringContractFingerprint(input),
			combined: computeMeadowEntryCombinedControlFingerprint(input)
		};
		const rendererContract = input.rendererMaskMaterialContract;

		expect(rendererContract.version).toBe(1);
		expect(rendererContract.implementationSha256).toMatch(SHA256);
		expect(rendererContract.materialProfiles['connector-village-crossroads']).toBe(
			'village-crossroads-handoff'
		);

		const gameplayMutation = {
			...input,
			sourceFileHashes: { ...input.sourceFileHashes, synthetic: 'a'.repeat(64) }
		};
		const rendererMutation = {
			...input,
			rendererMaskMaterialContract: {
				...rendererContract,
				pointExtentsPx: {
					...rendererContract.pointExtentsPx,
					pickup: {
						...rendererContract.pointExtentsPx.pickup,
						width: rendererContract.pointExtentsPx.pickup.width + 1
					}
				}
			}
		} as MeadowEntryControlInputs;
		const predecessorMutation = {
			...input,
			predecessor: { ...input.predecessor, hpa398BaseSha256: 'b'.repeat(64) }
		};
		const storageMutation = {
			...input,
			storage: {
				...input.storage,
				canaryPath: 'artifacts/meadow-entry/painted-v2/other.png'
			}
		} as unknown as MeadowEntryControlInputs;

		expect(computeMeadowEntryGameplaySourceFingerprint(gameplayMutation)).not.toBe(
			original.gameplay
		);
		expect(computeMeadowEntryAuthoringContractFingerprint(gameplayMutation)).toBe(
			original.authoring
		);
		expect(computeMeadowEntryGameplaySourceFingerprint(rendererMutation)).toBe(original.gameplay);
		expect(computeMeadowEntryAuthoringContractFingerprint(rendererMutation)).not.toBe(
			original.authoring
		);
		expect(computeMeadowEntryGameplaySourceFingerprint(predecessorMutation)).toBe(
			original.gameplay
		);
		expect(computeMeadowEntryAuthoringContractFingerprint(predecessorMutation)).toBe(
			original.authoring
		);
		expect(computeMeadowEntryCombinedControlFingerprint(predecessorMutation)).not.toBe(
			original.combined
		);
		expect(computeMeadowEntryGameplaySourceFingerprint(storageMutation)).toBe(original.gameplay);
		expect(computeMeadowEntryAuthoringContractFingerprint(storageMutation)).not.toBe(
			original.authoring
		);
	});
});

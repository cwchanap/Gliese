import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import { COMPLETE_WORLD_MAP_IDS } from '$lib/game/content/maps/layouts/complete-world-layout-foundation';
import { validateCanonicalPngChunks } from '$lib/game/content/backgrounds/meadow-entry-png';
import { maps } from '$lib/game/content/maps';
import {
	parseCompleteWorldLayoutReviewArguments,
	renderCompleteWorldLayoutReview,
	type CompleteWorldLayoutReviewEntry
} from './render-complete-world-layout-review';

const expectedReviewDimensions: Readonly<Record<string, { width: number; height: number }>> = {
	'meadow-entry': { width: 1600, height: 1600 },
	'hero-house': { width: 704, height: 576 },
	'guild-hall': { width: 1024, height: 832 },
	'item-shop': { width: 832, height: 640 },
	'villager-house-1': { width: 640, height: 576 },
	'villager-house-2': { width: 704, height: 576 },
	'villager-house-3': { width: 640, height: 640 },
	'shrine-of-aurora-interior': { width: 768, height: 704 },
	'ruins-threshold': { width: 1600, height: 1600 },
	'ruins-core': { width: 1600, height: 1600 }
};

const expectedPngNames = [
	...COMPLETE_WORLD_MAP_IDS.map((mapId) => `${mapId}.png`),
	'meadow-river-crossings.png'
].sort();

const expectedRouteProofSegments = [
	{ id: 'hero-house-to-village-bridge-west', from: 'heroHouse', to: 'villageBridgeWest' },
	{ id: 'village-bridge-west-to-east', from: 'villageBridgeWest', to: 'villageBridgeEast' },
	{ id: 'village-bridge-east-to-crossroads', from: 'villageBridgeEast', to: 'crossroads' },
	{ id: 'crossroads-to-mistfen', from: 'crossroads', to: 'mistfen' },
	{ id: 'crossroads-to-silverpine', from: 'crossroads', to: 'silverpine' },
	{ id: 'crossroads-to-wildwood', from: 'crossroads', to: 'wildwood' },
	{ id: 'wildwood-to-cave', from: 'wildwood', to: 'cave' },
	{ id: 'crossroads-to-coast', from: 'crossroads', to: 'coast' },
	{ id: 'coast-to-ferry', from: 'coast', to: 'ferry' }
] as const;

const expectedRouteProofAnchors = {
	heroHouse: { x: 704, y: 5920 },
	villageBridgeWest: { x: 2496, y: 4624 },
	villageBridgeEast: { x: 3744, y: 4624 },
	crossroads: { x: 3904, y: 4224 },
	mistfen: { x: 2240, y: 3648 },
	silverpine: { x: 3904, y: 2416 },
	wildwood: { x: 4992, y: 3904 },
	coast: { x: 4224, y: 5120 },
	cave: { x: 5760, y: 1868 },
	ferry: { x: 3600, y: 5500 }
} as const;

const temporaryRoots: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
	);
});

async function createOutputRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), 'gliese-complete-world-layout-'));
	temporaryRoots.push(root);
	return root;
}

function sha256(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex');
}

describe('complete world layout review renderer', () => {
	it('renders the exact ten-map and crossing inventory with canonical deterministic PNGs', async () => {
		const outputRoot = await createOutputRoot();
		const first = await renderCompleteWorldLayoutReview({ outputRoot, check: false });

		expect(first.map((entry) => entry.mapId)).toEqual([...COMPLETE_WORLD_MAP_IDS]);
		expect(first).toHaveLength(COMPLETE_WORLD_MAP_IDS.length);
		expect((await readdir(outputRoot)).sort()).toEqual(
			[...expectedPngNames, 'inventory.json'].sort()
		);

		for (const entry of first) {
			expect(entry.imagePath).toBe(`${entry.mapId}.png`);
			expect(entry.reviewDimensions).toEqual(expectedReviewDimensions[entry.mapId]);
			expect(entry.worldDimensions.width).toBeGreaterThan(0);
			expect(entry.worldDimensions.height).toBeGreaterThan(0);
			expect(entry.imageSha256).toMatch(/^[a-f0-9]{64}$/);
			expect(Object.keys(entry.counts)).toEqual([...Object.keys(entry.counts)].sort());

			const bytes = await readFile(join(outputRoot, entry.imagePath));
			validateCanonicalPngChunks(bytes);
			expect(sha256(bytes)).toBe(entry.imageSha256);
			const metadata = await sharp(bytes).metadata();
			expect(metadata.format).toBe('png');
			expect(metadata.width).toBe(entry.reviewDimensions.width);
			expect(metadata.height).toBe(entry.reviewDimensions.height);
		}

		const inventory = JSON.parse(await readFile(join(outputRoot, 'inventory.json'), 'utf8')) as {
			entries: readonly CompleteWorldLayoutReviewEntry[];
			crossingReview: {
				imagePath: string;
				worldDimensions: { width: number; height: number };
				reviewDimensions: { width: number; height: number };
				crop: { left: number; top: number; right: number; bottom: number };
				imageSha256: string;
				routeProofSegments: readonly { id: string; from: string; to: string }[];
			};
		};
		expect(inventory.entries).toEqual(first);
		const crossingReview = inventory.crossingReview;
		expect(crossingReview.imagePath).toBe('meadow-river-crossings.png');
		expect(crossingReview.worldDimensions).toEqual({ width: 2304, height: 4096 });
		expect(crossingReview.reviewDimensions).toEqual({ width: 648, height: 1152 });
		expect(crossingReview.crop).toEqual({ left: 2048, top: 2048, right: 4352, bottom: 6144 });
		expect(crossingReview.routeProofSegments).toEqual(expectedRouteProofSegments);
		const crossingBytes = await readFile(join(outputRoot, crossingReview.imagePath));
		validateCanonicalPngChunks(crossingBytes);
		expect(sha256(crossingBytes)).toBe(crossingReview.imageSha256);
		const crossingMetadata = await sharp(crossingBytes).metadata();
		expect(crossingMetadata.format).toBe('png');
		expect(crossingMetadata.width).toBe(648);
		expect(crossingMetadata.height).toBe(1152);

		const firstBytes = await Promise.all(
			[...expectedPngNames, 'inventory.json'].map(
				async (name) => [name, await readFile(join(outputRoot, name))] as const
			)
		);
		const second = await renderCompleteWorldLayoutReview({ outputRoot, check: false });
		expect(second).toEqual(first);
		for (const [name, bytes] of firstBytes) {
			expect(await readFile(join(outputRoot, name))).toEqual(bytes);
		}
	});

	it('check mode detects changed bytes without rewriting the stale output', async () => {
		const outputRoot = await createOutputRoot();
		await renderCompleteWorldLayoutReview({ outputRoot, check: false });

		const imagePath = join(outputRoot, 'meadow-entry.png');
		const originalImage = await readFile(imagePath);
		const staleImage = Buffer.from(originalImage);
		staleImage[staleImage.length - 1] ^= 1;
		await writeFile(imagePath, staleImage);
		await expect(renderCompleteWorldLayoutReview({ outputRoot, check: true })).rejects.toThrow(
			/meadow-entry\.png.*stale|stale.*meadow-entry\.png/i
		);
		expect(await readFile(imagePath)).toEqual(staleImage);

		await writeFile(imagePath, originalImage);
		const inventoryPath = join(outputRoot, 'inventory.json');
		const originalInventory = await readFile(inventoryPath);
		const staleInventory = Buffer.from(originalInventory);
		staleInventory[staleInventory.length - 2] ^= 1;
		await writeFile(inventoryPath, staleInventory);
		await expect(renderCompleteWorldLayoutReview({ outputRoot, check: true })).rejects.toThrow(
			/inventory\.json.*stale|stale.*inventory\.json/i
		);
		expect(await readFile(inventoryPath)).toEqual(staleInventory);

		await writeFile(inventoryPath, originalInventory);
		await writeFile(imagePath, originalImage);
		const crossingPath = join(outputRoot, 'meadow-river-crossings.png');
		const originalCrossing = await readFile(crossingPath);
		await rm(crossingPath);
		await expect(renderCompleteWorldLayoutReview({ outputRoot, check: true })).rejects.toThrow(
			/meadow-river-crossings\.png.*missing|missing.*meadow-river-crossings\.png|inventory files differ/i
		);
		expect(await readdir(outputRoot)).not.toContain('meadow-river-crossings.png');

		await writeFile(crossingPath, originalCrossing);
		const extraPath = join(outputRoot, 'unexpected.txt');
		const extraBytes = Buffer.from('unrelated output');
		await writeFile(extraPath, extraBytes);
		await expect(renderCompleteWorldLayoutReview({ outputRoot, check: true })).rejects.toThrow(
			/inventory files differ|unexpected\.txt/i
		);
		expect(await readFile(extraPath)).toEqual(extraBytes);
	}, 30_000);

	it('derives every route proof centerline from active composed collision', async () => {
		const renderer = await import('./render-complete-world-layout-review');
		const paths = renderer.deriveMeadowRouteProofPaths(maps['meadow-entry']);

		expect(paths.map(({ id, from, to }) => ({ id, from, to }))).toEqual(expectedRouteProofSegments);
		for (const path of paths) {
			expect(path.points[0]).toEqual(expectedRouteProofAnchors[path.from]);
			expect(path.points.at(-1)).toEqual(expectedRouteProofAnchors[path.to]);
			expect(path.points.length).toBeGreaterThan(1);
		}
	});

	it('parses and renders deterministic per-map interior proof inventory with current-camera crops', async () => {
		expect(parseCompleteWorldLayoutReviewArguments(['--map', 'hero-house', '--check'])).toEqual({
			map: 'hero-house',
			check: true,
			outputRoot: 'docs/superpowers/reports/img/hpa-586-interiors'
		});
		expect(() => parseCompleteWorldLayoutReviewArguments(['--map', 'ruins-core'])).toThrow(
			/VillageInteriorMapId/
		);

		const outputRoot = await createOutputRoot();
		const first = await renderCompleteWorldLayoutReview({
			outputRoot,
			check: false,
			map: 'hero-house'
		});
		const expected = [
			'anchors.png',
			'camera-1280x720.png',
			'camera-640x360.png',
			'coordinate-graybox.png',
			'inventory.json',
			'player-centre-navigation-overlay.png',
			'raw-collision-overlay.png',
			'route-widths.png'
		].sort();
		expect(first).toHaveLength(1);
		expect(first[0]?.imagePath).toBe('hero-house/coordinate-graybox.png');
		expect((await readdir(join(outputRoot, 'hero-house'))).sort()).toEqual(expected);
		const inventory = JSON.parse(
			await readFile(join(outputRoot, 'hero-house/inventory.json'), 'utf8')
		) as { mapId: string; artifacts: readonly { path: string; sha256: string }[] };
		expect(inventory.mapId).toBe('hero-house');
		expect(inventory.artifacts.map(({ path }) => path)).toContain('hero-house/camera-1280x720.png');
		expect(inventory.artifacts.every(({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256))).toBe(true);
		const second = await renderCompleteWorldLayoutReview({
			outputRoot,
			check: true,
			map: 'hero-house'
		});
		expect(second).toEqual(first);
	});
});

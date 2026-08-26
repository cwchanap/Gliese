import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import {
	actorAnimationAssets,
	animationPackAsset,
	environmentDressingAsset,
	interiorPropAsset,
	terrainTilesAsset
} from '$lib/game/content/assets';
import { COMPLETE_WORLD_MAP_IDS } from '$lib/game/content/maps/layouts/complete-world-layout-foundation';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
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

const legacyRendererAssetPaths = [
	terrainTilesAsset.path,
	environmentDressingAsset.path,
	interiorPropAsset.path,
	animationPackAsset.path
] as const;

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

async function createRepositoryRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), 'gliese-render-repository-'));
	temporaryRoots.push(root);
	return root;
}

async function copyLegacyRendererAssets(repositoryRoot: string): Promise<void> {
	const assetRoot = join(repositoryRoot, 'public/game/assets');
	await mkdir(assetRoot, { recursive: true });
	await Promise.all(
		legacyRendererAssetPaths.map((path) =>
			copyFile(
				resolve(process.cwd(), 'public', path.slice(1)),
				join(assetRoot, path.slice(1).replace('game/assets/', ''))
			)
		)
	);
}

async function writeHeroHouseManifest(
	repositoryRoot: string,
	fileStem: string,
	background: { readonly r: number; readonly g: number; readonly b: number }
): Promise<{
	readonly manifestPath: string;
	readonly assetPath: string;
}> {
	const manifestRoot = join(repositoryRoot, 'src/lib/game/content/backgrounds/manifests');
	const assetRoot = join(repositoryRoot, 'public/game/assets/interiors/hero-house');
	const manifestPath = join(manifestRoot, `${fileStem}.json`);
	const assetPath = join(assetRoot, `${fileStem}.png`);
	const runtimeAssetPath = `/game/assets/interiors/hero-house/${fileStem}.png`;
	const assetBytes = await sharp({
		create: {
			width: 704,
			height: 576,
			channels: 4,
			background: { ...background, alpha: 1 }
		}
	})
		.png()
		.toBuffer();

	await mkdir(manifestRoot, { recursive: true });
	await mkdir(assetRoot, { recursive: true });
	await writeFile(assetPath, assetBytes);
	await writeFile(
		manifestPath,
		`${JSON.stringify(
			{
				version: 1,
				mapId: 'hero-house',
				dimensionsPx: { width: 704, height: 576 },
				base: {
					id: `${fileStem}-base`,
					textureKey: `${fileStem}-base`,
					path: runtimeAssetPath,
					sha256: sha256(assetBytes)
				},
				navigation: {
					gridId: 'hero-house-navigation',
					cellSizePx: 16,
					widthCells: 44,
					heightCells: 36,
					clearancePx: 12,
					source: 'layout'
				}
			},
			null,
			2
		)}\n`
	);
	return { manifestPath, assetPath };
}

function sha256(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex');
}

async function readRgba(bytes: Buffer) {
	return sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function pixel(data: Buffer, width: number, x: number, y: number): number[] {
	const offset = (y * width + x) * 4;
	return [...data.subarray(offset, offset + 4)];
}

function firstOpaquePixel(
	data: Buffer,
	width: number,
	height: number
): {
	readonly x: number;
	readonly y: number;
	readonly value: number[];
} {
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const value = pixel(data, width, x, y);
			if (value[3] === 255) return { x, y, value };
		}
	}
	throw new Error('fixture image has no opaque pixel');
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
	}, 30_000);

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
		const repositoryRoot = await createRepositoryRoot();
		const first = await renderCompleteWorldLayoutReview({
			outputRoot,
			check: false,
			map: 'hero-house',
			repositoryRoot
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
			map: 'hero-house',
			repositoryRoot
		});
		expect(second).toEqual(first);
	});

	it('renders painted proof from an isolated root without colliding with a real Hero House manifest', async () => {
		const existingRepositoryRoot = await createRepositoryRoot();
		const existing = await writeHeroHouseManifest(existingRepositoryRoot, 'hero-house', {
			r: 211,
			g: 37,
			b: 149
		});
		const existingManifestBytes = await readFile(existing.manifestPath);
		const existingAssetBytes = await readFile(existing.assetPath);

		const fixtureRepositoryRoot = await createRepositoryRoot();
		await writeHeroHouseManifest(fixtureRepositoryRoot, 'painted-proof', {
			r: 64,
			g: 96,
			b: 80
		});
		await copyLegacyRendererAssets(fixtureRepositoryRoot);

		const outputRoot = await createOutputRoot();
		const first = await renderCompleteWorldLayoutReview({
			outputRoot,
			check: false,
			map: 'hero-house',
			repositoryRoot: fixtureRepositoryRoot
		});
		const expected = [
			'anchors.png',
			'camera-1280x720.png',
			'camera-640x360.png',
			'collision-overlay.png',
			'coordinate-graybox.png',
			'fallback-comparison.png',
			'inventory.json',
			'live-actor-overlay.png',
			'live-character-composition.png',
			'painted-base.png',
			'player-centre-navigation-overlay.png',
			'raw-collision-overlay.png',
			'route-widths.png'
		].sort();
		expect(first).toHaveLength(1);
		expect((await readdir(join(outputRoot, 'hero-house'))).sort()).toEqual(expected);
		const paintedBase = await readFile(join(outputRoot, 'hero-house/painted-base.png'));
		const { data: paintedPixels, info: paintedInfo } = await sharp(paintedBase)
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		expect([...paintedPixels.subarray(0, 4)]).toEqual([64, 96, 80, 255]);
		expect(paintedInfo.width).toBe(704);
		expect(paintedInfo.height).toBe(576);
		const offset = (100 * 704 + 100) * 4;
		const collisionPixels = await sharp(
			await readFile(join(outputRoot, 'hero-house/collision-overlay.png'))
		)
			.ensureAlpha()
			.raw()
			.toBuffer();
		expect([...collisionPixels.subarray(offset, offset + 4)]).not.toEqual([64, 96, 80, 255]);
		expect(collisionPixels[offset + 3]).toBe(255);
		const actorPixels = await sharp(
			await readFile(join(outputRoot, 'hero-house/live-actor-overlay.png'))
		)
			.ensureAlpha()
			.raw()
			.toBuffer();
		expect([...actorPixels.subarray(offset, offset + 4)]).toEqual([64, 96, 80, 255]);
		const fallbackBytes = await readFile(join(outputRoot, 'hero-house/fallback-comparison.png'));
		const { data: fallbackPixels, info: fallbackInfo } = await readRgba(fallbackBytes);
		expect(fallbackInfo.width).toBe(1408);
		expect(fallbackInfo.height).toBe(576);
		const terrainPixels = await readRgba(
			await sharp(join(fixtureRepositoryRoot, 'public/game/assets/terrain-tiles.png'))
				.extract({
					left: terrainTilesAsset.frames.plazaStoneTile.x,
					top: terrainTilesAsset.frames.plazaStoneTile.y,
					width: terrainTilesAsset.frames.plazaStoneTile.w,
					height: terrainTilesAsset.frames.plazaStoneTile.h
				})
				.resize({ width: 32, height: 32 })
				.png()
				.toBuffer()
		);
		expect(pixel(fallbackPixels, fallbackInfo.width, 704 + 352, 480)).toEqual(
			pixel(terrainPixels.data, terrainPixels.info.width, 0, 0)
		);
		const wallPixels = await readRgba(
			await sharp(join(fixtureRepositoryRoot, 'public/game/assets/environment-dressing.png'))
				.extract({
					left: environmentDressingAsset.frames.ruinWall.x,
					top: environmentDressingAsset.frames.ruinWall.y,
					width: environmentDressingAsset.frames.ruinWall.w,
					height: environmentDressingAsset.frames.ruinWall.h
				})
				.png()
				.toBuffer()
		);
		const opaqueWallPixel = firstOpaquePixel(
			wallPixels.data,
			wallPixels.info.width,
			wallPixels.info.height
		);
		expect(
			pixel(fallbackPixels, fallbackInfo.width, 704 + opaqueWallPixel.x, opaqueWallPixel.y)
		).toEqual(opaqueWallPixel.value);
		const bedPixels = await readRgba(
			await sharp(join(fixtureRepositoryRoot, 'public/game/assets/interior-props.png'))
				.extract({
					left: interiorPropAsset.frames.bed.x,
					top: interiorPropAsset.frames.bed.y,
					width: interiorPropAsset.frames.bed.w,
					height: interiorPropAsset.frames.bed.h
				})
				.resize({ width: 128, height: 96 })
				.png()
				.toBuffer()
		);
		const opaqueBedPixel = firstOpaquePixel(
			bedPixels.data,
			bedPixels.info.width,
			bedPixels.info.height
		);
		expect(
			pixel(fallbackPixels, fallbackInfo.width, 704 + 96 + opaqueBedPixel.x, 96 + opaqueBedPixel.y)
		).toEqual(opaqueBedPixel.value);
		expect(await readFile(existing.manifestPath)).toEqual(existingManifestBytes);
		expect(await readFile(existing.assetPath)).toEqual(existingAssetBytes);

		const second = await renderCompleteWorldLayoutReview({
			outputRoot,
			check: true,
			map: 'hero-house',
			repositoryRoot: fixtureRepositoryRoot
		});
		expect(second).toEqual(first);
	});

	it('generates live-character composition from the checked-in hero atlas at spawn and room samples', async () => {
		const repositoryRoot = await createRepositoryRoot();
		await writeHeroHouseManifest(repositoryRoot, 'painted-proof', {
			r: 64,
			g: 96,
			b: 80
		});
		await copyLegacyRendererAssets(repositoryRoot);
		const outputRoot = await createOutputRoot();
		const staleProof = await sharp({
			create: {
				width: 704,
				height: 576,
				channels: 4,
				background: { r: 211, g: 37, b: 149, alpha: 1 }
			}
		})
			.png()
			.toBuffer();
		await mkdir(join(outputRoot, 'hero-house'), { recursive: true });
		await writeFile(join(outputRoot, 'hero-house/live-character-composition.png'), staleProof);

		const first = await renderCompleteWorldLayoutReview({
			outputRoot,
			check: false,
			map: 'hero-house',
			repositoryRoot
		});
		expect(first).toHaveLength(1);
		const liveBytes = await readFile(join(outputRoot, 'hero-house/live-character-composition.png'));
		expect(liveBytes).not.toEqual(staleProof);
		const { data: livePixels, info: liveInfo } = await readRgba(liveBytes);
		expect(liveInfo.width).toBe(704);
		expect(liveInfo.height).toBe(576);

		const heroFrameName = actorAnimationAssets.hero.clips.idle.frames[0]!;
		const heroFrame = animationPackAsset.frames[heroFrameName];
		const heroPixels = await readRgba(
			await sharp(join(repositoryRoot, 'public/game/assets/animation-pack.png'))
				.extract({
					left: heroFrame.x,
					top: heroFrame.y,
					width: heroFrame.w,
					height: heroFrame.h
				})
				.resize(actorAnimationAssets.hero.displaySize)
				.png()
				.toBuffer()
		);
		const opaqueHeroPixel = firstOpaquePixel(
			heroPixels.data,
			heroPixels.info.width,
			heroPixels.info.height
		);
		expect(
			pixel(
				livePixels,
				liveInfo.width,
				352 - actorAnimationAssets.hero.displaySize.width / 2 + opaqueHeroPixel.x,
				480 - actorAnimationAssets.hero.displaySize.height / 2 + opaqueHeroPixel.y
			)
		).toEqual(opaqueHeroPixel.value);
		for (const room of Object.values(VILLAGE_INTERIOR_LAYOUTS['hero-house'].rooms)) {
			let hasActorPixel = false;
			for (let y = room.y; y < room.y + room.height && !hasActorPixel; y += 1) {
				for (let x = room.x; x < room.x + room.width; x += 1) {
					if (pixel(livePixels, liveInfo.width, x, y).join(',') !== '64,96,80,255') {
						hasActorPixel = true;
						break;
					}
				}
			}
			expect(hasActorPixel).toBe(true);
		}

		const inventory = JSON.parse(
			await readFile(join(outputRoot, 'hero-house/inventory.json'), 'utf8')
		) as { artifacts: readonly { path: string; width: number; height: number; sha256: string }[] };
		const liveInventory = inventory.artifacts.find(
			({ path }) => path === 'hero-house/live-character-composition.png'
		);
		expect(liveInventory).toEqual({
			path: 'hero-house/live-character-composition.png',
			width: 704,
			height: 576,
			sha256: sha256(liveBytes)
		});

		const second = await renderCompleteWorldLayoutReview({
			outputRoot,
			check: true,
			map: 'hero-house',
			repositoryRoot
		});
		expect(second).toEqual(first);
	});

	it('fails painted proof rendering when the checked-in animation atlas is missing', async () => {
		const repositoryRoot = await createRepositoryRoot();
		await writeHeroHouseManifest(repositoryRoot, 'painted-proof', {
			r: 64,
			g: 96,
			b: 80
		});
		await copyLegacyRendererAssets(repositoryRoot);
		await rm(join(repositoryRoot, 'public/game/assets/animation-pack.png'));

		await expect(
			renderCompleteWorldLayoutReview({
				outputRoot: await createOutputRoot(),
				check: false,
				map: 'hero-house',
				repositoryRoot
			})
		).rejects.toThrow(/animation-pack\.png|animation atlas/i);
	});
});

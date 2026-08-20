import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import { COMPLETE_WORLD_MAP_IDS } from '$lib/game/content/maps/layouts/complete-world-layout-foundation';
import { validateCanonicalPngChunks } from '$lib/game/content/backgrounds/meadow-entry-png';
import {
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
		};
		expect(inventory.entries).toEqual(first);

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
		const staleInventory = await readFile(inventoryPath);
		staleInventory[staleInventory.length - 2] ^= 1;
		await writeFile(inventoryPath, staleInventory);
		await expect(renderCompleteWorldLayoutReview({ outputRoot, check: true })).rejects.toThrow(
			/inventory\.json.*stale|stale.*inventory\.json/i
		);
		expect(await readFile(inventoryPath)).toEqual(staleInventory);
	});
});

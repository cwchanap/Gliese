import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-complete';
import { encodeCanonicalMeadowEntryPng } from '$lib/game/content/backgrounds/meadow-entry-png';
import {
	COMPLETE_REVIEW_EVIDENCE,
	renderMeadowEntryPaintedV2CompleteReviewArtifactsFromDecoded,
	renderMeadowEntryPaintedV2CompleteReview
} from './render-meadow-entry-painted-v2-complete-review';

describe('complete Meadow Entry review renderer', () => {
	it('declares the full approval evidence inventory, including native and seam proofs', () => {
		expect(COMPLETE_REVIEW_EVIDENCE).toEqual(
			expect.arrayContaining([
				'full-overview.png',
				'representative-native-detail.png',
				'river-crossing.png',
				'forest-boundary.png',
				'village-approach.png',
				'seam-evidence.png',
				'route-collision-protected-live-overlay.png',
				'master-edge-north.png',
				'master-edge-east.png',
				'master-edge-south.png',
				'master-edge-west.png',
				'runtime-quadrant-edge-northwest.png',
				'runtime-quadrant-edge-northeast.png',
				'runtime-quadrant-edge-southwest.png',
				'runtime-quadrant-edge-southeast.png'
			])
		);
	}, 120_000);

	it('renders asymmetric crops and edges from the decoded master and checks stale output', async () => {
		const repositoryRoot = await mkdtemp(join(tmpdir(), 'gliese-complete-review-'));
		await copyControls(repositoryRoot);
		const masterPath = join(repositoryRoot, 'master.png');
		const rawMaster = asymmetricMaster();
		await writeCanonical(masterPath, rawMaster);
		const first = await renderMeadowEntryPaintedV2CompleteReview(repositoryRoot, {
			masterPath: 'master.png',
			outputRoot: 'review'
		});
		const second = await renderMeadowEntryPaintedV2CompleteReview(repositoryRoot, {
			masterPath: 'master.png',
			outputRoot: 'review',
			check: true
		});
		expect(second.manifestSha256).toBe(first.manifestSha256);
		const manifest = JSON.parse(
			(await readFile(join(repositoryRoot, 'review', 'complete-review-manifest.json'))).toString(
				'utf8'
			)
		) as { inventory: string[] };
		expect(manifest.inventory).toEqual(
			COMPLETE_REVIEW_EVIDENCE.filter((name) => !name.endsWith('.json'))
		);
		const overview = await decodePng(
			await readFile(join(repositoryRoot, 'review', 'full-overview.png'))
		);
		expect(pixel(overview.data, overview.width, 100, 100)).toEqual([255, 0, 0, 255]);
		expect(pixel(overview.data, overview.width, 1500, 100)).toEqual([0, 255, 0, 255]);
		expect(pixel(overview.data, overview.width, 100, 1500)).toEqual([0, 0, 255, 255]);
		expect(pixel(overview.data, overview.width, 1500, 1500)).toEqual([255, 255, 0, 255]);
		const northEdge = await decodePng(
			await readFile(join(repositoryRoot, 'review', 'master-edge-north.png'))
		);
		expect(pixel(northEdge.data, northEdge.width, 100, 50)).toEqual([255, 0, 0, 255]);
		expect(pixel(northEdge.data, northEdge.width, 5000, 50)).toEqual([0, 255, 0, 255]);
		const detail = await decodePng(
			await readFile(join(repositoryRoot, 'review', 'representative-native-detail.png'))
		);
		expect(pixel(detail.data, detail.width, 100, 100)).toEqual([0, 0, 255, 255]);
	}, 120_000);

	it('derives overview and edge evidence from the supplied decoded RGBA source', async () => {
		const repositoryRoot = await mkdtemp(join(tmpdir(), 'gliese-complete-review-decoded-'));
		await copyControls(repositoryRoot);
		const decoded = {
			data: asymmetricMaster(),
			width: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
			height: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
		};
		const artifacts = await renderMeadowEntryPaintedV2CompleteReviewArtifactsFromDecoded(
			repositoryRoot,
			decoded
		);
		const overview = await decodePng(artifacts['full-overview.png']!);
		const eastEdge = await decodePng(artifacts['master-edge-east.png']!);
		expect(pixel(overview.data, overview.width, 100, 100)).toEqual([255, 0, 0, 255]);
		expect(pixel(eastEdge.data, eastEdge.width, 50, 100)).toEqual([0, 255, 0, 255]);
	}, 120_000);

	it('keeps review manifests relocation-safe when repository roots move', async () => {
		const firstRoot = await mkdtemp(join(tmpdir(), 'gliese-complete-review-relocate-a-'));
		const secondRoot = await mkdtemp(join(tmpdir(), 'gliese-complete-review-relocate-b-'));
		const relativeMaster = join(
			'artifacts',
			'meadow-entry',
			'painted-v2',
			'complete',
			'masters',
			'meadow-entry-painted-v2-complete-base-master.png'
		);
		for (const root of [firstRoot, secondRoot]) {
			await mkdir(dirname(join(root, relativeMaster)), { recursive: true });
			await writeFile(join(root, relativeMaster), await canonicalPng(asymmetricMaster()));
			await copyControls(root);
		}
		const first = await renderMeadowEntryPaintedV2CompleteReview(firstRoot);
		const second = await renderMeadowEntryPaintedV2CompleteReview(secondRoot);
		const relocatedCheck = await renderMeadowEntryPaintedV2CompleteReview(secondRoot, {
			check: true
		});
		expect(first.manifestSha256).toBe(second.manifestSha256);
		expect(relocatedCheck.manifestSha256).toBe(first.manifestSha256);
		expect(
			await readFile(
				join(
					firstRoot,
					'docs/superpowers/reports/img/hpa-586-painted-v2-complete/complete-review-manifest.json'
				)
			)
		).toEqual(
			await readFile(
				join(
					secondRoot,
					'docs/superpowers/reports/img/hpa-586-painted-v2-complete/complete-review-manifest.json'
				)
			)
		);
	}, 120_000);
});

function asymmetricMaster(): Buffer {
	const data = Buffer.alloc(
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH *
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT *
			4
	);
	for (let y = 0; y < MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT; y += 1) {
		for (let x = 0; x < MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH; x += 1) {
			const offset = (y * MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH + x) * 4;
			const color =
				x < MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH / 2
					? y < MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT / 2
						? [255, 0, 0]
						: [0, 0, 255]
					: y < MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT / 2
						? [0, 255, 0]
						: [255, 255, 0];
			data[offset] = color[0]!;
			data[offset + 1] = color[1]!;
			data[offset + 2] = color[2]!;
			data[offset + 3] = 255;
		}
	}
	return data;
}

function pixel(data: Buffer, width: number, x: number, y: number): readonly number[] {
	const offset = (y * width + x) * 4;
	return [...data.subarray(offset, offset + 4)];
}

async function decodePng(png: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
	const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
	return { data, width: info.width, height: info.height };
}

async function canonicalPng(raw: Buffer): Promise<Buffer> {
	return encodeCanonicalMeadowEntryPng(
		raw,
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
	);
}

async function copyControls(repositoryRoot: string): Promise<void> {
	const controls = join(repositoryRoot, 'artifacts/meadow-entry/painted-v2/complete/controls');
	await mkdir(controls, { recursive: true });
	for (const name of [
		'meadow-entry-terrain-path-mask.svg',
		'meadow-entry-collision-mask.svg',
		'meadow-entry-protected-live-mask.svg'
	]) {
		await writeFile(
			join(controls, name),
			await readFile(
				join(process.cwd(), 'artifacts/meadow-entry/painted-v2/complete/controls', name)
			)
		);
	}
}

async function writeCanonical(path: string, raw: Buffer): Promise<void> {
	const png = await encodeCanonicalMeadowEntryPng(
		raw,
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
	);
	await (await import('node:fs/promises')).writeFile(path, png);
}

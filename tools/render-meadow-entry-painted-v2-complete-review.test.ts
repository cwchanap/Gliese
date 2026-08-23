import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-complete';
import { encodeCanonicalMeadowEntryPng } from '$lib/game/content/backgrounds/meadow-entry-png';
import {
	COMPLETE_REVIEW_EVIDENCE,
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
	});

	it('renders evidence from the same decoded 6400x6400 master and checks stale output', async () => {
		const repositoryRoot = await mkdtemp(join(tmpdir(), 'gliese-complete-review-'));
		const masterPath = join(repositoryRoot, 'master.png');
		const rawMaster = await sharp({
			create: {
				width: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
				height: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
				channels: 4,
				background: '#2d4150ff'
			}
		})
			.raw()
			.toBuffer();
		await writeCanonical(masterPath, rawMaster);
		const first = await renderMeadowEntryPaintedV2CompleteReview(process.cwd(), {
			masterPath,
			outputRoot: join(repositoryRoot, 'review')
		});
		const second = await renderMeadowEntryPaintedV2CompleteReview(process.cwd(), {
			masterPath,
			outputRoot: join(repositoryRoot, 'review'),
			check: true
		});
		expect(second.manifestSha256).toBe(first.manifestSha256);
		expect(await readFile(join(repositoryRoot, 'review', 'full-overview.png'))).toEqual(
			await readFile(join(repositoryRoot, 'review', 'full-overview.png'))
		);
	});
});

async function writeCanonical(path: string, raw: Buffer): Promise<void> {
	const png = await encodeCanonicalMeadowEntryPng(
		raw,
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
	);
	await (await import('node:fs/promises')).writeFile(path, png);
}

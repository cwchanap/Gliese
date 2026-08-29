import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
	assertReviewArtifactPathWithinRoot,
	assertReviewCropOverlapBuffersEqual,
	DEFAULT_OUTPUT_ROOT
} from './render-meadow-entry-painted-v2-enrichment-review';

const PRESENTATION_IDS = [
	'camera-underlay-sundrop-north',
	'camera-underlay-sundrop-south',
	'camera-underlay-crossroads-north',
	'camera-underlay-crossroads-south',
	'sundrop-north',
	'sundrop-south',
	'village-crossroads-connector',
	'crossroads'
] as const;

const INSERT_IDS = [
	'camera-underlay-sundrop-south-blocked-hedge',
	'camera-underlay-crossroads-north-blocked-hedge',
	'camera-underlay-crossroads-south-blocked-hedge',
	'camera-underlay-crossroads-north-blocked-woodland',
	'camera-underlay-crossroads-south-blocked-woodland',
	'crossroads-blocked-hedge',
	'crossroads-blocked-woodland'
] as const;

type SyntheticSourceManifest = Readonly<{
	id: string;
	normalizationTransform: Readonly<{
		native: Readonly<{ width: number; height: number }>;
		resize: Readonly<{ width: number; height: number }>;
		crop: Readonly<{ left: number; top: number; width: number; height: number }>;
		scale: number;
		scaleX: number;
		scaleY: number;
	}>;
}>;

const northHedgeManifest: SyntheticSourceManifest = Object.freeze({
	id: 'camera-underlay-crossroads-north-blocked-hedge',
	normalizationTransform: Object.freeze({
		native: Object.freeze({ width: 1550, height: 1014 }),
		resize: Object.freeze({ width: 3200, height: 2094 }),
		crop: Object.freeze({ left: 0, top: 215, width: 3200, height: 1664 }),
		scale: 2.064516129032258,
		scaleX: 2.064516129032258,
		scaleY: 2.064516129032258
	})
});

const southWoodlandManifest: SyntheticSourceManifest = Object.freeze({
	id: 'camera-underlay-crossroads-south-blocked-woodland',
	normalizationTransform: Object.freeze({
		native: Object.freeze({ width: 1567, height: 1004 }),
		resize: Object.freeze({ width: 3200, height: 2051 }),
		crop: Object.freeze({ left: 0, top: 193, width: 3200, height: 1664 }),
		scale: 2.04211869814933,
		scaleX: 2.04211869814933,
		scaleY: 2.04211869814933
	})
});

test('candidate source review rejects the two recorded invalid-scale attempt-3 manifests', async () => {
	const review = (await import('./render-meadow-entry-painted-v2-enrichment-review')) as {
		assertReviewSourceTransform?: (manifest: SyntheticSourceManifest) => void;
	};
	assert.throws(
		() => review.assertReviewSourceTransform?.(northHedgeManifest),
		/camera-underlay-crossroads-north-blocked-hedge.*2\.064516129032258/
	);
	assert.throws(
		() => review.assertReviewSourceTransform?.(southWoodlandManifest),
		/camera-underlay-crossroads-south-blocked-woodland.*2\.04211869814933/
	);
});

test('Task 4 source review inventory includes eight presentation panels and seven inserts', async () => {
	const review = (await import('./render-meadow-entry-painted-v2-enrichment-review')) as {
		REVIEW_SOURCE_PANEL_IDS?: readonly string[];
		REVIEW_INSERT_IDS?: readonly string[];
	};
	assert.deepEqual(review.REVIEW_SOURCE_PANEL_IDS, PRESENTATION_IDS);
	assert.deepEqual(review.REVIEW_INSERT_IDS, INSERT_IDS);
});

test('--check does not create a missing output root', () => {
	const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const tempRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-missing-'));
	const outputRoot = join(tempRoot, 'missing-review');
	try {
		assert.equal(existsSync(outputRoot), false);
		const result = spawnSync(
			process.execPath,
			[
				join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
				'--mode',
				'baseline',
				'--check',
				'--output-root',
				outputRoot
			],
			{ cwd: repositoryRoot, encoding: 'utf8' }
		);
		assert.notEqual(result.status, 0);
		assert.match(`${result.stdout}\n${result.stderr}`, /output root is missing/);
		assert.equal(existsSync(outputRoot), false);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

test('review output rejects every repository path outside the sealed world-canonical-v2 review root', () => {
	const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	for (const outputRoot of [
		'.',
		'artifacts/meadow-entry/painted-v2',
		'artifacts/meadow-entry/painted-v2/source-inserts',
		'public/game/assets/regions/meadow-entry-painted-v2',
		'docs/superpowers/reports/img/hpa-586-painted-v2-organic-scenery'
	]) {
		const result = spawnSync(
			process.execPath,
			[
				join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
				'--mode',
				'baseline',
				'--output-root',
				outputRoot
			],
			{ cwd: repositoryRoot, encoding: 'utf8' }
		);
		assert.notEqual(result.status, 0, `unsafe repository output root was accepted: ${outputRoot}`);
		assert.match(
			`${result.stdout}\n${result.stderr}`,
			/must be outside the repository or inside the sealed world-canonical-v2 review root/
		);
	}
});

test('review artifact path guard rejects escaping output paths', () => {
	const outputRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-path-'));
	try {
		assert.throws(
			() => assertReviewArtifactPathWithinRoot(outputRoot, '../outside-review-artifact.png'),
			/escapes requested output root/
		);
		assert.doesNotThrow(() =>
			assertReviewArtifactPathWithinRoot(outputRoot, 'nested/review-artifact.png')
		);
	} finally {
		rmSync(outputRoot, { recursive: true, force: true });
	}
});

test('candidate review defaults to the world-canonical-v2 output root', () => {
	assert.match(DEFAULT_OUTPUT_ROOT, /(?:^|\/)world-canonical-v2$/);
});

test('review crop overlap guard compares exported overlap bytes in world coordinates', () => {
	const firstBounds = { left: 0, top: 0, right: 3, bottom: 2 };
	const secondBounds = { left: 1, top: 1, right: 4, bottom: 3 };
	const overlapBounds = { left: 1, top: 1, right: 3, bottom: 2 };
	const first = Buffer.alloc(3 * 2 * 4);
	const second = Buffer.alloc(3 * 2 * 4);
	const write = (buffer: Buffer, bounds: typeof firstBounds, x: number, y: number) => {
		const offset = ((y - bounds.top) * (bounds.right - bounds.left) + x - bounds.left) * 4;
		buffer[offset] = x;
		buffer[offset + 1] = y;
		buffer[offset + 2] = x + y;
		buffer[offset + 3] = 255;
	};
	for (let y = overlapBounds.top; y < overlapBounds.bottom; y += 1)
		for (let x = overlapBounds.left; x < overlapBounds.right; x += 1) {
			write(first, firstBounds, x, y);
			write(second, secondBounds, x, y);
		}
	assert.doesNotThrow(() =>
		assertReviewCropOverlapBuffersEqual(first, firstBounds, second, secondBounds, overlapBounds)
	);
	second[(0 * 3 + 0) * 4] = 99;
	assert.throws(
		() =>
			assertReviewCropOverlapBuffersEqual(first, firstBounds, second, secondBounds, overlapBounds),
		/overlap bytes differ/
	);
});

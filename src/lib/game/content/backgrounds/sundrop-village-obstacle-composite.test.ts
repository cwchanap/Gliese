import { createHash } from 'node:crypto';

import sharp from 'sharp';
import { describe, expect, test } from 'vitest';

import {
	compositeSundropVillageObstacles,
	type SundropVillageObstacleCompositeInput
} from './sundrop-village-obstacle-composite';

const WIDTH = 4;
const HEIGHT = 4;

interface FixtureProvenance {
	readonly controlFingerprint: string;
	readonly source: Record<string, unknown>;
	readonly chromaSource: Record<string, unknown>;
	readonly obstacleLayer: {
		readonly normalized: Record<string, unknown>;
	};
	readonly candidate: Record<string, unknown>;
	readonly masks: {
		readonly base: Record<string, unknown>;
		readonly foreground: Record<string, unknown>;
		readonly protected: Record<string, unknown>;
	};
	readonly outputs: {
		readonly base: Record<string, unknown>;
		readonly foreground: Record<string, unknown>;
	};
	readonly statistics: Record<string, unknown>;
}

function rgba(pixel: (x: number, y: number) => readonly [number, number, number, number]): Buffer {
	const data = Buffer.alloc(WIDTH * HEIGHT * 4);
	for (let y = 0; y < HEIGHT; y += 1) {
		for (let x = 0; x < WIDTH; x += 1) {
			const offset = (y * WIDTH + x) * 4;
			data.set(pixel(x, y), offset);
		}
	}
	return data;
}

async function png(data: Buffer): Promise<Buffer> {
	return sharp(data, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
		.png()
		.toBuffer();
}

async function decoded(contents: Buffer): Promise<Buffer> {
	return sharp(contents).ensureAlpha().raw().toBuffer();
}

function pixel(data: Buffer, x: number, y: number): readonly [number, number, number, number] {
	const offset = (y * WIDTH + x) * 4;
	return [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0, data[offset + 3] ?? 0];
}

async function fixtureInput(
	overrides: Partial<SundropVillageObstacleCompositeInput> = {}
): Promise<SundropVillageObstacleCompositeInput> {
	const baseAlpha = (x: number, y: number): number => 80 + x * 10 + y;
	const source = await png(rgba((x, y) => [10 + x, 20 + y, 30, baseAlpha(x, y)]));
	const chromaSource = await png(rgba(() => [255, 0, 255, 255]));
	const obstacleLayer = await png(
		rgba((x, y) => [100 + x, 110 + y, 120, x === 0 && y === 0 ? 0 : 200])
	);
	const baseMask = await png(rgba((x, y) => [255, 255, 255, x === 1 && y === 1 ? 255 : 0]));
	const foregroundMask = await png(
		rgba((x, y) => [255, 255, 255, x >= 1 && x <= 2 && y >= 1 ? 255 : 0])
	);
	const protectedMask = await png(rgba((x, y) => [0, 0, 0, x === 2 && y === 1 ? 255 : 0]));

	return {
		width: WIDTH,
		height: HEIGHT,
		source: { path: 'source.png', png: source },
		chromaSource: { path: 'chroma-source.png', png: chromaSource },
		obstacleLayer: { path: 'obstacle-layer.png', png: obstacleLayer },
		candidateOutputPath: 'candidate.png',
		masks: {
			base: { path: 'base-mask.png', png: baseMask },
			foreground: { path: 'foreground-mask.png', png: foregroundMask },
			protected: { path: 'protected-mask.png', png: protectedMask }
		},
		candidateAlignmentInsetPx: 0,
		normalizationTransform: {
			native: { width: WIDTH, height: HEIGHT },
			crop: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
			output: { width: WIDTH, height: HEIGHT },
			scaleX: 1,
			scaleY: 1
		},
		controlFingerprint: 'control-fingerprint',
		controlArtifacts: {
			'control.json': { path: 'control.json', bytes: Buffer.from('control') }
		},
		prompt: 'fixture prompt',
		baseAlpha,
		foregroundCutoffs: [{ id: 'horizontal-owner', left: 0, right: WIDTH, cutoffY: 2 }],
		foregroundExclusions: [],
		...overrides
	};
}

describe('compositeSundropVillageObstacles', () => {
	test('preserves base pixels outside the mask and replaces only permitted RGB', async () => {
		const input = await fixtureInput();
		const result = await compositeSundropVillageObstacles(input);
		const base = await decoded(result.basePng);
		const source = await decoded(input.source.png);

		expect(pixel(base, 0, 0)).toEqual(pixel(source, 0, 0));
		expect(pixel(base, 2, 2)).toEqual(pixel(source, 2, 2));
		expect(pixel(base, 1, 1)).toEqual([82, 92, 101, 91]);
	});

	test('constructs a source-backed candidate and clips foreground to every guard', async () => {
		const input = await fixtureInput();
		const result = await compositeSundropVillageObstacles(input);
		const candidate = await decoded(result.candidatePng);
		const source = await decoded(input.source.png);
		const foreground = await decoded(result.foregroundPng);

		expect(pixel(candidate, 0, 0)).toEqual([
			pixel(source, 0, 0)[0],
			pixel(source, 0, 0)[1],
			pixel(source, 0, 0)[2],
			0
		]);
		expect(pixel(candidate, 1, 1)).toEqual([82, 92, 101, 200]);
		expect(pixel(foreground, 0, 1)).toEqual([0, 0, 0, 0]);
		expect(pixel(foreground, 2, 1)).toEqual([0, 0, 0, 0]);
		expect(pixel(foreground, 1, 2)).toEqual([0, 0, 0, 0]);
		expect(pixel(foreground, 1, 1)).toEqual([82, 92, 101, Math.round((200 * 91) / 255)]);
	});

	test('returns candidate contribution to source identity at the inner base-mask boundary', async () => {
		const input = await fixtureInput({ candidateAlignmentInsetPx: 1 });
		const result = await compositeSundropVillageObstacles(input);
		const source = await decoded(input.source.png);
		const candidate = await decoded(result.candidatePng);
		const base = await decoded(result.basePng);
		const provenance = JSON.parse(result.provenanceJson.toString('utf8'));

		expect(pixel(candidate, 1, 1)).toEqual([
			pixel(source, 1, 1)[0],
			pixel(source, 1, 1)[1],
			pixel(source, 1, 1)[2],
			0
		]);
		expect(pixel(base, 1, 1)).toEqual(pixel(source, 1, 1));
		expect(provenance.candidate.alignment).toMatchObject({
			method: 'base-permitted-inner-linear-feather',
			insetPx: 1,
			sourceIdentityAtDistancePx: 1,
			fullContributionAtDistancePx: 2,
			changedAlphaPixels: 1,
			zeroedBoundaryPixels: 1
		});
	});

	test('emits deterministic canonical PNGs and complete zero-violation provenance', async () => {
		const input = await fixtureInput();
		const first = await compositeSundropVillageObstacles(input);
		const second = await compositeSundropVillageObstacles(input);
		const provenance = JSON.parse(first.provenanceJson.toString('utf8')) as FixtureProvenance;

		expect(first.basePng).toEqual(second.basePng);
		expect(first.foregroundPng).toEqual(second.foregroundPng);
		expect(first.candidatePng).toEqual(second.candidatePng);
		expect(first.provenanceJson).toEqual(second.provenanceJson);
		expect(provenance).toMatchObject({
			controlFingerprint: 'control-fingerprint',
			source: {
				path: 'source.png',
				sha256: createHash('sha256').update(input.source.png).digest('hex')
			},
			chromaSource: { path: 'chroma-source.png' },
			obstacleLayer: { path: 'obstacle-layer.png' },
			candidate: { path: 'candidate.png' },
			masks: {
				base: { path: 'base-mask.png' },
				foreground: { path: 'foreground-mask.png' },
				protected: { path: 'protected-mask.png' }
			},
			outputs: {
				base: { sha256: createHash('sha256').update(first.basePng).digest('hex') },
				foreground: {
					sha256: createHash('sha256').update(first.foregroundPng).digest('hex')
				}
			},
			statistics: {
				baseAlphaViolations: 0,
				protectedAreaViolations: 0,
				foregroundMaskViolations: 0,
				foregroundCutoffViolations: 0,
				foregroundEdgeAlphaViolations: 0
			}
		});
		for (const section of [
			provenance.source,
			provenance.chromaSource,
			provenance.obstacleLayer.normalized,
			provenance.candidate,
			provenance.masks.base,
			provenance.masks.foreground,
			provenance.masks.protected,
			provenance.outputs.base,
			provenance.outputs.foreground
		]) {
			expect(section.pixelsSha256).toMatch(/^[a-f0-9]{64}$/);
		}
	});

	test('rejects a non-uniform normalization transform', async () => {
		const input = await fixtureInput();
		await expect(
			compositeSundropVillageObstacles({
				...input,
				normalizationTransform: {
					...input.normalizationTransform,
					scaleY: 2
				}
			})
		).rejects.toThrow(/uniform/i);
	});
});

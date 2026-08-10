import { describe, expect, it } from 'vitest';

import {
	buildSundropVillageLowResolutionMasks,
	buildSundropVillageRetouchWeightMaps,
	measureSundropVillageIdenticalDeltaRuns,
	sundropVillageEdgeGuardStrength,
	type SundropVillageRetouchMaskSource
} from './sundrop-village-retouch';

const fixture: SundropVillageRetouchMaskSource = {
	width: 7,
	height: 6,
	tileSize: 256,
	layers: {
		regions: ['HP.....', '..M....', '.......', '.......', '.......', '.......'],
		paths: ['p......', '.p.....', '.......', '.......', '.......', '.......']
	}
};

describe('Sundrop Village retouch helpers', () => {
	it('derives one-hot district and path masks from a supplied fixture', () => {
		const masks = buildSundropVillageLowResolutionMasks(fixture);
		expect(masks.width).toBe(7);
		expect(masks.height).toBe(6);
		expect(masks.districts.H[0]).toBe(255);
		expect(masks.districts.P[1]).toBe(255);
		expect(masks.districts.M[9]).toBe(255);
		expect(masks.path[0]).toBe(255);
		expect(masks.path[8]).toBe(255);
		expect(masks.path[2]).toBe(0);
	});

	it('provides scalar weight maps for a supplied fixture', async () => {
		const weights = await buildSundropVillageRetouchWeightMaps(fixture);
		expect(weights.width).toBe(1792);
		expect(weights.height).toBe(1536);
		expect(weights.districtSigmaPx).toBe(48);
		expect(weights.pathSigmaPx).toBe(24);
		const pixelCount = weights.width * weights.height;
		for (const district of Object.values(weights.districts)) {
			expect(district).toHaveLength(pixelCount);
		}
		expect(weights.pathStrength).toHaveLength(pixelCount);
	});

	it('keeps the edge guard bounded and deterministic', () => {
		expect(sundropVillageEdgeGuardStrength(0, 768)).toBe(0);
		expect(sundropVillageEdgeGuardStrength(48, 768)).toBeCloseTo(0.5, 8);
		expect(sundropVillageEdgeGuardStrength(96, 768)).toBe(1);
		expect(sundropVillageEdgeGuardStrength(896, 768)).toBe(1);
	});
});

describe('Sundrop Village identical-delta diagnostic', () => {
	it('detects a long source-independent RGB-delta run in a graded transition', () => {
		const width = 40;
		const source = Buffer.alloc(width * 4);
		const output = Buffer.alloc(width * 4);
		const gradedTransitionMask = new Uint8Array(width).fill(1);
		for (let x = 0; x < width; x += 1) {
			const offset = x * 4;
			source[offset] = 20 + x * 3;
			source[offset + 1] = 80 + x;
			source[offset + 2] = 180 - x * 2;
			source[offset + 3] = 255;
			output[offset] = (source[offset] ?? 0) + 3;
			output[offset + 1] = (source[offset + 1] ?? 0) - 2;
			output[offset + 2] = (source[offset + 2] ?? 0) + 1;
			output[offset + 3] = 255;
		}

		expect(
			measureSundropVillageIdenticalDeltaRuns(source, output, gradedTransitionMask, width, 1)
		).toEqual({
			thresholdPx: 32,
			maximumRunLength: 40,
			longRunCount: 1
		});
	});
});

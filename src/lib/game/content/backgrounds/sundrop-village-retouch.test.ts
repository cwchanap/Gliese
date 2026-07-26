import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';

import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';

import {
	buildSundropVillageLowResolutionMasks,
	buildSundropVillageRetouchWeightMaps,
	measureSundropVillageIdenticalDeltaRuns,
	retouchSundropVillagePng,
	SUNDROP_VILLAGE_RETOUCH_INPUT_PATH,
	sundropVillageEdgeGuardStrength,
	type SundropVillageRetouchResult
} from './sundrop-village-retouch';

const INPUT_PATH = join(process.cwd(), SUNDROP_VILLAGE_RETOUCH_INPUT_PATH);
const EXPECTED_INPUT_SHA256 = '20a3625640131917f18d1309b0c192f2cbdac5e4279fe9e6abb23c24c64859fd';
const WIDTH = 1792;
const HEIGHT = 1536;
const TILE_SIZE = 32;

let inputPng: Buffer;
let firstResult: SundropVillageRetouchResult;
let secondResult: SundropVillageRetouchResult;
let inputRgba: Buffer;
let outputRgba: Buffer;

function replaceGlyph(row: string, column: number, glyph: string): string {
	return `${row.slice(0, column)}${glyph}${row.slice(column + 1)}`;
}

beforeAll(async () => {
	inputPng = await readFile(INPUT_PATH);
	firstResult = await retouchSundropVillagePng(inputPng);
	secondResult = await retouchSundropVillagePng(inputPng);
	inputRgba = await sharp(inputPng).toColourspace('srgb').ensureAlpha().raw().toBuffer();
	outputRgba = await sharp(firstResult.png).toColourspace('srgb').ensureAlpha().raw().toBuffer();
});

describe('Sundrop Village deterministic retouch masks', () => {
	it('derives one-hot district and path cells from the supplied layered source', () => {
		const source = structuredClone(sundropVillageLayered);
		const regionRow = source.layers.regions.findIndex((row) => row.includes('H'));
		const regionColumn = source.layers.regions[regionRow]?.indexOf('H') ?? -1;
		const pathRow = source.layers.paths.findIndex((row) => [...row].some((glyph) => glyph !== '.'));
		const pathColumn = [...(source.layers.paths[pathRow] ?? '')].findIndex(
			(glyph) => glyph !== '.'
		);
		expect(regionRow).toBeGreaterThanOrEqual(0);
		expect(regionColumn).toBeGreaterThanOrEqual(0);
		expect(pathRow).toBeGreaterThanOrEqual(0);
		expect(pathColumn).toBeGreaterThanOrEqual(0);

		const mutableRegions = source.layers.regions as string[];
		const mutablePaths = source.layers.paths as string[];
		mutableRegions[regionRow] = replaceGlyph(
			source.layers.regions[regionRow] ?? '',
			regionColumn,
			'C'
		);
		mutablePaths[pathRow] = replaceGlyph(source.layers.paths[pathRow] ?? '', pathColumn, '.');

		const masks = buildSundropVillageLowResolutionMasks(source);
		const regionIndex = regionRow * source.width + regionColumn;
		const pathIndex = pathRow * source.width + pathColumn;

		expect(masks.width).toBe(56);
		expect(masks.height).toBe(48);
		expect(masks.districts.H[regionIndex]).toBe(0);
		expect(masks.districts.C[regionIndex]).toBe(255);
		expect(masks.path[pathIndex]).toBe(0);

		for (let row = 0; row < source.height; row += 1) {
			for (let column = 0; column < source.width; column += 1) {
				const index = row * source.width + column;
				const regionGlyph = source.layers.regions[row]?.[column] ?? '.';
				const activeDistricts = Object.values(masks.districts).filter(
					(mask) => mask[index] === 255
				);
				expect(activeDistricts).toHaveLength(regionGlyph === '.' ? 0 : 1);
				expect(masks.path[index]).toBe(source.layers.paths[row]?.[column] === '.' ? 0 : 255);
			}
		}
	});

	it('feathers source masks while capping every authored path-cell center at 40 percent', async () => {
		const lowResolution = buildSundropVillageLowResolutionMasks(sundropVillageLayered);
		const weights = await buildSundropVillageRetouchWeightMaps(sundropVillageLayered);

		expect(weights.width).toBe(WIDTH);
		expect(weights.height).toBe(HEIGHT);
		expect(weights.districtSigmaPx).toBe(48);
		expect(weights.pathSigmaPx).toBe(24);

		for (let row = 0; row < lowResolution.height; row += 1) {
			for (let column = 0; column < lowResolution.width; column += 1) {
				const cell = row * lowResolution.width + column;
				if (lowResolution.path[cell] !== 255) continue;
				const pixelX = column * TILE_SIZE + TILE_SIZE / 2;
				const pixelY = row * TILE_SIZE + TILE_SIZE / 2;
				const pixel = pixelY * WIDTH + pixelX;
				expect(weights.pathStrength[pixel]).toBeLessThanOrEqual(0.4);
			}
		}
	});

	it('provides exactly one scalar district and path weight per output pixel', async () => {
		const weights = await buildSundropVillageRetouchWeightMaps(sundropVillageLayered);
		const pixelCount = WIDTH * HEIGHT;

		for (const districtWeights of Object.values(weights.districts)) {
			expect(districtWeights).toHaveLength(pixelCount);
		}
		expect(weights.pathStrength).toHaveLength(pixelCount);
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

describe('Sundrop Village deterministic retouch output', () => {
	it('produces deterministic PNG and provenance bytes from the approved source', () => {
		expect(createHash('sha256').update(inputPng).digest('hex')).toBe(EXPECTED_INPUT_SHA256);
		expect(firstResult.png.equals(secondResult.png)).toBe(true);
		expect(firstResult.provenanceJson.equals(secondResult.provenanceJson)).toBe(true);
		expect(firstResult.provenance.input.pathContract).toBe(
			'docs/superpowers/reports/img/hpa-307/village-background-retouch-base.png'
		);
		expect(firstResult.provenance.input.sha256).toBe(EXPECTED_INPUT_SHA256);
		expect(firstResult.provenance.output.sha256).toBe(
			createHash('sha256').update(firstResult.png).digest('hex')
		);
	});

	it('keeps exact dimensions, writes an opaque intermediate, and changes only same-coordinate RGB', () => {
		expect(firstResult.provenance.input.dimensions).toEqual({ width: WIDTH, height: HEIGHT });
		expect(firstResult.provenance.output.dimensions).toEqual({ width: WIDTH, height: HEIGHT });
		expect(inputRgba).toHaveLength(WIDTH * HEIGHT * 4);
		expect(outputRgba).toHaveLength(WIDTH * HEIGHT * 4);

		let maximumDelta = 0;
		let changedPixels = 0;
		let nonOpaquePixels = 0;
		for (let pixel = 0; pixel < WIDTH * HEIGHT; pixel += 1) {
			const offset = pixel * 4;
			let changed = false;
			for (let channel = 0; channel < 3; channel += 1) {
				const delta = Math.abs(
					(outputRgba[offset + channel] ?? 0) - (inputRgba[offset + channel] ?? 0)
				);
				maximumDelta = Math.max(maximumDelta, delta);
				changed ||= delta > 0;
			}
			if (changed) changedPixels += 1;
			if (outputRgba[offset + 3] !== 255) nonOpaquePixels += 1;
		}

		expect(nonOpaquePixels).toBe(0);
		expect(maximumDelta).toBeLessThanOrEqual(16);
		expect(changedPixels).toBeGreaterThan(0);
		expect(firstResult.provenance.statistics.maximumAbsoluteChannelDelta).toBe(maximumDelta);
		expect(firstResult.provenance.statistics.changedPixels).toBe(changedPixels);
	});

	it('preserves every RGB byte on all four canvas boundaries and fades over the 96px guard', () => {
		for (let x = 0; x < WIDTH; x += 1) {
			for (const y of [0, HEIGHT - 1]) {
				const offset = (y * WIDTH + x) * 4;
				expect(outputRgba.subarray(offset, offset + 3)).toEqual(
					inputRgba.subarray(offset, offset + 3)
				);
			}
		}
		for (let y = 0; y < HEIGHT; y += 1) {
			for (const x of [0, WIDTH - 1]) {
				const offset = (y * WIDTH + x) * 4;
				expect(outputRgba.subarray(offset, offset + 3)).toEqual(
					inputRgba.subarray(offset, offset + 3)
				);
			}
		}

		expect(sundropVillageEdgeGuardStrength(0, HEIGHT / 2)).toBe(0);
		expect(sundropVillageEdgeGuardStrength(48, HEIGHT / 2)).toBeCloseTo(0.5, 8);
		expect(sundropVillageEdgeGuardStrength(96, HEIGHT / 2)).toBe(1);
		expect(sundropVillageEdgeGuardStrength(WIDTH / 2, HEIGHT / 2)).toBe(1);
	});

	it('records the source-derived geometry and bounded retouch parameters', () => {
		expect(firstResult.provenance.controlFingerprint).toBe(
			'0c47a7dc58d48e87fa9dd9c290cf6835b8acc3f4eb60a4e2c1ba4eae37e4ed33'
		);
		expect(firstResult.provenance.algorithmVersion).toBe('sundrop-village-retouch-v3');
		expect(firstResult.provenance.spatialTransform).toBe('same-coordinate-additive-rgb');
		expect(firstResult.provenance.masks).toEqual({
			source: 'sundropVillageLayered.layers.regions+paths',
			grid: { width: 56, height: 48, tileSize: 32 },
			expansion: 'nearest-neighbor',
			districtSigmaPx: 48,
			pathSigmaPx: 24
		});
		expect(firstResult.provenance.edgeGuard).toEqual({
			distancePx: 96,
			profile: 'linear',
			boundaryStrength: 0,
			fullStrength: 1,
			fullStrengthAtDistancePx: 96,
			byteIdenticalRegion: 'canvas-boundary-only'
		});
		expect(firstResult.provenance.maximumPathStrength).toBe(0.4);
		expect(firstResult.provenance.maximumAbsoluteChannelDelta).toBe(16);
		expect(firstResult.provenance.districtGrades).toEqual({
			H: { red: 15, green: 4, blue: -9 },
			P: { red: -12, green: 6, blue: 15 },
			M: { red: 11, green: -5, blue: -11 },
			N: { red: -10, green: 0, blue: 11 },
			G: { red: -6, green: 4, blue: 14 },
			S: { red: -7, green: 7, blue: 10 },
			E: { red: 15, green: -2, blue: -10 },
			C: { red: 0, green: 0, blue: 0 }
		});
		expect(firstResult.provenance.statistics.identicalRgbDeltaRunThresholdPx).toBe(32);
		expect(
			firstResult.provenance.statistics.maximumIdenticalRgbDeltaRunLengthInGradedTransitions
		).toBeGreaterThanOrEqual(0);
		expect(
			firstResult.provenance.statistics.longIdenticalRgbDeltaRunsInGradedTransitions
		).toBeGreaterThanOrEqual(0);
	});

	it('rejects any input whose exact PNG bytes do not match the approved source hash', async () => {
		const wrongInput = Buffer.from(inputPng);
		wrongInput[wrongInput.length - 1] = (wrongInput[wrongInput.length - 1] ?? 0) ^ 0x01;

		await expect(retouchSundropVillagePng(wrongInput)).rejects.toThrow(
			/Sundrop Village retouch input SHA-256.*20a36256/
		);
	});
});

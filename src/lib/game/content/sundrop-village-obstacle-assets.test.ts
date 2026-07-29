import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';
import { beforeAll, describe, expect, test } from 'vitest';

import { sundropVillageBackgroundsApproval } from './approvals/sundrop-village-backgrounds';
import { sundropVillageBackgroundAlpha } from './backgrounds/sundrop-village-background';
import { buildSundropVillageObstacleControlInputs } from './backgrounds/sundrop-village-obstacle-controls';
import type { SundropVillageObstacleNormalizationTransform } from './backgrounds/sundrop-village-obstacle-composite';
import { SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP } from './backgrounds/sundrop-village-obstacle-ownership';
import {
	SUNDROP_VILLAGE_BACKGROUND_COMBINED_HARD_LIMIT_BYTES,
	SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
	SUNDROP_VILLAGE_BACKGROUND_WIDTH,
	SUNDROP_VILLAGE_BASE_BACKGROUND_HARD_LIMIT_BYTES,
	SUNDROP_VILLAGE_BASE_BACKGROUND_REVIEW_TARGET_BYTES,
	SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_HARD_LIMIT_BYTES,
	SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID,
	SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_REVIEW_TARGET_BYTES,
	SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX
} from './backgrounds/sundrop-village-backgrounds';
import { SUNDROP_VILLAGE_OBSTACLE_CONTROL_FINGERPRINT } from './generated/sundrop-village-obstacle-control';

const root = process.cwd();
const reports = join(root, 'docs/superpowers/reports/img/hpa-398');
const basePath = join(root, 'public/game/assets/regions/sundrop-village-base.png');
const foregroundPath = join(root, 'public/game/assets/regions/sundrop-village-foreground.png');
const sourcePath = join(reports, 'sundrop-village-hpa-307-ground-input.png');
const chromaSourcePath = join(reports, 'village-obstacle-chroma-source.png');
const obstacleLayerPath = join(reports, 'village-obstacle-layer.png');
const candidatePath = join(reports, 'village-obstacle-candidate.png');
const baseMaskPath = join(reports, 'village-obstacle-base-mask.svg');
const foregroundMaskPath = join(reports, 'village-obstacle-foreground-mask.svg');
const protectedMaskPath = join(reports, 'village-obstacle-protected-mask.svg');
const transformPath = join(reports, 'village-obstacle-candidate-transform.json');
const provenancePath = join(reports, 'village-obstacle-provenance.json');
const CANDIDATE_ALIGNMENT_INSET_PX = 16;

interface Decoded {
	readonly data: Buffer;
	readonly width: number;
	readonly height: number;
	readonly channels: number;
}

function sha256(contents: Uint8Array): string {
	return createHash('sha256').update(contents).digest('hex');
}

async function decode(contents: Buffer): Promise<Decoded> {
	const { data, info } = await sharp(contents)
		.toColourspace('srgb')
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	return { data, width: info.width, height: info.height, channels: info.channels };
}

function chunkTypes(png: Buffer): string[] {
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	if (!png.subarray(0, 8).equals(signature)) return [];
	const types: string[] = [];
	let offset = 8;
	while (offset + 12 <= png.length) {
		const length = png.readUInt32BE(offset);
		const type = png.toString('ascii', offset + 4, offset + 8);
		types.push(type);
		offset += 12 + length;
		if (type === 'IEND') break;
	}
	return offset === png.length ? types : [];
}

function rgbaEqual(left: Buffer, right: Buffer, offset: number): boolean {
	return (
		left[offset] === right[offset] &&
		left[offset + 1] === right[offset + 1] &&
		left[offset + 2] === right[offset + 2] &&
		left[offset + 3] === right[offset + 3]
	);
}

function rgbEqual(left: Buffer, right: Buffer, offset: number): boolean {
	return (
		left[offset] === right[offset] &&
		left[offset + 1] === right[offset + 1] &&
		left[offset + 2] === right[offset + 2]
	);
}

function alphaAt(data: Buffer, pixel: number): number {
	return data[pixel * 4 + 3] ?? 0;
}

function pixelBounds(rect: { x: number; y: number; width: number; height: number }) {
	return {
		left: Math.max(0, Math.floor(rect.x - rect.width / 2)),
		right: Math.min(SUNDROP_VILLAGE_BACKGROUND_WIDTH, Math.ceil(rect.x + rect.width / 2)),
		top: Math.max(0, Math.floor(rect.y - rect.height / 2)),
		bottom: Math.min(SUNDROP_VILLAGE_BACKGROUND_HEIGHT, Math.ceil(rect.y + rect.height / 2))
	};
}

const basePng = readFileSync(basePath);
const foregroundPng = readFileSync(foregroundPath);
const sourcePng = readFileSync(sourcePath);
const chromaSourcePng = readFileSync(chromaSourcePath);
const obstacleLayerPng = readFileSync(obstacleLayerPath);
const candidatePng = readFileSync(candidatePath);
const baseMaskSvg = readFileSync(baseMaskPath);
const foregroundMaskSvg = readFileSync(foregroundMaskPath);
const protectedMaskSvg = readFileSync(protectedMaskPath);
const transform = JSON.parse(
	readFileSync(transformPath, 'utf8')
) as SundropVillageObstacleNormalizationTransform;
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'));
const controls = buildSundropVillageObstacleControlInputs(root);

let base: Decoded;
let foreground: Decoded;
let source: Decoded;
let candidate: Decoded;
let rawObstacleLayer: Decoded;
let obstacleLayer: Decoded;
let baseMask: Decoded;
let foregroundMask: Decoded;
let protectedMask: Decoded;
let candidateAlignmentDistance: Uint16Array;

function buildCandidateAlignmentDistance(): Uint16Array {
	const maximumDistance = CANDIDATE_ALIGNMENT_INSET_PX + 1;
	const distance = new Uint16Array(
		SUNDROP_VILLAGE_BACKGROUND_WIDTH * SUNDROP_VILLAGE_BACKGROUND_HEIGHT
	);
	for (let pixel = 0; pixel < distance.length; pixel += 1) {
		distance[pixel] =
			alphaAt(baseMask.data, pixel) > 0 && alphaAt(protectedMask.data, pixel) === 0
				? maximumDistance
				: 0;
	}
	for (let y = 0; y < SUNDROP_VILLAGE_BACKGROUND_HEIGHT; y += 1) {
		for (let x = 0; x < SUNDROP_VILLAGE_BACKGROUND_WIDTH; x += 1) {
			const pixel = y * SUNDROP_VILLAGE_BACKGROUND_WIDTH + x;
			if (distance[pixel] === 0) continue;
			const left = x === 0 ? 0 : (distance[pixel - 1] ?? 0);
			const top = y === 0 ? 0 : (distance[pixel - SUNDROP_VILLAGE_BACKGROUND_WIDTH] ?? 0);
			distance[pixel] = Math.min(distance[pixel] ?? maximumDistance, left + 1, top + 1);
		}
	}
	for (let y = SUNDROP_VILLAGE_BACKGROUND_HEIGHT - 1; y >= 0; y -= 1) {
		for (let x = SUNDROP_VILLAGE_BACKGROUND_WIDTH - 1; x >= 0; x -= 1) {
			const pixel = y * SUNDROP_VILLAGE_BACKGROUND_WIDTH + x;
			if (distance[pixel] === 0) continue;
			const right = x === SUNDROP_VILLAGE_BACKGROUND_WIDTH - 1 ? 0 : (distance[pixel + 1] ?? 0);
			const bottom =
				y === SUNDROP_VILLAGE_BACKGROUND_HEIGHT - 1
					? 0
					: (distance[pixel + SUNDROP_VILLAGE_BACKGROUND_WIDTH] ?? 0);
			distance[pixel] = Math.min(distance[pixel] ?? maximumDistance, right + 1, bottom + 1);
		}
	}
	return distance;
}

beforeAll(async () => {
	[base, foreground, source, candidate, rawObstacleLayer, baseMask, foregroundMask, protectedMask] =
		await Promise.all([
			decode(basePng),
			decode(foregroundPng),
			decode(sourcePng),
			decode(candidatePng),
			decode(obstacleLayerPng),
			decode(baseMaskSvg),
			decode(foregroundMaskSvg),
			decode(protectedMaskSvg)
		]);
	const normalized = await sharp(obstacleLayerPng)
		.extract({
			left: transform.crop.x,
			top: transform.crop.y,
			width: transform.crop.width,
			height: transform.crop.height
		})
		.resize(transform.output.width, transform.output.height, {
			fit: 'fill',
			kernel: sharp.kernel.lanczos3
		})
		.toColourspace('srgb')
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	obstacleLayer = {
		data: normalized.data,
		width: normalized.info.width,
		height: normalized.info.height,
		channels: normalized.info.channels
	};
	candidateAlignmentDistance = buildCandidateAlignmentDistance();
});

describe('Sundrop Village obstacle production assets', () => {
	test('match independent approvals, canonical PNG shape, dimensions, and decoded hashes', () => {
		for (const [png, decoded, approval, recorded] of [
			[basePng, base, sundropVillageBackgroundsApproval.base, provenance.outputs.base],
			[
				foregroundPng,
				foreground,
				sundropVillageBackgroundsApproval.foreground,
				provenance.outputs.foreground
			]
		] as const) {
			const chunks = chunkTypes(png);
			expect(chunks[0]).toBe('IHDR');
			expect(chunks.at(-1)).toBe('IEND');
			expect(chunks.slice(1, -1).every((chunk) => chunk === 'IDAT')).toBe(true);
			expect(png[24]).toBe(8);
			expect(png[25]).toBe(6);
			expect(decoded).toMatchObject({
				width: SUNDROP_VILLAGE_BACKGROUND_WIDTH,
				height: SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
				channels: 4
			});
			expect(sha256(png)).toBe(approval.approvedPngSha256);
			expect(sha256(png)).toBe(recorded.sha256);
			expect(sha256(decoded.data)).toBe(recorded.pixelsSha256);
		}
		expect(provenance.controlFingerprint).toBe(
			sundropVillageBackgroundsApproval.approvedControlFingerprint
		);
		expect(provenance.controlFingerprint).toBe(SUNDROP_VILLAGE_OBSTACLE_CONTROL_FINGERPRINT);
		expect(provenance.algorithmVersion).toBe('sundrop-village-obstacle-composite-v3');
		expect(provenance.chromaSource).toMatchObject({
			path: 'docs/superpowers/reports/img/hpa-398/village-obstacle-chroma-source.png',
			sha256: sha256(chromaSourcePng)
		});
		expect(provenance.obstacleLayer).toMatchObject({
			path: 'docs/superpowers/reports/img/hpa-398/village-obstacle-layer.png',
			sha256: sha256(obstacleLayerPng)
		});
		expect(provenance.candidate).toMatchObject({
			path: 'docs/superpowers/reports/img/hpa-398/village-obstacle-candidate.png',
			sha256: sha256(candidatePng),
			pixelsSha256: sha256(candidate.data),
			alignment: {
				method: 'base-permitted-inner-linear-feather',
				insetPx: CANDIDATE_ALIGNMENT_INSET_PX,
				sourceIdentityAtDistancePx: 1,
				fullContributionAtDistancePx: CANDIDATE_ALIGNMENT_INSET_PX + 1
			}
		});
	});

	test('constructs candidate RGB over the immutable source while retaining obstacle alpha', () => {
		let constructionViolations = 0;
		let transparentSourceRgbViolations = 0;
		for (
			let pixel = 0;
			pixel < SUNDROP_VILLAGE_BACKGROUND_WIDTH * SUNDROP_VILLAGE_BACKGROUND_HEIGHT;
			pixel += 1
		) {
			const offset = pixel * 4;
			const obstacleAlpha = obstacleLayer.data[offset + 3] ?? 0;
			const boundaryDistance = candidateAlignmentDistance[pixel] ?? 0;
			const alignmentWeight =
				boundaryDistance === 0
					? 1
					: Math.min(1, Math.max(0, (boundaryDistance - 1) / CANDIDATE_ALIGNMENT_INSET_PX));
			const alpha = Math.round(obstacleAlpha * alignmentWeight);
			for (let channel = 0; channel < 3; channel += 1) {
				const expected =
					alpha === 0
						? (source.data[offset + channel] ?? 0)
						: Math.round(
								((obstacleLayer.data[offset + channel] ?? 0) * alpha +
									(source.data[offset + channel] ?? 0) * (255 - alpha)) /
									255
							);
				if ((candidate.data[offset + channel] ?? 0) !== expected) constructionViolations += 1;
				if (
					alpha === 0 &&
					(candidate.data[offset + channel] ?? 0) !== (source.data[offset + channel] ?? 0)
				) {
					transparentSourceRgbViolations += 1;
				}
			}
			if ((candidate.data[offset + 3] ?? 0) !== alpha) constructionViolations += 1;
		}
		expect(constructionViolations).toBe(0);
		expect(transparentSourceRgbViolations).toBe(0);
	});

	test('archives a genuine transparent obstacle layer with clean transparent corners', () => {
		let minimum = 255;
		let maximum = 0;
		let transparentPixels = 0;
		for (let pixel = 0; pixel < rawObstacleLayer.width * rawObstacleLayer.height; pixel += 1) {
			const alpha = alphaAt(rawObstacleLayer.data, pixel);
			minimum = Math.min(minimum, alpha);
			maximum = Math.max(maximum, alpha);
			if (alpha === 0) transparentPixels += 1;
		}
		const corners = [
			alphaAt(rawObstacleLayer.data, 0),
			alphaAt(rawObstacleLayer.data, rawObstacleLayer.width - 1),
			alphaAt(rawObstacleLayer.data, (rawObstacleLayer.height - 1) * rawObstacleLayer.width),
			alphaAt(rawObstacleLayer.data, rawObstacleLayer.height * rawObstacleLayer.width - 1)
		];
		expect(minimum).toBe(0);
		expect(maximum).toBe(255);
		expect(transparentPixels).toBeGreaterThan(0);
		expect(corners).toEqual([0, 0, 0, 0]);
		expect(provenance.obstacleLayer.alpha).toMatchObject({
			minimum,
			maximum,
			transparentPixels,
			cornerAlpha: corners
		});
	});

	test('preserves source RGBA outside the permitted base mask and exact HPA-307 alpha', () => {
		let outsideMaskViolations = 0;
		let baseAlphaViolations = 0;
		for (let y = 0; y < SUNDROP_VILLAGE_BACKGROUND_HEIGHT; y += 1) {
			for (let x = 0; x < SUNDROP_VILLAGE_BACKGROUND_WIDTH; x += 1) {
				const pixel = y * SUNDROP_VILLAGE_BACKGROUND_WIDTH + x;
				const offset = pixel * 4;
				const permitted =
					alphaAt(baseMask.data, pixel) > 0 && alphaAt(protectedMask.data, pixel) === 0;
				if (!permitted && !rgbaEqual(base.data, source.data, offset)) outsideMaskViolations += 1;
				if (
					(base.data[offset + 3] ?? 0) !==
					sundropVillageBackgroundAlpha(
						x,
						y,
						SUNDROP_VILLAGE_BACKGROUND_WIDTH,
						SUNDROP_VILLAGE_BACKGROUND_HEIGHT
					)
				) {
					baseAlphaViolations += 1;
				}
			}
		}
		expect(outsideMaskViolations).toBe(0);
		expect(baseAlphaViolations).toBe(0);
		expect(provenance.statistics.baseAlphaViolations).toBe(0);
	});

	test('returns base RGB to source identity before every permitted-mask boundary', () => {
		const permittedAt = (x: number, y: number): boolean => {
			if (
				x < 0 ||
				x >= SUNDROP_VILLAGE_BACKGROUND_WIDTH ||
				y < 0 ||
				y >= SUNDROP_VILLAGE_BACKGROUND_HEIGHT
			) {
				return false;
			}
			const pixel = y * SUNDROP_VILLAGE_BACKGROUND_WIDTH + x;
			return alphaAt(baseMask.data, pixel) > 0 && alphaAt(protectedMask.data, pixel) === 0;
		};
		let boundaryPixels = 0;
		let sourceIdentityViolations = 0;
		for (let y = 0; y < SUNDROP_VILLAGE_BACKGROUND_HEIGHT; y += 1) {
			for (let x = 0; x < SUNDROP_VILLAGE_BACKGROUND_WIDTH; x += 1) {
				if (!permittedAt(x, y)) continue;
				const isInnerBoundary = [
					[x - 1, y],
					[x + 1, y],
					[x, y - 1],
					[x, y + 1]
				].some(([neighborX, neighborY]) => !permittedAt(neighborX ?? -1, neighborY ?? -1));
				if (!isInnerBoundary) continue;
				boundaryPixels += 1;
				const offset = (y * SUNDROP_VILLAGE_BACKGROUND_WIDTH + x) * 4;
				if (!rgbEqual(base.data, source.data, offset)) sourceIdentityViolations += 1;
			}
		}
		expect(boundaryPixels).toBeGreaterThan(0);
		expect(sourceIdentityViolations).toBe(0);
	});

	test('derives exact foreground alpha from mask, protection, edge profile, and 33px cutoffs', () => {
		const cutoffs = controls.foregroundRects.map((rect) => ({
			...rect,
			left: rect.x - rect.width / 2,
			right: rect.x + rect.width / 2,
			cutoffY: rect.bottom ?? -1
		}));
		const baseOnlyIds = new Set(
			SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.filter((entry) => !entry.foregroundMargins).map(
				(entry) => entry.blockerId
			)
		);
		const exclusions = controls.baseRects.filter((rect) => baseOnlyIds.has(rect.id));
		let alphaViolations = 0;
		let protectedViolations = 0;
		let outsideMaskViolations = 0;
		let cutoffViolations = 0;
		for (let y = 0; y < SUNDROP_VILLAGE_BACKGROUND_HEIGHT; y += 1) {
			for (let x = 0; x < SUNDROP_VILLAGE_BACKGROUND_WIDTH; x += 1) {
				const pixel = y * SUNDROP_VILLAGE_BACKGROUND_WIDTH + x;
				const masked = alphaAt(foregroundMask.data, pixel) > 0;
				const protectedPixel = alphaAt(protectedMask.data, pixel) > 0;
				const cutoffSafe = cutoffs.some(
					(cutoff) => x >= cutoff.left && x < cutoff.right && y < cutoff.cutoffY
				);
				const excluded = exclusions.some(
					(rect) =>
						x >= rect.x - rect.width / 2 &&
						x < rect.x + rect.width / 2 &&
						y >= rect.y - rect.height / 2 &&
						y < rect.y + rect.height / 2
				);
				const edgeAlpha = sundropVillageBackgroundAlpha(
					x,
					y,
					SUNDROP_VILLAGE_BACKGROUND_WIDTH,
					SUNDROP_VILLAGE_BACKGROUND_HEIGHT
				);
				const expected =
					masked && !protectedPixel && cutoffSafe && !excluded
						? Math.round((alphaAt(candidate.data, pixel) * edgeAlpha) / 255)
						: 0;
				const actual = alphaAt(foreground.data, pixel);
				if (actual !== expected) alphaViolations += 1;
				if (protectedPixel && actual !== 0) protectedViolations += 1;
				if (!masked && actual !== 0) outsideMaskViolations += 1;
				if (!cutoffSafe && actual !== 0) cutoffViolations += 1;
			}
		}
		expect(new Set(cutoffs.map((cutoff) => cutoff.id)).size).toBe(7);
		expect(
			cutoffs.every(
				(cutoff) =>
					cutoff.bottom === (cutoff.blockerBottom ?? 0) - SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX
			)
		).toBe(true);
		expect(alphaViolations).toBe(0);
		expect(protectedViolations).toBe(0);
		expect(outsideMaskViolations).toBe(0);
		expect(cutoffViolations).toBe(0);
		expect(provenance.statistics.foregroundAlphaModulationViolations).toBe(0);
	});

	test('keeps feather bands, vertical runs, and root-rock runs out of disallowed planes', () => {
		const blockers = new Map((controls.map.blockers ?? []).map((blocker) => [blocker.id, blocker]));
		let featherBaseViolations = 0;
		let featherForegroundViolations = 0;
		for (const id of ['village-block-0-37', 'village-block-0-49', 'village-block-46-2']) {
			const blocker = blockers.get(id);
			if (!blocker) throw new Error(`Missing feather blocker ${id}`);
			const bounds = pixelBounds({
				...blocker,
				x: blocker.x - controls.crop.x,
				y: blocker.y - controls.crop.y
			});
			for (let y = bounds.top; y < bounds.bottom; y += 1) {
				for (let x = bounds.left; x < bounds.right; x += 1) {
					const offset = (y * SUNDROP_VILLAGE_BACKGROUND_WIDTH + x) * 4;
					if (!rgbaEqual(base.data, source.data, offset)) featherBaseViolations += 1;
					if ((foreground.data[offset + 3] ?? 0) !== 0) featherForegroundViolations += 1;
				}
			}
		}
		const baseOnlyHedgeWalls = SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.filter(
			(entry) =>
				entry.motif !== 'root-rock' &&
				!entry.ownerBackgroundIds.includes(SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID)
		);
		const rootRock = SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.filter(
			(entry) => entry.motif === 'root-rock'
		);
		let baseOnlyForegroundPixels = 0;
		for (const entry of [...baseOnlyHedgeWalls, ...rootRock]) {
			for (const rect of controls.baseRects.filter((rect) => rect.id === entry.blockerId)) {
				const bounds = pixelBounds(rect);
				for (let y = bounds.top; y < bounds.bottom; y += 1) {
					for (let x = bounds.left; x < bounds.right; x += 1) {
						if (alphaAt(foreground.data, y * SUNDROP_VILLAGE_BACKGROUND_WIDTH + x) !== 0) {
							baseOnlyForegroundPixels += 1;
						}
					}
				}
			}
		}
		expect(baseOnlyHedgeWalls).toHaveLength(9);
		expect(rootRock).toHaveLength(5);
		expect(featherBaseViolations).toBe(0);
		expect(featherForegroundViolations).toBe(0);
		expect(baseOnlyForegroundPixels).toBe(0);
	});

	test('locks the 21/14/7 inventory, control hashes, and all hard budgets', () => {
		const baseOnly = SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.filter(
			(entry) => !entry.ownerBackgroundIds.includes(SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID)
		);
		const foregroundOwned = SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.filter((entry) =>
			entry.ownerBackgroundIds.includes(SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID)
		);
		expect(SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP).toHaveLength(21);
		expect(baseOnly).toHaveLength(14);
		expect(foregroundOwned).toHaveLength(7);
		expect(basePng.byteLength).toBeLessThanOrEqual(
			SUNDROP_VILLAGE_BASE_BACKGROUND_HARD_LIMIT_BYTES
		);
		expect(foregroundPng.byteLength).toBeLessThanOrEqual(
			SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_HARD_LIMIT_BYTES
		);
		expect(basePng.byteLength + foregroundPng.byteLength).toBeLessThanOrEqual(
			SUNDROP_VILLAGE_BACKGROUND_COMBINED_HARD_LIMIT_BYTES
		);
		expect(basePng.byteLength).toBeGreaterThan(SUNDROP_VILLAGE_BASE_BACKGROUND_REVIEW_TARGET_BYTES);
		expect(sundropVillageBackgroundsApproval.base.sizeBudgetException).toBe(
			'Tier 0 preserves the approved HPA-307 ground and aligned obstacle detail while remaining below the 8 MiB hard limit.'
		);
		expect(foregroundPng.byteLength).toBeLessThanOrEqual(
			SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_REVIEW_TARGET_BYTES
		);
		expect(sundropVillageBackgroundsApproval.foreground.sizeBudgetException).toBeNull();
		for (const [filename, recorded] of Object.entries(provenance.controlArtifacts) as [
			string,
			{ sha256: string }
		][]) {
			expect(sha256(readFileSync(join(reports, filename)))).toBe(recorded.sha256);
		}
	});
});

import { createHash, randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

import sharp from 'sharp';

import { SUNDROP_VILLAGE_ART_CONTROL_FINGERPRINT } from '$lib/game/content/generated/sundrop-village-art-control';
import { buildVillageArtControlInputs } from '$lib/game/content/maps/layered/village-art-control-inputs';
import { computeVillageArtControlFingerprint } from '$lib/game/content/maps/layered/village-art-controls';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';

import {
	SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
	SUNDROP_VILLAGE_BACKGROUND_WIDTH
} from './sundrop-village-background';
import { SUNDROP_VILLAGE_PNG_OPTIONS } from './sundrop-village-png';

export type SundropVillageRetouchDistrict = 'H' | 'P' | 'M' | 'N' | 'G' | 'S' | 'E' | 'C';

export interface SundropVillageRgbGrade {
	readonly red: number;
	readonly green: number;
	readonly blue: number;
}

export interface SundropVillageLowResolutionMasks {
	readonly width: number;
	readonly height: number;
	readonly districts: Record<SundropVillageRetouchDistrict, Uint8Array>;
	readonly path: Uint8Array;
}

export interface SundropVillageRetouchWeightMaps {
	readonly width: number;
	readonly height: number;
	readonly districtSigmaPx: number;
	readonly pathSigmaPx: number;
	readonly districts: Record<SundropVillageRetouchDistrict, Float32Array>;
	readonly pathStrength: Float64Array;
}

export interface SundropVillageRetouchProvenance {
	readonly algorithmVersion: string;
	readonly input: {
		readonly pathContract: string;
		readonly sha256: string;
		readonly bytes: number;
		readonly dimensions: { readonly width: number; readonly height: number };
	};
	readonly output: {
		readonly sha256: string;
		readonly bytes: number;
		readonly dimensions: { readonly width: number; readonly height: number };
		readonly colorType: 'RGBA';
		readonly alpha: 'opaque';
	};
	readonly controlFingerprint: string;
	readonly spatialTransform: 'same-coordinate-additive-rgb';
	readonly masks: {
		readonly source: 'sundropVillageLayered.layers.regions+paths';
		readonly grid: { readonly width: number; readonly height: number; readonly tileSize: number };
		readonly expansion: 'nearest-neighbor';
		readonly districtSigmaPx: number;
		readonly pathSigmaPx: number;
	};
	readonly edgeGuard: {
		readonly distancePx: number;
		readonly profile: 'linear';
		readonly boundaryStrength: 0;
		readonly fullStrength: 1;
		readonly fullStrengthAtDistancePx: number;
		readonly byteIdenticalRegion: 'canvas-boundary-only';
	};
	readonly maximumPathStrength: number;
	readonly maximumAbsoluteChannelDelta: number;
	readonly districtGrades: Record<SundropVillageRetouchDistrict, SundropVillageRgbGrade>;
	readonly statistics: {
		readonly totalPixels: number;
		readonly changedPixels: number;
		readonly unchangedPixels: number;
		readonly maximumAbsoluteChannelDelta: number;
		readonly meanAbsoluteChannelDelta: number;
		readonly boundaryChangedPixels: number;
		readonly authoredPathPixels: number;
		readonly meanAbsoluteChannelDeltaOnAuthoredPaths: number;
		readonly meanAbsoluteChannelDeltaOutsideAuthoredPaths: number;
		readonly identicalRgbDeltaRunThresholdPx: number;
		readonly maximumIdenticalRgbDeltaRunLengthInGradedTransitions: number;
		readonly longIdenticalRgbDeltaRunsInGradedTransitions: number;
	};
}

export interface SundropVillageRetouchResult {
	readonly png: Buffer;
	readonly provenanceJson: Buffer;
	readonly provenance: SundropVillageRetouchProvenance;
}

export interface WriteSundropVillageRetouchOptions {
	readonly input: string;
	readonly output: string;
	readonly provenanceOutput: string;
}

export interface SundropVillageRetouchMaskSource {
	readonly width: number;
	readonly height: number;
	readonly tileSize: number;
	readonly layers: {
		readonly regions: readonly string[];
		readonly paths: readonly string[];
	};
}

const DISTRICTS: readonly SundropVillageRetouchDistrict[] = [
	'H',
	'P',
	'M',
	'N',
	'G',
	'S',
	'E',
	'C'
];
const DISTRICT_SET = new Set<string>(DISTRICTS);
const EXPECTED_INPUT_SHA256 = '20a3625640131917f18d1309b0c192f2cbdac5e4279fe9e6abb23c24c64859fd';
const EXPECTED_CONTROL_FINGERPRINT =
	'0c47a7dc58d48e87fa9dd9c290cf6835b8acc3f4eb60a4e2c1ba4eae37e4ed33';
const CONTROLLER_APPROVED_OPAQUE_OUTPUT_SHA256 =
	'ba4f3ce170b8f40aabf1c81f83ce496436c1f6ea7e151401b221c5ae6e29cbf5';
const ALGORITHM_VERSION = 'sundrop-village-retouch-v3';
const DISTRICT_SIGMA_PX = 48;
const PATH_SIGMA_PX = 24;
const EDGE_GUARD_PX = 96;
const MAXIMUM_PATH_STRENGTH = 0.4;
const MAXIMUM_CHANNEL_DELTA = 16;
const LONG_IDENTICAL_DELTA_RUN_PX = 32;

export const SUNDROP_VILLAGE_RETOUCH_INPUT_PATH =
	'docs/superpowers/reports/img/hpa-307/village-background-retouch-base.png';

export const SUNDROP_VILLAGE_RETOUCH_DISTRICT_GRADES: Record<
	SundropVillageRetouchDistrict,
	SundropVillageRgbGrade
> = {
	H: { red: 15, green: 4, blue: -9 },
	P: { red: -12, green: 6, blue: 15 },
	M: { red: 11, green: -5, blue: -11 },
	N: { red: -10, green: 0, blue: 11 },
	G: { red: -6, green: 4, blue: 14 },
	S: { red: -7, green: 7, blue: 10 },
	E: { red: 15, green: -2, blue: -10 },
	C: { red: 0, green: 0, blue: 0 }
};

function sha256(contents: Uint8Array): string {
	return createHash('sha256').update(contents).digest('hex');
}

function assertLayerDimensions(
	source: SundropVillageRetouchMaskSource,
	name: 'regions' | 'paths',
	rows: readonly string[]
): void {
	if (rows.length !== source.height) {
		throw new Error(
			`Sundrop Village retouch ${name} layer must contain ${source.height} rows; received ${rows.length}`
		);
	}
	for (let row = 0; row < rows.length; row += 1) {
		const width = rows[row]?.length ?? 0;
		if (width !== source.width) {
			throw new Error(
				`Sundrop Village retouch ${name} row ${row} must contain ${source.width} cells; received ${width}`
			);
		}
	}
}

function emptyDistrictMasks(length: number): Record<SundropVillageRetouchDistrict, Uint8Array> {
	return Object.fromEntries(
		DISTRICTS.map((district) => [district, new Uint8Array(length)])
	) as Record<SundropVillageRetouchDistrict, Uint8Array>;
}

export function buildSundropVillageLowResolutionMasks(
	source: SundropVillageRetouchMaskSource = sundropVillageLayered
): SundropVillageLowResolutionMasks {
	assertLayerDimensions(source, 'regions', source.layers.regions);
	assertLayerDimensions(source, 'paths', source.layers.paths);

	const length = source.width * source.height;
	const districts = emptyDistrictMasks(length);
	const path = new Uint8Array(length);

	for (let row = 0; row < source.height; row += 1) {
		for (let column = 0; column < source.width; column += 1) {
			const index = row * source.width + column;
			const regionGlyph = source.layers.regions[row]?.[column] ?? '.';
			if (regionGlyph !== '.') {
				if (!DISTRICT_SET.has(regionGlyph)) {
					throw new Error(
						`Sundrop Village retouch regions layer contains unknown glyph "${regionGlyph}" at ${column},${row}`
					);
				}
				districts[regionGlyph as SundropVillageRetouchDistrict][index] = 255;
			}
			path[index] = source.layers.paths[row]?.[column] === '.' ? 0 : 255;
		}
	}

	return { width: source.width, height: source.height, districts, path };
}

async function expandMask(
	mask: Uint8Array,
	width: number,
	height: number,
	sigmaPx?: number
): Promise<Buffer> {
	let image = sharp(mask, {
		raw: {
			width,
			height,
			channels: 1
		}
	}).resize({
		width: SUNDROP_VILLAGE_BACKGROUND_WIDTH,
		height: SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
		fit: 'fill',
		kernel: sharp.kernel.nearest
	});
	if (sigmaPx !== undefined) image = image.blur(sigmaPx);
	const { data, info } = await image.extractChannel(0).raw().toBuffer({ resolveWithObject: true });
	const pixelCount = SUNDROP_VILLAGE_BACKGROUND_WIDTH * SUNDROP_VILLAGE_BACKGROUND_HEIGHT;
	if (
		info.channels !== 1 ||
		info.width !== SUNDROP_VILLAGE_BACKGROUND_WIDTH ||
		info.height !== SUNDROP_VILLAGE_BACKGROUND_HEIGHT ||
		data.byteLength !== pixelCount
	) {
		throw new Error(
			`Sundrop Village expanded mask must be a ${SUNDROP_VILLAGE_BACKGROUND_WIDTH}x${SUNDROP_VILLAGE_BACKGROUND_HEIGHT} single-channel ${pixelCount}-byte scalar field; received ${info.width}x${info.height}, ${info.channels} channels, ${data.byteLength} bytes`
		);
	}
	return data;
}

function normalizedWeights(mask: Uint8Array): Float32Array {
	const weights = new Float32Array(mask.length);
	for (let index = 0; index < mask.length; index += 1) {
		weights[index] = (mask[index] ?? 0) / 255;
	}
	return weights;
}

export async function buildSundropVillageRetouchWeightMaps(
	source: SundropVillageRetouchMaskSource = sundropVillageLayered
): Promise<SundropVillageRetouchWeightMaps> {
	if (
		source.width * source.tileSize !== SUNDROP_VILLAGE_BACKGROUND_WIDTH ||
		source.height * source.tileSize !== SUNDROP_VILLAGE_BACKGROUND_HEIGHT
	) {
		throw new Error(
			`Sundrop Village retouch source grid must expand exactly to ${SUNDROP_VILLAGE_BACKGROUND_WIDTH}x${SUNDROP_VILLAGE_BACKGROUND_HEIGHT}`
		);
	}

	const lowResolution = buildSundropVillageLowResolutionMasks(source);
	const expandedDistricts = await Promise.all(
		DISTRICTS.map(async (district) => {
			const expanded = await expandMask(
				lowResolution.districts[district],
				lowResolution.width,
				lowResolution.height,
				DISTRICT_SIGMA_PX
			);
			return [district, normalizedWeights(expanded)] as const;
		})
	);
	const featheredPath = await expandMask(
		lowResolution.path,
		lowResolution.width,
		lowResolution.height,
		PATH_SIGMA_PX
	);
	const pathStrength = new Float64Array(
		SUNDROP_VILLAGE_BACKGROUND_WIDTH * SUNDROP_VILLAGE_BACKGROUND_HEIGHT
	);
	for (let y = 0; y < SUNDROP_VILLAGE_BACKGROUND_HEIGHT; y += 1) {
		const sourceRow = Math.floor(y / source.tileSize);
		for (let x = 0; x < SUNDROP_VILLAGE_BACKGROUND_WIDTH; x += 1) {
			const index = y * SUNDROP_VILLAGE_BACKGROUND_WIDTH + x;
			const sourceColumn = Math.floor(x / source.tileSize);
			const sourceIndex = sourceRow * source.width + sourceColumn;
			const exactPathInfluence = lowResolution.path[sourceIndex] === 255 ? 1 : 0;
			const pathInfluence = Math.max(exactPathInfluence, (featheredPath[index] ?? 0) / 255);
			pathStrength[index] = 1 - (1 - MAXIMUM_PATH_STRENGTH) * pathInfluence;
		}
	}

	return {
		width: SUNDROP_VILLAGE_BACKGROUND_WIDTH,
		height: SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
		districtSigmaPx: DISTRICT_SIGMA_PX,
		pathSigmaPx: PATH_SIGMA_PX,
		districts: Object.fromEntries(expandedDistricts) as Record<
			SundropVillageRetouchDistrict,
			Float32Array
		>,
		pathStrength
	};
}

export function sundropVillageEdgeGuardStrength(
	x: number,
	y: number,
	width = SUNDROP_VILLAGE_BACKGROUND_WIDTH,
	height = SUNDROP_VILLAGE_BACKGROUND_HEIGHT
): number {
	const distance = Math.min(x, y, width - 1 - x, height - 1 - y);
	return Math.max(0, Math.min(1, distance / EDGE_GUARD_PX));
}

function clampByte(value: number): number {
	return Math.max(0, Math.min(255, Math.round(value)));
}

export interface SundropVillageIdenticalDeltaRunStatistics {
	readonly thresholdPx: number;
	readonly maximumRunLength: number;
	readonly longRunCount: number;
}

export function measureSundropVillageIdenticalDeltaRuns(
	sourceRgba: Uint8Array,
	outputRgba: Uint8Array,
	gradedTransitionMask: Uint8Array,
	width: number,
	height: number
): SundropVillageIdenticalDeltaRunStatistics {
	const pixelCount = width * height;
	if (
		sourceRgba.byteLength !== pixelCount * 4 ||
		outputRgba.byteLength !== pixelCount * 4 ||
		gradedTransitionMask.byteLength !== pixelCount
	) {
		throw new Error('Sundrop Village delta-run inputs do not match the declared dimensions');
	}

	let maximumRunLength = 0;
	let longRunCount = 0;

	for (let y = 0; y < height; y += 1) {
		let runLength = 0;
		let runDeltaRed = 0;
		let runDeltaGreen = 0;
		let runDeltaBlue = 0;
		let firstSourceRed = 0;
		let firstSourceGreen = 0;
		let firstSourceBlue = 0;
		let sourceVaries = false;

		const finishRun = (): void => {
			if (sourceVaries) {
				maximumRunLength = Math.max(maximumRunLength, runLength);
				if (runLength >= LONG_IDENTICAL_DELTA_RUN_PX) longRunCount += 1;
			}
			runLength = 0;
			sourceVaries = false;
		};

		for (let x = 0; x < width; x += 1) {
			const pixel = y * width + x;
			const offset = pixel * 4;
			const deltaRed = (outputRgba[offset] ?? 0) - (sourceRgba[offset] ?? 0);
			const deltaGreen = (outputRgba[offset + 1] ?? 0) - (sourceRgba[offset + 1] ?? 0);
			const deltaBlue = (outputRgba[offset + 2] ?? 0) - (sourceRgba[offset + 2] ?? 0);
			const isChanged = deltaRed !== 0 || deltaGreen !== 0 || deltaBlue !== 0;
			if (gradedTransitionMask[pixel] !== 1 || !isChanged) {
				finishRun();
				continue;
			}

			if (
				runLength > 0 &&
				deltaRed === runDeltaRed &&
				deltaGreen === runDeltaGreen &&
				deltaBlue === runDeltaBlue
			) {
				runLength += 1;
				sourceVaries ||=
					(sourceRgba[offset] ?? 0) !== firstSourceRed ||
					(sourceRgba[offset + 1] ?? 0) !== firstSourceGreen ||
					(sourceRgba[offset + 2] ?? 0) !== firstSourceBlue;
				continue;
			}

			finishRun();
			runLength = 1;
			runDeltaRed = deltaRed;
			runDeltaGreen = deltaGreen;
			runDeltaBlue = deltaBlue;
			firstSourceRed = sourceRgba[offset] ?? 0;
			firstSourceGreen = sourceRgba[offset + 1] ?? 0;
			firstSourceBlue = sourceRgba[offset + 2] ?? 0;
		}
		finishRun();
	}

	return {
		thresholdPx: LONG_IDENTICAL_DELTA_RUN_PX,
		maximumRunLength,
		longRunCount
	};
}

function exactPathCell(source: SundropVillageRetouchMaskSource, x: number, y: number): boolean {
	const column = Math.floor(x / source.tileSize);
	const row = Math.floor(y / source.tileSize);
	return source.layers.paths[row]?.[column] !== '.';
}

interface RetouchedRgba {
	readonly rgba: Buffer;
	readonly statistics: SundropVillageRetouchProvenance['statistics'];
}

async function retouchRgba(
	sourceRgba: Uint8Array,
	source: SundropVillageRetouchMaskSource
): Promise<RetouchedRgba> {
	const pixelCount = SUNDROP_VILLAGE_BACKGROUND_WIDTH * SUNDROP_VILLAGE_BACKGROUND_HEIGHT;
	if (sourceRgba.byteLength !== pixelCount * 4) {
		throw new Error(
			`Sundrop Village retouch RGBA input must contain ${pixelCount * 4} bytes; received ${sourceRgba.byteLength}`
		);
	}

	const weights = await buildSundropVillageRetouchWeightMaps(source);
	const output = Buffer.allocUnsafe(sourceRgba.byteLength);
	let changedPixels = 0;
	let maximumAbsoluteChannelDelta = 0;
	let absoluteDeltaSum = 0;
	let boundaryChangedPixels = 0;
	let authoredPathPixels = 0;
	let pathAbsoluteDeltaSum = 0;
	let nonPathAbsoluteDeltaSum = 0;
	const gradedTransitionMask = new Uint8Array(pixelCount);

	for (let y = 0; y < SUNDROP_VILLAGE_BACKGROUND_HEIGHT; y += 1) {
		for (let x = 0; x < SUNDROP_VILLAGE_BACKGROUND_WIDTH; x += 1) {
			const pixel = y * SUNDROP_VILLAGE_BACKGROUND_WIDTH + x;
			const offset = pixel * 4;
			const edgeStrength = sundropVillageEdgeGuardStrength(x, y);
			const pathStrength = weights.pathStrength[pixel] ?? 1;
			const grade = { red: 0, green: 0, blue: 0 };
			let maximumDistrictWeight = 0;
			let totalDistrictWeight = 0;
			for (const district of DISTRICTS) {
				const districtWeight = weights.districts[district][pixel] ?? 0;
				const districtGrade = SUNDROP_VILLAGE_RETOUCH_DISTRICT_GRADES[district];
				maximumDistrictWeight = Math.max(maximumDistrictWeight, districtWeight);
				totalDistrictWeight += districtWeight;
				grade.red += districtWeight * districtGrade.red;
				grade.green += districtWeight * districtGrade.green;
				grade.blue += districtWeight * districtGrade.blue;
			}

			const deltas = [
				Math.round(grade.red * pathStrength * edgeStrength),
				Math.round(grade.green * pathStrength * edgeStrength),
				Math.round(grade.blue * pathStrength * edgeStrength)
			];
			if (
				totalDistrictWeight > 0.005 &&
				maximumDistrictWeight < 0.995 &&
				Math.max(Math.abs(grade.red), Math.abs(grade.green), Math.abs(grade.blue)) >= 0.5
			) {
				gradedTransitionMask[pixel] = 1;
			}
			let changed = false;
			let pixelAbsoluteDelta = 0;
			for (let channel = 0; channel < 3; channel += 1) {
				const sourceValue = sourceRgba[offset + channel] ?? 0;
				const outputValue = clampByte(sourceValue + (deltas[channel] ?? 0));
				const absoluteDelta = Math.abs(outputValue - sourceValue);
				output[offset + channel] = outputValue;
				changed ||= absoluteDelta > 0;
				pixelAbsoluteDelta += absoluteDelta;
				absoluteDeltaSum += absoluteDelta;
				maximumAbsoluteChannelDelta = Math.max(maximumAbsoluteChannelDelta, absoluteDelta);
			}
			output[offset + 3] = 255;
			if (changed) {
				changedPixels += 1;
				if (
					x === 0 ||
					y === 0 ||
					x === SUNDROP_VILLAGE_BACKGROUND_WIDTH - 1 ||
					y === SUNDROP_VILLAGE_BACKGROUND_HEIGHT - 1
				) {
					boundaryChangedPixels += 1;
				}
			}
			if (exactPathCell(source, x, y)) {
				authoredPathPixels += 1;
				pathAbsoluteDeltaSum += pixelAbsoluteDelta;
			} else {
				nonPathAbsoluteDeltaSum += pixelAbsoluteDelta;
			}
		}
	}

	if (maximumAbsoluteChannelDelta > MAXIMUM_CHANNEL_DELTA) {
		throw new Error(
			`Sundrop Village retouch exceeded the ${MAXIMUM_CHANNEL_DELTA}-level channel-delta limit with ${maximumAbsoluteChannelDelta}`
		);
	}
	if (boundaryChangedPixels !== 0) {
		throw new Error(
			`Sundrop Village retouch changed ${boundaryChangedPixels} canvas-boundary pixels`
		);
	}

	const nonPathPixels = pixelCount - authoredPathPixels;
	const identicalDeltaRuns = measureSundropVillageIdenticalDeltaRuns(
		sourceRgba,
		output,
		gradedTransitionMask,
		SUNDROP_VILLAGE_BACKGROUND_WIDTH,
		SUNDROP_VILLAGE_BACKGROUND_HEIGHT
	);
	return {
		rgba: output,
		statistics: {
			totalPixels: pixelCount,
			changedPixels,
			unchangedPixels: pixelCount - changedPixels,
			maximumAbsoluteChannelDelta,
			meanAbsoluteChannelDelta: absoluteDeltaSum / (pixelCount * 3),
			boundaryChangedPixels,
			authoredPathPixels,
			meanAbsoluteChannelDeltaOnAuthoredPaths:
				authoredPathPixels === 0 ? 0 : pathAbsoluteDeltaSum / (authoredPathPixels * 3),
			meanAbsoluteChannelDeltaOutsideAuthoredPaths:
				nonPathPixels === 0 ? 0 : nonPathAbsoluteDeltaSum / (nonPathPixels * 3),
			identicalRgbDeltaRunThresholdPx: identicalDeltaRuns.thresholdPx,
			maximumIdenticalRgbDeltaRunLengthInGradedTransitions: identicalDeltaRuns.maximumRunLength,
			longIdenticalRgbDeltaRunsInGradedTransitions: identicalDeltaRuns.longRunCount
		}
	};
}

export async function retouchSundropVillagePng(
	input: Buffer,
	source: typeof sundropVillageLayered = sundropVillageLayered
): Promise<SundropVillageRetouchResult> {
	const inputSha256 = sha256(input);
	if (inputSha256 !== EXPECTED_INPUT_SHA256) {
		throw new Error(
			`Sundrop Village retouch input SHA-256 must be ${EXPECTED_INPUT_SHA256}; received ${inputSha256}`
		);
	}
	const controlFingerprint = computeVillageArtControlFingerprint(
		source,
		buildVillageArtControlInputs(source)
	);
	if (controlFingerprint !== EXPECTED_CONTROL_FINGERPRINT) {
		throw new Error(
			`Sundrop Village retouch control fingerprint must remain ${EXPECTED_CONTROL_FINGERPRINT}; received ${controlFingerprint}`
		);
	}
	if (SUNDROP_VILLAGE_ART_CONTROL_FINGERPRINT !== controlFingerprint) {
		throw new Error(
			`Sundrop Village generated control fingerprint must match current geometry ${controlFingerprint}; received ${SUNDROP_VILLAGE_ART_CONTROL_FINGERPRINT}`
		);
	}

	const image = sharp(input);
	const metadata = await image.metadata();
	if (
		metadata.width !== SUNDROP_VILLAGE_BACKGROUND_WIDTH ||
		metadata.height !== SUNDROP_VILLAGE_BACKGROUND_HEIGHT
	) {
		throw new Error(
			`Sundrop Village retouch input must be exactly ${SUNDROP_VILLAGE_BACKGROUND_WIDTH}x${SUNDROP_VILLAGE_BACKGROUND_HEIGHT}; received ${metadata.width ?? 'unknown'}x${metadata.height ?? 'unknown'}`
		);
	}
	const { data, info } = await image
		.toColourspace('srgb')
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	if (info.channels !== 4) {
		throw new Error(`Sundrop Village retouch input must decode to RGBA; received ${info.channels}`);
	}

	const retouched = await retouchRgba(data, source);
	const png = await sharp(retouched.rgba, {
		raw: {
			width: SUNDROP_VILLAGE_BACKGROUND_WIDTH,
			height: SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
			channels: 4
		}
	})
		.png(SUNDROP_VILLAGE_PNG_OPTIONS)
		.toBuffer();
	const outputSha256 = sha256(png);
	if (outputSha256 !== CONTROLLER_APPROVED_OPAQUE_OUTPUT_SHA256) {
		throw new Error(
			`Sundrop Village controller-approved opaque output SHA-256 must remain ${CONTROLLER_APPROVED_OPAQUE_OUTPUT_SHA256}; received ${outputSha256}`
		);
	}
	const provenance: SundropVillageRetouchProvenance = {
		algorithmVersion: ALGORITHM_VERSION,
		input: {
			pathContract: SUNDROP_VILLAGE_RETOUCH_INPUT_PATH,
			sha256: inputSha256,
			bytes: input.byteLength,
			dimensions: {
				width: SUNDROP_VILLAGE_BACKGROUND_WIDTH,
				height: SUNDROP_VILLAGE_BACKGROUND_HEIGHT
			}
		},
		output: {
			sha256: outputSha256,
			bytes: png.byteLength,
			dimensions: {
				width: SUNDROP_VILLAGE_BACKGROUND_WIDTH,
				height: SUNDROP_VILLAGE_BACKGROUND_HEIGHT
			},
			colorType: 'RGBA',
			alpha: 'opaque'
		},
		controlFingerprint,
		spatialTransform: 'same-coordinate-additive-rgb',
		masks: {
			source: 'sundropVillageLayered.layers.regions+paths',
			grid: {
				width: source.width,
				height: source.height,
				tileSize: source.tileSize
			},
			expansion: 'nearest-neighbor',
			districtSigmaPx: DISTRICT_SIGMA_PX,
			pathSigmaPx: PATH_SIGMA_PX
		},
		edgeGuard: {
			distancePx: EDGE_GUARD_PX,
			profile: 'linear',
			boundaryStrength: 0,
			fullStrength: 1,
			fullStrengthAtDistancePx: EDGE_GUARD_PX,
			byteIdenticalRegion: 'canvas-boundary-only'
		},
		maximumPathStrength: MAXIMUM_PATH_STRENGTH,
		maximumAbsoluteChannelDelta: MAXIMUM_CHANNEL_DELTA,
		districtGrades: SUNDROP_VILLAGE_RETOUCH_DISTRICT_GRADES,
		statistics: retouched.statistics
	};
	const provenanceJson = Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`, 'utf8');

	return { png, provenance, provenanceJson };
}

interface StagedRetouchOutput {
	readonly output: string;
	readonly temporary: string;
}

async function stageRetouchOutput(
	outputPath: string,
	contents: Uint8Array
): Promise<StagedRetouchOutput> {
	const output = resolve(outputPath);
	const temporary = resolve(
		dirname(output),
		`.${basename(output)}.${process.pid}.${randomUUID()}.tmp`
	);
	try {
		await writeFile(temporary, contents, { flag: 'wx' });
		return { output, temporary };
	} catch (error) {
		await unlink(temporary).catch(() => undefined);
		throw error;
	}
}

export async function writeSundropVillageRetouch(
	options: WriteSundropVillageRetouchOptions
): Promise<SundropVillageRetouchResult> {
	const output = resolve(options.output);
	const provenanceOutput = resolve(options.provenanceOutput);
	if (output === provenanceOutput) {
		throw new Error('Sundrop Village retouch PNG and provenance outputs must use distinct paths');
	}

	const input = await readFile(options.input);
	const result = await retouchSundropVillagePng(input);
	const staged: StagedRetouchOutput[] = [];
	try {
		staged.push(await stageRetouchOutput(output, result.png));
		staged.push(await stageRetouchOutput(provenanceOutput, result.provenanceJson));
		for (const item of staged) await rename(item.temporary, item.output);
		return result;
	} catch (error) {
		await Promise.all(staged.map(({ temporary }) => unlink(temporary).catch(() => undefined)));
		throw error;
	}
}

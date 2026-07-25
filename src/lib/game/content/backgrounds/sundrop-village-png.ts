import { createHash, randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

import sharp from 'sharp';

import {
	SUNDROP_VILLAGE_BACKGROUND_HARD_LIMIT_BYTES,
	SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
	SUNDROP_VILLAGE_BACKGROUND_WIDTH,
	sundropVillageBackgroundAlpha
} from './sundrop-village-background';

export type SundropVillagePngTier = 0 | 1 | 2 | 3;

export const SUNDROP_VILLAGE_PNG_OPTIONS = {
	palette: false,
	compressionLevel: 9,
	adaptiveFiltering: false,
	force: true
} as const;

export interface FinalizedSundropVillagePng {
	readonly png: Buffer;
	readonly bytes: number;
	readonly sha256: string;
	readonly tier: SundropVillagePngTier;
}

export interface WriteFinalizedSundropVillagePngOptions {
	readonly input: string;
	readonly output: string;
	readonly tier: SundropVillagePngTier;
	readonly maxBytes?: number;
}

export interface RasterizeSundropVillageArtControlOptions {
	readonly input: string;
	readonly output: string;
}

export interface SundropVillageCrop {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export interface NormalizeSundropVillageBackgroundOptions {
	readonly input: string;
	readonly output: string;
	readonly transformOutput: string;
	readonly crop: SundropVillageCrop;
}

export interface SundropVillageBackgroundTransform {
	readonly native: {
		readonly width: number;
		readonly height: number;
	};
	readonly crop: SundropVillageCrop;
	readonly output: {
		readonly width: number;
		readonly height: number;
	};
	readonly scale: number;
}

export interface ValidatedSundropVillagePng {
	readonly bytes: number;
	readonly sha256: string;
	readonly width: number;
	readonly height: number;
}

interface DecodedOpaqueSource {
	readonly data: Buffer;
	readonly width: number;
	readonly height: number;
}

interface PngChunk {
	readonly type: string;
	readonly offset: number;
	readonly dataLength: number;
	readonly endOffset: number;
}

interface WriteFinalizedSundropVillagePngTestSeam {
	readonly afterTemporaryWrite?: (temporaryPath: string) => void | Promise<void>;
}

const METADATA_CHUNKS = new Set(['eXIf', 'iCCP', 'iTXt', 'pHYs', 'tEXt', 'tIME', 'zTXt']);
const PNG_CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
	let crc = value;
	for (let bit = 0; bit < 8; bit += 1) {
		crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
	}
	return crc >>> 0;
});

function assertTier(tier: number): asserts tier is SundropVillagePngTier {
	if (!Number.isInteger(tier) || tier < 0 || tier > 3) {
		throw new Error(`Sundrop Village PNG tier must be one of 0, 1, 2, or 3; received ${tier}`);
	}
}

function assertDimensions(width: number | undefined, height: number | undefined): void {
	if (width !== SUNDROP_VILLAGE_BACKGROUND_WIDTH || height !== SUNDROP_VILLAGE_BACKGROUND_HEIGHT) {
		throw new Error(
			`Sundrop Village background input must be exactly ${SUNDROP_VILLAGE_BACKGROUND_WIDTH}x${SUNDROP_VILLAGE_BACKGROUND_HEIGHT}; received ${width ?? 'unknown'}x${height ?? 'unknown'}`
		);
	}
}

async function decodeOpaqueSource(input: Buffer): Promise<DecodedOpaqueSource> {
	const image = sharp(input);
	const metadata = await image.metadata();
	assertDimensions(metadata.width, metadata.height);

	const { data, info } = await image
		.toColourspace('srgb')
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	if (info.channels !== 4) {
		throw new Error(
			`Sundrop Village background input must decode to RGBA; received ${info.channels}`
		);
	}

	for (let index = 3; index < data.length; index += 4) {
		if (data[index] !== 255) {
			const pixel = (index - 3) / 4;
			const x = pixel % info.width;
			const y = Math.floor(pixel / info.width);
			throw new Error(
				`Sundrop Village background input must be fully opaque; pixel ${x},${y} has alpha ${data[index]}`
			);
		}
	}

	return { data, width: info.width, height: info.height };
}

function pngCrc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc = (PNG_CRC32_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function parsePngChunks(png: Buffer): PngChunk[] {
	const expectedSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	if (png.length < expectedSignature.length || !png.subarray(0, 8).equals(expectedSignature)) {
		throw new Error('Sundrop Village final output is not a valid PNG');
	}

	const chunks: PngChunk[] = [];
	let offset = 8;
	while (offset < png.length) {
		if (png.length - offset < 12) {
			throw new Error('Sundrop Village final PNG contains a truncated chunk');
		}
		const dataLength = png.readUInt32BE(offset);
		const crcOffset = offset + 8 + dataLength;
		const nextOffset = crcOffset + 4;
		if (nextOffset > png.length) {
			throw new Error('Sundrop Village final PNG contains a truncated chunk');
		}
		const type = png.toString('ascii', offset + 4, offset + 8);
		const storedCrc = png.readUInt32BE(crcOffset);
		const computedCrc = pngCrc32(png.subarray(offset + 4, crcOffset));
		if (storedCrc !== computedCrc) {
			throw new Error(
				`Sundrop Village final PNG ${type} CRC mismatch: expected ${storedCrc.toString(16).padStart(8, '0')}, computed ${computedCrc.toString(16).padStart(8, '0')}`
			);
		}

		if (chunks.length === 0) {
			if (type !== 'IHDR') {
				throw new Error('Sundrop Village final PNG must begin with IHDR');
			}
			if (dataLength !== 13) {
				throw new Error('Sundrop Village final PNG IHDR must contain exactly 13 bytes');
			}
		} else if (type === 'IHDR') {
			throw new Error('Sundrop Village final PNG must contain a single IHDR');
		}

		chunks.push({ type, offset, dataLength, endOffset: nextOffset });
		if (type === 'IEND') {
			if (dataLength !== 0) {
				throw new Error('Sundrop Village final PNG IEND must contain zero bytes');
			}
			if (nextOffset !== png.length) {
				throw new Error('Sundrop Village final PNG contains bytes after IEND');
			}
			return chunks;
		}
		offset = nextOffset;
	}

	throw new Error('Sundrop Village final PNG must end with a single IEND');
}

function stripPngMetadata(png: Buffer): Buffer {
	const chunks = parsePngChunks(png);
	const retainedChunks: Buffer[] = [png.subarray(0, 8)];
	for (const chunk of chunks) {
		if (!METADATA_CHUNKS.has(chunk.type)) {
			retainedChunks.push(png.subarray(chunk.offset, chunk.endOffset));
		}
	}
	const stripped = Buffer.concat(retainedChunks);
	parsePngChunks(stripped);
	return stripped;
}

async function writeAtomicFile(outputPath: string, contents: Buffer | string): Promise<void> {
	const output = resolve(outputPath);
	const temporary = resolve(
		dirname(output),
		`.${basename(output)}.${process.pid}.${randomUUID()}.tmp`
	);
	try {
		await writeFile(temporary, contents, { flag: 'wx' });
		await rename(temporary, output);
	} catch (error) {
		await unlink(temporary).catch(() => undefined);
		throw error;
	}
}

export function quantizeSundropVillageRgba(
	source: Uint8Array,
	tier: SundropVillagePngTier,
	width = SUNDROP_VILLAGE_BACKGROUND_WIDTH,
	height = SUNDROP_VILLAGE_BACKGROUND_HEIGHT
): Buffer {
	assertTier(tier);
	if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
		throw new Error(`Raw RGBA dimensions must be positive integers; received ${width}x${height}`);
	}
	const expectedBytes = width * height * 4;
	if (source.byteLength !== expectedBytes) {
		throw new Error(
			`Raw RGBA input must contain ${expectedBytes} bytes; received ${source.byteLength}`
		);
	}

	const output = Buffer.from(source);
	const rgbMask = (0xff << tier) & 0xff;
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const offset = (y * width + x) * 4;
			output[offset] = (output[offset] ?? 0) & rgbMask;
			output[offset + 1] = (output[offset + 1] ?? 0) & rgbMask;
			output[offset + 2] = (output[offset + 2] ?? 0) & rgbMask;
			output[offset + 3] = sundropVillageBackgroundAlpha(x, y, width, height);
		}
	}
	return output;
}

export async function finalizeSundropVillagePng(
	input: Buffer,
	tier: SundropVillagePngTier
): Promise<FinalizedSundropVillagePng> {
	assertTier(tier);
	const source = await decodeOpaqueSource(input);
	const rgba = quantizeSundropVillageRgba(source.data, tier, source.width, source.height);
	const encoded = await sharp(rgba, {
		raw: {
			width: source.width,
			height: source.height,
			channels: 4
		}
	})
		.png(SUNDROP_VILLAGE_PNG_OPTIONS)
		.toBuffer();
	const png = stripPngMetadata(encoded);
	const validated = await validateSundropVillagePng(png);

	return {
		png,
		bytes: validated.bytes,
		sha256: validated.sha256,
		tier
	};
}

export async function validateSundropVillagePng(png: Buffer): Promise<ValidatedSundropVillagePng> {
	const chunks = parsePngChunks(png);
	if (png[24] !== 8 || png[25] !== 6) {
		throw new Error(
			`Sundrop Village final PNG must be 8-bit truecolor RGBA (color type 6); received bit depth ${png[24]} and color type ${png[25]}`
		);
	}
	const metadataChunk = chunks.find((chunk) => METADATA_CHUNKS.has(chunk.type))?.type;
	if (metadataChunk) {
		throw new Error(`Sundrop Village final PNG must not contain metadata chunk ${metadataChunk}`);
	}

	const image = sharp(png);
	const metadata = await image.metadata();
	assertDimensions(metadata.width, metadata.height);
	if (
		metadata.format !== 'png' ||
		metadata.channels !== 4 ||
		metadata.depth !== 'uchar' ||
		metadata.hasAlpha !== true
	) {
		throw new Error('Sundrop Village final PNG must decode as 8-bit truecolor RGBA');
	}

	const { data, info } = await image
		.toColourspace('srgb')
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	if (info.channels !== 4) {
		throw new Error(
			`Sundrop Village final PNG must decode to four channels; received ${info.channels}`
		);
	}
	for (let y = 0; y < info.height; y += 1) {
		for (let x = 0; x < info.width; x += 1) {
			const actual = data[(y * info.width + x) * 4 + 3];
			const expected = sundropVillageBackgroundAlpha(x, y, info.width, info.height);
			if (actual !== expected) {
				throw new Error(
					`Sundrop Village final PNG alpha mismatch at ${x},${y}: expected ${expected}, received ${actual}`
				);
			}
		}
	}

	return {
		bytes: png.byteLength,
		sha256: createHash('sha256').update(png).digest('hex'),
		width: info.width,
		height: info.height
	};
}

export async function rasterizeSundropVillageArtControl(
	options: RasterizeSundropVillageArtControlOptions
): Promise<void> {
	if (basename(options.input) !== 'village-art-control.svg') {
		throw new Error('Sundrop Village art-control input must be named village-art-control.svg');
	}
	const image = sharp(options.input);
	const metadata = await image.metadata();
	if (metadata.format !== 'svg') {
		throw new Error(`Sundrop Village art-control input must be SVG; received ${metadata.format}`);
	}
	assertDimensions(metadata.width, metadata.height);

	const encoded = await image
		.toColourspace('srgb')
		.ensureAlpha()
		.png(SUNDROP_VILLAGE_PNG_OPTIONS)
		.toBuffer();
	const png = stripPngMetadata(encoded);
	const outputMetadata = await sharp(png).metadata();
	assertDimensions(outputMetadata.width, outputMetadata.height);
	if (
		outputMetadata.format !== 'png' ||
		outputMetadata.channels !== 4 ||
		outputMetadata.depth !== 'uchar' ||
		png[25] !== 6
	) {
		throw new Error('Sundrop Village art-control raster must be 8-bit truecolor RGBA');
	}
	await writeAtomicFile(options.output, png);
}

export async function normalizeSundropVillageBackground(
	options: NormalizeSundropVillageBackgroundOptions
): Promise<SundropVillageBackgroundTransform> {
	const { crop } = options;
	if (
		![crop.x, crop.y, crop.width, crop.height].every(Number.isInteger) ||
		crop.x < 0 ||
		crop.y < 0 ||
		crop.width <= 0 ||
		crop.height <= 0
	) {
		throw new Error('Sundrop Village normalization crop must use non-negative integer coordinates');
	}
	if (crop.width * 6 !== crop.height * 7) {
		throw new Error(
			`Sundrop Village normalization crop must be exactly 7:6; received ${crop.width}:${crop.height}`
		);
	}

	const metadata = await sharp(options.input).metadata();
	if (!metadata.width || !metadata.height) {
		throw new Error('Sundrop Village candidate dimensions could not be decoded');
	}
	if (crop.x + crop.width > metadata.width || crop.y + crop.height > metadata.height) {
		throw new Error(
			`Sundrop Village normalization crop falls outside the ${metadata.width}x${metadata.height} source`
		);
	}

	const { data, info } = await sharp(options.input)
		.extract({
			left: crop.x,
			top: crop.y,
			width: crop.width,
			height: crop.height
		})
		.resize({
			width: SUNDROP_VILLAGE_BACKGROUND_WIDTH,
			height: SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
			fit: 'fill',
			kernel: sharp.kernel.lanczos3
		})
		.toColourspace('srgb')
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	assertDimensions(info.width, info.height);
	if (info.channels !== 4) {
		throw new Error(
			`Sundrop Village normalized master must decode to RGBA; received ${info.channels}`
		);
	}
	for (let index = 3; index < data.length; index += 4) {
		if (data[index] !== 255) {
			const pixel = (index - 3) / 4;
			throw new Error(
				`Sundrop Village normalized master must be fully opaque; pixel ${pixel % info.width},${Math.floor(pixel / info.width)} has alpha ${data[index]}`
			);
		}
	}

	const encoded = await sharp(data, {
		raw: {
			width: info.width,
			height: info.height,
			channels: 4
		}
	})
		.png(SUNDROP_VILLAGE_PNG_OPTIONS)
		.toBuffer();
	const png = stripPngMetadata(encoded);
	const transform: SundropVillageBackgroundTransform = {
		native: { width: metadata.width, height: metadata.height },
		crop: { ...crop },
		output: {
			width: SUNDROP_VILLAGE_BACKGROUND_WIDTH,
			height: SUNDROP_VILLAGE_BACKGROUND_HEIGHT
		},
		scale: SUNDROP_VILLAGE_BACKGROUND_WIDTH / crop.width
	};

	await writeAtomicFile(options.output, png);
	await writeAtomicFile(options.transformOutput, `${JSON.stringify(transform, null, 2)}\n`);
	return transform;
}

export async function writeFinalizedSundropVillagePng(
	options: WriteFinalizedSundropVillagePngOptions,
	testSeam: WriteFinalizedSundropVillagePngTestSeam = {}
): Promise<FinalizedSundropVillagePng> {
	const maxBytes = options.maxBytes ?? SUNDROP_VILLAGE_BACKGROUND_HARD_LIMIT_BYTES;
	if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
		throw new Error(
			`Sundrop Village PNG hard limit must be a positive integer; received ${maxBytes}`
		);
	}

	const input = await readFile(options.input);
	const finalized = await finalizeSundropVillagePng(input, options.tier);
	const output = resolve(options.output);
	const temporary = resolve(
		dirname(output),
		`.${basename(output)}.${process.pid}.${randomUUID()}.tmp`
	);

	try {
		await writeFile(temporary, finalized.png, { flag: 'wx' });
		await testSeam.afterTemporaryWrite?.(temporary);
		const exactOutput = await readFile(temporary);
		const validated = await validateSundropVillagePng(exactOutput);
		if (validated.bytes > maxBytes) {
			throw new Error(
				`Sundrop Village final PNG is ${validated.bytes} bytes and exceeds the ${maxBytes}-byte hard limit`
			);
		}
		await rename(temporary, output);
		return {
			png: exactOutput,
			bytes: validated.bytes,
			sha256: validated.sha256,
			tier: options.tier
		};
	} catch (error) {
		await unlink(temporary).catch(() => undefined);
		throw error;
	}
}

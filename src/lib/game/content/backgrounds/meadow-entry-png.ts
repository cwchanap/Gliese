import { randomUUID } from 'node:crypto';
import { rename, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

import sharp from 'sharp';

export const MEADOW_ENTRY_PNG_OPTIONS = {
	palette: false,
	compressionLevel: 9,
	adaptiveFiltering: false,
	force: true
} as const;

export interface DecodedMeadowEntryRgba {
	data: Buffer;
	width: number;
	height: number;
}

export interface ValidatedMeadowEntryPng {
	width: number;
	height: number;
	bytes: number;
	sha256: string;
}

interface PngChunk {
	type: string;
	offset: number;
	endOffset: number;
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CANONICAL_PNG_CHUNKS = new Set(['IHDR', 'IDAT', 'IEND']);
const PNG_CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
	let crc = value;
	for (let bit = 0; bit < 8; bit += 1) {
		crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
	}
	return crc >>> 0;
});

function pngCrc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc = (PNG_CRC32_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function parsePngChunks(png: Buffer): PngChunk[] {
	if (png.length < PNG_SIGNATURE.length || !png.subarray(0, 8).equals(PNG_SIGNATURE)) {
		throw new Error('Meadow Entry PNG is not a valid PNG');
	}

	const chunks: PngChunk[] = [];
	let offset = PNG_SIGNATURE.length;
	while (offset < png.length) {
		if (png.length - offset < 12) {
			throw new Error('Meadow Entry PNG contains a truncated chunk');
		}
		const dataLength = png.readUInt32BE(offset);
		const crcOffset = offset + 8 + dataLength;
		const endOffset = crcOffset + 4;
		if (endOffset > png.length) {
			throw new Error('Meadow Entry PNG contains a truncated chunk');
		}

		const type = png.toString('ascii', offset + 4, offset + 8);
		const storedCrc = png.readUInt32BE(crcOffset);
		const computedCrc = pngCrc32(png.subarray(offset + 4, crcOffset));
		if (storedCrc !== computedCrc) {
			throw new Error(`Meadow Entry PNG ${type} CRC mismatch`);
		}
		if (chunks.length === 0 && (type !== 'IHDR' || dataLength !== 13)) {
			throw new Error('Meadow Entry PNG must begin with a 13-byte IHDR chunk');
		}
		if (chunks.length > 0 && type === 'IHDR') {
			throw new Error('Meadow Entry PNG must contain a single IHDR chunk');
		}

		chunks.push({ type, offset, endOffset });
		if (type === 'IEND') {
			if (dataLength !== 0 || endOffset !== png.length) {
				throw new Error('Meadow Entry PNG must end with a zero-byte IEND chunk');
			}
			return chunks;
		}
		offset = endOffset;
	}

	throw new Error('Meadow Entry PNG must end with IEND');
}

export function validateCanonicalPngChunks(png: Buffer): void {
	const chunks = parsePngChunks(png);
	const nonCanonical = chunks.find((chunk) => !CANONICAL_PNG_CHUNKS.has(chunk.type));
	if (nonCanonical) {
		throw new Error(`Meadow Entry PNG contains non-canonical PNG chunk ${nonCanonical.type}`);
	}
	if (chunks.length < 3 || chunks.slice(1, -1).some((chunk) => chunk.type !== 'IDAT')) {
		throw new Error('Meadow Entry PNG must contain IHDR, one or more IDAT chunks, and IEND');
	}
}

function retainCanonicalPngChunks(png: Buffer): Buffer {
	const chunks = parsePngChunks(png);
	const canonical = Buffer.concat([
		PNG_SIGNATURE,
		...chunks
			.filter((chunk) => CANONICAL_PNG_CHUNKS.has(chunk.type))
			.map((chunk) => png.subarray(chunk.offset, chunk.endOffset))
	]);
	validateCanonicalPngChunks(canonical);
	return canonical;
}

export async function decodeMeadowEntryRgba(png: Buffer): Promise<DecodedMeadowEntryRgba> {
	const { data, info } = await sharp(png)
		.toColourspace('srgb')
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	if (info.channels !== 4) {
		throw new Error(`Meadow Entry PNG must decode to RGBA; received ${info.channels} channels`);
	}
	return { data, width: info.width, height: info.height };
}

export async function encodeCanonicalMeadowEntryPng(
	raw: Buffer,
	width: number,
	height: number
): Promise<Buffer> {
	if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
		throw new Error(
			`Meadow Entry PNG dimensions must be positive integers; received ${width}x${height}`
		);
	}
	const expectedBytes = width * height * 4;
	if (raw.byteLength !== expectedBytes) {
		throw new Error(
			`Meadow Entry raw RGBA must contain ${expectedBytes} bytes; received ${raw.byteLength}`
		);
	}
	const encoded = await sharp(raw, { raw: { width, height, channels: 4 } })
		.png(MEADOW_ENTRY_PNG_OPTIONS)
		.toBuffer();
	return retainCanonicalPngChunks(encoded);
}

export async function writeAtomicMeadowEntryPng(path: string, png: Buffer): Promise<void> {
	const output = resolve(path);
	const temporary = resolve(
		dirname(output),
		`.${basename(output)}.${process.pid}.${randomUUID()}.tmp`
	);
	try {
		await writeFile(temporary, png, { flag: 'wx' });
		await rename(temporary, output);
	} catch (error) {
		await unlink(temporary).catch(() => undefined);
		throw error;
	}
}

import { chmodSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
	decodeMeadowEntryAlpha,
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	validateCanonicalPngChunks,
	writeAtomicMeadowEntryPng
} from './meadow-entry-png';

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

function buildChunk(type: string, data: Buffer): Buffer {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);
	const typeBuffer = Buffer.from(type, 'ascii');
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(pngCrc32(Buffer.concat([typeBuffer, data])), 0);
	return Buffer.concat([length, typeBuffer, data, crc]);
}

describe('meadow-entry PNG contract', () => {
	it('encodes identical raw pixels byte-identically', async () => {
		const raw = Buffer.from([1, 2, 3, 255, 4, 5, 6, 0]);
		const first = await encodeCanonicalMeadowEntryPng(raw, 2, 1);
		const second = await encodeCanonicalMeadowEntryPng(raw, 2, 1);
		expect(second).toEqual(first);
		expect(() => validateCanonicalPngChunks(first)).not.toThrow();
		expect(await decodeMeadowEntryRgba(first)).toMatchObject({ width: 2, height: 1 });
	});

	it('rejects PNG metadata chunks', async () => {
		const png = await sharp({
			create: { width: 1, height: 1, channels: 4, background: '#00000000' }
		})
			.png()
			.withMetadata({ density: 72 })
			.toBuffer();
		expect(() => validateCanonicalPngChunks(png)).toThrow(/non-canonical PNG chunk/i);
	});

	it('extracts the alpha channel with correct values and dimensions', async () => {
		const raw = Buffer.from([10, 20, 30, 128, 40, 50, 60, 255]);
		const png = await encodeCanonicalMeadowEntryPng(raw, 2, 1);
		const { alpha, width, height } = await decodeMeadowEntryAlpha(png);
		expect(width).toBe(2);
		expect(height).toBe(1);
		expect(alpha).toEqual(Buffer.from([128, 255]));
	});

	it('writes atomically and the on-disk content matches', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'meadow-png-'));
		try {
			const raw = Buffer.from([1, 2, 3, 255, 4, 5, 6, 0]);
			const png = await encodeCanonicalMeadowEntryPng(raw, 2, 1);
			const dest = join(dir, 'out.png');
			await writeAtomicMeadowEntryPng(dest, png);
			expect(readFileSync(dest)).toEqual(png);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it.skipIf(process.getuid?.() === 0)(
		'cleans up the temp file and rethrows when the destination is unwritable',
		async () => {
			const dir = mkdtempSync(join(tmpdir(), 'meadow-png-fail-'));
			chmodSync(dir, 0o500);
			try {
				const raw = Buffer.from([1, 2, 3, 255]);
				const png = await encodeCanonicalMeadowEntryPng(raw, 1, 1);
				const dest = join(dir, 'out.png');
				await expect(writeAtomicMeadowEntryPng(dest, png)).rejects.toThrow();
			} finally {
				chmodSync(dir, 0o700);
				rmSync(dir, { recursive: true, force: true });
			}
		}
	);

	it('rejects non-positive dimensions', async () => {
		const raw = Buffer.from([1, 2, 3, 255]);
		await expect(encodeCanonicalMeadowEntryPng(raw, 0, 1)).rejects.toThrow(
			/dimensions must be positive integers/i
		);
		await expect(encodeCanonicalMeadowEntryPng(raw, -1, 1)).rejects.toThrow(
			/dimensions must be positive integers/i
		);
		await expect(encodeCanonicalMeadowEntryPng(raw, 0.5, 1)).rejects.toThrow(
			/dimensions must be positive integers/i
		);
	});

	it('rejects a raw buffer whose length does not match the declared dimensions', async () => {
		const raw = Buffer.from([1, 2, 3, 255, 4, 5, 6, 0]);
		await expect(encodeCanonicalMeadowEntryPng(raw, 1, 1)).rejects.toThrow(
			/raw RGBA must contain \d+ bytes/i
		);
	});

	it('rejects a truncated PNG that has only the signature', () => {
		const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
		expect(() => validateCanonicalPngChunks(signature)).toThrow(/must end with IEND/i);
	});

	it('rejects a PNG whose stored CRC does not match the computed CRC', async () => {
		const png = await encodeCanonicalMeadowEntryPng(Buffer.from([1, 2, 3, 255, 4, 5, 6, 0]), 2, 1);
		const corrupted = Buffer.from(png);
		corrupted[corrupted.length - 4] ^= 0xff;
		expect(() => validateCanonicalPngChunks(corrupted)).toThrow(/CRC mismatch/i);
	});

	it('rejects a PNG truncated after the IDAT chunk with no IEND', async () => {
		const png = await encodeCanonicalMeadowEntryPng(Buffer.from([1, 2, 3, 255, 4, 5, 6, 0]), 2, 1);
		const truncated = png.subarray(0, png.length - 12);
		expect(() => validateCanonicalPngChunks(truncated)).toThrow(/must end with IEND/i);
	});

	it('strips non-canonical chunks during encoding so the result validates', async () => {
		const metadataPng = await sharp({
			create: { width: 1, height: 1, channels: 4, background: '#00000000' }
		})
			.png()
			.withMetadata({ density: 72 })
			.toBuffer();
		expect(() => validateCanonicalPngChunks(metadataPng)).toThrow();
		const { data, width, height } = await decodeMeadowEntryRgba(metadataPng);
		const canonical = await encodeCanonicalMeadowEntryPng(data, width, height);
		expect(() => validateCanonicalPngChunks(canonical)).not.toThrow();
	});

	it('rejects a buffer that is not a PNG (wrong signature)', () => {
		expect(() => validateCanonicalPngChunks(Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]))).toThrow(
			/not a valid PNG/i
		);
	});

	it('rejects an empty buffer', () => {
		expect(() => validateCanonicalPngChunks(Buffer.alloc(0))).toThrow(/not a valid PNG/i);
	});

	it('rejects a PNG with a truncated chunk header (less than 12 bytes after signature)', async () => {
		const png = await encodeCanonicalMeadowEntryPng(Buffer.from([1, 2, 3, 255]), 1, 1);
		const truncated = Buffer.concat([png.subarray(0, 8), Buffer.from([0, 0, 0, 1])]);
		expect(() => validateCanonicalPngChunks(truncated)).toThrow(/truncated chunk/i);
	});

	it('rejects a PNG whose first chunk is not a 13-byte IHDR', async () => {
		const png = await encodeCanonicalMeadowEntryPng(Buffer.from([1, 2, 3, 255]), 1, 1);
		const ihdrData = png.subarray(16, 29);
		const shortIhdr = buildChunk('IHDR', ihdrData.subarray(0, 12));
		const idat = png.subarray(33, png.length - 12);
		const iend = png.subarray(png.length - 12);
		const corrupted = Buffer.concat([png.subarray(0, 8), shortIhdr, idat, iend]);
		expect(() => validateCanonicalPngChunks(corrupted)).toThrow(/must begin with a 13-byte IHDR/i);
	});

	it('rejects a PNG with a second IHDR chunk', async () => {
		const png = await encodeCanonicalMeadowEntryPng(Buffer.from([1, 2, 3, 255]), 1, 1);
		const ihdrChunk = png.subarray(8, 33);
		const idat = png.subarray(33, png.length - 12);
		const iend = png.subarray(png.length - 12);
		const withSecondIhdr = Buffer.concat([png.subarray(0, 8), ihdrChunk, ihdrChunk, idat, iend]);
		expect(() => validateCanonicalPngChunks(withSecondIhdr)).toThrow(/single IHDR/i);
	});

	it('rejects an IEND chunk with non-zero data length', async () => {
		const png = await encodeCanonicalMeadowEntryPng(Buffer.from([1, 2, 3, 255]), 1, 1);
		const ihdr = png.subarray(8, 33);
		const idat = png.subarray(33, png.length - 12);
		const badIend = buildChunk('IEND', Buffer.from([0]));
		const corrupted = Buffer.concat([png.subarray(0, 8), ihdr, idat, badIend]);
		expect(() => validateCanonicalPngChunks(corrupted)).toThrow(/zero-byte IEND/i);
	});

	it('rejects a PNG that has only IHDR and IEND with no IDAT', async () => {
		const png = await encodeCanonicalMeadowEntryPng(Buffer.from([1, 2, 3, 255]), 1, 1);
		const ihdr = png.subarray(8, 33);
		const iend = png.subarray(png.length - 12);
		const noIdat = Buffer.concat([png.subarray(0, 8), ihdr, iend]);
		expect(() => validateCanonicalPngChunks(noIdat)).toThrow(/IHDR, one or more IDAT/i);
	});

	it('rejects a PNG with a non-IDAT chunk between IHDR and IEND', async () => {
		const png = await encodeCanonicalMeadowEntryPng(Buffer.from([1, 2, 3, 255]), 1, 1);
		const ihdr = png.subarray(8, 33);
		const idat = png.subarray(33, png.length - 12);
		const iend = png.subarray(png.length - 12);
		const tEXtChunk = buildChunk('tEXt', Buffer.from('abcd', 'ascii'));
		const withNonIdat = Buffer.concat([png.subarray(0, 8), ihdr, idat, tEXtChunk, iend]);
		expect(() => validateCanonicalPngChunks(withNonIdat)).toThrow(/non-canonical PNG chunk/i);
	});

	it('decodes RGBA and reports correct channels', async () => {
		const raw = Buffer.from([10, 20, 30, 255, 40, 50, 60, 128]);
		const png = await encodeCanonicalMeadowEntryPng(raw, 2, 1);
		const decoded = await decodeMeadowEntryRgba(png);
		expect(decoded.width).toBe(2);
		expect(decoded.height).toBe(1);
		expect(decoded.data).toEqual(raw);
	});
});

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

	it('cleans up the temp file and rethrows when the destination is unwritable', async () => {
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
	});

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
});

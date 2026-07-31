import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import sharp from 'sharp';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./sundrop-village-png', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./sundrop-village-png')>();
	return {
		...actual,
		SUNDROP_VILLAGE_PNG_OPTIONS: { ...actual.SUNDROP_VILLAGE_PNG_OPTIONS, compressionLevel: 0 }
	};
});

const { retouchSundropVillagePng, SUNDROP_VILLAGE_RETOUCH_INPUT_PATH } =
	await import('./sundrop-village-retouch');

const INPUT_PATH = join(process.cwd(), SUNDROP_VILLAGE_RETOUCH_INPUT_PATH);
const EXPECTED_APPROVED_OUTPUT_PIXELS_SHA256 =
	'a6ef5013c5e20468e3b846dc410ce9ed4ccac3c0fffb28bb2ee8c4585bd80cd4';

let inputPng: Buffer;

beforeAll(async () => {
	inputPng = await readFile(INPUT_PATH);
});

describe('Sundrop Village retouch controller-approved output guard', () => {
	it('accepts different PNG compression levels because the guard hashes decoded RGBA pixels', async () => {
		// The mock above sets compressionLevel: 0 (vs the production 9). Under the
		// old PNG-buffer hash this changed the encoded bytes and failed the guard.
		// The pixel-hash guard is intentionally insensitive to compression choices,
		// so the retouch must succeed and the decoded pixels must still match.
		const result = await retouchSundropVillagePng(inputPng);
		const { data, info } = await sharp(result.png)
			.toColourspace('srgb')
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		expect(info.channels).toBe(4);
		const pixelHash = createHash('sha256').update(data).digest('hex');
		expect(pixelHash).toBe(EXPECTED_APPROVED_OUTPUT_PIXELS_SHA256);
		expect(result.provenance.output.pixelsSha256).toBe(EXPECTED_APPROVED_OUTPUT_PIXELS_SHA256);
	});

	it('records the encoded PNG SHA-256 as provenance alongside the pixel hash', async () => {
		const result = await retouchSundropVillagePng(inputPng);
		const pngHash = createHash('sha256').update(result.png).digest('hex');
		expect(result.provenance.output.sha256).toBe(pngHash);
		expect(result.provenance.output.pixelsSha256).toBe(EXPECTED_APPROVED_OUTPUT_PIXELS_SHA256);
	});
});

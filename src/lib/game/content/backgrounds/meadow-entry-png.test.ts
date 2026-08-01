import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	validateCanonicalPngChunks
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
});

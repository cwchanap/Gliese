import { describe, expect, it } from 'vitest';

import {
	SAVE_THUMBNAIL_HEIGHT,
	SAVE_THUMBNAIL_JPEG_QUALITY,
	SAVE_THUMBNAIL_MAX_BYTES,
	SAVE_THUMBNAIL_WIDTH,
	boundSaveThumbnail
} from '$lib/game/save/thumbnail';

describe('save thumbnail bounds', () => {
	it('captures at 256x144 JPEG with the documented ceiling', () => {
		expect(SAVE_THUMBNAIL_WIDTH).toBe(256);
		expect(SAVE_THUMBNAIL_HEIGHT).toBe(144);
		expect(SAVE_THUMBNAIL_MAX_BYTES).toBe(40 * 1024);
		expect(SAVE_THUMBNAIL_JPEG_QUALITY).toBe(0.72);
	});

	it('keeps data URLs at or under the byte ceiling', () => {
		// ~30KiB payload: 40960 base64 chars ≈ 30720 bytes.
		const small = `data:image/jpeg;base64,${'A'.repeat(40_960)}`;
		expect(boundSaveThumbnail(small)).toBe(small);
	});

	it('drops data URLs over the byte ceiling', () => {
		// 4097 * 1024 bytes is above the 40KiB ceiling.
		const large = `data:image/jpeg;base64,${'A'.repeat(4_194_304)}`;
		expect(boundSaveThumbnail(large)).toBeUndefined();
	});

	it('drops malformed payloads', () => {
		expect(boundSaveThumbnail(undefined)).toBeUndefined();
		expect(boundSaveThumbnail('')).toBeUndefined();
		expect(boundSaveThumbnail('not-a-data-url')).toBeUndefined();
	});
});

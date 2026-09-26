export const SAVE_THUMBNAIL_WIDTH = 256;
export const SAVE_THUMBNAIL_HEIGHT = 144;
export const SAVE_THUMBNAIL_MAX_BYTES = 40 * 1024;
export const SAVE_THUMBNAIL_JPEG_QUALITY = 0.72;

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Clamp an encoded thumbnail data URL to the storage ceiling. Oversized or
 * malformed payloads become `undefined` so the slot simply saves without a
 * preview image.
 */
export function boundSaveThumbnail(dataUrl: string | undefined): string | undefined {
	if (!dataUrl || !dataUrl.startsWith('data:')) return undefined;
	const separator = dataUrl.indexOf(',');
	if (separator < 0 || !dataUrl.slice(5, separator).endsWith(';base64')) return undefined;

	const base64 = dataUrl.slice(separator + 1);
	if (base64.length === 0 || base64.length % 4 !== 0 || !BASE64_PATTERN.test(base64)) {
		return undefined;
	}

	const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
	const bytes = (base64.length / 4) * 3 - padding;
	return bytes <= SAVE_THUMBNAIL_MAX_BYTES ? dataUrl : undefined;
}

/**
 * Capture the game canvas as a bounded JPEG thumbnail. Any failure (headless
 * or hidden canvas, tainted data, encode errors) resolves to `undefined` —
 * a thumbnail is never worth blocking the save for.
 * @param source - The live Phaser canvas, or `undefined`/`null` when absent.
 * @returns string | undefined — a bounded `data:image/jpeg;base64` URL, or
 *   `undefined` on any failure.
 */
export function captureSaveThumbnail(
	source: HTMLCanvasElement | undefined | null
): string | undefined {
	try {
		if (!source || source.width === 0 || source.height === 0) return undefined;

		const canvas = document.createElement('canvas');
		canvas.width = SAVE_THUMBNAIL_WIDTH;
		canvas.height = SAVE_THUMBNAIL_HEIGHT;
		const context = canvas.getContext('2d');
		if (!context) return undefined;

		context.drawImage(source, 0, 0, SAVE_THUMBNAIL_WIDTH, SAVE_THUMBNAIL_HEIGHT);
		return boundSaveThumbnail(canvas.toDataURL('image/jpeg', SAVE_THUMBNAIL_JPEG_QUALITY));
	} catch {
		return undefined;
	}
}

export const SAVE_THUMBNAIL_WIDTH = 256;
export const SAVE_THUMBNAIL_HEIGHT = 144;
export const SAVE_THUMBNAIL_MAX_BYTES = 40 * 1024;
export const SAVE_THUMBNAIL_JPEG_QUALITY = 0.72;

/**
 * Clamp an encoded thumbnail data URL to the storage ceiling. Oversized or
 * malformed payloads become `undefined` so the slot simply saves without a
 * preview image.
 */
export function boundSaveThumbnail(dataUrl: string | undefined): string | undefined {
	if (!dataUrl) return undefined;
	const separator = dataUrl.indexOf(',');
	if (!dataUrl.startsWith('data:') || separator < 0) return undefined;

	const base64 = dataUrl.slice(separator + 1);
	const bytes = Math.floor((base64.length * 3) / 4);
	return bytes <= SAVE_THUMBNAIL_MAX_BYTES ? dataUrl : undefined;
}

/**
 * Capture the game canvas as a bounded JPEG thumbnail. Any failure (headless
 * or hidden canvas, tainted data, encode errors) resolves to `undefined` —
 * a thumbnail is never worth blocking the save for.
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

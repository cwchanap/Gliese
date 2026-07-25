export const SUNDROP_VILLAGE_BACKGROUND_ID = 'sundrop-village-regional-background';
export const SUNDROP_VILLAGE_BACKGROUND_TEXTURE_KEY = 'sundrop-village-background';
export const SUNDROP_VILLAGE_BACKGROUND_PATH =
	'/game/assets/regions/sundrop-village-background.png';
export const SUNDROP_VILLAGE_BACKGROUND_DEPTH = -9;
export const SUNDROP_VILLAGE_BACKGROUND_WIDTH = 1792;
export const SUNDROP_VILLAGE_BACKGROUND_HEIGHT = 1536;
export const SUNDROP_VILLAGE_BACKGROUND_REVIEW_TARGET_BYTES = 4_194_304;
export const SUNDROP_VILLAGE_BACKGROUND_HARD_LIMIT_BYTES = 8_388_608;

export function sundropVillageBackgroundAlpha(
	x: number,
	y: number,
	width = 1792,
	height = 1536
): number {
	const distance = Math.min(x, y, width - 1 - x, height - 1 - y);
	const t = Math.max(0, Math.min(1, distance / 64));
	return Math.round(255 * (t * t * (3 - 2 * t)));
}

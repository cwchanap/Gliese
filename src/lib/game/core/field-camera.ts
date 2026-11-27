/** The world area the field camera frames: 40 × 22.5 tiles, the default 1280×720 window at 1:1. */
export const FIELD_VIEW = { width: 1280, height: 720 } as const;

/** Zoom steps, so tiles scale by a tidy factor (1.5 at 1080p, 2 at 1440p). */
const ZOOM_STEP = 0.25;

/**
 * Zoom for the field camera. A window larger than `FIELD_VIEW` scales the world
 * up so it frames about the same area instead of showing more of the map; a
 * smaller one stays at 1:1 and shows less. The zoom rounds down to a step, so
 * the view never frames less than `FIELD_VIEW`.
 */
export function fieldCameraZoom(viewportWidth: number, viewportHeight: number): number {
	if (!(viewportWidth > 0 && viewportHeight > 0)) return 1;
	const fit = Math.min(viewportWidth / FIELD_VIEW.width, viewportHeight / FIELD_VIEW.height);
	return Math.max(1, Math.floor(fit / ZOOM_STEP) * ZOOM_STEP);
}

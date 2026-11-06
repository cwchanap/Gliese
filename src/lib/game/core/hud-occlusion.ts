/**
 * Hero-card occlusion helpers for the field HUD.
 *
 * The hero card sits top-left on the game screen. When Grik walks beneath it
 * the card fades so he stays visible. Phaser only evaluates a screen-space
 * rectangle and republishes a boolean on zone entry/exit — it never sends
 * coordinates or per-frame state to the DOM.
 */

/**
 * Screen-space rectangle (game pixels) that the hero card can occupy, taken
 * from the FieldHud styles at every breakpoint:
 * - desktop: `top/left 2.125rem`, `width min(23.125rem, 100vw - 2rem)` → the
 *   card covers up to x≈404, y≈232;
 * - narrow portrait (≤720px): card is ≤19rem wide inside a 0.75rem offset;
 * - short height (≤559px): card is 19rem wide at `top .75rem / left .9rem`.
 * The envelope hugs the largest of these with a few px of margin.
 */
export const HERO_CARD_ZONE = {
	width: 420,
	height: 240
} as const;

/**
 * The slice of a Phaser camera needed to project a world point into
 * game-screen pixels. `worldView` already folds in scroll, zoom and the
 * zoom-around-centre term, so `width / worldView.width` is the screen scale.
 */
export type HeroScreenCamera = {
	readonly worldView: { x: number; y: number; width: number; height: number };
	readonly width: number;
	readonly height: number;
	readonly x: number;
	readonly y: number;
};

export function heroScreenPosition(
	camera: HeroScreenCamera,
	point: { x: number; y: number }
): { x: number; y: number } {
	const scaleX = camera.width / Math.max(camera.worldView.width, 1);
	const scaleY = camera.height / Math.max(camera.worldView.height, 1);
	return {
		x: (point.x - camera.worldView.x) * scaleX + camera.x,
		y: (point.y - camera.worldView.y) * scaleY + camera.y
	};
}

export function isHeroInHeroCardZone(screenX: number, screenY: number): boolean {
	return (
		screenX >= 0 &&
		screenX < HERO_CARD_ZONE.width &&
		screenY >= 0 &&
		screenY < HERO_CARD_ZONE.height
	);
}

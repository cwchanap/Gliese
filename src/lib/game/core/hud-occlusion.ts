export type HeroScreenCamera = {
	readonly scrollX: number;
	readonly scrollY: number;
	readonly zoom?: number;
	readonly zoomX?: number;
	readonly zoomY?: number;
	readonly width: number;
	readonly height: number;
	readonly x: number;
	readonly y: number;
};

const DESKTOP_CARD_ZONE = { width: 412, height: 240 } as const;
// Rendered compact hero card (portrait + HP only) plus its top/left margins;
// FieldHud's @media (max-height: 719px) owns the same breakpoint.
const SHORT_CARD_ZONE = { width: 264, height: 96 } as const;

export function heroCardZone(viewWidth: number, viewHeight: number) {
	if (viewHeight <= 719) {
		// Below ~452px wide the compact card narrows (15rem → 100vw-13rem)
		// to stay clear of the side HUD; the zone tracks its rendered right
		// edge plus the same ~10px margin (left inset 14.4 + card + margin).
		return {
			width: Math.min(SHORT_CARD_ZONE.width, Math.max(0, viewWidth - 184)),
			height: SHORT_CARD_ZONE.height
		};
	}
	if (viewWidth <= 832) {
		const renderedWidth = Math.min(304, Math.max(0, viewWidth - 112));
		const width = Math.min(326, 12 + renderedWidth + 10);
		return { width, height: 222 };
	}
	return DESKTOP_CARD_ZONE;
}

export function heroScreenPosition(
	camera: HeroScreenCamera,
	point: { x: number; y: number }
): { x: number; y: number } {
	const zoomX = camera.zoomX ?? camera.zoom ?? 1;
	const zoomY = camera.zoomY ?? camera.zoom ?? 1;
	return {
		x: (point.x - camera.scrollX) * zoomX - (camera.width / 2) * (zoomX - 1) + camera.x,
		y: (point.y - camera.scrollY) * zoomY - (camera.height / 2) * (zoomY - 1) + camera.y
	};
}

export const DEFAULT_HERO_HALF_SIZE = 45;

export function isHeroInHeroCardZone(
	screenX: number,
	screenY: number,
	viewWidth: number,
	viewHeight: number,
	heroHalfSize = DEFAULT_HERO_HALF_SIZE
): boolean {
	const zone = heroCardZone(viewWidth, viewHeight);
	return (
		screenX + heroHalfSize > 0 &&
		screenX - heroHalfSize < zone.width &&
		screenY + heroHalfSize > 0 &&
		screenY - heroHalfSize < zone.height
	);
}

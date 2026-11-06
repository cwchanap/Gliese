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
const NARROW_CARD_ZONE = { width: 326, height: 222 } as const;
const SHORT_CARD_ZONE = { width: 326, height: 148 } as const;

export function heroCardZone(viewWidth: number, viewHeight: number) {
	if (viewHeight <= 559) return SHORT_CARD_ZONE;
	if (viewWidth <= 720) return NARROW_CARD_ZONE;
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

export function settledCameraScroll(
	camera: { width: number; height: number; zoom?: number; zoomX?: number; zoomY?: number },
	bounds: { x: number; y: number; width: number; height: number },
	target: { x: number; y: number }
): { x: number; y: number } {
	const zoomX = camera.zoomX ?? camera.zoom ?? 1;
	const zoomY = camera.zoomY ?? camera.zoom ?? 1;
	const viewWidth = camera.width / zoomX;
	const viewHeight = camera.height / zoomY;
	const clampAxis = (value: number, min: number, max: number) =>
		Math.min(Math.max(value, min), Math.max(min, max));
	return {
		x: clampAxis(target.x - viewWidth / 2, bounds.x, bounds.x + bounds.width - viewWidth),
		y: clampAxis(target.y - viewHeight / 2, bounds.y, bounds.y + bounds.height - viewHeight)
	};
}

export function isHeroInHeroCardZone(
	screenX: number,
	screenY: number,
	viewWidth: number,
	viewHeight: number
): boolean {
	const zone = heroCardZone(viewWidth, viewHeight);
	return screenX >= 0 && screenX < zone.width && screenY >= 0 && screenY < zone.height;
}

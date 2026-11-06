import { describe, expect, it } from 'vitest';

import { heroCardZone, heroScreenPosition, isHeroInHeroCardZone } from './hud-occlusion';

describe('heroCardZone', () => {
	it('picks the compact-height zone for short viewports', () => {
		expect(heroCardZone(640, 480)).toEqual({ width: 326, height: 148 });
		expect(heroCardZone(1280, 550)).toEqual({ width: 326, height: 148 });
	});

	it('picks the narrow-portrait zone for tall compact viewports', () => {
		expect(heroCardZone(420, 760)).toEqual({ width: 326, height: 222 });
		expect(heroCardZone(720, 560)).toEqual({ width: 326, height: 222 });
	});

	it('picks the desktop zone for large viewports', () => {
		expect(heroCardZone(1280, 800)).toEqual({ width: 412, height: 240 });
		expect(heroCardZone(721, 560)).toEqual({ width: 412, height: 240 });
	});
});

describe('isHeroInHeroCardZone', () => {
	it('flags heroes under the compact-height card at 640x480', () => {
		expect(isHeroInHeroCardZone(80, 80, 640, 480)).toBe(true);
		expect(isHeroInHeroCardZone(160, 120, 640, 480)).toBe(true);
		expect(isHeroInHeroCardZone(0, 0, 640, 480)).toBe(true);
	});

	it('leaves genuinely clear positions beside and below the 640x480 card untouched', () => {
		expect(isHeroInHeroCardZone(160, 224, 640, 480)).toBe(false);
		expect(isHeroInHeroCardZone(160, 160, 640, 480)).toBe(false);
		expect(isHeroInHeroCardZone(330, 60, 640, 480)).toBe(false);
		expect(isHeroInHeroCardZone(400, 40, 640, 480)).toBe(false);
	});

	it('flags heroes under the narrow-portrait card at 420x760', () => {
		expect(isHeroInHeroCardZone(84, 176, 420, 760)).toBe(true);
		expect(isHeroInHeroCardZone(82, 146, 420, 760)).toBe(true);
		expect(isHeroInHeroCardZone(0, 0, 420, 760)).toBe(true);
	});

	it('leaves positions beside and below the 420x760 card untouched', () => {
		expect(isHeroInHeroCardZone(160, 316, 420, 760)).toBe(false);
		expect(isHeroInHeroCardZone(100, 240, 420, 760)).toBe(false);
		expect(isHeroInHeroCardZone(330, 60, 420, 760)).toBe(false);
	});

	it('flags heroes under the desktop card at 1280x800 and leaves clear spots alone', () => {
		expect(isHeroInHeroCardZone(370, 192, 1280, 800)).toBe(true);
		expect(isHeroInHeroCardZone(82, 127, 1280, 800)).toBe(true);
		expect(isHeroInHeroCardZone(448, 336, 1280, 800)).toBe(false);
		expect(isHeroInHeroCardZone(430, 60, 1280, 800)).toBe(false);
		expect(isHeroInHeroCardZone(200, 250, 1280, 800)).toBe(false);
		expect(isHeroInHeroCardZone(640, 360, 1280, 800)).toBe(false);
	});

	it('stays half-open at the zone edge', () => {
		expect(isHeroInHeroCardZone(325, 147, 640, 480)).toBe(true);
		expect(isHeroInHeroCardZone(326, 147, 640, 480)).toBe(false);
		expect(isHeroInHeroCardZone(325, 148, 640, 480)).toBe(false);
	});
});

describe('heroScreenPosition', () => {
	it('projects through scroll and zoom using live camera primitives', () => {
		const camera = { scrollX: 300, scrollY: 0, zoom: 1, width: 640, height: 360, x: 0, y: 0 };
		expect(heroScreenPosition(camera, { x: 500, y: 80 })).toEqual({ x: 200, y: 80 });
		const zoomed = { ...camera, scrollX: 100, zoom: 2 };
		expect(heroScreenPosition(zoomed, { x: 200, y: 40 }).x).toBeCloseTo((200 - 100) * 2 - 320);
	});

	it('stays coherent when only the camera size changes mid-resize', () => {
		const camera = { scrollX: 0, scrollY: 0, zoom: 1, width: 640, height: 480, x: 0, y: 0 };
		const before = heroScreenPosition(camera, { x: 230, y: 120 });
		const after = heroScreenPosition({ ...camera, width: 1280, height: 800 }, { x: 230, y: 120 });
		expect(after).toEqual(before);
	});
});

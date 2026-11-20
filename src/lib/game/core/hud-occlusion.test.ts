import { describe, expect, it } from 'vitest';

import { heroCardZone, heroScreenPosition, isHeroInHeroCardZone } from './hud-occlusion';

describe('heroCardZone', () => {
	it('picks the compact-height zone for short viewports', () => {
		expect(heroCardZone(640, 360)).toEqual({ width: 264, height: 96 });
		expect(heroCardZone(640, 480)).toEqual({ width: 264, height: 96 });
		expect(heroCardZone(1280, 550)).toEqual({ width: 264, height: 96 });
		expect(heroCardZone(1280, 719)).toEqual({ width: 264, height: 96 });
	});

	it('picks the compact zone for narrow mid-height windows (560–719px)', () => {
		// The 560–719 band used to activate the narrow-portrait layout (and
		// the desktop zone at widths over 832); the compact card owns it now.
		expect(heroCardZone(640, 560)).toEqual({ width: 264, height: 96 });
		expect(heroCardZone(832, 560)).toEqual({ width: 264, height: 96 });
		expect(heroCardZone(833, 560)).toEqual({ width: 264, height: 96 });
		expect(heroCardZone(832, 719)).toEqual({ width: 264, height: 96 });
	});

	it('shrinks the compact zone with the narrowed card below 448px wide', () => {
		// Card = left inset 14.4 + min(240, vw-208); zone adds ~10px margin.
		expect(heroCardZone(390, 650)).toEqual({ width: 206, height: 96 });
		expect(heroCardZone(448, 650)).toEqual({ width: 264, height: 96 });
		expect(heroCardZone(300, 360)).toEqual({ width: 116, height: 96 });
	});

	it('picks the narrow-portrait zone for tall compact viewports', () => {
		expect(heroCardZone(420, 760)).toEqual({ width: 326, height: 222 });
		expect(heroCardZone(832, 720)).toEqual({ width: 326, height: 222 });
		expect(heroCardZone(360, 760)).toEqual({ width: 270, height: 222 });
	});

	it('hands off without a fractional gap at height < 720 and width 832/833', () => {
		// FieldHud owns the same boundaries: (height < 720px) compact and
		// (max-width: 832px) and (height >= 720px) narrow-portrait. Fractional
		// DPI heights like 719.2px must not fall into a gap between rules.
		expect(heroCardZone(640, 719)).toEqual({ width: 264, height: 96 });
		expect(heroCardZone(640, 719.2)).toEqual({ width: 264, height: 96 });
		expect(heroCardZone(832, 719)).toEqual({ width: 264, height: 96 });
		expect(heroCardZone(832, 719.2)).toEqual({ width: 264, height: 96 });
		expect(heroCardZone(1280, 719)).toEqual({ width: 264, height: 96 });
		expect(heroCardZone(1280, 719.2)).toEqual({ width: 264, height: 96 });
		expect(heroCardZone(640, 720)).toEqual({ width: 326, height: 222 });
		expect(heroCardZone(832, 720)).toEqual({ width: 326, height: 222 });
		expect(heroCardZone(833, 720)).toEqual({ width: 412, height: 240 });
		expect(heroCardZone(1280, 720)).toEqual({ width: 412, height: 240 });
		// Width boundary only matters on the tall side; under 720px the
		// compact card owns every width.
		expect(heroCardZone(832, 719.2)).toEqual(heroCardZone(833, 719.2));
	});

	it('picks the desktop zone for large viewports', () => {
		expect(heroCardZone(1280, 800)).toEqual({ width: 412, height: 240 });
		expect(heroCardZone(1280, 720)).toEqual({ width: 412, height: 240 });
		expect(heroCardZone(833, 720)).toEqual({ width: 412, height: 240 });
	});
});

describe('isHeroInHeroCardZone', () => {
	it('flags heroes whose sprite extents enter the compact-height card at 640x360', () => {
		expect(isHeroInHeroCardZone(80, 60, 640, 360)).toBe(true);
		expect(isHeroInHeroCardZone(160, 80, 640, 360)).toBe(true);
		expect(isHeroInHeroCardZone(0, 0, 640, 360)).toBe(true);
		// Hero whose center is beside the card but left edge enters the card zone
		expect(isHeroInHeroCardZone(300, 60, 640, 360)).toBe(true);
		// Hero whose center is below the card but top edge enters the card zone
		expect(isHeroInHeroCardZone(160, 130, 640, 360)).toBe(true);
	});

	it('leaves genuinely clear positions beside and below the 640x360 card untouched', () => {
		expect(isHeroInHeroCardZone(160, 141, 640, 360)).toBe(false);
		expect(isHeroInHeroCardZone(160, 200, 640, 360)).toBe(false);
		expect(isHeroInHeroCardZone(310, 60, 640, 360)).toBe(false);
		expect(isHeroInHeroCardZone(500, 200, 640, 360)).toBe(false);
	});

	it('stops falsely dimming heroes the stale 412x240 desktop zone caught at mid heights', () => {
		// 833x560 and 1280x719 used to pick the desktop zone: heroes beside or
		// below the compact card were dimmed even though the card never drew
		// there. The compact zone leaves them alone.
		expect(isHeroInHeroCardZone(300, 200, 833, 560)).toBe(false);
		expect(isHeroInHeroCardZone(350, 150, 833, 560)).toBe(false);
		expect(isHeroInHeroCardZone(280, 150, 1280, 719)).toBe(false);
		expect(isHeroInHeroCardZone(200, 200, 1280, 719)).toBe(false);
		// …while heroes under the compact card still flag.
		expect(isHeroInHeroCardZone(200, 60, 1280, 719)).toBe(true);
		// One pixel taller restores the desktop zone and its taller dim area.
		expect(isHeroInHeroCardZone(200, 200, 1280, 720)).toBe(true);
	});

	it('flags heroes under the narrow-portrait card at 420x760', () => {
		expect(isHeroInHeroCardZone(84, 176, 420, 760)).toBe(true);
		expect(isHeroInHeroCardZone(82, 146, 420, 760)).toBe(true);
		expect(isHeroInHeroCardZone(0, 0, 420, 760)).toBe(true);
		expect(isHeroInHeroCardZone(350, 100, 420, 760)).toBe(true);
	});

	it('leaves positions beside and below the 420x760 card untouched', () => {
		expect(isHeroInHeroCardZone(160, 316, 420, 760)).toBe(false);
		expect(isHeroInHeroCardZone(100, 280, 420, 760)).toBe(false);
		expect(isHeroInHeroCardZone(380, 60, 420, 760)).toBe(false);
	});

	it('scales the portrait zone to the responsive card width at 360x760', () => {
		expect(isHeroInHeroCardZone(84, 176, 360, 760)).toBe(true);
		expect(isHeroInHeroCardZone(0, 0, 360, 760)).toBe(true);
		// Hero at x=340 has modeled left edge 295, clear of the responsive 270px zone
		expect(isHeroInHeroCardZone(340, 100, 360, 760)).toBe(false);
		expect(isHeroInHeroCardZone(160, 316, 360, 760)).toBe(false);
		expect(isHeroInHeroCardZone(380, 60, 360, 760)).toBe(false);
	});

	it('flags heroes under the desktop card at 1280x800 and leaves clear spots alone', () => {
		expect(isHeroInHeroCardZone(370, 192, 1280, 800)).toBe(true);
		expect(isHeroInHeroCardZone(82, 127, 1280, 800)).toBe(true);
		expect(isHeroInHeroCardZone(448, 336, 1280, 800)).toBe(false);
		expect(isHeroInHeroCardZone(460, 60, 1280, 800)).toBe(false);
		expect(isHeroInHeroCardZone(200, 290, 1280, 800)).toBe(false);
		expect(isHeroInHeroCardZone(640, 360, 1280, 800)).toBe(false);
	});

	it('stays half-open at the zone edge accounting for hero sprite extents', () => {
		// zone width 264, height 96. With heroHalfSize=45: threshold is 309 on X, 141 on Y.
		expect(isHeroInHeroCardZone(308, 140, 640, 360)).toBe(true);
		expect(isHeroInHeroCardZone(309, 140, 640, 360)).toBe(false);
		expect(isHeroInHeroCardZone(308, 141, 640, 360)).toBe(false);

		// With heroHalfSize=0 (center point only)
		expect(isHeroInHeroCardZone(263, 95, 640, 360, 0)).toBe(true);
		expect(isHeroInHeroCardZone(264, 95, 640, 360, 0)).toBe(false);
		expect(isHeroInHeroCardZone(263, 96, 640, 360, 0)).toBe(false);
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

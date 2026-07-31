import { describe, expect, it } from 'vitest';
import {
	boundsArea,
	clampBoundsToWorld,
	containsBounds,
	intersectBounds,
	rasterizeCoverageBounds,
	snapBoundsOutward,
	toRawPixelBounds,
	unionArea
} from './meadow-entry-authoring-geometry';

describe('meadow-entry authoring geometry', () => {
	it('converts centered map rectangles into raw pixel bounds', () => {
		expect(toRawPixelBounds({ id: 'shed', x: 96, y: 80, width: 64, height: 32 })).toEqual({
			left: 64,
			top: 64,
			right: 128,
			bottom: 96
		});
	});

	it('rasterizes fractional coverage outward to whole pixels', () => {
		expect(rasterizeCoverageBounds({ left: 7.5, top: 16.5, right: 12.5, bottom: 23.5 })).toEqual({
			left: 7,
			top: 16,
			right: 13,
			bottom: 24
		});
	});

	it('snaps bounds outward to the requested grid', () => {
		expect(snapBoundsOutward({ left: 33, top: 63, right: 95, bottom: 97 }, 32)).toEqual({
			left: 32,
			top: 32,
			right: 96,
			bottom: 128
		});
	});

	it('clamps only the world edges that exceed meadow-entry', () => {
		expect(clampBoundsToWorld({ left: 6272, top: 6272, right: 6528, bottom: 6528 })).toEqual({
			bounds: { left: 6272, top: 6272, right: 6400, bottom: 6400 },
			clampedSides: ['right', 'bottom']
		});
	});

	it('intersects and contains half-open pixel bounds', () => {
		const container = { left: 0, top: 0, right: 32, bottom: 32 };
		expect(intersectBounds(container, { left: 16, top: 8, right: 48, bottom: 24 })).toEqual({
			left: 16,
			top: 8,
			right: 32,
			bottom: 24
		});
		expect(intersectBounds(container, { left: 32, top: 0, right: 48, bottom: 32 })).toBeNull();
		expect(containsBounds(container, { left: 0, top: 0, right: 32, bottom: 32 })).toBe(true);
		expect(containsBounds(container, { left: 1, top: 0, right: 33, bottom: 32 })).toBe(false);
	});

	it('calculates union area without overlapping coverage twice', () => {
		expect(
			unionArea([
				{ left: 0, top: 0, right: 32, bottom: 32 },
				{ left: 16, top: 0, right: 48, bottom: 32 }
			])
		).toBe(48 * 32);
		expect(boundsArea({ left: 0, top: 0, right: 32, bottom: 16 })).toBe(512);
	});

	it('rejects non-finite, inverted, and out-of-world public bounds', () => {
		expect(() =>
			rasterizeCoverageBounds({ left: 0, top: 0, right: Number.NaN, bottom: 1 })
		).toThrow();
		expect(() => snapBoundsOutward({ left: 2, top: 0, right: 1, bottom: 1 })).toThrow();
		expect(() => boundsArea({ left: 0, top: 0, right: 6401, bottom: 1 })).toThrow();
	});
});

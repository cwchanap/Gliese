import { describe, expect, it } from 'vitest';

import { fieldCameraZoom } from './field-camera';

describe('fieldCameraZoom', () => {
	it('keeps the default window and smaller ones at 1:1', () => {
		expect(fieldCameraZoom(1280, 720)).toBe(1);
		expect(fieldCameraZoom(1366, 768)).toBe(1);
		expect(fieldCameraZoom(640, 360)).toBe(1);
	});

	it('scales larger windows up so they frame about the same area', () => {
		expect(fieldCameraZoom(1600, 900)).toBe(1.25);
		expect(fieldCameraZoom(1920, 1080)).toBe(1.5);
		expect(fieldCameraZoom(2560, 1440)).toBe(2);
	});

	it('fits the tighter side, so wide and tall windows still frame the whole default view', () => {
		expect(fieldCameraZoom(2560, 1080)).toBe(1.5);
		expect(fieldCameraZoom(1920, 1600)).toBe(1.5);
	});

	it('falls back to 1:1 before the canvas has a size', () => {
		expect(fieldCameraZoom(0, 0)).toBe(1);
		expect(fieldCameraZoom(Number.NaN, 720)).toBe(1);
	});
});

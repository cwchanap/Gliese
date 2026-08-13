import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_PAINTED_V2_CAMERA_ROUTE_REACH_PX,
	MEADOW_ENTRY_PAINTED_V2_CAMERA_SAFE_ROUTE,
	MEADOW_ENTRY_PAINTED_V2_CAMERA_VIEWPORT,
	assertMeadowEntryPaintedV2CameraBoundsCovered,
	assertMeadowEntryPaintedV2CameraEnvelopeCovered,
	cameraBoundsAtMeadowEntryPoint,
	collectMeadowEntryPaintedV2CameraEnvelopes
} from './meadow-entry-painted-v2-camera-envelope';
import { MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS } from './meadow-entry-painted-v2-crop-manifest';
import type { PixelBounds } from './meadow-entry-authoring-types';

function envelopeBounds(bounds: readonly PixelBounds[]): PixelBounds {
	return {
		left: Math.min(...bounds.map(({ left }) => left)),
		top: Math.min(...bounds.map(({ top }) => top)),
		right: Math.max(...bounds.map(({ right }) => right)),
		bottom: Math.max(...bounds.map(({ bottom }) => bottom))
	};
}

describe('painted-v2 swept camera envelope', () => {
	it('pins the stabilized viewport and axis-aligned route', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_CAMERA_VIEWPORT).toEqual({ width: 1_920, height: 1_080 });
		expect(MEADOW_ENTRY_PAINTED_V2_CAMERA_ROUTE_REACH_PX).toBe(18);
		expect(MEADOW_ENTRY_PAINTED_V2_CAMERA_SAFE_ROUTE).toEqual([
			{ id: 'hero-house', x: 704, y: 5_920 },
			{ id: 'south-lane', x: 704, y: 6_080 },
			{ id: 'west-lane-south', x: 320, y: 6_080 },
			{ id: 'west-lane-north', x: 320, y: 4_688 },
			{ id: 'pickup-lane', x: 912, y: 4_688 },
			{ id: 'market-pickup', x: 912, y: 5_072 },
			{ id: 'market-return', x: 912, y: 4_688 },
			{ id: 'villager-house-1-approach', x: 660, y: 4_688 },
			{ id: 'villager-house-1-lane', x: 672, y: 4_688 },
			{ id: 'villager-house-1', x: 672, y: 4_448 },
			{ id: 'villager-house-1-return', x: 672, y: 4_688 },
			{ id: 'crossroads-handoff', x: 3_776, y: 4_688 },
			{ id: 'waystone-east-lane', x: 4_032, y: 4_688 },
			{ id: 'waystone-south', x: 4_032, y: 4_480 },
			{ id: 'waystone-north', x: 4_032, y: 4_224 },
			{ id: 'waystone', x: 3_904, y: 4_224 },
			{ id: 'waystone-return-east', x: 4_160, y: 4_224 },
			{ id: 'waystone-return-south', x: 4_160, y: 4_480 },
			{ id: 'crossroads-return', x: 3_776, y: 4_480 },
			{ id: 'connector-return-east', x: 3_264, y: 4_480 },
			{ id: 'connector-return-lane', x: 3_264, y: 4_688 },
			{ id: 'west-lane-return', x: 320, y: 4_688 },
			{ id: 'save-lane', x: 1_152, y: 4_688 },
			{ id: 'save-point', x: 1_152, y: 4_800 }
		]);
	});

	it('clamps camera rectangles to the world edges', () => {
		expect(cameraBoundsAtMeadowEntryPoint({ x: 704, y: 5_920 })).toEqual({
			left: 0,
			top: 5_320,
			right: 1_920,
			bottom: 6_400
		});
		expect(cameraBoundsAtMeadowEntryPoint({ x: 3_500, y: 4_100 })).toEqual({
			left: 2_540,
			top: 3_560,
			right: 4_460,
			bottom: 4_640
		});
	});

	it('covers every safe-route envelope segment with the two pilot crops', () => {
		const crops = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ bounds }) => bounds);
		expect(() => assertMeadowEntryPaintedV2CameraEnvelopeCovered(crops)).not.toThrow();
		expect(envelopeBounds(collectMeadowEntryPaintedV2CameraEnvelopes())).toEqual({
			left: 0,
			top: 3_666,
			right: 5_138,
			bottom: 6_400
		});
	});

	it('rejects a crop union that misses a swept segment', () => {
		expect(() =>
			assertMeadowEntryPaintedV2CameraEnvelopeCovered([
				{ left: 0, top: 3_200, right: 3_200, bottom: 6_400 }
			])
		).toThrow(/camera envelope segment/);
	});

	it('rejects diagonal routes and invalid camera geometry', () => {
		expect(() =>
			collectMeadowEntryPaintedV2CameraEnvelopes([
				{ id: 'a', x: 1_000, y: 1_000 },
				{ id: 'diagonal', x: 1_100, y: 1_100 }
			])
		).toThrow(/axis-aligned/);
		expect(() => cameraBoundsAtMeadowEntryPoint({ x: -1, y: 1_000 })).toThrow(/within/);
		expect(() =>
			cameraBoundsAtMeadowEntryPoint({ x: 1_000, y: 1_000 }, { width: 0, height: 1_080 })
		).toThrow(/positive/);
		expect(() =>
			cameraBoundsAtMeadowEntryPoint({ x: 1_000, y: 1_000 }, { width: 6_401, height: 1_080 })
		).toThrow(/world/);
	});

	it('rejects camera points outside the world and invalid crop bounds', () => {
		expect(() => cameraBoundsAtMeadowEntryPoint({ x: 1_000, y: 6_401 })).toThrow(/within/);
		expect(() =>
			assertMeadowEntryPaintedV2CameraBoundsCovered(
				[{ left: 0, top: 0, right: 0, bottom: 1 }],
				{ left: 0, top: 0, right: 1_920, bottom: 1_080 },
				'invalid crop'
			)
		).toThrow(/bounds/);
	});
});

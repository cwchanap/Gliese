import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-complete';
import { decodeMeadowEntryRgba } from '$lib/game/content/backgrounds/meadow-entry-png';

import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES,
	parseCompleteExportArguments,
	sliceCompleteMasterRgba
} from './export-meadow-entry-painted-v2-complete';

function patternedMaster(): Buffer {
	const width = MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH;
	const height = MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT;
	const rgba = Buffer.alloc(width * height * 4);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const offset = (y * width + x) * 4;
			rgba[offset] = x & 0xff;
			rgba[offset + 1] = y & 0xff;
			rgba[offset + 2] = (x + y) & 0xff;
			rgba[offset + 3] = 255;
		}
	}
	return rgba;
}

describe('complete Meadow runtime slice contract', () => {
	it('partitions every master pixel into one exact 3200x3200 RGBA rectangle', () => {
		const master = patternedMaster();
		const slices = sliceCompleteMasterRgba({
			data: master,
			width: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
			height: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
		});

		expect(slices).toHaveLength(4);
		const seen = new Uint8Array(
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH * MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
		);

		for (const [index, slice] of slices.entries()) {
			const spec = MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES[index]!;
			expect(slice.cropId).toBe(spec.cropId);
			expect(slice.width).toBe(3200);
			expect(slice.height).toBe(3200);
			for (let localY = 0; localY < slice.height; localY += 1) {
				for (let localX = 0; localX < slice.width; localX += 1) {
					const masterX = spec.bounds.left + localX;
					const masterY = spec.bounds.top + localY;
					const masterPixel = masterY * MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH + masterX;
					expect(seen[masterPixel]).toBe(0);
					seen[masterPixel] = 1;
					const sourceOffset = masterPixel * 4;
					const sliceOffset = (localY * slice.width + localX) * 4;
					expect(slice.rgba.subarray(sliceOffset, sliceOffset + 4)).toEqual(
						master.subarray(sourceOffset, sourceOffset + 4)
					);
				}
			}
		}

		expect(seen.every((pixel) => pixel === 1)).toBe(true);
	}, 30000);

	it('rejects a master whose dimensions are not the approved 6400x6400 canvas', () => {
		expect(() => sliceCompleteMasterRgba({ data: Buffer.alloc(4), width: 1, height: 1 })).toThrow(
			/6400x6400/
		);
	});

	it('keeps the command surface limited to write and check modes', () => {
		expect(parseCompleteExportArguments([])).toEqual({ check: false });
		expect(parseCompleteExportArguments(['--check'])).toEqual({ check: true });
		expect(() => parseCompleteExportArguments(['--check', '--check'])).toThrow(/Usage/);
		expect(() => parseCompleteExportArguments(['--package', 'legacy'])).toThrow(/Usage/);
	});

	it('uses the approved master path and produces stable slice specifications', async () => {
		const masterPath =
			'artifacts/meadow-entry/painted-v2/complete/masters/meadow-entry-painted-v2-complete-base-master.png';
		const bytes = await readFile(masterPath);
		expect(bytes.byteLength).toBeGreaterThan(0);
		expect(createHash('sha256').update(bytes).digest('hex')).toBe(
			'11a417318b089b6cc1a47bee639306bb78379b7847ea42598c789b57c76c6a52'
		);
		expect(MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES.map(({ cropId }) => cropId)).toEqual([
			'painted-v2-complete-northwest',
			'painted-v2-complete-northeast',
			'painted-v2-complete-southwest',
			'painted-v2-complete-southeast'
		]);
	});

	it('keeps each checked-in runtime PNG byte-equal to its master rectangle after RGBA decode', async () => {
		const master = await decodeMeadowEntryRgba(
			await readFile(
				'artifacts/meadow-entry/painted-v2/complete/masters/meadow-entry-painted-v2-complete-base-master.png'
			)
		);
		for (const spec of MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES) {
			const runtime = await decodeMeadowEntryRgba(
				await readFile(`public/game/assets/regions/meadow-entry-painted-v2/${spec.filename}`)
			);
			expect(runtime.width).toBe(3200);
			expect(runtime.height).toBe(3200);
			for (let localY = 0; localY < runtime.height; localY += 1) {
				const masterOffset = ((spec.bounds.top + localY) * master.width + spec.bounds.left) * 4;
				const runtimeOffset = localY * runtime.width * 4;
				expect(runtime.data.subarray(runtimeOffset, runtimeOffset + runtime.width * 4)).toEqual(
					master.data.subarray(masterOffset, masterOffset + runtime.width * 4)
				);
			}
		}
	}, 30000);
});

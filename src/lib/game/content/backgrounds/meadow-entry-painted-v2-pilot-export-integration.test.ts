import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { meadowEntryControlsApproval } from '../approvals/meadow-entry-painted-v2-controls';
import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS
} from './meadow-entry-painted-v2-crop-manifest';
import { exportMeadowEntryRegions } from './meadow-entry-exporter';
import { decodeMeadowEntryRgba } from './meadow-entry-png';
import { runFinalizeMeadowEntryPaintedV2Pilot } from '../../../../../tools/finalize-meadow-entry-painted-v2-pilot';

const repositoryRoot = resolve(import.meta.dirname, '../../../../..');
const runtimeRoot = join(repositoryRoot, 'public/game/assets/regions/meadow-entry-painted-v2');

function overlapBytes(
	entry: { bounds: { left: number; top: number }; width: number; rgba: Buffer },
	bounds: { left: number; top: number; right: number; bottom: number }
): Buffer {
	const width = bounds.right - bounds.left;
	const rows: Buffer[] = [];
	for (let y = bounds.top; y < bounds.bottom; y += 1) {
		const start = ((y - entry.bounds.top) * entry.width + bounds.left - entry.bounds.left) * 4;
		rows.push(entry.rgba.subarray(start, start + width * 4));
	}
	return Buffer.concat(rows);
}

describe('sealed painted-v2 pilot assembly export integration', () => {
	it('assembles committed panels through the real exporter into opaque, identical runtime bytes', async () => {
		const assembled = await runFinalizeMeadowEntryPaintedV2Pilot(repositoryRoot, { check: true });
		const exported = await exportMeadowEntryRegions({
			baseMasterPng: assembled.masterPng,
			controlFingerprint: meadowEntryControlsApproval.combinedControlFingerprint,
			approvedControlFingerprint: meadowEntryControlsApproval.combinedControlFingerprint,
			crops: MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
			overlaps: MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS
		});

		expect(Object.keys(exported.files).sort()).toEqual(
			MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ baseFilename }) => baseFilename).sort()
		);
		for (const crop of MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS) {
			const bytes = exported.files[crop.baseFilename]!;
			const decoded = await decodeMeadowEntryRgba(bytes);
			expect({ width: decoded.width, height: decoded.height }, crop.id).toEqual(
				crop.expectedDimensions
			);
			expect(
				decoded.data.every((value, index) => index % 4 !== 3 || value === 255),
				`${crop.id} opacity`
			).toBe(true);
			expect(
				(await readFile(join(runtimeRoot, crop.baseFilename))).equals(bytes),
				`${crop.id} runtime bytes`
			).toBe(true);
		}

		for (const overlap of MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS) {
			const first = exported.decoded.find(
				(entry) => entry.cropId === overlap.firstCropId && entry.plane === 'base'
			)!;
			const second = exported.decoded.find(
				(entry) => entry.cropId === overlap.secondCropId && entry.plane === 'base'
			)!;
			expect(
				overlapBytes(first, overlap.bounds).equals(overlapBytes(second, overlap.bounds)),
				overlap.id
			).toBe(true);
		}
	});
});

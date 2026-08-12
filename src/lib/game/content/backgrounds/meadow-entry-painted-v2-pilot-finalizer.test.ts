import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS
} from './meadow-entry-painted-v2-crop-manifest';
import {
	assembleMeadowEntryPaintedV2Pilot,
	type MeadowEntryPaintedV2PilotAssemblyInput,
	type MeadowEntryPaintedV2PilotPanelSpec
} from './meadow-entry-painted-v2-pilot-finalizer';
import { decodeMeadowEntryRgba, encodeCanonicalMeadowEntryPng } from './meadow-entry-png';
import type { MeadowEntryGenerationProvenance } from './meadow-entry-master-provenance';

const FINGERPRINT = 'a'.repeat(64);

const generation = (id: string, bytes: Buffer): MeadowEntryGenerationProvenance => ({
	mode: 'manual',
	provider: null,
	model: null,
	modelVersion: null,
	tool: 'test',
	toolVersion: '1',
	settings: {
		normalizedSha256: createHash('sha256').update(bytes).digest('hex'),
		normalizedDimensions: { width: 2, height: 2 },
		normalizedBytes: bytes.byteLength,
		panelId: id
	},
	seed: null,
	seedUnavailable: false,
	prompt: null,
	promptSha256: null,
	referenceImageSha256: [],
	byteReproducibleGeneration: false
});

const rgbaPanel = async (red: number, green: number, blue: number): Promise<Buffer> => {
	const raw = Buffer.alloc(2 * 2 * 4);
	for (let offset = 0; offset < raw.length; offset += 4) {
		raw[offset] = red;
		raw[offset + 1] = green;
		raw[offset + 2] = blue;
		raw[offset + 3] = 255;
	}
	return await encodeCanonicalMeadowEntryPng(raw, 2, 2);
};

const specs: readonly MeadowEntryPaintedV2PilotPanelSpec[] = [
	{
		id: 'low',
		bounds: { left: 100, top: 100, right: 102, bottom: 102 },
		expectedDimensions: { width: 2, height: 2 },
		assemblyPriority: 10
	},
	{
		id: 'high',
		bounds: { left: 101, top: 101, right: 103, bottom: 103 },
		expectedDimensions: { width: 2, height: 2 },
		assemblyPriority: 20
	}
];

async function fixture(): Promise<MeadowEntryPaintedV2PilotAssemblyInput> {
	const low = await rgbaPanel(220, 30, 30);
	const high = await rgbaPanel(30, 30, 220);
	return {
		panels: { low, high },
		panelProvenance: { low: generation('low', low), high: generation('high', high) },
		controlFingerprint: FINGERPRINT,
		approvedControlFingerprint: FINGERPRINT,
		panelSpecs: specs
	};
}

describe('painted-v2 pilot partial master assembler', () => {
	it('assembles in priority order and leaves outside-pilot pixels transparent', async () => {
		const result = await assembleMeadowEntryPaintedV2Pilot(await fixture());
		const decoded = await decodeMeadowEntryRgba(result.masterPng);
		const overlapOffset = (101 * decoded.width + 101) * 4;
		expect([...decoded.data.subarray(overlapOffset, overlapOffset + 4)]).toEqual([
			30, 30, 220, 255
		]);
		const outsideOffset = (200 * decoded.width + 200) * 4;
		expect([...decoded.data.subarray(outsideOffset, outsideOffset + 4)]).toEqual([0, 0, 0, 0]);
	});

	it('fails closed when a panel dimensions or normalized hash drifts', async () => {
		const input = await fixture();
		const wrongDimensions = {
			...input,
			panelProvenance: {
				...input.panelProvenance,
				low: {
					...input.panelProvenance.low!,
					settings: {
						...input.panelProvenance.low!.settings,
						normalizedDimensions: { width: 3, height: 2 }
					}
				}
			}
		};
		await expect(assembleMeadowEntryPaintedV2Pilot(wrongDimensions)).rejects.toThrow(/dimension/i);

		const wrongHash = {
			...input,
			panelProvenance: {
				...input.panelProvenance,
				high: {
					...input.panelProvenance.high!,
					settings: { ...input.panelProvenance.high!.settings, normalizedSha256: 'b'.repeat(64) }
				}
			}
		};
		await expect(assembleMeadowEntryPaintedV2Pilot(wrongHash)).rejects.toThrow(/hash/i);
	});

	it('emits byte-identical master and provenance on repeat runs', async () => {
		const input = await fixture();
		const first = await assembleMeadowEntryPaintedV2Pilot(input);
		const second = await assembleMeadowEntryPaintedV2Pilot(input);
		expect(second.masterPng.equals(first.masterPng)).toBe(true);
		expect(second.provenanceJson.equals(first.provenanceJson)).toBe(true);
	});

	it('keeps the approved overlap contract available for runtime proof checks', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS).toHaveLength(3);
		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS).toHaveLength(2);
	});
});

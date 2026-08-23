import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT,
	assembleMeadowEntryPaintedV2CompleteMaster,
	type MeadowEntryPaintedV2CompleteAssemblyInput
} from './meadow-entry-painted-v2-complete-assembly';
import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS,
	type MeadowEntryPaintedV2CompletePanelId
} from './meadow-entry-painted-v2-complete';
import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	validateCanonicalPngChunks
} from './meadow-entry-png';

const PANEL_WIDTH = 2432;
const PANEL_HEIGHT = 1792;

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

function pixel(data: Buffer, width: number, x: number, y: number): readonly number[] {
	const offset = (y * width + x) * 4;
	return [...data.subarray(offset, offset + 4)];
}

async function syntheticPanelPng(index: number): Promise<Buffer> {
	const data = Buffer.alloc(PANEL_WIDTH * PANEL_HEIGHT * 4);
	const base = [(index * 41 + 23) % 256, (index * 67 + 31) % 256, (index * 97 + 47) % 256];
	for (let y = 0; y < PANEL_HEIGHT; y += 1) {
		for (let x = 0; x < PANEL_WIDTH; x += 1) {
			const offset = (y * PANEL_WIDTH + x) * 4;
			data[offset] = base[0]!;
			data[offset + 1] = base[1]!;
			data[offset + 2] = base[2]!;
			data[offset + 3] = 255;
			if ((x + y + index * 17) % 503 === 0) {
				data[offset] = 244;
				data[offset + 1] = 226;
				data[offset + 2] = 112;
			}
		}
	}
	return encodeCanonicalMeadowEntryPng(data, PANEL_WIDTH, PANEL_HEIGHT);
}

async function validInput(): Promise<MeadowEntryPaintedV2CompleteAssemblyInput> {
	const entries = await Promise.all(
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.map(async (panel, index) => {
			const png = await syntheticPanelPng(index);
			return [
				panel.id,
				png,
				Buffer.from(
					JSON.stringify({
						packageId: 'meadow-entry-painted-v2-complete',
						panelId: panel.id,
						bounds: panel.bounds,
						controlFingerprint: MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT,
						normalized: {
							path: panel.normalizedPath,
							sha256: sha256(png),
							bytes: png.byteLength,
							dimensions: panel.expectedDimensions
						}
					})
				)
			] as const;
		})
	);
	return {
		controlFingerprint: MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT,
		panels: Object.fromEntries(entries.map(([id, png]) => [id, png])) as unknown as Readonly<
			Record<MeadowEntryPaintedV2CompletePanelId, Buffer>
		>,
		provenance: Object.fromEntries(
			entries.map(([id, , provenance]) => [id, provenance])
		) as unknown as Readonly<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>>
	};
}

describe('complete Meadow Entry painted-v2 master assembly', () => {
	it('assembles deterministic opaque canonical 6400×6400 output with both-axis handoffs', async () => {
		const input = await validInput();
		const first = await assembleMeadowEntryPaintedV2CompleteMaster(input);
		const second = await assembleMeadowEntryPaintedV2CompleteMaster(input);
		expect(first.masterPng).toEqual(second.masterPng);
		expect(first.provenanceJson).toEqual(second.provenanceJson);
		validateCanonicalPngChunks(first.masterPng);
		const decoded = await decodeMeadowEntryRgba(first.masterPng);
		expect(decoded.width).toBe(MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH);
		expect(decoded.height).toBe(MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT);
		for (let offset = 3; offset < decoded.data.length; offset += 4) {
			expect(decoded.data[offset]).toBe(255);
		}

		// Non-overlap interiors remain byte-identical to their owning panel.
		const panels = input.panels;
		const northWest = await decodeMeadowEntryRgba(panels['north-west']!);
		const northCenter = await decodeMeadowEntryRgba(panels['north-center']!);
		const northMidWest = await decodeMeadowEntryRgba(panels['north-mid-west']!);
		const southEast = await decodeMeadowEntryRgba(panels['south-east']!);
		expect(pixel(decoded.data, decoded.width, 100, 100)).toEqual(
			pixel(northWest.data, northWest.width, 100, 100)
		);
		expect(pixel(decoded.data, decoded.width, 3000, 100)).toEqual(
			pixel(northCenter.data, northCenter.width, 3000 - 1984, 100)
		);
		expect(pixel(decoded.data, decoded.width, 6300, 6300)).toEqual(
			pixel(southEast.data, southEast.width, 6300 - 3968, 6300 - 4608)
		);

		// The exact outer endpoints of each seam retain the source panels while the
		// interior is permitted to choose a content-aware handoff.
		expect(pixel(decoded.data, decoded.width, 1984, 100)).toEqual(
			pixel(northWest.data, northWest.width, 1984, 100)
		);
		expect(pixel(decoded.data, decoded.width, 2431, 100)).toEqual(
			pixel(northCenter.data, northCenter.width, 2431 - 1984, 100)
		);
		expect(pixel(decoded.data, decoded.width, 100, 1536)).toEqual(
			pixel(northWest.data, northWest.width, 100, 1536)
		);
		expect(pixel(decoded.data, decoded.width, 100, 1791)).toEqual(
			pixel(northMidWest.data, northMidWest.width, 100, 1791 - 1536)
		);

		// Interior pixels in each overlap are content-aware handoffs rather than
		// either source's hard edge.
		expect(pixel(decoded.data, decoded.width, 2200, 100)).not.toEqual(
			pixel(northWest.data, northWest.width, 2200, 100)
		);
		expect(pixel(decoded.data, decoded.width, 2200, 100)).not.toEqual(
			pixel(northCenter.data, northCenter.width, 2200 - 1984, 100)
		);
		expect(pixel(decoded.data, decoded.width, 100, 1650)).not.toEqual(
			pixel(northWest.data, northWest.width, 100, 1650)
		);
		expect(pixel(decoded.data, decoded.width, 100, 1650)).not.toEqual(
			pixel(northMidWest.data, northMidWest.width, 100, 1650 - 1536)
		);

		const provenance = JSON.parse(first.provenanceJson.toString('utf8')) as Record<string, unknown>;
		expect(provenance).toMatchObject({
			packageId: 'meadow-entry-painted-v2-complete',
			controlFingerprint: MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT,
			dimensions: { width: 6400, height: 6400 }
		});
	}, 300_000);

	it('fails closed for missing panels, malformed pixels, stale hashes, and stale controls', async () => {
		const input = await validInput();
		const missingPanels: Partial<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>> = {
			...input.panels
		};
		delete missingPanels['north-west'];
		const missingProvenance: Partial<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>> = {
			...input.provenance
		};
		delete missingProvenance['north-west'];
		await expect(
			assembleMeadowEntryPaintedV2CompleteMaster({
				...input,
				panels: missingPanels as Readonly<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>>,
				provenance: missingProvenance as Readonly<
					Record<MeadowEntryPaintedV2CompletePanelId, Buffer>
				>
			})
		).rejects.toThrow(/missing.*panel|panel.*missing|keys.*catalog/i);

		const wrongDimensions = await encodeCanonicalMeadowEntryPng(Buffer.alloc(4), 1, 1);
		await expect(
			assembleMeadowEntryPaintedV2CompleteMaster({
				...input,
				panels: { ...input.panels, 'north-west': wrongDimensions }
			})
		).rejects.toThrow(/dimension/i);

		const transparentData = Buffer.alloc(PANEL_WIDTH * PANEL_HEIGHT * 4, 0);
		const transparent = await encodeCanonicalMeadowEntryPng(
			transparentData,
			PANEL_WIDTH,
			PANEL_HEIGHT
		);
		await expect(
			assembleMeadowEntryPaintedV2CompleteMaster({
				...input,
				panels: { ...input.panels, 'north-west': transparent }
			})
		).rejects.toThrow(/opaque/i);

		const staleHash = JSON.parse(input.provenance['north-west']!.toString('utf8')) as {
			normalized: { sha256: string };
		};
		staleHash.normalized.sha256 = '0'.repeat(64);
		await expect(
			assembleMeadowEntryPaintedV2CompleteMaster({
				...input,
				provenance: {
					...input.provenance,
					'north-west': Buffer.from(JSON.stringify(staleHash))
				}
			})
		).rejects.toThrow(/hash|stale/i);

		const staleControl = JSON.parse(input.provenance['north-west']!.toString('utf8')) as {
			controlFingerprint: string;
		};
		staleControl.controlFingerprint = '1'.repeat(64);
		await expect(
			assembleMeadowEntryPaintedV2CompleteMaster({
				...input,
				provenance: {
					...input.provenance,
					'north-west': Buffer.from(JSON.stringify(staleControl))
				}
			})
		).rejects.toThrow(/control fingerprint|stale/i);
	});
});

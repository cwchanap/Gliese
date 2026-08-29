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
import { blendMeadowEntryContentAwareHandoff } from './meadow-entry-painted-v2-underlay-assembly';

const PANEL_WIDTH = 2432;
const PANEL_HEIGHT = 1792;

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

function testGeneration(panelId: MeadowEntryPaintedV2CompletePanelId): Record<string, unknown> {
	const prompt = `test prompt ${panelId}`;
	return {
		attempt: 1,
		model: 'test-model',
		modelVersion: '1',
		provider: 'test-provider',
		tool: 'test-tool',
		prompt,
		promptSha256: sha256(Buffer.from(prompt)),
		referenceIds: ['meadow-entry-painted-v2-complete-art-direction-reference']
	};
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

async function coordinateEncodedPanelPng(row: number): Promise<Buffer> {
	const data = Buffer.alloc(PANEL_WIDTH * PANEL_HEIGHT * 4);
	for (let y = 0; y < PANEL_HEIGHT; y += 1) {
		for (let x = 0; x < PANEL_WIDTH; x += 1) {
			const offset = (y * PANEL_WIDTH + x) * 4;
			data[offset] = 32 + row * 41;
			data[offset + 1] = y & 0xff;
			data[offset + 2] = 20 + Math.floor(y / 256) * 35;
			data[offset + 3] = 255;
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
						raw: {
							path: panel.rawPath,
							sha256: sha256(png),
							bytes: png.byteLength,
							dimensions: panel.expectedDimensions
						},
						generation: testGeneration(panel.id),
						rejectionHistory: [],
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
		raw: Object.fromEntries(entries.map(([id, png]) => [id, png])) as unknown as Readonly<
			Record<MeadowEntryPaintedV2CompletePanelId, Buffer>
		>,
		panels: Object.fromEntries(entries.map(([id, png]) => [id, png])) as unknown as Readonly<
			Record<MeadowEntryPaintedV2CompletePanelId, Buffer>
		>,
		provenance: Object.fromEntries(
			entries.map(([id, , provenance]) => [id, provenance])
		) as unknown as Readonly<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>>
	};
}

async function coordinateEncodedInput(): Promise<MeadowEntryPaintedV2CompleteAssemblyInput> {
	const entries = await Promise.all(
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.map(async (panel, index) => {
			const png = await coordinateEncodedPanelPng(Math.floor(index / 3));
			return [
				panel.id,
				png,
				Buffer.from(
					JSON.stringify({
						packageId: 'meadow-entry-painted-v2-complete',
						panelId: panel.id,
						bounds: panel.bounds,
						controlFingerprint: MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT,
						raw: {
							path: panel.rawPath,
							sha256: sha256(png),
							bytes: png.byteLength,
							dimensions: panel.expectedDimensions
						},
						generation: testGeneration(panel.id),
						rejectionHistory: [],
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
		raw: Object.fromEntries(entries.map(([id, png]) => [id, png])) as unknown as Readonly<
			Record<MeadowEntryPaintedV2CompletePanelId, Buffer>
		>,
		panels: Object.fromEntries(entries.map(([id, png]) => [id, png])) as unknown as Readonly<
			Record<MeadowEntryPaintedV2CompletePanelId, Buffer>
		>,
		provenance: Object.fromEntries(
			entries.map(([id, , provenance]) => [id, provenance])
		) as unknown as Readonly<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>>
	};
}

function coordinateRegion(
	row: number,
	localTop: number
): {
	readonly data: Buffer;
	readonly width: number;
	readonly height: number;
} {
	const height = 256;
	const data = Buffer.alloc(MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH * height * 4);
	for (let y = 0; y < height; y += 1) {
		const localY = localTop + y;
		for (let x = 0; x < MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH; x += 1) {
			const offset = (y * MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH + x) * 4;
			data[offset] = 32 + row * 41;
			data[offset + 1] = localY & 0xff;
			data[offset + 2] = 20 + Math.floor(localY / 256) * 35;
			data[offset + 3] = 255;
		}
	}
	return { data, width: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH, height };
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
			dimensions: { width: 6400, height: 6400 },
			rejectionHistory: []
		});
		expect(provenance.panels).toHaveLength(12);
		for (const panel of provenance.panels as Array<Record<string, unknown>>) {
			expect(panel.provenanceSha256).toMatch(/^[a-f0-9]{64}$/);
			expect(panel.rejectionHistory).toEqual([]);
		}
	}, 450_000);

	it('uses each incoming row local top strip for vertical joins', async () => {
		const input = await coordinateEncodedInput();
		const assembled = await assembleMeadowEntryPaintedV2CompleteMaster(input);
		const decoded = await decodeMeadowEntryRgba(assembled.masterPng);
		const previousRowOverlap = coordinateRegion(0, 1536);
		const incomingTopOverlap = coordinateRegion(1, 0);
		const incomingBottomOverlap = coordinateRegion(1, 1536);
		const expectedTop = blendMeadowEntryContentAwareHandoff(
			previousRowOverlap,
			incomingTopOverlap,
			'y'
		).rgba;
		const expectedBottom = blendMeadowEntryContentAwareHandoff(
			previousRowOverlap,
			incomingBottomOverlap,
			'y'
		).rgba;
		const actual = pixel(decoded.data, decoded.width, 100, 1536 + 128);
		expect(actual).toEqual(pixel(expectedTop.data, expectedTop.width, 100, 128));
		expect(pixel(expectedTop.data, expectedTop.width, 100, 128)).not.toEqual(
			pixel(expectedBottom.data, expectedBottom.width, 100, 128)
		);
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

	it('fails closed for missing or tampered raw records and incomplete provenance history', async () => {
		const input = await integrityInput();
		const missingRaw: Partial<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>> = {
			...input.raw
		};
		delete missingRaw['north-west'];
		await expect(
			assembleMeadowEntryPaintedV2CompleteMaster({
				...input,
				raw: missingRaw as Readonly<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>>
			})
		).rejects.toThrow(/raw|missing/i);

		const tamperedRaw = Buffer.from(input.raw['north-west']!);
		tamperedRaw[tamperedRaw.length - 1] ^= 1;
		await expect(
			assembleMeadowEntryPaintedV2CompleteMaster({
				...input,
				raw: { ...input.raw, 'north-west': tamperedRaw }
			})
		).rejects.toThrow(/raw|hash|canonical/i);

		const missingGeneration = JSON.parse(
			input.provenance['north-west']!.toString('utf8')
		) as Record<string, unknown>;
		delete missingGeneration.generation;
		await expect(
			assembleMeadowEntryPaintedV2CompleteMaster({
				...input,
				provenance: {
					...input.provenance,
					'north-west': Buffer.from(JSON.stringify(missingGeneration))
				}
			})
		).rejects.toThrow(/generation|required/i);

		const unapprovedReference = JSON.parse(input.provenance['north-center']!.toString('utf8')) as {
			generation: { referenceIds: string[] };
		};
		unapprovedReference.generation.referenceIds.push('south-east');
		await expect(
			assembleMeadowEntryPaintedV2CompleteMaster({
				...input,
				provenance: {
					...input.provenance,
					'north-center': Buffer.from(JSON.stringify(unapprovedReference))
				}
			})
		).rejects.toThrow(/reference|adjacent|approved/i);
	});

	it('requires contiguous rejection history before an accepted attempt', async () => {
		const input = await integrityInput();
		const provenance = JSON.parse(input.provenance['north-mid-center']!.toString('utf8')) as Record<
			string,
			unknown
		>;
		provenance.generation = {
			...(provenance.generation as Record<string, unknown>),
			attempt: 3
		};

		await expect(
			assembleMeadowEntryPaintedV2CompleteMaster({
				...input,
				provenance: {
					...input.provenance,
					'north-mid-center': Buffer.from(JSON.stringify(provenance))
				}
			})
		).rejects.toThrow(/rejection|attempt|contiguous/i);

		provenance.rejectionHistory = [
			{ attempt: 2, reason: 'synthetic missing first rejection', status: 'rejected' }
		];
		await expect(
			assembleMeadowEntryPaintedV2CompleteMaster({
				...input,
				provenance: {
					...input.provenance,
					'north-mid-center': Buffer.from(JSON.stringify(provenance))
				}
			})
		).rejects.toThrow(/rejection|attempt|contiguous/i);
	});
});

async function integrityInput(): Promise<
	MeadowEntryPaintedV2CompleteAssemblyInput & {
		readonly raw: Readonly<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>>;
	}
> {
	const input = await validInput();
	const entries = MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.map((panel) => {
		const normalized = input.panels[panel.id]!;
		const provenance = JSON.parse(input.provenance[panel.id]!.toString('utf8')) as Record<
			string,
			unknown
		>;
		provenance.raw = {
			path: panel.rawPath,
			sha256: sha256(normalized),
			bytes: normalized.byteLength,
			dimensions: panel.expectedDimensions
		};
		const prompt = `test prompt ${panel.id}`;
		provenance.generation = {
			attempt: 1,
			model: 'test-model',
			modelVersion: '1',
			provider: 'test-provider',
			tool: 'test-tool',
			prompt,
			promptSha256: sha256(Buffer.from(prompt)),
			referenceIds: ['meadow-entry-painted-v2-complete-art-direction-reference']
		};
		provenance.rejectionHistory = [];
		return [panel.id, normalized, Buffer.from(JSON.stringify(provenance))] as const;
	});
	return {
		...input,
		raw: Object.fromEntries(entries.map(([id, png]) => [id, png])) as Readonly<
			Record<MeadowEntryPaintedV2CompletePanelId, Buffer>
		>,
		provenance: Object.fromEntries(
			entries.map(([id, , provenance]) => [id, provenance])
		) as Readonly<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>>
	};
}

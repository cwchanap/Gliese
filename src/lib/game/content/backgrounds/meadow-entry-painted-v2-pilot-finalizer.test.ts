import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS
} from './meadow-entry-painted-v2-crop-manifest';
import {
	assembleMeadowEntryPaintedV2Pilot,
	type MeadowEntryPaintedV2PilotAssemblyInput
} from './meadow-entry-painted-v2-pilot-finalizer';
import { decodeMeadowEntryRgba } from './meadow-entry-png';
import { MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS } from './meadow-entry-painted-v2-pilot';
import type { MeadowEntryGenerationProvenance } from './meadow-entry-master-provenance';

const repositoryRoot = resolve(import.meta.dirname, '../../../../..');

async function fixture(): Promise<MeadowEntryPaintedV2PilotAssemblyInput> {
	const provenance = JSON.parse(
		await readFile(
			join(
				repositoryRoot,
				'artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json'
			),
			'utf8'
		)
	) as {
		controls: { fingerprint: string };
		panels: readonly { id: string; generation: MeadowEntryGenerationProvenance }[];
	};
	return {
		panels: Object.fromEntries(
			await Promise.all(
				MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.map(async (panel) => [
					panel.id,
					await readFile(join(repositoryRoot, panel.normalizedPath))
				])
			)
		),
		panelProvenance: Object.fromEntries(
			provenance.panels.map(({ id, generation }) => [id, generation])
		),
		controlFingerprint: provenance.controls.fingerprint,
		approvedControlFingerprint: provenance.controls.fingerprint
	};
}

describe('painted-v2 pilot partial master assembler', () => {
	it('ignores force-cast caller rows and keeps the sealed priority contract', async () => {
		const input = await fixture();
		const forgedInput: MeadowEntryPaintedV2PilotAssemblyInput = {
			...input,
			// @ts-expect-error The public assembly contract deliberately rejects caller-owned rows.
			panelSpecs: [...MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS].reverse().map((panel, index) => ({
				...panel,
				assemblyPriority: (index + 1) * 10
			}))
		};
		const result = await assembleMeadowEntryPaintedV2Pilot(forgedInput);
		expect(createHash('sha256').update(result.masterPng).digest('hex')).toBe(
			'8f27680ad922ae4215476ae347b549c03143b120a94ed4064c64d96f6e2e5dbd'
		);
	});

	it('assembles the sealed panel priorities and leaves outside-pilot pixels transparent', async () => {
		const result = await assembleMeadowEntryPaintedV2Pilot(await fixture());
		const decoded = await decodeMeadowEntryRgba(result.masterPng);
		const crossroads = await decodeMeadowEntryRgba(
			await readFile(
				join(repositoryRoot, 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.png')
			)
		);
		const masterX = 3000;
		const masterY = 4600;
		const overlapOffset = (masterY * decoded.width + masterX) * 4;
		const crossroadsOffset = ((masterY - 2816) * crossroads.width + (masterX - 2880)) * 4;
		expect([...decoded.data.subarray(overlapOffset, overlapOffset + 4)]).toEqual([
			...crossroads.data.subarray(crossroadsOffset, crossroadsOffset + 4)
		]);
		const outsideOffset = (100 * decoded.width + 100) * 4;
		expect([...decoded.data.subarray(outsideOffset, outsideOffset + 4)]).toEqual([0, 0, 0, 0]);
	});

	it('fails closed when a panel dimensions or normalized hash drifts', async () => {
		const input = await fixture();
		const panelId = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS[0]!.id;
		const wrongDimensions: MeadowEntryPaintedV2PilotAssemblyInput = {
			...input,
			panelProvenance: {
				...input.panelProvenance,
				[panelId]: {
					...input.panelProvenance[panelId]!,
					settings: {
						...input.panelProvenance[panelId]!.settings,
						normalizedDimensions: { width: 2625, height: 1088 }
					}
				}
			}
		};
		await expect(assembleMeadowEntryPaintedV2Pilot(wrongDimensions)).rejects.toThrow(/dimension/i);

		const wrongHash: MeadowEntryPaintedV2PilotAssemblyInput = {
			...input,
			panelProvenance: {
				...input.panelProvenance,
				[panelId]: {
					...input.panelProvenance[panelId]!,
					settings: {
						...input.panelProvenance[panelId]!.settings,
						normalizedSha256: 'b'.repeat(64)
					}
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

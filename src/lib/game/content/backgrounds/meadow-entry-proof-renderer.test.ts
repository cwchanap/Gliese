import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_APPROVED_CROPS,
	MEADOW_ENTRY_APPROVED_OVERLAPS,
	MEADOW_ENTRY_RUNTIME_COVERAGE
} from './meadow-entry-crop-manifest';
import { encodeCanonicalMeadowEntryPng, decodeMeadowEntryRgba } from './meadow-entry-png';
import {
	MEADOW_ENTRY_PROOF_DESCRIPTORS,
	MEADOW_ENTRY_PROOF_FILENAMES,
	assertAllowedMeadowEntryProofDestination,
	renderMeadowEntryOverlapDifference,
	renderMeadowEntryReviewComposite
} from './meadow-entry-proof-renderer';

async function pixel(rgba: readonly number[]): Promise<Buffer> {
	return await encodeCanonicalMeadowEntryPng(Buffer.from(rgba), 1, 1);
}

describe('Meadow Entry proof renderer', () => {
	it('proves the four-layer Sundrop review-composite truth table', async () => {
		const transparent = await pixel([0, 0, 0, 0]);
		const hpaBase = await pixel([10, 20, 30, 255]);
		const sundropBase = await pixel([40, 50, 60, 255]);
		const hpaForeground = await pixel([70, 80, 90, 255]);
		const sundropForeground = await pixel([100, 110, 120, 255]);
		const composite = async (layers: {
			hpaForeground: Buffer;
			sundropBase: Buffer;
			sundropForeground: Buffer;
		}) =>
			(
				await decodeMeadowEntryRgba(
					await renderMeadowEntryReviewComposite({
						baseMasterPng: hpaBase,
						foregroundMasterPng: layers.hpaForeground,
						sundropBasePng: layers.sundropBase,
						sundropForegroundPng: layers.sundropForeground,
						sundropBounds: { left: 0, top: 0, right: 1, bottom: 1 }
					})
				)
			).data;

		expect(
			await composite({
				hpaForeground: transparent,
				sundropBase: transparent,
				sundropForeground: transparent
			})
		).toEqual(Buffer.from([10, 20, 30, 255]));
		expect(
			await composite({
				hpaForeground: transparent,
				sundropBase,
				sundropForeground: transparent
			})
		).toEqual(Buffer.from([40, 50, 60, 255]));
		expect(
			await composite({
				hpaForeground,
				sundropBase,
				sundropForeground: transparent
			})
		).toEqual(Buffer.from([70, 80, 90, 255]));
		expect(await composite({ hpaForeground, sundropBase, sundropForeground })).toEqual(
			Buffer.from([100, 110, 120, 255])
		);
	});

	it('has a unique fixed inventory covering every required proof identity', () => {
		const proofIds = MEADOW_ENTRY_PROOF_DESCRIPTORS.map(({ proofId }) => proofId);
		expect(new Set(proofIds).size).toBe(proofIds.length);
		expect(new Set(MEADOW_ENTRY_PROOF_FILENAMES).size).toBe(MEADOW_ENTRY_PROOF_FILENAMES.length);

		const required = [
			'full/base-master',
			'full/foreground-checkerboard',
			'full/immutable-sundrop-composite',
			'full/protected-live-overlay',
			'full/collision-overlay',
			'full/foreground-eligibility-overlay',
			'full/interaction-readability-overlay',
			'full/baked-coverage',
			'full/fallback-coverage',
			...MEADOW_ENTRY_APPROVED_CROPS.map(
				(crop) => `${crop.id.includes('connector') ? 'connectors' : 'regions'}/${crop.id}`
			),
			...MEADOW_ENTRY_APPROVED_OVERLAPS.map((overlap) => `overlaps/${overlap.id}`),
			...new Set(
				MEADOW_ENTRY_APPROVED_OVERLAPS.flatMap(({ cornerGroupId }) =>
					cornerGroupId ? [`corners/${cornerGroupId}`] : []
				)
			),
			...MEADOW_ENTRY_APPROVED_CROPS.flatMap((crop) =>
				(crop.edgeClamp?.sides ?? []).map((side) => `clamps/${crop.id}-${side}`)
			),
			...MEADOW_ENTRY_RUNTIME_COVERAGE.flatMap((coverage, index) =>
				coverage.mode === 'fallback-tile'
					? [`fallback-boundaries/fallback-${String(index).padStart(3, '0')}`]
					: []
			),
			...['top', 'right', 'bottom', 'left'].map((edge) => `sundrop-feather/${edge}`)
		];

		expect(proofIds).toEqual(required);
		expect(MEADOW_ENTRY_PROOF_FILENAMES).toEqual(required.map((id) => `${id}.png`));
	});

	it('renders an all-zero overlap difference for identical decoded pixels', async () => {
		const source = await encodeCanonicalMeadowEntryPng(
			Buffer.from([1, 2, 3, 255, 4, 5, 6, 128]),
			2,
			1
		);
		const difference = await renderMeadowEntryOverlapDifference(source, source);
		const decoded = await decodeMeadowEntryRgba(difference.png);

		expect(difference.differingPixels).toBe(0);
		expect(difference.maximumChannelDifference).toBe(0);
		expect(decoded.data).toEqual(Buffer.alloc(8));
	});

	it('reports exact overlap drift diagnostics', async () => {
		const first = await pixel([1, 2, 3, 255]);
		const second = await pixel([1, 9, 3, 255]);
		const difference = await renderMeadowEntryOverlapDifference(first, second);

		expect(difference).toMatchObject({
			differingPixels: 1,
			maximumChannelDifference: 7,
			firstDifference: { x: 0, y: 0, channel: 1, first: 2, second: 9 }
		});
	});

	it('rejects any output outside the fixed proof allowlist', () => {
		expect(() => assertAllowedMeadowEntryProofDestination('regions/crossroads.png')).not.toThrow();
		expect(() => assertAllowedMeadowEntryProofDestination('regions/crossroads.json')).not.toThrow();
		expect(() => assertAllowedMeadowEntryProofDestination('../hpa-398/proof.png')).toThrow(
			/unexpected Meadow Entry proof destination/
		);
		expect(() => assertAllowedMeadowEntryProofDestination('full/unreviewed.png')).toThrow(
			/unexpected Meadow Entry proof destination/
		);
	});
});

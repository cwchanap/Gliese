import { describe, expect, it } from 'vitest';

import type { MapVisualOwnership, WorldMapDefinition } from '$lib/game/content/maps/types';
import {
	MEADOW_ENTRY_PAINTED_MODE_FALLBACK,
	MEADOW_ENTRY_PAINTED_MODE_PILOT,
	type MeadowEntryPaintedSelection
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-runtime';
import { meadowEntryMap } from './meadow-entry';
import { applyMeadowEntryPaintedBackgrounds } from './meadow-entry-painted-backgrounds';

type VisualOwner = MeadowEntryPaintedSelection['visualOwners'][number];

const PILOT_BACKGROUND = {
	id: 'painted-base',
	x: 0,
	y: 0,
	width: 128,
	height: 128,
	textureKey: 'painted-base-texture',
	plane: 'base' as const,
	drawOrder: 0
};

function owner(
	sourceType: VisualOwner['sourceType'],
	sourceId: string,
	visual: Extract<MapVisualOwnership, { mode: 'fallback-only' }> = {
		mode: 'fallback-only',
		ownerCrops: [{ cropId: 'pilot', requiredBackgroundIds: [PILOT_BACKGROUND.id] }]
	}
): VisualOwner {
	return { sourceType, sourceId, ownerCrops: visual.ownerCrops };
}

function syntheticSelection(
	visualOwners: readonly VisualOwner[] = [
		owner('blocker', 'pilot-blocker'),
		owner('decor', 'pilot-decor'),
		owner('fence', 'pilot-fence')
	],
	backgrounds = [PILOT_BACKGROUND]
): MeadowEntryPaintedSelection {
	return {
		mode: 'pilot',
		assets: [],
		backgrounds,
		visualOwners
	};
}

function syntheticMap(
	mapId = 'meadow-entry',
	options: {
		readonly blockerVisual?: MapVisualOwnership;
		readonly backgroundImages?: WorldMapDefinition['backgroundImages'];
	} = {}
): WorldMapDefinition {
	return {
		id: mapId,
		width: 200,
		height: 200,
		spawnDirection: 'up',
		spawn: { x: 64, y: 64 },
		transitions: [],
		backgroundImages: options.backgroundImages,
		blockers: [
			{
				id: 'pilot-blocker',
				x: 64,
				y: 64,
				width: 32,
				height: 32,
				kind: 'town-hedge',
				...(options.blockerVisual ? { visual: options.blockerVisual } : {})
			}
		],
		// The transform deliberately treats each visual source as an `id`-keyed
		// collection. These small records keep the test independent of art frames.
		mapDecor: [
			{
				id: 'pilot-decor',
				x: 96,
				y: 64,
				width: 32,
				height: 32
			} as never
		],
		fences: [
			{
				id: 'pilot-fence',
				x: 128,
				y: 64,
				width: 32,
				height: 32
			}
		]
	} as WorldMapDefinition;
}

describe('Meadow Entry painted background transform', () => {
	it('returns a non-Meadow map by identity', () => {
		const map = syntheticMap('hero-house');

		expect(applyMeadowEntryPaintedBackgrounds(map, { selection: syntheticSelection() })).toBe(map);
	});

	it('returns Meadow Entry by identity for the fallback selection', () => {
		expect(
			applyMeadowEntryPaintedBackgrounds(meadowEntryMap, {
				selection: MEADOW_ENTRY_PAINTED_MODE_FALLBACK
			})
		).toBe(meadowEntryMap);
	});

	it('shallow-clones the pilot map and attaches the exact selected descriptors', () => {
		const map = syntheticMap();
		const selection = syntheticSelection();

		const transformed = applyMeadowEntryPaintedBackgrounds(map, { selection });

		expect(transformed).not.toBe(map);
		expect(transformed.backgroundImages).toEqual(selection.backgrounds);
		expect(transformed.backgroundImages?.[0]).toBe(selection.backgrounds[0]);
		expect(transformed.blockers).not.toBe(map.blockers);
		expect(transformed.mapDecor).not.toBe(map.mapDecor);
		expect(transformed.fences).not.toBe(map.fences);
		expect(transformed.spawn).toBe(map.spawn);
		expect(transformed.transitions).toBe(map.transitions);
	});

	it('assigns reviewed ownership across all five source types', () => {
		const transformed = applyMeadowEntryPaintedBackgrounds(syntheticMap(), {
			selection: syntheticSelection()
		});

		for (const source of [
			transformed.blockers?.[0],
			transformed.mapDecor?.[0],
			transformed.fences?.[0]
		]) {
			expect(source?.visual).toEqual({
				mode: 'fallback-only',
				ownerCrops: [{ cropId: 'pilot', requiredBackgroundIds: [PILOT_BACKGROUND.id] }]
			});
		}
	});

	it('applies all real pilot ownership rows to their Meadow source records', () => {
		const transformed = applyMeadowEntryPaintedBackgrounds(meadowEntryMap, {
			selection: MEADOW_ENTRY_PAINTED_MODE_PILOT
		});
		const expectedOrganicBlockerOwners = [
			'coast-crossroads-mouth-bank',
			'mistfen-entry-bank-east',
			'silverpine-wall-A-east',
			'silverpine-wall-A-west',
			'silverpine-wall-B-north',
			'silverpine-wall-B-south',
			'silverpine-wall-C-east',
			'silverpine-wall-C-west',
			'wildwood-forest-lane-west-bank'
		] as const;

		expect(transformed.backgroundImages).toEqual(MEADOW_ENTRY_PAINTED_MODE_PILOT.backgrounds);
		expect(transformed.backgroundImages).toHaveLength(2);
		expect(transformed.backgroundImages?.map(({ width, height }) => ({ width, height }))).toEqual([
			{ width: 3_200, height: 3_200 },
			{ width: 3_200, height: 3_200 }
		]);
		for (const sourceId of expectedOrganicBlockerOwners) {
			const blockerOwner = MEADOW_ENTRY_PAINTED_MODE_PILOT.visualOwners.find(
				(owner) => owner.sourceType === 'blocker' && owner.sourceId === sourceId
			);
			expect(blockerOwner, sourceId).toBeDefined();
			expect(transformed.blockers?.find(({ id }) => id === sourceId)?.visual, sourceId).toEqual({
				mode: 'fallback-only',
				ownerCrops: blockerOwner?.ownerCrops
			});
		}

		for (const ownerRow of MEADOW_ENTRY_PAINTED_MODE_PILOT.visualOwners.filter(
			({ sourceType }) => sourceType === 'decor'
		)) {
			expect(transformed.mapDecor?.find(({ id }) => id === ownerRow.sourceId)?.visual).toEqual({
				mode: 'fallback-only',
				ownerCrops: ownerRow.ownerCrops
			});
		}
	});

	it('keeps authored blocker geometry and collision semantics independent of painted ownership', () => {
		const transformed = applyMeadowEntryPaintedBackgrounds(meadowEntryMap, {
			selection: MEADOW_ENTRY_PAINTED_MODE_PILOT
		});
		for (const sourceId of [
			'coast-crossroads-mouth-bank',
			'mistfen-entry-bank-east',
			'silverpine-wall-A-east',
			'silverpine-wall-A-west',
			'silverpine-wall-B-north',
			'silverpine-wall-B-south',
			'silverpine-wall-C-east',
			'silverpine-wall-C-west',
			'wildwood-forest-lane-west-bank'
		] as const) {
			const sourceBlocker = meadowEntryMap.blockers?.find(({ id }) => id === sourceId);
			const transformedBlocker = transformed.blockers?.find(({ id }) => id === sourceId);

			expect(sourceBlocker, sourceId).toBeDefined();
			expect(transformedBlocker, sourceId).toMatchObject({
				id: sourceId,
				x: sourceBlocker?.x,
				y: sourceBlocker?.y,
				width: sourceBlocker?.width,
				height: sourceBlocker?.height,
				kind: sourceBlocker?.kind
			});
			expect(transformedBlocker?.visual, sourceId).toMatchObject({ mode: 'fallback-only' });
		}
		expect(transformed.blockers).toHaveLength(meadowEntryMap.blockers?.length ?? 0);
	});

	it('does not mutate the source map or any nested source arrays', () => {
		const map = syntheticMap();
		const blockers = map.blockers!;
		const blocker = blockers[0]!;
		const mapDecor = map.mapDecor!;
		const fences = map.fences!;

		const transformed = applyMeadowEntryPaintedBackgrounds(map, {
			selection: syntheticSelection()
		});

		expect(map.blockers).toBe(blockers);
		expect(map.blockers?.[0]).toBe(blocker);
		expect(map.mapDecor).toBe(mapDecor);
		expect(map.fences).toBe(fences);
		expect(blocker.visual).toBeUndefined();
		expect(map.backgroundImages).toBeUndefined();
		expect(transformed.blockers?.[0]).not.toBe(blocker);
	});

	it('does not inspect assets or mutate descriptors when texture loading is unavailable', () => {
		const selection = syntheticSelection();
		const unavailableSelection = { ...selection, assets: [] };

		const transformed = applyMeadowEntryPaintedBackgrounds(syntheticMap(), {
			selection: unavailableSelection
		});

		expect(transformed.backgroundImages).toEqual(selection.backgrounds);
		expect(transformed.backgroundImages?.[0]).toBe(selection.backgrounds[0]);
	});

	it.each([
		[
			'duplicate owner rows',
			[owner('blocker', 'pilot-blocker'), owner('blocker', 'pilot-blocker')],
			'Duplicate visual ownership assignment source ID: pilot-blocker'
		],
		[
			'missing source IDs',
			[owner('blocker', 'missing-blocker')],
			'Visual ownership assignment references missing item ID: missing-blocker'
		]
	] as const)('%s fail closed', (_label, visualOwners, message) => {
		expect(() =>
			applyMeadowEntryPaintedBackgrounds(syntheticMap(), {
				selection: syntheticSelection(visualOwners)
			})
		).toThrow(message);
	});

	it('rejects a pre-existing visual instead of overwriting it', () => {
		const map = syntheticMap('meadow-entry', { blockerVisual: { mode: 'always' } });

		expect(() =>
			applyMeadowEntryPaintedBackgrounds(map, { selection: syntheticSelection() })
		).toThrow('Visual ownership assignment would overwrite existing visual: pilot-blocker');
	});

	it('validates owner descriptor IDs on the transformed map', () => {
		const selection = syntheticSelection([
			owner('blocker', 'pilot-blocker', {
				mode: 'fallback-only',
				ownerCrops: [{ cropId: 'pilot', requiredBackgroundIds: ['missing-background'] }]
			}),
			owner('decor', 'pilot-decor'),
			owner('fence', 'pilot-fence')
		]);

		expect(() => applyMeadowEntryPaintedBackgrounds(syntheticMap(), { selection })).toThrow(
			'Blocker pilot-blocker references missing fallback-only owner ID in crop pilot: missing-background'
		);
	});
});

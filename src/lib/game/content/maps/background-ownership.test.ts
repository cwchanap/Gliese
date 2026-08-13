import { describe, expect, it } from 'vitest';

import {
	applyVisualOwnership,
	getMapBackgroundDepth,
	shouldRenderOwnedVisual,
	validateMapBackgroundOwnership
} from '$lib/game/content/maps/background-ownership';
import type {
	MapBlocker,
	MapVisualOwnership,
	WorldMapDefinition
} from '$lib/game/content/maps/types';

function ownershipSource(
	backgroundIds: string[],
	blockers: MapBlocker[] = []
): Pick<WorldMapDefinition, 'backgroundImages' | 'blockers'> {
	return {
		backgroundImages: backgroundIds.map((id) => ({
			id,
			textureKey: `${id}-texture`,
			x: 0,
			y: 0,
			width: 32,
			height: 32,
			plane: 'base',
			drawOrder: 0
		})),
		blockers
	};
}

function visualOwnershipSource(
	visual: MapVisualOwnership,
	visualSource: 'blocker' | 'decor' | 'fence' = 'blocker'
): Pick<WorldMapDefinition, 'backgroundImages' | 'blockers' | 'mapDecor' | 'fences'> {
	const visualItem = {
		id: 'garden-hedge',
		x: 0,
		y: 0,
		width: 32,
		height: 32,
		visual
	};

	return {
		backgroundImages: [
			{
				id: 'base',
				textureKey: 'base-texture',
				x: 0,
				y: 0,
				width: 32,
				height: 32,
				plane: 'base',
				drawOrder: 0
			}
		],
		blockers: visualSource === 'blocker' ? [{ ...visualItem, kind: 'garden-hedge' }] : [],
		mapDecor: visualSource === 'decor' ? [visualItem] : [],
		fences: visualSource === 'fence' ? [visualItem] : []
	} as unknown as Pick<WorldMapDefinition, 'backgroundImages' | 'blockers' | 'mapDecor' | 'fences'>;
}

describe('map background ownership', () => {
	it('renders fallback only when no alternative crop owns the visual', () => {
		const alternatives = {
			mode: 'fallback-only' as const,
			ownerCrops: [
				{ cropId: 'a', requiredBackgroundIds: ['a-base'] },
				{ cropId: 'b', requiredBackgroundIds: ['b-base'] }
			]
		};

		expect(shouldRenderOwnedVisual(alternatives, new Set())).toBe(true);
		expect(shouldRenderOwnedVisual(alternatives, new Set(['a-base']))).toBe(false);
		expect(shouldRenderOwnedVisual(alternatives, new Set(['b-base']))).toBe(false);
	});

	it('keeps the camera overlap owner suppressed when either complete crop is healthy', () => {
		const overlapOwner = {
			mode: 'fallback-only' as const,
			ownerCrops: [
				{
					cropId: 'painted-v2-sundrop-camera-base',
					requiredBackgroundIds: ['meadow-entry-painted-v2-sundrop-camera-base-image']
				},
				{
					cropId: 'painted-v2-crossroads-camera-base',
					requiredBackgroundIds: ['meadow-entry-painted-v2-crossroads-camera-base-image']
				}
			]
		};

		expect(
			shouldRenderOwnedVisual(
				overlapOwner,
				new Set(['meadow-entry-painted-v2-sundrop-camera-base-image'])
			)
		).toBe(false);
		expect(
			shouldRenderOwnedVisual(
				overlapOwner,
				new Set(['meadow-entry-painted-v2-crossroads-camera-base-image'])
			)
		).toBe(false);
		expect(shouldRenderOwnedVisual(overlapOwner, new Set())).toBe(true);
	});

	it('keeps a unique visual live when its only camera crop fails', () => {
		const uniqueOwner = {
			mode: 'fallback-only' as const,
			ownerCrops: [
				{
					cropId: 'painted-v2-crossroads-camera-base',
					requiredBackgroundIds: ['meadow-entry-painted-v2-crossroads-camera-base-image']
				}
			]
		};

		expect(
			shouldRenderOwnedVisual(
				uniqueOwner,
				new Set(['meadow-entry-painted-v2-sundrop-camera-base-image'])
			)
		).toBe(true);
		expect(
			shouldRenderOwnedVisual(
				uniqueOwner,
				new Set(['meadow-entry-painted-v2-crossroads-camera-base-image'])
			)
		).toBe(false);
	});

	it('keeps fallback visible until every plane in one crop succeeds', () => {
		const baseAndForeground = {
			mode: 'fallback-only' as const,
			ownerCrops: [{ cropId: 'a', requiredBackgroundIds: ['a-base', 'a-foreground'] }]
		};

		expect(shouldRenderOwnedVisual(baseAndForeground, new Set(['a-base']))).toBe(true);
		expect(shouldRenderOwnedVisual(baseAndForeground, new Set(['a-base', 'a-foreground']))).toBe(
			false
		);
	});

	it.each([
		['omitted metadata', undefined, [], true],
		['always', { mode: 'always' } as const, ['base'], true],
		[
			'base owner succeeds',
			{
				mode: 'fallback-only',
				ownerCrops: [{ cropId: 'test', requiredBackgroundIds: ['base'] }]
			} as const,
			['base'],
			false
		],
		[
			'base owner fails',
			{
				mode: 'fallback-only',
				ownerCrops: [{ cropId: 'test', requiredBackgroundIds: ['base'] }]
			} as const,
			[],
			true
		],
		[
			'one of two owners fails',
			{
				mode: 'fallback-only',
				ownerCrops: [{ cropId: 'test', requiredBackgroundIds: ['base', 'foreground'] }]
			} as const,
			['base'],
			true
		],
		[
			'both owners succeed',
			{
				mode: 'fallback-only',
				ownerCrops: [{ cropId: 'test', requiredBackgroundIds: ['base', 'foreground'] }]
			} as const,
			['base', 'foreground'],
			false
		]
	])('%s', (_name, visual, successfulIds, expected) => {
		const blocker = {
			id: 'blocker',
			x: 0,
			y: 0,
			width: 32,
			height: 32,
			kind: 'garden-hedge',
			...(visual ? { visual } : {})
		} satisfies MapBlocker;

		expect(shouldRenderOwnedVisual(blocker.visual, new Set(successfulIds))).toBe(expected);
	});

	it('derives deterministic renderer depth from a background plane and draw order', () => {
		expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 0 })).toBe(-9);
		expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 240 })).toBe(-8.976);
		expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 1000 })).toBe(-8.9);
		expect(getMapBackgroundDepth({ plane: 'foreground', drawOrder: 1000 })).toBe(100.1);
	});

	it('rejects duplicate background descriptor IDs', () => {
		expect(() => validateMapBackgroundOwnership(ownershipSource(['base', 'base']))).toThrow(
			'Duplicate background descriptor ID: base'
		);
	});

	it.each([
		['negative', -1],
		['non-integer', 0.5],
		['greater than 1000', 1001]
	])('rejects a %s background draw order', (_description, drawOrder) => {
		const background = ownershipSource(['background']).backgroundImages![0]!;

		expect(() =>
			validateMapBackgroundOwnership({
				backgroundImages: [{ ...background, drawOrder }],
				blockers: []
			})
		).toThrow(`Invalid background descriptor draw order for background: ${drawOrder}`);
	});

	it('rejects two backgrounds occupying the same plane and draw order', () => {
		const [first, second] = ownershipSource(['first', 'second']).backgroundImages!;

		expect(() =>
			validateMapBackgroundOwnership({
				backgroundImages: [
					{ ...first!, plane: 'base', drawOrder: 240 },
					{ ...second!, plane: 'base', drawOrder: 240 }
				],
				blockers: []
			})
		).toThrow('Duplicate background descriptor draw order for base plane: 240');
	});

	it.each([
		[
			'no owner crops',
			{ mode: 'fallback-only', ownerCrops: [] } as const,
			'Blocker garden-hedge has an empty fallback-only owner crop list'
		],
		[
			'duplicate crop IDs',
			{
				mode: 'fallback-only',
				ownerCrops: [
					{ cropId: 'sundrop', requiredBackgroundIds: ['base'] },
					{ cropId: 'sundrop', requiredBackgroundIds: ['base'] }
				]
			} as const,
			'Blocker garden-hedge has duplicate fallback-only owner crop ID: sundrop'
		],
		[
			'an owner crop with no required backgrounds',
			{
				mode: 'fallback-only',
				ownerCrops: [{ cropId: 'sundrop', requiredBackgroundIds: [] }]
			} as const,
			'Blocker garden-hedge has an empty fallback-only owner list for crop sundrop'
		],
		[
			'duplicate required backgrounds within a crop',
			{
				mode: 'fallback-only',
				ownerCrops: [{ cropId: 'sundrop', requiredBackgroundIds: ['base', 'base'] }]
			} as const,
			'Blocker garden-hedge has duplicate fallback-only owner ID in crop sundrop: base'
		],
		[
			'a missing required background',
			{
				mode: 'fallback-only',
				ownerCrops: [{ cropId: 'sundrop', requiredBackgroundIds: ['missing'] }]
			} as const,
			'Blocker garden-hedge references missing fallback-only owner ID in crop sundrop: missing'
		]
	])('rejects a fallback-only visual with %s', (_description, visual, message) => {
		expect(() => validateMapBackgroundOwnership(visualOwnershipSource(visual))).toThrow(message);
	});

	it.each([
		['decor', 'decor', 'Map decor garden-hedge'],
		['fence', 'fence', 'Fence garden-hedge']
	] as const)(
		'validates fallback-only ownership on every %s source',
		(_label, visualSource, sourceName) => {
			const visual = {
				mode: 'fallback-only' as const,
				ownerCrops: [{ cropId: 'sundrop', requiredBackgroundIds: ['missing'] }]
			};

			expect(() =>
				validateMapBackgroundOwnership(visualOwnershipSource(visual, visualSource))
			).toThrow(`${sourceName} references missing fallback-only owner ID in crop sundrop: missing`);
		}
	);

	it('rejects duplicate visual ownership assignment IDs', () => {
		const items = [{ id: 'owned', label: 'Hedge' }];
		const assignment = {
			sourceId: 'owned',
			visual: { mode: 'always' as const }
		};

		expect(() => applyVisualOwnership(items, [assignment, { ...assignment }])).toThrow(
			'Duplicate visual ownership assignment source ID: owned'
		);
	});

	it('rejects a visual ownership assignment whose source ID is absent', () => {
		const items = [{ id: 'owned', label: 'Hedge' }];
		const assignments = [
			{
				sourceId: 'missing',
				visual: { mode: 'always' as const }
			}
		];

		expect(() => applyVisualOwnership(items, assignments)).toThrow(
			'Visual ownership assignment references missing item ID: missing'
		);
	});

	it('rejects an assignment that would overwrite an existing visual when requested', () => {
		const items = [{ id: 'owned', label: 'Hedge', visual: { mode: 'always' as const } }];
		const assignments = [
			{
				sourceId: 'owned',
				visual: {
					mode: 'fallback-only' as const,
					ownerCrops: [{ cropId: 'sundrop', requiredBackgroundIds: ['base'] }]
				}
			}
		];

		expect(() => applyVisualOwnership(items, assignments, { rejectExisting: true })).toThrow(
			'Visual ownership assignment would overwrite existing visual: owned'
		);
	});

	it('clones assigned records and preserves unassigned records', () => {
		const items = [
			{ id: 'owned', label: 'Hedge' },
			{ id: 'unowned', label: 'Tree' }
		];
		const visual = {
			mode: 'fallback-only' as const,
			ownerCrops: [{ cropId: 'sundrop', requiredBackgroundIds: ['base'] }]
		};
		const applied = applyVisualOwnership(items, [{ sourceId: 'owned', visual }]);

		expect(applied).toEqual([
			{ id: 'owned', label: 'Hedge', visual },
			{ id: 'unowned', label: 'Tree' }
		]);
		expect(applied![0]).not.toBe(items[0]);
		expect(applied![1]).toBe(items[1]);
	});

	it('does not mutate source arrays or records while applying ownership', () => {
		const items = [{ id: 'owned', label: 'Hedge' }];
		const assignments = [
			{
				sourceId: 'owned',
				visual: {
					mode: 'fallback-only' as const,
					ownerCrops: [{ cropId: 'sundrop', requiredBackgroundIds: ['base'] }]
				}
			}
		];

		const applied = applyVisualOwnership(items, assignments);

		expect(items).toEqual([{ id: 'owned', label: 'Hedge' }]);
		expect(assignments).toEqual([
			{
				sourceId: 'owned',
				visual: {
					mode: 'fallback-only',
					ownerCrops: [{ cropId: 'sundrop', requiredBackgroundIds: ['base'] }]
				}
			}
		]);
		expect(applied).toEqual([
			{
				id: 'owned',
				label: 'Hedge',
				visual: {
					mode: 'fallback-only',
					ownerCrops: [{ cropId: 'sundrop', requiredBackgroundIds: ['base'] }]
				}
			}
		]);
	});
});

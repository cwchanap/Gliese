import { describe, expect, it } from 'vitest';

import type { PixelBounds } from './meadow-entry-authoring-types';
import {
	MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS,
	type MeadowEntryPaintedV2SourcePanel
} from './meadow-entry-painted-v2-pilot';
import {
	MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS,
	MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS,
	validateMeadowEntryPaintedV2SceneryContract,
	type MeadowEntryPaintedV2SceneryBlocker,
	type MeadowEntryPaintedV2SceneryInsert
} from './meadow-entry-painted-v2-scenery';
import {
	collectMeadowEntrySourceCatalog,
	type MeadowEntrySourceRecord
} from './meadow-entry-source-catalog';

function bounds(left: number, top: number, right: number, bottom: number): PixelBounds {
	return { left, top, right, bottom };
}

const EXPECTED_BLOCKERS: readonly MeadowEntryPaintedV2SceneryBlocker[] = [
	{
		sourceId: 'coast-crossroads-mouth-bank',
		bounds: bounds(3168, 4900, 3232, 5300),
		language: 'hedge',
		sceneryClass: 'hedge'
	},
	{
		sourceId: 'mistfen-entry-bank-east',
		bounds: bounds(3068, 2600, 3132, 3100),
		language: 'hedge',
		sceneryClass: 'hedge'
	},
	{
		sourceId: 'silverpine-wall-A-east',
		bounds: bounds(3628, 2700, 3692, 3000),
		language: 'tree-wall',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'silverpine-wall-A-west',
		bounds: bounds(3308, 2700, 3372, 3000),
		language: 'tree-wall',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'silverpine-wall-B-north',
		bounds: bounds(3148, 2558, 3532, 2622),
		language: 'tree-wall',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'silverpine-wall-B-south',
		bounds: bounds(3148, 2878, 3532, 2942),
		language: 'tree-wall',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'silverpine-wall-C-east',
		bounds: bounds(3308, 2540, 3372, 2780),
		language: 'tree-wall',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'silverpine-wall-C-west',
		bounds: bounds(2988, 2540, 3052, 2780),
		language: 'tree-wall',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'wildwood-forest-lane-west-bank',
		bounds: bounds(4968, 3200, 5032, 5300),
		language: 'forest-bank',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'wildwood-north-climb-west-bank',
		bounds: bounds(5368, 1950, 5432, 3050),
		language: 'forest-bank',
		sceneryClass: 'woodland'
	}
];

const EXPECTED_INSERTS: readonly MeadowEntryPaintedV2SceneryInsert[] = [
	{
		id: 'camera-underlay-sundrop-south-blocked-hedge',
		sceneryClass: 'hedge',
		bounds: bounds(0, 4736, 3200, 6400),
		owningSourceId: 'camera-underlay-sundrop-south',
		owningSourcePriority: 1,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-sundrop-south.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.json'
	},
	{
		id: 'camera-underlay-crossroads-north-blocked-hedge',
		sceneryClass: 'hedge',
		bounds: bounds(2368, 2240, 5568, 3904),
		owningSourceId: 'camera-underlay-crossroads-north',
		owningSourcePriority: 2,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-north.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.json'
	},
	{
		id: 'camera-underlay-crossroads-south-blocked-hedge',
		sceneryClass: 'hedge',
		bounds: bounds(2368, 3776, 5568, 5440),
		owningSourceId: 'camera-underlay-crossroads-south',
		owningSourcePriority: 3,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-south.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.json'
	},
	{
		id: 'camera-underlay-crossroads-north-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(2368, 2240, 5568, 3904),
		owningSourceId: 'camera-underlay-crossroads-north',
		owningSourcePriority: 2,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-north.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.json'
	},
	{
		id: 'camera-underlay-crossroads-south-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(2368, 3776, 5568, 5440),
		owningSourceId: 'camera-underlay-crossroads-south',
		owningSourcePriority: 3,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-south.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.json'
	},
	{
		id: 'crossroads-blocked-hedge',
		sceneryClass: 'hedge',
		bounds: bounds(2880, 2816, 4608, 4768),
		owningSourceId: 'crossroads',
		owningSourcePriority: 50,
		rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/crossroads.png',
		normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.png',
		provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.json'
	},
	{
		id: 'crossroads-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(2880, 2816, 4608, 4768),
		owningSourceId: 'crossroads',
		owningSourcePriority: 50,
		rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/crossroads.png',
		normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.png',
		provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.json'
	}
];

const EXPECTED_INTERSECTIONS = [
	{
		blockerId: 'coast-crossroads-mouth-bank',
		owningSourceId: 'camera-underlay-sundrop-south',
		insertId: 'camera-underlay-sundrop-south-blocked-hedge',
		sceneryClass: 'hedge',
		bounds: bounds(3168, 4900, 3200, 5300)
	},
	{
		blockerId: 'mistfen-entry-bank-east',
		owningSourceId: 'camera-underlay-crossroads-north',
		insertId: 'camera-underlay-crossroads-north-blocked-hedge',
		sceneryClass: 'hedge',
		bounds: bounds(3068, 2600, 3132, 3100)
	},
	{
		blockerId: 'coast-crossroads-mouth-bank',
		owningSourceId: 'camera-underlay-crossroads-south',
		insertId: 'camera-underlay-crossroads-south-blocked-hedge',
		sceneryClass: 'hedge',
		bounds: bounds(3168, 4900, 3232, 5300)
	},
	{
		blockerId: 'silverpine-wall-A-east',
		owningSourceId: 'camera-underlay-crossroads-north',
		insertId: 'camera-underlay-crossroads-north-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(3628, 2700, 3692, 3000)
	},
	{
		blockerId: 'silverpine-wall-A-west',
		owningSourceId: 'camera-underlay-crossroads-north',
		insertId: 'camera-underlay-crossroads-north-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(3308, 2700, 3372, 3000)
	},
	{
		blockerId: 'silverpine-wall-B-north',
		owningSourceId: 'camera-underlay-crossroads-north',
		insertId: 'camera-underlay-crossroads-north-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(3148, 2558, 3532, 2622)
	},
	{
		blockerId: 'silverpine-wall-B-south',
		owningSourceId: 'camera-underlay-crossroads-north',
		insertId: 'camera-underlay-crossroads-north-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(3148, 2878, 3532, 2942)
	},
	{
		blockerId: 'silverpine-wall-C-east',
		owningSourceId: 'camera-underlay-crossroads-north',
		insertId: 'camera-underlay-crossroads-north-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(3308, 2540, 3372, 2780)
	},
	{
		blockerId: 'silverpine-wall-C-west',
		owningSourceId: 'camera-underlay-crossroads-north',
		insertId: 'camera-underlay-crossroads-north-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(2988, 2540, 3052, 2780)
	},
	{
		blockerId: 'wildwood-forest-lane-west-bank',
		owningSourceId: 'camera-underlay-crossroads-north',
		insertId: 'camera-underlay-crossroads-north-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(4968, 3200, 5032, 3904)
	},
	{
		blockerId: 'wildwood-north-climb-west-bank',
		owningSourceId: 'camera-underlay-crossroads-north',
		insertId: 'camera-underlay-crossroads-north-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(5368, 2240, 5432, 3050)
	},
	{
		blockerId: 'wildwood-forest-lane-west-bank',
		owningSourceId: 'camera-underlay-crossroads-south',
		insertId: 'camera-underlay-crossroads-south-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(4968, 3776, 5032, 5300)
	},
	{
		blockerId: 'mistfen-entry-bank-east',
		owningSourceId: 'crossroads',
		insertId: 'crossroads-blocked-hedge',
		sceneryClass: 'hedge',
		bounds: bounds(3068, 2816, 3132, 3100)
	},
	{
		blockerId: 'silverpine-wall-A-east',
		owningSourceId: 'crossroads',
		insertId: 'crossroads-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(3628, 2816, 3692, 3000)
	},
	{
		blockerId: 'silverpine-wall-A-west',
		owningSourceId: 'crossroads',
		insertId: 'crossroads-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(3308, 2816, 3372, 3000)
	},
	{
		blockerId: 'silverpine-wall-B-south',
		owningSourceId: 'crossroads',
		insertId: 'crossroads-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: bounds(3148, 2878, 3532, 2942)
	}
] as const;

function clonePanels(): MeadowEntryPaintedV2SourcePanel[] {
	return MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.map((panel) => ({
		...panel,
		bounds: { ...panel.bounds },
		expectedDimensions: { ...panel.expectedDimensions }
	}));
}

function cloneCatalog(): MeadowEntrySourceRecord[] {
	return collectMeadowEntrySourceCatalog().map((record) => ({
		...record,
		ref: { ...record.ref },
		bounds: record.bounds === null ? null : { ...record.bounds }
	}));
}

describe('painted-v2 blocked-scenery source contract', () => {
	it('keeps the sealed inventory independent of the preassembly bake', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS).toHaveLength(10);
		expect(MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS).toHaveLength(7);
		expect(validateMeadowEntryPaintedV2SceneryContract()).toHaveLength(16);
	});

	it('freezes the exact ten blocker rows and maps language to class', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS).toEqual(EXPECTED_BLOCKERS);
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS)).toBe(true);
		for (const blocker of MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS) {
			expect(Object.isFrozen(blocker)).toBe(true);
			expect(Object.isFrozen(blocker.bounds)).toBe(true);
		}
	});

	it('freezes the exact seven insert rows and their owning source paths', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS).toEqual(EXPECTED_INSERTS);
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS)).toBe(true);
		for (const insert of MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS) {
			expect(Object.isFrozen(insert)).toBe(true);
			expect(Object.isFrozen(insert.bounds)).toBe(true);
		}
	});

	it('derives the exact sixteen intersections in insert-then-blocker order', () => {
		const intersections = validateMeadowEntryPaintedV2SceneryContract();
		expect(intersections).toEqual(EXPECTED_INTERSECTIONS);
		expect(intersections).toHaveLength(16);
		expect(Object.isFrozen(intersections)).toBe(true);
		for (const intersection of intersections) {
			expect(Object.isFrozen(intersection)).toBe(true);
			expect(Object.isFrozen(intersection.bounds)).toBe(true);
		}
	});

	it('rejects missing, extra, reordered, duplicate, or renamed blocker and insert rows', () => {
		expect(() =>
			validateMeadowEntryPaintedV2SceneryContract(MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.slice(1))
		).toThrow(/blocker|table|contract/i);
		expect(() =>
			validateMeadowEntryPaintedV2SceneryContract([
				...MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS,
				MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS[0]!
			])
		).toThrow(/blocker|duplicate|table|contract/i);
		expect(() =>
			validateMeadowEntryPaintedV2SceneryContract([
				MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS[1]!,
				MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS[0]!,
				...MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.slice(2)
			])
		).toThrow(/blocker|order|table|contract/i);
		expect(() =>
			validateMeadowEntryPaintedV2SceneryContract(
				MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.map((blocker, index) =>
					index === 0 ? { ...blocker, sourceId: 'renamed-blocker' } : blocker
				)
			)
		).toThrow(/blocker|catalog|contract/i);

		expect(() =>
			validateMeadowEntryPaintedV2SceneryContract(
				undefined,
				MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.slice(1)
			)
		).toThrow(/insert|table|contract/i);
		expect(() =>
			validateMeadowEntryPaintedV2SceneryContract(undefined, [
				...MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS,
				MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS[0]!
			])
		).toThrow(/insert|duplicate|table|contract/i);
		expect(() =>
			validateMeadowEntryPaintedV2SceneryContract(undefined, [
				MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS[1]!,
				MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS[0]!,
				...MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.slice(2)
			])
		).toThrow(/insert|order|table|contract/i);
		expect(() =>
			validateMeadowEntryPaintedV2SceneryContract(
				undefined,
				MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.map((insert, index) =>
					index === 0 ? { ...insert, id: 'renamed-insert' } : insert
				)
			)
		).toThrow(/insert|contract/i);
	});

	it('rejects a selected source that is not a catalog blocker or has a one-pixel bounds drift', () => {
		const nonBlocker = MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.map((blocker, index) =>
			index === 0 ? { ...blocker, sourceId: 'crossroads-banner' } : blocker
		);
		expect(() => validateMeadowEntryPaintedV2SceneryContract(nonBlocker)).toThrow(
			/catalog|blocker|source/i
		);

		const catalog = cloneCatalog();
		const selected = catalog.find(
			(record) =>
				record.ref.sourceType === 'blocker' &&
				record.ref.sourceId === EXPECTED_BLOCKERS[0]!.sourceId
		);
		expect(selected).toBeDefined();
		if (selected?.bounds === null || selected === undefined)
			throw new Error('test fixture missing bounds');
		selected.bounds = { ...selected.bounds, right: selected.bounds.right + 1 };
		expect(() =>
			validateMeadowEntryPaintedV2SceneryContract(undefined, undefined, undefined, catalog)
		).toThrow(/bounds|catalog|blocker/i);
	});

	it('rejects insert bounds or priority drift from the owning source panel', () => {
		const changedBounds = MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.map((insert, index) =>
			index === 0
				? { ...insert, bounds: { ...insert.bounds, right: insert.bounds.right - 1 } }
				: insert
		);
		expect(() => validateMeadowEntryPaintedV2SceneryContract(undefined, changedBounds)).toThrow(
			/bounds|owner|insert|contract/i
		);

		const changedPriority = MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.map((insert, index) =>
			index === 0 ? { ...insert, owningSourcePriority: insert.owningSourcePriority + 1 } : insert
		);
		expect(() => validateMeadowEntryPaintedV2SceneryContract(undefined, changedPriority)).toThrow(
			/priority|owner|insert|contract/i
		);
	});

	it('rejects missing, extra, cross-class, or duplicate source/class coverage rows', () => {
		const missingCoverage = MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.filter(
			(insert) => insert.id !== 'crossroads-blocked-woodland'
		);
		expect(() => validateMeadowEntryPaintedV2SceneryContract(undefined, missingCoverage)).toThrow(
			/insert|coverage|table|contract/i
		);

		const extraCoverage = [
			...MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS,
			{
				...MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS[0]!,
				id: 'camera-underlay-sundrop-south-blocked-woodland',
				sceneryClass: 'woodland' as const
			}
		];
		expect(() => validateMeadowEntryPaintedV2SceneryContract(undefined, extraCoverage)).toThrow(
			/insert|coverage|table|contract/i
		);

		const crossClass = MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.map((insert, index) =>
			index === 0 ? { ...insert, sceneryClass: 'woodland' as const } : insert
		);
		expect(() => validateMeadowEntryPaintedV2SceneryContract(undefined, crossClass)).toThrow(
			/class|coverage|insert|contract/i
		);
	});

	it('rejects an insert for any non-approved detail or connector source', () => {
		for (const forbiddenSourceId of [
			'camera-underlay-sundrop-north',
			'sundrop-north',
			'sundrop-south',
			'hero-house-frontage',
			'village-crossroads-connector'
		]) {
			const changed = MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.map((insert, index) =>
				index === 0 ? { ...insert, owningSourceId: forbiddenSourceId } : insert
			);
			expect(() => validateMeadowEntryPaintedV2SceneryContract(undefined, changed)).toThrow(
				/insert|owner|source|contract/i
			);
		}
	});

	it('rejects any mutation of the nine-panel source registry', () => {
		const missing = clonePanels().slice(1);
		expect(() =>
			validateMeadowEntryPaintedV2SceneryContract(undefined, undefined, missing)
		).toThrow(/panel|registry|source|contract/i);

		const reordered = clonePanels();
		[reordered[0], reordered[1]] = [reordered[1]!, reordered[0]!];
		expect(() =>
			validateMeadowEntryPaintedV2SceneryContract(undefined, undefined, reordered)
		).toThrow(/panel|order|registry|contract/i);

		const duplicate = [...clonePanels(), clonePanels()[0]!];
		expect(() =>
			validateMeadowEntryPaintedV2SceneryContract(undefined, undefined, duplicate)
		).toThrow(/panel|duplicate|registry|contract/i);

		const changed = clonePanels();
		changed[0] = {
			...changed[0]!,
			bounds: { ...changed[0]!.bounds, left: changed[0]!.bounds.left + 1 }
		};
		expect(() =>
			validateMeadowEntryPaintedV2SceneryContract(undefined, undefined, changed)
		).toThrow(/panel|bounds|registry|contract/i);
	});
});

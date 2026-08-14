import type { PixelBounds } from './meadow-entry-authoring-types';

export interface MeadowEntryPaintedV2SourcePanel {
	readonly id: string;
	readonly role: 'underlay' | 'detail';
	readonly bounds: PixelBounds;
	readonly expectedDimensions: { readonly width: number; readonly height: number };
	readonly assemblyPriority: number;
	readonly rawPath: string;
	readonly normalizedPath: string;
	readonly provenancePath: string;
}

export type MeadowEntryPaintedV2BlendAxis = 'x' | 'y';

export interface MeadowEntryPaintedV2DetailPair {
	readonly firstId: string;
	readonly secondId: string;
	readonly bounds: PixelBounds;
	readonly axis: MeadowEntryPaintedV2BlendAxis;
}

export interface MeadowEntryPaintedV2DetailPairFormulas {
	readonly axisPair: string;
	readonly correctionLastInsetIndex: string;
	readonly correctionEdgeDistance: string;
	readonly correctionWeight: string;
	readonly out: string;
}

export const MEADOW_ENTRY_PAINTED_V2_PILOT_MASTER_PATH =
	'artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png';

export const MEADOW_ENTRY_PAINTED_V2_RUNTIME_ROOT =
	'public/game/assets/regions/meadow-entry-painted-v2';

function freezeBounds(bounds: PixelBounds): PixelBounds {
	return Object.freeze({ ...bounds });
}

function freezePanel(panel: MeadowEntryPaintedV2SourcePanel): MeadowEntryPaintedV2SourcePanel {
	return Object.freeze({
		...panel,
		bounds: freezeBounds(panel.bounds),
		expectedDimensions: Object.freeze({ ...panel.expectedDimensions })
	});
}

function freezeDetailPair(pair: MeadowEntryPaintedV2DetailPair): MeadowEntryPaintedV2DetailPair {
	return Object.freeze({ ...pair, bounds: freezeBounds(pair.bounds) });
}

const RAW_DETAIL_PAIRS = [
	{
		firstId: 'sundrop-north',
		secondId: 'sundrop-south',
		bounds: { left: 256, top: 4928, right: 2880, bottom: 5056 },
		axis: 'y'
	},
	{
		firstId: 'village-crossroads-connector',
		secondId: 'crossroads',
		bounds: { left: 2880, top: 4480, right: 3392, bottom: 4768 },
		axis: 'x'
	}
] as const satisfies readonly MeadowEntryPaintedV2DetailPair[];

export const MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS: readonly MeadowEntryPaintedV2DetailPair[] =
	Object.freeze(RAW_DETAIL_PAIRS.map(freezeDetailPair));

export const MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS: MeadowEntryPaintedV2DetailPairFormulas =
	Object.freeze({
		axisPair: 'floor((first*(lastIndex-index)+second*index+floor(lastIndex/2))/lastIndex)',
		correctionLastInsetIndex: 'min(127,floor((min(intersectionWidth,intersectionHeight)-1)/2))',
		correctionEdgeDistance: 'min(x-left,right-1-x,y-top,bottom-1-y)',
		correctionWeight:
			'meadowEntryDetailFeatherWeight(correctionEdgeDistance,correctionLastInsetIndex)',
		out: 'blendMeadowEntryDetailChannel(ordinaryComposite,axisPair,correctionWeight)'
	});

interface MeadowEntryPaintedV2DetailPairPanel {
	readonly id: string;
	readonly bounds: PixelBounds;
	readonly role?: 'underlay' | 'detail';
}

function validBounds(bounds: PixelBounds): boolean {
	return (
		Number.isInteger(bounds.left) &&
		Number.isInteger(bounds.top) &&
		Number.isInteger(bounds.right) &&
		Number.isInteger(bounds.bottom) &&
		bounds.right > bounds.left &&
		bounds.bottom > bounds.top
	);
}

function sameBounds(first: PixelBounds, second: PixelBounds): boolean {
	return (
		first.left === second.left &&
		first.top === second.top &&
		first.right === second.right &&
		first.bottom === second.bottom
	);
}

function intersection(first: PixelBounds, second: PixelBounds): PixelBounds | null {
	const result = {
		left: Math.max(first.left, second.left),
		top: Math.max(first.top, second.top),
		right: Math.min(first.right, second.right),
		bottom: Math.min(first.bottom, second.bottom)
	};
	return validBounds(result) ? result : null;
}

function samePair(
	first: MeadowEntryPaintedV2DetailPair,
	second: MeadowEntryPaintedV2DetailPair
): boolean {
	return (
		first.firstId === second.firstId &&
		first.secondId === second.secondId &&
		first.axis === second.axis &&
		sameBounds(first.bounds, second.bounds)
	);
}

export function validateMeadowEntryPaintedV2DetailPairContract(
	panels: readonly MeadowEntryPaintedV2DetailPairPanel[],
	pairs: readonly MeadowEntryPaintedV2DetailPair[],
	formulas: MeadowEntryPaintedV2DetailPairFormulas
): void {
	const panelById = new Map<string, MeadowEntryPaintedV2DetailPairPanel>();
	for (const panel of panels) {
		if (panelById.has(panel.id)) {
			throw new Error(`Duplicate Meadow Entry detail pair panel id: ${panel.id}`);
		}
		if (!validBounds(panel.bounds)) {
			throw new Error(`Meadow Entry detail pair panel ${panel.id} bounds are invalid`);
		}
		if (panel.role !== undefined && panel.role !== 'detail') {
			throw new Error(`Meadow Entry detail pair panel ${panel.id} is not a detail panel`);
		}
		panelById.set(panel.id, panel);
	}

	const expectedFormulaKeys = Object.keys(MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS).sort();
	const actualFormulaKeys = Object.keys(formulas ?? {}).sort();
	if (JSON.stringify(actualFormulaKeys) !== JSON.stringify(expectedFormulaKeys)) {
		throw new Error('Meadow Entry detail pair formulas do not match the sealed contract');
	}
	for (const key of expectedFormulaKeys as (keyof MeadowEntryPaintedV2DetailPairFormulas)[]) {
		if (formulas[key] !== MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS[key]) {
			throw new Error(`Meadow Entry detail pair formula is stale: ${key}`);
		}
	}

	const firstOwners = new Set<string>();
	const secondOwners = new Set<string>();
	for (const pair of pairs) {
		if (pair.firstId === pair.secondId) {
			throw new Error(`Meadow Entry detail pair has identical first/second id: ${pair.firstId}`);
		}
		if (firstOwners.has(pair.firstId)) {
			throw new Error(`Duplicate Meadow Entry detail pair first member: ${pair.firstId}`);
		}
		if (secondOwners.has(pair.secondId)) {
			throw new Error(
				`Overlapping Meadow Entry detail pair ownership for second member: ${pair.secondId}`
			);
		}
		const first = panelById.get(pair.firstId);
		const second = panelById.get(pair.secondId);
		if (first === undefined || second === undefined) {
			throw new Error(
				`Meadow Entry detail pair references missing panel: ${pair.firstId}->${pair.secondId}`
			);
		}
		if (pair.axis !== 'x' && pair.axis !== 'y') {
			throw new Error(`Meadow Entry detail pair axis is invalid: ${pair.axis}`);
		}
		if (!validBounds(pair.bounds)) {
			throw new Error('Meadow Entry detail pair bounds are invalid or zero-length');
		}
		const overlap = intersection(first.bounds, second.bounds);
		if (overlap === null) {
			throw new Error(
				`Meadow Entry detail pair has no intersection: ${pair.firstId}->${pair.secondId}`
			);
		}
		if (!sameBounds(pair.bounds, overlap)) {
			throw new Error(
				`Meadow Entry detail pair bounds do not match the panel intersection: ${pair.firstId}->${pair.secondId}`
			);
		}
		const axisLength =
			pair.axis === 'x'
				? pair.bounds.right - pair.bounds.left
				: pair.bounds.bottom - pair.bounds.top;
		if (axisLength <= 1) {
			throw new Error(
				`Meadow Entry detail pair axis has zero length: ${pair.firstId}->${pair.secondId}`
			);
		}
		firstOwners.add(pair.firstId);
		secondOwners.add(pair.secondId);
	}

	const canonicalDetails = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.filter(
		({ role }) => role === 'detail'
	);
	const canonicalPanelSet =
		panels.length === canonicalDetails.length &&
		canonicalDetails.every((canonical) => {
			const panel = panelById.get(canonical.id);
			return (
				panel !== undefined && panel.role === 'detail' && sameBounds(panel.bounds, canonical.bounds)
			);
		});
	if (
		canonicalPanelSet &&
		(pairs.length !== MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS.length ||
			pairs.some((pair, index) => !samePair(pair, MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS[index]!)))
	) {
		throw new Error('Meadow Entry detail pair table does not match the sealed contract');
	}
}

const RAW_SOURCE_PANELS = [
	{
		id: 'sundrop-north',
		role: 'detail',
		bounds: { left: 256, top: 3968, right: 2880, bottom: 5056 },
		expectedDimensions: { width: 2624, height: 1088 },
		assemblyPriority: 10,
		rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/sundrop-north.png',
		normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-north.png',
		provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-north.json'
	},
	{
		id: 'sundrop-south',
		role: 'detail',
		bounds: { left: 256, top: 4928, right: 2880, bottom: 6144 },
		expectedDimensions: { width: 2624, height: 1216 },
		assemblyPriority: 20,
		rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/sundrop-south.png',
		normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-south.png',
		provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-south.json'
	},
	{
		id: 'hero-house-frontage',
		role: 'detail',
		bounds: { left: 384, top: 5312, right: 1280, bottom: 6144 },
		expectedDimensions: { width: 896, height: 832 },
		assemblyPriority: 30,
		rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/hero-house-frontage.png',
		normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/hero-house-frontage.png',
		provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/hero-house-frontage.json'
	},
	{
		id: 'village-crossroads-connector',
		role: 'detail',
		bounds: { left: 2592, top: 4480, right: 3392, bottom: 4896 },
		expectedDimensions: { width: 800, height: 416 },
		assemblyPriority: 40,
		rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/village-crossroads-connector.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.json'
	},
	{
		id: 'crossroads',
		role: 'detail',
		bounds: { left: 2880, top: 2816, right: 4608, bottom: 4768 },
		expectedDimensions: { width: 1728, height: 1952 },
		assemblyPriority: 50,
		rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/crossroads.png',
		normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.png',
		provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.json'
	},
	{
		id: 'camera-underlay-sundrop-north',
		role: 'underlay',
		bounds: { left: 0, top: 3200, right: 3200, bottom: 4864 },
		expectedDimensions: { width: 3200, height: 1664 },
		assemblyPriority: 0,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-sundrop-north.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-north.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-north.json'
	},
	{
		id: 'camera-underlay-sundrop-south',
		role: 'underlay',
		bounds: { left: 0, top: 4736, right: 3200, bottom: 6400 },
		expectedDimensions: { width: 3200, height: 1664 },
		assemblyPriority: 1,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-sundrop-south.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.json'
	},
	{
		id: 'camera-underlay-crossroads-north',
		role: 'underlay',
		bounds: { left: 2368, top: 2240, right: 5568, bottom: 3904 },
		expectedDimensions: { width: 3200, height: 1664 },
		assemblyPriority: 2,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-north.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.json'
	},
	{
		id: 'camera-underlay-crossroads-south',
		role: 'underlay',
		bounds: { left: 2368, top: 3776, right: 5568, bottom: 5440 },
		expectedDimensions: { width: 3200, height: 1664 },
		assemblyPriority: 3,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-south.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.json'
	}
] as const satisfies readonly MeadowEntryPaintedV2SourcePanel[];

export const MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS: readonly MeadowEntryPaintedV2SourcePanel[] =
	Object.freeze(RAW_SOURCE_PANELS.map(freezePanel));

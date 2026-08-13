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

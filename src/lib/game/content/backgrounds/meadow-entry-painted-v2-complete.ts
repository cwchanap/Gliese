import type { PixelBounds } from './meadow-entry-authoring-types';

export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH = 6400;
export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT = 6400;
export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_PANEL_WIDTH = 2432;
export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_PANEL_HEIGHT = 1792;
export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_HORIZONTAL_OVERLAP_PX = 448;
export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_VERTICAL_OVERLAP_PX = 256;

export type MeadowEntryPaintedV2CompletePanelId =
	| 'north-west'
	| 'north-center'
	| 'north-east'
	| 'north-mid-west'
	| 'north-mid-center'
	| 'north-mid-east'
	| 'south-mid-west'
	| 'south-mid-center'
	| 'south-mid-east'
	| 'south-west'
	| 'south-center'
	| 'south-east';

export interface MeadowEntryPaintedV2CompleteSourcePanel {
	readonly id: MeadowEntryPaintedV2CompletePanelId;
	readonly bounds: PixelBounds;
	readonly expectedDimensions: { readonly width: number; readonly height: number };
	readonly assemblyPriority: number;
	readonly rawPath: string;
	readonly normalizedPath: string;
	readonly provenancePath: string;
}

function freezeBounds(bounds: PixelBounds): PixelBounds {
	return Object.freeze({ ...bounds });
}

function freezePanel(
	panel: MeadowEntryPaintedV2CompleteSourcePanel
): MeadowEntryPaintedV2CompleteSourcePanel {
	return Object.freeze({
		...panel,
		bounds: freezeBounds(panel.bounds),
		expectedDimensions: Object.freeze({ ...panel.expectedDimensions })
	});
}

const RAW_SOURCE_PANELS = [
	{
		id: 'north-west',
		bounds: { left: 0, top: 0, right: 2432, bottom: 1792 },
		expectedDimensions: { width: 2432, height: 1792 },
		assemblyPriority: 0,
		rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/north-west.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/north-west.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/north-west.json'
	},
	{
		id: 'north-center',
		bounds: { left: 1984, top: 0, right: 4416, bottom: 1792 },
		expectedDimensions: { width: 2432, height: 1792 },
		assemblyPriority: 1,
		rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/north-center.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/north-center.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/north-center.json'
	},
	{
		id: 'north-east',
		bounds: { left: 3968, top: 0, right: 6400, bottom: 1792 },
		expectedDimensions: { width: 2432, height: 1792 },
		assemblyPriority: 2,
		rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/north-east.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/north-east.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/north-east.json'
	},
	{
		id: 'north-mid-west',
		bounds: { left: 0, top: 1536, right: 2432, bottom: 3328 },
		expectedDimensions: { width: 2432, height: 1792 },
		assemblyPriority: 3,
		rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/north-mid-west.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/north-mid-west.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/north-mid-west.json'
	},
	{
		id: 'north-mid-center',
		bounds: { left: 1984, top: 1536, right: 4416, bottom: 3328 },
		expectedDimensions: { width: 2432, height: 1792 },
		assemblyPriority: 4,
		rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/north-mid-center.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/north-mid-center.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/north-mid-center.json'
	},
	{
		id: 'north-mid-east',
		bounds: { left: 3968, top: 1536, right: 6400, bottom: 3328 },
		expectedDimensions: { width: 2432, height: 1792 },
		assemblyPriority: 5,
		rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/north-mid-east.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/north-mid-east.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/north-mid-east.json'
	},
	{
		id: 'south-mid-west',
		bounds: { left: 0, top: 3072, right: 2432, bottom: 4864 },
		expectedDimensions: { width: 2432, height: 1792 },
		assemblyPriority: 6,
		rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/south-mid-west.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/south-mid-west.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/south-mid-west.json'
	},
	{
		id: 'south-mid-center',
		bounds: { left: 1984, top: 3072, right: 4416, bottom: 4864 },
		expectedDimensions: { width: 2432, height: 1792 },
		assemblyPriority: 7,
		rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/south-mid-center.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/south-mid-center.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/south-mid-center.json'
	},
	{
		id: 'south-mid-east',
		bounds: { left: 3968, top: 3072, right: 6400, bottom: 4864 },
		expectedDimensions: { width: 2432, height: 1792 },
		assemblyPriority: 8,
		rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/south-mid-east.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/south-mid-east.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/south-mid-east.json'
	},
	{
		id: 'south-west',
		bounds: { left: 0, top: 4608, right: 2432, bottom: 6400 },
		expectedDimensions: { width: 2432, height: 1792 },
		assemblyPriority: 9,
		rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/south-west.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/south-west.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/south-west.json'
	},
	{
		id: 'south-center',
		bounds: { left: 1984, top: 4608, right: 4416, bottom: 6400 },
		expectedDimensions: { width: 2432, height: 1792 },
		assemblyPriority: 10,
		rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/south-center.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/south-center.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/south-center.json'
	},
	{
		id: 'south-east',
		bounds: { left: 3968, top: 4608, right: 6400, bottom: 6400 },
		expectedDimensions: { width: 2432, height: 1792 },
		assemblyPriority: 11,
		rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/south-east.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/south-east.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/south-east.json'
	}
] as const satisfies readonly MeadowEntryPaintedV2CompleteSourcePanel[];

export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS: readonly MeadowEntryPaintedV2CompleteSourcePanel[] =
	Object.freeze(RAW_SOURCE_PANELS.map(freezePanel));

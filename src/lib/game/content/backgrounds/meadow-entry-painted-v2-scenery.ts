import type { PixelBounds } from './meadow-entry-authoring-types';
import {
	MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS,
	type MeadowEntryPaintedV2SourcePanel
} from './meadow-entry-painted-v2-pilot';
import {
	collectMeadowEntrySourceCatalog,
	type MeadowEntrySourceRecord
} from './meadow-entry-source-catalog';

export type MeadowEntryPaintedV2SceneryClass = 'hedge' | 'woodland';
export type MeadowEntryPaintedV2SceneryLanguage = 'hedge' | 'tree-wall' | 'forest-bank';

export interface MeadowEntryPaintedV2SceneryBlocker {
	readonly sourceId: string;
	readonly bounds: PixelBounds;
	readonly language: MeadowEntryPaintedV2SceneryLanguage;
	readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
}

export interface MeadowEntryPaintedV2SceneryInsert {
	readonly id: string;
	readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
	readonly bounds: PixelBounds;
	readonly owningSourceId: string;
	readonly owningSourcePriority: number;
	readonly rawPath: string;
	readonly normalizedPath: string;
	readonly provenancePath: string;
}

export interface MeadowEntryPaintedV2SceneryIntersection {
	readonly blockerId: string;
	readonly owningSourceId: string;
	readonly insertId: string;
	readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
	readonly bounds: PixelBounds;
}

const RAW_SCENERY_BLOCKERS = [
	{
		sourceId: 'coast-crossroads-mouth-bank',
		bounds: { left: 3168, top: 4900, right: 3232, bottom: 5300 },
		language: 'hedge',
		sceneryClass: 'hedge'
	},
	{
		sourceId: 'mistfen-entry-bank-east',
		bounds: { left: 3068, top: 2600, right: 3132, bottom: 3100 },
		language: 'hedge',
		sceneryClass: 'hedge'
	},
	{
		sourceId: 'silverpine-wall-A-east',
		bounds: { left: 3628, top: 2700, right: 3692, bottom: 3000 },
		language: 'tree-wall',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'silverpine-wall-A-west',
		bounds: { left: 3308, top: 2700, right: 3372, bottom: 3000 },
		language: 'tree-wall',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'silverpine-wall-B-north',
		bounds: { left: 3148, top: 2558, right: 3532, bottom: 2622 },
		language: 'tree-wall',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'silverpine-wall-B-south',
		bounds: { left: 3148, top: 2878, right: 3532, bottom: 2942 },
		language: 'tree-wall',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'silverpine-wall-C-east',
		bounds: { left: 3308, top: 2540, right: 3372, bottom: 2780 },
		language: 'tree-wall',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'silverpine-wall-C-west',
		bounds: { left: 2988, top: 2540, right: 3052, bottom: 2780 },
		language: 'tree-wall',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'wildwood-forest-lane-west-bank',
		bounds: { left: 4968, top: 3200, right: 5032, bottom: 5300 },
		language: 'forest-bank',
		sceneryClass: 'woodland'
	},
	{
		sourceId: 'wildwood-north-climb-west-bank',
		bounds: { left: 5368, top: 1950, right: 5432, bottom: 3050 },
		language: 'forest-bank',
		sceneryClass: 'woodland'
	}
] as const satisfies readonly MeadowEntryPaintedV2SceneryBlocker[];

const RAW_SCENERY_INSERTS = [
	{
		id: 'camera-underlay-sundrop-south-blocked-hedge',
		sceneryClass: 'hedge',
		bounds: { left: 0, top: 4736, right: 3200, bottom: 6400 },
		owningSourceId: 'camera-underlay-sundrop-south',
		owningSourcePriority: 1,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-inserts/raw/camera-underlay-sundrop-south-blocked-hedge.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-sundrop-south-blocked-hedge.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-sundrop-south-blocked-hedge.json'
	},
	{
		id: 'camera-underlay-crossroads-north-blocked-hedge',
		sceneryClass: 'hedge',
		bounds: { left: 2368, top: 2240, right: 5568, bottom: 3904 },
		owningSourceId: 'camera-underlay-crossroads-north',
		owningSourcePriority: 2,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-inserts/raw/camera-underlay-crossroads-north-blocked-hedge.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-crossroads-north-blocked-hedge.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-crossroads-north-blocked-hedge.json'
	},
	{
		id: 'camera-underlay-crossroads-south-blocked-hedge',
		sceneryClass: 'hedge',
		bounds: { left: 2368, top: 3776, right: 5568, bottom: 5440 },
		owningSourceId: 'camera-underlay-crossroads-south',
		owningSourcePriority: 3,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-inserts/raw/camera-underlay-crossroads-south-blocked-hedge.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-crossroads-south-blocked-hedge.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-crossroads-south-blocked-hedge.json'
	},
	{
		id: 'camera-underlay-crossroads-north-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: { left: 2368, top: 2240, right: 5568, bottom: 3904 },
		owningSourceId: 'camera-underlay-crossroads-north',
		owningSourcePriority: 2,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-inserts/raw/camera-underlay-crossroads-north-blocked-woodland.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-crossroads-north-blocked-woodland.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-crossroads-north-blocked-woodland.json'
	},
	{
		id: 'camera-underlay-crossroads-south-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: { left: 2368, top: 3776, right: 5568, bottom: 5440 },
		owningSourceId: 'camera-underlay-crossroads-south',
		owningSourcePriority: 3,
		rawPath:
			'artifacts/meadow-entry/painted-v2/source-inserts/raw/camera-underlay-crossroads-south-blocked-woodland.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-crossroads-south-blocked-woodland.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-crossroads-south-blocked-woodland.json'
	},
	{
		id: 'crossroads-blocked-hedge',
		sceneryClass: 'hedge',
		bounds: { left: 2880, top: 2816, right: 4608, bottom: 4768 },
		owningSourceId: 'crossroads',
		owningSourcePriority: 50,
		rawPath: 'artifacts/meadow-entry/painted-v2/source-inserts/raw/crossroads-blocked-hedge.png',
		normalizedPath: 'artifacts/meadow-entry/painted-v2/source-inserts/crossroads-blocked-hedge.png',
		provenancePath: 'artifacts/meadow-entry/painted-v2/source-inserts/crossroads-blocked-hedge.json'
	},
	{
		id: 'crossroads-blocked-woodland',
		sceneryClass: 'woodland',
		bounds: { left: 2880, top: 2816, right: 4608, bottom: 4768 },
		owningSourceId: 'crossroads',
		owningSourcePriority: 50,
		rawPath: 'artifacts/meadow-entry/painted-v2/source-inserts/raw/crossroads-blocked-woodland.png',
		normalizedPath:
			'artifacts/meadow-entry/painted-v2/source-inserts/crossroads-blocked-woodland.png',
		provenancePath:
			'artifacts/meadow-entry/painted-v2/source-inserts/crossroads-blocked-woodland.json'
	}
] as const satisfies readonly MeadowEntryPaintedV2SceneryInsert[];

function freezeBounds(value: PixelBounds): PixelBounds {
	return Object.freeze({ ...value });
}

function freezeBlocker(
	value: MeadowEntryPaintedV2SceneryBlocker
): MeadowEntryPaintedV2SceneryBlocker {
	return Object.freeze({ ...value, bounds: freezeBounds(value.bounds) });
}

function freezeInsert(value: MeadowEntryPaintedV2SceneryInsert): MeadowEntryPaintedV2SceneryInsert {
	return Object.freeze({ ...value, bounds: freezeBounds(value.bounds) });
}

export const MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS: readonly MeadowEntryPaintedV2SceneryBlocker[] =
	Object.freeze(RAW_SCENERY_BLOCKERS.map(freezeBlocker));

export const MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS: readonly MeadowEntryPaintedV2SceneryInsert[] =
	Object.freeze(RAW_SCENERY_INSERTS.map(freezeInsert));

function sameBounds(first: PixelBounds, second: PixelBounds): boolean {
	return (
		first.left === second.left &&
		first.top === second.top &&
		first.right === second.right &&
		first.bottom === second.bottom
	);
}

function intersectBounds(first: PixelBounds, second: PixelBounds): PixelBounds | null {
	const intersection = {
		left: Math.max(first.left, second.left),
		top: Math.max(first.top, second.top),
		right: Math.min(first.right, second.right),
		bottom: Math.min(first.bottom, second.bottom)
	};
	return intersection.left < intersection.right && intersection.top < intersection.bottom
		? intersection
		: null;
}

function assertContract(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function assertUniqueIds<T extends { readonly id?: string; readonly sourceId?: string }>(
	rows: readonly T[],
	field: 'id' | 'sourceId',
	label: string
): void {
	const seen = new Set<string>();
	for (const row of rows) {
		const value = row[field];
		assertContract(typeof value === 'string', `${label} row is missing ${field}`);
		assertContract(!seen.has(value), `Duplicate Meadow Entry scenery ${label} ${field}: ${value}`);
		seen.add(value);
	}
}

function assertBlockerTable(blockers: readonly MeadowEntryPaintedV2SceneryBlocker[]): void {
	assertContract(
		blockers.length === MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.length,
		'Meadow Entry scenery blocker table length drifted'
	);
	assertUniqueIds(blockers, 'sourceId', 'blocker');
	for (const [index, blocker] of blockers.entries()) {
		const expected = MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS[index];
		assertContract(expected !== undefined, `Missing Meadow Entry scenery blocker row ${index}`);
		assertContract(
			blocker.sourceId === expected.sourceId &&
				sameBounds(blocker.bounds, expected.bounds) &&
				blocker.language === expected.language &&
				blocker.sceneryClass === expected.sceneryClass,
			`Meadow Entry scenery blocker row ${index} does not match the sealed contract`
		);
	}
}

function assertInsertTable(inserts: readonly MeadowEntryPaintedV2SceneryInsert[]): void {
	assertContract(
		inserts.length === MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.length,
		'Meadow Entry scenery insert table length drifted'
	);
	assertUniqueIds(inserts, 'id', 'insert');
	for (const [index, insert] of inserts.entries()) {
		const expected = MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS[index];
		assertContract(expected !== undefined, `Missing Meadow Entry scenery insert row ${index}`);
		assertContract(
			insert.id === expected.id &&
				insert.sceneryClass === expected.sceneryClass &&
				sameBounds(insert.bounds, expected.bounds) &&
				insert.owningSourceId === expected.owningSourceId &&
				insert.owningSourcePriority === expected.owningSourcePriority &&
				insert.rawPath === expected.rawPath &&
				insert.normalizedPath === expected.normalizedPath &&
				insert.provenancePath === expected.provenancePath,
			`Meadow Entry scenery insert row ${index} does not match the sealed contract`
		);
	}
}

function assertPanelTable(panels: readonly MeadowEntryPaintedV2SourcePanel[]): void {
	assertContract(
		panels.length === MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.length,
		'Meadow Entry painted-v2 source-panel registry length drifted'
	);
	const ids = new Set<string>();
	for (const [index, panel] of panels.entries()) {
		assertContract(!ids.has(panel.id), `Duplicate Meadow Entry source-panel id: ${panel.id}`);
		ids.add(panel.id);
		const expected = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS[index];
		assertContract(expected !== undefined, `Missing Meadow Entry source-panel row ${index}`);
		assertContract(
			panel.id === expected.id &&
				panel.role === expected.role &&
				sameBounds(panel.bounds, expected.bounds) &&
				panel.expectedDimensions.width === expected.expectedDimensions.width &&
				panel.expectedDimensions.height === expected.expectedDimensions.height &&
				panel.assemblyPriority === expected.assemblyPriority &&
				panel.rawPath === expected.rawPath &&
				panel.normalizedPath === expected.normalizedPath &&
				panel.provenancePath === expected.provenancePath,
			`Meadow Entry painted-v2 source-panel row ${index} does not match the sealed registry`
		);
	}
}

function assertCatalogBlockers(
	blockers: readonly MeadowEntryPaintedV2SceneryBlocker[],
	sourceCatalog: readonly MeadowEntrySourceRecord[]
): void {
	for (const blocker of blockers) {
		const record = sourceCatalog.find(
			(candidate) =>
				candidate.ref.sourceType === 'blocker' && candidate.ref.sourceId === blocker.sourceId
		);
		assertContract(
			record !== undefined,
			`Meadow Entry scenery blocker is not a catalog blocker: ${blocker.sourceId}`
		);
		assertContract(
			record.bounds !== null && sameBounds(record.bounds, blocker.bounds),
			`Meadow Entry scenery blocker bounds do not match source catalog: ${blocker.sourceId}`
		);
	}
}

function assertInsertOwners(
	inserts: readonly MeadowEntryPaintedV2SceneryInsert[],
	panels: readonly MeadowEntryPaintedV2SourcePanel[]
): Map<string, MeadowEntryPaintedV2SourcePanel> {
	const panelById = new Map(panels.map((panel) => [panel.id, panel]));
	for (const insert of inserts) {
		const owner = panelById.get(insert.owningSourceId);
		assertContract(
			owner !== undefined,
			`Meadow Entry scenery insert has unknown owner: ${insert.id}`
		);
		assertContract(
			sameBounds(owner.bounds, insert.bounds),
			`Meadow Entry scenery insert bounds do not match owner: ${insert.id}`
		);
		assertContract(
			owner.assemblyPriority === insert.owningSourcePriority,
			`Meadow Entry scenery insert priority does not match owner: ${insert.id}`
		);
	}
	return panelById;
}

function assertCoverageExists(
	blockers: readonly MeadowEntryPaintedV2SceneryBlocker[],
	inserts: readonly MeadowEntryPaintedV2SceneryInsert[],
	panels: readonly MeadowEntryPaintedV2SourcePanel[]
): void {
	const insertByOwnerAndClass = new Map(
		inserts.map((insert) => [`${insert.owningSourceId}:${insert.sceneryClass}`, insert])
	);
	for (const panel of panels) {
		for (const blocker of blockers) {
			if (intersectBounds(panel.bounds, blocker.bounds) === null) continue;
			const insert = insertByOwnerAndClass.get(`${panel.id}:${blocker.sceneryClass}`);
			assertContract(
				insert !== undefined,
				`Meadow Entry scenery coverage is missing for ${panel.id}/${blocker.sourceId}/${blocker.sceneryClass}`
			);
		}
	}
}

export function validateMeadowEntryPaintedV2SceneryContract(
	blockers: readonly MeadowEntryPaintedV2SceneryBlocker[] = MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS,
	inserts: readonly MeadowEntryPaintedV2SceneryInsert[] = MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS,
	panels: readonly MeadowEntryPaintedV2SourcePanel[] = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS,
	sourceCatalog: readonly MeadowEntrySourceRecord[] = collectMeadowEntrySourceCatalog()
): readonly MeadowEntryPaintedV2SceneryIntersection[] {
	assertBlockerTable(blockers);
	assertInsertTable(inserts);
	assertPanelTable(panels);
	assertCatalogBlockers(blockers, sourceCatalog);
	const panelById = assertInsertOwners(inserts, panels);
	assertCoverageExists(blockers, inserts, panels);

	const intersections: MeadowEntryPaintedV2SceneryIntersection[] = [];
	for (const insert of inserts) {
		const owner = panelById.get(insert.owningSourceId);
		assertContract(
			owner !== undefined,
			`Meadow Entry scenery insert owner disappeared: ${insert.id}`
		);
		for (const blocker of blockers) {
			if (insert.sceneryClass !== blocker.sceneryClass) continue;
			const overlap = intersectBounds(owner.bounds, blocker.bounds);
			if (overlap === null) continue;
			intersections.push(
				Object.freeze({
					blockerId: blocker.sourceId,
					owningSourceId: insert.owningSourceId,
					insertId: insert.id,
					sceneryClass: insert.sceneryClass,
					bounds: freezeBounds(overlap)
				})
			);
		}
	}
	return Object.freeze(intersections);
}

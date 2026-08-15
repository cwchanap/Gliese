import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

import sharp from 'sharp';

import {
	buildMeadowEntryControlInputs,
	computeMeadowEntryCombinedControlFingerprint,
	renderMeadowEntryControls,
	MEADOW_ENTRY_CONTROL_FILENAMES
} from '$lib/game/content/backgrounds/meadow-entry-controls';
import { MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS } from '$lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest';
import {
	MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS,
	MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS,
	type MeadowEntryPaintedV2SourcePanel
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-pilot';
import {
	assembleMeadowEntryPaintedV2Underlay,
	compositeMeadowEntryDetailPanels,
	type MeadowEntryDetailDecodedPanel,
	type MeadowEntryUnderlayDecodedPanel
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly';
import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	type DecodedMeadowEntryRgba
} from '$lib/game/content/backgrounds/meadow-entry-png';
import type { PixelBounds } from '$lib/game/content/backgrounds/meadow-entry-authoring-types';
import {
	MEADOW_ENTRY_PAINTED_V2_ENRICHMENT_REVIEW_FILENAMES,
	assertMeadowEntryPaintedV2DecorationEnergy,
	buildMeadowEntryPaintedV2DecorationEligibility,
	collectMeadowEntryPaintedV2DecorationTiles,
	measureMeadowEntryPaintedV2DecorationEnergy,
	type MeadowEntryPaintedV2DecorationEnergy,
	type MeadowEntryPaintedV2DecorationEligibility,
	type MeadowEntryPaintedV2DecorationTile
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review';
import {
	buildMeadowEntryPaintedV2SceneryMaskSet,
	buildMeadowEntryPaintedV2SceneryMaskSetFromControls,
	enrichMeadowEntryPaintedV2Sources,
	type DecodedMeadowEntryPaintedV2SceneryInsert,
	type MeadowEntryPaintedV2SceneryMaskSet
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake';
import {
	MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS,
	MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS,
	type MeadowEntryPaintedV2SceneryInsert
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-scenery';

const DEFAULT_MASTER =
	'artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png';
const DEFAULT_OUTPUT_ROOT = 'docs/superpowers/reports/img/hpa-586-painted-v2-enrichment';
const REVIEW_MASTER = 'masters/meadow-entry-painted-v2-pilot-base-master.png';
const REVIEW_SUNDROP_CROP = 'exports/painted-v2-sundrop-camera-base.png';
const REVIEW_CROSSROADS_CROP = 'exports/painted-v2-crossroads-camera-base.png';
const REVIEW_OVERVIEW = 'forest-overview.png';
const INSERT_ARTIFACT_ROOT = 'artifacts/meadow-entry/painted-v2/source-inserts';
const SOURCE_REVIEW_PANEL_IDS = new Set([
	'camera-underlay-sundrop-north',
	'camera-underlay-sundrop-south',
	'camera-underlay-crossroads-north',
	'camera-underlay-crossroads-south',
	'sundrop-north',
	'sundrop-south'
]);
const INSERT_REVIEW_IDS = [
	'camera-underlay-sundrop-south-blocked-hedge',
	'camera-underlay-crossroads-north-blocked-hedge',
	'camera-underlay-crossroads-south-blocked-hedge',
	'camera-underlay-crossroads-north-blocked-woodland',
	'camera-underlay-crossroads-south-blocked-woodland'
] as const;
const PRESENTATION_REVIEW_IDS = [...SOURCE_REVIEW_PANEL_IDS] as const;
const VIRTUAL_INSERT_IDS = new Set(['crossroads-blocked-hedge', 'crossroads-blocked-woodland']);

interface CliOptions {
	check: boolean;
	assembleSources: boolean;
	contactSheets: boolean;
	sourceReview: boolean;
	mode: 'baseline' | 'candidate';
	master: string;
	outputRoot: string;
}

interface ControlContext {
	eligibility: MeadowEntryPaintedV2DecorationEligibility;
	tiles: readonly MeadowEntryPaintedV2DecorationTile[];
	controls: Readonly<Record<string, string>>;
	controlHashes: Readonly<Record<string, string>>;
	sourceHashes: Readonly<Record<string, string>>;
	combinedControlFingerprint: string;
}

interface ReviewArtifact {
	readonly relativePath: string;
	readonly bytes: Buffer;
}

interface AssemblyResult {
	readonly artifacts: readonly ReviewArtifact[];
	readonly master: DecodedMeadowEntryRgba;
	readonly enrichedPanels: readonly MeadowEntryDetailDecodedPanel[];
	readonly masks?: MeadowEntryPaintedV2SceneryMaskSet;
	readonly inserts?: readonly DecodedMeadowEntryPaintedV2SceneryInsert[];
}

interface EvidenceDescriptor {
	readonly sha256: string;
	readonly bytes: number;
	readonly width: number;
	readonly height: number;
}

interface ReviewPayload {
	readonly version: 1;
	readonly mode: 'baseline' | 'candidate';
	readonly master: {
		readonly path: string;
		readonly sha256: string;
		readonly bytes: number;
		readonly width: number;
		readonly height: number;
	};
	readonly controls: {
		readonly combinedControlFingerprint: string;
		readonly sourceHashes: Readonly<Record<string, string>>;
		readonly parserPolicy: string;
	};
	readonly eligibility: {
		readonly tileSizePx: number;
		readonly qualifyingTileCount: number;
		readonly sheetTileCounts: readonly number[];
		readonly cropUnion: readonly PixelBounds[];
		readonly protectionMargins: Readonly<Record<string, number>>;
	};
	readonly energy: MeadowEntryPaintedV2DecorationEnergy;
	readonly tiles: readonly MeadowEntryPaintedV2DecorationTile[];
	readonly sourcePanels?: readonly {
		readonly id: string;
		readonly path: string;
		readonly sha256: string;
		readonly bytes: number;
		readonly width: number;
		readonly height: number;
	}[];
	readonly fullPanelOriginalDetailInspection?: boolean;
	readonly evidence: Readonly<Record<string, EvidenceDescriptor>>;
}

function sha256(value: Uint8Array): string {
	return createHash('sha256').update(value).digest('hex');
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function stableJson(value: unknown): Buffer {
	return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function dimensions(bounds: PixelBounds): { width: number; height: number } {
	return { width: bounds.right - bounds.left, height: bounds.bottom - bounds.top };
}

function parseArgs(args: readonly string[]): CliOptions {
	let check = false;
	let assembleSources = false;
	let contactSheets = false;
	let sourceReview = false;
	let mode: CliOptions['mode'] = 'candidate';
	let master = DEFAULT_MASTER;
	let outputRoot = DEFAULT_OUTPUT_ROOT;
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === '--check') check = true;
		else if (arg === '--assemble-sources') assembleSources = true;
		else if (arg === '--contact-sheets') contactSheets = true;
		else if (arg === '--source-review') sourceReview = true;
		else if (arg === '--mode') {
			const value = args[++index];
			if (value !== 'baseline' && value !== 'candidate')
				throw new Error('Usage: --mode baseline|candidate');
			mode = value;
		} else if (arg === '--master') {
			master = args[++index] ?? '';
			if (!master) throw new Error('Usage: --master <path>');
		} else if (arg === '--output-root') {
			outputRoot = args[++index] ?? '';
			if (!outputRoot) throw new Error('Usage: --output-root <path>');
		} else {
			throw new Error(`Unknown option: ${arg}`);
		}
	}
	if (mode === 'baseline' && (contactSheets || sourceReview)) {
		throw new Error('Baseline mode does not write contact sheets or source review inventory');
	}
	return { check, assembleSources, contactSheets, sourceReview, mode, master, outputRoot };
}

function ensureReviewRoot(repositoryRoot: string, outputRoot: string): void {
	const runtimeRoot = resolve(repositoryRoot, 'public/game/assets/regions/meadow-entry-painted-v2');
	const resolvedOutput = resolve(repositoryRoot, outputRoot);
	assert(
		resolvedOutput !== runtimeRoot && !resolvedOutput.startsWith(`${runtimeRoot}${sep}`),
		'Review output must not target the public painted-v2 runtime directory'
	);
}

async function readRenderedControls(
	repositoryRoot: string,
	providedSceneryMasks?: MeadowEntryPaintedV2SceneryMaskSet
): Promise<ControlContext> {
	const input = buildMeadowEntryControlInputs(repositoryRoot);
	const rendered = renderMeadowEntryControls(input);
	const controlHashes: Record<string, string> = {};
	const controlBytes: Record<string, Buffer> = {};
	for (const filename of MEADOW_ENTRY_CONTROL_FILENAMES) {
		const path = join(repositoryRoot, 'artifacts/meadow-entry/painted-v2/controls', filename);
		const checkedIn = await readFile(path);
		const renderedBytes = Buffer.from(rendered[filename] ?? '');
		assert(checkedIn.equals(renderedBytes), `Rendered Meadow Entry control is stale: ${filename}`);
		controlBytes[filename] = checkedIn;
		controlHashes[filename] = sha256(checkedIn);
	}
	const sceneryMasks =
		providedSceneryMasks ??
		buildMeadowEntryPaintedV2SceneryMaskSetFromControls(input, {
			...controlHashes,
			'control-fingerprint': computeMeadowEntryCombinedControlFingerprint(input)
		});
	const eligibility = buildMeadowEntryPaintedV2DecorationEligibility({
		width: input.worldBounds.right - input.worldBounds.left,
		height: input.worldBounds.bottom - input.worldBounds.top,
		tileSizePx: 512,
		cropUnion: MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ bounds }) => bounds),
		sceneryMasks,
		metadata: {
			controlSvgHashes: controlHashes,
			parserPolicy: 'builder-control-inputs-only',
			combinedControlFingerprint: computeMeadowEntryCombinedControlFingerprint(input)
		}
	});
	const tiles = collectMeadowEntryPaintedV2DecorationTiles(eligibility);
	return {
		eligibility,
		tiles,
		controls: rendered,
		controlHashes,
		sourceHashes: sceneryMasks.sourceHashes,
		combinedControlFingerprint: computeMeadowEntryCombinedControlFingerprint(input)
	};
}

function energyWithMode(
	energy: MeadowEntryPaintedV2DecorationEnergy,
	mode: CliOptions['mode']
): MeadowEntryPaintedV2DecorationEnergy {
	return { ...energy, mode };
}

function payload(
	mode: CliOptions['mode'],
	sourceReview: boolean,
	masterPath: string,
	master: Buffer,
	decoded: DecodedMeadowEntryRgba,
	controls: ControlContext,
	energy: MeadowEntryPaintedV2DecorationEnergy,
	evidence: Readonly<Record<string, EvidenceDescriptor>> = {}
): ReviewPayload {
	const sourcePanels =
		mode === 'candidate' && sourceReview
			? MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.filter(({ id }) =>
					SOURCE_REVIEW_PANEL_IDS.has(id)
				).map((panel) => ({
					id: panel.id,
					path: panel.normalizedPath,
					sha256: '',
					bytes: 0,
					width: panel.expectedDimensions.width,
					height: panel.expectedDimensions.height
				}))
			: undefined;
	const result = {
		version: 1,
		mode,
		master: {
			path: masterPath,
			sha256: sha256(master),
			bytes: master.byteLength,
			width: decoded.width,
			height: decoded.height
		},
		controls: {
			combinedControlFingerprint: controls.combinedControlFingerprint,
			sourceHashes: controls.sourceHashes,
			parserPolicy: 'builder-control-inputs-only'
		},
		eligibility: {
			tileSizePx: controls.eligibility.tileSizePx,
			qualifyingTileCount: controls.tiles.length,
			sheetTileCounts: energy.sheetTileCounts,
			cropUnion: controls.eligibility.cropUnion,
			protectionMargins: controls.eligibility.protectionMargins
		},
		energy,
		tiles: controls.tiles,
		...(sourcePanels ? { sourcePanels } : {}),
		...(mode === 'candidate' && sourceReview ? { fullPanelOriginalDetailInspection: true } : {}),
		evidence
	} satisfies ReviewPayload;
	return result;
}

function patchCandidateSourceHashes(
	result: ReviewPayload,
	repositoryRoot: string
): Promise<ReviewPayload> {
	if (!result.sourcePanels) return Promise.resolve(result);
	return Promise.all(
		result.sourcePanels.map(async (panel) => {
			const bytes = await readFile(join(repositoryRoot, panel.path));
			const decoded = await decodeMeadowEntryRgba(bytes);
			return {
				...panel,
				sha256: sha256(bytes),
				bytes: bytes.byteLength,
				width: decoded.width,
				height: decoded.height
			};
		})
	).then((sourcePanels) => ({ ...result, sourcePanels }));
}

async function cropRaw(decoded: DecodedMeadowEntryRgba, bounds: PixelBounds): Promise<Buffer> {
	const { width, height } = dimensions(bounds);
	const raw = Buffer.alloc(width * height * 4);
	for (let y = bounds.top; y < bounds.bottom; y += 1) {
		const sourceOffset = (y * decoded.width + bounds.left) * 4;
		const targetOffset = (y - bounds.top) * width * 4;
		decoded.data.copy(raw, targetOffset, sourceOffset, sourceOffset + width * 4);
	}
	return raw;
}

async function cropPng(decoded: DecodedMeadowEntryRgba, bounds: PixelBounds): Promise<Buffer> {
	const raw = await cropRaw(decoded, bounds);
	return encodeCanonicalMeadowEntryPng(raw, bounds.right - bounds.left, bounds.bottom - bounds.top);
}

async function reviewMasterArtifacts(
	decoded: DecodedMeadowEntryRgba
): Promise<readonly ReviewArtifact[]> {
	const masterPng = await encodeCanonicalMeadowEntryPng(
		decoded.data,
		decoded.width,
		decoded.height
	);
	return [
		{ relativePath: REVIEW_MASTER, bytes: masterPng },
		{
			relativePath: REVIEW_SUNDROP_CROP,
			bytes: await cropPng(decoded, MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS[0]!.bounds)
		},
		{
			relativePath: REVIEW_CROSSROADS_CROP,
			bytes: await cropPng(decoded, MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS[1]!.bounds)
		}
	];
}

async function writeDensitySheets(
	decoded: DecodedMeadowEntryRgba,
	tiles: readonly MeadowEntryPaintedV2DecorationTile[]
): Promise<readonly ReviewArtifact[]> {
	const sheetSize = 4;
	const cellSize = 512;
	const sheetWidth = sheetSize * cellSize;
	const artifacts: ReviewArtifact[] = [];
	for (let sheetIndex = 0; sheetIndex < 5; sheetIndex += 1) {
		const tileList = tiles.filter(({ sheetIndex: value }) => value === sheetIndex);
		const raw = Buffer.alloc(sheetWidth * sheetWidth * 4);
		for (let index = 0; index < tileList.length; index += 1) {
			const tile = tileList[index]!;
			const tileRaw = await cropRaw(decoded, tile.bounds);
			const width = tile.bounds.right - tile.bounds.left;
			const height = tile.bounds.bottom - tile.bounds.top;
			const cellX = (index % sheetSize) * cellSize;
			const cellY = Math.floor(index / sheetSize) * cellSize;
			for (let y = 0; y < height; y += 1) {
				const sourceOffset = y * width * 4;
				const targetOffset = ((cellY + y) * sheetWidth + cellX) * 4;
				tileRaw.copy(raw, targetOffset, sourceOffset, sourceOffset + width * 4);
			}
		}
		artifacts.push({
			relativePath: `decoration-density-${(sheetIndex + 1).toString().padStart(2, '0')}.png`,
			bytes: await encodeCanonicalMeadowEntryPng(raw, sheetWidth, sheetWidth)
		});
	}
	return artifacts;
}

function reviewPatchBounds(
	width: number,
	height: number,
	anchor:
		| 'top-left'
		| 'top-center'
		| 'top-right'
		| 'middle-left'
		| 'middle-center'
		| 'middle-right'
		| 'bottom-left'
		| 'bottom-center'
		| 'bottom-right'
): PixelBounds {
	const size = Math.min(512, width, height);
	const left = anchor.endsWith('left')
		? 0
		: anchor.endsWith('right')
			? width - size
			: Math.floor((width - size) / 2);
	const top = anchor.startsWith('top')
		? 0
		: anchor.startsWith('bottom')
			? height - size
			: Math.floor((height - size) / 2);
	return { left, top, right: left + size, bottom: top + size };
}

async function composeContactSheet(
	decoded: DecodedMeadowEntryRgba,
	patches: readonly PixelBounds[],
	columns: number
): Promise<Buffer> {
	const cellSize = 512;
	const rows = Math.ceil(patches.length / columns);
	const raw = Buffer.alloc(columns * cellSize * rows * cellSize * 4);
	for (let index = 0; index < patches.length; index += 1) {
		const patch = await cropPng(decoded, patches[index]!);
		const resized = await sharp(patch)
			.resize(cellSize, cellSize, { fit: 'fill' })
			.ensureAlpha()
			.raw()
			.toBuffer();
		const cellX = (index % columns) * cellSize;
		const cellY = Math.floor(index / columns) * cellSize;
		for (let y = 0; y < cellSize; y += 1) {
			const sourceOffset = y * cellSize * 4;
			const targetOffset = ((cellY + y) * columns * cellSize + cellX) * 4;
			resized.copy(raw, targetOffset, sourceOffset, sourceOffset + cellSize * 4);
		}
	}
	return encodeCanonicalMeadowEntryPng(raw, columns * cellSize, rows * cellSize);
}

async function readNativePanel(
	repositoryRoot: string,
	panel: MeadowEntryPaintedV2SourcePanel
): Promise<DecodedMeadowEntryRgba> {
	const bytes = await readFile(join(repositoryRoot, panel.normalizedPath));
	const decoded = await decodeMeadowEntryRgba(bytes);
	assert(
		decoded.width === panel.expectedDimensions.width &&
			decoded.height === panel.expectedDimensions.height,
		`Source panel dimensions drifted during review: ${panel.id}`
	);
	return decoded;
}

function parseJsonObject(value: Buffer, label: string): Record<string, unknown> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(value.toString('utf8')) as unknown;
	} catch (error) {
		throw new Error(`${label} is not valid JSON`, { cause: error });
	}
	assert(
		parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed),
		`${label} is not an object`
	);
	return parsed as Record<string, unknown>;
}

function assertInsertArtQuality(
	insert: MeadowEntryPaintedV2SceneryInsert,
	decoded: DecodedMeadowEntryRgba,
	metadata: Record<string, unknown>
): void {
	for (let index = 3; index < decoded.data.length; index += 4)
		assert(decoded.data[index] === 255, `Scenery insert is not opaque RGBA: ${insert.id}`);
	const review = metadata.review as Record<string, unknown> | undefined;
	assert(
		review?.rawInspectedAtOriginalResolution === true,
		`Scenery insert raw inspection is missing: ${insert.id}`
	);
	assert(
		review?.gridLikeUpperBand !== true,
		`Scenery insert has a grid-like upper band: ${insert.id}`
	);
	assert(
		review?.visibleInsertRectangle !== true,
		`Scenery insert has a visible rectangle edge: ${insert.id}`
	);
	assert(
		review?.protectedOverlapPixels === 0,
		`Scenery insert records protected overlap: ${insert.id}`
	);

	// A repeated row run is a deterministic guard against the most common generated
	// texture failure: a tiled/grid-like strip across the top of the canvas.
	const topRows = Math.max(8, Math.floor(decoded.height * 0.15));
	const rowHashes = new Set<string>();
	for (let y = 0; y < topRows; y += 1) {
		const row = decoded.data.subarray(y * decoded.width * 4, (y + 1) * decoded.width * 4);
		rowHashes.add(sha256(row));
	}
	assert(
		rowHashes.size > Math.max(2, Math.floor(topRows / 8)),
		`Scenery insert has a repeated upper-band grid: ${insert.id}`
	);

	const sampleMean = (left: number, top: number, right: number, bottom: number): number[] => {
		const totals = [0, 0, 0];
		let count = 0;
		for (let y = top; y < bottom; y += 1) {
			for (let x = left; x < right; x += 1) {
				const offset = (y * decoded.width + x) * 4;
				for (let channel = 0; channel < 3; channel += 1)
					totals[channel] += decoded.data[offset + channel]!;
				count += 1;
			}
		}
		return totals.map((value) => value / Math.max(1, count));
	};
	const edge = Math.max(2, Math.floor(Math.min(decoded.width, decoded.height) * 0.01));
	const inset = sampleMean(edge, edge, decoded.width - edge, decoded.height - edge);
	const border = [
		sampleMean(0, 0, decoded.width, edge),
		sampleMean(0, decoded.height - edge, decoded.width, decoded.height),
		sampleMean(0, 0, edge, decoded.height),
		sampleMean(decoded.width - edge, 0, decoded.width, decoded.height)
	];
	const borderSpread =
		Math.max(...border.flatMap((mean) => mean)) - Math.min(...border.flatMap((mean) => mean));
	const edgeDelta = Math.max(
		...border.map(
			(mean) =>
				mean.reduce((total, value, channel) => total + Math.abs(value - inset[channel]!), 0) / 3
		)
	);
	assert(
		!(borderSpread < 4 && edgeDelta > 50),
		`Scenery insert has a visible rectangular border: ${insert.id}`
	);
}

async function readAssemblyPanels(
	repositoryRoot: string
): Promise<readonly MeadowEntryDetailDecodedPanel[]> {
	return await Promise.all(
		MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.map(async (spec) => {
			const bytes = await readFile(join(repositoryRoot, spec.normalizedPath));
			const rgba = await decodeMeadowEntryRgba(bytes);
			assert(
				rgba.width === spec.expectedDimensions.width &&
					rgba.height === spec.expectedDimensions.height,
				`Source panel dimensions drifted: ${spec.id}`
			);
			return {
				id: spec.id,
				bounds: spec.bounds,
				rgba,
				assemblyPriority: spec.assemblyPriority
			};
		})
	);
}

async function readSceneryInserts(
	repositoryRoot: string,
	panels: readonly MeadowEntryDetailDecodedPanel[]
): Promise<readonly DecodedMeadowEntryPaintedV2SceneryInsert[]> {
	const panelById = new Map(panels.map((panel) => [panel.id, panel]));
	const decoded: DecodedMeadowEntryPaintedV2SceneryInsert[] = [];
	for (const expected of MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS) {
		if (VIRTUAL_INSERT_IDS.has(expected.id)) {
			const owner = panelById.get(expected.owningSourceId);
			assert(owner !== undefined, `Virtual scenery insert owner is missing: ${expected.id}`);
			decoded.push({
				id: expected.id,
				sceneryClass: expected.sceneryClass,
				owningSourceId: expected.owningSourceId,
				bounds: expected.bounds,
				rgba: owner.rgba
			});
			continue;
		}
		assert(
			(INSERT_REVIEW_IDS as readonly string[]).includes(expected.id),
			`Unexpected generated scenery insert: ${expected.id}`
		);
		const normalizedPath = join(repositoryRoot, INSERT_ARTIFACT_ROOT, `${expected.id}.png`);
		const provenancePath = join(repositoryRoot, INSERT_ARTIFACT_ROOT, `${expected.id}.json`);
		const metadata = parseJsonObject(
			await readFile(provenancePath),
			`Scenery insert provenance ${expected.id}`
		);
		assert(metadata.id === expected.id, `Scenery insert provenance id drifted: ${expected.id}`);
		assert(
			metadata.sceneryClass === expected.sceneryClass,
			`Scenery insert class drifted: ${expected.id}`
		);
		const metadataBounds = metadata.bounds as Record<string, unknown> | undefined;
		assert(
			metadataBounds !== undefined &&
				['left', 'top', 'right', 'bottom'].every(
					(key) => metadataBounds[key] === expected.bounds[key as keyof PixelBounds]
				),
			`Scenery insert bounds drifted: ${expected.id}`
		);
		const references = Array.isArray(metadata.references) ? metadata.references : [];
		for (const reference of references) {
			const path =
				typeof reference === 'string' ? reference : (reference as Record<string, unknown>)?.path;
			assert(typeof path === 'string', `Scenery insert reference is invalid: ${expected.id}`);
			assert(
				!/(?:\.svg$|mask|control|route|atlas|rectangle)/i.test(path),
				`Scenery insert supplied a forbidden control reference: ${expected.id}`
			);
		}
		const rgba = await decodeMeadowEntryRgba(await readFile(normalizedPath));
		assert(
			rgba.width === expected.bounds.right - expected.bounds.left &&
				rgba.height === expected.bounds.bottom - expected.bounds.top,
			`Scenery insert dimensions do not match bounds: ${expected.id}`
		);
		assertInsertArtQuality(expected, rgba, metadata);
		decoded.push({
			id: expected.id,
			sceneryClass: expected.sceneryClass,
			owningSourceId: expected.owningSourceId,
			bounds: expected.bounds,
			rgba
		});
	}
	return decoded;
}

async function nativeReviewArtifacts(
	repositoryRoot: string,
	decoded: DecodedMeadowEntryRgba,
	controls: ControlContext,
	enrichedPanels: readonly MeadowEntryDetailDecodedPanel[],
	inserts: readonly DecodedMeadowEntryPaintedV2SceneryInsert[]
): Promise<readonly ReviewArtifact[]> {
	const artifacts: ReviewArtifact[] = [];
	for (const panel of MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS) {
		if (!SOURCE_REVIEW_PANEL_IDS.has(panel.id)) continue;
		const nativePanel = await readNativePanel(repositoryRoot, panel);
		artifacts.push({
			relativePath: `panel-${panel.id}-original.png`,
			bytes: await encodeCanonicalMeadowEntryPng(
				nativePanel.data,
				nativePanel.width,
				nativePanel.height
			)
		});
	}
	for (const insertId of INSERT_REVIEW_IDS) {
		const insert = inserts.find(({ id }) => id === insertId);
		assert(insert !== undefined, `Missing scenery insert review input: ${insertId}`);
		artifacts.push({
			relativePath: `insert-${insert.id}-review.png`,
			bytes: await encodeCanonicalMeadowEntryPng(
				insert.rgba.data,
				insert.rgba.width,
				insert.rgba.height
			)
		});
		const anchors = [
			'top-left',
			'top-right',
			'bottom-left',
			'bottom-right',
			'middle-center'
		] as const;
		for (const [index, anchor] of anchors.entries()) {
			artifacts.push({
				relativePath: `insert-${insert.id}-crop-${(index + 1).toString().padStart(2, '0')}.png`,
				bytes: await cropPng(
					insert.rgba,
					reviewPatchBounds(insert.rgba.width, insert.rgba.height, anchor)
				)
			});
		}
	}
	for (const panelId of [
		'camera-underlay-sundrop-south',
		'camera-underlay-crossroads-north',
		'camera-underlay-crossroads-south',
		'crossroads'
	] as const) {
		const panel = enrichedPanels.find(({ id }) => id === panelId);
		assert(panel !== undefined, `Missing enriched owning-source preview: ${panelId}`);
		artifacts.push({
			relativePath: `enriched-owner-${panelId}.png`,
			bytes: await encodeCanonicalMeadowEntryPng(
				panel.rgba.data,
				panel.rgba.width,
				panel.rgba.height
			)
		});
	}
	const extracts: Readonly<Record<string, PixelBounds>> = {
		'underlay-sundrop-north-south.png': { left: 0, top: 4736, right: 3200, bottom: 4864 },
		'underlay-crossroads-north-south.png': { left: 2368, top: 3776, right: 5568, bottom: 3904 },
		'underlay-family-handoff.png': { left: 2368, top: 3200, right: 3200, bottom: 5440 },
		'detail-sundrop-intersection.png': { left: 256, top: 4928, right: 2880, bottom: 5056 },
		'detail-sundrop-west.png': { left: 256, top: 4928, right: 768, bottom: 5056 },
		'detail-sundrop-center.png': { left: 1280, top: 4928, right: 1856, bottom: 5056 },
		'detail-sundrop-east.png': { left: 2368, top: 4928, right: 2880, bottom: 5056 },
		'detail-sundrop-sides-corners.png': { left: 256, top: 4928, right: 2880, bottom: 5056 },
		'hero-house-edge-north.png': { left: 384, top: 5312, right: 1280, bottom: 5440 },
		'hero-house-edge-east.png': { left: 1152, top: 5312, right: 1280, bottom: 6144 },
		'hero-house-edge-south.png': { left: 384, top: 6016, right: 1280, bottom: 6144 },
		'hero-house-edge-west.png': { left: 384, top: 5312, right: 512, bottom: 6144 }
	};
	for (const [filename, bounds] of Object.entries(extracts)) {
		if (filename.endsWith('sides-corners.png')) {
			const anchors: readonly (
				| 'top-left'
				| 'top-center'
				| 'top-right'
				| 'middle-left'
				| 'middle-right'
				| 'bottom-left'
				| 'bottom-center'
				| 'bottom-right'
			)[] = [
				'top-left',
				'top-center',
				'top-right',
				'middle-left',
				'middle-right',
				'bottom-left',
				'bottom-center',
				'bottom-right'
			];
			const sheet = await composeContactSheet(
				decoded,
				anchors.map((anchor) => {
					const patch = reviewPatchBounds(
						bounds.right - bounds.left,
						bounds.bottom - bounds.top,
						anchor
					);
					return {
						left: bounds.left + patch.left,
						top: bounds.top + patch.top,
						right: bounds.left + patch.right,
						bottom: bounds.top + patch.bottom
					};
				}),
				4
			);
			artifacts.push({ relativePath: filename, bytes: sheet });
		} else {
			artifacts.push({ relativePath: filename, bytes: await cropPng(decoded, bounds) });
		}
	}
	const matchedNorth = await cropPng(decoded, { left: 256, top: 3968, right: 1280, bottom: 5056 });
	const matchedSouth = await cropPng(decoded, { left: 1856, top: 4928, right: 2880, bottom: 6016 });
	const matched = await sharp({
		create: {
			width: 2048,
			height: 1088,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 }
		}
	})
		.composite([
			{ input: matchedNorth, left: 0, top: 0 },
			{ input: matchedSouth, left: 1024, top: 0 }
		])
		.png()
		.toBuffer();
	artifacts.push({ relativePath: 'matched-sundrop-richness.png', bytes: matched });
	artifacts.push({
		relativePath: 'wildwood-forest-lane.png',
		bytes: await cropPng(decoded, { left: 4608, top: 3200, right: 5568, bottom: 4608 })
	});
	for (const [index, blocker] of MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.entries()) {
		const width = blocker.bounds.right - blocker.bounds.left;
		const height = blocker.bounds.bottom - blocker.bounds.top;
		const padX = Math.max(0, Math.floor((512 - width) / 2));
		const padY = Math.max(0, Math.floor((512 - height) / 2));
		const left = Math.max(0, Math.min(decoded.width - 512, blocker.bounds.left - padX));
		const top = Math.max(0, Math.min(decoded.height - 512, blocker.bounds.top - padY));
		artifacts.push({
			relativePath: `blocker-row-${(index + 1).toString().padStart(2, '0')}.png`,
			bytes: await cropPng(decoded, { left, top, right: left + 512, bottom: top + 512 })
		});
	}
	return artifacts;
}

async function listFiles(root: string): Promise<readonly string[]> {
	const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
	const result: string[] = [];
	for (const entry of entries) {
		const path = join(root, entry.name);
		if (entry.isDirectory()) {
			for (const nested of await listFiles(path)) result.push(join(entry.name, nested));
		} else result.push(entry.name);
	}
	return result.sort();
}

function forestReviewFilenames(): readonly string[] {
	return [
		'decoration-candidate.json',
		'evidence-manifest.json',
		'mask-inventory.json',
		REVIEW_OVERVIEW,
		REVIEW_MASTER,
		REVIEW_SUNDROP_CROP,
		REVIEW_CROSSROADS_CROP,
		'decoration-density-01.png',
		'decoration-density-02.png',
		'decoration-density-03.png',
		'decoration-density-04.png',
		'decoration-density-05.png',
		...PRESENTATION_REVIEW_IDS.map((id) => `panel-${id}-original.png`),
		...INSERT_REVIEW_IDS.flatMap((id) => [
			`insert-${id}-review.png`,
			...Array.from(
				{ length: 5 },
				(_, index) => `insert-${id}-crop-${(index + 1).toString().padStart(2, '0')}.png`
			)
		]),
		'enriched-owner-camera-underlay-sundrop-south.png',
		'enriched-owner-camera-underlay-crossroads-north.png',
		'enriched-owner-camera-underlay-crossroads-south.png',
		'enriched-owner-crossroads.png',
		'underlay-sundrop-north-south.png',
		'underlay-crossroads-north-south.png',
		'underlay-family-handoff.png',
		'detail-sundrop-intersection.png',
		'detail-sundrop-west.png',
		'detail-sundrop-center.png',
		'detail-sundrop-east.png',
		'detail-sundrop-sides-corners.png',
		'hero-house-edge-north.png',
		'hero-house-edge-east.png',
		'hero-house-edge-south.png',
		'hero-house-edge-west.png',
		'matched-sundrop-richness.png',
		'wildwood-forest-lane.png',
		...MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.map(
			(_, index) => `blocker-row-${(index + 1).toString().padStart(2, '0')}.png`
		)
	];
}

async function assertNoStaleReviewFiles(outputRoot: string): Promise<void> {
	const files = await listFiles(outputRoot);
	const expected = new Set<string>([
		'decoration-baseline.json',
		'decoration-candidate.json',
		...MEADOW_ENTRY_PAINTED_V2_ENRICHMENT_REVIEW_FILENAMES,
		REVIEW_MASTER,
		REVIEW_SUNDROP_CROP,
		REVIEW_CROSSROADS_CROP,
		...forestReviewFilenames()
	]);
	for (const file of files) {
		assert(expected.has(file), `Unlisted Meadow Entry review artifact: ${file}`);
	}
}

async function compareOrWrite(path: string, bytes: Buffer, check: boolean): Promise<void> {
	if (check) {
		const actual = await readFile(path).catch((error) => {
			throw new Error(`Meadow Entry review artifact is missing: ${path}`, { cause: error });
		});
		assert(actual.equals(bytes), `Meadow Entry review artifact is stale: ${path}`);
		return;
	}
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, bytes);
}

async function compareOrWriteArtifacts(
	outputRoot: string,
	artifacts: readonly ReviewArtifact[],
	check: boolean
): Promise<void> {
	const paths = new Set<string>();
	for (const artifact of artifacts) {
		assert(
			!paths.has(artifact.relativePath),
			`Duplicate Meadow Entry review artifact: ${artifact.relativePath}`
		);
		paths.add(artifact.relativePath);
		await compareOrWrite(join(outputRoot, artifact.relativePath), artifact.bytes, check);
	}
}

async function assertReviewOutputRootExists(outputRoot: string): Promise<void> {
	try {
		await readdir(outputRoot, { withFileTypes: true });
	} catch (error) {
		throw new Error(`Meadow Entry review output root is missing: ${outputRoot}`, { cause: error });
	}
}

async function assembleSources(
	repositoryRoot: string,
	includeScenery: boolean
): Promise<AssemblyResult> {
	const sourcePanels = await readAssemblyPanels(repositoryRoot);
	let enrichedPanels: readonly MeadowEntryDetailDecodedPanel[] = sourcePanels;
	let masks: MeadowEntryPaintedV2SceneryMaskSet | undefined;
	let inserts: readonly DecodedMeadowEntryPaintedV2SceneryInsert[] | undefined;
	if (includeScenery) {
		masks = buildMeadowEntryPaintedV2SceneryMaskSet(repositoryRoot);
		inserts = await readSceneryInserts(repositoryRoot, sourcePanels);
		const beforeById = new Map(sourcePanels.map((panel) => [panel.id, panel]));
		const baked = enrichMeadowEntryPaintedV2Sources(sourcePanels, inserts, masks);
		enrichedPanels = baked.panels;
		for (const panel of enrichedPanels) {
			const before = beforeById.get(panel.id);
			if (before === undefined || before.rgba.data.equals(panel.rgba.data)) continue;
			for (let localY = 0; localY < panel.rgba.height; localY += 1) {
				for (let localX = 0; localX < panel.rgba.width; localX += 1) {
					const offset = (localY * panel.rgba.width + localX) * 4;
					let changed = false;
					for (let channel = 0; channel < 3; channel += 1) {
						if (before.rgba.data[offset + channel] !== panel.rgba.data[offset + channel])
							changed = true;
					}
					if (!changed) continue;
					const worldX = panel.bounds.left + localX;
					const worldY = panel.bounds.top + localY;
					const maskOffset = worldY * masks.width + worldX;
					assert(
						masks.sceneryAllowed[maskOffset] === 1,
						`Scenery bake changed a non-scenery pixel: ${panel.id}`
					);
					assert(
						masks.otherProtected[maskOffset] === 0,
						`Scenery bake changed a protected pixel: ${panel.id}`
					);
				}
			}
		}
	}
	const specs = new Map(MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.map((spec) => [spec.id, spec]));
	const underlays: MeadowEntryUnderlayDecodedPanel[] = enrichedPanels
		.filter((panel) => specs.get(panel.id)?.role === 'underlay')
		.map((panel) => ({ id: panel.id, bounds: panel.bounds, rgba: panel.rgba }));
	const requiredUnderlayIds = [
		'camera-underlay-sundrop-north',
		'camera-underlay-sundrop-south',
		'camera-underlay-crossroads-north',
		'camera-underlay-crossroads-south'
	] as const;
	assert(underlays.length === requiredUnderlayIds.length, 'Underlay source registry is not sealed');
	const underlay = await assembleMeadowEntryPaintedV2Underlay({
		width: 6_400,
		height: 6_400,
		panels: underlays,
		northSouthPairs: [
			{
				northId: requiredUnderlayIds[0],
				southId: requiredUnderlayIds[1],
				bounds: { left: 0, top: 4736, right: 3200, bottom: 4864 }
			},
			{
				northId: requiredUnderlayIds[2],
				southId: requiredUnderlayIds[3],
				bounds: { left: 2368, top: 3776, right: 5568, bottom: 3904 }
			}
		],
		familyHandoff: {
			sundropPanelIds: [requiredUnderlayIds[0], requiredUnderlayIds[1]],
			crossroadsPanelIds: [requiredUnderlayIds[2], requiredUnderlayIds[3]],
			bounds: { left: 2368, top: 3200, right: 3200, bottom: 5440 }
		}
	});
	const detailPanels = enrichedPanels.filter((panel) => specs.get(panel.id)?.role === 'detail');
	compositeMeadowEntryDetailPanels(underlay, detailPanels, MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS);
	for (const crop of MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS) {
		for (let y = crop.bounds.top; y < crop.bounds.bottom; y += 1) {
			for (let x = crop.bounds.left; x < crop.bounds.right; x += 1) {
				assert(
					underlay.data[(y * underlay.width + x) * 4 + 3] === 255,
					`Review master crop is not opaque: ${crop.id}`
				);
			}
		}
	}
	return {
		artifacts: await reviewMasterArtifacts(underlay),
		master: underlay,
		enrichedPanels,
		masks,
		inserts
	};
}

function maskCount(mask: Uint8Array): number {
	let count = 0;
	for (const value of mask) count += value;
	return count;
}

function maskInventoryArtifact(
	controls: ControlContext,
	masks: MeadowEntryPaintedV2SceneryMaskSet,
	inserts: readonly DecodedMeadowEntryPaintedV2SceneryInsert[]
): ReviewArtifact {
	const maskEntries = Object.fromEntries(
		Object.entries({
			otherProtected: masks.otherProtected,
			groundAllowed: masks.groundAllowed,
			sceneryAllowed: masks.sceneryAllowed,
			hedgeAllowed: masks.hedgeAllowed,
			woodlandAllowed: masks.woodlandAllowed
		}).map(([name, mask]) => [
			name,
			{ sha256: sha256(mask), pixels: maskCount(mask), width: masks.width, height: masks.height }
		])
	);
	return {
		relativePath: 'mask-inventory.json',
		bytes: stableJson({
			version: 1,
			width: masks.width,
			height: masks.height,
			combinedControlFingerprint: controls.combinedControlFingerprint,
			sourceHashes: masks.sourceHashes,
			masks: maskEntries,
			insertIds: inserts.map(({ id }) => id),
			generatedInsertIds: INSERT_REVIEW_IDS,
			virtualInsertIds: [...VIRTUAL_INSERT_IDS],
			blockerIds: MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.map(({ sourceId }) => sourceId),
			protectedOverlapPixels: 0,
			classOverlapPixels: 0,
			energyRows: controls.tiles.length
		})
	};
}

async function evidenceDescriptors(
	artifacts: readonly ReviewArtifact[]
): Promise<Readonly<Record<string, EvidenceDescriptor>>> {
	const descriptors: Record<string, EvidenceDescriptor> = {};
	for (const artifact of artifacts) {
		if (!artifact.relativePath.endsWith('.png')) continue;
		const metadata = await sharp(artifact.bytes).metadata();
		assert(
			metadata.width !== undefined && metadata.height !== undefined,
			`Evidence image dimensions are missing: ${artifact.relativePath}`
		);
		descriptors[artifact.relativePath] = {
			sha256: sha256(artifact.bytes),
			bytes: artifact.bytes.byteLength,
			width: metadata.width,
			height: metadata.height
		};
	}
	return descriptors;
}

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));
	const repositoryRoot = resolve(dirname(new URL(import.meta.url).pathname), '..');
	const outputRoot = resolve(repositoryRoot, options.outputRoot);
	ensureReviewRoot(repositoryRoot, outputRoot);
	if (options.check) await assertReviewOutputRootExists(outputRoot);
	else await mkdir(outputRoot, { recursive: true });
	const artifacts: ReviewArtifact[] = [];
	const assembly = options.assembleSources
		? await assembleSources(repositoryRoot, options.mode === 'candidate')
		: undefined;
	if (assembly) artifacts.push(...assembly.artifacts);
	const assembledMaster = assembly?.artifacts.find(
		({ relativePath }) => relativePath === REVIEW_MASTER
	);
	assert(
		!options.assembleSources || assembledMaster,
		'Assembled Meadow Entry review master was not produced'
	);
	const masterPath = assembledMaster
		? join(outputRoot, REVIEW_MASTER)
		: resolve(repositoryRoot, options.master);
	const master = assembledMaster?.bytes ?? (await readFile(masterPath));
	const decoded = await decodeMeadowEntryRgba(master);
	const controls = await readRenderedControls(repositoryRoot, assembly?.masks);
	const energy = measureMeadowEntryPaintedV2DecorationEnergy(
		decoded,
		controls.eligibility,
		controls.tiles
	);
	const measured = energyWithMode(energy, options.mode);
	if (options.mode === 'candidate') assertMeadowEntryPaintedV2DecorationEnergy(measured);
	if (options.mode === 'candidate' && options.contactSheets)
		artifacts.push(...(await writeDensitySheets(decoded, controls.tiles)));
	if (options.mode === 'candidate' && options.sourceReview) {
		assert(assembly?.masks !== undefined, 'Candidate source review requires scenery masks');
		assert(assembly.inserts !== undefined, 'Candidate source review requires scenery inserts');
		artifacts.push(
			...(await nativeReviewArtifacts(
				repositoryRoot,
				decoded,
				controls,
				assembly.enrichedPanels,
				assembly.inserts
			))
		);
		artifacts.push(maskInventoryArtifact(controls, assembly.masks, assembly.inserts));
		const masterPng = assembledMaster?.bytes ?? master;
		artifacts.push({
			relativePath: REVIEW_OVERVIEW,
			bytes: await sharp(masterPng).resize(1_600, 1_600, { fit: 'cover' }).png().toBuffer()
		});
	}
	let evidence: Readonly<Record<string, EvidenceDescriptor>> = {};
	if (options.mode === 'candidate' && options.sourceReview)
		evidence = await evidenceDescriptors(artifacts);
	let result = payload(
		options.mode,
		options.sourceReview,
		relative(repositoryRoot, masterPath),
		master,
		decoded,
		controls,
		measured,
		evidence
	);
	result = await patchCandidateSourceHashes(result, repositoryRoot);
	const jsonName =
		options.mode === 'baseline' ? 'decoration-baseline.json' : 'decoration-candidate.json';
	artifacts.push({ relativePath: jsonName, bytes: stableJson(result) });
	if (options.mode === 'candidate' && options.sourceReview)
		artifacts.push({
			relativePath: 'evidence-manifest.json',
			bytes: stableJson({ version: 1, files: evidence })
		});
	await compareOrWriteArtifacts(outputRoot, artifacts, options.check);
	await assertNoStaleReviewFiles(outputRoot);
	console.log(
		`${options.mode} decoration review: ${controls.tiles.length} qualifying tiles, minimum=${energy.minimumRgbStep}, median=${energy.medianRgbStep}`
	);
}

if (import.meta.main) await main();

export { main as renderMeadowEntryPaintedV2EnrichmentReview };

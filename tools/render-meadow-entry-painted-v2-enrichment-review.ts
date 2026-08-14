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
	decodeMeadowEntryAlpha,
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
	type MeadowEntryPaintedV2DecodedAlphaMask,
	type MeadowEntryPaintedV2DecorationEnergy,
	type MeadowEntryPaintedV2DecorationEligibility,
	type MeadowEntryPaintedV2DecorationTile
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review';

const DEFAULT_MASTER =
	'artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png';
const DEFAULT_OUTPUT_ROOT = 'docs/superpowers/reports/img/hpa-586-painted-v2-enrichment';
const REVIEW_MASTER = 'masters/meadow-entry-painted-v2-pilot-base-master.png';
const REVIEW_SUNDROP_CROP = 'exports/painted-v2-sundrop-camera-base.png';
const REVIEW_CROSSROADS_CROP = 'exports/painted-v2-crossroads-camera-base.png';
const CONTROL_MASK_FILENAMES = {
	protectedLive: 'meadow-entry-protected-live-mask.svg',
	buildingFootprint: 'meadow-entry-building-footprint-mask.svg',
	entranceTransition: 'meadow-entry-entrance-transition-mask.svg',
	rewardDiscovery: 'meadow-entry-reward-discovery-mask.svg',
	semanticAnchor: 'meadow-entry-semantic-anchor-mask.svg'
} as const;
const TERRAIN_FILENAME = 'meadow-entry-terrain-path-mask.svg';
const SOURCE_REVIEW_PANEL_IDS = new Set([
	'camera-underlay-sundrop-north',
	'camera-underlay-sundrop-south',
	'camera-underlay-crossroads-north',
	'camera-underlay-crossroads-south',
	'sundrop-north',
	'sundrop-south',
	'village-crossroads-connector',
	'crossroads'
]);

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
	combinedControlFingerprint: string;
}

interface ReviewArtifact {
	readonly relativePath: string;
	readonly bytes: Buffer;
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
		readonly routeCoreRectCount: number;
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

function parseSvgAttributes(source: string): readonly Record<string, string>[] {
	const rects: Record<string, string>[] = [];
	for (const match of source.matchAll(/<rect\b([^>]*)\/>/g)) {
		const attrs: Record<string, string> = {};
		for (const attr of match[1]!.matchAll(/([:\w-]+)="([^"]*)"/g)) attrs[attr[1]!] = attr[2]!;
		rects.push(attrs);
	}
	return rects;
}

function parseTerrainRects(svg: string): readonly PixelBounds[] {
	return parseSvgAttributes(svg).flatMap((attrs, index) => {
		if (!attrs['data-id']?.startsWith('ground-patch:')) return [];
		const x = Number(attrs.x);
		const y = Number(attrs.y);
		const width = Number(attrs.width);
		const height = Number(attrs.height);
		assert(
			[x, y, width, height].every(Number.isInteger) && width > 0 && height > 0,
			`Terrain SVG rectangle ${index} is invalid`
		);
		return [{ left: x, top: y, right: x + width, bottom: y + height }];
	});
}

async function readRenderedControls(repositoryRoot: string): Promise<ControlContext> {
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
	const alphaMask = async (filename: string): Promise<MeadowEntryPaintedV2DecodedAlphaMask> => {
		const decoded = await decodeMeadowEntryAlpha(controlBytes[filename]!);
		return { width: decoded.width, height: decoded.height, alpha: decoded.alpha };
	};
	const [protectedLive, buildingFootprint, entranceTransition, rewardDiscovery, semanticAnchor] =
		await Promise.all(Object.values(CONTROL_MASK_FILENAMES).map(alphaMask));
	const terrainSvg = Buffer.from(controlBytes[TERRAIN_FILENAME]!);
	const terrainRects = parseTerrainRects(terrainSvg.toString('utf8'));
	const eligibility = buildMeadowEntryPaintedV2DecorationEligibility({
		width: input.worldBounds.right - input.worldBounds.left,
		height: input.worldBounds.bottom - input.worldBounds.top,
		tileSizePx: 512,
		cropUnion: MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ bounds }) => bounds),
		masks: {
			protectedLive,
			buildingFootprint,
			entranceTransition,
			rewardDiscovery,
			semanticAnchor
		},
		terrainRects,
		metadata: {
			controlSvgHashes: controlHashes,
			parserPolicy: 'rect-data-id-ground-patch-x-y-width-height-in-document-order',
			sourceRectangleBounds: terrainRects,
			combinedControlFingerprint: computeMeadowEntryCombinedControlFingerprint(input)
		}
	});
	const tiles = collectMeadowEntryPaintedV2DecorationTiles(eligibility);
	return {
		eligibility,
		tiles,
		controls: rendered,
		controlHashes,
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
	energy: MeadowEntryPaintedV2DecorationEnergy
): ReviewPayload {
	const sourcePanels =
		mode === 'candidate' && sourceReview
			? MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.filter(({ id }) => id !== 'hero-house-frontage').map(
					(panel) => ({
						id: panel.id,
						path: panel.normalizedPath,
						sha256: '',
						bytes: 0,
						width: panel.expectedDimensions.width,
						height: panel.expectedDimensions.height
					})
				)
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
			sourceHashes: controls.controlHashes,
			parserPolicy: 'rect-data-id-ground-patch-x-y-width-height-in-document-order'
		},
		eligibility: {
			tileSizePx: controls.eligibility.tileSizePx,
			qualifyingTileCount: controls.tiles.length,
			sheetTileCounts: energy.sheetTileCounts,
			cropUnion: controls.eligibility.cropUnion,
			protectionMargins: controls.eligibility.protectionMargins,
			routeCoreRectCount: controls.eligibility.routeCoreRects.length
		},
		energy,
		tiles: controls.tiles,
		...(sourcePanels ? { sourcePanels } : {}),
		...(mode === 'candidate' && sourceReview ? { fullPanelOriginalDetailInspection: true } : {})
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

async function nativeReviewArtifacts(
	repositoryRoot: string,
	decoded: DecodedMeadowEntryRgba,
	controls: ControlContext
): Promise<readonly ReviewArtifact[]> {
	const artifacts: ReviewArtifact[] = [];
	for (const panel of MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS) {
		if (!SOURCE_REVIEW_PANEL_IDS.has(panel.id)) continue;
		const nativePanel = await readNativePanel(repositoryRoot, panel);
		const anchors = [
			'top-left',
			'top-right',
			'bottom-left',
			'bottom-right',
			'middle-center'
		] as const;
		artifacts.push({
			relativePath: `panel-${panel.id}-quadrants-center.png`,
			bytes: await composeContactSheet(
				nativePanel,
				anchors.map((anchor) => reviewPatchBounds(nativePanel.width, nativePanel.height, anchor)),
				3
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
		'detail-connector-crossroads-intersection.png': {
			left: 2880,
			top: 4480,
			right: 3392,
			bottom: 4768
		},
		'detail-connector-crossroads-west.png': { left: 2880, top: 4480, right: 3008, bottom: 4768 },
		'detail-connector-crossroads-middle.png': { left: 3072, top: 4480, right: 3200, bottom: 4768 },
		'detail-connector-crossroads-east.png': { left: 3264, top: 4480, right: 3392, bottom: 4768 },
		'detail-connector-crossroads-sides-corners.png': {
			left: 2880,
			top: 4480,
			right: 3392,
			bottom: 4768
		},
		'hero-house-edges.png': { left: 384, top: 5312, right: 1280, bottom: 6144 }
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
	const overlayFiles = {
		'protected-live-atlas.png': CONTROL_MASK_FILENAMES.protectedLive,
		'region-material-overlay.png': 'meadow-entry-region-mask.svg',
		'route-centerline-overlay.png': TERRAIN_FILENAME
	} as const;
	for (const [filename, controlFilename] of Object.entries(overlayFiles)) {
		const svg = Buffer.from(controls.controls[controlFilename] ?? '');
		artifacts.push({
			relativePath: filename,
			bytes: await sharp(svg).resize(1_600, 1_600, { fit: 'fill' }).png().toBuffer()
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

async function assertNoStaleReviewFiles(outputRoot: string): Promise<void> {
	const files = await listFiles(outputRoot);
	const expected = new Set<string>([
		'decoration-baseline.json',
		'decoration-candidate.json',
		...MEADOW_ENTRY_PAINTED_V2_ENRICHMENT_REVIEW_FILENAMES,
		REVIEW_MASTER,
		REVIEW_SUNDROP_CROP,
		REVIEW_CROSSROADS_CROP
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

async function assembleSources(repositoryRoot: string): Promise<readonly ReviewArtifact[]> {
	const decodedPanels = await Promise.all(
		MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.map(async (spec) => {
			const bytes = await readFile(join(repositoryRoot, spec.normalizedPath));
			const rgba = await decodeMeadowEntryRgba(bytes);
			assert(
				rgba.width === spec.expectedDimensions.width &&
					rgba.height === spec.expectedDimensions.height,
				`Source panel dimensions drifted: ${spec.id}`
			);
			return { spec, bytes: rgba };
		})
	);
	const underlays: MeadowEntryUnderlayDecodedPanel[] = decodedPanels
		.filter(({ spec }) => spec.role === 'underlay')
		.map(({ spec, bytes }) => ({ id: spec.id, bounds: spec.bounds, rgba: bytes }));
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
	const detailPanels: MeadowEntryDetailDecodedPanel[] = decodedPanels
		.filter(({ spec }) => spec.role === 'detail')
		.map(({ spec, bytes }) => ({
			id: spec.id,
			bounds: spec.bounds,
			rgba: bytes,
			assemblyPriority: spec.assemblyPriority
		}));
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
	return reviewMasterArtifacts(underlay);
}

async function main(): Promise<void> {
	const options = parseArgs(process.argv.slice(2));
	const repositoryRoot = resolve(dirname(new URL(import.meta.url).pathname), '..');
	const outputRoot = resolve(repositoryRoot, options.outputRoot);
	ensureReviewRoot(repositoryRoot, outputRoot);
	if (options.check) await assertReviewOutputRootExists(outputRoot);
	else await mkdir(outputRoot, { recursive: true });
	const artifacts: ReviewArtifact[] = [];
	if (options.assembleSources) artifacts.push(...(await assembleSources(repositoryRoot)));
	const masterPath = resolve(repositoryRoot, options.master);
	const master = await readFile(masterPath);
	const decoded = await decodeMeadowEntryRgba(master);
	const controls = await readRenderedControls(repositoryRoot);
	const energy = measureMeadowEntryPaintedV2DecorationEnergy(
		decoded,
		controls.eligibility,
		controls.tiles
	);
	const measured = energyWithMode(energy, options.mode);
	if (options.mode === 'candidate') assertMeadowEntryPaintedV2DecorationEnergy(measured);
	let result = payload(
		options.mode,
		options.sourceReview,
		relative(repositoryRoot, masterPath),
		master,
		decoded,
		controls,
		measured
	);
	result = await patchCandidateSourceHashes(result, repositoryRoot);
	const jsonName =
		options.mode === 'baseline' ? 'decoration-baseline.json' : 'decoration-candidate.json';
	artifacts.push({ relativePath: jsonName, bytes: stableJson(result) });
	if (options.mode === 'candidate' && options.contactSheets)
		artifacts.push(...(await writeDensitySheets(decoded, controls.tiles)));
	if (options.mode === 'candidate' && options.sourceReview)
		artifacts.push(...(await nativeReviewArtifacts(repositoryRoot, decoded, controls)));
	await compareOrWriteArtifacts(outputRoot, artifacts, options.check);
	await assertNoStaleReviewFiles(outputRoot);
	console.log(
		`${options.mode} decoration review: ${controls.tiles.length} qualifying tiles, minimum=${energy.minimumRgbStep}, median=${energy.medianRgbStep}`
	);
}

if (import.meta.main) await main();

export { main as renderMeadowEntryPaintedV2EnrichmentReview };

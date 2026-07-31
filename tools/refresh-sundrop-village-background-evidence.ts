import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import sharp from 'sharp';

interface ArtControlManifest {
	readonly structuralInputs: {
		readonly source: {
			readonly width: number;
			readonly height: number;
			readonly tileSize: number;
			readonly layers: {
				readonly regions: readonly string[];
			};
			readonly objects: {
				readonly transitions: readonly {
					readonly id: string;
					readonly col: number;
					readonly row: number;
				}[];
			};
		};
	};
}

interface Crop {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

const ROOT = process.cwd();
const EVIDENCE_DIRECTORY = resolve(ROOT, 'docs/superpowers/reports/img/hpa-307');
const BACKGROUND_PATH = resolve(ROOT, 'public/game/assets/regions/sundrop-village-background.png');
const CONTROL_PATH = resolve(EVIDENCE_DIRECTORY, 'village-art-control.svg');
const MANIFEST_PATH = resolve(EVIDENCE_DIRECTORY, 'village-art-control-manifest.json');
const EVIDENCE_PNG_OPTIONS = {
	palette: true,
	colours: 256,
	dither: 0.8,
	compressionLevel: 9,
	force: true
} as const;

function assertManifest(value: unknown): asserts value is ArtControlManifest {
	if (!value || typeof value !== 'object') {
		throw new Error('Sundrop Village art-control manifest must be an object');
	}
	const manifest = value as Partial<ArtControlManifest>;
	const source = manifest.structuralInputs?.source;
	if (
		!source ||
		!Number.isInteger(source.width) ||
		!Number.isInteger(source.height) ||
		!Number.isInteger(source.tileSize) ||
		!Array.isArray(source.layers?.regions) ||
		!Array.isArray(source.objects?.transitions)
	) {
		throw new Error('Sundrop Village art-control manifest is missing source geometry');
	}
}

function clampCrop(crop: Crop, canvasWidth: number, canvasHeight: number): Crop {
	const left = Math.max(0, Math.min(crop.left, canvasWidth - 1));
	const top = Math.max(0, Math.min(crop.top, canvasHeight - 1));
	return {
		left,
		top,
		width: Math.max(1, Math.min(crop.width, canvasWidth - left)),
		height: Math.max(1, Math.min(crop.height, canvasHeight - top))
	};
}

function districtCrop(
	regions: readonly string[],
	glyphs: ReadonlySet<string>,
	tileSize: number,
	canvasWidth: number,
	canvasHeight: number
): Crop {
	let minimumColumn = Number.POSITIVE_INFINITY;
	let minimumRow = Number.POSITIVE_INFINITY;
	let maximumColumn = Number.NEGATIVE_INFINITY;
	let maximumRow = Number.NEGATIVE_INFINITY;

	for (let row = 0; row < regions.length; row += 1) {
		for (let column = 0; column < (regions[row]?.length ?? 0); column += 1) {
			if (!glyphs.has(regions[row]?.[column] ?? '.')) continue;
			minimumColumn = Math.min(minimumColumn, column);
			minimumRow = Math.min(minimumRow, row);
			maximumColumn = Math.max(maximumColumn, column);
			maximumRow = Math.max(maximumRow, row);
		}
	}

	if (!Number.isFinite(minimumColumn)) {
		throw new Error(`No region cells found for glyphs ${[...glyphs].join(',')}`);
	}

	const padding = tileSize * 2;
	return clampCrop(
		{
			left: minimumColumn * tileSize - padding,
			top: minimumRow * tileSize - padding,
			width: (maximumColumn - minimumColumn + 1) * tileSize + padding * 2,
			height: (maximumRow - minimumRow + 1) * tileSize + padding * 2
		},
		canvasWidth,
		canvasHeight
	);
}

async function extractPng(source: Buffer, crop: Crop): Promise<Buffer> {
	return sharp(source).extract(crop).png(EVIDENCE_PNG_OPTIONS).toBuffer();
}

async function writePng(name: string, source: Buffer): Promise<void> {
	await sharp(source).png(EVIDENCE_PNG_OPTIONS).toFile(resolve(EVIDENCE_DIRECTORY, name));
}

async function montage(
	panels: readonly Buffer[],
	panelWidth: number,
	panelHeight: number,
	columns: number
): Promise<Buffer> {
	const rows = Math.ceil(panels.length / columns);
	const prepared = await Promise.all(
		panels.map((panel) =>
			sharp(panel)
				.resize(panelWidth, panelHeight, {
					fit: 'contain',
					background: { r: 25, g: 30, b: 24, alpha: 1 }
				})
				.png(EVIDENCE_PNG_OPTIONS)
				.toBuffer()
		)
	);

	return sharp({
		create: {
			width: panelWidth * columns,
			height: panelHeight * rows,
			channels: 4,
			background: { r: 25, g: 30, b: 24, alpha: 1 }
		}
	})
		.composite(
			prepared.map((input, index) => ({
				input,
				left: (index % columns) * panelWidth,
				top: Math.floor(index / columns) * panelHeight
			}))
		)
		.png(EVIDENCE_PNG_OPTIONS)
		.toBuffer();
}

async function main(): Promise<void> {
	const manifestValue: unknown = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
	assertManifest(manifestValue);
	const source = manifestValue.structuralInputs.source;
	const canvasWidth = source.width * source.tileSize;
	const canvasHeight = source.height * source.tileSize;
	const backgroundMetadata = await sharp(BACKGROUND_PATH).metadata();
	if (backgroundMetadata.width !== canvasWidth || backgroundMetadata.height !== canvasHeight) {
		throw new Error(
			`Sundrop Village background must be ${canvasWidth}x${canvasHeight}; received ${backgroundMetadata.width ?? 'unknown'}x${backgroundMetadata.height ?? 'unknown'}`
		);
	}

	await mkdir(EVIDENCE_DIRECTORY, { recursive: true });
	const whole = await sharp(BACKGROUND_PATH)
		.composite([{ input: CONTROL_PATH }])
		.png(EVIDENCE_PNG_OPTIONS)
		.toBuffer();
	await writePng('village-background-alignment-whole.png', whole);

	const districtEvidence = [
		['village-background-home-yard.png', new Set(['H'])],
		['village-background-well-plaza.png', new Set(['P'])],
		['village-background-market-blacksmith.png', new Set(['M'])],
		['village-background-north-residences-guild.png', new Set(['N', 'G'])],
		['village-background-shrine-garden-reward.png', new Set(['S'])],
		['village-background-east-gate-crossroads.png', new Set(['E', 'C'])]
	] as const;
	for (const [name, glyphs] of districtEvidence) {
		await writePng(
			name,
			await extractPng(
				whole,
				districtCrop(source.layers.regions, glyphs, source.tileSize, canvasWidth, canvasHeight)
			)
		);
	}

	const doorwayPanels = await Promise.all(
		source.objects.transitions.map(({ col, row }) =>
			extractPng(
				whole,
				clampCrop(
					{
						left: col * source.tileSize + source.tileSize / 2 - 160,
						top: row * source.tileSize + source.tileSize / 2 - 120,
						width: 320,
						height: 240
					},
					canvasWidth,
					canvasHeight
				)
			)
		)
	);
	await writePng(
		'village-background-doorway-transition-approaches.png',
		await montage(doorwayPanels, 320, 240, 2)
	);

	const edgeSize = 512;
	const edgePanels = await Promise.all(
		[
			{ left: (canvasWidth - edgeSize) / 2, top: 0, width: edgeSize, height: edgeSize },
			{
				left: (canvasWidth - edgeSize) / 2,
				top: canvasHeight - edgeSize,
				width: edgeSize,
				height: edgeSize
			},
			{ left: 0, top: (canvasHeight - edgeSize) / 2, width: edgeSize, height: edgeSize },
			{
				left: canvasWidth - edgeSize,
				top: (canvasHeight - edgeSize) / 2,
				width: edgeSize,
				height: edgeSize
			}
		].map((crop) => extractPng(whole, crop))
	);
	await writePng(
		'village-background-all-four-edges.png',
		await montage(edgePanels, edgeSize, edgeSize, 2)
	);

	console.log(`background=${BACKGROUND_PATH}`);
	console.log(`control=${CONTROL_PATH}`);
	console.log(`evidenceDirectory=${EVIDENCE_DIRECTORY}`);
	console.log('evidenceFiles=9');
}

await main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});

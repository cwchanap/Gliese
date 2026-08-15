import type { DecodedMeadowEntryRgba } from './meadow-entry-png';
import { MEADOW_ENTRY_PROTECTION_MARGINS } from './meadow-entry-bake-ownership';
import type { Insets, PixelBounds } from './meadow-entry-authoring-types';
import { meadowEntryNearestRank } from './meadow-entry-detail-boundary-metrics';
import type { MeadowEntryPaintedV2SceneryMaskSet } from './meadow-entry-painted-v2-scenery-bake';

export const MEADOW_ENTRY_PAINTED_V2_DECORATION_TILE_SIZE_PX = 512;
export const MEADOW_ENTRY_PAINTED_V2_DECORATION_ELIGIBILITY_RATIO = 0.5;
export const MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MINIMUM_FLOOR = 1.5;
export const MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MEDIAN_FLOOR =
	Number('3.1843126049067515');
export const MEADOW_ENTRY_PAINTED_V2_DECORATION_SHEET_SIZE = 16;

export const MEADOW_ENTRY_PAINTED_V2_ENRICHMENT_REVIEW_FILENAMES = Object.freeze([
	'decoration-candidate.json',
	'decoration-density-01.png',
	'decoration-density-02.png',
	'decoration-density-03.png',
	'decoration-density-04.png',
	'decoration-density-05.png',
	'panel-camera-underlay-sundrop-north-quadrants-center.png',
	'panel-camera-underlay-sundrop-south-quadrants-center.png',
	'panel-camera-underlay-crossroads-north-quadrants-center.png',
	'panel-camera-underlay-crossroads-south-quadrants-center.png',
	'panel-sundrop-north-quadrants-center.png',
	'panel-sundrop-south-quadrants-center.png',
	'panel-village-crossroads-connector-quadrants-center.png',
	'panel-crossroads-quadrants-center.png',
	'underlay-sundrop-north-south.png',
	'underlay-crossroads-north-south.png',
	'underlay-family-handoff.png',
	'detail-sundrop-intersection.png',
	'detail-sundrop-west.png',
	'detail-sundrop-center.png',
	'detail-sundrop-east.png',
	'detail-sundrop-sides-corners.png',
	'detail-connector-crossroads-intersection.png',
	'detail-connector-crossroads-west.png',
	'detail-connector-crossroads-middle.png',
	'detail-connector-crossroads-east.png',
	'detail-connector-crossroads-sides-corners.png',
	'hero-house-edges.png',
	'protected-live-atlas.png',
	'region-material-overlay.png',
	'route-centerline-overlay.png'
] as const);

export interface MeadowEntryPaintedV2DecorationEligibilityInput {
	readonly width: number;
	readonly height: number;
	readonly tileSizePx?: number;
	readonly cropUnion: readonly PixelBounds[];
	readonly sceneryMasks: MeadowEntryPaintedV2SceneryMaskSet;
	readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface MeadowEntryPaintedV2DecorationEligibility {
	readonly width: number;
	readonly height: number;
	readonly tileSizePx: number;
	readonly cropUnion: readonly PixelBounds[];
	readonly insideCropUnion: Uint8Array;
	readonly otherProtected: Uint8Array;
	readonly groundAllowed: Uint8Array;
	readonly sceneryAllowed: Uint8Array;
	readonly hedgeAllowed: Uint8Array;
	readonly woodlandAllowed: Uint8Array;
	readonly sourceHashes: Readonly<Record<string, string>>;
	readonly eligible: Uint8Array;
	readonly protectionMargins: Readonly<Insets>;
	readonly metadata: Readonly<Record<string, unknown>>;
}

export interface MeadowEntryPaintedV2DecorationTile {
	readonly index: number;
	readonly id: string;
	readonly row: number;
	readonly column: number;
	readonly sheetIndex: number;
	readonly sheetOffset: number;
	readonly bounds: PixelBounds;
	readonly cropUnionPixels: number;
	readonly eligiblePixels: number;
	readonly eligibilityRatio: number;
}

export interface MeadowEntryPaintedV2DecodedImage {
	readonly width: number;
	readonly height: number;
	readonly data: Uint8Array;
}

export interface MeadowEntryPaintedV2DecorationEnergyTile {
	readonly index: number;
	readonly id: string;
	readonly rgbStep: number;
	readonly pairCount: number;
}

export interface MeadowEntryPaintedV2DecorationEnergy {
	readonly mode?: 'baseline' | 'candidate';
	readonly tileSizePx: number;
	readonly qualifyingTileCount: number;
	readonly sheetTileCounts: readonly number[];
	readonly candidateMinimumFloor: number;
	readonly candidateMedianFloor: number;
	readonly minimumRgbStep: number;
	readonly medianRgbStep: number;
	readonly tiles: readonly MeadowEntryPaintedV2DecorationEnergyTile[];
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function assertDimensions(width: number, height: number, label: string): void {
	assert(Number.isInteger(width) && width > 0, `${label} width is invalid`);
	assert(Number.isInteger(height) && height > 0, `${label} height is invalid`);
}

function assertBounds(bounds: PixelBounds, width: number, height: number, label: string): void {
	assert(
		Number.isInteger(bounds.left) &&
			Number.isInteger(bounds.top) &&
			Number.isInteger(bounds.right) &&
			Number.isInteger(bounds.bottom) &&
			bounds.left >= 0 &&
			bounds.top >= 0 &&
			bounds.right <= width &&
			bounds.bottom <= height &&
			bounds.right > bounds.left &&
			bounds.bottom > bounds.top,
		`${label} bounds are invalid`
	);
}

function fillRect(mask: Uint8Array, width: number, bounds: PixelBounds): void {
	for (let y = bounds.top; y < bounds.bottom; y += 1) {
		let offset = y * width + bounds.left;
		for (let x = bounds.left; x < bounds.right; x += 1) {
			mask[offset] = 1;
			offset += 1;
		}
	}
}

function validateNamedSceneryMasks(
	named: MeadowEntryPaintedV2SceneryMaskSet,
	width: number,
	height: number,
	groundAllowed: Uint8Array
): void {
	assert(
		named.width === width && named.height === height,
		'Named Meadow Entry scenery mask dimensions do not match eligibility'
	);
	const pixels = width * height;
	for (const [label, mask] of [
		['otherProtected', named.otherProtected],
		['groundAllowed', named.groundAllowed],
		['sceneryAllowed', named.sceneryAllowed],
		['hedgeAllowed', named.hedgeAllowed],
		['woodlandAllowed', named.woodlandAllowed]
	] as const) {
		assert(mask.byteLength === pixels, `${label} named mask dimensions are invalid`);
		for (const value of mask)
			assert(value === 0 || value === 1, `${label} named mask must be binary`);
	}
	for (let offset = 0; offset < pixels; offset += 1) {
		assert(
			named.groundAllowed[offset] === groundAllowed[offset],
			`Named ground-allowed mask drifted at pixel ${offset}`
		);
		assert(
			!(named.hedgeAllowed[offset] === 1 && named.woodlandAllowed[offset] === 1),
			`Named hedge and woodland masks overlap at pixel ${offset}`
		);
	}
}

export function buildMeadowEntryPaintedV2DecorationEligibility(
	input: MeadowEntryPaintedV2DecorationEligibilityInput
): MeadowEntryPaintedV2DecorationEligibility {
	assertDimensions(input.width, input.height, 'Meadow Entry decoration eligibility');
	const tileSizePx = input.tileSizePx ?? MEADOW_ENTRY_PAINTED_V2_DECORATION_TILE_SIZE_PX;
	assert(
		Number.isInteger(tileSizePx) && tileSizePx > 0,
		'Meadow Entry decoration tile size is invalid'
	);
	for (const [index, bounds] of input.cropUnion.entries()) {
		assertBounds(bounds, input.width, input.height, `Meadow Entry crop union ${index}`);
	}
	const pixels = input.width * input.height;
	const insideCropUnion = new Uint8Array(pixels);
	for (const bounds of input.cropUnion) fillRect(insideCropUnion, input.width, bounds);
	const named = input.sceneryMasks;
	assert(
		named.width === input.width && named.height === input.height,
		'Named Meadow Entry scenery mask dimensions do not match eligibility'
	);
	const groundAllowed = named.groundAllowed;
	validateNamedSceneryMasks(named, input.width, input.height, groundAllowed);
	return {
		width: input.width,
		height: input.height,
		tileSizePx,
		cropUnion: input.cropUnion.map((bounds) => ({ ...bounds })),
		insideCropUnion,
		otherProtected: named.otherProtected,
		groundAllowed,
		sceneryAllowed: named.sceneryAllowed,
		hedgeAllowed: named.hedgeAllowed,
		woodlandAllowed: named.woodlandAllowed,
		sourceHashes: named.sourceHashes,
		eligible: groundAllowed,
		protectionMargins: MEADOW_ENTRY_PROTECTION_MARGINS,
		metadata: Object.freeze({
			...(input.metadata ?? {}),
			protectionMargins: MEADOW_ENTRY_PROTECTION_MARGINS,
			eligibilityPredicate: 'groundAllowed'
		})
	};
}

export function collectMeadowEntryPaintedV2DecorationTiles(
	eligibility: MeadowEntryPaintedV2DecorationEligibility
): readonly MeadowEntryPaintedV2DecorationTile[] {
	assertDimensions(eligibility.width, eligibility.height, 'Meadow Entry decoration eligibility');
	assert(
		eligibility.eligible.byteLength === eligibility.width * eligibility.height,
		'Meadow Entry decoration eligibility mask dimensions are invalid'
	);
	const rows = Math.ceil(eligibility.height / eligibility.tileSizePx);
	const columns = Math.ceil(eligibility.width / eligibility.tileSizePx);
	const tiles: MeadowEntryPaintedV2DecorationTile[] = [];
	for (let row = 0; row < rows; row += 1) {
		for (let column = 0; column < columns; column += 1) {
			const bounds = {
				left: column * eligibility.tileSizePx,
				top: row * eligibility.tileSizePx,
				right: Math.min((column + 1) * eligibility.tileSizePx, eligibility.width),
				bottom: Math.min((row + 1) * eligibility.tileSizePx, eligibility.height)
			};
			let cropUnionPixels = 0;
			let eligiblePixels = 0;
			for (let y = bounds.top; y < bounds.bottom; y += 1) {
				for (let x = bounds.left; x < bounds.right; x += 1) {
					const offset = y * eligibility.width + x;
					if (eligibility.insideCropUnion[offset] === 0) continue;
					cropUnionPixels += 1;
					if (eligibility.eligible[offset] !== 0) eligiblePixels += 1;
				}
			}
			if (
				cropUnionPixels === 0 ||
				eligiblePixels / cropUnionPixels < MEADOW_ENTRY_PAINTED_V2_DECORATION_ELIGIBILITY_RATIO
			) {
				continue;
			}
			const index = tiles.length;
			tiles.push({
				index,
				id: `decoration-${index.toString().padStart(2, '0')}`,
				row,
				column,
				sheetIndex: Math.floor(index / MEADOW_ENTRY_PAINTED_V2_DECORATION_SHEET_SIZE),
				sheetOffset: index % MEADOW_ENTRY_PAINTED_V2_DECORATION_SHEET_SIZE,
				bounds,
				cropUnionPixels,
				eligiblePixels,
				eligibilityRatio: eligiblePixels / cropUnionPixels
			});
		}
	}
	return tiles;
}

function imagePixel(
	image: MeadowEntryPaintedV2DecodedImage,
	x: number,
	y: number
): readonly number[] {
	const offset = (y * image.width + x) * 4;
	return [image.data[offset] ?? 0, image.data[offset + 1] ?? 0, image.data[offset + 2] ?? 0];
}

export function measureMeadowEntryPaintedV2DecorationEnergy(
	image: MeadowEntryPaintedV2DecodedImage | DecodedMeadowEntryRgba,
	eligibility: MeadowEntryPaintedV2DecorationEligibility,
	tiles: readonly MeadowEntryPaintedV2DecorationTile[]
): MeadowEntryPaintedV2DecorationEnergy {
	assertDimensions(image.width, image.height, 'Meadow Entry decoration image');
	assert(
		image.width === eligibility.width && image.height === eligibility.height,
		'Meadow Entry decoration image dimensions do not match eligibility'
	);
	assert(
		image.data.byteLength === image.width * image.height * 4,
		'Meadow Entry decoration image RGBA dimensions are invalid'
	);
	const measured = tiles.map((tile) => {
		let sum = 0;
		let pairCount = 0;
		for (let y = tile.bounds.top; y < tile.bounds.bottom; y += 1) {
			for (let x = tile.bounds.left; x < tile.bounds.right; x += 1) {
				const offset = y * eligibility.width + x;
				if (eligibility.eligible[offset] === 0) continue;
				const first = imagePixel(image, x, y);
				if (x + 1 < tile.bounds.right && eligibility.eligible[offset + 1] !== 0) {
					const second = imagePixel(image, x + 1, y);
					sum +=
						(Math.abs(first[0]! - second[0]!) +
							Math.abs(first[1]! - second[1]!) +
							Math.abs(first[2]! - second[2]!)) /
						3;
					pairCount += 1;
				}
				if (y + 1 < tile.bounds.bottom && eligibility.eligible[offset + eligibility.width] !== 0) {
					const second = imagePixel(image, x, y + 1);
					sum +=
						(Math.abs(first[0]! - second[0]!) +
							Math.abs(first[1]! - second[1]!) +
							Math.abs(first[2]! - second[2]!)) /
						3;
					pairCount += 1;
				}
			}
		}
		return {
			index: tile.index,
			id: tile.id,
			rgbStep: pairCount === 0 ? 0 : sum / pairCount,
			pairCount
		};
	});
	const steps = measured.map(({ rgbStep }) => rgbStep);
	const sheetTileCounts = measured.reduce<number[]>((counts, tile) => {
		const sheet = Math.floor(tile.index / MEADOW_ENTRY_PAINTED_V2_DECORATION_SHEET_SIZE);
		counts[sheet] = (counts[sheet] ?? 0) + 1;
		return counts;
	}, []);
	return {
		tileSizePx: eligibility.tileSizePx,
		qualifyingTileCount: tiles.length,
		sheetTileCounts,
		candidateMinimumFloor: MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MINIMUM_FLOOR,
		candidateMedianFloor: MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MEDIAN_FLOOR,
		minimumRgbStep: steps.length === 0 ? 0 : Math.min(...steps),
		medianRgbStep: meadowEntryNearestRank(steps, 0.5),
		tiles: measured
	};
}

export function assertMeadowEntryPaintedV2DecorationEnergy(
	result: MeadowEntryPaintedV2DecorationEnergy
): void {
	assert(
		result.qualifyingTileCount === 67,
		`Meadow Entry decoration eligibility must contain exactly 67 qualifying tiles; received ${result.qualifyingTileCount}`
	);
	assert(
		result.minimumRgbStep >= MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MINIMUM_FLOOR,
		`Meadow Entry decoration energy minimum ${result.minimumRgbStep} is below ${MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MINIMUM_FLOOR}`
	);
	assert(
		result.medianRgbStep >= MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MEDIAN_FLOOR,
		`Meadow Entry decoration energy median ${result.medianRgbStep} is below ${MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MEDIAN_FLOOR}`
	);
}

import type { PixelBounds } from './meadow-entry-authoring-types';
import type { DecodedMeadowEntryRgba } from './meadow-entry-png';

export interface MeadowEntryUnderlayDecodedPanel {
	readonly id: string;
	readonly bounds: PixelBounds;
	readonly rgba: DecodedMeadowEntryRgba;
}

export interface MeadowEntryUnderlayAssemblyInput {
	readonly width: number;
	readonly height: number;
	readonly panels: readonly MeadowEntryUnderlayDecodedPanel[];
	readonly northSouthPairs: readonly {
		readonly northId: string;
		readonly southId: string;
		readonly bounds: PixelBounds;
	}[];
	readonly familyHandoff: {
		readonly sundropPanelIds: readonly string[];
		readonly crossroadsPanelIds: readonly string[];
		readonly bounds: PixelBounds;
	};
}

export const MEADOW_ENTRY_PAINTED_V2_DETAIL_FEATHER_WIDTH_PX = 128;
export const MEADOW_ENTRY_PAINTED_V2_DETAIL_FEATHER_LAST_INSET_INDEX = 127;

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function assertByte(value: number, label = 'channel'): void {
	assert(Number.isInteger(value) && value >= 0 && value <= 255, `Meadow Entry ${label} is invalid`);
}

function assertIntegerAtLeast(value: number, minimum: number, label: string): void {
	assert(Number.isInteger(value) && value >= minimum, `Meadow Entry ${label} is invalid`);
}

function boundsWidth(bounds: PixelBounds): number {
	return bounds.right - bounds.left;
}

function boundsHeight(bounds: PixelBounds): number {
	return bounds.bottom - bounds.top;
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
		`Meadow Entry ${label} bounds are invalid`
	);
}

function panelPixel(panel: MeadowEntryUnderlayDecodedPanel, x: number, y: number): number[] {
	const localX = x - panel.bounds.left;
	const localY = y - panel.bounds.top;
	assert(
		localX >= 0 && localY >= 0 && localX < panel.rgba.width && localY < panel.rgba.height,
		`Meadow Entry panel ${panel.id} pixel is outside decoded dimensions`
	);
	const offset = (localY * panel.rgba.width + localX) * 4;
	return [
		panel.rgba.data[offset]!,
		panel.rgba.data[offset + 1]!,
		panel.rgba.data[offset + 2]!,
		panel.rgba.data[offset + 3]!
	];
}

function writePixel(target: Buffer, width: number, x: number, y: number, pixel: readonly number[]) {
	const offset = (y * width + x) * 4;
	target[offset] = pixel[0]!;
	target[offset + 1] = pixel[1]!;
	target[offset + 2] = pixel[2]!;
	target[offset + 3] = pixel[3]!;
}

function copyPanel(
	target: Buffer,
	targetWidth: number,
	panel: MeadowEntryUnderlayDecodedPanel
): void {
	for (let y = panel.bounds.top; y < panel.bounds.bottom; y += 1) {
		for (let x = panel.bounds.left; x < panel.bounds.right; x += 1) {
			writePixel(target, targetWidth, x, y, panelPixel(panel, x, y));
		}
	}
}

function blendPixel(
	target: Buffer,
	width: number,
	x: number,
	y: number,
	first: readonly number[],
	second: readonly number[],
	index: number,
	lastIndex: number
): void {
	writePixel(target, width, x, y, [
		blendMeadowEntryOpaqueChannel(first[0]!, second[0]!, index, lastIndex),
		blendMeadowEntryOpaqueChannel(first[1]!, second[1]!, index, lastIndex),
		blendMeadowEntryOpaqueChannel(first[2]!, second[2]!, index, lastIndex),
		255
	]);
}

export function blendMeadowEntryOpaqueChannel(
	first: number,
	second: number,
	index: number,
	lastIndex: number
): number {
	assertByte(first);
	assertByte(second);
	if (
		!Number.isInteger(index) ||
		!Number.isInteger(lastIndex) ||
		lastIndex <= 0 ||
		index < 0 ||
		index > lastIndex
	) {
		throw new Error('Meadow Entry blend index/lastIndex is invalid');
	}
	return Math.floor(
		(first * (lastIndex - index) + second * index + Math.floor(lastIndex / 2)) / lastIndex
	);
}

export function meadowEntryDetailFeatherWeight(
	edgeDistance: number,
	lastInsetIndex = MEADOW_ENTRY_PAINTED_V2_DETAIL_FEATHER_LAST_INSET_INDEX
): number {
	assertIntegerAtLeast(edgeDistance, 0, 'edgeDistance');
	assertIntegerAtLeast(lastInsetIndex, 1, 'lastInsetIndex');
	const q = Math.min(edgeDistance, lastInsetIndex);
	const numerator = q * q * (3 * lastInsetIndex - 2 * q);
	const denominator = lastInsetIndex * lastInsetIndex * lastInsetIndex;
	return Math.floor((255 * numerator + Math.floor(denominator / 2)) / denominator);
}

export function blendMeadowEntryDetailChannel(
	current: number,
	detail: number,
	weight: number
): number {
	assertByte(current);
	assertByte(detail);
	assertByte(weight, 'weight');
	return Math.floor((current * (255 - weight) + detail * weight + 127) / 255);
}

export function compositeMeadowEntryDetailPanel(
	target: DecodedMeadowEntryRgba,
	panel: MeadowEntryUnderlayDecodedPanel,
	lastInsetIndex = MEADOW_ENTRY_PAINTED_V2_DETAIL_FEATHER_LAST_INSET_INDEX
): void {
	assertIntegerAtLeast(lastInsetIndex, 1, 'lastInsetIndex');
	assert(
		Number.isInteger(target.width) &&
			target.width > 0 &&
			Number.isInteger(target.height) &&
			target.height > 0,
		'Meadow Entry detail target dimensions are invalid'
	);
	assert(
		target.data.byteLength === target.width * target.height * 4,
		'Meadow Entry detail target RGBA dimensions are invalid'
	);
	assertBounds(panel.bounds, target.width, target.height, `detail panel ${panel.id}`);
	const panelWidth = boundsWidth(panel.bounds);
	const panelHeight = boundsHeight(panel.bounds);
	assert(
		panel.rgba.width === panelWidth &&
			panel.rgba.height === panelHeight &&
			panel.rgba.data.byteLength === panelWidth * panelHeight * 4,
		`Meadow Entry detail panel ${panel.id} dimensions are invalid`
	);
	assert(
		panelWidth >= lastInsetIndex * 2 + 1 && panelHeight >= lastInsetIndex * 2 + 1,
		`Meadow Entry detail panel ${panel.id} must be at least ${lastInsetIndex * 2 + 1}px on each axis`
	);
	for (let offset = 3; offset < panel.rgba.data.length; offset += 4) {
		assert(panel.rgba.data[offset] === 255, `Meadow Entry detail panel ${panel.id} is not opaque`);
	}
	for (let y = panel.bounds.top; y < panel.bounds.bottom; y += 1) {
		for (let x = panel.bounds.left; x < panel.bounds.right; x += 1) {
			const localX = x - panel.bounds.left;
			const localY = y - panel.bounds.top;
			const edgeDistance = Math.min(
				localX,
				panelWidth - 1 - localX,
				localY,
				panelHeight - 1 - localY
			);
			const weight = meadowEntryDetailFeatherWeight(edgeDistance, lastInsetIndex);
			const targetOffset = (y * target.width + x) * 4;
			const detailPixel = panelPixel(panel, x, y);
			writePixel(target.data, target.width, x, y, [
				blendMeadowEntryDetailChannel(target.data[targetOffset]!, detailPixel[0]!, weight),
				blendMeadowEntryDetailChannel(target.data[targetOffset + 1]!, detailPixel[1]!, weight),
				blendMeadowEntryDetailChannel(target.data[targetOffset + 2]!, detailPixel[2]!, weight),
				255
			]);
		}
	}
}

function findPanel(
	panels: readonly MeadowEntryUnderlayDecodedPanel[],
	id: string,
	label: string
): MeadowEntryUnderlayDecodedPanel {
	const result = panels.find((panel) => panel.id === id);
	assert(result !== undefined, `Meadow Entry ${label} references missing panel ${id}`);
	return result;
}

function blendNorthSouth(
	input: MeadowEntryUnderlayAssemblyInput,
	pair: MeadowEntryUnderlayAssemblyInput['northSouthPairs'][number],
	output: Buffer
): void {
	const north = findPanel(input.panels, pair.northId, 'north/south pair');
	const south = findPanel(input.panels, pair.southId, 'north/south pair');
	const overlapWidth = boundsWidth(pair.bounds);
	const overlapHeight = boundsHeight(pair.bounds);
	assert(overlapWidth > 0 && overlapHeight > 1, 'Meadow Entry north/south overlap is invalid');
	const lastIndex = overlapHeight - 1;
	for (let y = pair.bounds.top; y < pair.bounds.bottom; y += 1) {
		for (let x = pair.bounds.left; x < pair.bounds.right; x += 1) {
			blendPixel(
				output,
				input.width,
				x,
				y,
				panelPixel(north, x, y),
				panelPixel(south, x, y),
				y - pair.bounds.top,
				lastIndex
			);
		}
	}
}

function familyPixel(
	input: MeadowEntryUnderlayAssemblyInput,
	ids: readonly string[],
	x: number,
	y: number
): number[] | null {
	const matching = input.panels.filter(
		(panel) =>
			ids.includes(panel.id) &&
			x >= panel.bounds.left &&
			x < panel.bounds.right &&
			y >= panel.bounds.top &&
			y < panel.bounds.bottom
	);
	if (matching.length === 0) return null;
	if (matching.length === 1) return panelPixel(matching[0]!, x, y);
	const pair = input.northSouthPairs.find(
		(candidate) =>
			(candidate.northId === matching[0]!.id && candidate.southId === matching[1]!.id) ||
			(candidate.southId === matching[0]!.id && candidate.northId === matching[1]!.id)
	);
	assert(pair !== undefined, 'Meadow Entry family overlap is not a sealed north/south pair');
	const north = findPanel(input.panels, pair.northId, 'north/south pair');
	const south = findPanel(input.panels, pair.southId, 'north/south pair');
	const northPixel = panelPixel(north, x, y);
	const southPixel = panelPixel(south, x, y);
	const index = y - pair.bounds.top;
	const lastIndex = boundsHeight(pair.bounds) - 1;
	return [
		blendMeadowEntryOpaqueChannel(northPixel[0]!, southPixel[0]!, index, lastIndex),
		blendMeadowEntryOpaqueChannel(northPixel[1]!, southPixel[1]!, index, lastIndex),
		blendMeadowEntryOpaqueChannel(northPixel[2]!, southPixel[2]!, index, lastIndex),
		255
	];
}

function blendFamilies(input: MeadowEntryUnderlayAssemblyInput, output: Buffer): void {
	const bounds = input.familyHandoff.bounds;
	const overlapWidth = boundsWidth(bounds);
	const overlapHeight = boundsHeight(bounds);
	assert(overlapWidth > 1 && overlapHeight > 0, 'Meadow Entry family handoff bounds are invalid');
	const lastIndex = overlapWidth - 1;
	for (let y = bounds.top; y < bounds.bottom; y += 1) {
		for (let x = bounds.left; x < bounds.right; x += 1) {
			const sundropPixel = familyPixel(input, input.familyHandoff.sundropPanelIds, x, y);
			const crossroadsPixel = familyPixel(input, input.familyHandoff.crossroadsPanelIds, x, y);
			assert(
				sundropPixel !== null && crossroadsPixel !== null,
				'Meadow Entry family handoff is uncovered'
			);
			blendPixel(
				output,
				input.width,
				x,
				y,
				sundropPixel,
				crossroadsPixel,
				x - bounds.left,
				lastIndex
			);
		}
	}
}

export async function assembleMeadowEntryPaintedV2Underlay(
	input: MeadowEntryUnderlayAssemblyInput
): Promise<DecodedMeadowEntryRgba> {
	assert(
		Number.isInteger(input.width) && input.width > 0,
		'Meadow Entry underlay width is invalid'
	);
	assert(
		Number.isInteger(input.height) && input.height > 0,
		'Meadow Entry underlay height is invalid'
	);
	const ids = new Set<string>();
	for (const panel of input.panels) {
		assert(!ids.has(panel.id), `Duplicate Meadow Entry underlay panel id: ${panel.id}`);
		ids.add(panel.id);
		assertBounds(panel.bounds, input.width, input.height, `underlay panel ${panel.id}`);
		assert(
			panel.rgba.width === boundsWidth(panel.bounds) &&
				panel.rgba.height === boundsHeight(panel.bounds) &&
				panel.rgba.data.byteLength === panel.rgba.width * panel.rgba.height * 4,
			`Meadow Entry underlay panel ${panel.id} dimensions are invalid`
		);
		for (let offset = 3; offset < panel.rgba.data.length; offset += 4) {
			assert(
				panel.rgba.data[offset] === 255,
				`Meadow Entry underlay panel ${panel.id} is not opaque`
			);
		}
	}
	const output = Buffer.alloc(input.width * input.height * 4);
	for (const panel of input.panels) copyPanel(output, input.width, panel);
	for (const pair of input.northSouthPairs) {
		assertBounds(pair.bounds, input.width, input.height, 'north/south overlap');
		blendNorthSouth(input, pair, output);
	}
	blendFamilies(input, output);
	return { data: output, width: input.width, height: input.height };
}

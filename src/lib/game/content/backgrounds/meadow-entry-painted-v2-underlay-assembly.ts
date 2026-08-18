import type { PixelBounds } from './meadow-entry-authoring-types';
import type { DecodedMeadowEntryRgba } from './meadow-entry-png';
import {
	MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS,
	MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS,
	type MeadowEntryPaintedV2BlendAxis,
	type MeadowEntryPaintedV2DetailPair,
	validateMeadowEntryPaintedV2DetailPairContract
} from './meadow-entry-painted-v2-pilot';

export interface MeadowEntryUnderlayDecodedPanel {
	readonly id: string;
	readonly bounds: PixelBounds;
	readonly rgba: DecodedMeadowEntryRgba;
}

export type MeadowEntryDetailDecodedPanel = MeadowEntryUnderlayDecodedPanel & {
	readonly assemblyPriority: number;
};

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
export const MEADOW_ENTRY_PAINTED_V2_DETAIL_LOW_FREQUENCY_MAX_RADIUS_PX = 64;
export const MEADOW_ENTRY_PAINTED_V2_HANDOFF_MAX_HALF_WIDTH_PX = 96;
export const MEADOW_ENTRY_PAINTED_V2_HANDOFF_SMOOTHNESS_PENALTY = 4;

export interface MeadowEntryContentAwareHandoffResult {
	readonly rgba: DecodedMeadowEntryRgba;
	readonly seam: readonly number[];
}

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

function decodedPixel(decoded: DecodedMeadowEntryRgba, x: number, y: number): readonly number[] {
	const offset = (y * decoded.width + x) * 4;
	return [
		decoded.data[offset]!,
		decoded.data[offset + 1]!,
		decoded.data[offset + 2]!,
		decoded.data[offset + 3]!
	];
}

function assertOpaqueDecoded(decoded: DecodedMeadowEntryRgba, label: string): void {
	assert(
		Number.isInteger(decoded.width) && decoded.width > 0,
		`Meadow Entry ${label} width is invalid`
	);
	assert(
		Number.isInteger(decoded.height) && decoded.height > 0,
		`Meadow Entry ${label} height is invalid`
	);
	assert(
		decoded.data.byteLength === decoded.width * decoded.height * 4,
		`Meadow Entry ${label} RGBA dimensions are invalid`
	);
	for (let offset = 3; offset < decoded.data.length; offset += 4) {
		assert(decoded.data[offset] === 255, `Meadow Entry ${label} is not opaque`);
	}
}

function handoffPixelCoordinates(
	axis: MeadowEntryPaintedV2BlendAxis,
	step: number,
	position: number
): readonly [number, number] {
	return axis === 'x' ? [position, step] : [step, position];
}

function handoffPixelCost(
	first: DecodedMeadowEntryRgba,
	second: DecodedMeadowEntryRgba,
	axis: MeadowEntryPaintedV2BlendAxis,
	step: number,
	position: number
): number {
	const [x, y] = handoffPixelCoordinates(axis, step, position);
	const firstOffset = (y * first.width + x) * 4;
	const secondOffset = (y * second.width + x) * 4;
	return (
		Math.abs(first.data[firstOffset]! - second.data[secondOffset]!) +
		Math.abs(first.data[firstOffset + 1]! - second.data[secondOffset + 1]!) +
		Math.abs(first.data[firstOffset + 2]! - second.data[secondOffset + 2]!)
	);
}

function findMeadowEntryContentAwareSeam(
	first: DecodedMeadowEntryRgba,
	second: DecodedMeadowEntryRgba,
	axis: MeadowEntryPaintedV2BlendAxis,
	halfWidth: number
): readonly number[] {
	const axisLength = axis === 'x' ? first.width : first.height;
	const stepCount = axis === 'x' ? first.height : first.width;
	const minimumPosition = halfWidth;
	const maximumPosition = axisLength - 1 - halfWidth;
	assert(
		minimumPosition <= maximumPosition,
		'Meadow Entry content-aware handoff is too narrow for its seam'
	);
	let previous = new Float64Array(axisLength);
	let current = new Float64Array(axisLength);
	previous.fill(Number.POSITIVE_INFINITY);
	current.fill(Number.POSITIVE_INFINITY);
	const directions = new Int8Array(axisLength * stepCount);
	for (let step = 0; step < stepCount; step += 1) {
		current.fill(Number.POSITIVE_INFINITY);
		for (let position = minimumPosition; position <= maximumPosition; position += 1) {
			const cost = handoffPixelCost(first, second, axis, step, position);
			if (step === 0) {
				current[position] = cost;
				continue;
			}
			let best = previous[position]!;
			let direction = 0;
			if (
				position > minimumPosition &&
				previous[position - 1]! + MEADOW_ENTRY_PAINTED_V2_HANDOFF_SMOOTHNESS_PENALTY < best
			) {
				best = previous[position - 1]! + MEADOW_ENTRY_PAINTED_V2_HANDOFF_SMOOTHNESS_PENALTY;
				direction = -1;
			}
			if (
				position < maximumPosition &&
				previous[position + 1]! + MEADOW_ENTRY_PAINTED_V2_HANDOFF_SMOOTHNESS_PENALTY < best
			) {
				best = previous[position + 1]! + MEADOW_ENTRY_PAINTED_V2_HANDOFF_SMOOTHNESS_PENALTY;
				direction = 1;
			}
			current[position] = cost + best;
			directions[step * axisLength + position] = direction;
		}
		[previous, current] = [current, previous];
	}
	let position = minimumPosition;
	for (let candidate = minimumPosition + 1; candidate <= maximumPosition; candidate += 1) {
		if (previous[candidate]! < previous[position]!) position = candidate;
	}
	const seam = new Array<number>(stepCount);
	for (let step = stepCount - 1; step >= 0; step -= 1) {
		seam[step] = position;
		position += directions[step * axisLength + position]!;
	}
	return Object.freeze(seam);
}

function channelIntegral(decoded: DecodedMeadowEntryRgba, channel: number): Float64Array {
	const stride = decoded.width + 1;
	const integral = new Float64Array(stride * (decoded.height + 1));
	for (let y = 0; y < decoded.height; y += 1) {
		let rowSum = 0;
		for (let x = 0; x < decoded.width; x += 1) {
			rowSum += decoded.data[(y * decoded.width + x) * 4 + channel]!;
			integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1]! + rowSum;
		}
	}
	return integral;
}

function boxAverageChannel(
	integral: Float64Array,
	width: number,
	height: number,
	x: number,
	y: number,
	radius: number
): number {
	const left = Math.max(0, x - radius);
	const top = Math.max(0, y - radius);
	const right = Math.min(width, x + radius + 1);
	const bottom = Math.min(height, y + radius + 1);
	const stride = width + 1;
	const sum =
		integral[bottom * stride + right]! -
		integral[top * stride + right]! -
		integral[bottom * stride + left]! +
		integral[top * stride + left]!;
	return Math.floor(
		(sum + Math.floor(((right - left) * (bottom - top)) / 2)) / ((right - left) * (bottom - top))
	);
}

function blendSignedChannel(
	first: number,
	second: number,
	index: number,
	lastIndex: number
): number {
	const numerator = first * (lastIndex - index) + second * index;
	const magnitude = Math.floor((Math.abs(numerator) + Math.floor(lastIndex / 2)) / lastIndex);
	return numerator < 0 ? -magnitude : magnitude;
}

export function blendMeadowEntryContentAwareHandoff(
	first: DecodedMeadowEntryRgba,
	second: DecodedMeadowEntryRgba,
	axis: MeadowEntryPaintedV2BlendAxis
): MeadowEntryContentAwareHandoffResult {
	assertOpaqueDecoded(first, 'content-aware first handoff');
	assertOpaqueDecoded(second, 'content-aware second handoff');
	assert(
		first.width === second.width && first.height === second.height,
		'Meadow Entry content-aware handoff dimensions do not match'
	);
	assert(
		axis === 'x' || axis === 'y',
		`Meadow Entry content-aware handoff axis is invalid: ${axis}`
	);
	const axisLength = axis === 'x' ? first.width : first.height;
	const stepCount = axis === 'x' ? first.height : first.width;
	if (axisLength < 8) {
		const output = Buffer.alloc(first.data.byteLength);
		const bounds = { left: 0, top: 0, right: first.width, bottom: first.height };
		for (let y = 0; y < first.height; y += 1) {
			for (let x = 0; x < first.width; x += 1) {
				writePixel(
					output,
					first.width,
					x,
					y,
					blendMeadowEntryAxisPairPixel(
						decodedPixel(first, x, y),
						decodedPixel(second, x, y),
						bounds,
						axis,
						x,
						y
					)
				);
			}
		}
		return {
			rgba: { data: output, width: first.width, height: first.height },
			seam: Object.freeze(new Array<number>(stepCount).fill(Math.floor((axisLength - 1) / 2)))
		};
	}
	const halfWidth = Math.min(
		MEADOW_ENTRY_PAINTED_V2_HANDOFF_MAX_HALF_WIDTH_PX,
		Math.floor(axisLength / 8)
	);
	assert(halfWidth >= 1, 'Meadow Entry content-aware handoff axis is too short');
	const seam = findMeadowEntryContentAwareSeam(first, second, axis, halfWidth);
	const output = Buffer.alloc(first.data.byteLength);
	const narrowLastIndex = halfWidth * 2 - 1;
	for (let channel = 0; channel < 3; channel += 1) {
		const firstIntegral = channelIntegral(first, channel);
		const secondIntegral = channelIntegral(second, channel);
		for (let y = 0; y < first.height; y += 1) {
			for (let x = 0; x < first.width; x += 1) {
				const position = axis === 'x' ? x : y;
				const step = axis === 'x' ? y : x;
				const firstLow = boxAverageChannel(
					firstIntegral,
					first.width,
					first.height,
					x,
					y,
					halfWidth
				);
				const secondLow = boxAverageChannel(
					secondIntegral,
					second.width,
					second.height,
					x,
					y,
					halfWidth
				);
				const low = blendMeadowEntryOpaqueChannel(firstLow, secondLow, position, axisLength - 1);
				const narrowIndex = Math.max(
					0,
					Math.min(narrowLastIndex, position - (seam[step]! - halfWidth))
				);
				const offset = (y * first.width + x) * 4;
				const residual = blendSignedChannel(
					first.data[offset + channel]! - firstLow,
					second.data[offset + channel]! - secondLow,
					narrowIndex,
					narrowLastIndex
				);
				output[offset + channel] = Math.max(0, Math.min(255, low + residual));
			}
		}
	}
	for (let offset = 3; offset < output.length; offset += 4) output[offset] = 255;
	return { rgba: { data: output, width: first.width, height: first.height }, seam };
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

export function blendMeadowEntryAxisPairPixel(
	first: readonly number[],
	second: readonly number[],
	bounds: PixelBounds,
	axis: MeadowEntryPaintedV2BlendAxis,
	x: number,
	y: number
): readonly [number, number, number, 255] {
	assert(
		Number.isInteger(bounds.left) &&
			Number.isInteger(bounds.top) &&
			Number.isInteger(bounds.right) &&
			Number.isInteger(bounds.bottom) &&
			bounds.right > bounds.left &&
			bounds.bottom > bounds.top,
		'Meadow Entry axis-pair bounds are invalid'
	);
	assert(axis === 'x' || axis === 'y', `Meadow Entry axis-pair axis is invalid: ${axis}`);
	assert(
		x >= bounds.left && x < bounds.right && y >= bounds.top && y < bounds.bottom,
		'Meadow Entry axis-pair pixel is outside bounds'
	);
	const index = axis === 'x' ? x - bounds.left : y - bounds.top;
	const lastIndex = axis === 'x' ? bounds.right - bounds.left - 1 : bounds.bottom - bounds.top - 1;
	return [
		blendMeadowEntryOpaqueChannel(first[0]!, second[0]!, index, lastIndex),
		blendMeadowEntryOpaqueChannel(first[1]!, second[1]!, index, lastIndex),
		blendMeadowEntryOpaqueChannel(first[2]!, second[2]!, index, lastIndex),
		255
	];
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

export function meadowEntryDetailPairCorrectionLastInsetIndex(bounds: PixelBounds): number {
	assert(
		Number.isInteger(bounds.left) &&
			Number.isInteger(bounds.top) &&
			Number.isInteger(bounds.right) &&
			Number.isInteger(bounds.bottom) &&
			bounds.right > bounds.left &&
			bounds.bottom > bounds.top,
		'Meadow Entry detail pair correction bounds are invalid'
	);
	return Math.min(
		MEADOW_ENTRY_PAINTED_V2_DETAIL_FEATHER_LAST_INSET_INDEX,
		Math.floor((Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top) - 1) / 2)
	);
}

export function meadowEntryDetailLowFrequencyLastInsetIndex(bounds: PixelBounds): number {
	assert(
		Number.isInteger(bounds.left) &&
			Number.isInteger(bounds.top) &&
			Number.isInteger(bounds.right) &&
			Number.isInteger(bounds.bottom) &&
			bounds.right > bounds.left &&
			bounds.bottom > bounds.top,
		'Meadow Entry detail low-frequency bounds are invalid'
	);
	return Math.floor((Math.min(boundsWidth(bounds), boundsHeight(bounds)) - 1) / 2);
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
	const current = materializeBounds(panel.bounds, (x, y) => decodedPixel(target, x, y));
	const lowFrequencyLastInsetIndex =
		lastInsetIndex === MEADOW_ENTRY_PAINTED_V2_DETAIL_FEATHER_LAST_INSET_INDEX
			? meadowEntryDetailLowFrequencyLastInsetIndex(panel.bounds)
			: lastInsetIndex;
	const lowFrequencyRadius = Math.max(
		1,
		Math.min(
			MEADOW_ENTRY_PAINTED_V2_DETAIL_LOW_FREQUENCY_MAX_RADIUS_PX,
			Math.floor(Math.min(panelWidth, panelHeight) / 8)
		)
	);
	const output = Buffer.alloc(panel.rgba.data.byteLength);
	for (let channel = 0; channel < 3; channel += 1) {
		const detailIntegral = channelIntegral(panel.rgba, channel);
		for (let localY = 0; localY < panelHeight; localY += 1) {
			for (let localX = 0; localX < panelWidth; localX += 1) {
				const edgeDistance = Math.min(
					localX,
					panelWidth - 1 - localX,
					localY,
					panelHeight - 1 - localY
				);
				const offset = (localY * panelWidth + localX) * 4;
				if (edgeDistance === 0) {
					output[offset + channel] = current.data[offset + channel]!;
					continue;
				}
				const lowWeight = meadowEntryDetailFeatherWeight(edgeDistance, lowFrequencyLastInsetIndex);
				const highWeight = meadowEntryDetailFeatherWeight(edgeDistance, lastInsetIndex);
				const currentLow = current.data[offset + channel]!;
				const detailLow = boxAverageChannel(
					detailIntegral,
					panelWidth,
					panelHeight,
					localX,
					localY,
					lowFrequencyRadius
				);
				const low = blendMeadowEntryDetailChannel(currentLow, detailLow, lowWeight);
				const residual = blendSignedChannel(
					current.data[offset + channel]! - currentLow,
					panel.rgba.data[offset + channel]! - detailLow,
					highWeight,
					255
				);
				output[offset + channel] = Math.max(0, Math.min(255, low + residual));
			}
		}
	}
	for (let offset = 3; offset < output.length; offset += 4) output[offset] = 255;
	for (let localY = 0; localY < panelHeight; localY += 1) {
		const sourceStart = localY * panelWidth * 4;
		const targetStart = ((panel.bounds.top + localY) * target.width + panel.bounds.left) * 4;
		output.copy(target.data, targetStart, sourceStart, sourceStart + panelWidth * 4);
	}
}

function intersectBounds(first: PixelBounds, second: PixelBounds): PixelBounds | null {
	const result = {
		left: Math.max(first.left, second.left),
		top: Math.max(first.top, second.top),
		right: Math.min(first.right, second.right),
		bottom: Math.min(first.bottom, second.bottom)
	};
	return result.left < result.right && result.top < result.bottom ? result : null;
}

function materializeBounds(
	bounds: PixelBounds,
	pixelAt: (x: number, y: number) => readonly number[]
): DecodedMeadowEntryRgba {
	const width = boundsWidth(bounds);
	const height = boundsHeight(bounds);
	const data = Buffer.alloc(width * height * 4);
	for (let y = bounds.top; y < bounds.bottom; y += 1) {
		for (let x = bounds.left; x < bounds.right; x += 1) {
			writePixel(data, width, x - bounds.left, y - bounds.top, pixelAt(x, y));
		}
	}
	return { data, width, height };
}

function assertDecodedPanel(panel: MeadowEntryUnderlayDecodedPanel, label: string): void {
	const width = boundsWidth(panel.bounds);
	const height = boundsHeight(panel.bounds);
	assert(width > 0 && height > 0, `Meadow Entry ${label} bounds are invalid`);
	assert(
		panel.rgba.width === width &&
			panel.rgba.height === height &&
			panel.rgba.data.byteLength === width * height * 4,
		`Meadow Entry ${label} dimensions are invalid`
	);
	for (let offset = 3; offset < panel.rgba.data.length; offset += 4) {
		assert(panel.rgba.data[offset] === 255, `Meadow Entry ${label} is not opaque`);
	}
}

export function compositeMeadowEntryDetailPairCorrection(
	target: DecodedMeadowEntryRgba,
	first: MeadowEntryUnderlayDecodedPanel,
	second: MeadowEntryUnderlayDecodedPanel,
	pair: MeadowEntryPaintedV2DetailPair
): void {
	assert(
		Number.isInteger(target.width) &&
			target.width > 0 &&
			Number.isInteger(target.height) &&
			target.height > 0,
		'Meadow Entry detail pair target dimensions are invalid'
	);
	assert(
		target.data.byteLength === target.width * target.height * 4,
		'Meadow Entry detail pair target RGBA dimensions are invalid'
	);
	assert(
		first.id === pair.firstId,
		`Meadow Entry detail pair first panel id is stale: ${first.id}`
	);
	assert(
		second.id === pair.secondId,
		`Meadow Entry detail pair second panel id is stale: ${second.id}`
	);
	assertDecodedPanel(first, `detail pair first panel ${first.id}`);
	assertDecodedPanel(second, `detail pair second panel ${second.id}`);
	const overlap = intersectBounds(first.bounds, second.bounds);
	assert(overlap !== null, 'Meadow Entry detail pair panels do not intersect');
	assert(
		overlap.left === pair.bounds.left &&
			overlap.top === pair.bounds.top &&
			overlap.right === pair.bounds.right &&
			overlap.bottom === pair.bounds.bottom,
		'Meadow Entry detail pair bounds do not match the panel intersection'
	);
	assert(
		pair.bounds.left >= 0 &&
			pair.bounds.top >= 0 &&
			pair.bounds.right <= target.width &&
			pair.bounds.bottom <= target.height,
		'Meadow Entry detail pair bounds are outside the target'
	);
	const correctionLastInsetIndex = meadowEntryDetailPairCorrectionLastInsetIndex(pair.bounds);
	assert(
		correctionLastInsetIndex >= 1,
		'Meadow Entry detail pair correction intersection is too narrow'
	);
	const handoff = blendMeadowEntryContentAwareHandoff(
		materializeBounds(pair.bounds, (x, y) => panelPixel(first, x, y)),
		materializeBounds(pair.bounds, (x, y) => panelPixel(second, x, y)),
		pair.axis
	).rgba;
	for (let y = pair.bounds.top; y < pair.bounds.bottom; y += 1) {
		for (let x = pair.bounds.left; x < pair.bounds.right; x += 1) {
			const targetOffset = (y * target.width + x) * 4;
			const pairPixel = decodedPixel(handoff, x - pair.bounds.left, y - pair.bounds.top);
			const edgeDistance = Math.min(
				x - pair.bounds.left,
				pair.bounds.right - 1 - x,
				y - pair.bounds.top,
				pair.bounds.bottom - 1 - y
			);
			const correctionWeight = meadowEntryDetailFeatherWeight(
				edgeDistance,
				correctionLastInsetIndex
			);
			target.data[targetOffset] = blendMeadowEntryDetailChannel(
				target.data[targetOffset]!,
				pairPixel[0],
				correctionWeight
			);
			target.data[targetOffset + 1] = blendMeadowEntryDetailChannel(
				target.data[targetOffset + 1]!,
				pairPixel[1],
				correctionWeight
			);
			target.data[targetOffset + 2] = blendMeadowEntryDetailChannel(
				target.data[targetOffset + 2]!,
				pairPixel[2],
				correctionWeight
			);
			target.data[targetOffset + 3] = 255;
		}
	}
}

export function compositeMeadowEntryDetailPanels(
	target: DecodedMeadowEntryRgba,
	panels: readonly MeadowEntryDetailDecodedPanel[],
	pairs: readonly MeadowEntryPaintedV2DetailPair[] = MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS
): void {
	validateMeadowEntryPaintedV2DetailPairContract(
		panels,
		pairs,
		MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS
	);
	const priorities = new Set<number>();
	for (const panel of panels) {
		assert(
			Number.isInteger(panel.assemblyPriority) && panel.assemblyPriority >= 0,
			`Meadow Entry detail panel ${panel.id} assembly priority is invalid`
		);
		assert(
			!priorities.has(panel.assemblyPriority),
			`Duplicate Meadow Entry detail panel assembly priority: ${panel.assemblyPriority}`
		);
		priorities.add(panel.assemblyPriority);
	}
	const byId = new Map(panels.map((panel) => [panel.id, panel]));
	const processed = new Set<string>();
	const ordered = [...panels].sort(
		(first, second) =>
			first.assemblyPriority - second.assemblyPriority || first.id.localeCompare(second.id)
	);
	for (const panel of ordered) {
		compositeMeadowEntryDetailPanel(target, panel);
		processed.add(panel.id);
		for (const pair of pairs) {
			if (pair.secondId !== panel.id) continue;
			assert(
				processed.has(pair.firstId),
				`Meadow Entry detail pair first panel was not processed before second: ${pair.firstId}->${pair.secondId}`
			);
			const first = byId.get(pair.firstId);
			assert(
				first !== undefined,
				`Meadow Entry detail pair first panel is missing: ${pair.firstId}`
			);
			compositeMeadowEntryDetailPairCorrection(target, first, panel, pair);
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
	const handoff = blendMeadowEntryContentAwareHandoff(
		materializeBounds(pair.bounds, (x, y) => panelPixel(north, x, y)),
		materializeBounds(pair.bounds, (x, y) => panelPixel(south, x, y)),
		'y'
	).rgba;
	for (let y = pair.bounds.top; y < pair.bounds.bottom; y += 1) {
		for (let x = pair.bounds.left; x < pair.bounds.right; x += 1) {
			const pixel = decodedPixel(handoff, x - pair.bounds.left, y - pair.bounds.top);
			writePixel(output, input.width, x, y, pixel);
		}
	}
}

function familyPixel(
	input: MeadowEntryUnderlayAssemblyInput,
	ids: readonly string[],
	x: number,
	y: number
): readonly number[] | null {
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
	return blendMeadowEntryAxisPairPixel(northPixel, southPixel, pair.bounds, 'y', x, y);
}

function blendFamilies(input: MeadowEntryUnderlayAssemblyInput, output: Buffer): void {
	const bounds = input.familyHandoff.bounds;
	const overlapWidth = boundsWidth(bounds);
	const overlapHeight = boundsHeight(bounds);
	assert(overlapWidth > 1 && overlapHeight > 0, 'Meadow Entry family handoff bounds are invalid');
	const sundrop = materializeBounds(bounds, (x, y) => {
		const pixel = familyPixel(input, input.familyHandoff.sundropPanelIds, x, y);
		assert(pixel !== null, 'Meadow Entry Sundrop family handoff is uncovered');
		return pixel;
	});
	const crossroads = materializeBounds(bounds, (x, y) => {
		const pixel = familyPixel(input, input.familyHandoff.crossroadsPanelIds, x, y);
		assert(pixel !== null, 'Meadow Entry Crossroads family handoff is uncovered');
		return pixel;
	});
	const handoff = blendMeadowEntryContentAwareHandoff(sundrop, crossroads, 'x').rgba;
	for (let y = bounds.top; y < bounds.bottom; y += 1) {
		for (let x = bounds.left; x < bounds.right; x += 1) {
			writePixel(output, input.width, x, y, decodedPixel(handoff, x - bounds.left, y - bounds.top));
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

import { createHash } from 'node:crypto';

import sharp from 'sharp';

import { SUNDROP_VILLAGE_PNG_OPTIONS } from './sundrop-village-png';

export interface SundropVillageObstacleImageInput {
	readonly path: string;
	readonly png: Buffer;
}

export interface SundropVillageObstacleNormalizationTransform {
	readonly native: {
		readonly width: number;
		readonly height: number;
	};
	readonly crop: {
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	};
	readonly output: {
		readonly width: number;
		readonly height: number;
	};
	readonly scaleX: number;
	readonly scaleY: number;
}

export interface SundropVillageObstacleForegroundCutoff {
	readonly id: string;
	readonly left: number;
	readonly right: number;
	readonly cutoffY: number;
}

export interface SundropVillageObstacleExclusionRect {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export interface SundropVillageObstacleCompositeInput {
	readonly width: number;
	readonly height: number;
	readonly source: SundropVillageObstacleImageInput;
	readonly chromaSource: SundropVillageObstacleImageInput;
	readonly obstacleLayer: SundropVillageObstacleImageInput;
	readonly candidateOutputPath: string;
	readonly masks: {
		readonly base: SundropVillageObstacleImageInput;
		readonly foreground: SundropVillageObstacleImageInput;
		readonly protected: SundropVillageObstacleImageInput;
	};
	readonly candidateAlignmentInsetPx: number;
	readonly normalizationTransform: SundropVillageObstacleNormalizationTransform;
	readonly controlFingerprint: string;
	readonly controlArtifacts: Readonly<
		Record<string, { readonly path: string; readonly bytes: Buffer }>
	>;
	readonly prompt: string;
	readonly baseAlpha: (x: number, y: number) => number;
	readonly foregroundCutoffs: readonly SundropVillageObstacleForegroundCutoff[];
	readonly foregroundExclusions: readonly SundropVillageObstacleExclusionRect[];
}

export interface SundropVillageObstacleCompositeResult {
	readonly candidatePng: Buffer;
	readonly basePng: Buffer;
	readonly foregroundPng: Buffer;
	readonly provenanceJson: Buffer;
}

interface DecodedRgba {
	readonly data: Buffer;
	readonly width: number;
	readonly height: number;
}

interface CandidateAlignmentResult {
	readonly layer: DecodedRgba;
	readonly changedAlphaPixels: number;
	readonly zeroedBoundaryPixels: number;
}

function sha256(contents: Uint8Array): string {
	return createHash('sha256').update(contents).digest('hex');
}

function dimensions(decoded: DecodedRgba): { readonly width: number; readonly height: number } {
	return { width: decoded.width, height: decoded.height };
}

async function decodeRgba(contents: Buffer): Promise<DecodedRgba> {
	const { data, info } = await sharp(contents)
		.toColourspace('srgb')
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	if (info.channels !== 4) {
		throw new Error(
			`Sundrop Village obstacle input must decode to RGBA; received ${info.channels}`
		);
	}
	return { data, width: info.width, height: info.height };
}

function assertDimensions(
	label: string,
	decoded: DecodedRgba,
	width: number,
	height: number
): void {
	if (decoded.width !== width || decoded.height !== height) {
		throw new Error(
			`${label} must be exactly ${width}x${height}; received ${decoded.width}x${decoded.height}`
		);
	}
}

function assertIntegerRect(
	rect: SundropVillageObstacleNormalizationTransform['crop'],
	nativeWidth: number,
	nativeHeight: number
): void {
	for (const [key, value] of Object.entries(rect)) {
		if (!Number.isInteger(value)) {
			throw new Error(`Sundrop Village obstacle normalization crop ${key} must be an integer`);
		}
	}
	if (
		rect.x < 0 ||
		rect.y < 0 ||
		rect.width <= 0 ||
		rect.height <= 0 ||
		rect.x + rect.width > nativeWidth ||
		rect.y + rect.height > nativeHeight
	) {
		throw new Error('Sundrop Village obstacle normalization crop must fit the native candidate');
	}
}

function assertUniformTransform(
	transform: SundropVillageObstacleNormalizationTransform,
	width: number,
	height: number
): void {
	const epsilon = 1e-12;
	if (
		!Number.isFinite(transform.scaleX) ||
		!Number.isFinite(transform.scaleY) ||
		Math.abs(transform.scaleX - transform.scaleY) > epsilon
	) {
		throw new Error('Sundrop Village obstacle normalization transform must use uniform scaling');
	}
	if (transform.output.width !== width || transform.output.height !== height) {
		throw new Error('Sundrop Village obstacle normalization output does not match the composite');
	}
	assertIntegerRect(transform.crop, transform.native.width, transform.native.height);
	const actualScaleX = transform.output.width / transform.crop.width;
	const actualScaleY = transform.output.height / transform.crop.height;
	if (
		Math.abs(actualScaleX - transform.scaleX) > epsilon ||
		Math.abs(actualScaleY - transform.scaleY) > epsilon
	) {
		throw new Error(
			'Sundrop Village obstacle normalization transform scale does not match its crop'
		);
	}
}

async function normalizeObstacleLayer(
	input: SundropVillageObstacleImageInput,
	transform: SundropVillageObstacleNormalizationTransform,
	width: number,
	height: number
): Promise<{ readonly raw: DecodedRgba; readonly normalized: DecodedRgba }> {
	const raw = await decodeRgba(input.png);
	assertDimensions(
		'Sundrop Village obstacle layer native input',
		raw,
		transform.native.width,
		transform.native.height
	);
	const { data, info } = await sharp(input.png)
		.extract({
			left: transform.crop.x,
			top: transform.crop.y,
			width: transform.crop.width,
			height: transform.crop.height
		})
		.resize(transform.output.width, transform.output.height, {
			fit: 'fill',
			kernel: sharp.kernel.lanczos3
		})
		.toColourspace('srgb')
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const normalized = { data, width: info.width, height: info.height };
	assertDimensions('Sundrop Village normalized obstacle layer', normalized, width, height);
	return { raw, normalized };
}

function constructSourceBackedCandidate(
	source: DecodedRgba,
	obstacleLayer: DecodedRgba
): DecodedRgba {
	const data = Buffer.alloc(source.data.byteLength);
	for (let offset = 0; offset < data.byteLength; offset += 4) {
		const alpha = obstacleLayer.data[offset + 3] ?? 0;
		for (let channel = 0; channel < 3; channel += 1) {
			const sourceChannel = source.data[offset + channel] ?? 0;
			const obstacleChannel = obstacleLayer.data[offset + channel] ?? 0;
			data[offset + channel] =
				alpha === 0
					? sourceChannel
					: Math.round((obstacleChannel * alpha + sourceChannel * (255 - alpha)) / 255);
		}
		data[offset + 3] = alpha;
	}
	return { data, width: source.width, height: source.height };
}

function alphaAt(data: Buffer, pixel: number): number {
	return data[pixel * 4 + 3] ?? 0;
}

function alignObstacleLayerToBaseMask(
	obstacleLayer: DecodedRgba,
	baseMask: DecodedRgba,
	protectedMask: DecodedRgba,
	insetPx: number
): CandidateAlignmentResult {
	if (!Number.isInteger(insetPx) || insetPx < 0 || insetPx > 64) {
		throw new Error('Sundrop Village obstacle candidate alignment inset must be 0..64 pixels');
	}
	if (insetPx === 0) {
		return { layer: obstacleLayer, changedAlphaPixels: 0, zeroedBoundaryPixels: 0 };
	}

	const totalPixels = obstacleLayer.width * obstacleLayer.height;
	const maximumDistance = insetPx + 1;
	const distance = new Uint16Array(totalPixels);
	for (let pixel = 0; pixel < totalPixels; pixel += 1) {
		distance[pixel] =
			alphaAt(baseMask.data, pixel) > 0 && alphaAt(protectedMask.data, pixel) === 0
				? maximumDistance
				: 0;
	}
	for (let y = 0; y < obstacleLayer.height; y += 1) {
		for (let x = 0; x < obstacleLayer.width; x += 1) {
			const pixel = y * obstacleLayer.width + x;
			if (distance[pixel] === 0) continue;
			const left = x === 0 ? 0 : (distance[pixel - 1] ?? 0);
			const top = y === 0 ? 0 : (distance[pixel - obstacleLayer.width] ?? 0);
			distance[pixel] = Math.min(distance[pixel] ?? maximumDistance, left + 1, top + 1);
		}
	}
	for (let y = obstacleLayer.height - 1; y >= 0; y -= 1) {
		for (let x = obstacleLayer.width - 1; x >= 0; x -= 1) {
			const pixel = y * obstacleLayer.width + x;
			if (distance[pixel] === 0) continue;
			const right = x === obstacleLayer.width - 1 ? 0 : (distance[pixel + 1] ?? 0);
			const bottom =
				y === obstacleLayer.height - 1 ? 0 : (distance[pixel + obstacleLayer.width] ?? 0);
			distance[pixel] = Math.min(distance[pixel] ?? maximumDistance, right + 1, bottom + 1);
		}
	}

	const data = Buffer.from(obstacleLayer.data);
	let changedAlphaPixels = 0;
	let zeroedBoundaryPixels = 0;
	for (let pixel = 0; pixel < totalPixels; pixel += 1) {
		const boundaryDistance = distance[pixel] ?? 0;
		if (boundaryDistance === 0) continue;
		const offset = pixel * 4;
		const originalAlpha = obstacleLayer.data[offset + 3] ?? 0;
		const weight = Math.min(1, Math.max(0, (boundaryDistance - 1) / insetPx));
		const alignedAlpha = Math.round(originalAlpha * weight);
		data[offset + 3] = alignedAlpha;
		if (alignedAlpha !== originalAlpha) changedAlphaPixels += 1;
		if (boundaryDistance === 1 && alignedAlpha === 0) zeroedBoundaryPixels += 1;
	}
	return {
		layer: { data, width: obstacleLayer.width, height: obstacleLayer.height },
		changedAlphaPixels,
		zeroedBoundaryPixels
	};
}

function alphaStatistics(decoded: DecodedRgba) {
	let minimum = 255;
	let maximum = 0;
	let transparentPixels = 0;
	let translucentPixels = 0;
	let opaquePixels = 0;
	for (let pixel = 0; pixel < decoded.width * decoded.height; pixel += 1) {
		const alpha = alphaAt(decoded.data, pixel);
		minimum = Math.min(minimum, alpha);
		maximum = Math.max(maximum, alpha);
		if (alpha === 0) transparentPixels += 1;
		else if (alpha === 255) opaquePixels += 1;
		else translucentPixels += 1;
	}
	const cornerAlpha = [
		alphaAt(decoded.data, 0),
		alphaAt(decoded.data, decoded.width - 1),
		alphaAt(decoded.data, (decoded.height - 1) * decoded.width),
		alphaAt(decoded.data, decoded.height * decoded.width - 1)
	];
	return {
		minimum,
		maximum,
		transparentPixels,
		translucentPixels,
		opaquePixels,
		nonTransparentCoverage: (opaquePixels + translucentPixels) / (decoded.width * decoded.height),
		cornerAlpha
	};
}

function isForegroundSafe(
	x: number,
	y: number,
	cutoffs: readonly SundropVillageObstacleForegroundCutoff[]
): boolean {
	return cutoffs.some((cutoff) => x >= cutoff.left && x < cutoff.right && y < cutoff.cutoffY);
}

function isExcluded(
	x: number,
	y: number,
	exclusions: readonly SundropVillageObstacleExclusionRect[]
): boolean {
	return exclusions.some(
		(rect) =>
			x >= rect.x - rect.width / 2 &&
			x < rect.x + rect.width / 2 &&
			y >= rect.y - rect.height / 2 &&
			y < rect.y + rect.height / 2
	);
}

function retainCanonicalPngChunks(png: Buffer): Buffer {
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
	if (!png.subarray(0, 8).equals(signature)) {
		throw new Error('Sundrop Village obstacle output is not a PNG');
	}
	const retained = [png.subarray(0, 8)];
	let offset = 8;
	let ended = false;
	while (offset + 12 <= png.length) {
		const length = png.readUInt32BE(offset);
		const end = offset + 12 + length;
		if (end > png.length)
			throw new Error('Sundrop Village obstacle PNG contains a truncated chunk');
		const type = png.toString('ascii', offset + 4, offset + 8);
		if (type === 'IHDR' || type === 'IDAT' || type === 'IEND') {
			retained.push(png.subarray(offset, end));
		}
		offset = end;
		if (type === 'IEND') {
			ended = true;
			break;
		}
	}
	if (!ended || offset !== png.length) {
		throw new Error('Sundrop Village obstacle PNG must end at IEND');
	}
	return Buffer.concat(retained);
}

async function encodeCanonicalRgba(data: Buffer, width: number, height: number): Promise<Buffer> {
	const encoded = await sharp(data, { raw: { width, height, channels: 4 } })
		.png(SUNDROP_VILLAGE_PNG_OPTIONS)
		.toBuffer();
	return retainCanonicalPngChunks(encoded);
}

/**
 * Produces deterministic base and foreground planes from one source-aligned
 * candidate while enforcing the HPA-398 masks and immutable edge-alpha rule.
 */
export async function compositeSundropVillageObstacles(
	input: SundropVillageObstacleCompositeInput
): Promise<SundropVillageObstacleCompositeResult> {
	assertUniformTransform(input.normalizationTransform, input.width, input.height);

	const [source, chromaSource, obstacleLayer, baseMask, foregroundMask, protectedMask] =
		await Promise.all([
			decodeRgba(input.source.png),
			decodeRgba(input.chromaSource.png),
			normalizeObstacleLayer(
				input.obstacleLayer,
				input.normalizationTransform,
				input.width,
				input.height
			),
			decodeRgba(input.masks.base.png),
			decodeRgba(input.masks.foreground.png),
			decodeRgba(input.masks.protected.png)
		]);
	assertDimensions('Sundrop Village obstacle source', source, input.width, input.height);
	assertDimensions('Sundrop Village obstacle base mask', baseMask, input.width, input.height);
	assertDimensions(
		'Sundrop Village obstacle foreground mask',
		foregroundMask,
		input.width,
		input.height
	);
	assertDimensions(
		'Sundrop Village obstacle protected mask',
		protectedMask,
		input.width,
		input.height
	);
	const candidateAlignment = alignObstacleLayerToBaseMask(
		obstacleLayer.normalized,
		baseMask,
		protectedMask,
		input.candidateAlignmentInsetPx
	);
	const candidate = constructSourceBackedCandidate(source, candidateAlignment.layer);

	const base = Buffer.from(source.data);
	const foreground = Buffer.alloc(source.data.byteLength);
	let baseChangedPixels = 0;
	let baseUnchangedPixels = 0;
	let foregroundOpaquePixels = 0;
	let foregroundTranslucentPixels = 0;
	let foregroundTransparentPixels = 0;

	for (let y = 0; y < input.height; y += 1) {
		for (let x = 0; x < input.width; x += 1) {
			const pixel = y * input.width + x;
			const offset = pixel * 4;
			const expectedEdgeAlpha = input.baseAlpha(x, y);
			if (
				!Number.isInteger(expectedEdgeAlpha) ||
				expectedEdgeAlpha < 0 ||
				expectedEdgeAlpha > 255
			) {
				throw new Error(`Sundrop Village obstacle base alpha is invalid at ${x},${y}`);
			}
			const protectedPixel = alphaAt(protectedMask.data, pixel) > 0;
			const basePermitted = alphaAt(baseMask.data, pixel) > 0 && !protectedPixel;
			if (basePermitted) {
				base[offset] = candidate.data[offset] ?? 0;
				base[offset + 1] = candidate.data[offset + 1] ?? 0;
				base[offset + 2] = candidate.data[offset + 2] ?? 0;
				base[offset + 3] = expectedEdgeAlpha;
			}
			const changed =
				base[offset] !== source.data[offset] ||
				base[offset + 1] !== source.data[offset + 1] ||
				base[offset + 2] !== source.data[offset + 2] ||
				base[offset + 3] !== source.data[offset + 3];
			if (changed) baseChangedPixels += 1;
			else baseUnchangedPixels += 1;

			const foregroundPermitted =
				alphaAt(foregroundMask.data, pixel) > 0 &&
				!protectedPixel &&
				isForegroundSafe(x, y, input.foregroundCutoffs) &&
				!isExcluded(x, y, input.foregroundExclusions);
			if (foregroundPermitted) {
				const candidateAlpha = candidate.data[offset + 3] ?? 0;
				foreground[offset] = candidate.data[offset] ?? 0;
				foreground[offset + 1] = candidate.data[offset + 1] ?? 0;
				foreground[offset + 2] = candidate.data[offset + 2] ?? 0;
				foreground[offset + 3] = Math.round((candidateAlpha * expectedEdgeAlpha) / 255);
			}
			const foregroundAlpha = foreground[offset + 3] ?? 0;
			if (foregroundAlpha === 0) foregroundTransparentPixels += 1;
			else if (foregroundAlpha === 255) foregroundOpaquePixels += 1;
			else foregroundTranslucentPixels += 1;
		}
	}

	const [candidatePng, basePng, foregroundPng] = await Promise.all([
		encodeCanonicalRgba(candidate.data, input.width, input.height),
		encodeCanonicalRgba(base, input.width, input.height),
		encodeCanonicalRgba(foreground, input.width, input.height)
	]);

	let baseAlphaViolations = 0;
	let protectedAreaViolations = 0;
	let foregroundMaskViolations = 0;
	let foregroundCutoffViolations = 0;
	let foregroundEdgeAlphaViolations = 0;
	let foregroundAlphaModulationViolations = 0;
	for (let y = 0; y < input.height; y += 1) {
		for (let x = 0; x < input.width; x += 1) {
			const pixel = y * input.width + x;
			const offset = pixel * 4;
			const expectedEdgeAlpha = input.baseAlpha(x, y);
			if (base[offset + 3] !== expectedEdgeAlpha) baseAlphaViolations += 1;
			const actualForegroundAlpha = foreground[offset + 3] ?? 0;
			const protectedPixel = alphaAt(protectedMask.data, pixel) > 0;
			const masked = alphaAt(foregroundMask.data, pixel) > 0;
			const cutoffSafe = isForegroundSafe(x, y, input.foregroundCutoffs);
			const excluded = isExcluded(x, y, input.foregroundExclusions);
			const expectedForegroundAlpha =
				masked && !protectedPixel && cutoffSafe && !excluded
					? Math.round(((candidate.data[offset + 3] ?? 0) * expectedEdgeAlpha) / 255)
					: 0;
			if (protectedPixel && actualForegroundAlpha !== 0) protectedAreaViolations += 1;
			if (!masked && actualForegroundAlpha !== 0) foregroundMaskViolations += 1;
			if (!cutoffSafe && actualForegroundAlpha !== 0) foregroundCutoffViolations += 1;
			if (actualForegroundAlpha > expectedEdgeAlpha) foregroundEdgeAlphaViolations += 1;
			if (actualForegroundAlpha !== expectedForegroundAlpha) {
				foregroundAlphaModulationViolations += 1;
			}
		}
	}

	const maskProvenance = (image: SundropVillageObstacleImageInput, decoded: DecodedRgba) => ({
		path: image.path,
		bytes: image.png.byteLength,
		sha256: sha256(image.png),
		pixelsSha256: sha256(decoded.data),
		dimensions: dimensions(decoded)
	});
	const provenance = {
		algorithmVersion: 'sundrop-village-obstacle-composite-v3',
		controlFingerprint: input.controlFingerprint,
		prompt: input.prompt,
		source: maskProvenance(input.source, source),
		chromaSource: maskProvenance(input.chromaSource, chromaSource),
		obstacleLayer: {
			path: input.obstacleLayer.path,
			bytes: input.obstacleLayer.png.byteLength,
			sha256: sha256(input.obstacleLayer.png),
			pixelsSha256: sha256(obstacleLayer.raw.data),
			dimensions: dimensions(obstacleLayer.raw),
			alpha: alphaStatistics(obstacleLayer.raw),
			normalized: {
				pixelsSha256: sha256(obstacleLayer.normalized.data),
				dimensions: dimensions(obstacleLayer.normalized)
			}
		},
		candidate: {
			path: input.candidateOutputPath,
			construction:
				'aligned obstacle RGB alpha-composited over immutable HPA-307 source; aligned obstacle alpha retained',
			alignment: {
				method: 'base-permitted-inner-linear-feather',
				insetPx: input.candidateAlignmentInsetPx,
				sourceIdentityAtDistancePx: 1,
				fullContributionAtDistancePx: input.candidateAlignmentInsetPx + 1,
				changedAlphaPixels: candidateAlignment.changedAlphaPixels,
				zeroedBoundaryPixels: candidateAlignment.zeroedBoundaryPixels,
				alignedPixelsSha256: sha256(candidateAlignment.layer.data)
			},
			bytes: candidatePng.byteLength,
			sha256: sha256(candidatePng),
			pixelsSha256: sha256(candidate.data),
			dimensions: dimensions(candidate)
		},
		normalizationTransform: input.normalizationTransform,
		controlArtifacts: Object.fromEntries(
			Object.entries(input.controlArtifacts)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([name, artifact]) => [
					name,
					{
						path: artifact.path,
						bytes: artifact.bytes.byteLength,
						sha256: sha256(artifact.bytes)
					}
				])
		),
		masks: {
			base: maskProvenance(input.masks.base, baseMask),
			foreground: maskProvenance(input.masks.foreground, foregroundMask),
			protected: maskProvenance(input.masks.protected, protectedMask)
		},
		foregroundCutoffs: input.foregroundCutoffs,
		foregroundExclusions: input.foregroundExclusions,
		outputs: {
			base: {
				bytes: basePng.byteLength,
				sha256: sha256(basePng),
				pixelsSha256: sha256(base),
				dimensions: { width: input.width, height: input.height }
			},
			foreground: {
				bytes: foregroundPng.byteLength,
				sha256: sha256(foregroundPng),
				pixelsSha256: sha256(foreground),
				dimensions: { width: input.width, height: input.height }
			}
		},
		statistics: {
			totalPixels: input.width * input.height,
			baseChangedPixels,
			baseUnchangedPixels,
			baseAlphaViolations,
			foregroundOpaquePixels,
			foregroundTranslucentPixels,
			foregroundTransparentPixels,
			protectedAreaViolations,
			foregroundMaskViolations,
			foregroundCutoffViolations,
			foregroundEdgeAlphaViolations,
			foregroundAlphaModulationViolations
		}
	};

	return {
		candidatePng,
		basePng,
		foregroundPng,
		provenanceJson: Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`)
	};
}

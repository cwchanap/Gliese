import { readFile } from 'node:fs/promises';

import sharp from 'sharp';

import { decodeMeadowEntryRgba } from '$lib/game/content/backgrounds/meadow-entry-png';

const mode = process.argv[2] ?? 'default';
if (mode === 'simd-off' || mode === 'both') sharp.simd(false);
if (mode === 'concurrency-one' || mode === 'both') sharp.concurrency(1);
if (!['default', 'simd-off', 'concurrency-one', 'both'].includes(mode)) {
	throw new Error(`Unknown Sharp diagnostic mode: ${mode}`);
}

const proofPath = 'docs/superpowers/reports/img/hpa-399/proofs/regions/crossroads.png';
const basePath = 'artifacts/meadow-entry/hpa-399/exports/crossroads-base.png';
const foregroundPath = 'artifacts/meadow-entry/hpa-399/exports/crossroads-foreground.png';
const [expected, base, foreground] = await Promise.all([
	decodeMeadowEntryRgba(await readFile(proofPath)),
	readFile(basePath),
	readFile(foregroundPath)
]);
const { data: actual, info } = await sharp(base)
	.composite([{ input: foreground, left: 0, top: 0 }])
	.toColourspace('srgb')
	.ensureAlpha()
	.raw()
	.toBuffer({ resolveWithObject: true });
if (info.width !== expected.width || info.height !== expected.height || info.channels !== 4) {
	throw new Error('Sharp diagnostic dimensions differ');
}

let differingPixels = 0;
let differingChannels = 0;
let maximumAbsoluteDelta = 0;
const deltaHistogram = new Map<number, number>();
const firstDifferences: Record<string, number>[] = [];
for (let offset = 0; offset < actual.length; offset += 4) {
	let pixelDiffers = false;
	for (let channel = 0; channel < 4; channel += 1) {
		const delta = actual[offset + channel]! - expected.data[offset + channel]!;
		if (delta === 0) continue;
		pixelDiffers = true;
		differingChannels += 1;
		maximumAbsoluteDelta = Math.max(maximumAbsoluteDelta, Math.abs(delta));
		deltaHistogram.set(delta, (deltaHistogram.get(delta) ?? 0) + 1);
		if (firstDifferences.length < 10) {
			const pixel = offset / 4;
			firstDifferences.push({
				x: pixel % expected.width,
				y: Math.floor(pixel / expected.width),
				channel,
				expected: expected.data[offset + channel]!,
				actual: actual[offset + channel]!,
				delta
			});
		}
	}
	if (pixelDiffers) differingPixels += 1;
}

process.stdout.write(
	`${JSON.stringify({
		mode,
		sharpConcurrency: sharp.concurrency(),
		sharpSimd: sharp.simd(),
		differingPixels,
		differingChannels,
		maximumAbsoluteDelta,
		deltaHistogram: Object.fromEntries([...deltaHistogram.entries()].sort(([a], [b]) => a - b)),
		firstDifferences
	})}\n`
);

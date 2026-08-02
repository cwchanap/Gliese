import { readFile } from 'node:fs/promises';

import { decodeMeadowEntryRgba } from '$lib/game/content/backgrounds/meadow-entry-png';

interface ChannelDifference {
	x: number;
	y: number;
	channel: number;
	expected: number;
	actual: number;
	delta: number;
}

async function diagnose(expectedPath: string, actualPath: string): Promise<void> {
	const [expected, actual] = await Promise.all([
		decodeMeadowEntryRgba(await readFile(expectedPath)),
		decodeMeadowEntryRgba(await readFile(actualPath))
	]);
	if (expected.width !== actual.width || expected.height !== actual.height) {
		throw new Error(
			`dimension mismatch ${expected.width}x${expected.height}/${actual.width}x${actual.height}`
		);
	}

	let differingPixels = 0;
	let differingChannels = 0;
	let maximumAbsoluteDelta = 0;
	const deltaHistogram = new Map<number, number>();
	const firstDifferences: ChannelDifference[] = [];
	for (let offset = 0; offset < expected.data.length; offset += 4) {
		let pixelDiffers = false;
		for (let channel = 0; channel < 4; channel += 1) {
			const expectedValue = expected.data[offset + channel]!;
			const actualValue = actual.data[offset + channel]!;
			const delta = actualValue - expectedValue;
			if (delta === 0) continue;
			pixelDiffers = true;
			differingChannels += 1;
			maximumAbsoluteDelta = Math.max(maximumAbsoluteDelta, Math.abs(delta));
			deltaHistogram.set(delta, (deltaHistogram.get(delta) ?? 0) + 1);
			if (firstDifferences.length < 20) {
				const pixel = offset / 4;
				firstDifferences.push({
					x: pixel % expected.width,
					y: Math.floor(pixel / expected.width),
					channel,
					expected: expectedValue,
					actual: actualValue,
					delta
				});
			}
		}
		if (pixelDiffers) differingPixels += 1;
	}

	process.stdout.write(
		`${JSON.stringify({
			expectedPath,
			actualPath,
			width: expected.width,
			height: expected.height,
			differingPixels,
			differingChannels,
			maximumAbsoluteDelta,
			deltaHistogram: Object.fromEntries(
				[...deltaHistogram.entries()].sort(([first], [second]) => first - second)
			),
			firstDifferences
		})}\n`
	);
}

const pairs = process.argv.slice(2);
if (pairs.length === 0 || pairs.length % 2 !== 0) {
	throw new Error('Expected one or more expected/actual PNG path pairs');
}
for (let index = 0; index < pairs.length; index += 2) {
	await diagnose(pairs[index]!, pairs[index + 1]!);
}

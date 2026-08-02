import { readFile } from 'node:fs/promises';

import { decodeMeadowEntryRgba } from '$lib/game/content/backgrounds/meadow-entry-png';

const PROOF = 'docs/superpowers/reports/img/hpa-399/proofs/regions/crossroads.png';
const BASE = 'artifacts/meadow-entry/hpa-399/exports/crossroads-base.png';
const FOREGROUND = 'artifacts/meadow-entry/hpa-399/exports/crossroads-foreground.png';

const [expected, base, foreground] = await Promise.all(
	[PROOF, BASE, FOREGROUND].map(async (path) => decodeMeadowEntryRgba(await readFile(path)))
);
if (
	expected.width !== base.width ||
	expected.height !== base.height ||
	foreground.width !== base.width ||
	foreground.height !== base.height
) {
	throw new Error('Composite diagnostic dimensions differ');
}

type Formula = (numerator: number) => number;
const formulas: Readonly<Record<string, Formula>> = {
	floor: (numerator) => Math.floor(numerator / 255),
	halfUp: (numerator) => Math.floor((numerator + 127) / 255),
	halfDown: (numerator) => Math.floor((numerator + 126) / 255),
	ceil: (numerator) => Math.ceil(numerator / 255)
};
const mismatches = Object.fromEntries(Object.keys(formulas).map((name) => [name, 0])) as Record<
	string,
	number
>;
const firstDifferences: Record<string, unknown>[] = [];
const floorMismatches: Record<string, unknown>[] = [];

for (let offset = 0; offset < expected.data.length; offset += 4) {
	const alpha = foreground.data[offset + 3]!;
	for (let channel = 0; channel < 3; channel += 1) {
		const destination = base.data[offset + channel]!;
		const source = foreground.data[offset + channel]!;
		const numerator = source * alpha + destination * (255 - alpha);
		const expectedValue = expected.data[offset + channel]!;
		for (const [name, formula] of Object.entries(formulas)) {
			if (formula(numerator) !== expectedValue) mismatches[name] = (mismatches[name] ?? 0) + 1;
		}
		const pixel = offset / 4;
		if (floorMismatches.length < 20 && formulas.floor!(numerator) !== expectedValue) {
			floorMismatches.push({
				x: pixel % expected.width,
				y: Math.floor(pixel / expected.width),
				channel,
				destination,
				source,
				alpha,
				numerator,
				remainder: numerator % 255,
				expected: expectedValue,
				floor: formulas.floor!(numerator),
				halfUp: formulas.halfUp!(numerator),
				halfDown: formulas.halfDown!(numerator),
				ceil: formulas.ceil!(numerator)
			});
		}
		if (
			firstDifferences.length < 20 &&
			formulas.floor!(numerator) !== formulas.halfUp!(numerator)
		) {
			firstDifferences.push({
				x: pixel % expected.width,
				y: Math.floor(pixel / expected.width),
				channel,
				destination,
				source,
				alpha,
				numerator,
				remainder: numerator % 255,
				expected: expectedValue,
				floor: formulas.floor!(numerator),
				halfUp: formulas.halfUp!(numerator),
				halfDown: formulas.halfDown!(numerator),
				ceil: formulas.ceil!(numerator)
			});
		}
	}
	if (expected.data[offset + 3] !== 255) {
		throw new Error(`Approved crossroads proof is not opaque at pixel ${offset / 4}`);
	}
}

process.stdout.write(`${JSON.stringify({ mismatches, floorMismatches, firstDifferences })}\n`);

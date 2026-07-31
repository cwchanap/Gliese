import { normalizeSundropVillageBackground } from '../src/lib/game/content/backgrounds/sundrop-village-png';

import { parseFlagPairs } from './parse-flag-pairs';

const REQUIRED_ARGUMENTS = [
	'--input',
	'--output',
	'--transform-output',
	'--crop-x',
	'--crop-y',
	'--crop-width',
	'--crop-height'
] as const;

function parseInteger(value: string, name: string): number {
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) throw new Error(`${name} must be a safe integer`);
	return parsed;
}

function parseArguments(argv: readonly string[]): {
	input: string;
	output: string;
	transformOutput: string;
	crop: { x: number; y: number; width: number; height: number };
} {
	const values = parseFlagPairs([...REQUIRED_ARGUMENTS], [...argv]);
	for (const name of REQUIRED_ARGUMENTS) {
		if (!values.has(name.slice(2))) throw new Error(`Missing required argument ${name}`);
	}

	return {
		input: values.get('input')!,
		output: values.get('output')!,
		transformOutput: values.get('transform-output')!,
		crop: {
			x: parseInteger(values.get('crop-x')!, '--crop-x'),
			y: parseInteger(values.get('crop-y')!, '--crop-y'),
			width: parseInteger(values.get('crop-width')!, '--crop-width'),
			height: parseInteger(values.get('crop-height')!, '--crop-height')
		}
	};
}

async function main(): Promise<void> {
	const transform = await normalizeSundropVillageBackground(parseArguments(process.argv.slice(2)));
	console.log(JSON.stringify(transform));
}

await main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});

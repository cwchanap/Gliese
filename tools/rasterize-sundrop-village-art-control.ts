import { rasterizeSundropVillageArtControl } from '../src/lib/game/content/backgrounds/sundrop-village-png';

import { parseFlagPairs } from './parse-flag-pairs';

function parseArguments(argv: readonly string[]): { input: string; output: string } {
	const values = parseFlagPairs(['--input', '--output'], [...argv]);
	const input = values.get('input');
	const output = values.get('output');
	if (!input || !output) {
		throw new Error(
			'Usage: art:rasterize:village -- --input=<village-art-control.svg> --output=<reference.png>'
		);
	}
	return { input, output };
}

async function main(): Promise<void> {
	const options = parseArguments(process.argv.slice(2));
	await rasterizeSundropVillageArtControl(options);
	console.log(`Rasterized ${options.input} -> ${options.output} (1792x1536 truecolor RGBA)`);
}

await main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});

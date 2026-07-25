import { rasterizeSundropVillageArtControl } from '../src/lib/game/content/backgrounds/sundrop-village-png';

function parseArguments(argv: readonly string[]): { input: string; output: string } {
	const values = new Map<string, string>();
	const args = argv[0] === '--' ? argv.slice(1) : [...argv];
	for (let index = 0; index < args.length; index += 2) {
		const name = args[index];
		const value = args[index + 1];
		if (!name?.startsWith('--') || !value || value.startsWith('--')) {
			throw new Error(
				'Usage: art:rasterize:village -- --input <village-art-control.svg> --output <reference.png>'
			);
		}
		if (name !== '--input' && name !== '--output') {
			throw new Error(`Unknown argument ${name}`);
		}
		if (values.has(name)) throw new Error(`Duplicate argument ${name}`);
		values.set(name, value);
	}
	const input = values.get('--input');
	const output = values.get('--output');
	if (!input || !output) {
		throw new Error(
			'Usage: art:rasterize:village -- --input <village-art-control.svg> --output <reference.png>'
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

import { normalizeSundropVillageBackground } from '../src/lib/game/content/backgrounds/sundrop-village-png';

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
	const values = new Map<string, string>();
	const args = argv[0] === '--' ? argv.slice(1) : [...argv];
	for (let index = 0; index < args.length; index += 2) {
		const name = args[index];
		const value = args[index + 1];
		if (!name?.startsWith('--') || !value || value.startsWith('--')) {
			throw new Error(
				'Usage: art:normalize:village -- --input <candidate> --output <normalized.png> --transform-output <transform.json> --crop-x <integer> --crop-y <integer> --crop-width <integer> --crop-height <integer>'
			);
		}
		if (!(REQUIRED_ARGUMENTS as readonly string[]).includes(name)) {
			throw new Error(`Unknown argument ${name}`);
		}
		if (values.has(name)) throw new Error(`Duplicate argument ${name}`);
		values.set(name, value);
	}
	for (const name of REQUIRED_ARGUMENTS) {
		if (!values.has(name)) throw new Error(`Missing required argument ${name}`);
	}

	return {
		input: values.get('--input')!,
		output: values.get('--output')!,
		transformOutput: values.get('--transform-output')!,
		crop: {
			x: parseInteger(values.get('--crop-x')!, '--crop-x'),
			y: parseInteger(values.get('--crop-y')!, '--crop-y'),
			width: parseInteger(values.get('--crop-width')!, '--crop-width'),
			height: parseInteger(values.get('--crop-height')!, '--crop-height')
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

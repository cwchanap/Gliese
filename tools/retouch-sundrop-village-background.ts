import { resolve } from 'node:path';

import {
	SUNDROP_VILLAGE_RETOUCH_INPUT_PATH,
	writeSundropVillageRetouch
} from '../src/lib/game/content/backgrounds/sundrop-village-retouch';

import { parseFlagPairs } from './parse-flag-pairs';

interface RetouchArguments {
	readonly output: string;
	readonly provenanceOutput: string;
}

function parseArguments(argv: readonly string[]): RetouchArguments {
	const values = parseFlagPairs(['--output', '--provenance-output'], [...argv]);
	const output = values.get('output');
	const provenanceOutput = values.get('provenance-output');
	if (!output || !provenanceOutput) {
		throw new Error(
			'Usage: art:retouch:village -- --output=<candidate.png> --provenance-output=<provenance.json>'
		);
	}

	return {
		output: resolve(output),
		provenanceOutput: resolve(provenanceOutput)
	};
}

async function main(): Promise<void> {
	const arguments_ = parseArguments(process.argv.slice(2));
	const options = {
		input: resolve(SUNDROP_VILLAGE_RETOUCH_INPUT_PATH),
		...arguments_
	};
	const result = await writeSundropVillageRetouch(options);

	console.log(`input=${options.input}`);
	console.log(`inputSha256=${result.provenance.input.sha256}`);
	console.log(`output=${options.output}`);
	console.log(`outputSha256=${result.provenance.output.sha256}`);
	console.log(`outputBytes=${result.provenance.output.bytes}`);
	console.log(`provenance=${options.provenanceOutput}`);
	console.log(`changedPixels=${result.provenance.statistics.changedPixels}`);
	console.log(
		`maximumAbsoluteChannelDelta=${result.provenance.statistics.maximumAbsoluteChannelDelta}`
	);
	console.log(`meanAbsoluteChannelDelta=${result.provenance.statistics.meanAbsoluteChannelDelta}`);
	console.log(
		`meanAbsoluteChannelDeltaOnAuthoredPaths=${result.provenance.statistics.meanAbsoluteChannelDeltaOnAuthoredPaths}`
	);
	console.log(
		`meanAbsoluteChannelDeltaOutsideAuthoredPaths=${result.provenance.statistics.meanAbsoluteChannelDeltaOutsideAuthoredPaths}`
	);
}

await main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});

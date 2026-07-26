import {
	SUNDROP_VILLAGE_BACKGROUND_HARD_LIMIT_BYTES,
	SUNDROP_VILLAGE_BACKGROUND_REVIEW_TARGET_BYTES
} from '../src/lib/game/content/backgrounds/sundrop-village-background';
import {
	type SundropVillagePngTier,
	writeFinalizedSundropVillagePng
} from '../src/lib/game/content/backgrounds/sundrop-village-png';

import { parseFlagPairs } from './parse-flag-pairs';

function parseTier(value: string): SundropVillagePngTier {
	const tier = Number(value);
	if (tier !== 0 && tier !== 1 && tier !== 2 && tier !== 3) {
		throw new Error('--tier must be one of 0, 1, 2, or 3');
	}
	return tier;
}

function parseArguments(argv: readonly string[]): {
	input: string;
	output: string;
	tier: SundropVillagePngTier;
} {
	const values = parseFlagPairs(['--input', '--output', '--tier'], [...argv]);
	const input = values.get('input');
	const output = values.get('output');
	const tier = values.get('tier');
	if (!input || !output || tier === undefined) {
		throw new Error(
			'Usage: art:finalize:village -- --input=<normalized.png> --output=<final.png> --tier=<0|1|2|3>'
		);
	}
	return { input, output, tier: parseTier(tier) };
}

async function main(): Promise<void> {
	const result = await writeFinalizedSundropVillagePng(parseArguments(process.argv.slice(2)));
	console.log(`tier=${result.tier}`);
	console.log(`bytes=${result.bytes}`);
	console.log(
		`reviewTarget=${result.bytes <= SUNDROP_VILLAGE_BACKGROUND_REVIEW_TARGET_BYTES ? 'pass' : 'exception-required'} (${SUNDROP_VILLAGE_BACKGROUND_REVIEW_TARGET_BYTES})`
	);
	console.log(`hardLimit=pass (${SUNDROP_VILLAGE_BACKGROUND_HARD_LIMIT_BYTES})`);
	console.log(`sha256=${result.sha256}`);
}

await main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});

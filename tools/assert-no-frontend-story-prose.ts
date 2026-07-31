import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
// At least one distinctive phrase from each beat file in story/beats/prologue/.
// Ensures every migrated story file has regression coverage.
const blockedPhrases = [
	// guild-master.md
	'The eastern ruins are stirring again',
	'The Guild board is yours to work through',
	'Good work out there',
	'The Guild keeps watch over the old road',
	// guild-quartermaster.md
	'If you are bound for the ruins',
	'Need field gear before the ruins',
	// shopkeeper-mira.md
	'Back from the Guild? Take a tonic',
	'Fresh tonics are on the shelf'
];

if (!existsSync(distDir)) {
	console.error('dist/ does not exist. Run the frontend build before checking story prose.');
	process.exit(1);
}

for (const filePath of walkFiles(distDir)) {
	if (filePath.includes('browser-fixture')) {
		console.error('dist/ appears to be a browser build (browser-fixture chunk found).');
		console.error('Run `bun run build --mode tauri` before checking for story prose.');
		process.exit(1);
	}
}

const matches: string[] = [];

for (const filePath of walkFiles(distDir)) {
	const contents = readFileSync(filePath, 'utf8');
	for (const phrase of blockedPhrases) {
		if (contents.includes(phrase)) {
			matches.push(`${filePath}: ${phrase}`);
		}
	}
}

if (matches.length > 0) {
	console.error('Release frontend bundle contains migrated story prose:');
	for (const match of matches) {
		console.error(`- ${match}`);
	}
	process.exit(1);
}

console.log('No migrated story prose found in dist/.');

function* walkFiles(dir: string): Generator<string> {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		const stats = statSync(path);

		if (stats.isDirectory()) {
			yield* walkFiles(path);
			continue;
		}

		if (stats.isFile()) {
			yield path;
		}
	}
}

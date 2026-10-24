import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
// Every compiled story line long enough to be distinctive. The catalog is the
// browser fixture's data, written by `bun run story:check`.
const catalogPath = join(process.cwd(), 'src/lib/game/story/browser-catalog.generated.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as {
	npcDialogues: Array<{ branches: Array<{ lines: Array<{ text: string }> }> }>;
	scenes: Array<{ lines: Array<{ text: string }> }>;
};
const blockedPhrases = [
	...new Set(
		[...catalog.npcDialogues.flatMap((dialogue) => dialogue.branches), ...catalog.scenes]
			.flatMap(({ lines }) => lines.map((line) => line.text))
			.filter((text) => text.length >= 24)
	)
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

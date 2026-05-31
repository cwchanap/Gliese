import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const blockedPhrases = ['The eastern ruins are stirring again', 'Fresh tonics are on the shelf'];

if (!existsSync(distDir)) {
	console.error('dist/ does not exist. Run the frontend build before checking story prose.');
	process.exit(1);
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

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { VILLAGE_ART_CONTROL_FILENAMES } from '$lib/game/content/maps/layered/village-art-controls';

import { MEADOW_ENTRY_CONTROL_SOURCE_FILE_PATHS } from './meadow-entry-controls';

const MASK_SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" width="6400" height="6400" viewBox="0 0 6400 6400"></svg>\n';

function writeFixtureFile(root: string, path: string, content: string | Buffer): void {
	const destination = join(root, path);
	mkdirSync(dirname(destination), { recursive: true });
	writeFileSync(destination, content);
}

export function createMeadowEntryControlRepositoryFixture(
	sourceRepositoryRoot = process.cwd()
): string {
	const root = mkdtempSync(join(tmpdir(), 'gliese-meadow-controls-'));

	for (const filename of VILLAGE_ART_CONTROL_FILENAMES) {
		writeFixtureFile(root, `docs/superpowers/reports/img/hpa-307/${filename}`, `${filename}\n`);
	}
	for (const path of MEADOW_ENTRY_CONTROL_SOURCE_FILE_PATHS) {
		writeFixtureFile(root, path, `${path}\n`);
	}
	writeFixtureFile(
		root,
		'src/lib/game/content/backgrounds/meadow-entry-controls.ts',
		'meadow-entry-controls test implementation\n'
	);
	writeFixtureFile(
		root,
		'.gitattributes',
		readFileSync(join(sourceRepositoryRoot, '.gitattributes'))
	);
	writeFixtureFile(
		root,
		'artifacts/meadow-entry/painted-v2/controls/meadow-entry-foreground-eligible-mask.svg',
		MASK_SVG
	);
	writeFixtureFile(
		root,
		'artifacts/meadow-entry/painted-v2/controls/meadow-entry-protected-live-mask.svg',
		MASK_SVG
	);

	return root;
}

export function removeMeadowEntryControlRepositoryFixture(root: string): void {
	rmSync(root, { recursive: true, force: true });
}

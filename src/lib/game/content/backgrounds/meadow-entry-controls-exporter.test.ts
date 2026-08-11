import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { VILLAGE_ART_CONTROL_FILENAMES } from '$lib/game/content/maps/layered/village-art-controls';

import {
	MEADOW_ENTRY_CONTROL_FILENAMES,
	MEADOW_ENTRY_CONTROL_SOURCE_FILE_PATHS
} from './meadow-entry-controls';

const testDirectory = dirname(fileURLToPath(import.meta.url));

interface ExportPackage {
	readonly rendered: Readonly<Record<string, string>>;
	readonly generatedContents: string;
}

interface ExportPaths {
	readonly repositoryRoot: string;
	readonly controlsDirectory: string;
	readonly generatedPath: string;
}

interface ExportFileSystem {
	existsSync: typeof existsSync;
	mkdirSync: typeof mkdirSync;
	mkdtempSync: typeof mkdtempSync;
	readdirSync: typeof readdirSync;
	readFileSync: typeof readFileSync;
	renameSync: typeof renameSync;
	rmSync: typeof rmSync;
	writeFileSync: typeof writeFileSync;
}

interface ExporterApi {
	assertAllowedMeadowEntryDestination?: (paths: ExportPaths, path: string) => void;
	meadowEntryExportPaths?: (repositoryRoot: string) => ExportPaths;
	checkMeadowEntryExportPackage?: (
		packageBytes: ExportPackage,
		paths: ExportPaths,
		fileSystem?: ExportFileSystem
	) => void;
	publishMeadowEntryExportPackage?: (
		packageBytes: ExportPackage,
		paths: ExportPaths,
		fileSystem?: ExportFileSystem
	) => void;
	runMeadowEntryArtControlsExporter?: (args: readonly string[], repositoryRoot?: string) => void;
}

const temporaryRoots: string[] = [];
let exporterPromise: Promise<ExporterApi> | undefined;

async function exporterApi(): Promise<ExporterApi> {
	if (!exporterPromise) {
		const originalArgv = process.argv;
		process.argv = [process.execPath, 'tools/export-meadow-entry-art-controls.ts', '--check'];
		exporterPromise = import('../../../../../tools/export-meadow-entry-art-controls').finally(
			() => {
				process.argv = originalArgv;
			}
		) as Promise<ExporterApi>;
	}
	return exporterPromise;
}

function newPaths(): ExportPaths {
	const repositoryRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-exporter-'));
	temporaryRoots.push(repositoryRoot);
	return {
		repositoryRoot,
		controlsDirectory: join(repositoryRoot, 'artifacts/meadow-entry/painted-v2/controls'),
		generatedPath: join(
			repositoryRoot,
			'src/lib/game/content/generated/meadow-entry-painted-v2-art-control.ts'
		)
	};
}

function seedRepositorySources(repositoryRoot: string): void {
	const realRoot = resolve(testDirectory, '../../../../..');
	for (const relative of [
		'src/lib/game/content/backgrounds/meadow-entry-controls.ts',
		...MEADOW_ENTRY_CONTROL_SOURCE_FILE_PATHS,
		...VILLAGE_ART_CONTROL_FILENAMES.map(
			(filename) => `docs/superpowers/reports/img/hpa-307/${filename}`
		)
	]) {
		const target = join(repositoryRoot, relative);
		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, readFileSync(join(realRoot, relative)));
	}
}

function packageBytes(prefix: string): ExportPackage {
	return {
		rendered: Object.fromEntries(
			MEADOW_ENTRY_CONTROL_FILENAMES.map((filename) => [filename, `${prefix}:${filename}\n`])
		),
		generatedContents: `${prefix}:generated\n`
	};
}

function writePackage(packageValue: ExportPackage, paths: ExportPaths): void {
	mkdirSync(paths.controlsDirectory, { recursive: true });
	mkdirSync(join(paths.repositoryRoot, 'src/lib/game/content/generated'), { recursive: true });
	for (const [filename, contents] of Object.entries(packageValue.rendered)) {
		writeFileSync(join(paths.controlsDirectory, filename), contents);
	}
	writeFileSync(paths.generatedPath, packageValue.generatedContents);
}

function packageSnapshot(paths: ExportPaths): Readonly<Record<string, string>> {
	return Object.fromEntries([
		...MEADOW_ENTRY_CONTROL_FILENAMES.map((filename) => [
			filename,
			readFileSync(join(paths.controlsDirectory, filename), 'utf8')
		]),
		['generated', readFileSync(paths.generatedPath, 'utf8')]
	]);
}

const NODE_FILE_SYSTEM: ExportFileSystem = {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync
};

afterEach(() => {
	for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('meadow-entry exporter package safety', () => {
	it('checks matching bytes without changing files', async () => {
		const api = await exporterApi();
		expect(api.checkMeadowEntryExportPackage).toBeTypeOf('function');
		if (!api.checkMeadowEntryExportPackage) return;
		const paths = newPaths();
		const current = packageBytes('current');
		writePackage(current, paths);
		const before = packageSnapshot(paths);
		const mtimes = Object.fromEntries(
			[
				...MEADOW_ENTRY_CONTROL_FILENAMES.map((filename) =>
					join(paths.controlsDirectory, filename)
				),
				paths.generatedPath
			].map((path) => [path, statSync(path).mtimeMs])
		);

		api.checkMeadowEntryExportPackage(current, paths);

		expect(packageSnapshot(paths)).toEqual(before);
		for (const [path, mtimeMs] of Object.entries(mtimes)) {
			expect(statSync(path).mtimeMs, path).toBe(mtimeMs);
		}
	});

	it('repairs a missing allowlisted control through one complete package publication', async () => {
		const api = await exporterApi();
		expect(api.publishMeadowEntryExportPackage).toBeTypeOf('function');
		if (!api.publishMeadowEntryExportPackage) return;
		const paths = newPaths();
		writePackage(packageBytes('old'), paths);
		rmSync(join(paths.controlsDirectory, MEADOW_ENTRY_CONTROL_FILENAMES[3]));
		const next = packageBytes('new');

		api.publishMeadowEntryExportPackage(next, paths);

		expect(packageSnapshot(paths)).toEqual({
			...next.rendered,
			generated: next.generatedContents
		});
	});

	it('atomically restores the same incomplete package if missing-file repair publication fails', async () => {
		const api = await exporterApi();
		expect(api.publishMeadowEntryExportPackage).toBeTypeOf('function');
		if (!api.publishMeadowEntryExportPackage) return;
		const paths = newPaths();
		const previous = packageBytes('old');
		writePackage(previous, paths);
		const missingFilename = MEADOW_ENTRY_CONTROL_FILENAMES[3];
		rmSync(join(paths.controlsDirectory, missingFilename));
		const failingFileSystem: ExportFileSystem = {
			...NODE_FILE_SYSTEM,
			renameSync: ((source: string, destination: string) => {
				if (
					destination === paths.generatedPath &&
					source.includes('.meadow-entry-package-generated-')
				) {
					throw new Error('injected missing-file repair publish failure');
				}
				return renameSync(source, destination);
			}) as typeof renameSync
		};

		expect(() =>
			api.publishMeadowEntryExportPackage!(packageBytes('new'), paths, failingFileSystem)
		).toThrow('injected missing-file repair publish failure');
		expect(existsSync(join(paths.controlsDirectory, missingFilename))).toBe(false);
		for (const filename of MEADOW_ENTRY_CONTROL_FILENAMES) {
			if (filename === missingFilename) continue;
			expect(readFileSync(join(paths.controlsDirectory, filename), 'utf8'), filename).toBe(
				previous.rendered[filename]
			);
		}
		expect(readFileSync(paths.generatedPath, 'utf8')).toBe(previous.generatedContents);
	});

	it('rejects unexpected inventory, predecessor destinations, and differing bytes', async () => {
		const api = await exporterApi();
		expect(api.checkMeadowEntryExportPackage).toBeTypeOf('function');
		expect(api.assertAllowedMeadowEntryDestination).toBeTypeOf('function');
		if (!api.checkMeadowEntryExportPackage || !api.assertAllowedMeadowEntryDestination) return;
		const paths = newPaths();
		const current = packageBytes('current');
		writePackage(current, paths);
		writeFileSync(join(paths.controlsDirectory, 'unexpected.txt'), 'unexpected');

		expect(() => api.checkMeadowEntryExportPackage!(current, paths)).toThrow('fixed allowlist');
		expect(() => api.publishMeadowEntryExportPackage!(current, paths)).toThrow('fixed allowlist');
		rmSync(join(paths.controlsDirectory, 'unexpected.txt'));
		mkdirSync(join(paths.controlsDirectory, 'unexpected-directory'));
		expect(() => api.publishMeadowEntryExportPackage!(current, paths)).toThrow('non-file');
		rmSync(join(paths.controlsDirectory, 'unexpected-directory'), { recursive: true });
		writeFileSync(join(paths.controlsDirectory, MEADOW_ENTRY_CONTROL_FILENAMES[0]), 'different\n');
		expect(() => api.checkMeadowEntryExportPackage!(current, paths)).toThrow('is stale');
		expect(() =>
			api.assertAllowedMeadowEntryDestination!(
				paths,
				join(paths.repositoryRoot, 'docs/superpowers/reports/img/hpa-398/forbidden.svg')
			)
		).toThrow('Refusing unexpected');
		expect(() =>
			api.assertAllowedMeadowEntryDestination!(
				paths,
				join(paths.repositoryRoot, 'docs/superpowers/reports/img/hpa-307/forbidden.svg')
			)
		).toThrow('Refusing unexpected');
		expect(() =>
			api.assertAllowedMeadowEntryDestination!(
				paths,
				join(paths.repositoryRoot, '..', 'outside-repository.svg')
			)
		).toThrow('Refusing unexpected');
	});

	it('restores an absent controls package and existing generated module when generated publish fails', async () => {
		const api = await exporterApi();
		expect(api.publishMeadowEntryExportPackage).toBeTypeOf('function');
		if (!api.publishMeadowEntryExportPackage) return;
		const paths = newPaths();
		mkdirSync(join(paths.repositoryRoot, 'src/lib/game/content/generated'), { recursive: true });
		writeFileSync(paths.generatedPath, 'old-generated\n');
		const failingFileSystem: ExportFileSystem = {
			...NODE_FILE_SYSTEM,
			renameSync: ((source: string, destination: string) => {
				if (
					destination === paths.generatedPath &&
					source.includes('.meadow-entry-package-generated-')
				) {
					throw new Error('injected generated publish failure');
				}
				return renameSync(source, destination);
			}) as typeof renameSync
		};

		expect(() =>
			api.publishMeadowEntryExportPackage!(packageBytes('new'), paths, failingFileSystem)
		).toThrow('injected generated publish failure');
		expect(existsSync(paths.controlsDirectory)).toBe(false);
		expect(readFileSync(paths.generatedPath, 'utf8')).toBe('old-generated\n');
	});

	it('leaves the previous package untouched when staging fails before backups', async () => {
		const api = await exporterApi();
		expect(api.publishMeadowEntryExportPackage).toBeTypeOf('function');
		if (!api.publishMeadowEntryExportPackage) return;
		const paths = newPaths();
		const previous = packageBytes('old');
		writePackage(previous, paths);
		const failingFileSystem: ExportFileSystem = {
			...NODE_FILE_SYSTEM,
			writeFileSync: ((
				path: string,
				contents: string,
				options?: Parameters<typeof writeFileSync>[2]
			) => {
				if (path.includes('.meadow-entry-package-controls-')) {
					throw new Error('injected staging failure');
				}
				return writeFileSync(path, contents, options);
			}) as typeof writeFileSync
		};

		expect(() =>
			api.publishMeadowEntryExportPackage!(packageBytes('new'), paths, failingFileSystem)
		).toThrow('injected staging failure');
		expect(packageSnapshot(paths)).toEqual({
			...previous.rendered,
			generated: previous.generatedContents
		});
	});

	it('keeps both newly published destinations consistent when backup cleanup fails', async () => {
		const api = await exporterApi();
		expect(api.publishMeadowEntryExportPackage).toBeTypeOf('function');
		if (!api.publishMeadowEntryExportPackage) return;
		const paths = newPaths();
		writePackage(packageBytes('old'), paths);
		const next = packageBytes('new');
		const failingFileSystem: ExportFileSystem = {
			...NODE_FILE_SYSTEM,
			rmSync: ((path: string, options?: Parameters<typeof rmSync>[1]) => {
				if (path.includes('.meadow-entry-package-backup-')) {
					throw new Error('injected cleanup failure');
				}
				return rmSync(path, options);
			}) as typeof rmSync
		};

		expect(() => api.publishMeadowEntryExportPackage!(next, paths, failingFileSystem)).toThrow(
			'injected cleanup failure'
		);
		expect(packageSnapshot(paths)).toEqual({
			...next.rendered,
			generated: next.generatedContents
		});
		expect(
			readdirSync(dirname(paths.controlsDirectory)).some((name) =>
				name.includes('.meadow-entry-package-backup-')
			)
		).toBe(true);
	});

	it('resolves export paths from a repository root', async () => {
		const api = await exporterApi();
		expect(api.meadowEntryExportPaths).toBeTypeOf('function');
		if (!api.meadowEntryExportPaths) return;
		const paths = api.meadowEntryExportPaths('/repo');
		expect(paths.controlsDirectory).toBe(
			resolve('/repo/artifacts/meadow-entry/painted-v2/controls')
		);
		expect(paths.generatedPath).toBe(
			resolve('/repo/src/lib/game/content/generated/meadow-entry-painted-v2-art-control.ts')
		);
	});

	it('rejects an unknown exporter argument with a usage message', async () => {
		const api = await exporterApi();
		expect(api.runMeadowEntryArtControlsExporter).toBeTypeOf('function');
		if (!api.runMeadowEntryArtControlsExporter) return;
		expect(() => api.runMeadowEntryArtControlsExporter!(['--invalid'])).toThrow(/Usage:/);
	});

	it('rejects a drifted rendered inventory during check', async () => {
		const api = await exporterApi();
		expect(api.checkMeadowEntryExportPackage).toBeTypeOf('function');
		if (!api.checkMeadowEntryExportPackage) return;
		const paths = newPaths();
		const drifted: ExportPackage = {
			rendered: { 'unexpected-file.json': 'bytes\n' },
			generatedContents: 'generated\n'
		};
		expect(() => api.checkMeadowEntryExportPackage!(drifted, paths)).toThrow(/inventory drifted/);
	});

	it('rejects a stale generated fingerprint module during check', async () => {
		const api = await exporterApi();
		expect(api.checkMeadowEntryExportPackage).toBeTypeOf('function');
		if (!api.checkMeadowEntryExportPackage) return;
		const paths = newPaths();
		const current = packageBytes('current');
		writePackage(current, paths);
		writeFileSync(paths.generatedPath, 'stale-generated\n');

		expect(() => api.checkMeadowEntryExportPackage!(current, paths)).toThrow(
			/fingerprint module is stale/
		);
	});

	it('checks the active painted-v2 package at its direct destination', async () => {
		const api = await exporterApi();
		expect(api.runMeadowEntryArtControlsExporter).toBeTypeOf('function');
		if (!api.runMeadowEntryArtControlsExporter) return;
		const repositoryRoot = resolve(testDirectory, '../../../../..');
		expect(() => api.runMeadowEntryArtControlsExporter!(['--check'], repositoryRoot)).not.toThrow();
	});

	it('runs the publish-mode exporter into a fresh temporary repository root', async () => {
		const api = await exporterApi();
		expect(api.runMeadowEntryArtControlsExporter).toBeTypeOf('function');
		if (!api.runMeadowEntryArtControlsExporter) return;
		const paths = newPaths();
		seedRepositorySources(paths.repositoryRoot);

		api.runMeadowEntryArtControlsExporter!([], paths.repositoryRoot);

		for (const filename of MEADOW_ENTRY_CONTROL_FILENAMES) {
			expect(existsSync(join(paths.controlsDirectory, filename))).toBe(true);
		}
		expect(existsSync(paths.generatedPath)).toBe(true);
	});
});

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
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { MEADOW_ENTRY_CONTROL_FILENAMES } from './meadow-entry-controls';

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
	const repositoryRoot = mkdtempSync('/tmp/gliese-meadow-exporter-');
	temporaryRoots.push(repositoryRoot);
	return {
		repositoryRoot,
		controlsDirectory: join(repositoryRoot, 'docs/superpowers/reports/img/hpa-399/controls'),
		generatedPath: join(
			repositoryRoot,
			'src/lib/game/content/generated/meadow-entry-art-control.ts'
		)
	};
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
			readdirSync(join(paths.repositoryRoot, 'docs/superpowers/reports/img/hpa-399')).some((name) =>
				name.includes('.meadow-entry-package-backup-')
			)
		).toBe(true);
	});
});

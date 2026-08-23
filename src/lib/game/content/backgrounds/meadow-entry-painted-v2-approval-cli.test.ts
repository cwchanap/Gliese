import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	MEADOW_ENTRY_PAINTED_V2_APPROVAL_PATH,
	approveMeadowEntryArtPackage,
	checkMeadowEntryPaintedV2Approval,
	parseMeadowEntryArtPackageArguments,
	type MeadowEntryPaintedV2ArtPackageApproval
} from '../../../../../tools/approve-meadow-entry-art-package';

const temporaryRoots: string[] = [];

afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(
		temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
	);
});

describe('painted-v2 approval CLI', () => {
	it('keeps historical and painted-v2 builders on their distinct storage seals', () => {
		const source = readFileSync(
			resolve(process.cwd(), 'tools/approve-meadow-entry-art-package.ts'),
			'utf8'
		);
		const historicalBuilder = source.slice(
			source.indexOf('async function buildApproval('),
			source.indexOf('async function buildPaintedV2Approval(')
		);
		const paintedV2Builder = source.slice(source.indexOf('async function buildPaintedV2Approval('));

		expect(historicalBuilder).toMatch(
			/return \{[\s\S]*?storageConfigurationSha256:\s*sha256\(storageConfiguration\),/
		);
		expect(historicalBuilder).not.toMatch(
			/storageConfigurationSha256:\s*getMeadowEntryControlsStorageConfigurationSha256/
		);
		expect(paintedV2Builder).toMatch(
			/storageConfigurationSha256:\s*getMeadowEntryControlsStorageConfigurationSha256\(\s*storageConfiguration,\s*'legacy'\s*\),/
		);
	});

	it('parses --check without publication metadata', () => {
		expect(parseMeadowEntryArtPackageArguments(['--check'])).toEqual({
			check: true,
			reviewedBy: undefined,
			reviewedAt: undefined
		});
	});

	it('rejects --check combined with reviewer publication flags', () => {
		expect(() =>
			parseMeadowEntryArtPackageArguments([
				'--check',
				'--reviewed-by',
				'chanwaichan',
				'--reviewed-at',
				'2026-08-11T20:00:00Z'
			])
		).toThrow(/cannot combine.*--check.*review/i);
	});

	it('checks a matching approval module without writes and rejects stale contents', async () => {
		const root = await mkdtemp(join(tmpdir(), 'gliese-painted-v2-approval-'));
		temporaryRoots.push(root);
		const expected =
			'export const meadowEntryPaintedV2ArtPackageApproval = { version: 1 } as const;\n';
		const target = join(root, MEADOW_ENTRY_PAINTED_V2_APPROVAL_PATH);
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, expected, { flag: 'w' });
		const successMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		let successReads = 0;
		const checkFileSystem = {
			...successMutators,
			readFile: async (path: string) => {
				successReads += 1;
				return await readFile(path, 'utf8');
			}
		};
		await expect(
			checkMeadowEntryPaintedV2Approval(root, expected, { fileSystem: checkFileSystem })
		).resolves.toBeUndefined();
		expect(successReads).toBeGreaterThan(0);
		expect(Object.values(successMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
		expect(await readFile(target, 'utf8')).toBe(expected);
		await writeFile(target, `${expected}stale\n`);
		const staleMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		let staleReads = 0;
		const staleCheckFileSystem = {
			...staleMutators,
			readFile: async (path: string) => {
				staleReads += 1;
				return await readFile(path, 'utf8');
			}
		};
		await expect(
			checkMeadowEntryPaintedV2Approval(root, expected, { fileSystem: staleCheckFileSystem })
		).rejects.toThrow(/stale|drift/i);
		expect(staleReads).toBeGreaterThan(0);
		expect(Object.values(staleMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
	});

	it('runs the parsed --check approval command with zero filesystem mutations on matching and stale contents', async () => {
		const root = await mkdtemp(join(tmpdir(), 'gliese-painted-v2-approval-command-'));
		temporaryRoots.push(root);
		const expected =
			'export const meadowEntryPaintedV2ArtPackageApproval = { version: 1 } as const;\n';
		const target = join(root, MEADOW_ENTRY_PAINTED_V2_APPROVAL_PATH);
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, expected, { flag: 'w' });
		const parsed = parseMeadowEntryArtPackageArguments(['--check']);
		expect(parsed.check).toBe(true);
		const successMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		let successReads = 0;
		const successFileSystem = {
			...successMutators,
			readFile: async (path: string) => {
				successReads += 1;
				return await readFile(path, 'utf8');
			}
		};
		await expect(
			approveMeadowEntryArtPackage(['--check'], root, {
				...parsed,
				built: {
					approval: {} as MeadowEntryPaintedV2ArtPackageApproval,
					module: expected
				},
				fileSystem: successFileSystem
			})
		).resolves.toBeDefined();
		expect(successReads).toBeGreaterThan(0);
		expect(Object.values(successMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);

		await writeFile(target, `${expected}stale\n`);
		const staleMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		const staleFileSystem = {
			...staleMutators,
			readFile: async (path: string) => await readFile(path, 'utf8')
		};
		await expect(
			approveMeadowEntryArtPackage(['--check'], root, {
				...parsed,
				built: {
					approval: {} as MeadowEntryPaintedV2ArtPackageApproval,
					module: expected
				},
				fileSystem: staleFileSystem
			})
		).rejects.toThrow(/stale|drift/i);
		expect(Object.values(staleMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
	});
});

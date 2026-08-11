import { dirname, join } from 'node:path';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	MEADOW_ENTRY_PAINTED_V2_APPROVAL_PATH,
	checkMeadowEntryPaintedV2Approval,
	parseMeadowEntryArtPackageArguments
} from '../../../../../tools/approve-meadow-entry-art-package';

const temporaryRoots: string[] = [];

afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(
		temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
	);
});

describe('painted-v2 approval CLI', () => {
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
});

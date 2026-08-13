import { describe, expect, it, vi } from 'vitest';

import {
	PAINTED_V2_PILOT_MASTER_PATH,
	parseFinalizeMeadowEntryPaintedV2PilotArguments,
	runFinalizeMeadowEntryPaintedV2Pilot,
	type MeadowEntryPaintedV2PilotFinalizerFileSystem
} from '../../../../../tools/finalize-meadow-entry-painted-v2-pilot';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '../../../../../');

describe('painted-v2 pilot finalizer CLI', () => {
	it('parses only the no-write check flag', () => {
		expect(parseFinalizeMeadowEntryPaintedV2PilotArguments([])).toEqual({ check: false });
		expect(parseFinalizeMeadowEntryPaintedV2PilotArguments(['--check'])).toEqual({ check: true });
		expect(() => parseFinalizeMeadowEntryPaintedV2PilotArguments(['--check', '--check'])).toThrow(
			/duplicate/i
		);
		expect(() =>
			parseFinalizeMeadowEntryPaintedV2PilotArguments(['--output-root', '/tmp'])
		).toThrow(/unknown/i);
	});

	it('fails closed in check mode when the assembled master is absent', async () => {
		await expect(
			runFinalizeMeadowEntryPaintedV2Pilot('/tmp/gliese-painted-v2-pilot-missing-test-root', {
				check: true
			})
		).rejects.toThrow(/missing|stale|master/i);
	});

	it('keeps --check no-write and rejects stale master bytes', async () => {
		const successMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		const checkFileSystem = {
			readFile,
			...successMutators
		};
		await expect(
			runFinalizeMeadowEntryPaintedV2Pilot(repositoryRoot, {
				check: true,
				fileSystem: checkFileSystem
			})
		).resolves.toMatchObject({ masterSha256: expect.any(String) });
		expect(Object.values(successMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);

		const staleMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		const staleReadFile = (async (path: Parameters<typeof readFile>[0]) => {
			if (String(path).endsWith(PAINTED_V2_PILOT_MASTER_PATH)) return Buffer.from('stale');
			return readFile(path);
		}) as MeadowEntryPaintedV2PilotFinalizerFileSystem['readFile'];
		const staleFileSystem: MeadowEntryPaintedV2PilotFinalizerFileSystem = {
			readFile: staleReadFile,
			...staleMutators
		};
		await expect(
			runFinalizeMeadowEntryPaintedV2Pilot(repositoryRoot, {
				check: true,
				fileSystem: staleFileSystem
			})
		).rejects.toThrow(/stale|drift/i);
		expect(Object.values(staleMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
	});

	it('keeps --check no-write and rejects a stale merged root fingerprint', async () => {
		const staleMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		const staleReadFile = (async (path: Parameters<typeof readFile>[0]) => {
			if (String(path).endsWith('artifacts/meadow-entry/painted-v2/provenance.json')) {
				const value = JSON.parse((await readFile(path)).toString('utf8')) as {
					controlFingerprint: string;
				};
				value.controlFingerprint = '0'.repeat(64);
				return Buffer.from(`${JSON.stringify(value, null, '\t')}\n`);
			}
			return readFile(path);
		}) as MeadowEntryPaintedV2PilotFinalizerFileSystem['readFile'];
		const staleFileSystem: MeadowEntryPaintedV2PilotFinalizerFileSystem = {
			readFile: staleReadFile,
			...staleMutators
		};
		await expect(
			runFinalizeMeadowEntryPaintedV2Pilot(repositoryRoot, {
				check: true,
				fileSystem: staleFileSystem
			})
		).rejects.toThrow(/package provenance.*stale/i);
		expect(Object.values(staleMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
	});
});

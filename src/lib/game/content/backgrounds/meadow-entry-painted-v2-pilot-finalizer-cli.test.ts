import { describe, expect, it, vi } from 'vitest';

import {
	PAINTED_V2_PILOT_MASTER_PATH,
	PAINTED_V2_PILOT_MASTER_PROVENANCE_PATH,
	PAINTED_V2_PILOT_PACKAGE_PROVENANCE_PATH,
	parseFinalizeMeadowEntryPaintedV2PilotArguments,
	runFinalizeMeadowEntryPaintedV2Pilot,
	type MeadowEntryPaintedV2PilotFinalizerFileSystem
} from '../../../../../tools/finalize-meadow-entry-painted-v2-pilot';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MEADOW_ENTRY_PAINTED_V2_APPROVED_ORGANIC_CANDIDATE_MASTER_SHA256 } from './meadow-entry-painted-v2-pilot-finalizer';

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

	it('rejects an injected production master that is not the approved organic candidate', async () => {
		const mutators = {
			mkdir: vi.fn(),
			writeFile: vi.fn(),
			rename: vi.fn(),
			rm: vi.fn()
		};
		await expect(
			runFinalizeMeadowEntryPaintedV2Pilot(repositoryRoot, {
				assemblyResult: {
					masterPng: Buffer.from('not-the-approved-organic-master'),
					provenanceJson: await readFile(
						resolve(repositoryRoot, PAINTED_V2_PILOT_MASTER_PROVENANCE_PATH)
					)
				},
				fileSystem: { readFile, ...mutators }
			})
		).rejects.toThrow(/approved organic candidate/i);
		expect(Object.values(mutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
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
		).resolves.toMatchObject({
			masterSha256: MEADOW_ENTRY_PAINTED_V2_APPROVED_ORGANIC_CANDIDATE_MASTER_SHA256
		});
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
	}, 300_000);

	it('keeps production write and repeated --check byte-identical', async () => {
		const masterPath = resolve(repositoryRoot, PAINTED_V2_PILOT_MASTER_PATH);
		const masterProvenancePath = resolve(repositoryRoot, PAINTED_V2_PILOT_MASTER_PROVENANCE_PATH);
		const packageProvenancePath = resolve(repositoryRoot, PAINTED_V2_PILOT_PACKAGE_PROVENANCE_PATH);
		const expected = new Map([
			[masterPath, await readFile(masterPath)],
			[masterProvenancePath, await readFile(masterProvenancePath)],
			[packageProvenancePath, await readFile(packageProvenancePath)]
		]);
		const temporaryWrites = new Map<string, Buffer>();
		const persistedWrites = new Map<string, Buffer>();
		const writeFileSystem = {
			readFile,
			mkdir: vi.fn(),
			writeFile: vi.fn(async (path: Parameters<typeof readFile>[0], data: Uint8Array) => {
				temporaryWrites.set(String(path), Buffer.from(data));
			}),
			rename: vi.fn(
				async (from: Parameters<typeof readFile>[0], to: Parameters<typeof readFile>[0]) => {
					const bytes = temporaryWrites.get(String(from));
					if (bytes === undefined) throw new Error(`missing temporary write: ${String(from)}`);
					persistedWrites.set(String(to), bytes);
				}
			),
			rm: vi.fn(async (path: Parameters<typeof readFile>[0]) => {
				temporaryWrites.delete(String(path));
			})
		} as MeadowEntryPaintedV2PilotFinalizerFileSystem;

		const assemblyResult = {
			masterPng: expected.get(masterPath)!,
			provenanceJson: expected.get(masterProvenancePath)!
		};
		const generated = await runFinalizeMeadowEntryPaintedV2Pilot(repositoryRoot, {
			assemblyResult,
			fileSystem: writeFileSystem
		});
		for (const [path, bytes] of expected) {
			expect(persistedWrites.get(path)?.equals(bytes), path).toBe(true);
		}
		expect(generated.masterPng.equals(expected.get(masterPath)!)).toBe(true);
		expect(generated.provenanceJson.equals(expected.get(masterProvenancePath)!)).toBe(true);
		expect(generated.packageProvenanceJson.equals(expected.get(packageProvenancePath)!)).toBe(true);

		for (let attempt = 0; attempt < 2; attempt += 1) {
			const noWriteMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
			await expect(
				runFinalizeMeadowEntryPaintedV2Pilot(repositoryRoot, {
					check: true,
					assemblyResult,
					fileSystem: { readFile, ...noWriteMutators }
				})
			).resolves.toMatchObject({
				masterSha256: generated.masterSha256,
				provenanceSha256: generated.provenanceSha256
			});
			expect(Object.values(noWriteMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
		}
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
	}, 180_000);

	it('fails before assembly when an approved scenery insert package is stale', async () => {
		const staleMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		const staleReadFile = (async (path: Parameters<typeof readFile>[0]) => {
			if (String(path).endsWith('source-inserts/crossroads-blocked-hedge.json')) {
				const manifest = JSON.parse((await readFile(path)).toString('utf8')) as {
					review: { approval: string };
				};
				manifest.review.approval = 'pending-fresh-final-source-gate';
				return Buffer.from(`${JSON.stringify(manifest, null, '\t')}\n`);
			}
			return readFile(path);
		}) as MeadowEntryPaintedV2PilotFinalizerFileSystem['readFile'];
		await expect(
			runFinalizeMeadowEntryPaintedV2Pilot(repositoryRoot, {
				check: true,
				fileSystem: { readFile: staleReadFile, ...staleMutators }
			})
		).rejects.toThrow(/scenery insert.*approval|not approved|stale/i);
		expect(Object.values(staleMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
	});
});

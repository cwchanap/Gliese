import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
	lstat,
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rename,
	rm,
	symlink,
	writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	meadowEntryApprovedPackagePaths,
	parseFinalizeMeadowEntryMasterArguments,
	publishApprovedMeadowEntryPackage,
	readApprovedMeadowEntryPackageSnapshot,
	runFinalizeMeadowEntryMasters,
	type MeadowEntryMasterFinalizerDependencies,
	type MeadowEntryMasterPublicationFileSystem
} from '../../../../../tools/finalize-meadow-entry-masters';
import type { FinalizedPlaneProvenance } from '$lib/game/content/backgrounds/meadow-entry-master-finalizer';

const temporaryRoots: string[] = [];
const repositoryRoot = resolve(import.meta.dirname, '../../../../..');
const syntheticPredecessors = {
	base: Buffer.from('synthetic immutable predecessor base bytes'),
	foreground: Buffer.from('synthetic immutable predecessor foreground bytes')
};
const syntheticPredecessorHashes = {
	baseSha256: createHash('sha256').update(syntheticPredecessors.base).digest('hex'),
	foregroundSha256: createHash('sha256').update(syntheticPredecessors.foreground).digest('hex')
};

async function readSyntheticPredecessorForTest(
	_repositoryRoot: string,
	path: string
): Promise<Buffer> {
	return path.includes('foreground')
		? syntheticPredecessors.foreground
		: syntheticPredecessors.base;
}

async function runFinalizeForTest(
	args: readonly string[],
	root = repositoryRoot,
	dependencies: Partial<MeadowEntryMasterFinalizerDependencies> = {}
): Promise<void> {
	return await runFinalizeMeadowEntryMasters(args, root, {
		readPredecessor: readSyntheticPredecessorForTest,
		predecessorHashes: syntheticPredecessorHashes,
		...dependencies
	});
}

function fakeProvenance(label: string): FinalizedPlaneProvenance {
	return {
		sha256: createHash('sha256').update(label).digest('hex'),
		bytes: Buffer.byteLength(label),
		generation: {
			mode: 'manual',
			provider: null,
			model: null,
			modelVersion: null,
			tool: 'test',
			toolVersion: '1',
			settings: {},
			seed: null,
			seedUnavailable: false,
			prompt: null,
			promptSha256: null,
			referenceImageSha256: [],
			byteReproducibleGeneration: false
		},
		transform: {
			native: { width: 1, height: 1 },
			crop: { left: 0, top: 0, width: 1, height: 1 },
			output: { width: 1, height: 1 },
			scale: 1
		},
		refinements: []
	};
}

afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(
		temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true }))
	);
});

async function temporaryRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), 'gliese-master-finalizer-cli-'));
	temporaryRoots.push(root);
	return root;
}

function packageBytes(label: string) {
	const basePng = Buffer.from(`base-${label}`);
	const foregroundPng = Buffer.from(`foreground-${label}`);
	const sha256 = (value: Buffer) => createHash('sha256').update(value).digest('hex');
	return {
		basePng,
		foregroundPng,
		provenanceJson: Buffer.from(
			`${JSON.stringify({
				version: label,
				base: { sha256: sha256(basePng) },
				foreground: { sha256: sha256(foregroundPng) }
			})}\n`
		)
	};
}

async function approvedBytes(outputRoot: string): Promise<Record<string, Buffer>> {
	return {
		base: await readFile(join(outputRoot, 'masters/meadow-entry-base-master.png')),
		foreground: await readFile(join(outputRoot, 'masters/meadow-entry-foreground-master.png')),
		provenance: await readFile(join(outputRoot, 'provenance/meadow-entry-master-provenance.json'))
	};
}

function withFailure(
	failure: (operation: 'write' | 'rename' | 'remove', path: string) => boolean,
	onWriterSentinel?: (path: string) => Promise<void>
): MeadowEntryMasterPublicationFileSystem {
	return {
		mkdir,
		readdir,
		writeFile: async (path, data, options) => {
			const pathString = String(path);
			if (failure('write', pathString)) throw new Error(`injected write failure: ${pathString}`);
			const result = await writeFile(path, data, options);
			if (onWriterSentinel && pathString.endsWith('.meadow-entry-publication.lock')) {
				await onWriterSentinel(pathString);
			}
			return result;
		},
		rename: async (source, destination) => {
			const destinationPath = String(destination);
			if (failure('rename', destinationPath))
				throw new Error(`injected rename failure: ${destinationPath}`);
			return rename(source, destination);
		},
		rm: async (path, options) => {
			const pathString = String(path);
			if (failure('remove', pathString)) throw new Error(`injected remove failure: ${pathString}`);
			return rm(path, options);
		}
	};
}

describe('historical finalize-meadow-entry-masters utilities', () => {
	it('keeps the full-world finalizer out of the active package scripts and executable entry', () => {
		const packageJson = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as {
			scripts?: Record<string, string>;
		};
		const source = readFileSync(
			join(repositoryRoot, 'tools/finalize-meadow-entry-masters.ts'),
			'utf8'
		);
		expect(packageJson.scripts?.['art:finalize:meadow-entry']).toBeUndefined();
		expect(packageJson.scripts?.['art:check:meadow-entry-finalize']).toBeUndefined();
		expect(source).not.toContain('if (import.meta.main)');
	});

	it('parses the required plane and default output root', () => {
		expect(parseFinalizeMeadowEntryMasterArguments(['--plane', 'base'])).toMatchObject({
			plane: 'base',
			outputRoot: 'artifacts/meadow-entry/painted-v2',
			outputRootExplicit: false,
			validateOnly: false,
			check: false
		});
		expect(
			parseFinalizeMeadowEntryMasterArguments(['--plane', 'base', '--output-root', '/tmp'])
		).toMatchObject({ outputRootExplicit: true });
		expect(() => parseFinalizeMeadowEntryMasterArguments(['--plane', 'unknown'])).toThrow(/plane/i);
	});

	it('parses --check without changing the historical utility output root', () => {
		expect(parseFinalizeMeadowEntryMasterArguments(['--plane', 'both', '--check'])).toMatchObject({
			plane: 'both',
			outputRoot: 'artifacts/meadow-entry/painted-v2',
			check: true,
			validateOnly: false
		});
	});

	it('rejects --check combined with publication-only review flags', () => {
		expect(() =>
			parseFinalizeMeadowEntryMasterArguments(['--plane', 'both', '--check', '--validate-only'])
		).toThrow(/cannot combine.*--check.*--validate-only/i);
	});

	it('rejects single-plane finalization without an explicit --output-root', async () => {
		const finalizers = {
			finalizeBase: async () => ({ png: Buffer.from('x'), provenance: fakeProvenance('x') })
		};
		await expect(
			runFinalizeForTest(['--plane', 'base'], repositoryRoot, finalizers)
		).rejects.toThrow(/explicit --output-root review\/work destination/i);
	});

	it('allows single-plane --validate-only without an --output-root', async () => {
		const inputRoot = await temporaryRoot();
		const candidate = join(inputRoot, 'candidate.png');
		const transform = join(inputRoot, 'transform.json');
		const provenance = join(inputRoot, 'provenance.json');
		await Promise.all([
			writeFile(candidate, 'candidate'),
			writeFile(transform, '{}'),
			writeFile(provenance, '{}')
		]);
		let calls = 0;
		const finalizers = {
			finalizeForeground: async () => {
				calls += 1;
				return { png: Buffer.from('review-fg'), provenance: fakeProvenance('review-fg') };
			}
		};
		await runFinalizeForTest(
			[
				'--plane',
				'foreground',
				'--foreground-candidate',
				candidate,
				'--foreground-transform',
				transform,
				'--foreground-provenance',
				provenance,
				'--validate-only'
			],
			repositoryRoot,
			finalizers
		);
		expect(calls).toBe(1);
	});

	it('rejects single-plane finalization into the approved package root', async () => {
		const approvedRoot = join(repositoryRoot, 'artifacts/meadow-entry/painted-v2');
		const finalizers = {
			finalizeBase: async () => ({ png: Buffer.from('x'), provenance: fakeProvenance('x') })
		};
		await expect(
			runFinalizeForTest(
				['--plane', 'base', '--output-root', approvedRoot],
				repositoryRoot,
				finalizers
			)
		).rejects.toThrow(/must not write to the approved package root/i);
	});

	it('rejects single-plane finalization through a symlink that resolves to the approved package root', async () => {
		const approvedRoot = join(repositoryRoot, 'artifacts/meadow-entry/painted-v2');
		const workDir = await temporaryRoot();
		const aliasRoot = join(workDir, 'approved-alias');
		await symlink(approvedRoot, aliasRoot, 'dir');
		const finalizers = {
			finalizeBase: async () => ({ png: Buffer.from('x'), provenance: fakeProvenance('x') })
		};
		await expect(
			runFinalizeForTest(
				['--plane', 'base', '--output-root', aliasRoot],
				repositoryRoot,
				finalizers
			)
		).rejects.toThrow(/must not write to the approved package root/i);
	});

	it('retains the exported historical complete-snapshot publication utility', async () => {
		const outputRoot = await temporaryRoot();
		await publishApprovedMeadowEntryPackage(outputRoot, packageBytes('old'));
		await mkdir(join(outputRoot, 'candidates'), { recursive: true });
		await writeFile(join(outputRoot, 'candidates/keep.txt'), 'review source');
		let interruptedConsumerReads = 0;
		const next = packageBytes('new');
		const fileSystem = withFailure(
			() => false,
			async () => {
				interruptedConsumerReads += 1;
				await expect(
					readApprovedMeadowEntryPackageSnapshot(outputRoot, { attempts: 1 })
				).rejects.toThrow(/publication is in progress/i);
			}
		);

		await publishApprovedMeadowEntryPackage(outputRoot, next, fileSystem);

		expect(interruptedConsumerReads).toBe(1);
		expect(await readApprovedMeadowEntryPackageSnapshot(outputRoot)).toEqual(next);
		expect(await approvedBytes(outputRoot)).toEqual({
			base: next.basePng,
			foreground: next.foregroundPng,
			provenance: next.provenanceJson
		});
		expect((await lstat(join(outputRoot, 'masters/meadow-entry-base-master.png'))).isFile()).toBe(
			true
		);
		expect(await readFile(join(outputRoot, 'candidates/keep.txt'), 'utf8')).toBe('review source');
	});

	it('exposes the previous complete snapshot when staging, installation, or commit cleanup fails', async () => {
		const outputRoot = await temporaryRoot();
		const oldPackage = packageBytes('old');
		await publishApprovedMeadowEntryPackage(outputRoot, oldPackage);
		const old = await approvedBytes(outputRoot);

		await expect(
			publishApprovedMeadowEntryPackage(
				outputRoot,
				packageBytes('staging-failure'),
				withFailure(
					(operation, path) =>
						(operation === 'write' && path.includes('foreground')) || operation === 'remove'
				)
			)
		).rejects.toThrow(/injected write failure/i);
		expect(await approvedBytes(outputRoot)).toEqual(old);

		let installFailed = false;
		await expect(
			publishApprovedMeadowEntryPackage(
				outputRoot,
				packageBytes('pointer-failure'),
				withFailure((operation, path) => {
					if (
						operation === 'rename' &&
						path.endsWith('meadow-entry-base-master.png') &&
						!installFailed
					) {
						installFailed = true;
						return true;
					}
					return false;
				})
			)
		).rejects.toThrow(/injected rename failure/i);
		expect(await approvedBytes(outputRoot)).toEqual(old);

		const paths = meadowEntryApprovedPackagePaths(outputRoot);
		let commitCleanupFailed = false;
		await expect(
			publishApprovedMeadowEntryPackage(
				outputRoot,
				packageBytes('cleanup-failure'),
				withFailure((operation, path) => {
					if (operation === 'remove' && path === paths.writerSentinel && !commitCleanupFailed) {
						commitCleanupFailed = true;
						return true;
					}
					return false;
				})
			)
		).rejects.toThrow(/injected remove failure/i);
		expect(await readApprovedMeadowEntryPackageSnapshot(outputRoot)).toEqual(oldPackage);
	});

	it('keeps validate-only side-effect free and writes a base review output outside the approved package', async () => {
		const inputRoot = await temporaryRoot();
		const candidate = join(inputRoot, 'candidate.png');
		const transform = join(inputRoot, 'transform.json');
		const provenance = join(inputRoot, 'provenance.json');
		await Promise.all([
			writeFile(candidate, 'candidate'),
			writeFile(transform, '{}'),
			writeFile(provenance, '{}')
		]);
		const outputRoot = join(inputRoot, 'work/base-review');
		let calls = 0;
		const arguments_ = [
			'--plane',
			'base',
			'--base-candidate',
			candidate,
			'--base-transform',
			transform,
			'--base-provenance',
			provenance,
			'--output-root',
			outputRoot
		];
		const finalizers = {
			finalizeBase: async () => {
				calls += 1;
				return { png: Buffer.from('review-base'), provenance: fakeProvenance('review-base') };
			}
		};

		await runFinalizeForTest([...arguments_, '--validate-only'], repositoryRoot, finalizers);
		await expect(
			readFile(join(outputRoot, 'masters/meadow-entry-base-master.png'))
		).rejects.toThrow();
		await runFinalizeForTest(arguments_, repositoryRoot, finalizers);
		expect(await readFile(join(outputRoot, 'masters/meadow-entry-base-master.png'))).toEqual(
			Buffer.from('review-base')
		);
		expect(calls).toBe(2);
	});

	it('parses --validate-only and --output-root flags', () => {
		expect(
			parseFinalizeMeadowEntryMasterArguments(['--plane', 'both', '--validate-only'])
		).toMatchObject({ plane: 'both', validateOnly: true });
		expect(
			parseFinalizeMeadowEntryMasterArguments(['--plane', 'both', '--output-root', '/tmp/review'])
		).toMatchObject({ outputRoot: '/tmp/review', outputRootExplicit: true });
	});

	it('rejects a duplicate --validate-only flag', () => {
		expect(() =>
			parseFinalizeMeadowEntryMasterArguments([
				'--plane',
				'both',
				'--validate-only',
				'--validate-only'
			])
		).toThrow(/Duplicate.*--validate-only/i);
	});

	it('rejects an unknown flag', () => {
		expect(() =>
			parseFinalizeMeadowEntryMasterArguments(['--plane', 'both', '--unknown-flag', 'value'])
		).toThrow(/Unknown meadow-entry finalizer argument/i);
	});

	it('rejects a flag with a missing value at the end of args', () => {
		expect(() =>
			parseFinalizeMeadowEntryMasterArguments(['--plane', 'both', '--base-candidate'])
		).toThrow(/Missing value for meadow-entry finalizer argument/i);
	});

	it('rejects a flag whose value looks like another flag', () => {
		expect(() => parseFinalizeMeadowEntryMasterArguments(['--plane', '--base-candidate'])).toThrow(
			/Missing value for meadow-entry finalizer argument/i
		);
	});

	it('rejects a duplicate --base-candidate flag', () => {
		expect(() =>
			parseFinalizeMeadowEntryMasterArguments([
				'--plane',
				'both',
				'--base-candidate',
				'/a.png',
				'--base-candidate',
				'/b.png'
			])
		).toThrow(/Duplicate.*--base-candidate/i);
	});

	it('rejects an invalid plane value of "all"', () => {
		expect(() => parseFinalizeMeadowEntryMasterArguments(['--plane', 'all'])).toThrow(
			/--plane must be base, foreground, or both/i
		);
	});

	it('strips a leading -- separator before parsing arguments', () => {
		expect(parseFinalizeMeadowEntryMasterArguments(['--', '--plane', 'base'])).toMatchObject({
			plane: 'base'
		});
	});

	it('parses all optional flags', () => {
		const parsed = parseFinalizeMeadowEntryMasterArguments([
			'--plane',
			'both',
			'--base-candidate',
			'/base.png',
			'--foreground-candidate',
			'/fg.png',
			'--base-transform',
			'/bt.json',
			'--foreground-transform',
			'/ft.json',
			'--base-provenance',
			'/bp.json',
			'--foreground-provenance',
			'/fp.json',
			'--refinement-manifest',
			'/rm.json',
			'--output-root',
			'/out'
		]);
		expect(parsed).toMatchObject({
			plane: 'both',
			baseCandidate: '/base.png',
			foregroundCandidate: '/fg.png',
			baseTransform: '/bt.json',
			foregroundTransform: '/ft.json',
			baseProvenance: '/bp.json',
			foregroundProvenance: '/fp.json',
			refinementManifest: '/rm.json',
			outputRoot: '/out',
			outputRootExplicit: true
		});
	});

	it('meadowEntryApprovedPackagePaths resolves all expected paths', () => {
		const paths = meadowEntryApprovedPackagePaths('/tmp/test-root');
		expect(paths.root).toBe(resolve('/tmp/test-root'));
		expect(paths.masters).toBe(join(resolve('/tmp/test-root'), 'masters'));
		expect(paths.provenance).toBe(join(resolve('/tmp/test-root'), 'provenance'));
		expect(paths.writerSentinel).toBe(
			join(resolve('/tmp/test-root'), '.meadow-entry-publication.lock')
		);
	});

	it('readApprovedMeadowEntryPackageSnapshot fails when all attempts are exhausted', async () => {
		const outputRoot = await temporaryRoot();
		await expect(
			readApprovedMeadowEntryPackageSnapshot(outputRoot, { attempts: 1 })
		).rejects.toThrow();
	});

	it('readApprovedMeadowEntryPackageSnapshot fails when the provenance is not valid JSON', async () => {
		const outputRoot = await temporaryRoot();
		const paths = meadowEntryApprovedPackagePaths(outputRoot);
		await mkdir(paths.masters, { recursive: true });
		await mkdir(paths.provenance, { recursive: true });
		await writeFile(join(paths.masters, 'meadow-entry-base-master.png'), Buffer.from('base'));
		await writeFile(
			join(paths.masters, 'meadow-entry-foreground-master.png'),
			Buffer.from('foreground')
		);
		await writeFile(
			join(paths.provenance, 'meadow-entry-master-provenance.json'),
			Buffer.from('not valid json')
		);
		await expect(
			readApprovedMeadowEntryPackageSnapshot(outputRoot, { attempts: 1 })
		).rejects.toThrow(/not valid JSON/i);
	});

	it('readApprovedMeadowEntryPackageSnapshot fails when manifest hashes do not match', async () => {
		const outputRoot = await temporaryRoot();
		const paths = meadowEntryApprovedPackagePaths(outputRoot);
		await mkdir(paths.masters, { recursive: true });
		await mkdir(paths.provenance, { recursive: true });
		const basePng = Buffer.from('base');
		const foregroundPng = Buffer.from('foreground');
		await writeFile(join(paths.masters, 'meadow-entry-base-master.png'), basePng);
		await writeFile(join(paths.masters, 'meadow-entry-foreground-master.png'), foregroundPng);
		const sha256 = (value: Buffer) => createHash('sha256').update(value).digest('hex');
		await writeFile(
			join(paths.provenance, 'meadow-entry-master-provenance.json'),
			Buffer.from(
				JSON.stringify({
					base: { sha256: 'wrong' },
					foreground: { sha256: sha256(foregroundPng) }
				})
			)
		);
		await expect(
			readApprovedMeadowEntryPackageSnapshot(outputRoot, { attempts: 1 })
		).rejects.toThrow(/does not match its master bytes/i);
	});

	it('publishApprovedMeadowEntryPackage overwrites an existing approved package', async () => {
		const outputRoot = await temporaryRoot();
		await publishApprovedMeadowEntryPackage(outputRoot, packageBytes('first'));
		await publishApprovedMeadowEntryPackage(outputRoot, packageBytes('second'));
		expect(await readApprovedMeadowEntryPackageSnapshot(outputRoot)).toEqual(
			packageBytes('second')
		);
	});

	it('runFinalizeMeadowEntryMasters writes a foreground review output outside the approved package', async () => {
		const inputRoot = await temporaryRoot();
		const candidate = join(inputRoot, 'candidate.png');
		const transform = join(inputRoot, 'transform.json');
		const provenance = join(inputRoot, 'provenance.json');
		await Promise.all([
			writeFile(candidate, 'candidate'),
			writeFile(transform, '{}'),
			writeFile(provenance, '{}')
		]);
		const outputRoot = join(inputRoot, 'work/fg-review');
		const finalizers = {
			finalizeForeground: async () => ({
				png: Buffer.from('review-fg'),
				provenance: fakeProvenance('review-fg')
			})
		};
		await runFinalizeForTest(
			[
				'--plane',
				'foreground',
				'--foreground-candidate',
				candidate,
				'--foreground-transform',
				transform,
				'--foreground-provenance',
				provenance,
				'--output-root',
				outputRoot
			],
			repositoryRoot,
			finalizers
		);
		expect(await readFile(join(outputRoot, 'masters/meadow-entry-foreground-master.png'))).toEqual(
			Buffer.from('review-fg')
		);
	});

	it('runFinalizeMeadowEntryMasters validate-only for foreground does not write', async () => {
		const inputRoot = await temporaryRoot();
		const candidate = join(inputRoot, 'candidate.png');
		const transform = join(inputRoot, 'transform.json');
		const provenance = join(inputRoot, 'provenance.json');
		await Promise.all([
			writeFile(candidate, 'candidate'),
			writeFile(transform, '{}'),
			writeFile(provenance, '{}')
		]);
		const outputRoot = join(inputRoot, 'work/fg-validate');
		const finalizers = {
			finalizeForeground: async () => ({
				png: Buffer.from('review-fg'),
				provenance: fakeProvenance('review-fg')
			})
		};
		await runFinalizeForTest(
			[
				'--plane',
				'foreground',
				'--foreground-candidate',
				candidate,
				'--foreground-transform',
				transform,
				'--foreground-provenance',
				provenance,
				'--output-root',
				outputRoot,
				'--validate-only'
			],
			repositoryRoot,
			finalizers
		);
		await expect(
			readFile(join(outputRoot, 'masters/meadow-entry-foreground-master.png'))
		).rejects.toThrow();
	});

	it('runFinalizeMeadowEntryMasters publishes both planes via finalizeBoth', async () => {
		const inputRoot = await temporaryRoot();
		const outputRoot = await temporaryRoot();
		const baseCandidate = join(inputRoot, 'base.png');
		const fgCandidate = join(inputRoot, 'fg.png');
		const baseTransform = join(inputRoot, 'bt.json');
		const fgTransform = join(inputRoot, 'ft.json');
		const baseProvenance = join(inputRoot, 'bp.json');
		const fgProvenance = join(inputRoot, 'fp.json');
		await Promise.all([
			writeFile(baseCandidate, 'base'),
			writeFile(fgCandidate, 'fg'),
			writeFile(baseTransform, '{}'),
			writeFile(fgTransform, '{}'),
			writeFile(baseProvenance, '{}'),
			writeFile(fgProvenance, '{}')
		]);
		const expectedBytes = packageBytes('both');
		const finalizers = {
			finalizeBoth: async () => expectedBytes
		};
		await runFinalizeForTest(
			[
				'--plane',
				'both',
				'--base-candidate',
				baseCandidate,
				'--foreground-candidate',
				fgCandidate,
				'--base-transform',
				baseTransform,
				'--foreground-transform',
				fgTransform,
				'--base-provenance',
				baseProvenance,
				'--foreground-provenance',
				fgProvenance,
				'--output-root',
				outputRoot
			],
			repositoryRoot,
			finalizers
		);
		expect(await readApprovedMeadowEntryPackageSnapshot(outputRoot)).toEqual(expectedBytes);
	});

	it('runFinalizeMeadowEntryMasters validate-only for both does not publish', async () => {
		const inputRoot = await temporaryRoot();
		const outputRoot = await temporaryRoot();
		const baseCandidate = join(inputRoot, 'base.png');
		const fgCandidate = join(inputRoot, 'fg.png');
		const baseTransform = join(inputRoot, 'bt.json');
		const fgTransform = join(inputRoot, 'ft.json');
		const baseProvenance = join(inputRoot, 'bp.json');
		const fgProvenance = join(inputRoot, 'fp.json');
		await Promise.all([
			writeFile(baseCandidate, 'base'),
			writeFile(fgCandidate, 'fg'),
			writeFile(baseTransform, '{}'),
			writeFile(fgTransform, '{}'),
			writeFile(baseProvenance, '{}'),
			writeFile(fgProvenance, '{}')
		]);
		const expectedBytes = packageBytes('both-validate');
		const finalizers = {
			finalizeBoth: async () => expectedBytes
		};
		await runFinalizeForTest(
			[
				'--plane',
				'both',
				'--base-candidate',
				baseCandidate,
				'--foreground-candidate',
				fgCandidate,
				'--base-transform',
				baseTransform,
				'--foreground-transform',
				fgTransform,
				'--base-provenance',
				baseProvenance,
				'--foreground-provenance',
				fgProvenance,
				'--output-root',
				outputRoot,
				'--validate-only'
			],
			repositoryRoot,
			finalizers
		);
		await expect(readApprovedMeadowEntryPackageSnapshot(outputRoot)).rejects.toThrow();
	});

	it('checks a matching complete package without mutating it and rejects stale bytes', async () => {
		const inputRoot = await temporaryRoot();
		const outputRoot = await temporaryRoot();
		const baseCandidate = join(inputRoot, 'base.png');
		const fgCandidate = join(inputRoot, 'fg.png');
		const baseTransform = join(inputRoot, 'bt.json');
		const fgTransform = join(inputRoot, 'ft.json');
		const baseProvenance = join(inputRoot, 'bp.json');
		const fgProvenance = join(inputRoot, 'fp.json');
		await Promise.all([
			writeFile(baseCandidate, 'base'),
			writeFile(fgCandidate, 'fg'),
			writeFile(baseTransform, '{}'),
			writeFile(fgTransform, '{}'),
			writeFile(baseProvenance, '{}'),
			writeFile(fgProvenance, '{}')
		]);
		const expectedBytes = packageBytes('historical-check');
		await publishApprovedMeadowEntryPackage(outputRoot, expectedBytes);
		const finalizers = { finalizeBoth: async () => expectedBytes };
		const args = [
			'--plane',
			'both',
			'--check',
			'--base-candidate',
			baseCandidate,
			'--foreground-candidate',
			fgCandidate,
			'--base-transform',
			baseTransform,
			'--foreground-transform',
			fgTransform,
			'--base-provenance',
			baseProvenance,
			'--foreground-provenance',
			fgProvenance,
			'--output-root',
			outputRoot
		] as const;
		expect(parseFinalizeMeadowEntryMasterArguments(args).check).toBe(true);
		const before = await approvedBytes(outputRoot);
		const successMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		let successReads = 0;
		const checkFileSystem = {
			...successMutators,
			readFile: async (path: string) => {
				successReads += 1;
				return await readFile(path);
			}
		};
		await runFinalizeForTest(args, repositoryRoot, {
			...finalizers,
			checkFileSystem
		});
		expect(successReads).toBeGreaterThan(0);
		expect(Object.values(successMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
		expect(await approvedBytes(outputRoot)).toEqual(before);

		await writeFile(join(outputRoot, 'masters/meadow-entry-base-master.png'), Buffer.from('stale'));
		const staleMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		let staleReads = 0;
		const staleCheckFileSystem = {
			...staleMutators,
			readFile: async (path: string) => {
				staleReads += 1;
				return await readFile(path);
			}
		};
		await expect(
			runFinalizeForTest(args, repositoryRoot, {
				...finalizers,
				checkFileSystem: staleCheckFileSystem
			})
		).rejects.toThrow(/stale|drift/i);
		expect(staleReads).toBeGreaterThan(0);
		expect(Object.values(staleMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
	});

	it('fails closed when historical predecessor paths are absent without an injected reader', async () => {
		const inputRoot = await temporaryRoot();
		const candidate = join(inputRoot, 'candidate.png');
		const transform = join(inputRoot, 'transform.json');
		const provenance = join(inputRoot, 'provenance.json');
		await Promise.all([
			writeFile(candidate, 'candidate'),
			writeFile(transform, '{}'),
			writeFile(provenance, '{}')
		]);
		await expect(
			runFinalizeMeadowEntryMasters(
				[
					'--plane',
					'base',
					'--base-candidate',
					candidate,
					'--base-transform',
					transform,
					'--base-provenance',
					provenance,
					'--output-root',
					join(inputRoot, 'out')
				],
				repositoryRoot,
				{
					finalizeBase: async () => ({
						png: Buffer.from('unused'),
						provenance: fakeProvenance('unused')
					})
				}
			)
		).rejects.toThrow(/predecessor bytes are missing/i);
	});

	it('runs a real historical candidate through core finalization before check and stale detection', async () => {
		const outputRoot = await temporaryRoot();
		const candidate = join(
			repositoryRoot,
			'artifacts/meadow-entry/hpa-399/masters/meadow-entry-base-master.png'
		);
		const historicalProvenance = JSON.parse(
			await readFile(
				join(
					repositoryRoot,
					'artifacts/meadow-entry/hpa-399/provenance/meadow-entry-master-provenance.json'
				),
				'utf8'
			)
		) as { base: { transform: unknown; generation: unknown } };
		const transform = join(outputRoot, 'base-transform.json');
		const provenance = join(outputRoot, 'base-provenance.json');
		await Promise.all([
			writeFile(transform, JSON.stringify(historicalProvenance.base.transform)),
			writeFile(provenance, JSON.stringify(historicalProvenance.base.generation))
		]);
		const args = [
			'--plane',
			'base',
			'--base-candidate',
			candidate,
			'--base-transform',
			transform,
			'--base-provenance',
			provenance,
			'--output-root',
			outputRoot
		] as const;

		await runFinalizeForTest(args, repositoryRoot);
		const output = join(outputRoot, 'masters/meadow-entry-base-master.png');
		const expected = await readFile(output);
		await runFinalizeForTest([...args, '--check'], repositoryRoot);
		const stale = Buffer.from(expected);
		stale[stale.length - 1] = stale[stale.length - 1]! ^ 0xff;
		await writeFile(output, stale);
		await expect(runFinalizeForTest([...args, '--check'], repositoryRoot)).rejects.toThrow(
			/stale|drift/i
		);
	});
});

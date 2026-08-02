import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
	meadowEntryApprovedPackagePaths,
	parseFinalizeMeadowEntryMasterArguments,
	publishApprovedMeadowEntryPackage,
	readApprovedMeadowEntryPackageSnapshot,
	runFinalizeMeadowEntryMasters,
	type MeadowEntryMasterPublicationFileSystem
} from '../../../../../tools/finalize-meadow-entry-masters';

const temporaryRoots: string[] = [];
const repositoryRoot = resolve(import.meta.dirname, '../../../../..');

afterEach(async () => {
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

describe('finalize-meadow-entry-masters CLI', () => {
	it('parses the required plane and default output root', () => {
		expect(parseFinalizeMeadowEntryMasterArguments(['--plane', 'base'])).toMatchObject({
			plane: 'base',
			outputRoot: 'artifacts/meadow-entry/hpa-399',
			validateOnly: false
		});
		expect(() => parseFinalizeMeadowEntryMasterArguments(['--plane', 'unknown'])).toThrow(/plane/i);
	});

	it('commits both master planes and provenance as one complete snapshot', async () => {
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
				return { png: Buffer.from('review-base'), provenance: {} };
			}
		};

		await runFinalizeMeadowEntryMasters(
			[...arguments_, '--validate-only'],
			repositoryRoot,
			finalizers
		);
		await expect(
			readFile(join(outputRoot, 'masters/meadow-entry-base-master.png'))
		).rejects.toThrow();
		await runFinalizeMeadowEntryMasters(arguments_, repositoryRoot, finalizers);
		expect(await readFile(join(outputRoot, 'masters/meadow-entry-base-master.png'))).toEqual(
			Buffer.from('review-base')
		);
		expect(calls).toBe(2);
	});

	it('rejects unknown finalizer arguments', () => {
		expect(() => parseFinalizeMeadowEntryMasterArguments(['--plane', 'base', '--unknown'])).toThrow(
			/Unknown meadow-entry finalizer argument/i
		);
	});

	it('rejects a flag whose value is missing at the end of the argument list', () => {
		expect(() => parseFinalizeMeadowEntryMasterArguments(['--plane'])).toThrow(/Missing value/i);
	});

	it('rejects a flag whose next token is another flag', () => {
		expect(() => parseFinalizeMeadowEntryMasterArguments(['--plane', '--validate-only'])).toThrow(
			/Missing value/i
		);
	});

	it('rejects a duplicate --validate-only flag', () => {
		expect(() =>
			parseFinalizeMeadowEntryMasterArguments([
				'--plane',
				'base',
				'--validate-only',
				'--validate-only'
			])
		).toThrow(/Duplicate/i);
	});

	it('rejects a duplicate valued flag', () => {
		expect(() =>
			parseFinalizeMeadowEntryMasterArguments(['--plane', 'base', '--plane', 'foreground'])
		).toThrow(/Duplicate/i);
	});

	it('parses --plane both', () => {
		expect(parseFinalizeMeadowEntryMasterArguments(['--plane', 'both'])).toMatchObject({
			plane: 'both'
		});
	});

	it('parses --plane foreground', () => {
		expect(parseFinalizeMeadowEntryMasterArguments(['--plane', 'foreground'])).toMatchObject({
			plane: 'foreground'
		});
	});

	it('skips a leading -- separator before parsing arguments', () => {
		expect(parseFinalizeMeadowEntryMasterArguments(['--', '--plane', 'base'])).toMatchObject({
			plane: 'base'
		});
	});

	it('parses a custom --output-root', () => {
		expect(
			parseFinalizeMeadowEntryMasterArguments(['--plane', 'base', '--output-root', 'custom/root'])
		).toMatchObject({ outputRoot: 'custom/root' });
	});

	it('reads an array refinement manifest via runFinalizeMeadowEntryMasters', async () => {
		const inputRoot = await temporaryRoot();
		const candidate = join(inputRoot, 'candidate.png');
		const transform = join(inputRoot, 'transform.json');
		const provenance = join(inputRoot, 'provenance.json');
		const manifest = join(inputRoot, 'refinements.json');
		await Promise.all([
			writeFile(candidate, 'candidate'),
			writeFile(transform, '{}'),
			writeFile(provenance, '{}'),
			writeFile(manifest, JSON.stringify([{ plane: 'base', description: 'array-refinement' }]))
		]);
		let received: unknown;
		const finalizers = {
			finalizeBase: async (input: { refinements: unknown[] }) => {
				received = input.refinements;
				return { png: Buffer.from('review-base'), provenance: {} };
			}
		};
		await runFinalizeMeadowEntryMasters(
			[
				'--plane',
				'base',
				'--base-candidate',
				candidate,
				'--base-transform',
				transform,
				'--base-provenance',
				provenance,
				'--refinement-manifest',
				manifest,
				'--validate-only'
			],
			repositoryRoot,
			finalizers
		);
		expect(received).toEqual([{ plane: 'base', description: 'array-refinement' }]);
	});

	it('reads an object refinement manifest with a refinements property', async () => {
		const inputRoot = await temporaryRoot();
		const candidate = join(inputRoot, 'candidate.png');
		const transform = join(inputRoot, 'transform.json');
		const provenance = join(inputRoot, 'provenance.json');
		const manifest = join(inputRoot, 'refinements.json');
		await Promise.all([
			writeFile(candidate, 'candidate'),
			writeFile(transform, '{}'),
			writeFile(provenance, '{}'),
			writeFile(
				manifest,
				JSON.stringify({
					refinements: [{ plane: 'base', description: 'object-refinement' }]
				})
			)
		]);
		let received: unknown;
		const finalizers = {
			finalizeBase: async (input: { refinements: unknown[] }) => {
				received = input.refinements;
				return { png: Buffer.from('review-base'), provenance: {} };
			}
		};
		await runFinalizeMeadowEntryMasters(
			[
				'--plane',
				'base',
				'--base-candidate',
				candidate,
				'--base-transform',
				transform,
				'--base-provenance',
				provenance,
				'--refinement-manifest',
				manifest,
				'--validate-only'
			],
			repositoryRoot,
			finalizers
		);
		expect(received).toEqual([{ plane: 'base', description: 'object-refinement' }]);
	});

	it('rejects an invalid refinement manifest that is neither array nor has refinements', async () => {
		const inputRoot = await temporaryRoot();
		const candidate = join(inputRoot, 'candidate.png');
		const transform = join(inputRoot, 'transform.json');
		const provenance = join(inputRoot, 'provenance.json');
		const manifest = join(inputRoot, 'refinements.json');
		await Promise.all([
			writeFile(candidate, 'candidate'),
			writeFile(transform, '{}'),
			writeFile(provenance, '{}'),
			writeFile(manifest, JSON.stringify({ notRefinements: true }))
		]);
		const finalizers = {
			finalizeBase: async () => ({ png: Buffer.from('review-base'), provenance: {} })
		};
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
					'--refinement-manifest',
					manifest,
					'--validate-only'
				],
				repositoryRoot,
				finalizers
			)
		).rejects.toThrow(/must be an array or contain a refinements array/i);
	});

	it('rejects an approved package whose provenance is not valid JSON', async () => {
		const outputRoot = await temporaryRoot();
		await publishApprovedMeadowEntryPackage(outputRoot, packageBytes('valid'));
		const paths = meadowEntryApprovedPackagePaths(outputRoot);
		await writeFile(
			join(paths.provenance, 'meadow-entry-master-provenance.json'),
			'{ not valid json'
		);
		await expect(readApprovedMeadowEntryPackageSnapshot(outputRoot)).rejects.toThrow(
			/not valid JSON/i
		);
	});

	it('rejects an approved package whose manifest hashes do not match the master bytes', async () => {
		const outputRoot = await temporaryRoot();
		await publishApprovedMeadowEntryPackage(outputRoot, packageBytes('valid'));
		const paths = meadowEntryApprovedPackagePaths(outputRoot);
		const tampered = packageBytes('tampered');
		await writeFile(
			join(paths.provenance, 'meadow-entry-master-provenance.json'),
			tampered.provenanceJson
		);
		await expect(readApprovedMeadowEntryPackageSnapshot(outputRoot)).rejects.toThrow(
			/does not match its master bytes/i
		);
	});

	it('retries reading an approved package snapshot until the writer sentinel is removed', async () => {
		const outputRoot = await temporaryRoot();
		const snapshot = packageBytes('retryable');
		await publishApprovedMeadowEntryPackage(outputRoot, snapshot);
		const paths = meadowEntryApprovedPackagePaths(outputRoot);
		await writeFile(paths.writerSentinel, 'sentinel\n');
		const timer = setTimeout(() => {
			void rm(paths.writerSentinel, { force: true });
		}, 0);
		try {
			const result = await readApprovedMeadowEntryPackageSnapshot(outputRoot, { attempts: 100 });
			expect(result).toEqual(snapshot);
		} finally {
			clearTimeout(timer);
		}
	});

	it('exhausts attempts when the writer sentinel persists', async () => {
		const outputRoot = await temporaryRoot();
		await publishApprovedMeadowEntryPackage(outputRoot, packageBytes('first'));
		const paths = meadowEntryApprovedPackagePaths(outputRoot);
		await writeFile(paths.writerSentinel, 'sentinel\n');
		await expect(
			readApprovedMeadowEntryPackageSnapshot(outputRoot, { attempts: 2 })
		).rejects.toThrow(/publication is in progress/i);
		await rm(paths.writerSentinel, { force: true });
	});

	it('writes the foreground master when --plane foreground is used', async () => {
		const inputRoot = await temporaryRoot();
		const candidate = join(inputRoot, 'candidate.png');
		const transform = join(inputRoot, 'transform.json');
		const provenance = join(inputRoot, 'provenance.json');
		await Promise.all([
			writeFile(candidate, 'candidate'),
			writeFile(transform, '{}'),
			writeFile(provenance, '{}')
		]);
		const outputRoot = join(inputRoot, 'work/foreground-review');
		let baseCalls = 0;
		let foregroundCalls = 0;
		const finalizers = {
			finalizeBase: async () => {
				baseCalls += 1;
				return { png: Buffer.from('should-not-happen'), provenance: {} };
			},
			finalizeForeground: async () => {
				foregroundCalls += 1;
				return { png: Buffer.from('review-foreground'), provenance: {} };
			}
		};
		await runFinalizeMeadowEntryMasters(
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
		expect(foregroundCalls).toBe(1);
		expect(baseCalls).toBe(0);
		expect(await readFile(join(outputRoot, 'masters/meadow-entry-foreground-master.png'))).toEqual(
			Buffer.from('review-foreground')
		);
		await expect(
			readFile(join(outputRoot, 'masters/meadow-entry-base-master.png'))
		).rejects.toThrow();
	});

	it('publishes the approved package when --plane both is used', async () => {
		const inputRoot = await temporaryRoot();
		const baseCandidate = join(inputRoot, 'base-candidate.png');
		const baseTransform = join(inputRoot, 'base-transform.json');
		const baseProvenance = join(inputRoot, 'base-provenance.json');
		const foregroundCandidate = join(inputRoot, 'foreground-candidate.png');
		const foregroundTransform = join(inputRoot, 'foreground-transform.json');
		const foregroundProvenance = join(inputRoot, 'foreground-provenance.json');
		await Promise.all([
			writeFile(baseCandidate, 'base-candidate'),
			writeFile(baseTransform, '{}'),
			writeFile(baseProvenance, '{}'),
			writeFile(foregroundCandidate, 'foreground-candidate'),
			writeFile(foregroundTransform, '{}'),
			writeFile(foregroundProvenance, '{}')
		]);
		const outputRoot = join(inputRoot, 'work/both');
		let bothCalls = 0;
		const published = packageBytes('both');
		const finalizers = {
			finalizeBoth: async () => {
				bothCalls += 1;
				return {
					basePng: published.basePng,
					foregroundPng: published.foregroundPng,
					provenanceJson: published.provenanceJson
				};
			}
		};
		await runFinalizeMeadowEntryMasters(
			[
				'--plane',
				'both',
				'--base-candidate',
				baseCandidate,
				'--base-transform',
				baseTransform,
				'--base-provenance',
				baseProvenance,
				'--foreground-candidate',
				foregroundCandidate,
				'--foreground-transform',
				foregroundTransform,
				'--foreground-provenance',
				foregroundProvenance,
				'--output-root',
				outputRoot
			],
			repositoryRoot,
			finalizers
		);
		expect(bothCalls).toBe(1);
		expect(await readApprovedMeadowEntryPackageSnapshot(outputRoot)).toEqual(published);
	});
});

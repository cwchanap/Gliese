import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	assertApprovedMasterSnapshot,
	checkMeadowEntryExportPackage,
	parseMeadowEntryExportArguments,
	publishMeadowEntryExportPackage,
	readPublishedMeadowEntryExportSnapshot,
	runExportMeadowEntryRegions,
	type MeadowEntryApprovedMasterIdentities,
	type MeadowEntryExportPackageBytes,
	type MeadowEntryExportPublicationFileSystem,
	type MeadowEntryExportSnapshotFileSystem
} from '../../../../../tools/export-meadow-entry-regions';

const temporaryRoots: string[] = [];

afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(
		temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true }))
	);
});

async function temporaryRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), 'gliese-export-regions-cli-'));
	temporaryRoots.push(root);
	return root;
}

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

const FINGERPRINT = 'a'.repeat(64);
const BASE_SHA = 'b'.repeat(64);
const FOREGROUND_SHA = 'c'.repeat(64);
const PROVENANCE_SHA = 'd'.repeat(64);

function validFiles(): Record<string, Buffer> {
	return {
		'a-base.png': Buffer.from('a-base'),
		'a-foreground.png': Buffer.from('a-foreground'),
		'b-base.png': Buffer.from('b-base')
	};
}

function validProvenanceObj(): Record<string, unknown> {
	const files = validFiles();
	const inventory = Object.entries(files)
		.map(([filename, bytes]) => ({
			filename,
			bytes: bytes.byteLength,
			sha256: sha256(bytes)
		}))
		.sort((a, b) => a.filename.localeCompare(b.filename));
	return {
		version: 1,
		controls: { fingerprint: FINGERPRINT },
		masters: {
			base: { sha256: BASE_SHA },
			foreground: { sha256: FOREGROUND_SHA }
		},
		approvedMasterProvenanceSha256: PROVENANCE_SHA,
		inventory
	};
}

function validManifestObj(): Record<string, unknown> {
	return {
		version: 1,
		controlFingerprint: FINGERPRINT,
		masters: {
			baseSha256: BASE_SHA,
			foregroundSha256: FOREGROUND_SHA,
			provenanceSha256: PROVENANCE_SHA
		},
		crops: [
			{ baseFilename: 'a-base.png', foregroundFilename: 'a-foreground.png' },
			{ baseFilename: 'b-base.png', foregroundFilename: null }
		]
	};
}

function validPackage(): MeadowEntryExportPackageBytes {
	return {
		files: validFiles(),
		provenanceJson: Buffer.from(JSON.stringify(validProvenanceObj())),
		cropManifestJson: Buffer.from(JSON.stringify(validManifestObj()))
	};
}

async function writePublishedPackage(
	root: string,
	pkg: MeadowEntryExportPackageBytes
): Promise<void> {
	await mkdir(join(root, 'exports'), { recursive: true });
	await mkdir(join(root, 'provenance'), { recursive: true });
	for (const [filename, bytes] of Object.entries(pkg.files)) {
		await writeFile(join(root, 'exports', filename), bytes);
	}
	await writeFile(join(root, 'provenance/meadow-entry-export-provenance.json'), pkg.provenanceJson);
	await writeFile(join(root, 'provenance/meadow-entry-crop-manifest.json'), pkg.cropManifestJson);
}

async function writeSnapshotFiles(
	root: string,
	provenance: Buffer,
	manifest: Buffer,
	files: Record<string, Buffer> = validFiles()
): Promise<void> {
	await mkdir(join(root, 'exports'), { recursive: true });
	await mkdir(join(root, 'provenance'), { recursive: true });
	for (const [filename, bytes] of Object.entries(files)) {
		await writeFile(join(root, 'exports', filename), bytes);
	}
	await writeFile(join(root, 'provenance/meadow-entry-export-provenance.json'), provenance);
	await writeFile(join(root, 'provenance/meadow-entry-crop-manifest.json'), manifest);
}

function withPublicationFailure(
	failure: (operation: 'write' | 'rename' | 'remove', path: string) => boolean,
	onWriterSentinel?: (path: string) => Promise<void>
): MeadowEntryExportPublicationFileSystem {
	return {
		mkdir,
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
		},
		writeFile: async (path, data, options) => {
			const pathString = String(path);
			if (failure('write', pathString)) throw new Error(`injected write failure: ${pathString}`);
			const result = await writeFile(path, data, options);
			if (onWriterSentinel && pathString.endsWith('.meadow-entry-export-publication.lock')) {
				await onWriterSentinel(pathString);
			}
			return result;
		}
	};
}

function approvedMasterFixture() {
	const basePng = Buffer.from('base-master');
	const foregroundPng = Buffer.from('foreground-master');
	const controlFingerprint = FINGERPRINT;
	const provenance = {
		controls: { fingerprint: controlFingerprint },
		base: { sha256: sha256(basePng) },
		foreground: { sha256: sha256(foregroundPng) }
	};
	const provenanceJson = Buffer.from(JSON.stringify(provenance));
	return {
		snapshot: { basePng, foregroundPng, provenanceJson },
		expected: {
			baseSha256: sha256(basePng),
			foregroundSha256: sha256(foregroundPng),
			provenanceSha256: sha256(provenanceJson),
			controlFingerprint
		}
	};
}

describe('publishMeadowEntryExportPackage error branches', () => {
	it('parses painted-v2 check mode and rejects publication-only flags', () => {
		expect(parseMeadowEntryExportArguments([])).toEqual({ check: false, outputRoot: undefined });
		expect(parseMeadowEntryExportArguments(['--check'])).toEqual({
			check: true,
			outputRoot: undefined
		});
		expect(() => parseMeadowEntryExportArguments(['--check', '--publish-runtime'])).toThrow(
			/cannot combine.*--check.*--publish-runtime/i
		);
	});

	it('runs the parsed --check command with zero filesystem mutations on matching and stale snapshots', async () => {
		const root = await temporaryRoot();
		const pkg = validPackage();
		await publishMeadowEntryExportPackage(root, pkg);
		const parsed = parseMeadowEntryExportArguments(['--check', '--output-root', root]);
		expect(parsed.check).toBe(true);
		const successMutators = {
			mkdir: vi.fn(),
			writeFile: vi.fn(),
			rename: vi.fn(),
			rm: vi.fn()
		};
		let successReads = 0;
		const successFileSystem = {
			...successMutators,
			lstat: async (path: string) => await lstat(path),
			readFile: async (path: string) => {
				successReads += 1;
				return await readFile(path);
			},
			readdir: async (path: string) => await readdir(path)
		};
		await expect(
			runExportMeadowEntryRegions(parsed.outputRoot!, root, {
				...parsed,
				packageBytes: pkg,
				fileSystem: successFileSystem
			})
		).resolves.toBeDefined();
		expect(successReads).toBeGreaterThan(0);
		expect(Object.values(successMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);

		await writeFile(join(root, 'exports/a-base.png'), Buffer.from('stale'));
		const staleMutators = {
			mkdir: vi.fn(),
			writeFile: vi.fn(),
			rename: vi.fn(),
			rm: vi.fn()
		};
		const staleFileSystem = {
			...staleMutators,
			lstat: async (path: string) => await lstat(path),
			readFile: async (path: string) => await readFile(path),
			readdir: async (path: string) => await readdir(path)
		};
		await expect(
			runExportMeadowEntryRegions(parsed.outputRoot!, root, {
				...parsed,
				packageBytes: pkg,
				fileSystem: staleFileSystem
			})
		).rejects.toThrow(/stale|drift/i);
		expect(Object.values(staleMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
	});

	it('checks a matching artifact/runtime snapshot without writes and rejects stale bytes', async () => {
		const root = await temporaryRoot();
		const runtimeRoot = await temporaryRoot();
		const pkg = validPackage();
		await publishMeadowEntryExportPackage(root, pkg);
		await mkdir(runtimeRoot, { recursive: true });
		for (const [filename, bytes] of Object.entries(pkg.files)) {
			await writeFile(join(runtimeRoot, filename), bytes);
		}

		const successMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		let successReads = 0;
		const checkFileSystem = {
			...successMutators,
			lstat: async (path: string) => await lstat(path),
			readFile: async (path: string) => {
				successReads += 1;
				return await readFile(path);
			},
			readdir: async (path: string) => await readdir(path)
		};
		await expect(
			checkMeadowEntryExportPackage(root, runtimeRoot, pkg, { fileSystem: checkFileSystem })
		).resolves.toBeUndefined();
		expect(successReads).toBeGreaterThan(0);
		expect(Object.values(successMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
		await writeFile(join(runtimeRoot, 'a-base.png'), Buffer.from('stale'));
		const staleMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		let staleReads = 0;
		const staleCheckFileSystem = {
			...staleMutators,
			lstat: async (path: string) => await lstat(path),
			readFile: async (path: string) => {
				staleReads += 1;
				return await readFile(path);
			},
			readdir: async (path: string) => await readdir(path)
		};
		await expect(
			checkMeadowEntryExportPackage(root, runtimeRoot, pkg, { fileSystem: staleCheckFileSystem })
		).rejects.toThrow(/stale|drift/i);
		expect(staleReads).toBeGreaterThan(0);
		expect(Object.values(staleMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
	});

	it('restores the previous snapshot when a staging write fails', async () => {
		const root = await temporaryRoot();
		const oldPackage = validPackage();
		await publishMeadowEntryExportPackage(root, oldPackage);

		await expect(
			publishMeadowEntryExportPackage(
				root,
				validPackage(),
				withPublicationFailure(
					(operation, path) => operation === 'write' && path.includes('exports-staging')
				)
			)
		).rejects.toThrow(/injected write failure/i);

		expect(await readPublishedMeadowEntryExportSnapshot(root)).toEqual(oldPackage);
	});

	it('restores the previous snapshot when an install rename fails for the exports directory', async () => {
		const root = await temporaryRoot();
		const oldPackage = validPackage();
		await publishMeadowEntryExportPackage(root, oldPackage);

		let installFailed = false;
		const fileSystem: MeadowEntryExportPublicationFileSystem = {
			mkdir,
			writeFile,
			rm,
			rename: async (source, destination) => {
				if (!installFailed && String(destination) === join(resolve(root), 'exports')) {
					installFailed = true;
					throw new Error('injected install rename failure');
				}
				return rename(source, destination);
			}
		};

		await expect(publishMeadowEntryExportPackage(root, validPackage(), fileSystem)).rejects.toThrow(
			/injected install rename failure/i
		);

		expect(await readPublishedMeadowEntryExportSnapshot(root)).toEqual(oldPackage);
	});

	it('restores the previous snapshot when the commit sentinel removal fails', async () => {
		const root = await temporaryRoot();
		const oldPackage = validPackage();
		await publishMeadowEntryExportPackage(root, oldPackage);

		let sentinelRemovalFailed = false;
		const fileSystem: MeadowEntryExportPublicationFileSystem = {
			mkdir,
			writeFile,
			rename,
			rm: async (path, options) => {
				if (
					!sentinelRemovalFailed &&
					String(path) === join(resolve(root), '.meadow-entry-export-publication.lock')
				) {
					sentinelRemovalFailed = true;
					throw new Error('injected sentinel removal failure');
				}
				return rm(path, options);
			}
		};

		await expect(publishMeadowEntryExportPackage(root, validPackage(), fileSystem)).rejects.toThrow(
			/injected sentinel removal failure/i
		);

		expect(await readPublishedMeadowEntryExportSnapshot(root)).toEqual(oldPackage);
	});

	it('blocks readers with a publication-in-progress sentinel during staging', async () => {
		const root = await temporaryRoot();
		const oldPackage = validPackage();
		await publishMeadowEntryExportPackage(root, oldPackage);

		let interruptedReaderReads = 0;
		const fileSystem = withPublicationFailure(
			() => false,
			async () => {
				interruptedReaderReads += 1;
				await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
					/publication is in progress/i
				);
			}
		);

		await publishMeadowEntryExportPackage(root, validPackage(), fileSystem);

		expect(interruptedReaderReads).toBe(1);
	});
});

describe('readPublishedMeadowEntryExportSnapshot error branches', () => {
	it('fails when all attempts are exhausted on an empty root', async () => {
		const root = await temporaryRoot();
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow();
	});

	it('fails when the writer sentinel is present', async () => {
		const root = await temporaryRoot();
		await writePublishedPackage(root, validPackage());
		await writeFile(join(root, '.meadow-entry-export-publication.lock'), Buffer.from('sentinel\n'));
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/publication is in progress/i
		);
	});

	it('fails when the export provenance is not valid JSON', async () => {
		const root = await temporaryRoot();
		await writeSnapshotFiles(
			root,
			Buffer.from('not valid json'),
			Buffer.from(JSON.stringify(validManifestObj()))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/export provenance is not valid JSON/i
		);
	});

	it('fails when the crop manifest is not valid JSON', async () => {
		const root = await temporaryRoot();
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(validProvenanceObj())),
			Buffer.from('not valid json')
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/crop manifest is not valid JSON/i
		);
	});

	it('fails when the export provenance is not a JSON object', async () => {
		const root = await temporaryRoot();
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify([1, 2, 3])),
			Buffer.from(JSON.stringify(validManifestObj()))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/export provenance must be a JSON object/i
		);
	});

	it('fails when the crop manifest is not a JSON object', async () => {
		const root = await temporaryRoot();
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(validProvenanceObj())),
			Buffer.from(JSON.stringify([1, 2, 3]))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/crop manifest must be a JSON object/i
		);
	});

	it('fails when the export provenance version has drifted', async () => {
		const root = await temporaryRoot();
		const provenance = validProvenanceObj();
		provenance.version = 2;
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(provenance)),
			Buffer.from(JSON.stringify(validManifestObj()))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/export provenance version has drifted/i
		);
	});

	it('fails when the crop manifest version has drifted', async () => {
		const root = await temporaryRoot();
		const manifest = validManifestObj();
		manifest.version = 2;
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(validProvenanceObj())),
			Buffer.from(JSON.stringify(manifest))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/crop manifest version has drifted/i
		);
	});

	it('fails when the export provenance controls fingerprint is missing', async () => {
		const root = await temporaryRoot();
		const provenance = validProvenanceObj();
		provenance.controls = {};
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(provenance)),
			Buffer.from(JSON.stringify(validManifestObj()))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/export provenance controls requires fingerprint/i
		);
	});

	it('fails when the crop manifest controlFingerprint is missing', async () => {
		const root = await temporaryRoot();
		const manifest = validManifestObj();
		delete manifest.controlFingerprint;
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(validProvenanceObj())),
			Buffer.from(JSON.stringify(manifest))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/crop manifest requires controlFingerprint/i
		);
	});

	it('fails when the export control fingerprint is not a valid SHA-256 hash', async () => {
		const root = await temporaryRoot();
		const provenance = validProvenanceObj();
		provenance.controls = { fingerprint: 'not-a-hash' };
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(provenance)),
			Buffer.from(JSON.stringify(validManifestObj()))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/export control fingerprint must be a lowercase SHA-256 hash/i
		);
	});

	it('fails when the provenance and crop manifest control fingerprints differ', async () => {
		const root = await temporaryRoot();
		const provenance = validProvenanceObj();
		provenance.controls = { fingerprint: 'e'.repeat(64) };
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(provenance)),
			Buffer.from(JSON.stringify(validManifestObj()))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/provenance and crop manifest controls differ/i
		);
	});

	it('fails when the export provenance base master sha256 is missing', async () => {
		const root = await temporaryRoot();
		const provenance = validProvenanceObj();
		provenance.masters = { foreground: { sha256: FOREGROUND_SHA } };
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(provenance)),
			Buffer.from(JSON.stringify(validManifestObj()))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/export provenance base master requires sha256/i
		);
	});

	it('fails when the export provenance and crop manifest master identities differ', async () => {
		const root = await temporaryRoot();
		const manifest = validManifestObj();
		(manifest.masters as Record<string, unknown>).baseSha256 = 'e'.repeat(64);
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(validProvenanceObj())),
			Buffer.from(JSON.stringify(manifest))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/provenance and crop manifest master identities differ/i
		);
	});

	it('fails when the crop manifest crops array is missing', async () => {
		const root = await temporaryRoot();
		const manifest = validManifestObj();
		delete manifest.crops;
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(validProvenanceObj())),
			Buffer.from(JSON.stringify(manifest))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/crop manifest requires crops/i
		);
	});

	it('fails when the crop manifest contains an invalid crop', async () => {
		const root = await temporaryRoot();
		const manifest = validManifestObj();
		manifest.crops = [{ baseFilename: 'a-base.png', foregroundFilename: 'a-foreground.png' }, 42];
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(validProvenanceObj())),
			Buffer.from(JSON.stringify(manifest))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/crop manifest contains an invalid crop/i
		);
	});

	it('fails when a crop manifest crop is missing baseFilename', async () => {
		const root = await temporaryRoot();
		const manifest = validManifestObj();
		manifest.crops = [
			{ foregroundFilename: 'a-foreground.png' },
			{ baseFilename: 'b-base.png', foregroundFilename: null }
		];
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(validProvenanceObj())),
			Buffer.from(JSON.stringify(manifest))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/crop manifest crop requires baseFilename/i
		);
	});

	it('fails when a crop manifest crop has an invalid foregroundFilename', async () => {
		const root = await temporaryRoot();
		const manifest = validManifestObj();
		manifest.crops = [
			{ baseFilename: 'a-base.png', foregroundFilename: 123 },
			{ baseFilename: 'b-base.png', foregroundFilename: null }
		];
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(validProvenanceObj())),
			Buffer.from(JSON.stringify(manifest))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/crop manifest crop has an invalid foregroundFilename/i
		);
	});

	it('fails when the export provenance inventory array is missing', async () => {
		const root = await temporaryRoot();
		const provenance = validProvenanceObj();
		delete provenance.inventory;
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(provenance)),
			Buffer.from(JSON.stringify(validManifestObj()))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/export provenance requires inventory/i
		);
	});

	it('fails when the export provenance contains an invalid inventory entry', async () => {
		const root = await temporaryRoot();
		const provenance = validProvenanceObj();
		provenance.inventory = [42];
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(provenance)),
			Buffer.from(JSON.stringify(validManifestObj()))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/provenance contains an invalid inventory entry/i
		);
	});

	it('fails when the export provenance contains an invalid filename', async () => {
		const root = await temporaryRoot();
		const provenance = validProvenanceObj();
		const inventory = provenance.inventory as Array<Record<string, unknown>>;
		inventory[0] = { filename: 'not-a-png.txt', bytes: 6, sha256: 'e'.repeat(64) };
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(provenance)),
			Buffer.from(JSON.stringify(validManifestObj()))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/provenance contains an invalid filename/i
		);
	});

	it('fails when the export provenance has invalid bytes for an inventory entry', async () => {
		const root = await temporaryRoot();
		const provenance = validProvenanceObj();
		const inventory = provenance.inventory as Array<Record<string, unknown>>;
		inventory[0] = { filename: 'a-base.png', bytes: -1, sha256: 'e'.repeat(64) };
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(provenance)),
			Buffer.from(JSON.stringify(validManifestObj()))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/provenance has invalid bytes for a-base.png/i
		);
	});

	it('fails when the export provenance has an invalid hash for an inventory entry', async () => {
		const root = await temporaryRoot();
		const provenance = validProvenanceObj();
		const inventory = provenance.inventory as Array<Record<string, unknown>>;
		inventory[0] = {
			filename: 'a-base.png',
			bytes: 6,
			sha256: 'not-a-hash'
		};
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(provenance)),
			Buffer.from(JSON.stringify(validManifestObj()))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/provenance has invalid hash for a-base.png/i
		);
	});

	it('fails when the export provenance duplicates a filename', async () => {
		const root = await temporaryRoot();
		const provenance = validProvenanceObj();
		const inventory = provenance.inventory as Array<Record<string, unknown>>;
		inventory.push({ ...inventory[0]! });
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(provenance)),
			Buffer.from(JSON.stringify(validManifestObj()))
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/provenance duplicates a-base.png/i
		);
	});

	it('fails when the provenance inventory and crop manifest filenames differ', async () => {
		const root = await temporaryRoot();
		const provenance = validProvenanceObj();
		const inventory = provenance.inventory as Array<Record<string, unknown>>;
		inventory.push({
			filename: 'extra.png',
			bytes: 5,
			sha256: sha256(Buffer.from('extra'))
		});
		await writeSnapshotFiles(
			root,
			Buffer.from(JSON.stringify(provenance)),
			Buffer.from(JSON.stringify(validManifestObj())),
			{ ...validFiles(), 'extra.png': Buffer.from('extra') }
		);
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/provenance\/crop manifest inventory differs/i
		);
	});

	it('fails when the published export directory has extra files', async () => {
		const root = await temporaryRoot();
		await writePublishedPackage(root, validPackage());
		await writeFile(join(root, 'exports', 'extra.png'), Buffer.from('extra'));
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/published export inventory differs/i
		);
	});

	it('fails when published export bytes drift from the inventory', async () => {
		const root = await temporaryRoot();
		await writePublishedPackage(root, validPackage());
		await writeFile(join(root, 'exports', 'a-base.png'), Buffer.from('drifted-content'));
		await expect(readPublishedMeadowEntryExportSnapshot(root, { attempts: 1 })).rejects.toThrow(
			/bytes drifted for a-base.png/i
		);
	});

	it('fails when the publication changes while its snapshot is read', async () => {
		const root = await temporaryRoot();
		await writePublishedPackage(root, validPackage());
		let provenanceReads = 0;
		const fileSystem: MeadowEntryExportSnapshotFileSystem = {
			lstat: async (path) => await lstat(path),
			readdir: async (path) => await readdir(path),
			readFile: async (path) => {
				if (path.endsWith('meadow-entry-export-provenance.json')) {
					provenanceReads += 1;
					if (provenanceReads > 1) return Buffer.from('changed');
				}
				return await readFile(path);
			}
		};
		await expect(
			readPublishedMeadowEntryExportSnapshot(root, { attempts: 1, fileSystem })
		).rejects.toThrow(/changed while its snapshot was read/i);
	});

	it('falls back to a generic error when a non-Error is thrown', async () => {
		const root = await temporaryRoot();
		const fileSystem: MeadowEntryExportSnapshotFileSystem = {
			lstat: async (path) => await lstat(path),
			readdir: async (path) => await readdir(path),
			readFile: async () => {
				throw 'non-error failure';
			}
		};
		await expect(
			readPublishedMeadowEntryExportSnapshot(root, { attempts: 1, fileSystem })
		).rejects.toThrow(/published export snapshot is unavailable/i);
	});
});

describe('assertApprovedMasterSnapshot error branches', () => {
	it('rejects provenance content that is not valid JSON', () => {
		const fixture = approvedMasterFixture();
		const invalidJson = Buffer.from('not valid json');
		const expected: MeadowEntryApprovedMasterIdentities = {
			...fixture.expected,
			provenanceSha256: sha256(invalidJson)
		};
		expect(() =>
			assertApprovedMasterSnapshot({ ...fixture.snapshot, provenanceJson: invalidJson }, expected)
		).toThrow(/approved master provenance is not valid JSON/i);
	});

	it('rejects provenance plane hashes that drift from the approved snapshot', () => {
		const fixture = approvedMasterFixture();
		const driftedProvenance = Buffer.from(
			JSON.stringify({
				controls: { fingerprint: fixture.expected.controlFingerprint },
				base: { sha256: 'e'.repeat(64) },
				foreground: { sha256: fixture.expected.foregroundSha256 }
			})
		);
		const expected: MeadowEntryApprovedMasterIdentities = {
			...fixture.expected,
			provenanceSha256: sha256(driftedProvenance)
		};
		expect(() =>
			assertApprovedMasterSnapshot(
				{ ...fixture.snapshot, provenanceJson: driftedProvenance },
				expected
			)
		).toThrow(/plane hashes have drifted/i);
	});
});

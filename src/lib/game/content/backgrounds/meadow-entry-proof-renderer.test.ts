import { createHash } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_APPROVED_CROPS,
	MEADOW_ENTRY_APPROVED_OVERLAPS,
	MEADOW_ENTRY_RUNTIME_COVERAGE
} from './meadow-entry-crop-manifest';
import { encodeCanonicalMeadowEntryPng, decodeMeadowEntryRgba } from './meadow-entry-png';
import {
	MEADOW_ENTRY_PAINTED_V2_PROOF_DESCRIPTORS,
	MEADOW_ENTRY_PAINTED_V2_PROOF_FILENAMES,
	MEADOW_ENTRY_PROOF_DESCRIPTORS,
	MEADOW_ENTRY_PROOF_FILENAMES,
	assertAllowedMeadowEntryProofDestination,
	renderMeadowEntryOverlapDifference,
	renderMeadowEntryReviewComposite
} from './meadow-entry-proof-renderer';
import type {
	MeadowEntryProofPublicationFileSystem,
	MeadowEntryProofSnapshotFileSystem
} from '../../../../../tools/render-meadow-entry-art-proofs';

async function proofToolApi() {
	return await import('../../../../../tools/render-meadow-entry-art-proofs');
}

function sha256(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex');
}

function walkFiles(root: string, prefix = ''): string[] {
	return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
		const path = prefix ? `${prefix}/${entry.name}` : entry.name;
		return entry.isDirectory() ? walkFiles(root, path) : [path];
	});
}

function writeFixedInventory(root: string, marker: string): void {
	for (const filename of MEADOW_ENTRY_PROOF_FILENAMES) {
		for (const path of [filename, filename.replace(/\.png$/, '.json')]) {
			const output = join(root, path);
			mkdirSync(dirname(output), { recursive: true });
			writeFileSync(output, path === 'full/base-master.json' ? marker : 'fixture');
		}
	}
}

function publicationFileSystem(
	overrides: Partial<MeadowEntryProofPublicationFileSystem> = {}
): MeadowEntryProofPublicationFileSystem {
	return {
		pathExists: async (path) => existsSync(path),
		listFiles: async (root) => walkFiles(root).sort(),
		mkdir,
		rename,
		rm,
		writeFile,
		...overrides
	};
}

function proofSidecar(input: {
	proofId: string;
	filename: string;
	png: Buffer;
	bounds?: { left: number; top: number; right: number; bottom: number };
}): Buffer {
	return Buffer.from(
		`${JSON.stringify({
			version: 1,
			proofId: input.proofId,
			path: `docs/superpowers/reports/img/hpa-399/proofs/${input.filename}`,
			sha256: sha256(input.png),
			bytes: input.png.byteLength,
			width: 1,
			height: 1,
			masterBounds: input.bounds ?? { left: 0, top: 0, right: 1, bottom: 1 },
			inputs: [{ path: 'input.bin', sha256: 'a'.repeat(64) }],
			inputSha256: ['a'.repeat(64)],
			metrics: {}
		})}\n`
	);
}

async function pixel(rgba: readonly number[]): Promise<Buffer> {
	return await encodeCanonicalMeadowEntryPng(Buffer.from(rgba), 1, 1);
}

function sidecarWith(png: Buffer, overrides: Record<string, unknown> = {}): Buffer {
	return Buffer.from(
		`${JSON.stringify({
			version: 1,
			proofId: 'test/proof',
			path: 'docs/superpowers/reports/img/hpa-399/proofs/test/proof.png',
			sha256: sha256(png),
			bytes: png.byteLength,
			width: 1,
			height: 1,
			masterBounds: { left: 0, top: 0, right: 1, bottom: 1 },
			inputs: [{ path: 'input.bin', sha256: 'a'.repeat(64) }],
			inputSha256: ['a'.repeat(64)],
			metrics: {},
			...overrides
		})}\n`
	);
}

describe('Meadow Entry proof renderer', () => {
	it('exports painted-v2 descriptors separately from the frozen HPA-399 inventory', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_PROOF_DESCRIPTORS).toHaveLength(6);
		expect(MEADOW_ENTRY_PAINTED_V2_PROOF_FILENAMES).toHaveLength(6);
		expect(MEADOW_ENTRY_PAINTED_V2_PROOF_FILENAMES.every((path) => !path.includes('hpa-399'))).toBe(
			true
		);
		expect(MEADOW_ENTRY_PROOF_DESCRIPTORS).not.toBe(MEADOW_ENTRY_PAINTED_V2_PROOF_DESCRIPTORS);
	});

	it('proves the four-layer Sundrop review-composite truth table', async () => {
		const transparent = await pixel([0, 0, 0, 0]);
		const hpaBase = await pixel([10, 20, 30, 255]);
		const sundropBase = await pixel([40, 50, 60, 255]);
		const hpaForeground = await pixel([70, 80, 90, 255]);
		const sundropForeground = await pixel([100, 110, 120, 255]);
		const composite = async (layers: {
			hpaForeground: Buffer;
			sundropBase: Buffer;
			sundropForeground: Buffer;
		}) =>
			(
				await decodeMeadowEntryRgba(
					await renderMeadowEntryReviewComposite({
						baseMasterPng: hpaBase,
						foregroundMasterPng: layers.hpaForeground,
						sundropBasePng: layers.sundropBase,
						sundropForegroundPng: layers.sundropForeground,
						sundropBounds: { left: 0, top: 0, right: 1, bottom: 1 }
					})
				)
			).data;

		expect(
			await composite({
				hpaForeground: transparent,
				sundropBase: transparent,
				sundropForeground: transparent
			})
		).toEqual(Buffer.from([10, 20, 30, 255]));
		expect(
			await composite({
				hpaForeground: transparent,
				sundropBase,
				sundropForeground: transparent
			})
		).toEqual(Buffer.from([40, 50, 60, 255]));
		expect(
			await composite({
				hpaForeground,
				sundropBase,
				sundropForeground: transparent
			})
		).toEqual(Buffer.from([70, 80, 90, 255]));
		expect(await composite({ hpaForeground, sundropBase, sundropForeground })).toEqual(
			Buffer.from([100, 110, 120, 255])
		);
	});

	it('has a unique fixed inventory covering every required proof identity', () => {
		const proofIds = MEADOW_ENTRY_PROOF_DESCRIPTORS.map(({ proofId }) => proofId);
		expect(new Set(proofIds).size).toBe(proofIds.length);
		expect(new Set(MEADOW_ENTRY_PROOF_FILENAMES).size).toBe(MEADOW_ENTRY_PROOF_FILENAMES.length);

		const required = [
			'full/base-master',
			'full/foreground-checkerboard',
			'full/immutable-sundrop-composite',
			'full/protected-live-overlay',
			'full/collision-overlay',
			'full/foreground-eligibility-overlay',
			'full/interaction-readability-overlay',
			'full/baked-coverage',
			'full/fallback-coverage',
			...MEADOW_ENTRY_APPROVED_CROPS.map(
				(crop) => `${crop.id.includes('connector') ? 'connectors' : 'regions'}/${crop.id}`
			),
			...MEADOW_ENTRY_APPROVED_OVERLAPS.map((overlap) => `overlaps/${overlap.id}`),
			...new Set(
				MEADOW_ENTRY_APPROVED_OVERLAPS.flatMap(({ cornerGroupId }) =>
					cornerGroupId ? [`corners/${cornerGroupId}`] : []
				)
			),
			...MEADOW_ENTRY_APPROVED_CROPS.flatMap((crop) =>
				(crop.edgeClamp?.sides ?? []).map((side) => `clamps/${crop.id}-${side}`)
			),
			...MEADOW_ENTRY_RUNTIME_COVERAGE.flatMap((coverage, index) =>
				coverage.mode === 'fallback-tile'
					? [`fallback-boundaries/fallback-${String(index).padStart(3, '0')}`]
					: []
			),
			...['top', 'right', 'bottom', 'left'].map((edge) => `sundrop-feather/${edge}`)
		];

		expect(proofIds).toEqual(required);
		expect(MEADOW_ENTRY_PROOF_FILENAMES).toEqual(required.map((id) => `${id}.png`));
	});

	it('renders an all-zero overlap difference for identical decoded pixels', async () => {
		const source = await encodeCanonicalMeadowEntryPng(
			Buffer.from([1, 2, 3, 255, 4, 5, 6, 128]),
			2,
			1
		);
		const difference = await renderMeadowEntryOverlapDifference(source, source);
		const decoded = await decodeMeadowEntryRgba(difference.png);

		expect(difference.differingPixels).toBe(0);
		expect(difference.maximumChannelDifference).toBe(0);
		expect(decoded.data).toEqual(Buffer.alloc(8));
	});

	it('reports exact overlap drift diagnostics', async () => {
		const first = await pixel([1, 2, 3, 255]);
		const second = await pixel([1, 9, 3, 255]);
		const difference = await renderMeadowEntryOverlapDifference(first, second);

		expect(difference).toMatchObject({
			differingPixels: 1,
			maximumChannelDifference: 7,
			firstDifference: { x: 0, y: 0, channel: 1, first: 2, second: 9 }
		});
	});

	it('rejects any output outside the fixed proof allowlist', () => {
		expect(() => assertAllowedMeadowEntryProofDestination('regions/crossroads.png')).not.toThrow();
		expect(() => assertAllowedMeadowEntryProofDestination('regions/crossroads.json')).not.toThrow();
		expect(() => assertAllowedMeadowEntryProofDestination('../hpa-398/proof.png')).toThrow(
			/unexpected Meadow Entry proof destination/
		);
		expect(() => assertAllowedMeadowEntryProofDestination('full/unreviewed.png')).toThrow(
			/unexpected Meadow Entry proof destination/
		);
	});

	it('restores the previous proof inventory after an interrupted installation', async () => {
		const api = await proofToolApi();
		const root = mkdtempSync(join(tmpdir(), 'gliese-proof-publish-'));
		const target = join(root, 'docs/superpowers/reports/img/hpa-399/proofs');
		const staging = join(root, 'docs/superpowers/reports/img/hpa-399/.proofs-staging-test');
		writeFixedInventory(target, 'previous');
		writeFixedInventory(staging, 'replacement');
		const phases: string[] = [];
		try {
			await expect(
				api.publishMeadowEntryProofInventory({
					repositoryRoot: root,
					stagingRoot: staging,
					token: 'test',
					onPhase: (phase) => phases.push(phase),
					fileSystem: publicationFileSystem({
						rename: async (from, to) => {
							if (from === staging && to === target) throw new Error('interrupted install');
							await rename(from, to);
						}
					})
				})
			).rejects.toThrow(/interrupted install/);
			expect(readFileSync(join(target, 'full/base-master.json'), 'utf8')).toBe('previous');
			expect(
				existsSync(
					join(root, 'docs/superpowers/reports/img/hpa-399/.meadow-entry-proof-publication.lock')
				)
			).toBe(false);
			expect(phases).toContain('rollback-backup-restored');
			expect(phases.at(-1)).toBe('rollback-sentinel-removed');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('retains the sentinel when rollback cannot remove the installed target', async () => {
		const api = await proofToolApi();
		const root = mkdtempSync(join(tmpdir(), 'gliese-proof-remove-failure-'));
		const target = join(root, 'docs/superpowers/reports/img/hpa-399/proofs');
		const sentinel = join(
			root,
			'docs/superpowers/reports/img/hpa-399/.meadow-entry-proof-publication.lock'
		);
		const staging = join(root, 'docs/superpowers/reports/img/hpa-399/.proofs-staging-test');
		writeFixedInventory(target, 'previous');
		writeFixedInventory(staging, 'replacement');
		let commitRemovalFailed = false;
		try {
			await expect(
				api.publishMeadowEntryProofInventory({
					repositoryRoot: root,
					stagingRoot: staging,
					token: 'test',
					fileSystem: publicationFileSystem({
						rm: async (path, options) => {
							if (path === sentinel && !commitRemovalFailed) {
								commitRemovalFailed = true;
								throw new Error('commit removal failed');
							}
							if (path === target) throw new Error('target removal failed');
							await rm(path, options);
						}
					})
				})
			).rejects.toThrow(/rollback failed closed.*target removal failed/);
			expect(existsSync(sentinel)).toBe(true);
			expect(readFileSync(join(target, 'full/base-master.json'), 'utf8')).toBe('replacement');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('retains the sentinel when rollback cannot restore the backup', async () => {
		const api = await proofToolApi();
		const root = mkdtempSync(join(tmpdir(), 'gliese-proof-restore-failure-'));
		const target = join(root, 'docs/superpowers/reports/img/hpa-399/proofs');
		const sentinel = join(
			root,
			'docs/superpowers/reports/img/hpa-399/.meadow-entry-proof-publication.lock'
		);
		const staging = join(root, 'docs/superpowers/reports/img/hpa-399/.proofs-staging-test');
		const backup = `${target}.test.rollback`;
		writeFixedInventory(target, 'previous');
		writeFixedInventory(staging, 'replacement');
		let commitRemovalFailed = false;
		try {
			await expect(
				api.publishMeadowEntryProofInventory({
					repositoryRoot: root,
					stagingRoot: staging,
					token: 'test',
					fileSystem: publicationFileSystem({
						rm: async (path, options) => {
							if (path === sentinel && !commitRemovalFailed) {
								commitRemovalFailed = true;
								throw new Error('commit removal failed');
							}
							await rm(path, options);
						},
						rename: async (from, to) => {
							if (from === backup && to === target) throw new Error('backup restore failed');
							await rename(from, to);
						}
					})
				})
			).rejects.toThrow(/rollback failed closed.*backup restore failed/);
			expect(existsSync(sentinel)).toBe(true);
			expect(existsSync(target)).toBe(false);
			expect(existsSync(backup)).toBe(true);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('retries a reader that spans a complete proof writer window', async () => {
		const api = await proofToolApi();
		const oldPng = await pixel([1, 2, 3, 255]);
		const newPng = await pixel([4, 5, 6, 255]);
		const descriptor = {
			proofId: 'test/proof',
			filename: 'test/proof.png',
			masterBounds: { left: 0, top: 0, right: 1, bottom: 1 }
		};
		const oldSidecar = proofSidecar({ ...descriptor, png: oldPng });
		const newSidecar = proofSidecar({ ...descriptor, png: newPng });
		let generation: 'old' | 'new' = 'old';
		const fileSystem: MeadowEntryProofSnapshotFileSystem = {
			pathExists: async () => false,
			listFiles: async () => ['test/proof.json', 'test/proof.png'],
			readFile: async (path) => {
				if (path.endsWith('.png')) {
					const value = generation === 'old' ? oldPng : newPng;
					generation = 'new';
					return value;
				}
				return generation === 'old' ? oldSidecar : newSidecar;
			}
		};

		const snapshot = await api.readPublishedMeadowEntryProofSnapshot('/repo', {
			attempts: 2,
			retryDelayMs: 0,
			fileSystem,
			descriptors: [descriptor],
			expectedInputPaths: () => ['input.bin']
		});
		expect(snapshot.attemptsUsed).toBe(2);
		expect(snapshot.proofs[0]!.png).toEqual(newPng);
		expect(snapshot.proofs[0]!.sidecar.sha256).toBe(sha256(newPng));
	});

	it('retries when the writer sentinel appears after the proof read', async () => {
		const api = await proofToolApi();
		const png = await pixel([1, 2, 3, 255]);
		const descriptor = {
			proofId: 'test/proof',
			filename: 'test/proof.png',
			masterBounds: { left: 0, top: 0, right: 1, bottom: 1 }
		};
		const sidecar = proofSidecar({ ...descriptor, png });
		let sentinelCheck = 0;
		const snapshot = await api.readPublishedMeadowEntryProofSnapshot('/repo', {
			attempts: 2,
			retryDelayMs: 0,
			fileSystem: {
				pathExists: async () => {
					sentinelCheck += 1;
					return sentinelCheck === 2;
				},
				listFiles: async () => ['test/proof.json', 'test/proof.png'],
				readFile: async (path) => (path.endsWith('.png') ? png : sidecar)
			},
			descriptors: [descriptor],
			expectedInputPaths: () => ['input.bin']
		});
		expect(snapshot.attemptsUsed).toBe(2);
	});

	it('rejects a matching PNG and sidecar whose dimensions disagree with master bounds', async () => {
		const api = await proofToolApi();
		const png = await pixel([1, 2, 3, 255]);
		const descriptor = {
			proofId: 'test/proof',
			filename: 'test/proof.png',
			masterBounds: { left: 0, top: 0, right: 2, bottom: 1 }
		};
		const sidecar = proofSidecar({ ...descriptor, png });
		await expect(
			api.readPublishedMeadowEntryProofSnapshot('/repo', {
				attempts: 1,
				fileSystem: {
					pathExists: async () => false,
					listFiles: async () => ['test/proof.json', 'test/proof.png'],
					readFile: async (path) => (path.endsWith('.png') ? png : sidecar)
				},
				descriptors: [descriptor],
				expectedInputPaths: () => ['input.bin']
			})
		).rejects.toThrow(/dimensions do not match master bounds/);
	});

	it('rejects mismatched base and foreground master dimensions in the review composite', async () => {
		const base = await pixel([10, 20, 30, 255]);
		const foreground = await encodeCanonicalMeadowEntryPng(
			Buffer.from([70, 80, 90, 255, 100, 110, 120, 255]),
			2,
			1
		);
		await expect(
			renderMeadowEntryReviewComposite({
				baseMasterPng: base,
				foregroundMasterPng: foreground,
				sundropBasePng: await pixel([40, 50, 60, 255]),
				sundropForegroundPng: await pixel([100, 110, 120, 255]),
				sundropBounds: { left: 0, top: 0, right: 1, bottom: 1 }
			})
		).rejects.toThrow(/master dimensions differ/);
	});

	it('rejects sundrop planes that do not match their approved master bounds', async () => {
		const base = await encodeCanonicalMeadowEntryPng(
			Buffer.from([10, 20, 30, 255, 10, 20, 30, 255]),
			2,
			1
		);
		const foreground = await encodeCanonicalMeadowEntryPng(
			Buffer.from([70, 80, 90, 255, 70, 80, 90, 255]),
			2,
			1
		);
		const sundropBase = await encodeCanonicalMeadowEntryPng(
			Buffer.from([40, 50, 60, 255, 40, 50, 60, 255]),
			2,
			1
		);
		const sundropForeground = await pixel([100, 110, 120, 255]);
		await expect(
			renderMeadowEntryReviewComposite({
				baseMasterPng: base,
				foregroundMasterPng: foreground,
				sundropBasePng: sundropBase,
				sundropForegroundPng: sundropForeground,
				sundropBounds: { left: 0, top: 0, right: 1, bottom: 1 }
			})
		).rejects.toThrow(/do not match their approved master bounds/);
	});

	it('rejects overlap inputs with different dimensions', async () => {
		const first = await pixel([1, 2, 3, 255]);
		const second = await encodeCanonicalMeadowEntryPng(
			Buffer.from([4, 5, 6, 255, 7, 8, 9, 255]),
			2,
			1
		);
		await expect(renderMeadowEntryOverlapDifference(first, second)).rejects.toThrow(
			/overlap dimensions differ/
		);
	});

	it('rejects a proof sidecar that is not valid JSON', async () => {
		const api = await proofToolApi();
		const png = await pixel([1, 2, 3, 255]);
		const descriptor = {
			proofId: 'test/proof',
			filename: 'test/proof.png',
			masterBounds: { left: 0, top: 0, right: 1, bottom: 1 }
		};
		await expect(
			api.readPublishedMeadowEntryProofSnapshot('/repo', {
				attempts: 1,
				fileSystem: {
					pathExists: async () => false,
					listFiles: async () => ['test/proof.json', 'test/proof.png'],
					readFile: async (path) => (path.endsWith('.png') ? png : Buffer.from('not json\n'))
				},
				descriptors: [descriptor],
				expectedInputPaths: () => ['input.bin']
			})
		).rejects.toThrow(/malformed/);
	});

	it('rejects a proof sidecar with unexpected fields', async () => {
		const api = await proofToolApi();
		const png = await pixel([1, 2, 3, 255]);
		const descriptor = {
			proofId: 'test/proof',
			filename: 'test/proof.png',
			masterBounds: { left: 0, top: 0, right: 1, bottom: 1 }
		};
		await expect(
			api.readPublishedMeadowEntryProofSnapshot('/repo', {
				attempts: 1,
				fileSystem: {
					pathExists: async () => false,
					listFiles: async () => ['test/proof.json', 'test/proof.png'],
					readFile: async (path) =>
						path.endsWith('.png') ? png : sidecarWith(png, { extra: true })
				},
				descriptors: [descriptor],
				expectedInputPaths: () => ['input.bin']
			})
		).rejects.toThrow(/unexpected fields/);
	});

	it('rejects a proof sidecar with malformed structured fields', async () => {
		const api = await proofToolApi();
		const png = await pixel([1, 2, 3, 255]);
		const descriptor = {
			proofId: 'test/proof',
			filename: 'test/proof.png',
			masterBounds: { left: 0, top: 0, right: 1, bottom: 1 }
		};
		await expect(
			api.readPublishedMeadowEntryProofSnapshot('/repo', {
				attempts: 1,
				fileSystem: {
					pathExists: async () => false,
					listFiles: async () => ['test/proof.json', 'test/proof.png'],
					readFile: async (path) =>
						path.endsWith('.png') ? png : sidecarWith(png, { inputs: 'notarray' })
				},
				descriptors: [descriptor],
				expectedInputPaths: () => ['input.bin']
			})
		).rejects.toThrow(/malformed structured fields/);
	});

	it('rejects a sidecar whose proofId does not bind its PNG/input identity', async () => {
		const api = await proofToolApi();
		const png = await pixel([1, 2, 3, 255]);
		const descriptor = {
			proofId: 'test/proof',
			filename: 'test/proof.png',
			masterBounds: { left: 0, top: 0, right: 1, bottom: 1 }
		};
		await expect(
			api.readPublishedMeadowEntryProofSnapshot('/repo', {
				attempts: 1,
				fileSystem: {
					pathExists: async () => false,
					listFiles: async () => ['test/proof.json', 'test/proof.png'],
					readFile: async (path) =>
						path.endsWith('.png') ? png : sidecarWith(png, { proofId: 'test/wrong' })
				},
				descriptors: [descriptor],
				expectedInputPaths: () => ['input.bin']
			})
		).rejects.toThrow(/does not bind its PNG\/input identity/);
	});

	it('rejects a sidecar whose sha256 does not bind its PNG identity', async () => {
		const api = await proofToolApi();
		const png = await pixel([1, 2, 3, 255]);
		const descriptor = {
			proofId: 'test/proof',
			filename: 'test/proof.png',
			masterBounds: { left: 0, top: 0, right: 1, bottom: 1 }
		};
		await expect(
			api.readPublishedMeadowEntryProofSnapshot('/repo', {
				attempts: 1,
				fileSystem: {
					pathExists: async () => false,
					listFiles: async () => ['test/proof.json', 'test/proof.png'],
					readFile: async (path) =>
						path.endsWith('.png') ? png : sidecarWith(png, { sha256: 'b'.repeat(64) })
				},
				descriptors: [descriptor],
				expectedInputPaths: () => ['input.bin']
			})
		).rejects.toThrow(/does not bind/);
	});

	it('rejects a sidecar with duplicate input identities', async () => {
		const api = await proofToolApi();
		const png = await pixel([1, 2, 3, 255]);
		const descriptor = {
			proofId: 'test/proof',
			filename: 'test/proof.png',
			masterBounds: { left: 0, top: 0, right: 1, bottom: 1 }
		};
		const inputSha = 'a'.repeat(64);
		await expect(
			api.readPublishedMeadowEntryProofSnapshot('/repo', {
				attempts: 1,
				fileSystem: {
					pathExists: async () => false,
					listFiles: async () => ['test/proof.json', 'test/proof.png'],
					readFile: async (path) =>
						path.endsWith('.png')
							? png
							: sidecarWith(png, {
									inputs: [
										{ path: 'input.bin', sha256: inputSha },
										{ path: 'input.bin', sha256: inputSha }
									],
									inputSha256: [inputSha, inputSha]
								})
				},
				descriptors: [descriptor],
				expectedInputPaths: () => ['input.bin', 'input.bin']
			})
		).rejects.toThrow(/duplicate input identities/);
	});

	it('rejects a sidecar with an invalid input identity', async () => {
		const api = await proofToolApi();
		const png = await pixel([1, 2, 3, 255]);
		const descriptor = {
			proofId: 'test/proof',
			filename: 'test/proof.png',
			masterBounds: { left: 0, top: 0, right: 1, bottom: 1 }
		};
		await expect(
			api.readPublishedMeadowEntryProofSnapshot('/repo', {
				attempts: 1,
				fileSystem: {
					pathExists: async () => false,
					listFiles: async () => ['test/proof.json', 'test/proof.png'],
					readFile: async (path) =>
						path.endsWith('.png')
							? png
							: sidecarWith(png, {
									inputs: [{ path: '/input.bin', sha256: 'a'.repeat(64) }],
									inputSha256: ['a'.repeat(64)]
								})
				},
				descriptors: [descriptor],
				expectedInputPaths: () => ['/input.bin']
			})
		).rejects.toThrow(/invalid input identity/);
	});

	it('publishes a fresh proof inventory with no prior target', async () => {
		const api = await proofToolApi();
		const root = mkdtempSync(join(tmpdir(), 'gliese-proof-fresh-'));
		const target = join(root, 'docs/superpowers/reports/img/hpa-399/proofs');
		const staging = join(root, 'docs/superpowers/reports/img/hpa-399/.proofs-staging-test');
		writeFixedInventory(staging, 'replacement');
		const phases: string[] = [];
		try {
			await api.publishMeadowEntryProofInventory({
				repositoryRoot: root,
				stagingRoot: staging,
				token: 'test',
				onPhase: (phase) => phases.push(phase)
			});
			expect(phases).toContain('sentinel-written');
			expect(phases).toContain('replacement-installed');
			expect(phases).toContain('replacement-validated');
			expect(phases).toContain('sentinel-removed');
			expect(phases).not.toContain('previous-backed-up');
			expect(readFileSync(join(target, 'full/base-master.json'), 'utf8')).toBe('replacement');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('publishes a replacement proof inventory and backs up the previous target', async () => {
		const api = await proofToolApi();
		const root = mkdtempSync(join(tmpdir(), 'gliese-proof-replace-'));
		const target = join(root, 'docs/superpowers/reports/img/hpa-399/proofs');
		const staging = join(root, 'docs/superpowers/reports/img/hpa-399/.proofs-staging-test');
		writeFixedInventory(target, 'previous');
		writeFixedInventory(staging, 'replacement');
		const phases: string[] = [];
		try {
			await api.publishMeadowEntryProofInventory({
				repositoryRoot: root,
				stagingRoot: staging,
				token: 'test',
				onPhase: (phase) => phases.push(phase)
			});
			expect(phases).toContain('previous-backed-up');
			expect(readFileSync(join(target, 'full/base-master.json'), 'utf8')).toBe('replacement');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('rejects a staging inventory that does not match the fixed proof set', async () => {
		const api = await proofToolApi();
		const root = mkdtempSync(join(tmpdir(), 'gliese-proof-bad-staging-'));
		const staging = join(root, 'docs/superpowers/reports/img/hpa-399/.proofs-staging-test');
		mkdirSync(staging, { recursive: true });
		writeFileSync(join(staging, 'only-one.png'), 'fixture');
		const phases: string[] = [];
		try {
			await expect(
				api.publishMeadowEntryProofInventory({
					repositoryRoot: root,
					stagingRoot: staging,
					token: 'test',
					onPhase: (phase) => phases.push(phase)
				})
			).rejects.toThrow(/inventory differs/);
			expect(phases).not.toContain('sentinel-written');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it('exhausts all attempts when the publication sentinel persists', async () => {
		const api = await proofToolApi();
		await expect(
			api.readPublishedMeadowEntryProofSnapshot('/repo', {
				attempts: 3,
				retryDelayMs: 0,
				fileSystem: {
					pathExists: async () => true,
					listFiles: async () => [],
					readFile: async () => Buffer.alloc(0)
				},
				descriptors: [],
				expectedInputPaths: () => []
			})
		).rejects.toThrow(/publication is in progress/);
	});

	it('rejects a non-positive attempts parameter', async () => {
		const api = await proofToolApi();
		await expect(
			api.readPublishedMeadowEntryProofSnapshot('/repo', { attempts: 0 })
		).rejects.toThrow(/attempts must be positive/);
		await expect(
			api.readPublishedMeadowEntryProofSnapshot('/repo', { attempts: -1 })
		).rejects.toThrow(/attempts must be positive/);
	});

	it('rejects a negative retry delay', async () => {
		const api = await proofToolApi();
		await expect(
			api.readPublishedMeadowEntryProofSnapshot('/repo', { retryDelayMs: -1 })
		).rejects.toThrow(/retry delay must be non-negative/);
	});

	it('succeeds on the first attempt when no sentinel and proofs are valid', async () => {
		const api = await proofToolApi();
		const png = await pixel([1, 2, 3, 255]);
		const descriptor = {
			proofId: 'test/proof',
			filename: 'test/proof.png',
			masterBounds: { left: 0, top: 0, right: 1, bottom: 1 }
		};
		const sidecar = proofSidecar({ ...descriptor, png });
		const snapshot = await api.readPublishedMeadowEntryProofSnapshot('/repo', {
			attempts: 3,
			retryDelayMs: 0,
			fileSystem: {
				pathExists: async () => false,
				listFiles: async () => ['test/proof.json', 'test/proof.png'],
				readFile: async (path) => (path.endsWith('.png') ? png : sidecar)
			},
			descriptors: [descriptor],
			expectedInputPaths: () => ['input.bin']
		});
		expect(snapshot.attemptsUsed).toBe(1);
		expect(snapshot.proofs).toHaveLength(1);
	});
});

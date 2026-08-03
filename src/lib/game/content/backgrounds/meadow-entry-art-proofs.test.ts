import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	MEADOW_ENTRY_APPROVED_CROPS,
	MEADOW_ENTRY_APPROVED_OVERLAPS,
	MEADOW_ENTRY_RUNTIME_COVERAGE
} from './meadow-entry-crop-manifest';
import {
	MEADOW_ENTRY_PROOF_DESCRIPTORS,
	MEADOW_ENTRY_PROOF_FILENAMES,
	type MeadowEntryProofDescriptor
} from './meadow-entry-proof-renderer';
import { encodeCanonicalMeadowEntryPng } from './meadow-entry-png';
import {
	assertExactProofInventory,
	assertInventoryEquals,
	boundsEqual,
	boundarySvg,
	checkerboardSvg,
	cornerGroupSvg,
	expectedProofInventory,
	expectedProofInventoryFor,
	expectedProofInputPaths,
	parseProofSidecar,
	proofExportPath,
	publishMeadowEntryProofInventory,
	readPublishedMeadowEntryProofSnapshot,
	type MeadowEntryProofPublicationFileSystem,
	type MeadowEntryProofPublicationPhase,
	type MeadowEntryProofSidecar,
	type MeadowEntryProofSnapshotFileSystem
} from '../../../../../tools/render-meadow-entry-art-proofs';

const BASE_MASTER = 'artifacts/meadow-entry/hpa-399/masters/meadow-entry-base-master.png';
const FOREGROUND_MASTER =
	'artifacts/meadow-entry/hpa-399/masters/meadow-entry-foreground-master.png';
const SUNDROP_BASE = 'public/game/assets/regions/sundrop-village-base.png';
const SUNDROP_FOREGROUND = 'public/game/assets/regions/sundrop-village-foreground.png';
const EXPORT_ROOT = 'artifacts/meadow-entry/hpa-399/exports';
const CROP_MANIFEST = 'artifacts/meadow-entry/hpa-399/provenance/meadow-entry-crop-manifest.json';
const CONTROL_ROOT = 'docs/superpowers/reports/img/hpa-399/controls';
const INTERACTION_MASKS = [
	`${CONTROL_ROOT}/meadow-entry-semantic-anchor-mask.svg`,
	`${CONTROL_ROOT}/meadow-entry-entrance-transition-mask.svg`,
	`${CONTROL_ROOT}/meadow-entry-reward-discovery-mask.svg`
];
const FULL_MASKS: Record<string, string> = {
	'full/protected-live-overlay': `${CONTROL_ROOT}/meadow-entry-protected-live-mask.svg`,
	'full/collision-overlay': `${CONTROL_ROOT}/meadow-entry-collision-mask.svg`,
	'full/foreground-eligibility-overlay': `${CONTROL_ROOT}/meadow-entry-foreground-eligible-mask.svg`,
	'full/baked-coverage': `${CONTROL_ROOT}/meadow-entry-runtime-base-coverage-mask.svg`,
	'full/fallback-coverage': `${CONTROL_ROOT}/meadow-entry-runtime-fallback-coverage-mask.svg`
};
const PROOF_ROOT = 'docs/superpowers/reports/img/hpa-399/proofs';
const PROOF_SENTINEL = 'docs/superpowers/reports/img/hpa-399/.meadow-entry-proof-publication.lock';

const fourLayers = [BASE_MASTER, SUNDROP_BASE, FOREGROUND_MASTER, SUNDROP_FOREGROUND];

const temporaryRoots: string[] = [];

afterEach(() => {
	for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function temporaryRoot(): string {
	const root = mkdtempSync(join(tmpdir(), 'gliese-art-proofs-'));
	temporaryRoots.push(root);
	return root;
}

function sidecarJson(overrides: Record<string, unknown> = {}): Buffer {
	return Buffer.from(
		`${JSON.stringify({
			version: 1,
			proofId: 'test/proof',
			path: 'docs/superpowers/reports/img/hpa-399/proofs/test/proof.png',
			sha256: 'a'.repeat(64),
			bytes: 1,
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

function hashBuffer(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

const fixtureDescriptor: MeadowEntryProofDescriptor = {
	proofId: 'test/proof',
	filename: 'test/proof.png',
	masterBounds: { left: 0, top: 0, right: 1, bottom: 1 }
};

async function fixtureProofPng(): Promise<Buffer> {
	const raw = Buffer.alloc(4, 0);
	return await encodeCanonicalMeadowEntryPng(raw, 1, 1);
}

function fixtureSidecar(png: Buffer, overrides: Record<string, unknown> = {}): Buffer {
	const inputPath = 'input.bin';
	const inputHash = 'a'.repeat(64);
	return Buffer.from(
		`${JSON.stringify({
			version: 1,
			proofId: fixtureDescriptor.proofId,
			path: `${PROOF_ROOT}/${fixtureDescriptor.filename}`,
			sha256: hashBuffer(png),
			bytes: png.byteLength,
			width: 1,
			height: 1,
			masterBounds: fixtureDescriptor.masterBounds,
			inputs: [{ path: inputPath, sha256: inputHash }],
			inputSha256: [inputHash],
			metrics: {},
			...overrides
		})}\n`
	);
}

describe('Meadow Entry art proof helpers', () => {
	describe('expectedProofInputPaths', () => {
		it('returns the base master only for the base-master proof', () => {
			expect(expectedProofInputPaths('full/base-master')).toEqual([BASE_MASTER]);
		});

		it('returns the foreground master only for the checkerboard proof', () => {
			expect(expectedProofInputPaths('full/foreground-checkerboard')).toEqual([FOREGROUND_MASTER]);
		});

		it('returns the four layers for the immutable sundrop composite', () => {
			expect(expectedProofInputPaths('full/immutable-sundrop-composite')).toEqual(fourLayers);
		});

		it('appends the interaction masks for the interaction overlay', () => {
			expect(expectedProofInputPaths('full/interaction-readability-overlay')).toEqual([
				...fourLayers,
				...INTERACTION_MASKS
			]);
		});

		it('appends the single mask for each full mask overlay', () => {
			for (const [proofId, maskPath] of Object.entries(FULL_MASKS)) {
				expect(expectedProofInputPaths(proofId)).toEqual([...fourLayers, maskPath]);
			}
		});

		it('returns the base export path for a crop with no foreground', () => {
			const crop = MEADOW_ENTRY_APPROVED_CROPS.find(
				({ foregroundFilename }) => foregroundFilename === null
			)!;
			const category = crop.id.includes('connector') ? 'connectors' : 'regions';
			expect(expectedProofInputPaths(`${category}/${crop.id}`)).toEqual([
				`${EXPORT_ROOT}/${crop.baseFilename}`
			]);
		});

		it('returns base and foreground export paths for a crop with a foreground', () => {
			const crop = MEADOW_ENTRY_APPROVED_CROPS.find(
				({ foregroundFilename }) => foregroundFilename !== null
			)!;
			const category = crop.id.includes('connector') ? 'connectors' : 'regions';
			expect(expectedProofInputPaths(`${category}/${crop.id}`)).toEqual([
				`${EXPORT_ROOT}/${crop.baseFilename}`,
				`${EXPORT_ROOT}/${crop.foregroundFilename}`
			]);
		});

		it('returns two base paths for a base-only overlap', () => {
			const overlap = MEADOW_ENTRY_APPROVED_OVERLAPS.find(
				({ planePolicy }) => planePolicy === 'base-only'
			)!;
			expect(expectedProofInputPaths(`overlaps/${overlap.id}`)).toEqual([
				`${EXPORT_ROOT}/${overlap.firstCropId}-base.png`,
				`${EXPORT_ROOT}/${overlap.secondCropId}-base.png`
			]);
		});

		it('returns four paths for a base-and-foreground overlap', () => {
			const overlap = MEADOW_ENTRY_APPROVED_OVERLAPS.find(
				({ planePolicy }) => planePolicy === 'base-and-foreground'
			)!;
			expect(expectedProofInputPaths(`overlaps/${overlap.id}`)).toEqual([
				`${EXPORT_ROOT}/${overlap.firstCropId}-base.png`,
				`${EXPORT_ROOT}/${overlap.secondCropId}-base.png`,
				`${EXPORT_ROOT}/${overlap.firstCropId}-foreground.png`,
				`${EXPORT_ROOT}/${overlap.secondCropId}-foreground.png`
			]);
		});

		it('returns base master and crop manifest for fallback boundaries', () => {
			const fallbackIndex = MEADOW_ENTRY_RUNTIME_COVERAGE.findIndex(
				({ mode }) => mode === 'fallback-tile'
			);
			expect(fallbackIndex).toBeGreaterThanOrEqual(0);
			expect(
				expectedProofInputPaths(
					`fallback-boundaries/fallback-${String(fallbackIndex).padStart(3, '0')}`
				)
			).toEqual([BASE_MASTER, CROP_MANIFEST]);
		});

		it('returns four layers and crop manifest for corner proofs', () => {
			const cornerGroupId = MEADOW_ENTRY_APPROVED_OVERLAPS.find(
				({ cornerGroupId }) => cornerGroupId !== undefined
			)!.cornerGroupId!;
			expect(expectedProofInputPaths(`corners/${cornerGroupId}`)).toEqual([
				...fourLayers,
				CROP_MANIFEST
			]);
		});

		it('returns four layers and crop manifest for clamp proofs', () => {
			const crop = MEADOW_ENTRY_APPROVED_CROPS.find(({ edgeClamp }) => edgeClamp !== null)!;
			const side = crop.edgeClamp!.sides[0]!;
			expect(expectedProofInputPaths(`clamps/${crop.id}-${side}`)).toEqual([
				...fourLayers,
				CROP_MANIFEST
			]);
		});

		it('returns four layers and crop manifest for sundrop-feather proofs', () => {
			expect(expectedProofInputPaths('sundrop-feather/top')).toEqual([
				...fourLayers,
				CROP_MANIFEST
			]);
		});

		it('throws for an unknown proof identity', () => {
			expect(() => expectedProofInputPaths('unknown/proof')).toThrow(
				/Unknown Meadow Entry proof identity/
			);
		});

		it('throws for an unknown crop proof', () => {
			expect(() => expectedProofInputPaths('regions/no-such-crop')).toThrow(
				/Unknown Meadow Entry crop proof/
			);
		});

		it('throws for an unknown overlap proof', () => {
			expect(() => expectedProofInputPaths('overlaps/no-such-overlap')).toThrow(
				/Unknown Meadow Entry overlap proof/
			);
		});
	});

	describe('proofExportPath', () => {
		it('returns the base export path', () => {
			const crop = MEADOW_ENTRY_APPROVED_CROPS[0]!;
			expect(proofExportPath(crop.id, 'base')).toBe(`${EXPORT_ROOT}/${crop.baseFilename}`);
		});

		it('returns the foreground export path', () => {
			const crop = MEADOW_ENTRY_APPROVED_CROPS.find(
				({ foregroundFilename }) => foregroundFilename !== null
			)!;
			expect(proofExportPath(crop.id, 'foreground')).toBe(
				`${EXPORT_ROOT}/${crop.foregroundFilename}`
			);
		});

		it('throws for an unknown crop id', () => {
			expect(() => proofExportPath('no-such-crop', 'base')).toThrow(
				/Unknown Meadow Entry proof crop/
			);
		});

		it('throws when the foreground plane is missing', () => {
			const crop = MEADOW_ENTRY_APPROVED_CROPS.find(
				({ foregroundFilename }) => foregroundFilename === null
			)!;
			expect(() => proofExportPath(crop.id, 'foreground')).toThrow(
				/Missing Meadow Entry proof foreground crop/
			);
		});
	});

	describe('boundsEqual', () => {
		const bounds = { left: 1, top: 2, right: 3, bottom: 4 };
		it('returns true for identical bounds', () => {
			expect(boundsEqual(bounds, { ...bounds })).toBe(true);
		});

		it('returns false when any edge differs', () => {
			expect(boundsEqual(bounds, { ...bounds, left: 0 })).toBe(false);
			expect(boundsEqual(bounds, { ...bounds, top: 0 })).toBe(false);
			expect(boundsEqual(bounds, { ...bounds, right: 0 })).toBe(false);
			expect(boundsEqual(bounds, { ...bounds, bottom: 0 })).toBe(false);
		});
	});

	describe('inventory helpers', () => {
		it('expectedProofInventory pairs every png with a json sidecar', () => {
			const inventory = expectedProofInventory();
			expect(inventory).toHaveLength(MEADOW_ENTRY_PROOF_FILENAMES.length * 2);
			expect(new Set(inventory).size).toBe(inventory.length);
			for (const filename of MEADOW_ENTRY_PROOF_FILENAMES) {
				expect(inventory).toContain(filename);
				expect(inventory).toContain(filename.replace(/\.png$/, '.json'));
			}
		});

		it('expectedProofInventoryFor scopes to the provided descriptors', () => {
			const subset = MEADOW_ENTRY_PROOF_DESCRIPTORS.slice(0, 3);
			const inventory = expectedProofInventoryFor(subset);
			expect(inventory).toHaveLength(6);
			for (const { filename } of subset) {
				expect(inventory).toContain(filename);
				expect(inventory).toContain(filename.replace(/\.png$/, '.json'));
			}
		});

		it('assertInventoryEquals accepts a matching inventory', () => {
			const inventory = expectedProofInventory();
			expect(() => assertInventoryEquals(inventory, [...inventory])).not.toThrow();
		});

		it('assertInventoryEquals rejects a drifted inventory', () => {
			expect(() => assertInventoryEquals(['a.png', 'a.json'], ['b.png', 'b.json'])).toThrow(
				/inventory differs/
			);
		});
	});

	describe('assertExactProofInventory', () => {
		it('passes when the listed files match the fixed inventory', async () => {
			const inventory = expectedProofInventory();
			const fileSystem: Pick<MeadowEntryProofPublicationFileSystem, 'listFiles'> = {
				listFiles: async () => [...inventory]
			};
			await expect(assertExactProofInventory('/root', fileSystem)).resolves.toBeUndefined();
		});

		it('rejects an inventory that drifts from the fixed set', async () => {
			const fileSystem: Pick<MeadowEntryProofPublicationFileSystem, 'listFiles'> = {
				listFiles: async () => ['only-one.png', 'only-one.json']
			};
			await expect(assertExactProofInventory('/root', fileSystem)).rejects.toThrow(
				/inventory differs/
			);
		});

		it('walks a real temporary tree and validates it against the fixed inventory', async () => {
			const root = temporaryRoot();
			const proofRoot = join(root, 'docs/superpowers/reports/img/hpa-399/proofs');
			for (const filename of MEADOW_ENTRY_PROOF_FILENAMES) {
				for (const path of [filename, filename.replace(/\.png$/, '.json')]) {
					const output = join(proofRoot, path);
					mkdirSync(join(output, '..'), { recursive: true });
					writeFileSync(output, 'fixture');
				}
			}
			await expect(assertExactProofInventory(proofRoot)).resolves.toBeUndefined();
		});
	});

	describe('parseProofSidecar', () => {
		it('parses a canonical sidecar', () => {
			const bytes = sidecarJson();
			const sidecar = parseProofSidecar(bytes, 'test/proof.json') as MeadowEntryProofSidecar;
			expect(sidecar.version).toBe(1);
			expect(sidecar.proofId).toBe('test/proof');
			expect(sidecar.inputs).toHaveLength(1);
		});

		it('rejects malformed JSON', () => {
			expect(() => parseProofSidecar(Buffer.from('not json\n'), 'x.json')).toThrow(/malformed/);
		});

		it('rejects a non-object payload', () => {
			expect(() => parseProofSidecar(Buffer.from('[]\n'), 'x.json')).toThrow(/Malformed/);
			expect(() => parseProofSidecar(Buffer.from('null\n'), 'x.json')).toThrow(/Malformed/);
		});

		it('rejects unexpected fields', () => {
			expect(() => parseProofSidecar(sidecarJson({ extra: true }), 'x.json')).toThrow(
				/unexpected fields/
			);
		});

		it('rejects malformed structured fields', () => {
			expect(() => parseProofSidecar(sidecarJson({ inputs: 'not-array' }), 'x.json')).toThrow(
				/malformed structured fields/
			);
		});
	});

	describe('SVG generators', () => {
		it('checkerboardSvg embeds the requested dimensions and pattern', () => {
			const svg = checkerboardSvg(128, 64).toString('utf8');
			expect(svg).toContain('width="128"');
			expect(svg).toContain('height="64"');
			expect(svg).toContain('pattern id="checker"');
		});

		it('boundarySvg draws all four sides by default', () => {
			const svg = boundarySvg(100, 50).toString('utf8');
			expect(svg).toContain('width="100"');
			expect(svg).toContain('height="50"');
			expect(svg).toContain('fill="#ff2b2b"');
			expect(svg.match(/<rect/g)?.length).toBe(4);
		});

		it('boundarySvg draws only the requested sides', () => {
			const svg = boundarySvg(100, 50, ['top', 'left']).toString('utf8');
			expect(svg).toContain('y="0" width="100"');
			expect(svg).toContain('x="0" y="0" width="8" height="50"');
			expect(svg).toContain('x="0" y="0" width="8" height="50"');
			expect(svg.match(/<rect/g)?.length).toBe(2);
		});

		it('boundarySvg clamps the right edge to a non-negative x', () => {
			const svg = boundarySvg(4, 50, ['right']).toString('utf8');
			expect(svg).toContain('x="0"');
		});

		it('boundarySvg clamps the bottom edge to a non-negative y', () => {
			const svg = boundarySvg(100, 4, ['bottom']).toString('utf8');
			expect(svg).toContain('y="0"');
		});

		it('cornerGroupSvg renders an overlay group per overlap', () => {
			const overlaps = MEADOW_ENTRY_APPROVED_OVERLAPS.filter(
				({ cornerGroupId }) => cornerGroupId !== undefined
			).slice(0, 2);
			const masterBounds = {
				left: overlaps[0]!.bounds.left,
				top: overlaps[0]!.bounds.top,
				right: overlaps[0]!.bounds.right,
				bottom: overlaps[0]!.bounds.bottom
			};
			const svg = cornerGroupSvg(masterBounds, overlaps).toString('utf8');
			expect(svg).toContain('data-overlap-id');
			expect(svg).toContain('stroke="#ff2b2b"');
			expect(svg).toContain('fill="#20b8ff"');
			expect(svg.match(/data-overlap-id/g)?.length).toBe(overlaps.length);
		});

		it('cornerGroupSvg renders an empty group when no overlaps are provided', () => {
			const svg = cornerGroupSvg({ left: 0, top: 0, right: 10, bottom: 10 }, []).toString('utf8');
			expect(svg).toContain('<svg');
			expect(svg).not.toContain('data-overlap-id');
		});
	});

	describe('publishMeadowEntryProofInventory', () => {
		function publicationFileSystem(
			overrides: Partial<MeadowEntryProofPublicationFileSystem> = {}
		): MeadowEntryProofPublicationFileSystem {
			const inventory = expectedProofInventory();
			const files = new Map<string, Buffer>();
			const directories = new Set<string>();
			return {
				pathExists: async (path: string) => files.has(path) || directories.has(path),
				listFiles: async () => [...inventory],
				mkdir: vi.fn(async () => undefined),
				rename: vi.fn(async (oldPath: string, newPath: string) => {
					const data = files.get(oldPath);
					if (data !== undefined) {
						files.delete(oldPath);
						files.set(newPath, data);
					} else if (directories.has(oldPath)) {
						directories.delete(oldPath);
						directories.add(newPath);
					}
				}),
				rm: vi.fn(async (path: string) => {
					files.delete(path);
					directories.delete(path);
				}),
				writeFile: vi.fn(async (path: string) => {
					files.set(path, Buffer.from(''));
				}),
				...overrides
			};
		}

		it('installs a fresh staging tree when no target exists', async () => {
			const root = temporaryRoot();
			const stagingRoot = join(root, 'staging');
			const target = join(root, PROOF_ROOT);
			const phases: MeadowEntryProofPublicationPhase[] = [];
			const fs = publicationFileSystem();
			await publishMeadowEntryProofInventory({
				repositoryRoot: root,
				stagingRoot,
				token: 'token-a',
				fileSystem: fs,
				onPhase: (phase) => phases.push(phase)
			});
			expect(phases).toEqual([
				'sentinel-written',
				'replacement-installed',
				'replacement-validated',
				'sentinel-removed'
			]);
			expect(fs.rename).toHaveBeenCalledWith(stagingRoot, target);
		});

		it('backs up and replaces an existing target', async () => {
			const root = temporaryRoot();
			const stagingRoot = join(root, 'staging');
			const target = join(root, PROOF_ROOT);
			const backup = `${target}.token-b.rollback`;
			const phases: MeadowEntryProofPublicationPhase[] = [];
			const fs = publicationFileSystem({
				pathExists: async (path: string) => path === target
			});
			await publishMeadowEntryProofInventory({
				repositoryRoot: root,
				stagingRoot,
				token: 'token-b',
				fileSystem: fs,
				onPhase: (phase) => phases.push(phase)
			});
			expect(phases).toEqual([
				'sentinel-written',
				'previous-backed-up',
				'replacement-installed',
				'replacement-validated',
				'sentinel-removed'
			]);
			expect(fs.rename).toHaveBeenCalledWith(target, backup);
			expect(fs.rename).toHaveBeenCalledWith(stagingRoot, target);
		});

		it('rolls back when the install rename fails and restores the backup', async () => {
			const root = temporaryRoot();
			const stagingRoot = join(root, 'staging');
			const target = join(root, PROOF_ROOT);
			const phases: MeadowEntryProofPublicationPhase[] = [];
			const fs = publicationFileSystem({
				pathExists: async (path: string) => path === target,
				rename: vi.fn(async (oldPath: string, newPath: string) => {
					if (oldPath === stagingRoot && newPath === target) {
						throw new Error('install-rename-failed');
					}
				})
			});
			await expect(
				publishMeadowEntryProofInventory({
					repositoryRoot: root,
					stagingRoot,
					token: 'token-c',
					fileSystem: fs,
					onPhase: (phase) => phases.push(phase)
				})
			).rejects.toThrow(/install-rename-failed/);
			expect(phases).toContain('sentinel-written');
			expect(phases).toContain('previous-backed-up');
			expect(phases).toContain('rollback-backup-restored');
			expect(phases).toContain('rollback-sentinel-removed');
		});

		it('rolls back when sentinel removal fails after a successful install', async () => {
			const root = temporaryRoot();
			const stagingRoot = join(root, 'staging');
			const phases: MeadowEntryProofPublicationPhase[] = [];
			const fs = publicationFileSystem({
				rm: vi.fn(async (path: string) => {
					if (path === join(root, PROOF_SENTINEL)) {
						throw new Error('sentinel-rm-failed');
					}
				})
			});
			await expect(
				publishMeadowEntryProofInventory({
					repositoryRoot: root,
					stagingRoot,
					token: 'token-d',
					fileSystem: fs,
					onPhase: (phase) => phases.push(phase)
				})
			).rejects.toThrow(/sentinel-rm-failed/);
			expect(phases).toContain('replacement-validated');
		});

		it('throws when the staging inventory does not match', async () => {
			const root = temporaryRoot();
			const stagingRoot = join(root, 'staging');
			const fs = publicationFileSystem({
				listFiles: async () => ['only-one.png', 'only-one.json']
			});
			await expect(
				publishMeadowEntryProofInventory({
					repositoryRoot: root,
					stagingRoot,
					token: 'token-e',
					fileSystem: fs
				})
			).rejects.toThrow(/inventory differs/);
		});

		it('throws when the existing target inventory does not match', async () => {
			const root = temporaryRoot();
			const stagingRoot = join(root, 'staging');
			const target = join(root, PROOF_ROOT);
			let listCall = 0;
			const fs = publicationFileSystem({
				pathExists: async (path: string) => path === target,
				listFiles: async () => {
					listCall += 1;
					return listCall === 1 ? expectedProofInventory() : ['drift.png', 'drift.json'];
				}
			});
			await expect(
				publishMeadowEntryProofInventory({
					repositoryRoot: root,
					stagingRoot,
					token: 'token-f',
					fileSystem: fs
				})
			).rejects.toThrow(/inventory differs/);
		});

		it('rolls back and reports failure when the target cannot be removed during rollback', async () => {
			const root = temporaryRoot();
			const stagingRoot = join(root, 'staging');
			const target = join(root, PROOF_ROOT);
			const phases: MeadowEntryProofPublicationPhase[] = [];
			let listCall = 0;
			const fs = publicationFileSystem({
				pathExists: async (path: string) => path === target,
				listFiles: async () => {
					listCall += 1;
					if (listCall <= 2) return [...expectedProofInventory()];
					return ['drift.png', 'drift.json'];
				},
				rm: vi.fn(async (path: string) => {
					if (path === target) {
						throw new Error('target-rm-failed');
					}
				})
			});
			await expect(
				publishMeadowEntryProofInventory({
					repositoryRoot: root,
					stagingRoot,
					token: 'token-g',
					fileSystem: fs,
					onPhase: (phase) => phases.push(phase)
				})
			).rejects.toThrow(/rollback failed closed/);
			expect(phases).toContain('replacement-installed');
			expect(phases).toContain('rollback-failed');
		});

		it('rolls back and reports failure when restoring the backup fails', async () => {
			const root = temporaryRoot();
			const stagingRoot = join(root, 'staging');
			const target = join(root, PROOF_ROOT);
			const phases: MeadowEntryProofPublicationPhase[] = [];
			let listCall = 0;
			const fs = publicationFileSystem({
				pathExists: async (path: string) => path === target,
				listFiles: async () => {
					listCall += 1;
					if (listCall <= 2) return [...expectedProofInventory()];
					return ['drift.png', 'drift.json'];
				},
				rename: vi.fn(async (oldPath: string, newPath: string) => {
					if (oldPath === `${target}.token-h.rollback` && newPath === target) {
						throw new Error('backup-restore-failed');
					}
				})
			});
			await expect(
				publishMeadowEntryProofInventory({
					repositoryRoot: root,
					stagingRoot,
					token: 'token-h',
					fileSystem: fs,
					onPhase: (phase) => phases.push(phase)
				})
			).rejects.toThrow(/rollback failed closed/);
			expect(phases).toContain('rollback-target-removed');
			expect(phases).toContain('rollback-failed');
		});
	});

	describe('readPublishedMeadowEntryProofSnapshot', () => {
		function snapshotFileSystem(
			descriptors: readonly MeadowEntryProofDescriptor[] = MEADOW_ENTRY_PROOF_DESCRIPTORS,
			overrides: Partial<MeadowEntryProofSnapshotFileSystem> = {}
		): MeadowEntryProofSnapshotFileSystem {
			return {
				pathExists: async () => false,
				listFiles: async () => [...expectedProofInventoryFor(descriptors)],
				readFile: async () => Buffer.from(''),
				...overrides
			};
		}

		it('throws when the writer sentinel is present on every attempt', async () => {
			const root = temporaryRoot();
			const sentinel = join(root, PROOF_SENTINEL);
			const fs = snapshotFileSystem(undefined, {
				pathExists: async (path: string) => path === sentinel
			});
			await expect(
				readPublishedMeadowEntryProofSnapshot(root, {
					attempts: 2,
					retryDelayMs: 0,
					fileSystem: fs
				})
			).rejects.toThrow(/publication is in progress/);
		});

		it('throws when the proof inventory does not match', async () => {
			const root = temporaryRoot();
			const fs = snapshotFileSystem(undefined, {
				listFiles: async () => ['drift.png', 'drift.json']
			});
			await expect(
				readPublishedMeadowEntryProofSnapshot(root, {
					attempts: 1,
					retryDelayMs: 0,
					fileSystem: fs
				})
			).rejects.toThrow(/inventory differs/);
		});

		it('throws when a sidecar is invalid JSON', async () => {
			const root = temporaryRoot();
			const fs = snapshotFileSystem(undefined, {
				readFile: async (path: string) => {
					if (path.endsWith('.json')) return Buffer.from('not-json');
					return Buffer.from('');
				}
			});
			await expect(
				readPublishedMeadowEntryProofSnapshot(root, {
					attempts: 1,
					retryDelayMs: 0,
					fileSystem: fs
				})
			).rejects.toThrow(/malformed/);
		});

		it('throws when the sidecar version drifts', async () => {
			const root = temporaryRoot();
			const png = await fixtureProofPng();
			const sidecar = fixtureSidecar(png, { version: 2 });
			const fs = snapshotFileSystem([fixtureDescriptor], {
				readFile: async (path: string) => {
					if (path.endsWith('.json')) return sidecar;
					return png;
				}
			});
			await expect(
				readPublishedMeadowEntryProofSnapshot(root, {
					attempts: 1,
					retryDelayMs: 0,
					fileSystem: fs,
					descriptors: [fixtureDescriptor],
					expectedInputPaths: () => ['input.bin']
				})
			).rejects.toThrow(/does not bind its PNG/);
		});

		it('throws when the sidecar proofId does not match the descriptor', async () => {
			const root = temporaryRoot();
			const png = await fixtureProofPng();
			const sidecar = fixtureSidecar(png, { proofId: 'wrong/proof' });
			const fs = snapshotFileSystem([fixtureDescriptor], {
				readFile: async (path: string) => {
					if (path.endsWith('.json')) return sidecar;
					return png;
				}
			});
			await expect(
				readPublishedMeadowEntryProofSnapshot(root, {
					attempts: 1,
					retryDelayMs: 0,
					fileSystem: fs,
					descriptors: [fixtureDescriptor],
					expectedInputPaths: () => ['input.bin']
				})
			).rejects.toThrow(/does not bind its PNG/);
		});

		it('throws when the sidecar is missing required fields', async () => {
			const root = temporaryRoot();
			const descriptor = MEADOW_ENTRY_PROOF_DESCRIPTORS[0]!;
			const fs = snapshotFileSystem([descriptor], {
				readFile: async (path: string) => {
					if (path.endsWith('.json')) {
						const sidecar = JSON.parse(sidecarJson().toString('utf8'));
						delete sidecar.sha256;
						return Buffer.from(JSON.stringify(sidecar));
					}
					return Buffer.from('');
				}
			});
			await expect(
				readPublishedMeadowEntryProofSnapshot(root, {
					attempts: 1,
					retryDelayMs: 0,
					fileSystem: fs,
					descriptors: [descriptor]
				})
			).rejects.toThrow(/unexpected fields/);
		});

		it('throws when the sidecar bytes drift between reads', async () => {
			const root = temporaryRoot();
			const png = await fixtureProofPng();
			const fs = snapshotFileSystem([fixtureDescriptor], {
				readFile: async (path: string) => {
					if (path.endsWith('.json')) {
						return fixtureSidecar(png, { sha256: 'b'.repeat(64) });
					}
					return png;
				}
			});
			await expect(
				readPublishedMeadowEntryProofSnapshot(root, {
					attempts: 1,
					retryDelayMs: 0,
					fileSystem: fs,
					descriptors: [fixtureDescriptor],
					expectedInputPaths: () => ['input.bin']
				})
			).rejects.toThrow();
		});

		it('throws when the publication sentinel appears during the read', async () => {
			const root = temporaryRoot();
			const sentinel = join(root, PROOF_SENTINEL);
			const png = await fixtureProofPng();
			const sidecar = fixtureSidecar(png);
			let sentinelAppeared = false;
			const fs = snapshotFileSystem([fixtureDescriptor], {
				pathExists: async (path: string) => {
					if (path === sentinel && sentinelAppeared) return true;
					return false;
				},
				readFile: async (path: string) => {
					if (path.endsWith('.json')) {
						sentinelAppeared = true;
						return sidecar;
					}
					return png;
				}
			});
			await expect(
				readPublishedMeadowEntryProofSnapshot(root, {
					attempts: 1,
					retryDelayMs: 0,
					fileSystem: fs,
					descriptors: [fixtureDescriptor],
					expectedInputPaths: () => ['input.bin']
				})
			).rejects.toThrow();
		});

		it('rethrows a non-Error thrown value as a generic Error', async () => {
			const root = temporaryRoot();
			const fs = snapshotFileSystem(undefined, {
				listFiles: async () => {
					throw 'string-error';
				}
			});
			await expect(
				readPublishedMeadowEntryProofSnapshot(root, {
					attempts: 1,
					retryDelayMs: 0,
					fileSystem: fs
				})
			).rejects.toThrow(/unavailable/);
		});

		it('rejects non-positive attempt counts', async () => {
			const root = temporaryRoot();
			await expect(
				readPublishedMeadowEntryProofSnapshot(root, {
					attempts: 0,
					retryDelayMs: 0,
					fileSystem: snapshotFileSystem()
				})
			).rejects.toThrow(/attempts must be positive/);
		});

		it('rejects negative retry delays', async () => {
			const root = temporaryRoot();
			await expect(
				readPublishedMeadowEntryProofSnapshot(root, {
					attempts: 1,
					retryDelayMs: -1,
					fileSystem: snapshotFileSystem()
				})
			).rejects.toThrow(/retry delay must be non-negative/);
		});
	});
});

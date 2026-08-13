import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	MEADOW_ENTRY_APPROVED_CROPS,
	MEADOW_ENTRY_APPROVED_OVERLAPS,
	MEADOW_ENTRY_RUNTIME_COVERAGE
} from './meadow-entry-crop-manifest';
import {
	MEADOW_ENTRY_PAINTED_V2_PROOF_DESCRIPTORS,
	MEADOW_ENTRY_PAINTED_V2_PROOF_FILENAMES,
	MEADOW_ENTRY_PROOF_DESCRIPTORS,
	MEADOW_ENTRY_PROOF_FILENAMES
} from './meadow-entry-proof-renderer';
import {
	assertExactProofInventory,
	assertInventoryEquals,
	boundsEqual,
	boundarySvg,
	checkMeadowEntryPaintedV2Proofs,
	checkerboardSvg,
	cornerGroupSvg,
	expectedProofInventory,
	expectedProofInventoryFor,
	expectedProofInputPaths,
	MEADOW_ENTRY_PAINTED_V2_PROOF_ROOT,
	paintedV2ProofInputPaths,
	parseProofSidecar,
	proofExportPath,
	expectedPaintedV2ProofInventory,
	parseMeadowEntryArtProofArguments,
	renderMeadowEntryArtProofs,
	type MeadowEntryProofPublicationFileSystem,
	type MeadowEntryProofSidecar
} from '../../../../../tools/render-meadow-entry-art-proofs';
import { MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS } from './meadow-entry-painted-v2-pilot';

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

const fourLayers = [BASE_MASTER, SUNDROP_BASE, FOREGROUND_MASTER, SUNDROP_FOREGROUND];

const temporaryRoots: string[] = [];

afterEach(() => {
	vi.restoreAllMocks();
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

describe('Meadow Entry art proof helpers', () => {
	it('keeps the active painted-v2 proof inventory to the ten approved IDs', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_PROOF_DESCRIPTORS.map(({ proofId }) => proofId)).toEqual([
			'pilot-camera-envelope',
			'pilot-underlay-sundrop-seam',
			'pilot-underlay-crossroads-seam',
			'pilot-underlay-family-handoff',
			'pilot-detail-panel-handoffs',
			'pilot-base-coverage',
			'pilot-master-transparency',
			'pilot-runtime-overlap',
			'pilot-protected-live',
			'pilot-ownership'
		]);
		expect(MEADOW_ENTRY_PAINTED_V2_PROOF_FILENAMES).toEqual(
			MEADOW_ENTRY_PAINTED_V2_PROOF_DESCRIPTORS.map(({ filename }) => filename)
		);
		expect(expectedPaintedV2ProofInventory()).toEqual(
			MEADOW_ENTRY_PAINTED_V2_PROOF_FILENAMES.flatMap((filename) => [
				filename,
				filename.replace(/\.png$/, '.json')
			]).sort()
		);
		expect(expectedPaintedV2ProofInventory().some((path) => path.includes('hpa-399'))).toBe(false);
		expect(MEADOW_ENTRY_PAINTED_V2_PROOF_ROOT).toBe('artifacts/meadow-entry/painted-v2/proofs');
		expect(paintedV2ProofInputPaths('pilot-master-transparency')).not.toEqual(
			expect.arrayContaining([
				'public/game/assets/regions/sundrop-village-base.png',
				'public/game/assets/regions/sundrop-village-foreground.png'
			])
		);
	});

	it('binds every painted-v2 proof sidecar to the current master, controls, crop manifest, and source panels', () => {
		const universalPaths = [
			'artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png',
			'artifacts/meadow-entry/painted-v2/controls/meadow-entry-control-manifest.json',
			'artifacts/meadow-entry/painted-v2/provenance/meadow-entry-crop-manifest.json',
			...MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.map(({ normalizedPath }) => normalizedPath)
		];
		const expectedHashes = new Map(
			universalPaths.map((path) => [
				path,
				createHash('sha256').update(readFileSync(path)).digest('hex')
			])
		);
		for (const { proofId, filename } of MEADOW_ENTRY_PAINTED_V2_PROOF_DESCRIPTORS) {
			const sidecar = JSON.parse(
				readFileSync(
					join(MEADOW_ENTRY_PAINTED_V2_PROOF_ROOT, filename.replace(/\.png$/, '.json')),
					'utf8'
				)
			) as { inputs: readonly { path: string; sha256: string }[] };
			expect(sidecar.inputs, proofId).toEqual(
				expect.arrayContaining(
					universalPaths.map((path) => ({ path, sha256: expectedHashes.get(path) }))
				)
			);
		}
	});

	it('checks a matching painted-v2 proof snapshot without writes and rejects stale bytes', async () => {
		const root = temporaryRoot();
		const files = Object.fromEntries(
			expectedPaintedV2ProofInventory().map((path) => [path, Buffer.from(`fixture:${path}`)])
		);
		for (const [path, bytes] of Object.entries(files)) {
			const output = join(root, MEADOW_ENTRY_PAINTED_V2_PROOF_ROOT, path);
			mkdirSync(join(output, '..'), { recursive: true });
			writeFileSync(output, bytes);
		}
		const expected = { files, inventorySha256: 'fixture' };
		const successMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		let successReads = 0;
		const checkFileSystem = {
			...successMutators,
			pathExists: async (path: string) => existsSync(path),
			listFiles: async () => expectedPaintedV2ProofInventory(),
			readFile: async (path: string) => {
				successReads += 1;
				return readFileSync(path);
			}
		};
		await expect(
			checkMeadowEntryPaintedV2Proofs(root, expected, { fileSystem: checkFileSystem })
		).resolves.toBeUndefined();
		expect(successReads).toBeGreaterThan(0);
		expect(Object.values(successMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
		const before = Object.fromEntries(
			expectedPaintedV2ProofInventory().map((path) => [
				path,
				readFileSync(join(root, MEADOW_ENTRY_PAINTED_V2_PROOF_ROOT, path)).toString()
			])
		);
		expect(before).toEqual(
			Object.fromEntries(expectedPaintedV2ProofInventory().map((path) => [path, `fixture:${path}`]))
		);
		writeFileSync(
			join(root, MEADOW_ENTRY_PAINTED_V2_PROOF_ROOT, MEADOW_ENTRY_PAINTED_V2_PROOF_FILENAMES[0]!),
			Buffer.from('stale')
		);
		const staleMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		let staleReads = 0;
		const staleCheckFileSystem = {
			...staleMutators,
			pathExists: async (path: string) => existsSync(path),
			listFiles: async () => expectedPaintedV2ProofInventory(),
			readFile: async (path: string) => {
				staleReads += 1;
				return readFileSync(path);
			}
		};
		await expect(
			checkMeadowEntryPaintedV2Proofs(root, expected, { fileSystem: staleCheckFileSystem })
		).rejects.toThrow(/stale|drift/i);
		expect(staleReads).toBeGreaterThan(0);
		expect(Object.values(staleMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
	});

	it('runs the parsed --check proof command with zero filesystem mutations on matching and stale snapshots', async () => {
		const root = temporaryRoot();
		const files = Object.fromEntries(
			expectedPaintedV2ProofInventory().map((path) => [path, Buffer.from(`fixture:${path}`)])
		);
		for (const [path, bytes] of Object.entries(files)) {
			const output = join(root, MEADOW_ENTRY_PAINTED_V2_PROOF_ROOT, path);
			mkdirSync(join(output, '..'), { recursive: true });
			writeFileSync(output, bytes);
		}
		const expected = { files, inventorySha256: 'fixture' };
		const parsed = parseMeadowEntryArtProofArguments(['--check']);
		expect(parsed.check).toBe(true);
		const successMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		let successReads = 0;
		const successFileSystem = {
			...successMutators,
			pathExists: async (path: string) => existsSync(path),
			listFiles: async () => expectedPaintedV2ProofInventory(),
			readFile: async (path: string) => {
				successReads += 1;
				return readFileSync(path);
			}
		};
		await expect(
			renderMeadowEntryArtProofs(root, {
				...parsed,
				packageBytes: expected,
				fileSystem: successFileSystem
			})
		).resolves.toMatchObject({ proofCount: 10 });
		expect(successReads).toBeGreaterThan(0);
		expect(Object.values(successMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);

		writeFileSync(
			join(root, MEADOW_ENTRY_PAINTED_V2_PROOF_ROOT, MEADOW_ENTRY_PAINTED_V2_PROOF_FILENAMES[0]!),
			Buffer.from('stale')
		);
		const staleMutators = { mkdir: vi.fn(), writeFile: vi.fn(), rename: vi.fn(), rm: vi.fn() };
		const staleFileSystem = {
			...staleMutators,
			pathExists: async (path: string) => existsSync(path),
			listFiles: async () => expectedPaintedV2ProofInventory(),
			readFile: async (path: string) => readFileSync(path)
		};
		await expect(
			renderMeadowEntryArtProofs(root, {
				...parsed,
				packageBytes: expected,
				fileSystem: staleFileSystem
			})
		).rejects.toThrow(/stale|drift/i);
		expect(Object.values(staleMutators).every((spy) => spy.mock.calls.length === 0)).toBe(true);
	});

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
			expect(svg).toContain('x="0" y="0" width="100" height="8"');
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
});

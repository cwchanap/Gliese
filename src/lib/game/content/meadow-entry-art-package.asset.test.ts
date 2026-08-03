import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
	meadowEntryArtPackageApproval,
	meadowEntryArtPackageApprovalReview
} from './approvals/meadow-entry-art-package';
import { meadowEntryControlsApproval } from './approvals/meadow-entry-controls';
import {
	MEADOW_ENTRY_APPROVED_CROPS,
	MEADOW_ENTRY_APPROVED_OVERLAPS,
	MEADOW_ENTRY_RUNTIME_COVERAGE,
	type MeadowEntryOverlap
} from './backgrounds/meadow-entry-crop-manifest';
import {
	verifyMeadowEntryOverlapPixels,
	type MeadowEntryDecodedExport
} from './backgrounds/meadow-entry-exporter';
import {
	MEADOW_ENTRY_PROOF_DESCRIPTORS,
	MEADOW_ENTRY_PROOF_FILENAMES
} from './backgrounds/meadow-entry-proof-renderer';
import { decodeMeadowEntryRgba } from './backgrounds/meadow-entry-png';
import {
	buildMeadowEntryControlInputs,
	buildMeadowEntryForegroundEligibleRasterMask,
	buildMeadowEntryProtectedForegroundRasterMask,
	computeMeadowEntryCombinedControlFingerprint
} from './backgrounds/meadow-entry-controls';

const repositoryRoot = process.cwd();
const proofRoot = 'docs/superpowers/reports/img/hpa-399/proofs';

function sha256(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex');
}

function walk(root: string, prefix = ''): string[] {
	return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
		const path = prefix ? `${prefix}/${entry.name}` : entry.name;
		return entry.isDirectory() ? walk(root, path) : [path];
	});
}

function assertExactInventory(
	expected: readonly string[],
	actual: readonly string[],
	label: string
) {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			`${label} inventory drifted: expected=${expected.join(',')} actual=${actual.join(',')}`
		);
	}
}

function assertArtifactSnapshot(
	expected: { path: string; sha256: string; bytes: number; width: number; height: number },
	actual: { path: string; sha256: string; bytes: number; width: number; height: number }
): void {
	for (const key of ['path', 'sha256', 'bytes', 'width', 'height'] as const) {
		if (expected[key] !== actual[key]) {
			throw new Error(
				`Approved Meadow Entry artifact drifted path=${expected.path} field=${key} expected=${expected[key]} actual=${actual[key]}`
			);
		}
	}
}

function assertProofDimensions(
	proofId: string,
	bounds: { left: number; top: number; right: number; bottom: number },
	width: number,
	height: number
): void {
	if (width !== bounds.right - bounds.left || height !== bounds.bottom - bounds.top) {
		throw new Error(`Approved Meadow Entry proof dimensions do not match bounds: ${proofId}`);
	}
}

function runGit(...args: string[]): string {
	const result = spawnSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' });
	if (result.status !== 0) {
		throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
	}
	return result.stdout;
}

describe('approved Meadow Entry art package', () => {
	it('binds the current controls, storage configuration, provenance, and review identity', () => {
		expect(meadowEntryArtPackageApprovalReview.reviewedBy).toBe('chanwaichan');
		expect(meadowEntryArtPackageApprovalReview.reviewedAt).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
		);
		expect(meadowEntryArtPackageApproval.combinedControlFingerprint).toBe(
			computeMeadowEntryCombinedControlFingerprint(buildMeadowEntryControlInputs(repositoryRoot))
		);
		expect(meadowEntryArtPackageApproval.combinedControlFingerprint).toBe(
			meadowEntryControlsApproval.combinedControlFingerprint
		);
		expect(meadowEntryArtPackageApproval.storageMode).toBe('git-lfs');
		expect(meadowEntryArtPackageApproval.storageConfigurationSha256).toBe(
			sha256(readFileSync(join(repositoryRoot, '.gitattributes')))
		);
		expect(meadowEntryArtPackageApproval.storageConfigurationSha256).toBe(
			meadowEntryControlsApproval.storageConfigurationSha256
		);
		expect(meadowEntryArtPackageApproval.evidencePath).toBe(
			'docs/superpowers/reports/2026-07-30-hpa-399-visual-masters-exports-validation.md'
		);
	});

	it('rehashes and decodes every approved master, export, and proof', async () => {
		for (const artifact of [
			meadowEntryArtPackageApproval.baseMaster,
			meadowEntryArtPackageApproval.foregroundMaster,
			...meadowEntryArtPackageApproval.exports,
			...meadowEntryArtPackageApproval.proofs
		]) {
			const bytes = readFileSync(join(repositoryRoot, artifact.path));
			if (
				bytes.byteLength < 130 &&
				bytes.subarray(0, 46).toString('utf8') === 'version https://git-lfs.github.com/spec/v1'
			) {
				throw new Error(
					`${artifact.path} is a Git LFS pointer; run 'git lfs pull' before running this suite`
				);
			}
			const decoded = await decodeMeadowEntryRgba(bytes);
			assertArtifactSnapshot(artifact, {
				path: artifact.path,
				sha256: sha256(bytes),
				bytes: bytes.byteLength,
				width: decoded.width,
				height: decoded.height
			});
		}
		expect(meadowEntryArtPackageApproval.proofs).toHaveLength(MEADOW_ENTRY_PROOF_FILENAMES.length);
	});

	it('has exact export and proof inventory membership with bound sidecars', () => {
		const expectedExports = MEADOW_ENTRY_APPROVED_CROPS.flatMap((crop) => [
			{
				path: `artifacts/meadow-entry/hpa-399/exports/${crop.baseFilename}`,
				cropId: crop.id,
				plane: 'base',
				textureKey: crop.textureKeys.base,
				drawOrder: crop.drawOrder
			},
			...(crop.foregroundFilename === null
				? []
				: [
						{
							path: `artifacts/meadow-entry/hpa-399/exports/${crop.foregroundFilename}`,
							cropId: crop.id,
							plane: 'foreground',
							textureKey: crop.textureKeys.foreground,
							drawOrder: crop.drawOrder
						}
					])
		]);
		expect(
			meadowEntryArtPackageApproval.exports.map(
				({ path, cropId, plane, textureKey, drawOrder }) => ({
					path,
					cropId,
					plane,
					textureKey,
					drawOrder
				})
			)
		).toEqual(expectedExports);
		expect(meadowEntryArtPackageApproval.proofs.map(({ path }) => path)).toEqual(
			MEADOW_ENTRY_PROOF_FILENAMES.map((path) => `${proofRoot}/${path}`)
		);

		const actualProofFiles = walk(join(repositoryRoot, proofRoot)).sort();
		const expectedProofFiles = MEADOW_ENTRY_PROOF_FILENAMES.flatMap((path) => [
			path,
			path.replace(/\.png$/, '.json')
		]).sort();
		assertExactInventory(expectedProofFiles, actualProofFiles, 'Proof');
		assertExactInventory(
			['meadow-entry-base-master.png', 'meadow-entry-foreground-master.png'],
			walk(join(repositoryRoot, 'artifacts/meadow-entry/hpa-399/masters')).sort(),
			'Master'
		);
		assertExactInventory(
			expectedExports
				.map(({ path }) => path.slice('artifacts/meadow-entry/hpa-399/exports/'.length))
				.sort(),
			walk(join(repositoryRoot, 'artifacts/meadow-entry/hpa-399/exports')).sort(),
			'Export'
		);
		const descriptors = new Map(
			MEADOW_ENTRY_PROOF_DESCRIPTORS.map((descriptor) => [descriptor.proofId, descriptor])
		);
		for (const proof of meadowEntryArtPackageApproval.proofs) {
			const relativePath = proof.path.slice(`${proofRoot}/`.length);
			const sidecar = JSON.parse(
				readFileSync(
					join(repositoryRoot, proofRoot, relativePath.replace(/\.png$/, '.json')),
					'utf8'
				)
			) as {
				proofId: string;
				path: string;
				sha256: string;
				bytes: number;
				width: number;
				height: number;
				inputSha256: string[];
				inputs: { path: string; sha256: string }[];
				masterBounds: unknown;
				metrics: Record<string, unknown>;
			};
			const proofId = relativePath.replace(/\.png$/, '');
			const descriptor = descriptors.get(proofId);
			expect(descriptor).toBeDefined();
			expect(sidecar.proofId).toBe(proofId);
			expect(sidecar.path).toBe(proof.path);
			expect(sidecar.sha256).toBe(proof.sha256);
			expect(sidecar.bytes).toBe(proof.bytes);
			expect(sidecar.width).toBe(proof.width);
			expect(sidecar.height).toBe(proof.height);
			expect(sidecar.inputSha256).toEqual(proof.inputSha256);
			expect(sidecar.masterBounds).toEqual(descriptor!.masterBounds);
			assertProofDimensions(proofId, descriptor!.masterBounds, proof.width, proof.height);
			assertProofDimensions(proofId, descriptor!.masterBounds, sidecar.width, sidecar.height);
			expect(sidecar.inputs.map(({ sha256: inputSha256 }) => inputSha256)).toEqual(
				sidecar.inputSha256
			);
			for (const input of sidecar.inputs) {
				expect(
					sha256(readFileSync(join(repositoryRoot, input.path))),
					`${proofId}:${input.path}`
				).toBe(input.sha256);
			}
			if (proofId.startsWith('overlaps/')) {
				const planes = sidecar.metrics.planes as Record<
					string,
					{ differingPixels: number; maximumChannelDifference: number }
				>;
				for (const metrics of Object.values(planes)) {
					expect(metrics).toEqual({ differingPixels: 0, maximumChannelDifference: 0 });
				}
			}
		}
	});

	it('independently recomputes every export overlap from decoded approved pixels', async () => {
		const crops = new Map(MEADOW_ENTRY_APPROVED_CROPS.map((crop) => [crop.id, crop]));
		const decodedExports: MeadowEntryDecodedExport[] = [];
		for (const artifact of meadowEntryArtPackageApproval.exports) {
			const crop = crops.get(artifact.cropId)!;
			const decoded = await decodeMeadowEntryRgba(
				readFileSync(join(repositoryRoot, artifact.path))
			);
			decodedExports.push({
				cropId: artifact.cropId,
				plane: artifact.plane,
				bounds: crop.bounds,
				width: decoded.width,
				height: decoded.height,
				rgba: decoded.data
			});
		}
		expect(() =>
			verifyMeadowEntryOverlapPixels({
				decoded: decodedExports,
				overlaps: MEADOW_ENTRY_APPROVED_OVERLAPS
			})
		).not.toThrow();

		const forgedBlankProofMetrics = {
			planes: { base: { differingPixels: 0, maximumChannelDifference: 0 } }
		};
		expect(forgedBlankProofMetrics.planes.base.differingPixels).toBe(0);
		const overlap = {
			id: 'forged-blank-proof',
			firstCropId: 'first',
			secondCropId: 'second',
			bounds: { left: 0, top: 0, right: 1, bottom: 1 },
			routeMouth: {
				sharedAxis: 'x',
				bounds: { left: 0, top: 0, right: 1, bottom: 1 }
			},
			minimumSharedPixels: 128,
			planePolicy: 'base-only',
			ownerCropId: 'second'
		} satisfies MeadowEntryOverlap;
		expect(() =>
			verifyMeadowEntryOverlapPixels({
				decoded: [
					{
						cropId: 'first',
						plane: 'base',
						bounds: overlap.bounds,
						width: 1,
						height: 1,
						rgba: Buffer.from([0, 0, 0, 255])
					},
					{
						cropId: 'second',
						plane: 'base',
						bounds: overlap.bounds,
						width: 1,
						height: 1,
						rgba: Buffer.from([1, 0, 0, 255])
					}
				],
				overlaps: [overlap]
			})
		).toThrow(/overlap mismatch/);
	});

	it('stores every approved PNG as a Git LFS pointer and every sidecar as ordinary Git', () => {
		const approvedPaths = [
			meadowEntryArtPackageApproval.baseMaster.path,
			meadowEntryArtPackageApproval.foregroundMaster.path,
			...meadowEntryArtPackageApproval.exports.map(({ path }) => path),
			...meadowEntryArtPackageApproval.proofs.map(({ path }) => path)
		];
		const lfsPaths = new Set(
			runGit('lfs', 'ls-files', '--name-only').trim().split('\n').filter(Boolean)
		);
		for (const path of approvedPaths) expect(lfsPaths.has(path), path).toBe(true);

		const attributes = runGit(
			'check-attr',
			'filter',
			'diff',
			'merge',
			'text',
			'--',
			...approvedPaths
		);
		for (const path of approvedPaths) {
			for (const [attribute, value] of [
				['filter', 'lfs'],
				['diff', 'lfs'],
				['merge', 'lfs'],
				['text', 'unset']
			] as const) {
				expect(attributes, `${path}:${attribute}`).toContain(`${path}: ${attribute}: ${value}`);
			}
		}
		const sidecarPath = `${proofRoot}/${MEADOW_ENTRY_PROOF_FILENAMES[0]!.replace(/\.png$/, '.json')}`;
		expect(runGit('check-attr', 'filter', '--', sidecarPath)).toContain(
			`${sidecarPath}: filter: unspecified`
		);
	});

	it('independently recomputes foreground exclusions and exact runtime coverage', async () => {
		const foreground = await decodeMeadowEntryRgba(
			readFileSync(join(repositoryRoot, meadowEntryArtPackageApproval.foregroundMaster.path))
		);
		const inputs = buildMeadowEntryControlInputs(repositoryRoot);
		const eligible = buildMeadowEntryForegroundEligibleRasterMask(inputs).alpha;
		const protectedMask = buildMeadowEntryProtectedForegroundRasterMask(inputs).alpha;
		let protectedOverlap = 0;
		let outsideEligibility = 0;
		let interactionClearanceOverlap = 0;
		for (let pixel = 0; pixel < foreground.width * foreground.height; pixel += 1) {
			if (foreground.data[pixel * 4 + 3] === 0) continue;
			if (protectedMask[pixel] !== 0) protectedOverlap += 1;
			if (eligible[pixel] === 0) outsideEligibility += 1;
		}
		for (const clearance of inputs.controlClearanceRects) {
			for (let y = clearance.bounds.top; y < clearance.bounds.bottom; y += 1) {
				for (let x = clearance.bounds.left; x < clearance.bounds.right; x += 1) {
					if (foreground.data[(y * foreground.width + x) * 4 + 3] !== 0) {
						interactionClearanceOverlap += 1;
					}
				}
			}
		}
		expect({ protectedOverlap, outsideEligibility, interactionClearanceOverlap }).toEqual({
			protectedOverlap: 0,
			outsideEligibility: 0,
			interactionClearanceOverlap: 0
		});

		const area = (bounds: { left: number; top: number; right: number; bottom: number }) =>
			(bounds.right - bounds.left) * (bounds.bottom - bounds.top);
		let overlapArea = 0;
		for (let firstIndex = 0; firstIndex < MEADOW_ENTRY_RUNTIME_COVERAGE.length; firstIndex += 1) {
			for (
				let secondIndex = firstIndex + 1;
				secondIndex < MEADOW_ENTRY_RUNTIME_COVERAGE.length;
				secondIndex += 1
			) {
				const first = MEADOW_ENTRY_RUNTIME_COVERAGE[firstIndex]!.bounds;
				const second = MEADOW_ENTRY_RUNTIME_COVERAGE[secondIndex]!.bounds;
				overlapArea +=
					Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left)) *
					Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
			}
		}
		expect(MEADOW_ENTRY_RUNTIME_COVERAGE.reduce((sum, entry) => sum + area(entry.bounds), 0)).toBe(
			6400 * 6400
		);
		expect(overlapArea).toBe(0);
	});

	it('rejects missing, extra, stale, malformed, and dimension-drifted snapshots', () => {
		expect(() => assertExactInventory(['a.png'], [], 'Test')).toThrow(/inventory drifted/);
		expect(() => assertExactInventory(['a.png'], ['a.png', 'extra.png'], 'Test')).toThrow(
			/inventory drifted/
		);
		const expected = { path: 'a.png', sha256: 'a'.repeat(64), bytes: 4, width: 1, height: 1 };
		expect(() => assertArtifactSnapshot(expected, { ...expected, sha256: 'b'.repeat(64) })).toThrow(
			/field=sha256/
		);
		expect(() => assertArtifactSnapshot(expected, { ...expected, bytes: 3 })).toThrow(
			/field=bytes/
		);
		expect(() => assertArtifactSnapshot(expected, { ...expected, width: 2 })).toThrow(
			/field=width/
		);
		expect(() =>
			assertProofDimensions('matching-forgery', { left: 0, top: 0, right: 2, bottom: 1 }, 1, 1)
		).toThrow(/dimensions do not match bounds/);
	});

	it('binds the stable manifests and overlap inventory', () => {
		expect(meadowEntryArtPackageApproval.cropManifestSha256).toBe(
			sha256(
				readFileSync(
					join(
						repositoryRoot,
						'artifacts/meadow-entry/hpa-399/provenance/meadow-entry-crop-manifest.json'
					)
				)
			)
		);
		expect(meadowEntryArtPackageApproval.masterProvenanceSha256).toBe(
			sha256(
				readFileSync(
					join(
						repositoryRoot,
						'artifacts/meadow-entry/hpa-399/provenance/meadow-entry-master-provenance.json'
					)
				)
			)
		);
		expect(meadowEntryArtPackageApproval.exportProvenanceSha256).toBe(
			sha256(
				readFileSync(
					join(
						repositoryRoot,
						'artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json'
					)
				)
			)
		);
		expect(MEADOW_ENTRY_APPROVED_OVERLAPS).toHaveLength(25);
	});
});

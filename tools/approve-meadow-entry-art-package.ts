import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { format } from 'prettier';

import { meadowEntryControlsApproval } from '$lib/game/content/approvals/meadow-entry-controls';
import {
	MEADOW_ENTRY_APPROVED_CROPS,
	MEADOW_ENTRY_APPROVED_OVERLAPS,
	MEADOW_ENTRY_RUNTIME_COVERAGE
} from '$lib/game/content/backgrounds/meadow-entry-crop-manifest';
import {
	buildMeadowEntryControlInputs,
	buildMeadowEntryForegroundEligibleRasterMask,
	buildMeadowEntryProtectedForegroundRasterMask,
	computeMeadowEntryCombinedControlFingerprint
} from '$lib/game/content/backgrounds/meadow-entry-controls';
import {
	decodeMeadowEntryRgba,
	validateCanonicalPngChunks,
	type DecodedMeadowEntryRgba
} from '$lib/game/content/backgrounds/meadow-entry-png';
import {
	verifyMeadowEntryOverlapPixels,
	type MeadowEntryDecodedExport
} from '$lib/game/content/backgrounds/meadow-entry-exporter';
import {
	readPublishedMeadowEntryProofSnapshot,
	type MeadowEntryProofSidecar
} from './render-meadow-entry-art-proofs';
import { readCoherentMeadowEntryArtSourceSnapshot } from './read-meadow-entry-art-source-snapshot';
import { verifyMeadowEntryArtStorage } from './verify-meadow-entry-art-storage';

const PACKAGE_ROOT = 'artifacts/meadow-entry/hpa-399';
const PROOF_ROOT = 'docs/superpowers/reports/img/hpa-399/proofs';
const APPROVAL_PATH = 'src/lib/game/content/approvals/meadow-entry-art-package.ts';
const BASE_MASTER = `${PACKAGE_ROOT}/masters/meadow-entry-base-master.png`;
const FOREGROUND_MASTER = `${PACKAGE_ROOT}/masters/meadow-entry-foreground-master.png`;
const CROP_MANIFEST = `${PACKAGE_ROOT}/provenance/meadow-entry-crop-manifest.json`;
const MASTER_PROVENANCE = `${PACKAGE_ROOT}/provenance/meadow-entry-master-provenance.json`;
const EXPORT_PROVENANCE = `${PACKAGE_ROOT}/provenance/meadow-entry-export-provenance.json`;
const STORAGE_CONFIGURATION = '.gitattributes';
const SUNDROP_BASE = 'public/game/assets/regions/sundrop-village-base.png';
const SUNDROP_FOREGROUND = 'public/game/assets/regions/sundrop-village-foreground.png';
const CONTROL_ROOT = 'docs/superpowers/reports/img/hpa-399/controls';
const EVIDENCE_PATH =
	'docs/superpowers/reports/2026-07-30-hpa-399-visual-masters-exports-validation.md' as const;
const SHA256 = /^[a-f0-9]{64}$/;
const REVIEWER = /^[A-Za-z0-9][A-Za-z0-9._@+ -]{0,99}$/;
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const FOUR_LAYER_INPUTS = [BASE_MASTER, SUNDROP_BASE, FOREGROUND_MASTER, SUNDROP_FOREGROUND];
const FULL_PROOF_INPUTS: Readonly<Record<string, readonly string[]>> = {
	'full/base-master': [BASE_MASTER],
	'full/foreground-checkerboard': [FOREGROUND_MASTER],
	'full/immutable-sundrop-composite': FOUR_LAYER_INPUTS,
	'full/protected-live-overlay': [
		...FOUR_LAYER_INPUTS,
		`${CONTROL_ROOT}/meadow-entry-protected-live-mask.svg`
	],
	'full/collision-overlay': [
		...FOUR_LAYER_INPUTS,
		`${CONTROL_ROOT}/meadow-entry-collision-mask.svg`
	],
	'full/foreground-eligibility-overlay': [
		...FOUR_LAYER_INPUTS,
		`${CONTROL_ROOT}/meadow-entry-foreground-eligible-mask.svg`
	],
	'full/interaction-readability-overlay': [
		...FOUR_LAYER_INPUTS,
		`${CONTROL_ROOT}/meadow-entry-semantic-anchor-mask.svg`,
		`${CONTROL_ROOT}/meadow-entry-entrance-transition-mask.svg`,
		`${CONTROL_ROOT}/meadow-entry-reward-discovery-mask.svg`
	],
	'full/baked-coverage': [
		...FOUR_LAYER_INPUTS,
		`${CONTROL_ROOT}/meadow-entry-runtime-base-coverage-mask.svg`
	],
	'full/fallback-coverage': [
		...FOUR_LAYER_INPUTS,
		`${CONTROL_ROOT}/meadow-entry-runtime-fallback-coverage-mask.svg`
	]
};

export interface ApprovedPngArtifact {
	path: string;
	sha256: string;
	bytes: number;
	width: number;
	height: number;
}

export interface MeadowEntryArtPackageApproval {
	combinedControlFingerprint: string;
	storageMode: 'git-lfs';
	storageConfigurationSha256: string;
	baseMaster: ApprovedPngArtifact;
	foregroundMaster: ApprovedPngArtifact;
	cropManifestSha256: string;
	masterProvenanceSha256: string;
	exportProvenanceSha256: string;
	exports: readonly (ApprovedPngArtifact & {
		cropId: string;
		plane: 'base' | 'foreground';
		textureKey: string;
		drawOrder: number;
	})[];
	proofs: readonly (ApprovedPngArtifact & {
		proofId: string;
		inputSha256: readonly string[];
	})[];
	evidencePath: typeof EVIDENCE_PATH;
}

interface ReviewArguments {
	reviewedBy: string;
	reviewedAt: string;
}

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function parseReviewArguments(args: readonly string[]): ReviewArguments {
	let reviewedBy: string | undefined;
	let reviewedAt: string | undefined;
	for (let index = 0; index < args.length; index += 2) {
		const flag = args[index];
		const value = args[index + 1];
		if (!value || (flag !== '--reviewed-by' && flag !== '--reviewed-at')) {
			throw new Error(
				'Usage: bun tools/approve-meadow-entry-art-package.ts --reviewed-by <reviewer> --reviewed-at <UTC-seconds>'
			);
		}
		if (flag === '--reviewed-by') reviewedBy = value;
		else reviewedAt = value;
	}
	assert(
		reviewedBy !== undefined && reviewedAt !== undefined,
		'Both review arguments are required'
	);
	assert(
		reviewedBy === reviewedBy.trim() && REVIEWER.test(reviewedBy),
		'Invalid Meadow Entry package reviewer'
	);
	assert(UTC_SECONDS.test(reviewedAt), 'Meadow Entry package review time must use UTC seconds');
	assert(
		new Date(reviewedAt).toISOString().replace('.000Z', 'Z') === reviewedAt,
		'Meadow Entry package review time is not a real UTC instant'
	);
	return { reviewedBy, reviewedAt };
}

async function inspectPngBytes(
	path: string,
	bytes: Buffer
): Promise<{ artifact: ApprovedPngArtifact; decoded: DecodedMeadowEntryRgba }> {
	validateCanonicalPngChunks(bytes);
	const decoded = await decodeMeadowEntryRgba(bytes);
	return {
		artifact: {
			path,
			sha256: sha256(bytes),
			bytes: bytes.byteLength,
			width: decoded.width,
			height: decoded.height
		},
		decoded
	};
}

function jsonEqual(first: unknown, second: unknown): boolean {
	return JSON.stringify(first) === JSON.stringify(second);
}

function exportPath(cropId: string, plane: 'base' | 'foreground'): string {
	const crop = MEADOW_ENTRY_APPROVED_CROPS.find(({ id }) => id === cropId);
	assert(crop, `Unknown Meadow Entry proof crop: ${cropId}`);
	const filename = plane === 'base' ? crop.baseFilename : crop.foregroundFilename;
	assert(filename !== null, `Meadow Entry proof names an unavailable foreground: ${cropId}`);
	return `${PACKAGE_ROOT}/exports/${filename}`;
}

function expectedProofInputPaths(proofId: string): readonly string[] {
	const full = FULL_PROOF_INPUTS[proofId];
	if (full) return full;
	if (proofId.startsWith('regions/') || proofId.startsWith('connectors/')) {
		const cropId = proofId.slice(proofId.indexOf('/') + 1);
		const crop = MEADOW_ENTRY_APPROVED_CROPS.find(({ id }) => id === cropId);
		assert(crop, `Unknown Meadow Entry crop proof: ${proofId}`);
		return [
			exportPath(cropId, 'base'),
			...(crop.foregroundFilename === null ? [] : [exportPath(cropId, 'foreground')])
		];
	}
	if (proofId.startsWith('overlaps/')) {
		const overlapId = proofId.slice('overlaps/'.length);
		const overlap = MEADOW_ENTRY_APPROVED_OVERLAPS.find(({ id }) => id === overlapId);
		assert(overlap, `Unknown Meadow Entry overlap proof: ${proofId}`);
		return [
			exportPath(overlap.firstCropId, 'base'),
			exportPath(overlap.secondCropId, 'base'),
			...(overlap.planePolicy === 'base-and-foreground'
				? [
						exportPath(overlap.firstCropId, 'foreground'),
						exportPath(overlap.secondCropId, 'foreground')
					]
				: [])
		];
	}
	if (proofId.startsWith('fallback-boundaries/')) return [BASE_MASTER, CROP_MANIFEST];
	if (
		proofId.startsWith('corners/') ||
		proofId.startsWith('clamps/') ||
		proofId.startsWith('sundrop-feather/')
	) {
		return [...FOUR_LAYER_INPUTS, CROP_MANIFEST];
	}
	throw new Error(`Unknown Meadow Entry proof identity: ${proofId}`);
}

function assertProofMetrics(sidecar: MeadowEntryProofSidecar): void {
	if (!sidecar.proofId.startsWith('overlaps/')) return;
	const overlap = MEADOW_ENTRY_APPROVED_OVERLAPS.find(
		({ id }) => `overlaps/${id}` === sidecar.proofId
	)!;
	const expectedPlanes =
		overlap.planePolicy === 'base-and-foreground' ? ['base', 'foreground'] : ['base'];
	const metrics = sidecar.metrics as { planes?: Record<string, Record<string, unknown>> };
	assert(
		metrics.planes !== undefined &&
			jsonEqual(Object.keys(metrics.planes), expectedPlanes) &&
			Object.values(metrics.planes).every(
				(value) => value.differingPixels === 0 && value.maximumChannelDifference === 0
			),
		`Meadow Entry overlap proof is non-zero or malformed: ${sidecar.proofId}`
	);
}

async function assertForegroundAndCoverageAcceptance(
	foregroundPng: Buffer,
	controlInputs: ReturnType<typeof buildMeadowEntryControlInputs>
): Promise<void> {
	const foreground = await decodeMeadowEntryRgba(foregroundPng);
	const eligible = buildMeadowEntryForegroundEligibleRasterMask(controlInputs).alpha;
	const protectedMask = buildMeadowEntryProtectedForegroundRasterMask(controlInputs).alpha;
	for (let pixel = 0; pixel < foreground.width * foreground.height; pixel += 1) {
		if (foreground.data[pixel * 4 + 3] === 0) continue;
		assert(eligible[pixel] !== 0, `Meadow Entry foreground leaves eligibility at pixel=${pixel}`);
		assert(
			protectedMask[pixel] === 0,
			`Meadow Entry foreground overlaps protected-live art at pixel=${pixel}`
		);
	}
	for (const clearance of controlInputs.controlClearanceRects) {
		for (let y = clearance.bounds.top; y < clearance.bounds.bottom; y += 1) {
			for (let x = clearance.bounds.left; x < clearance.bounds.right; x += 1) {
				assert(
					foreground.data[(y * foreground.width + x) * 4 + 3] === 0,
					`Meadow Entry foreground obscures interaction clearance id=${clearance.id} master=${x},${y}`
				);
			}
		}
	}
	const area = (bounds: { left: number; top: number; right: number; bottom: number }) =>
		(bounds.right - bounds.left) * (bounds.bottom - bounds.top);
	assert(
		MEADOW_ENTRY_RUNTIME_COVERAGE.reduce((sum, entry) => sum + area(entry.bounds), 0) ===
			6400 * 6400,
		'Meadow Entry runtime coverage has unexplained area'
	);
	for (let firstIndex = 0; firstIndex < MEADOW_ENTRY_RUNTIME_COVERAGE.length; firstIndex += 1) {
		for (
			let secondIndex = firstIndex + 1;
			secondIndex < MEADOW_ENTRY_RUNTIME_COVERAGE.length;
			secondIndex += 1
		) {
			const first = MEADOW_ENTRY_RUNTIME_COVERAGE[firstIndex]!.bounds;
			const second = MEADOW_ENTRY_RUNTIME_COVERAGE[secondIndex]!.bounds;
			const overlap =
				Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left)) *
				Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
			assert(
				overlap === 0,
				`Meadow Entry runtime coverage overlaps at ${firstIndex}/${secondIndex}`
			);
		}
	}
}

async function buildApproval(repositoryRoot: string): Promise<MeadowEntryArtPackageApproval> {
	const sourceSnapshot = await readCoherentMeadowEntryArtSourceSnapshot(
		join(repositoryRoot, PACKAGE_ROOT)
	);
	const packageInputs = new Map<string, Buffer>([
		[BASE_MASTER, sourceSnapshot.basePng],
		[FOREGROUND_MASTER, sourceSnapshot.foregroundPng],
		[MASTER_PROVENANCE, sourceSnapshot.provenanceJson],
		[EXPORT_PROVENANCE, sourceSnapshot.exports.provenanceJson],
		[CROP_MANIFEST, sourceSnapshot.exports.cropManifestJson],
		...Object.entries(sourceSnapshot.exports.files).map(
			([filename, bytes]) => [`${PACKAGE_ROOT}/exports/${filename}`, bytes] as const
		)
	]);
	const controlInputs = buildMeadowEntryControlInputs(repositoryRoot);
	const currentFingerprint = computeMeadowEntryCombinedControlFingerprint(controlInputs);
	assert(
		currentFingerprint === meadowEntryControlsApproval.combinedControlFingerprint,
		'Meadow Entry approved control fingerprint has drifted'
	);
	const storageConfiguration = await readFile(join(repositoryRoot, STORAGE_CONFIGURATION));
	assert(
		sha256(storageConfiguration) === meadowEntryControlsApproval.storageConfigurationSha256,
		'Meadow Entry approved storage configuration has drifted'
	);

	const [baseMaster, foregroundMaster] = await Promise.all([
		inspectPngBytes(BASE_MASTER, sourceSnapshot.basePng).then(({ artifact }) => artifact),
		inspectPngBytes(FOREGROUND_MASTER, sourceSnapshot.foregroundPng).then(
			({ artifact }) => artifact
		)
	]);
	assert(
		baseMaster.width === 6400 &&
			baseMaster.height === 6400 &&
			foregroundMaster.width === 6400 &&
			foregroundMaster.height === 6400,
		'Meadow Entry approved master dimensions have drifted'
	);
	await assertForegroundAndCoverageAcceptance(sourceSnapshot.foregroundPng, controlInputs);

	const [masterProvenance, exportProvenance, cropManifest] = [
		JSON.parse(sourceSnapshot.provenanceJson.toString('utf8')) as Record<string, unknown>,
		JSON.parse(sourceSnapshot.exports.provenanceJson.toString('utf8')) as Record<string, unknown>,
		JSON.parse(sourceSnapshot.exports.cropManifestJson.toString('utf8')) as Record<string, unknown>
	];
	const masterControls = masterProvenance.controls as Record<string, unknown> | undefined;
	const masterBase = masterProvenance.base as Record<string, unknown> | undefined;
	const masterForeground = masterProvenance.foreground as Record<string, unknown> | undefined;
	assert(
		masterControls?.fingerprint === currentFingerprint &&
			masterControls.storageConfigurationSha256 ===
				meadowEntryControlsApproval.storageConfigurationSha256 &&
			masterBase?.sha256 === baseMaster.sha256 &&
			masterForeground?.sha256 === foregroundMaster.sha256,
		'Meadow Entry master provenance does not bind the approved package'
	);
	const exportControls = exportProvenance.controls as Record<string, unknown> | undefined;
	const exportMasters = exportProvenance.masters as
		| Record<string, Record<string, unknown>>
		| undefined;
	assert(
		exportControls?.fingerprint === currentFingerprint &&
			exportMasters?.base?.sha256 === baseMaster.sha256 &&
			exportMasters?.foreground?.sha256 === foregroundMaster.sha256,
		'Meadow Entry export provenance does not bind the approved package'
	);
	assert(
		cropManifest.controlFingerprint === currentFingerprint &&
			jsonEqual(cropManifest.crops, MEADOW_ENTRY_APPROVED_CROPS) &&
			jsonEqual(cropManifest.overlaps, MEADOW_ENTRY_APPROVED_OVERLAPS) &&
			jsonEqual(cropManifest.runtimeCoverage, MEADOW_ENTRY_RUNTIME_COVERAGE),
		'Meadow Entry stable crop manifest has drifted'
	);

	const exports = [] as Array<
		ApprovedPngArtifact & {
			cropId: string;
			plane: 'base' | 'foreground';
			textureKey: string;
			drawOrder: number;
		}
	>;
	const decodedExports: MeadowEntryDecodedExport[] = [];
	for (const crop of MEADOW_ENTRY_APPROVED_CROPS) {
		for (const plane of (crop.foregroundFilename === null
			? ['base']
			: ['base', 'foreground']) as readonly ('base' | 'foreground')[]) {
			const filename = plane === 'base' ? crop.baseFilename : crop.foregroundFilename!;
			const path = `${PACKAGE_ROOT}/exports/${filename}`;
			const bytes = packageInputs.get(path);
			assert(bytes, `Meadow Entry coherent export snapshot is missing ${filename}`);
			const { artifact, decoded } = await inspectPngBytes(path, bytes);
			assert(
				artifact.width === crop.expectedDimensions.width &&
					artifact.height === crop.expectedDimensions.height,
				`Meadow Entry export dimensions drifted crop=${crop.id} plane=${plane}`
			);
			exports.push({
				...artifact,
				cropId: crop.id,
				plane,
				textureKey: plane === 'base' ? crop.textureKeys.base : crop.textureKeys.foreground!,
				drawOrder: crop.drawOrder
			});
			decodedExports.push({
				cropId: crop.id,
				plane,
				bounds: crop.bounds,
				width: decoded.width,
				height: decoded.height,
				rgba: decoded.data
			});
		}
	}
	verifyMeadowEntryOverlapPixels({
		decoded: decodedExports,
		overlaps: MEADOW_ENTRY_APPROVED_OVERLAPS
	});
	const provenanceInventory = exportProvenance.inventory as readonly Record<string, unknown>[];
	assert(
		Array.isArray(provenanceInventory) && provenanceInventory.length === exports.length,
		'Meadow Entry export provenance inventory is malformed'
	);
	for (let index = 0; index < exports.length; index += 1) {
		const artifact = exports[index]!;
		const inventory = provenanceInventory[index]!;
		assert(
			inventory.cropId === artifact.cropId &&
				inventory.plane === artifact.plane &&
				inventory.filename === artifact.path.slice(`${PACKAGE_ROOT}/exports/`.length) &&
				inventory.textureKey === artifact.textureKey &&
				inventory.drawOrder === artifact.drawOrder &&
				inventory.sha256 === artifact.sha256 &&
				inventory.bytes === artifact.bytes &&
				inventory.width === artifact.width &&
				inventory.height === artifact.height,
			`Meadow Entry export provenance inventory drifted at index ${index}`
		);
	}

	const proofSnapshot = await readPublishedMeadowEntryProofSnapshot(repositoryRoot);
	const proofs = [] as Array<
		ApprovedPngArtifact & { proofId: string; inputSha256: readonly string[] }
	>;
	for (const published of proofSnapshot.proofs) {
		const { descriptor, sidecar } = published;
		const { artifact } = await inspectPngBytes(
			`${PROOF_ROOT}/${descriptor.filename}`,
			published.png
		);
		const sidecarPath = descriptor.filename.replace(/\.png$/, '.json');
		const expectedWidth = descriptor.masterBounds.right - descriptor.masterBounds.left;
		const expectedHeight = descriptor.masterBounds.bottom - descriptor.masterBounds.top;
		assert(
			jsonEqual(Object.keys(sidecar).sort(), [
				'bytes',
				'height',
				'inputSha256',
				'inputs',
				'masterBounds',
				'metrics',
				'path',
				'proofId',
				'sha256',
				'version',
				'width'
			]) &&
				sidecar.version === 1 &&
				sidecar.proofId === descriptor.proofId &&
				sidecar.path === artifact.path &&
				sidecar.sha256 === artifact.sha256 &&
				sidecar.bytes === artifact.bytes &&
				sidecar.width === artifact.width &&
				sidecar.height === artifact.height &&
				artifact.width === expectedWidth &&
				artifact.height === expectedHeight &&
				jsonEqual(sidecar.masterBounds, descriptor.masterBounds) &&
				Array.isArray(sidecar.inputs) &&
				Array.isArray(sidecar.inputSha256) &&
				jsonEqual(
					sidecar.inputSha256,
					sidecar.inputs.map(({ sha256: inputSha256 }) => inputSha256)
				) &&
				sidecar.metrics !== null &&
				typeof sidecar.metrics === 'object',
			`Meadow Entry proof sidecar is malformed: ${sidecarPath}`
		);
		assert(
			jsonEqual(
				sidecar.inputs.map(({ path }) => path),
				expectedProofInputPaths(descriptor.proofId)
			),
			`Meadow Entry proof input path inventory drifted: ${descriptor.proofId}`
		);
		const seenInputs = new Set<string>();
		for (const input of sidecar.inputs) {
			assert(
				jsonEqual(Object.keys(input).sort(), ['path', 'sha256']) &&
					input.path === input.path.replaceAll('\\', '/') &&
					!input.path.startsWith('/') &&
					!input.path.split('/').includes('..') &&
					SHA256.test(input.sha256) &&
					!seenInputs.has(input.path),
				`Meadow Entry proof sidecar has an invalid input: ${sidecarPath}`
			);
			seenInputs.add(input.path);
			const packageBytes = packageInputs.get(input.path);
			assert(
				packageBytes !== undefined || !input.path.startsWith(`${PACKAGE_ROOT}/`),
				`Meadow Entry coherent package snapshot is missing proof input: ${input.path}`
			);
			const inputBytes = packageBytes ?? (await readFile(join(repositoryRoot, input.path)));
			assert(
				sha256(inputBytes) === input.sha256,
				`Meadow Entry proof input drifted proof=${descriptor.proofId} input=${input.path}`
			);
		}
		assertProofMetrics(sidecar);
		proofs.push({
			...artifact,
			proofId: descriptor.proofId,
			inputSha256: [...sidecar.inputSha256]
		});
	}

	return {
		combinedControlFingerprint: currentFingerprint,
		storageMode: 'git-lfs',
		storageConfigurationSha256: sha256(storageConfiguration),
		baseMaster,
		foregroundMaster,
		cropManifestSha256: sha256(sourceSnapshot.exports.cropManifestJson),
		masterProvenanceSha256: sha256(sourceSnapshot.provenanceJson),
		exportProvenanceSha256: sha256(sourceSnapshot.exports.provenanceJson),
		exports,
		proofs,
		evidencePath: EVIDENCE_PATH
	};
}

async function renderApprovalModule(
	review: ReviewArguments,
	approval: MeadowEntryArtPackageApproval
): Promise<string> {
	return await format(
		`/** Generated by tools/approve-meadow-entry-art-package.ts from the reviewed fixed inventory. */
export interface ApprovedPngArtifact {
  path: string;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
}

export interface MeadowEntryArtPackageApproval {
  combinedControlFingerprint: string;
  storageMode: 'git-lfs';
  storageConfigurationSha256: string;
  baseMaster: ApprovedPngArtifact;
  foregroundMaster: ApprovedPngArtifact;
  cropManifestSha256: string;
  masterProvenanceSha256: string;
  exportProvenanceSha256: string;
  exports: readonly (ApprovedPngArtifact & {
    cropId: string;
    plane: 'base' | 'foreground';
    textureKey: string;
    drawOrder: number;
  })[];
  proofs: readonly (ApprovedPngArtifact & {
    proofId: string;
    inputSha256: readonly string[];
  })[];
  evidencePath: '${EVIDENCE_PATH}';
}

export const meadowEntryArtPackageApprovalReview = ${JSON.stringify(review)} as const;

export const meadowEntryArtPackageApproval: MeadowEntryArtPackageApproval = ${JSON.stringify(approval)};
`,
		{
			parser: 'typescript',
			useTabs: true,
			singleQuote: true,
			trailingComma: 'none',
			printWidth: 100
		}
	);
}

async function publishApproval(repositoryRoot: string, contents: string): Promise<void> {
	const target = join(repositoryRoot, APPROVAL_PATH);
	const temporary = join(dirname(target), `.meadow-entry-art-package.${randomUUID()}.tmp`);
	await mkdir(dirname(target), { recursive: true });
	try {
		await writeFile(temporary, contents, { flag: 'wx' });
		await rename(temporary, target);
	} finally {
		await rm(temporary, { force: true }).catch(() => undefined);
	}
}

export async function approveMeadowEntryArtPackage(
	args: readonly string[],
	repositoryRoot = process.cwd()
): Promise<MeadowEntryArtPackageApproval> {
	const root = resolve(repositoryRoot);
	const review = parseReviewArguments(args);
	await verifyMeadowEntryArtStorage(root);
	const approval = await buildApproval(root);
	await publishApproval(root, await renderApprovalModule(review, approval));
	process.stdout.write(
		`${JSON.stringify({ reviewedBy: review.reviewedBy, reviewedAt: review.reviewedAt, baseSha256: approval.baseMaster.sha256, foregroundSha256: approval.foregroundMaster.sha256, exports: approval.exports.length, proofs: approval.proofs.length })}\n`
	);
	return approval;
}

if (import.meta.main) {
	await approveMeadowEntryArtPackage(process.argv.slice(2));
}

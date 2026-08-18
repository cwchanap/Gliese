import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	unlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import test from 'node:test';

import {
	assertReviewArtifactPathWithinRoot,
	assertReviewCropOverlapBuffersEqual,
	DEFAULT_OUTPUT_ROOT
} from './render-meadow-entry-painted-v2-enrichment-review';

const TASK3_PRESENTATION_IDS = [
	'camera-underlay-sundrop-north',
	'camera-underlay-sundrop-south',
	'camera-underlay-crossroads-north',
	'camera-underlay-crossroads-south',
	'sundrop-north',
	'sundrop-south'
] as const;

const TASK3_INSERT_IDS = [
	'camera-underlay-sundrop-south-blocked-hedge',
	'camera-underlay-crossroads-north-blocked-hedge',
	'camera-underlay-crossroads-south-blocked-hedge',
	'camera-underlay-crossroads-north-blocked-woodland',
	'camera-underlay-crossroads-south-blocked-woodland'
] as const;

const PRESENTATION_IDS = [
	...TASK3_PRESENTATION_IDS,
	'village-crossroads-connector',
	'crossroads'
] as const;

const INSERT_IDS = [
	...TASK3_INSERT_IDS,
	'crossroads-blocked-hedge',
	'crossroads-blocked-woodland'
] as const;

const TASK2_ORGANIC_APPROVAL_STAGE = 'approved-explicit-organic-candidate-gate';
const TASK2_ORGANIC_APPROVAL_ANSWER = 'Looks good';
const TASK2_ORGANIC_APPROVED_AT_UTC = '2026-08-18T18:06:55Z';
const TASK2_ORGANIC_CANDIDATE_SHA256 =
	'05dc5d3db4e26b69b1e5de79b5b8cb526eeb9709db67cce443522f1b1e3975da';
const TASK2_ORGANIC_EVIDENCE_MANIFEST_SHA256 =
	'c9e80aa03ffe56c99d8375c4e67e4ca84f2daaa75682acb1c3690a3b9f04ea30';
const TASK2_ORGANIC_EVIDENCE_FILE_COUNT = 123;

const TASK4_APPROVAL_CANDIDATE_SHA256 =
	'6d419b9f52213b70061588baf63e0ef2316f971981a9e66d30e2892ac119c6a4';
const TASK4_POST_BINDING_CANDIDATE_SHA256 =
	'e95080508cae8b5fe3a1819c2c08a8a03a18cdea0046c55507c98a4a27119529';
const TASK4_EVIDENCE_MANIFEST_SHA256 =
	'cd905da7d47c938622df80d7d637ce41078918b37143043b7e9c97bf8df4c6f2';
const TASK4_APPROVED_AT_UTC = '2026-08-16T16:41:54Z';
const TASK4_SUPERSEDED_AT_UTC = '2026-08-16T19:14:07Z';
const TASK4_FRESH_CANDIDATE_SHA256 =
	'be25559c9095c91b92ef6550973b7ce15824d2161fabb8da91f0f72f374ae8f5';
const TASK4_FRESH_EVIDENCE_MANIFEST_SHA256 =
	'23a39e8de5c50669014a6f7954a486acb83ae9b62ccb10bf8b7673f67b785e1a';
const TASK4_FRESH_EVIDENCE_FILE_COUNT = 104;
const TASK4_ROUND3_CANDIDATE_SHA256 =
	'bdae53182c62d696068e4acf499a0ac3d2a34bfb4e9a2c84f9072a7a97099cd5';
const TASK4_ROUND3_EVIDENCE_MANIFEST_SHA256 =
	'7731e46389146044381c3b096492bcd1a12ac14705a58d21a6000fda8421ec3a';
const TASK4_ROUND3_EVIDENCE_FILE_COUNT = 104;
const TASK4_ROUND3_APPROVED_AT_UTC = '2026-08-16T21:37:44Z';
const TASK4_ROUND3_POST_BINDING_CANDIDATE_SHA256 =
	'25a00102257f1bd96ca2d84c514e9e110d905bd0f4685cd9dcc9714b4d67ca87';
const TASK4_FRESH_PANEL_MANIFEST_SHA256 = {
	'village-crossroads-connector':
		'c0abf2f73c8567a75da8f5adcf2e39fb301b2c8498aa94828402c041adf4199c',
	crossroads: '80b34212d6477739ac60f548164c4156c710aa7b6dae43a82e24e36f8442dc20'
} as const;
const TASK4_ROUND3_PANEL_MANIFEST_HASHES = {
	before: TASK4_FRESH_PANEL_MANIFEST_SHA256,
	after: {
		'village-crossroads-connector':
			'c5ed075b783e7ea7f5defd26139fd45406accef4b25f899cce1dafe7c8c9f89d',
		crossroads: 'ea1af0a60de861d4cc8430b1578e299f28705bf8dc86d1ad911513094c3a1431'
	} as const
} as const;
const TASK4_ROUND3_PANEL_MANIFEST_HASH_DELTAS = [
	{
		id: 'village-crossroads-connector',
		path: 'artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.json',
		beforeSha256: TASK4_ROUND3_PANEL_MANIFEST_HASHES.before['village-crossroads-connector'],
		afterSha256: TASK4_ROUND3_PANEL_MANIFEST_HASHES.after['village-crossroads-connector']
	},
	{
		id: 'crossroads',
		path: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.json',
		beforeSha256: TASK4_ROUND3_PANEL_MANIFEST_HASHES.before.crossroads,
		afterSha256: TASK4_ROUND3_PANEL_MANIFEST_HASHES.after.crossroads
	}
] as const;
const TASK4_PANEL_MANIFEST_HASH_DELTAS = [
	{
		id: 'village-crossroads-connector',
		path: 'artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.json',
		beforeSha256: 'c9952b82cf35889e1c59ea891a1baff7112c38e01f170681ec01c0b8197bd534',
		afterSha256: '0c438c153cb90a1416b563f842a39e774e105933a6c8289d40d7dede37be372c'
	},
	{
		id: 'crossroads',
		path: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.json',
		beforeSha256: '288ac4c1e76adfab879471d2beb910ae45341f3afe29d1eab7d19ed4cdbb4a5a',
		afterSha256: '83cbcdc0b40fd3350deb5c03dfbd345977661aac7960f97106027b1a74b57b39'
	}
] as const;

type SyntheticSourceManifest = Readonly<{
	id: string;
	normalizationTransform: Readonly<{
		native: Readonly<{ width: number; height: number }>;
		resize: Readonly<{ width: number; height: number }>;
		crop: Readonly<{ left: number; top: number; width: number; height: number }>;
		scale: number;
		scaleX: number;
		scaleY: number;
	}>;
}>;

const northHedgeManifest: SyntheticSourceManifest = Object.freeze({
	id: 'camera-underlay-crossroads-north-blocked-hedge',
	normalizationTransform: Object.freeze({
		native: Object.freeze({ width: 1550, height: 1014 }),
		resize: Object.freeze({ width: 3200, height: 2094 }),
		crop: Object.freeze({ left: 0, top: 215, width: 3200, height: 1664 }),
		scale: 2.064516129032258,
		scaleX: 2.064516129032258,
		scaleY: 2.064516129032258
	})
});

const southWoodlandManifest: SyntheticSourceManifest = Object.freeze({
	id: 'camera-underlay-crossroads-south-blocked-woodland',
	normalizationTransform: Object.freeze({
		native: Object.freeze({ width: 1567, height: 1004 }),
		resize: Object.freeze({ width: 3200, height: 2051 }),
		crop: Object.freeze({ left: 0, top: 193, width: 3200, height: 1664 }),
		scale: 2.04211869814933,
		scaleX: 2.04211869814933,
		scaleY: 2.04211869814933
	})
});

const EXPECTED_CANDIDATE_INVENTORY = [
	'decoration-candidate.json',
	'evidence-manifest.json',
	'mask-inventory.json',
	'organic-scenery-inventory.json',
	'forest-overview.png',
	'organic-scenery-overview.png',
	'organic-scenery-apron-overlay.png',
	'masters/meadow-entry-painted-v2-pilot-base-master.png',
	'exports/painted-v2-sundrop-camera-base.png',
	'exports/painted-v2-crossroads-camera-base.png',
	'decoration-density-01.png',
	'decoration-density-02.png',
	'decoration-density-03.png',
	'decoration-density-04.png',
	'decoration-density-05.png',
	...PRESENTATION_IDS.map((id) => `panel-${id}-original.png`),
	...INSERT_IDS.flatMap((id) => [
		`insert-${id}-review.png`,
		`insert-${id}-native.png`,
		...Array.from(
			{ length: 5 },
			(_, index) => `insert-${id}-crop-${(index + 1).toString().padStart(2, '0')}.png`
		)
	]),
	'enriched-owner-camera-underlay-sundrop-south.png',
	'enriched-owner-camera-underlay-crossroads-north.png',
	'enriched-owner-camera-underlay-crossroads-south.png',
	'enriched-owner-crossroads.png',
	'underlay-sundrop-north-south.png',
	'underlay-crossroads-north-south.png',
	'underlay-family-handoff.png',
	'detail-sundrop-intersection.png',
	'detail-sundrop-west.png',
	'detail-sundrop-center.png',
	'detail-sundrop-east.png',
	'detail-sundrop-sides-corners.png',
	'panel-camera-underlay-sundrop-north-quadrants-center.png',
	'panel-camera-underlay-sundrop-south-quadrants-center.png',
	'panel-camera-underlay-crossroads-north-quadrants-center.png',
	'panel-camera-underlay-crossroads-south-quadrants-center.png',
	'panel-sundrop-north-quadrants-center.png',
	'panel-sundrop-south-quadrants-center.png',
	'panel-village-crossroads-connector-quadrants-center.png',
	'panel-crossroads-quadrants-center.png',
	'detail-connector-crossroads-intersection.png',
	'detail-connector-crossroads-west.png',
	'detail-connector-crossroads-middle.png',
	'detail-connector-crossroads-east.png',
	'detail-connector-crossroads-sides-corners.png',
	'hero-house-edges.png',
	'protected-live-atlas.png',
	'region-material-overlay.png',
	'route-centerline-overlay.png',
	'hero-house-edge-north.png',
	'hero-house-edge-east.png',
	'hero-house-edge-south.png',
	'hero-house-edge-west.png',
	'matched-sundrop-richness.png',
	'wildwood-forest-lane.png',
	...Array.from(
		{ length: 10 },
		(_, index) => `blocker-row-${(index + 1).toString().padStart(2, '0')}.png`
	),
	'blocker-row-coast-crossroads-mouth-bank.png',
	'blocker-row-mistfen-entry-bank-east.png',
	'blocker-row-silverpine-wall-A-east.png',
	'blocker-row-silverpine-wall-A-west.png',
	'blocker-row-silverpine-wall-B-north.png',
	'blocker-row-silverpine-wall-B-south.png',
	'blocker-row-silverpine-wall-C-east.png',
	'blocker-row-silverpine-wall-C-west.png',
	'blocker-row-wildwood-forest-lane-west-bank.png',
	'blocker-row-wildwood-north-climb-west-bank.png'
] as const;

const FRESH_TASK4_EVIDENCE_INVENTORY = [
	'panel-camera-underlay-sundrop-north-quadrants-center.png',
	'panel-camera-underlay-sundrop-south-quadrants-center.png',
	'panel-camera-underlay-crossroads-north-quadrants-center.png',
	'panel-camera-underlay-crossroads-south-quadrants-center.png',
	'panel-sundrop-north-quadrants-center.png',
	'panel-sundrop-south-quadrants-center.png',
	'panel-village-crossroads-connector-quadrants-center.png',
	'panel-crossroads-quadrants-center.png',
	'detail-connector-crossroads-intersection.png',
	'detail-connector-crossroads-west.png',
	'detail-connector-crossroads-middle.png',
	'detail-connector-crossroads-east.png',
	'detail-connector-crossroads-sides-corners.png',
	'hero-house-edges.png',
	'protected-live-atlas.png',
	'region-material-overlay.png',
	'route-centerline-overlay.png'
] as const;

test('fresh Task 4 source gate requires native Crossroads inserts and the complete static evidence inventory', async () => {
	const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const insertFailures: string[] = [];
	const rendererSource = readFileSync(
		join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
		'utf8'
	);
	if (rendererSource.includes('.resize(targetWidth, targetHeight'))
		insertFailures.push('renderer still performs a transient scenery-insert review resize');
	for (const id of ['crossroads-blocked-hedge', 'crossroads-blocked-woodland']) {
		const bytes = readFileSync(
			join(repositoryRoot, `artifacts/meadow-entry/painted-v2/source-inserts/${id}.png`)
		);
		const metadata = await sharp(bytes).metadata();
		if (metadata.width !== 1728 || metadata.height !== 1952)
			insertFailures.push(
				`${id} normalized dimensions are ${metadata.width ?? 'unknown'}x${metadata.height ?? 'unknown'}; expected 1728x1952`
			);
	}
	const evidenceRoot = join(
		repositoryRoot,
		'docs/superpowers/reports/img/hpa-586-painted-v2-enrichment/forest-final-sources'
	);
	const missingEvidence = FRESH_TASK4_EVIDENCE_INVENTORY.filter(
		(relativePath) => !existsSync(join(evidenceRoot, relativePath))
	);
	assert.deepEqual(
		[...insertFailures, ...missingEvidence.map((path) => `missing evidence ${path}`)],
		[],
		'Fresh Task 4 source gate defects:\n' +
			[...insertFailures, ...missingEvidence.map((path) => `missing evidence ${path}`)].join('\n')
	);
	const handoffMetadata = await sharp(
		readFileSync(join(evidenceRoot, 'detail-connector-crossroads-intersection.png'))
	).metadata();
	assert.deepEqual(
		{ width: handoffMetadata.width, height: handoffMetadata.height },
		{ width: 512, height: 288 },
		'Connector/Crossroads handoff must remain an exact native 512x288 crop'
	);
});

function stableJson(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? '';
	if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
	return `{${Object.entries(value as Record<string, unknown>)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
		.join(',')}}`;
}

function stableHash(value: unknown): string {
	return createHash('sha256').update(stableJson(value)).digest('hex');
}

test('candidate source review rejects the two recorded invalid-scale attempt-3 manifests', async () => {
	const review = (await import('./render-meadow-entry-painted-v2-enrichment-review')) as {
		assertReviewSourceTransform?: (manifest: SyntheticSourceManifest) => void;
	};
	assert.throws(
		() => review.assertReviewSourceTransform?.(northHedgeManifest),
		/camera-underlay-crossroads-north-blocked-hedge.*2\.064516129032258/
	);
	assert.throws(
		() => review.assertReviewSourceTransform?.(southWoodlandManifest),
		/camera-underlay-crossroads-south-blocked-woodland.*2\.04211869814933/
	);
});

test('Task 4 source review inventory includes eight presentation panels and seven inserts', async () => {
	const review = (await import('./render-meadow-entry-painted-v2-enrichment-review')) as {
		REVIEW_SOURCE_PANEL_IDS?: readonly string[];
		REVIEW_INSERT_IDS?: readonly string[];
	};
	assert.deepEqual(review.REVIEW_SOURCE_PANEL_IDS, PRESENTATION_IDS);
	assert.deepEqual(review.REVIEW_INSERT_IDS, INSERT_IDS);
});

type ProvenanceDimensions = Readonly<{ width: number; height: number }>;
type ProvenanceCrop = Readonly<{
	left: number;
	top: number;
	width: number;
	height: number;
}>;
type ProvenancePng = Readonly<{
	path: string;
	sha256: string;
	bytes: number;
	dimensions: ProvenanceDimensions;
}>;
type ProvenanceTransform = Readonly<{
	native: ProvenanceDimensions;
	crop: ProvenanceCrop;
	scale: number;
	scaleX: number;
	scaleY: number;
}>;
type ProvenanceGeneration = Readonly<{
	attempt: number;
	callOrder?: number;
	attemptHistory?: readonly unknown[];
	outputSha256?: string;
}>;
type ProvenanceManifest = Readonly<{
	id: string;
	raw: ProvenancePng;
	normalized: ProvenancePng;
	normalizationTransform: ProvenanceTransform;
	generation: ProvenanceGeneration;
	stage: string;
	review: Readonly<Record<string, unknown>>;
	task2Binding: Readonly<Record<string, unknown>>;
	candidateReview: Readonly<Record<string, unknown>>;
}>;
type ProvenanceCall = Readonly<{
	id: string;
	kind: string;
	attempt: number;
	callOrder: number;
	rawPath: string;
	rawSha256: string;
	rawDimensions: readonly [number, number];
	normalizedPath: string;
	normalizedSha256: string;
	normalizedDimensions: readonly [number, number];
	uniformScale: number;
	crop: ProvenanceCrop;
}>;
type ProvenanceDocument = Readonly<{
	sourceInserts: Readonly<{ inserts: readonly ProvenanceManifest[] }>;
	sourcePanels: Readonly<{ panels: readonly ProvenanceManifest[] }>;
	interimForestApproval: Readonly<{ scope: readonly string[] }>;
	task3CallInventory: Readonly<{ accepted: readonly ProvenanceCall[] }>;
	stage: string;
	task2CandidateReview: Readonly<Record<string, unknown>>;
}>;

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, 'utf8')) as T;
}

async function assertProvenancePng(
	repositoryRoot: string,
	descriptor: ProvenancePng,
	label: string
): Promise<void> {
	const bytes = readFileSync(join(repositoryRoot, descriptor.path));
	assert.equal(
		createHash('sha256').update(bytes).digest('hex'),
		descriptor.sha256,
		`${label} sha256 must match its actual bytes`
	);
	assert.equal(
		bytes.byteLength,
		descriptor.bytes,
		`${label} byte count must match its actual bytes`
	);
	const metadata = await sharp(bytes).metadata();
	assert.deepEqual(
		{ width: metadata.width, height: metadata.height },
		descriptor.dimensions,
		`${label} dimensions must match its actual bytes`
	);
}

test('root provenance binds current accepted inserts, call inventory, bytes, and evidence scope', async () => {
	const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const provenance = readJson<ProvenanceDocument>(
		join(repositoryRoot, 'artifacts/meadow-entry/painted-v2/provenance.json')
	);
	const evidenceManifest = readJson<{ files: Record<string, unknown> }>(
		join(
			repositoryRoot,
			'docs/superpowers/reports/img/hpa-586-painted-v2-enrichment/forest-interim/evidence-manifest.json'
		)
	);
	const insertManifests = new Map<string, ProvenanceManifest>();
	for (const id of INSERT_IDS) {
		insertManifests.set(
			id,
			readJson<ProvenanceManifest>(
				join(repositoryRoot, `artifacts/meadow-entry/painted-v2/source-inserts/${id}.json`)
			)
		);
	}
	const sourcePanelManifests = new Map<string, ProvenanceManifest>();
	for (const id of TASK3_PRESENTATION_IDS) {
		sourcePanelManifests.set(
			id,
			readJson<ProvenanceManifest>(
				join(repositoryRoot, `artifacts/meadow-entry/painted-v2/source-panels/${id}.json`)
			)
		);
	}
	const rootInsertById = new Map(
		provenance.sourceInserts.inserts.map((insert) => [insert.id, insert])
	);
	for (const [id, manifest] of insertManifests) {
		const rootInsert = rootInsertById.get(id);
		assert.ok(rootInsert, `${id} must be present in root sourceInserts`);
		assert.equal(
			stableHash(rootInsert),
			stableHash(manifest),
			`${id} root sourceInserts entry must equal the current per-insert manifest`
		);
		await assertProvenancePng(repositoryRoot, manifest.raw, `${id} raw`);
		await assertProvenancePng(repositoryRoot, manifest.normalized, `${id} normalized`);
		assert.deepEqual(
			rootInsert?.generation.attemptHistory,
			manifest.generation.attemptHistory,
			`${id} root sourceInserts call history must match its current manifest`
		);
		assert.equal(manifest.stage, TASK2_ORGANIC_APPROVAL_STAGE);
		assert.equal(manifest.review.approval, TASK2_ORGANIC_APPROVAL_STAGE);
		assert.equal(manifest.review.reviewStatus, TASK2_ORGANIC_APPROVAL_STAGE);
		assert.equal(manifest.review.userAnswer, TASK2_ORGANIC_APPROVAL_ANSWER);
		assert.equal(manifest.review.approvedAtUtc, TASK2_ORGANIC_APPROVED_AT_UTC);
		assert.equal(manifest.review.approvalCandidateSha256, TASK2_ORGANIC_CANDIDATE_SHA256);
		assert.equal(
			manifest.review.approvalEvidenceManifestSha256,
			TASK2_ORGANIC_EVIDENCE_MANIFEST_SHA256
		);
		assert.equal(manifest.review.approvalEvidenceFileCount, TASK2_ORGANIC_EVIDENCE_FILE_COUNT);
		assert.equal(manifest.review.runtimePermission, false);
		assert.equal(manifest.task2Binding.stage, TASK2_ORGANIC_APPROVAL_STAGE);
		assert.equal(manifest.candidateReview.stage, TASK2_ORGANIC_APPROVAL_STAGE);
		assert.equal(manifest.candidateReview.status, TASK2_ORGANIC_APPROVAL_STAGE);
		assert.equal(
			(manifest.candidateReview.candidateMaster as Record<string, unknown>).sha256,
			TASK2_ORGANIC_CANDIDATE_SHA256
		);
	}
	assert.equal(provenance.stage, TASK2_ORGANIC_APPROVAL_STAGE);
	assert.equal(provenance.task2CandidateReview.status, TASK2_ORGANIC_APPROVAL_STAGE);
	assert.equal(provenance.task2CandidateReview.stage, TASK2_ORGANIC_APPROVAL_STAGE);
	assert.equal(provenance.task2CandidateReview.userAnswer, TASK2_ORGANIC_APPROVAL_ANSWER);
	assert.equal(provenance.task2CandidateReview.approvedAtUtc, TASK2_ORGANIC_APPROVED_AT_UTC);
	assert.equal(
		(provenance.task2CandidateReview.master as Record<string, unknown>).sha256,
		TASK2_ORGANIC_CANDIDATE_SHA256
	);

	const acceptedCalls = provenance.task3CallInventory.accepted;
	assert.equal(
		acceptedCalls.length,
		11,
		'task3CallInventory must retain six presentation and five insert calls'
	);
	for (const call of acceptedCalls) {
		const manifest = insertManifests.get(call.id) ?? sourcePanelManifests.get(call.id);
		assert.ok(manifest, `${call.id} accepted call must have a current source manifest`);
		await assertProvenancePng(repositoryRoot, manifest.raw, `${call.id} raw`);
		await assertProvenancePng(repositoryRoot, manifest.normalized, `${call.id} normalized`);
		assert.equal(call.rawPath, manifest.raw.path, `${call.id} raw path drifted`);
		assert.equal(call.rawSha256, manifest.raw.sha256, `${call.id} raw hash drifted`);
		assert.deepEqual(call.rawDimensions, [
			manifest.raw.dimensions.width,
			manifest.raw.dimensions.height
		]);
		assert.equal(
			call.normalizedPath,
			manifest.normalized.path,
			`${call.id} normalized path drifted`
		);
		assert.equal(
			call.normalizedSha256,
			manifest.normalized.sha256,
			`${call.id} normalized hash drifted`
		);
		assert.deepEqual(call.normalizedDimensions, [
			manifest.normalized.dimensions.width,
			manifest.normalized.dimensions.height
		]);
		assert.equal(
			call.uniformScale,
			manifest.normalizationTransform.scale,
			`${call.id} uniform scale drifted`
		);
		assert.deepEqual(call.crop, manifest.normalizationTransform.crop, `${call.id} crop drifted`);
		const callHistory = insertManifests.has(call.id)
			? manifest.generation
			: provenance.sourcePanels.panels.find((panel) => panel.id === call.id)?.generation;
		assert.ok(callHistory, `${call.id} accepted call must have current call history`);
		assert.equal(call.attempt, callHistory?.attempt, `${call.id} attempt drifted`);
		assert.equal(call.callOrder, callHistory?.callOrder, `${call.id} call order drifted`);
	}

	const evidenceCount = Object.keys(evidenceManifest.files).length;
	const evidenceScope = provenance.interimForestApproval.scope.find((entry) =>
		/\d+ review artifacts/.test(entry)
	);
	assert.ok(evidenceScope, 'approval scope must state its evidence artifact count');
	assert.equal(
		Number(evidenceScope?.match(/\d+/)?.[0]),
		evidenceCount,
		'approval scope evidence count must match evidence-manifest entry count'
	);
});

test('Task 4 records the two-phase source-manifest identity contract', () => {
	const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const provenance = readJson<{
		task4PendingSourceGate: {
			status: string;
			evidenceDirectory: string;
			presentationSourceIds: readonly string[];
			insertIds: readonly string[];
			callInventory: readonly {
				id: string;
				kind: string;
				attempt: number;
				callOrder: number;
				result: string;
			}[];
			runtimePublication: boolean;
			approval: {
				status: string;
				answer: string;
				approvedAtUtc: string;
				runtimePermission: boolean;
				candidateSha256: string;
				evidenceManifestSha256: string;
				evidenceFileCount: number;
				scope: string;
			};
			supersededApprovals: readonly {
				status: string;
				answer: string;
				approvedAtUtc: string;
				runtimePermission: boolean;
				candidateSha256: string;
				evidenceManifestSha256: string;
				evidenceFileCount: number;
				supersededAtUtc: string;
			}[];
			currentApproval: {
				answer: string;
				approvedAtUtc: string;
				approvalCandidateSha256: string;
				approvalEvidenceManifestSha256: string;
				approvalEvidenceFileCount: number;
				runtimePermission: boolean;
			};
			postBindingIdentity?: {
				mode: string;
				version: number;
				identityMode: string;
				identityVersion: number;
				preBindingCandidateSha256: string;
				postBindingCandidateSha256: string;
				evidenceManifestSha256: string;
				evidenceFileCount: number;
				runtimePermission: boolean;
				approvedAtUtc: string;
				panelManifestHashDeltas: readonly (typeof TASK4_ROUND3_PANEL_MANIFEST_HASH_DELTAS)[number][];
				reconstruction: {
					method: string;
					sourceHashKeys: readonly string[];
					reconstructedCandidateSha256: string;
					matchesApprovalCandidateSha256: boolean;
					removedApprovalFields: readonly string[];
				};
			};
			supersededPostBindingIdentity?: {
				mode: string;
				version: number;
				preBindingCandidateSha256: string;
				postBindingCandidateSha256: string;
				evidenceManifestSha256: string;
				evidenceFileCount: number;
				runtimePermission: boolean;
				panelManifestHashDeltas: readonly (typeof TASK4_PANEL_MANIFEST_HASH_DELTAS)[number][];
			};
			freshFixRound: {
				fixRound: number;
				startedAtUtc: string;
				status: string;
				canonicalCrossroadsInsertDimensions: { width: number; height: number };
				coverScaleLimit: number;
				freshImageGenerationCalls: number;
				candidateSha256: string;
				evidenceManifestSha256: string;
				evidenceFileCount: number;
				evidenceDirectory: string;
			};
			freshFixRound3: {
				fixRound: number;
				startedAtUtc: string;
				status: string;
				freshImageGenerationCalls: number;
				candidateSha256: string;
				currentCandidateSha256: string;
				postBindingCandidateSha256: string;
				approvedAtUtc: string;
				approvalCandidateSha256: string;
				approvalEvidenceManifestSha256: string;
				approvalEvidenceFileCount: number;
				currentEvidenceManifestSha256: string;
				currentEvidenceFileCount: number;
				evidenceDirectory: string;
				nextGate: string;
				callInventory: readonly { id: string; attempt: number; callOrder: number }[];
				bSouthTopology: {
					rawEqualsShaped: boolean;
					missingSlicePromotionCount: number;
					coveragePromotionCount: number;
					promotedWorldPixelCount: number;
				};
			};
		};
	}>(join(repositoryRoot, 'artifacts/meadow-entry/painted-v2/provenance.json'));
	const gate = provenance.task4PendingSourceGate;

	assert.equal(gate.status, 'pending-final-source-gate');
	assert.equal(gate.runtimePublication, false);
	assert.equal(gate.approval.status, 'APPROVED');
	assert.equal(gate.approval.answer, 'yes');
	assert.equal(gate.approval.approvedAtUtc, TASK4_ROUND3_APPROVED_AT_UTC);
	assert.equal(gate.approval.runtimePermission, false);
	assert.equal(gate.approval.candidateSha256, TASK4_ROUND3_CANDIDATE_SHA256);
	assert.equal(gate.approval.evidenceManifestSha256, TASK4_ROUND3_EVIDENCE_MANIFEST_SHA256);
	assert.equal(gate.approval.evidenceFileCount, TASK4_ROUND3_EVIDENCE_FILE_COUNT);
	assert.deepEqual(gate.currentApproval, {
		answer: 'yes',
		approvedAtUtc: TASK4_ROUND3_APPROVED_AT_UTC,
		approvalCandidateSha256: TASK4_ROUND3_CANDIDATE_SHA256,
		approvalEvidenceManifestSha256: TASK4_ROUND3_EVIDENCE_MANIFEST_SHA256,
		approvalEvidenceFileCount: TASK4_ROUND3_EVIDENCE_FILE_COUNT,
		runtimePermission: false
	});
	const supersededApproval = gate.supersededApprovals.find(
		(entry) => entry.approvedAtUtc === TASK4_APPROVED_AT_UTC
	);
	assert.deepEqual(supersededApproval, {
		status: 'SUPERSEDED_BY_REVIEW',
		answer: 'yes',
		approvedAtUtc: TASK4_APPROVED_AT_UTC,
		runtimePermission: false,
		candidateSha256: TASK4_APPROVAL_CANDIDATE_SHA256,
		evidenceManifestSha256: TASK4_EVIDENCE_MANIFEST_SHA256,
		evidenceFileCount: 87,
		scope:
			'Task 4 final-source forest enrichment only; no production publication, runtime permission, Task 5, probes, or master replacement',
		supersededAtUtc: TASK4_SUPERSEDED_AT_UTC,
		supersededReason:
			'Independent Task 4 review found P1 defects: Crossroads inserts exceeded the new 1728x1952 cover-scale contract and the final static evidence inventory was incomplete.'
	});

	assert.deepEqual(gate.presentationSourceIds.slice(-2), [
		'village-crossroads-connector',
		'crossroads'
	]);
	assert.deepEqual(gate.insertIds.slice(-2), [
		'crossroads-blocked-hedge',
		'crossroads-blocked-woodland'
	]);
	assert.deepEqual(
		gate.callInventory.map((call) => [call.id, call.attempt, call.callOrder, call.result]),
		[
			['village-crossroads-connector', 1, 27, 'raw-passed-native-review'],
			['crossroads', 1, 28, 'raw-passed-native-review'],
			['crossroads-blocked-hedge', 1, 29, 'rejected-by-native-review'],
			['crossroads-blocked-hedge', 2, 30, 'raw-passed-native-and-scale-preflight'],
			['crossroads-blocked-woodland', 1, 31, 'raw-passed-native-and-scale-preflight'],
			[
				'crossroads-blocked-hedge',
				3,
				32,
				'fresh-replacement-raw-passed-native-and-scale-preflight'
			],
			[
				'crossroads-blocked-woodland',
				2,
				33,
				'fresh-replacement-raw-passed-native-and-scale-preflight'
			]
		]
	);

	const freshFixRound3 = gate.freshFixRound3;
	assert.equal(freshFixRound3.fixRound, 3);
	assert.equal(freshFixRound3.startedAtUtc, '2026-08-16T20:28:22Z');
	assert.equal(freshFixRound3.status, 'pending-fresh-final-source-gate');
	assert.equal(freshFixRound3.freshImageGenerationCalls, 1);
	assert.equal(freshFixRound3.currentCandidateSha256, TASK4_ROUND3_CANDIDATE_SHA256);
	assert.equal(freshFixRound3.currentEvidenceManifestSha256, TASK4_ROUND3_EVIDENCE_MANIFEST_SHA256);
	assert.equal(freshFixRound3.currentEvidenceFileCount, TASK4_ROUND3_EVIDENCE_FILE_COUNT);
	assert.equal(freshFixRound3.evidenceDirectory, gate.evidenceDirectory);
	assert.equal(freshFixRound3.nextGate, 'NEEDS_CONTEXT');
	assert.deepEqual(
		freshFixRound3.callInventory.map((call) => [call.id, call.attempt, call.callOrder]),
		[
			['crossroads-blocked-hedge', 4, 34],
			['crossroads-blocked-woodland', 4, 36]
		]
	);
	assert.equal(freshFixRound3.bSouthTopology.rawEqualsShaped, true);
	assert.equal(freshFixRound3.bSouthTopology.missingSlicePromotionCount, 0);
	assert.equal(freshFixRound3.bSouthTopology.coveragePromotionCount, 0);
	assert.equal(freshFixRound3.bSouthTopology.promotedWorldPixelCount, 0);

	const evidencePath = join(
		repositoryRoot,
		freshFixRound3.evidenceDirectory,
		'evidence-manifest.json'
	);
	const evidenceBytes = readFileSync(evidencePath);
	const evidenceManifest = JSON.parse(evidenceBytes.toString('utf8')) as {
		files: Record<string, unknown>;
	};
	assert.equal(
		createHash('sha256').update(evidenceBytes).digest('hex'),
		TASK4_ROUND3_EVIDENCE_MANIFEST_SHA256
	);
	assert.equal(Object.keys(evidenceManifest.files).length, TASK4_ROUND3_EVIDENCE_FILE_COUNT);

	const identity = gate.supersededPostBindingIdentity;
	assert.ok(identity, 'Task 4 must retain superseded post-binding identity metadata');
	assert.equal(identity?.mode, 'two-phase-source-manifest-binding');
	assert.equal(identity?.version, 1);
	assert.equal(identity?.preBindingCandidateSha256, TASK4_APPROVAL_CANDIDATE_SHA256);
	assert.equal(identity?.postBindingCandidateSha256, TASK4_POST_BINDING_CANDIDATE_SHA256);
	assert.equal(identity?.evidenceManifestSha256, TASK4_EVIDENCE_MANIFEST_SHA256);
	assert.equal(identity?.evidenceFileCount, 87);
	assert.equal(identity?.runtimePermission, false);
	assert.deepEqual(identity?.panelManifestHashDeltas, TASK4_PANEL_MANIFEST_HASH_DELTAS);
	const currentIdentity = gate.postBindingIdentity;
	assert.ok(currentIdentity, 'Task 4 must record the current post-binding identity');
	assert.equal(currentIdentity?.mode, 'two-phase-source-manifest-binding');
	assert.equal(currentIdentity?.version, 1);
	assert.equal(currentIdentity?.identityMode, 'two-phase-source-manifest-binding');
	assert.equal(currentIdentity?.identityVersion, 1);
	assert.equal(currentIdentity?.preBindingCandidateSha256, TASK4_ROUND3_CANDIDATE_SHA256);
	assert.equal(
		currentIdentity?.postBindingCandidateSha256,
		TASK4_ROUND3_POST_BINDING_CANDIDATE_SHA256
	);
	assert.equal(currentIdentity?.evidenceManifestSha256, TASK4_ROUND3_EVIDENCE_MANIFEST_SHA256);
	assert.equal(currentIdentity?.evidenceFileCount, TASK4_ROUND3_EVIDENCE_FILE_COUNT);
	assert.equal(currentIdentity?.runtimePermission, false);
	assert.equal(currentIdentity?.approvedAtUtc, TASK4_ROUND3_APPROVED_AT_UTC);
	assert.deepEqual(
		currentIdentity?.panelManifestHashDeltas,
		TASK4_ROUND3_PANEL_MANIFEST_HASH_DELTAS
	);
	assert.equal(
		currentIdentity?.reconstruction.reconstructedCandidateSha256,
		TASK4_ROUND3_CANDIDATE_SHA256
	);
	assert.equal(currentIdentity?.reconstruction.matchesApprovalCandidateSha256, true);
	assert.deepEqual(currentIdentity?.reconstruction.sourceHashKeys, [
		'raster:artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.json',
		'raster:artifacts/meadow-entry/painted-v2/source-panels/crossroads.json'
	]);
	assert.deepEqual(currentIdentity?.reconstruction.removedApprovalFields, [
		'approval',
		'userAnswer',
		'approvedAtUtc',
		'approvalScope',
		'approvalCandidateSha256',
		'approvalEvidenceManifestSha256',
		'approvalEvidenceFileCount',
		'runtimePermission'
	]);
	assert.equal(
		freshFixRound3.postBindingCandidateSha256,
		TASK4_ROUND3_POST_BINDING_CANDIDATE_SHA256
	);
	assert.equal(freshFixRound3.approvedAtUtc, TASK4_ROUND3_APPROVED_AT_UTC);
	assert.equal(freshFixRound3.approvalCandidateSha256, TASK4_ROUND3_CANDIDATE_SHA256);
	assert.equal(
		freshFixRound3.approvalEvidenceManifestSha256,
		TASK4_ROUND3_EVIDENCE_MANIFEST_SHA256
	);
	assert.equal(freshFixRound3.approvalEvidenceFileCount, TASK4_ROUND3_EVIDENCE_FILE_COUNT);
	assert.equal(gate.freshFixRound.fixRound, 1);
	assert.equal(gate.freshFixRound.startedAtUtc, TASK4_SUPERSEDED_AT_UTC);
	assert.equal(gate.freshFixRound.status, 'pending-fresh-final-source-gate');
	assert.deepEqual(gate.freshFixRound.canonicalCrossroadsInsertDimensions, {
		width: 1728,
		height: 1952
	});
	assert.equal(gate.freshFixRound.coverScaleLimit, 2);
	assert.equal(gate.freshFixRound.freshImageGenerationCalls, 2);
	assert.equal(gate.freshFixRound.candidateSha256, TASK4_FRESH_CANDIDATE_SHA256);
	assert.equal(gate.freshFixRound.evidenceManifestSha256, TASK4_FRESH_EVIDENCE_MANIFEST_SHA256);
	assert.equal(gate.freshFixRound.evidenceFileCount, TASK4_FRESH_EVIDENCE_FILE_COUNT);
	assert.equal(gate.freshFixRound.evidenceDirectory, gate.evidenceDirectory);

	for (const delta of TASK4_ROUND3_PANEL_MANIFEST_HASH_DELTAS) {
		const panelBytes = readFileSync(join(repositoryRoot, delta.path));
		assert.equal(
			createHash('sha256').update(panelBytes).digest('hex'),
			delta.afterSha256,
			`${delta.id} post-binding panel manifest hash must match current metadata`
		);
		const panel = JSON.parse(panelBytes.toString('utf8')) as {
			nativeDetailReview?: Record<string, unknown>;
			stage?: unknown;
		};
		assert.equal(panel.stage, 'pending-final-source-gate');
		assert.equal(panel.nativeDetailReview?.approval, 'approved-explicit-final-source-gate');
		assert.equal(panel.nativeDetailReview?.reviewStatus, 'approved-explicit-final-source-gate');
		assert.equal(panel.nativeDetailReview?.userAnswer, 'yes');
		assert.equal(panel.nativeDetailReview?.approvedAtUtc, TASK4_ROUND3_APPROVED_AT_UTC);
		assert.equal(panel.nativeDetailReview?.approvalCandidateSha256, TASK4_ROUND3_CANDIDATE_SHA256);
		assert.equal(
			panel.nativeDetailReview?.approvalEvidenceManifestSha256,
			TASK4_ROUND3_EVIDENCE_MANIFEST_SHA256
		);
		assert.equal(
			panel.nativeDetailReview?.approvalEvidenceFileCount,
			TASK4_ROUND3_EVIDENCE_FILE_COUNT
		);
		assert.equal(panel.nativeDetailReview?.runtimePermission, false);
		const supersededApproval = panel.nativeDetailReview?.supersededApproval as
			| Record<string, unknown>
			| undefined;
		assert.equal(supersededApproval?.userAnswer, 'yes');
		assert.equal(supersededApproval?.approvedAtUtc, TASK4_APPROVED_AT_UTC);
		assert.equal(supersededApproval?.approvalCandidateSha256, TASK4_APPROVAL_CANDIDATE_SHA256);
		assert.equal(
			supersededApproval?.approvalEvidenceManifestSha256,
			TASK4_EVIDENCE_MANIFEST_SHA256
		);
		assert.equal(supersededApproval?.supersededAtUtc, TASK4_SUPERSEDED_AT_UTC);
	}

	for (const id of ['crossroads-blocked-hedge', 'crossroads-blocked-woodland']) {
		const insert = readJson<{ review?: Record<string, unknown>; stage?: unknown }>(
			join(repositoryRoot, `artifacts/meadow-entry/painted-v2/source-inserts/${id}.json`)
		);
		assert.equal(insert.stage, TASK2_ORGANIC_APPROVAL_STAGE);
		assert.equal(insert.review?.approval, TASK2_ORGANIC_APPROVAL_STAGE);
		assert.equal(insert.review?.reviewStatus, TASK2_ORGANIC_APPROVAL_STAGE);
		assert.equal(insert.review?.userAnswer, TASK2_ORGANIC_APPROVAL_ANSWER);
		assert.equal(insert.review?.approvedAtUtc, TASK2_ORGANIC_APPROVED_AT_UTC);
		assert.equal(insert.review?.approvalCandidateSha256, TASK2_ORGANIC_CANDIDATE_SHA256);
		assert.equal(
			insert.review?.approvalEvidenceManifestSha256,
			TASK2_ORGANIC_EVIDENCE_MANIFEST_SHA256
		);
		assert.equal(insert.review?.approvalEvidenceFileCount, TASK2_ORGANIC_EVIDENCE_FILE_COUNT);
		assert.equal(insert.review?.runtimePermission, false);
		const supersededApproval = insert.review?.supersededApproval as
			| Record<string, unknown>
			| undefined;
		assert.equal(supersededApproval?.userAnswer, 'yes');
		assert.equal(supersededApproval?.approvedAtUtc, TASK4_APPROVED_AT_UTC);
		assert.equal(supersededApproval?.approvalCandidateSha256, TASK4_APPROVAL_CANDIDATE_SHA256);
		assert.equal(
			supersededApproval?.approvalEvidenceManifestSha256,
			TASK4_EVIDENCE_MANIFEST_SHA256
		);
		assert.equal(supersededApproval?.supersededAtUtc, TASK4_SUPERSEDED_AT_UTC);
	}

	const candidatePath = join(
		repositoryRoot,
		freshFixRound3.evidenceDirectory,
		'decoration-candidate.json'
	);
	const candidateBytes = readFileSync(candidatePath, 'utf8');
	assert.equal(
		createHash('sha256').update(candidateBytes).digest('hex'),
		TASK4_ROUND3_POST_BINDING_CANDIDATE_SHA256
	);
	const reconstructedCandidate = JSON.parse(candidateBytes) as {
		controls: { sourceHashes: Record<string, string> };
	};
	for (const delta of TASK4_ROUND3_PANEL_MANIFEST_HASH_DELTAS) {
		reconstructedCandidate.controls.sourceHashes[`raster:${delta.path}`] = delta.beforeSha256;
	}
	const reconstructedBytes = `${JSON.stringify(reconstructedCandidate, null, 2)}\n`;
	assert.equal(
		createHash('sha256').update(reconstructedBytes).digest('hex'),
		TASK4_ROUND3_CANDIDATE_SHA256,
		'removing only the current approval-driven panel source-hash deltas must reconstruct the approved pre-binding identity'
	);
});

function recursiveFiles(root: string): string[] {
	const entries = readdirSync(root, { withFileTypes: true });
	return entries.flatMap((entry) => {
		const path = join(root, entry.name);
		if (entry.isDirectory()) return recursiveFiles(path).map((nested) => join(entry.name, nested));
		return [relative(root, path)];
	});
}

async function writeCheckerMaster(path: string): Promise<void> {
	const checker = Buffer.alloc(512 * 512 * 4);
	for (let y = 0; y < 512; y += 1) {
		for (let x = 0; x < 512; x += 1) {
			const value = (x + y) % 2 === 0 ? 0 : 255;
			const offset = (y * 512 + x) * 4;
			checker[offset] = value;
			checker[offset + 1] = value;
			checker[offset + 2] = value;
			checker[offset + 3] = 255;
		}
	}
	await sharp(checker, { raw: { width: 512, height: 512, channels: 4 } })
		.resize(6_400, 6_400, { kernel: 'nearest' })
		.png()
		.toFile(path);
}

async function cellDigests(
	path: string,
	columns: number,
	rows: number
): Promise<readonly string[]> {
	const { data, info } = await sharp(path)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const cellSize = 512;
	assert.equal(info.width, columns * cellSize);
	assert.equal(info.height, rows * cellSize);
	return Array.from({ length: columns * rows }, (_, index) => {
		const cellX = (index % columns) * cellSize;
		const cellY = Math.floor(index / columns) * cellSize;
		const hash = createHash('sha256');
		for (let y = 0; y < cellSize; y += 1) {
			const start = ((cellY + y) * info.width + cellX) * info.channels;
			hash.update(data.subarray(start, start + cellSize * info.channels));
		}
		return hash.digest('hex');
	});
}

test(
	'candidate contact-sheet/source review inventory includes all five sheets and the final three tiles',
	{ timeout: 600_000 },
	async () => {
		const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
		const tempRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-review-'));
		const outputRoot = join(tempRoot, 'review');
		const masterPath = join(tempRoot, 'candidate-master.png');
		try {
			const candidateArgs = [
				join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
				'--mode',
				'candidate',
				'--master',
				masterPath,
				'--assemble-sources',
				'--contact-sheets',
				'--source-review',
				'--output-root',
				outputRoot
			];
			await writeCheckerMaster(masterPath);
			const result = spawnSync(process.execPath, candidateArgs, {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
			assert.equal(result.signal, null);
			const payload = JSON.parse(
				readFileSync(join(outputRoot, 'decoration-candidate.json'), 'utf8')
			) as {
				controls: { sourceHashes: Record<string, string> };
				energy: { qualifyingTileCount: number; sheetTileCounts: number[] };
				tiles: { index: number; id: string }[];
				evidence: Record<string, { sha256: string; bytes: number; width: number; height: number }>;
				blockedSceneryBake: {
					selectedWorldPixelCount: number;
					changedPixelCount: number;
					classChangedPixelCounts: Record<string, number>;
					enrichedSourceSha256: Record<string, string>;
					topologyRequests: {
						contributionIndex: number;
						blockerIds: string[];
						reasons: string[];
						insertId: string;
						worldIndex: number;
						rawWeight: number;
						shapedWeight: number;
					}[];
					topologyRequestSha256: string;
					intersections: {
						blockerId: string;
						insertId: string;
						q40: number;
						q80: number;
						sampleCount: number;
						rawWeightSha256: string;
						weightSha256: string;
					}[];
					rows: {
						blockerId: string;
						coverage: number;
						rawWeightSha256: string;
						weightSha256: string;
						metricKind: string;
						longestRunP95Ratio?: number;
						longestRunMaximumRatio?: number;
						longestConstantContourRunRatio?: number;
						contourProfileSha256?: string;
						topology: {
							kind: string;
							requestSha256: string;
							erosionCount?: number;
							missingSlicePromotionCount?: number;
							coveragePromotionCount?: number;
							promotedWorldPixelCount?: number;
						};
					}[];
					formulas: Record<string, string>;
					apron: {
						policy: {
							maximumDistance: number;
							nearRampDistance: number;
							maximumWeight: number;
							maximumChannelResidual: number;
							maximumLumaShift: number;
						};
						candidateSha256: Record<string, string>;
						allowedSha256: Record<string, string>;
						distanceSha256: Record<string, string>;
						weightSha256: string;
						changedPixelCount: number;
						classChangedPixelCounts: Record<string, number>;
					};
				};
			};
			assert.equal(payload.blockedSceneryBake.intersections.length, 16);
			assert.equal(payload.blockedSceneryBake.rows.length, 10);
			assert.deepEqual(
				payload.blockedSceneryBake.rows.map(({ blockerId }) => blockerId).sort(),
				[
					'coast-crossroads-mouth-bank',
					'mistfen-entry-bank-east',
					'silverpine-wall-A-east',
					'silverpine-wall-A-west',
					'silverpine-wall-B-north',
					'silverpine-wall-B-south',
					'silverpine-wall-C-east',
					'silverpine-wall-C-west',
					'wildwood-forest-lane-west-bank',
					'wildwood-north-climb-west-bank'
				].sort()
			);
			assert.equal(payload.blockedSceneryBake.changedPixelCount > 0, true);
			assert.equal(payload.blockedSceneryBake.selectedWorldPixelCount > 0, true);
			assert.deepEqual(payload.blockedSceneryBake.apron.policy, {
				maximumDistance: 48,
				nearRampDistance: 8,
				maximumWeight: 96,
				maximumChannelResidual: 12,
				maximumLumaShift: 16
			});
			assert.equal(payload.blockedSceneryBake.apron.changedPixelCount > 0, true);
			for (const hashes of [
				payload.blockedSceneryBake.apron.candidateSha256,
				payload.blockedSceneryBake.apron.allowedSha256,
				payload.blockedSceneryBake.apron.distanceSha256
			])
				for (const hash of Object.values(hashes)) assert.match(hash, /^[a-f0-9]{64}$/);
			assert.match(payload.blockedSceneryBake.apron.weightSha256, /^[a-f0-9]{64}$/);
			assert.deepEqual(Object.keys(payload.blockedSceneryBake.classChangedPixelCounts).sort(), [
				'hedge',
				'woodland'
			]);
			assert.deepEqual(Object.keys(payload.blockedSceneryBake.enrichedSourceSha256).sort(), [
				'camera-underlay-crossroads-north',
				'camera-underlay-crossroads-south',
				'camera-underlay-sundrop-south',
				'crossroads'
			]);
			for (const [panelId, expectedHash] of Object.entries(
				payload.blockedSceneryBake.enrichedSourceSha256
			)) {
				const ownerBytes = await sharp(join(outputRoot, `enriched-owner-${panelId}.png`))
					.ensureAlpha()
					.raw()
					.toBuffer();
				assert.equal(
					createHash('sha256').update(ownerBytes).digest('hex'),
					expectedHash,
					`enriched owner evidence is not the projected world panel: ${panelId}`
				);
			}
			assert.equal(payload.blockedSceneryBake.topologyRequests.length > 0, true);
			assert.match(payload.blockedSceneryBake.topologyRequestSha256, /^[a-f0-9]{64}$/);
			assert.equal(
				payload.blockedSceneryBake.topologyRequestSha256,
				stableHash(payload.blockedSceneryBake.topologyRequests)
			);
			const requestIndexes = payload.blockedSceneryBake.topologyRequests.map(
				({ contributionIndex }) => contributionIndex
			);
			assert.deepEqual(
				requestIndexes,
				[...requestIndexes].sort((left, right) => left - right)
			);
			for (const request of payload.blockedSceneryBake.topologyRequests) {
				assert.equal(Number.isInteger(request.contributionIndex), true);
				assert.equal(request.blockerIds.length > 0, true);
				assert.equal(request.reasons.length > 0, true);
				assert.deepEqual(request.blockerIds, [...new Set(request.blockerIds)].sort());
				assert.deepEqual(request.reasons, [...new Set(request.reasons)].sort());
				assert.equal(Number.isInteger(request.worldIndex), true);
				assert.equal(
					request.shapedWeight >= request.rawWeight || request.shapedWeight === 191,
					true
				);
			}
			for (const intersection of payload.blockedSceneryBake.intersections) {
				assert.equal(intersection.sampleCount >= 64, true);
				assert.equal(intersection.q40 < intersection.q80, true);
				assert.match(intersection.rawWeightSha256, /^[a-f0-9]{64}$/);
				assert.match(intersection.weightSha256, /^[a-f0-9]{64}$/);
			}
			for (const row of payload.blockedSceneryBake.rows) {
				assert.equal(Number.isFinite(row.coverage), true);
				assert.equal(row.coverage >= 0 && row.coverage <= 1, true);
				assert.match(row.rawWeightSha256, /^[a-f0-9]{64}$/);
				assert.match(row.weightSha256, /^[a-f0-9]{64}$/);
				assert.match(row.topology.requestSha256, /^[a-f0-9]{64}$/);
				assert.equal(
					row.topology.requestSha256,
					stableHash(
						payload.blockedSceneryBake.topologyRequests.filter(({ blockerIds }) =>
							blockerIds.includes(row.blockerId)
						)
					)
				);
				if (row.metricKind === 'clump-runs') {
					assert.equal(row.topology.kind, 'sparse-core-cap');
					assert.equal(Number.isInteger(row.topology.erosionCount), true);
					assert.equal(Number.isFinite(row.longestRunP95Ratio), true);
					assert.equal(Number.isFinite(row.longestRunMaximumRatio), true);
					assert.equal((row.longestRunP95Ratio ?? -1) >= 0, true);
					assert.equal((row.longestRunMaximumRatio ?? -1) >= 0, true);
				} else {
					assert.equal(row.topology.kind, 'tree-continuity-floor');
					assert.equal(Number.isInteger(row.topology.missingSlicePromotionCount), true);
					assert.equal(Number.isInteger(row.topology.coveragePromotionCount), true);
					assert.equal(Number.isInteger(row.topology.promotedWorldPixelCount), true);
					assert.equal(Number.isFinite(row.longestConstantContourRunRatio), true);
					assert.equal((row.longestConstantContourRunRatio ?? -1) >= 0, true);
					assert.match(row.contourProfileSha256 ?? '', /^[a-f0-9]{64}$/);
				}
			}
			const bSouth = payload.blockedSceneryBake.rows.find(
				(row) => row.blockerId === 'silverpine-wall-B-south'
			);
			assert.ok(bSouth);
			assert.equal(bSouth.rawWeightSha256, bSouth.weightSha256);
			assert.equal(bSouth.topology.kind, 'tree-continuity-floor');
			assert.equal(bSouth.topology.missingSlicePromotionCount, 0);
			assert.equal(bSouth.topology.coveragePromotionCount, 0);
			assert.equal(bSouth.topology.promotedWorldPixelCount, 0);
			assert.equal(
				payload.blockedSceneryBake.topologyRequests.some(({ blockerIds }) =>
					blockerIds.includes('silverpine-wall-B-south')
				),
				false
			);
			const bSouthIntersections = payload.blockedSceneryBake.intersections.filter(
				({ blockerId }) => blockerId === 'silverpine-wall-B-south'
			);
			assert.ok(bSouthIntersections.length > 0);
			for (const intersection of bSouthIntersections)
				assert.equal(intersection.rawWeightSha256, intersection.weightSha256);
			assert.equal(
				payload.blockedSceneryBake.formulas.weightedCoverageThreshold,
				'finalWeight>=32'
			);
			const maskInventory = JSON.parse(
				readFileSync(join(outputRoot, 'mask-inventory.json'), 'utf8')
			) as {
				masks: Record<string, unknown>;
				sourceHashes: Record<string, string>;
			};
			assert.deepEqual(Object.keys(maskInventory.masks).sort(), [
				'groundAllowed',
				'hedgeAllowed',
				'otherProtected',
				'sceneryAllowed',
				'woodlandAllowed'
			]);
			assert.deepEqual(maskInventory.sourceHashes, payload.controls.sourceHashes);
			for (const key of [
				'derivation:inside-crop-union',
				'derivation:route-core',
				'derivation:mask-authority'
			])
				assert.match(maskInventory.sourceHashes[key] ?? '', /^[a-f0-9]{64}$/);
			assert.equal(payload.energy.qualifyingTileCount, 67);
			assert.deepEqual(payload.energy.sheetTileCounts, [16, 16, 16, 16, 3]);
			const organicInventory = JSON.parse(
				readFileSync(join(outputRoot, 'organic-scenery-inventory.json'), 'utf8')
			) as {
				selectedWorldPixelCount: number;
				policy: Record<string, number>;
				publicMasks: Record<string, { sha256: string }>;
				scratch: {
					candidateSha256: Record<string, string>;
					allowedSha256: Record<string, string>;
					distanceSha256: Record<string, string>;
					weightSha256: string;
				};
				candidateMasterSha256: string;
			};
			assert.equal(
				organicInventory.selectedWorldPixelCount,
				payload.blockedSceneryBake.selectedWorldPixelCount
			);
			assert.deepEqual(organicInventory.policy, payload.blockedSceneryBake.apron.policy);
			assert.deepEqual(Object.keys(organicInventory.publicMasks).sort(), [
				'groundAllowed',
				'hedgeAllowed',
				'otherProtected',
				'sceneryAllowed',
				'woodlandAllowed'
			]);
			assert.deepEqual(
				organicInventory.scratch.candidateSha256,
				payload.blockedSceneryBake.apron.candidateSha256
			);
			assert.deepEqual(
				organicInventory.scratch.allowedSha256,
				payload.blockedSceneryBake.apron.allowedSha256
			);
			assert.deepEqual(
				organicInventory.scratch.distanceSha256,
				payload.blockedSceneryBake.apron.distanceSha256
			);
			assert.equal(
				organicInventory.scratch.weightSha256,
				payload.blockedSceneryBake.apron.weightSha256
			);
			assert.equal(
				organicInventory.candidateMasterSha256,
				createHash('sha256')
					.update(
						readFileSync(join(outputRoot, 'masters/meadow-entry-painted-v2-pilot-base-master.png'))
					)
					.digest('hex')
			);
			assert.deepEqual(
				Object.keys(payload.evidence).sort(),
				[...EXPECTED_CANDIDATE_INVENTORY].filter((path) => path.endsWith('.png')).sort()
			);
			for (const [relativePath, descriptor] of Object.entries(payload.evidence)) {
				const bytes = readFileSync(join(outputRoot, relativePath));
				assert.equal(descriptor.sha256, createHash('sha256').update(bytes).digest('hex'));
				assert.equal(descriptor.bytes, bytes.byteLength);
				const metadata = await sharp(bytes).metadata();
				assert.deepEqual(
					{ width: descriptor.width, height: descriptor.height },
					{ width: metadata.width, height: metadata.height }
				);
			}
			assert.deepEqual(
				payload.tiles.slice(-3).map(({ index, id }) => [index, id]),
				[
					[64, 'decoration-64'],
					[65, 'decoration-65'],
					[66, 'decoration-66']
				]
			);
			assert.deepEqual(recursiveFiles(outputRoot).sort(), [...EXPECTED_CANDIDATE_INVENTORY].sort());
			assert.equal(
				existsSync(join(repositoryRoot, 'public/game/assets/regions/meadow-entry-painted-v2')),
				true
			);
			const panelPath = join(outputRoot, 'panel-camera-underlay-sundrop-north-original.png');
			const panelMetadata = await sharp(panelPath).metadata();
			assert.deepEqual(
				{ width: panelMetadata.width, height: panelMetadata.height },
				{ width: 3200, height: 1664 }
			);
			const panelSample = await sharp(panelPath)
				.resize(3, 2, { fit: 'fill' })
				.ensureAlpha()
				.raw()
				.toBuffer();
			assert(
				new Set(
					Array.from({ length: 6 }, (_, index) =>
						panelSample.subarray(index * 4, index * 4 + 4).toString('hex')
					)
				).size >= 4
			);
			assert.equal(
				new Set(await cellDigests(join(outputRoot, 'detail-sundrop-sides-corners.png'), 4, 2))
					.size >= 3,
				true
			);
			assert.notDeepEqual(
				readFileSync(join(outputRoot, 'detail-sundrop-sides-corners.png')),
				readFileSync(join(outputRoot, 'detail-sundrop-intersection.png'))
			);

			const requiredInsertReview = join(outputRoot, `insert-${INSERT_IDS[0]}-review.png`);
			const requiredInsertReviewBytes = readFileSync(requiredInsertReview);
			unlinkSync(requiredInsertReview);
			const missingInsertCheck = spawnSync(process.execPath, [...candidateArgs, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.notEqual(missingInsertCheck.status, 0);
			assert.match(
				`${missingInsertCheck.stdout}\n${missingInsertCheck.stderr}`,
				/review artifact is missing/
			);
			writeFileSync(requiredInsertReview, requiredInsertReviewBytes);

			const candidateJsonPath = join(outputRoot, 'decoration-candidate.json');
			const candidateJsonBeforeBaseline = readFileSync(candidateJsonPath);
			const baselineResult = spawnSync(
				process.execPath,
				[
					join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
					'--mode',
					'baseline',
					'--master',
					'artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png',
					'--output-root',
					outputRoot
				],
				{ cwd: repositoryRoot, encoding: 'utf8' }
			);
			assert.equal(baselineResult.status, 0, `${baselineResult.stdout}\n${baselineResult.stderr}`);
			assert.equal(existsSync(join(outputRoot, 'decoration-baseline.json')), true);
			assert.deepEqual(readFileSync(candidateJsonPath), candidateJsonBeforeBaseline);
			const baselineCheck = spawnSync(
				process.execPath,
				[
					join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
					'--mode',
					'baseline',
					'--master',
					'artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png',
					'--output-root',
					outputRoot,
					'--check'
				],
				{ cwd: repositoryRoot, encoding: 'utf8' }
			);
			assert.equal(baselineCheck.status, 0, `${baselineCheck.stdout}\n${baselineCheck.stderr}`);

			const candidateCheck = spawnSync(process.execPath, [...candidateArgs, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.equal(candidateCheck.status, 0, `${candidateCheck.stdout}\n${candidateCheck.stderr}`);

			const candidateEvidenceBytes = readFileSync(candidateJsonPath);
			const candidateEvidence = JSON.parse(candidateEvidenceBytes.toString('utf8')) as {
				blockedSceneryBake: {
					selectedWorldPixelCount: number;
					enrichedSourceSha256: Record<string, string>;
					rows: unknown[];
					apron: { weightSha256: string };
				};
			};
			const inventoryPath = join(outputRoot, 'organic-scenery-inventory.json');
			const inventoryEvidenceBytes = readFileSync(inventoryPath);
			const inventoryEvidence = JSON.parse(inventoryEvidenceBytes.toString('utf8')) as {
				selectedWorldPixelCount: number;
				publicMasks: Record<string, unknown>;
			};
			const expectCandidateCheckFailure = (pattern: RegExp) => {
				const check = spawnSync(process.execPath, [...candidateArgs, '--check'], {
					cwd: repositoryRoot,
					encoding: 'utf8'
				});
				assert.notEqual(check.status, 0);
				assert.match(`${check.stdout}\n${check.stderr}`, pattern);
			};

			candidateEvidence.blockedSceneryBake.rows =
				candidateEvidence.blockedSceneryBake.rows.slice(1);
			writeFileSync(candidateJsonPath, JSON.stringify(candidateEvidence));
			expectCandidateCheckFailure(/blocker rows are missing or extra/);
			writeFileSync(candidateJsonPath, candidateEvidenceBytes);

			candidateEvidence.blockedSceneryBake.rows = [
				...candidateEvidence.blockedSceneryBake.rows,
				candidateEvidence.blockedSceneryBake.rows[0]
			];
			writeFileSync(candidateJsonPath, JSON.stringify(candidateEvidence));
			expectCandidateCheckFailure(/blocker rows are missing or extra/);
			writeFileSync(candidateJsonPath, candidateEvidenceBytes);

			candidateEvidence.blockedSceneryBake.apron.weightSha256 = '0'.repeat(64);
			writeFileSync(candidateJsonPath, JSON.stringify(candidateEvidence));
			expectCandidateCheckFailure(/organic apron hash does not match candidate result/);
			writeFileSync(candidateJsonPath, candidateEvidenceBytes);

			inventoryEvidence.selectedWorldPixelCount += 1;
			writeFileSync(inventoryPath, JSON.stringify(inventoryEvidence));
			expectCandidateCheckFailure(/selected world-pixel count does not match candidate result/);
			writeFileSync(inventoryPath, inventoryEvidenceBytes);

			const candidateEvidenceForOwner = JSON.parse(candidateEvidenceBytes.toString('utf8')) as {
				blockedSceneryBake: { enrichedSourceSha256: Record<string, string> };
			};
			candidateEvidenceForOwner.blockedSceneryBake.enrichedSourceSha256[
				'camera-underlay-sundrop-south'
			] = '0'.repeat(64);
			writeFileSync(candidateJsonPath, JSON.stringify(candidateEvidenceForOwner));
			expectCandidateCheckFailure(/enriched owner evidence does not match projected panel hash/);
			writeFileSync(candidateJsonPath, candidateEvidenceBytes);

			const candidateEvidenceWithMissingOwner = JSON.parse(
				candidateEvidenceBytes.toString('utf8')
			) as { blockedSceneryBake: { enrichedSourceSha256: Record<string, string> } };
			delete candidateEvidenceWithMissingOwner.blockedSceneryBake.enrichedSourceSha256[
				'camera-underlay-sundrop-south'
			];
			writeFileSync(candidateJsonPath, JSON.stringify(candidateEvidenceWithMissingOwner));
			expectCandidateCheckFailure(/enriched owner provenance must contain the exact projected set/);
			writeFileSync(candidateJsonPath, candidateEvidenceBytes);

			const inventoryEvidenceForMasks = JSON.parse(inventoryEvidenceBytes.toString('utf8')) as {
				publicMasks: Record<string, unknown>;
			};
			inventoryEvidenceForMasks.publicMasks.sixthScratchMask = {
				sha256: '0'.repeat(64),
				pixels: 0
			};
			writeFileSync(inventoryPath, JSON.stringify(inventoryEvidenceForMasks));
			expectCandidateCheckFailure(/public mask set must contain exactly five masks/);
			writeFileSync(inventoryPath, inventoryEvidenceBytes);

			const densityPath = join(outputRoot, 'decoration-density-05.png');
			const densityBytes = readFileSync(densityPath);
			writeFileSync(densityPath, Buffer.from('stale density evidence\n'));
			const staleDensityCheck = spawnSync(process.execPath, [...candidateArgs, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.notEqual(staleDensityCheck.status, 0);
			assert.match(
				`${staleDensityCheck.stdout}\n${staleDensityCheck.stderr}`,
				/review artifact is stale/
			);
			assert.deepEqual(readFileSync(densityPath), Buffer.from('stale density evidence\n'));
			writeFileSync(densityPath, densityBytes);

			const sourceReviewPath = join(outputRoot, 'detail-sundrop-sides-corners.png');
			const sourceReviewBytes = readFileSync(sourceReviewPath);
			writeFileSync(sourceReviewPath, Buffer.from('stale source review evidence\n'));
			const staleSourceReviewCheck = spawnSync(process.execPath, [...candidateArgs, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.notEqual(staleSourceReviewCheck.status, 0);
			assert.match(
				`${staleSourceReviewCheck.stdout}\n${staleSourceReviewCheck.stderr}`,
				/review artifact is stale/
			);
			assert.deepEqual(
				readFileSync(sourceReviewPath),
				Buffer.from('stale source review evidence\n')
			);
			writeFileSync(sourceReviewPath, sourceReviewBytes);

			writeFileSync(candidateJsonPath, Buffer.from('stale review evidence\n'));
			const staleCheck = spawnSync(process.execPath, [...candidateArgs, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.notEqual(staleCheck.status, 0);
			assert.match(`${staleCheck.stdout}\n${staleCheck.stderr}`, /review artifact is stale/);
			assert.deepEqual(readFileSync(candidateJsonPath), Buffer.from('stale review evidence\n'));
		} finally {
			rmSync(tempRoot, { recursive: true, force: true });
		}
	}
);

test(
	'--assemble-sources writes only the review master and two exact crops',
	{ timeout: 60_000 },
	async () => {
		const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
		const outputRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-assembly-'));
		try {
			const result = spawnSync(
				process.execPath,
				[
					join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
					'--mode',
					'baseline',
					'--assemble-sources',
					'--output-root',
					outputRoot
				],
				{ cwd: repositoryRoot, encoding: 'utf8' }
			);
			assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
			assert.deepEqual(readdirSync(join(outputRoot, 'masters')), [
				'meadow-entry-painted-v2-pilot-base-master.png'
			]);
			assert.deepEqual(readdirSync(join(outputRoot, 'exports')).sort(), [
				'painted-v2-crossroads-camera-base.png',
				'painted-v2-sundrop-camera-base.png'
			]);
			assert.deepEqual(readdirSync(outputRoot).sort(), [
				'decoration-baseline.json',
				'exports',
				'masters'
			]);
			const masterMetadata = await sharp(
				join(outputRoot, 'masters/meadow-entry-painted-v2-pilot-base-master.png')
			).metadata();
			assert.deepEqual(
				{ width: masterMetadata.width, height: masterMetadata.height },
				{ width: 6_400, height: 6_400 }
			);
			for (const filename of [
				'painted-v2-sundrop-camera-base.png',
				'painted-v2-crossroads-camera-base.png'
			]) {
				const metadata = await sharp(join(outputRoot, 'exports', filename)).metadata();
				assert.deepEqual(
					{ width: metadata.width, height: metadata.height },
					{ width: 3_200, height: 3_200 }
				);
			}
		} finally {
			rmSync(outputRoot, { recursive: true, force: true });
		}
	}
);

test(
	'candidate assembly measures the newly assembled master and check never rewrites stale outputs',
	{ timeout: 420_000 },
	async () => {
		const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
		const outputRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-candidate-assembly-'));
		const baselineRoot = `${outputRoot}-baseline`;
		try {
			const args = [
				join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
				'--mode',
				'candidate',
				'--assemble-sources',
				'--output-root',
				outputRoot
			];
			const generate = spawnSync(process.execPath, args, {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.equal(generate.status, 0, `${generate.stdout}\n${generate.stderr}`);

			const masterPath = join(outputRoot, 'masters/meadow-entry-painted-v2-pilot-base-master.png');
			const candidateJsonPath = join(outputRoot, 'decoration-candidate.json');
			const assembledMaster = readFileSync(masterPath);
			const payload = JSON.parse(readFileSync(candidateJsonPath, 'utf8')) as {
				master: { sha256: string; path: string };
				preSceneryMaster: { sha256: string; bytes: number; width: number; height: number };
				energy: { qualifyingTileCount: number; sheetTileCounts: number[] };
			};
			assert.equal(
				payload.master.sha256,
				createHash('sha256').update(assembledMaster).digest('hex')
			);
			assert.equal(payload.master.path, relative(repositoryRoot, masterPath));
			const baseline = spawnSync(
				process.execPath,
				[
					join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
					'--mode',
					'baseline',
					'--assemble-sources',
					'--output-root',
					baselineRoot
				],
				{ cwd: repositoryRoot, encoding: 'utf8' }
			);
			assert.equal(baseline.status, 0, `${baseline.stdout}\n${baseline.stderr}`);
			const baselineMaster = readFileSync(
				join(baselineRoot, 'masters/meadow-entry-painted-v2-pilot-base-master.png')
			);
			assert.deepEqual(payload.preSceneryMaster, {
				sha256: createHash('sha256').update(baselineMaster).digest('hex'),
				bytes: baselineMaster.byteLength,
				width: 6_400,
				height: 6_400
			});
			assert.equal(payload.energy.qualifyingTileCount, 67);
			assert.deepEqual(payload.energy.sheetTileCounts, [16, 16, 16, 16, 3]);

			const candidateBeforeCheck = readFileSync(candidateJsonPath);
			const masterBeforeCheck = readFileSync(masterPath);
			const check = spawnSync(process.execPath, [...args, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`);
			assert.deepEqual(readFileSync(candidateJsonPath), candidateBeforeCheck);
			assert.deepEqual(readFileSync(masterPath), masterBeforeCheck);

			const staleMaster = Buffer.from('stale assembled master evidence\n');
			writeFileSync(masterPath, staleMaster);
			const staleCheck = spawnSync(process.execPath, [...args, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.notEqual(staleCheck.status, 0);
			assert.match(`${staleCheck.stdout}\n${staleCheck.stderr}`, /review artifact is stale/);
			assert.deepEqual(readFileSync(masterPath), staleMaster);
		} finally {
			rmSync(outputRoot, { recursive: true, force: true });
			rmSync(baselineRoot, { recursive: true, force: true });
		}
	}
);

test('--check does not create a missing output root', () => {
	const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const tempRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-missing-'));
	const outputRoot = join(tempRoot, 'missing-review');
	try {
		assert.equal(existsSync(outputRoot), false);
		const result = spawnSync(
			process.execPath,
			[
				join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
				'--mode',
				'baseline',
				'--check',
				'--output-root',
				outputRoot
			],
			{ cwd: repositoryRoot, encoding: 'utf8' }
		);
		assert.notEqual(result.status, 0);
		assert.match(`${result.stdout}\n${result.stderr}`, /output root is missing/);
		assert.equal(existsSync(outputRoot), false);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

test(
	'--check detects stale assembled outputs without rewriting them',
	{ timeout: 90_000 },
	async () => {
		const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
		const outputRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-assembly-check-'));
		try {
			const generate = spawnSync(
				process.execPath,
				[
					join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
					'--mode',
					'baseline',
					'--assemble-sources',
					'--output-root',
					outputRoot
				],
				{ cwd: repositoryRoot, encoding: 'utf8' }
			);
			assert.equal(generate.status, 0, `${generate.stdout}\n${generate.stderr}`);
			const masterPath = join(outputRoot, 'masters/meadow-entry-painted-v2-pilot-base-master.png');
			writeFileSync(masterPath, Buffer.from('stale assembly evidence\n'));
			const check = spawnSync(
				process.execPath,
				[
					join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
					'--mode',
					'baseline',
					'--assemble-sources',
					'--check',
					'--output-root',
					outputRoot
				],
				{ cwd: repositoryRoot, encoding: 'utf8' }
			);
			assert.notEqual(check.status, 0);
			assert.match(`${check.stdout}\n${check.stderr}`, /review artifact is stale/);
			assert.deepEqual(readFileSync(masterPath), Buffer.from('stale assembly evidence\n'));
		} finally {
			rmSync(outputRoot, { recursive: true, force: true });
		}
	}
);

test(
	'candidate JSON claims native inspection only when source review is requested',
	{ timeout: 60_000 },
	async () => {
		const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
		const tempRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-claim-'));
		const outputRoot = join(tempRoot, 'review');
		const masterPath = join(tempRoot, 'candidate-master.png');
		try {
			await writeCheckerMaster(masterPath);
			const result = spawnSync(
				process.execPath,
				[
					join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
					'--mode',
					'candidate',
					'--master',
					masterPath,
					'--output-root',
					outputRoot
				],
				{ cwd: repositoryRoot, encoding: 'utf8' }
			);
			assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
			const payload = JSON.parse(
				readFileSync(join(outputRoot, 'decoration-candidate.json'), 'utf8')
			) as {
				fullPanelOriginalDetailInspection?: boolean;
				sourcePanels?: readonly unknown[];
			};
			assert.equal(payload.fullPanelOriginalDetailInspection, undefined);
			assert.equal(payload.sourcePanels, undefined);
		} finally {
			rmSync(tempRoot, { recursive: true, force: true });
		}
	}
);

test('review output rejects every repository path outside the sealed world-canonical-v2 review root', () => {
	const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	for (const outputRoot of [
		'.',
		'artifacts/meadow-entry/painted-v2',
		'artifacts/meadow-entry/painted-v2/source-inserts',
		'public/game/assets/regions/meadow-entry-painted-v2',
		'docs/superpowers/reports/img/hpa-586-painted-v2-organic-scenery'
	]) {
		const result = spawnSync(
			process.execPath,
			[
				join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
				'--mode',
				'baseline',
				'--output-root',
				outputRoot
			],
			{ cwd: repositoryRoot, encoding: 'utf8' }
		);
		assert.notEqual(result.status, 0, `unsafe repository output root was accepted: ${outputRoot}`);
		assert.match(
			`${result.stdout}\n${result.stderr}`,
			/must be outside the repository or inside the sealed world-canonical-v2 review root/
		);
	}
});

test('review artifact path guard rejects escaping output paths', () => {
	const outputRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-path-'));
	try {
		assert.throws(
			() => assertReviewArtifactPathWithinRoot(outputRoot, '../outside-review-artifact.png'),
			/escapes requested output root/
		);
		assert.doesNotThrow(() =>
			assertReviewArtifactPathWithinRoot(outputRoot, 'nested/review-artifact.png')
		);
	} finally {
		rmSync(outputRoot, { recursive: true, force: true });
	}
});

test('candidate review defaults to the world-canonical-v2 output root', () => {
	assert.match(DEFAULT_OUTPUT_ROOT, /(?:^|\/)world-canonical-v2$/);
});

test('review crop overlap guard compares exported overlap bytes in world coordinates', () => {
	const firstBounds = { left: 0, top: 0, right: 3, bottom: 2 };
	const secondBounds = { left: 1, top: 1, right: 4, bottom: 3 };
	const overlapBounds = { left: 1, top: 1, right: 3, bottom: 2 };
	const first = Buffer.alloc(3 * 2 * 4);
	const second = Buffer.alloc(3 * 2 * 4);
	const write = (buffer: Buffer, bounds: typeof firstBounds, x: number, y: number) => {
		const offset = ((y - bounds.top) * (bounds.right - bounds.left) + x - bounds.left) * 4;
		buffer[offset] = x;
		buffer[offset + 1] = y;
		buffer[offset + 2] = x + y;
		buffer[offset + 3] = 255;
	};
	for (let y = overlapBounds.top; y < overlapBounds.bottom; y += 1)
		for (let x = overlapBounds.left; x < overlapBounds.right; x += 1) {
			write(first, firstBounds, x, y);
			write(second, secondBounds, x, y);
		}
	assert.doesNotThrow(() =>
		assertReviewCropOverlapBuffersEqual(first, firstBounds, second, secondBounds, overlapBounds)
	);
	second[(0 * 3 + 0) * 4] = 99;
	assert.throws(
		() =>
			assertReviewCropOverlapBuffersEqual(first, firstBounds, second, secondBounds, overlapBounds),
		/overlap bytes differ/
	);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { readFileSync } from 'node:fs';

import { createHash } from 'node:crypto';

import {
	PAINTED_V2_TEXTURE_PROBE_INPUTS,
	parseMeadowEntryTextureProbeArguments,
	paintedV2TextureProbeInput,
	paintedV2TextureProbeRepresentativePaths,
	runMeadowEntryTextureSafetyProbe
} from './probe-meadow-entry-texture-safety';
import { meadowEntryPaintedV2ArtPackageApproval } from '$lib/game/content/approvals/meadow-entry-painted-v2-art-package';
import {
	decodeMeadowEntryRgba,
	validateCanonicalPngChunks
} from '$lib/game/content/backgrounds/meadow-entry-png';

type BunServe = (...arguments_: unknown[]) => unknown;

const bunLike = globalThis as typeof globalThis & {
	Bun?: { serve?: BunServe };
};

test('returns a structured stop report when temporary Bun server setup fails', async (t) => {
	const bun = bunLike.Bun;
	if (!bun || typeof bun.serve !== 'function') {
		t.skip('globalThis.Bun.serve is unavailable; run this suite under bun');
		return;
	}

	const originalServe = bun.serve;
	bun.serve = (() => {
		throw new Error('forced temporary Bun server setup failure');
	}) as BunServe;

	try {
		const input = {
			label: 'painted-v2-clean-baseline',
			assets: [],
			expectedRetainedTextures: 0
		} as const;
		let report: Awaited<ReturnType<typeof runMeadowEntryTextureSafetyProbe>> | undefined;
		let thrown: unknown;
		try {
			report = await runMeadowEntryTextureSafetyProbe(input);
		} catch (error) {
			thrown = error;
		}

		assert.equal(
			thrown,
			undefined,
			`expected a structured stop report, received ${
				thrown instanceof Error ? thrown.message : String(thrown)
			}`
		);
		assert.ok(report);
		assert.deepEqual(
			{
				label: report.label,
				expectedRetainedTextures: report.expectedRetainedTextures,
				assetCount: report.assetCount,
				successfulUploads: report.successfulUploads,
				retainedTextures: report.retainedTextures,
				maxTextureSize: report.maxTextureSize,
				contextLost: report.contextLost,
				webglAvailable: report.webglAvailable,
				assets: report.assets,
				probeFailure: report.probeFailure,
				failureScope: report.failureScope,
				decision: report.decision
			},
			{
				label: 'painted-v2-clean-baseline',
				expectedRetainedTextures: 0,
				assetCount: 0,
				successfulUploads: 0,
				retainedTextures: 0,
				maxTextureSize: null,
				contextLost: null,
				webglAvailable: false,
				assets: [],
				probeFailure: 'forced temporary Bun server setup failure',
				failureScope: 'probe-setup',
				decision: 'stop'
			}
		);
	} finally {
		bun.serve = originalServe;
	}
});

test('does not depend on the historical Meadow Entry approval module', () => {
	const source = readFileSync(
		new URL('./probe-meadow-entry-texture-safety.ts', import.meta.url),
		'utf8'
	);
	assert.doesNotMatch(source, /meadowEntryArtPackageApproval/);
});

test('defines fixed 2x2 and 4x4 candidate sets with exact retention contracts', () => {
	const twoByTwo = PAINTED_V2_TEXTURE_PROBE_INPUTS['painted-v2-2x2'];
	const fourByFour = PAINTED_V2_TEXTURE_PROBE_INPUTS['painted-v2-4x4'];

	assert.equal(twoByTwo.assets.length, 4);
	assert.equal(fourByFour.assets.length, 16);
	assert.equal(twoByTwo.expectedRetainedTextures, 4);
	assert.equal(fourByFour.expectedRetainedTextures, 16);
	assert.equal(twoByTwo.label, 'painted-v2-2x2');
	assert.equal(fourByFour.label, 'painted-v2-4x4');
	assert.equal(new Set(twoByTwo.assets.map(({ id }) => id)).size, 4);
	assert.equal(new Set(fourByFour.assets.map(({ id }) => id)).size, 16);
	assert.deepEqual(
		new Set(twoByTwo.assets.map(({ path }) => path)),
		new Set([paintedV2TextureProbeRepresentativePaths['3200']])
	);
	assert.deepEqual(
		new Set(fourByFour.assets.map(({ path }) => path)),
		new Set([paintedV2TextureProbeRepresentativePaths['1600']])
	);
	for (const asset of [...twoByTwo.assets, ...fourByFour.assets]) {
		assert.ok(asset.encodedBytes !== undefined && asset.encodedBytes > 0);
		assert.equal(asset.width, asset.height);
	}
	for (const asset of twoByTwo.assets) {
		assert.equal(asset.width, 3200);
		assert.equal(asset.height, 3200);
	}
	for (const asset of fourByFour.assets) {
		assert.equal(asset.width, 1600);
		assert.equal(asset.height, 1600);
	}
});

test('defines the exact two-texture camera-safe pilot candidate from Task 4 approval', async () => {
	const candidate = PAINTED_V2_TEXTURE_PROBE_INPUTS['painted-v2-camera-safe-pilot'];
	const expected = [
		{
			id: 'sundrop-camera-base',
			path: 'artifacts/meadow-entry/painted-v2/exports/painted-v2-sundrop-camera-base.png',
			width: 3200,
			height: 3200,
			encodedBytes: 28_222_237,
			encodedSha256: '0b85449a2c9ee83b86848aadf0d1ace8004601dbdf48317d95f9696809aed870'
		},
		{
			id: 'crossroads-camera-base',
			path: 'artifacts/meadow-entry/painted-v2/exports/painted-v2-crossroads-camera-base.png',
			width: 3200,
			height: 3200,
			encodedBytes: 29_695_252,
			encodedSha256: '5c5f3966895daf623a04ee093f2c3c227f7cdf9030eab8d7d239f955d9a41db3'
		}
	] as const;

	assert.equal(candidate.label, 'painted-v2-camera-safe-pilot');
	assert.equal(candidate.expectedRetainedTextures, 2);
	assert.equal(candidate.assets.length, 2);
	assert.equal(new Set(candidate.assets.map(({ id }) => id)).size, 2);
	assert.deepEqual(candidate.assets, expected);

	for (const asset of expected) {
		const approved = meadowEntryPaintedV2ArtPackageApproval.exports.find(
			({ path }) => path === asset.path
		);
		assert.ok(approved, `Task 4 approval is missing ${asset.path}`);
		assert.equal(approved.bytes, asset.encodedBytes);
		assert.equal(approved.sha256, asset.encodedSha256);

		const bytes = readFileSync(asset.path);
		assert.equal(bytes.byteLength, asset.encodedBytes);
		assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.encodedSha256);
		validateCanonicalPngChunks(bytes);
		const decoded = await decodeMeadowEntryRgba(bytes);
		assert.deepEqual(
			{ width: decoded.width, height: decoded.height },
			{ width: asset.width, height: asset.height }
		);
	}
});

test('binds the frozen camera-safe browser report to the current approved candidate', () => {
	const candidate = PAINTED_V2_TEXTURE_PROBE_INPUTS['painted-v2-camera-safe-pilot'];
	const report = JSON.parse(
		readFileSync(
			'artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-camera-safe-pilot.json',
			'utf8'
		)
	) as {
		label: string;
		assetCount: number;
		successfulUploads: number;
		retainedTextures: number;
		maxTextureSize: number | null;
		contextLost: boolean | null;
		webglAvailable: boolean;
		assets: Array<{
			id: string;
			path: string;
			width: number;
			height: number;
			encodedBytes: number;
			encodedSha256: string;
			durationMs: number;
			success: boolean;
			failure: string | null;
		}>;
		encodedBytesTotal: number;
		probeFailure: string | null;
		failureScope: string | null;
		decision: string;
	};

	assert.equal(report.label, candidate.label);
	assert.equal(report.assetCount, candidate.assets.length);
	assert.equal(report.successfulUploads, candidate.assets.length);
	assert.equal(report.retainedTextures, candidate.expectedRetainedTextures);
	assert.equal(report.webglAvailable, true);
	assert.ok(report.maxTextureSize !== null && report.maxTextureSize >= 3200);
	assert.equal(report.contextLost, false);
	assert.equal(report.probeFailure, null);
	assert.equal(report.failureScope, null);
	assert.equal(report.decision, 'proceed');
	assert.deepEqual(
		report.assets.map(({ durationMs: _durationMs, success, failure, ...asset }) => ({
			...asset,
			success,
			failure
		})),
		candidate.assets.map((asset) => ({ ...asset, success: true, failure: null }))
	);
	assert.equal(
		report.encodedBytesTotal,
		candidate.assets.reduce((total, { encodedBytes }) => total + (encodedBytes ?? 0), 0)
	);
});

test('exposes both fixed candidate sets through the named input helper', () => {
	assert.deepEqual(Object.keys(PAINTED_V2_TEXTURE_PROBE_INPUTS).sort(), [
		'painted-v2-2x2',
		'painted-v2-4x4',
		'painted-v2-camera-safe-pilot'
	]);
	assert.equal(paintedV2TextureProbeInput('painted-v2-2x2').assets.length, 4);
	assert.equal(paintedV2TextureProbeInput('painted-v2-4x4').assets.length, 16);
	assert.equal(paintedV2TextureProbeInput('painted-v2-camera-safe-pilot').assets.length, 2);
});

test('pins deterministic representative dimensions, hashes, canonical chunks, and opacity', async () => {
	const expected = [
		{
			path: paintedV2TextureProbeRepresentativePaths['3200'],
			width: 3200,
			height: 3200,
			bytes: 25_311_015,
			sha256: '6e5cf00e3c1e8eb161faf3e4c44cc762d1934e4a35578188d3f00ae354fffa3c'
		},
		{
			path: paintedV2TextureProbeRepresentativePaths['1600'],
			width: 1600,
			height: 1600,
			bytes: 6_479_247,
			sha256: '2d6decfe86bf6df706e5fbf2390236a40fab70fe776af73c8e6cfb42531a50f5'
		}
	] as const;

	for (const candidate of expected) {
		const bytes = readFileSync(candidate.path);
		assert.equal(bytes.byteLength, candidate.bytes);
		assert.equal(createHash('sha256').update(bytes).digest('hex'), candidate.sha256);
		validateCanonicalPngChunks(bytes);
		const decoded = await decodeMeadowEntryRgba(bytes);
		assert.equal(decoded.width, candidate.width);
		assert.equal(decoded.height, candidate.height);
		for (let offset = 3; offset < decoded.data.length; offset += 4) {
			assert.equal(decoded.data[offset], 255);
		}
	}
});

test('parses the complete report root as a repository-relative path under painted-v2', () => {
	assert.deepEqual(
		parseMeadowEntryTextureProbeArguments([
			'--candidate',
			'painted-v2-2x2',
			'--report-root',
			'artifacts/meadow-entry/painted-v2/complete/proofs/texture-probe'
		]),
		{
			candidate: 'painted-v2-2x2',
			reportRoot: 'artifacts/meadow-entry/painted-v2/complete/proofs/texture-probe'
		}
	);
});

test('rejects report roots that are absolute or escape the painted-v2 namespace', () => {
	for (const reportRoot of [
		'/tmp/meadow-entry-texture-probe',
		'artifacts/meadow-entry/painted-v2/../../outside',
		'artifacts/meadow-entry/other-package/proofs/texture-probe',
		'artifacts/meadow-entry/painted-v2-complete/proofs/texture-probe'
	]) {
		assert.throws(
			() =>
				parseMeadowEntryTextureProbeArguments([
					'--candidate',
					'painted-v2-2x2',
					'--report-root',
					reportRoot
				]),
			/--report-root|painted-v2|repository-relative/i,
			reportRoot
		);
	}
});

test('rejects an explicit legacy report root so browser-3200 cannot be overwritten by an override', () => {
	assert.throws(
		() =>
			parseMeadowEntryTextureProbeArguments([
				'--candidate',
				'painted-v2-2x2',
				'--report-root',
				'artifacts/meadow-entry/painted-v2/proofs/texture-probe'
			]),
		/legacy.*browser-3200/i
	);
});

test('rejects a trailing-slash legacy report root so browser-3200 cannot be overwritten', () => {
	assert.throws(
		() =>
			parseMeadowEntryTextureProbeArguments([
				'--candidate',
				'painted-v2-2x2',
				'--report-root',
				'artifacts/meadow-entry/painted-v2/proofs/texture-probe/'
			]),
		/legacy.*browser-3200/i
	);
});

test('rejects raw traversal segments even when normalization stays inside painted-v2', () => {
	assert.throws(
		() =>
			parseMeadowEntryTextureProbeArguments([
				'--candidate',
				'painted-v2-2x2',
				'--report-root',
				'artifacts/meadow-entry/painted-v2/complete/../alternate'
			]),
		/traversal|report-root/i
	);
});

test('does not select the legacy browser-3200 report when a complete report root is supplied', () => {
	const parsed = parseMeadowEntryTextureProbeArguments([
		'--candidate',
		'painted-v2-2x2',
		'--report-root',
		'artifacts/meadow-entry/painted-v2/complete/proofs/texture-probe'
	]);
	assert.notEqual(parsed.reportRoot, 'artifacts/meadow-entry/painted-v2/proofs/texture-probe');
	assert.notEqual(
		`${parsed.reportRoot}/browser-3200.json`,
		'artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-3200.json'
	);
});

test('preserves the legacy destination when no report-root override is supplied', () => {
	assert.deepEqual(parseMeadowEntryTextureProbeArguments(['--candidate', 'painted-v2-2x2']), {
		candidate: 'painted-v2-2x2',
		reportRoot: 'artifacts/meadow-entry/painted-v2/proofs/texture-probe'
	});
});

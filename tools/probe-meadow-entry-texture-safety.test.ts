import assert from 'node:assert/strict';
import test from 'node:test';

import { readFileSync } from 'node:fs';

import { createHash } from 'node:crypto';

import {
	PAINTED_V2_TEXTURE_PROBE_INPUTS,
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
			encodedBytes: 26_114_768,
			encodedSha256: 'fbf564358f64a486979c3c5ffbed9bbc8784ec4b106f9f72341b46dda720aa5e'
		},
		{
			id: 'crossroads-camera-base',
			path: 'artifacts/meadow-entry/painted-v2/exports/painted-v2-crossroads-camera-base.png',
			width: 3200,
			height: 3200,
			encodedBytes: 27_604_984,
			encodedSha256: 'ab819e538f41ea30a0cb8b0a310a6d6211ca553d8e4d9ef3f8d8094475243d4b'
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

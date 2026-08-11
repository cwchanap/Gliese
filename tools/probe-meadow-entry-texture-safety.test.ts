import assert from 'node:assert/strict';
import test from 'node:test';

import { readFileSync } from 'node:fs';

import { runMeadowEntryTextureSafetyProbe } from './probe-meadow-entry-texture-safety';

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

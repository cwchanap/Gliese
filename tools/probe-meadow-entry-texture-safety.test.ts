import assert from 'node:assert/strict';
import test from 'node:test';

import { runMeadowEntryTextureSafetyProbe } from './probe-meadow-entry-texture-safety';

const bunRuntime = globalThis as typeof globalThis & {
	Bun: {
		serve: (...arguments_: unknown[]) => unknown;
	};
};

test('returns a structured stop report when temporary Bun server setup fails', async () => {
	const originalServe = bunRuntime.Bun.serve;
	bunRuntime.Bun.serve = () => {
		throw new Error('forced temporary Bun server setup failure');
	};

	try {
		let report: Awaited<ReturnType<typeof runMeadowEntryTextureSafetyProbe>> | undefined;
		let thrown: unknown;
		try {
			report = await runMeadowEntryTextureSafetyProbe();
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
				assetCount: 22,
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
		bunRuntime.Bun.serve = originalServe;
	}
});

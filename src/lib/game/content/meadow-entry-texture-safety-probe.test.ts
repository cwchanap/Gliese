import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
	EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
	type TextureSafetyProbeReport
} from '../../../../tools/probe-meadow-entry-texture-safety';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

function parseProbeReport(stdout: string): TextureSafetyProbeReport {
	const reportStart = stdout.indexOf('{');
	if (reportStart === -1) throw new Error(`Probe did not emit JSON: ${stdout}`);
	return JSON.parse(stdout.slice(reportStart)) as TextureSafetyProbeReport;
}

describe('Meadow Entry texture-safety preflight', () => {
	it('retains all approved exports in one WebGL context before proceeding', () => {
		const result = spawnSync('bun', ['run', 'world:probe:meadow-entry-textures'], {
			cwd: repositoryRoot,
			encoding: 'utf8',
			timeout: 120_000
		});

		expect(result.error, `probe failed to spawn: ${result.error?.message ?? ''}`).toBeUndefined();
		expect(result.status, result.stderr || result.stdout).toBe(0);

		const report = parseProbeReport(result.stdout);
		expect(report.assetCount).toBe(EXPECTED_MEADOW_ENTRY_EXPORT_COUNT);
		expect(report.successfulUploads).toBe(EXPECTED_MEADOW_ENTRY_EXPORT_COUNT);
		expect(report.retainedTextures).toBe(EXPECTED_MEADOW_ENTRY_EXPORT_COUNT);
		expect(report.maxTextureSize).toBeGreaterThanOrEqual(4928);
		expect(report.contextLost).toBe(false);
		expect(report.decision).toBe('proceed');
	}, 180_000);
});

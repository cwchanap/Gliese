import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
	assertAllowedMeadowEntryDestination,
	meadowEntryExportPaths,
	runMeadowEntryArtControlsExporter
} from '../../../../../tools/export-meadow-entry-art-controls';

const repositoryRoot = resolve(import.meta.dirname, '../../../../../');

describe('painted-v2 complete controls approval', () => {
	it('keeps legacy and complete control destinations in separate namespaces', () => {
		const legacy = meadowEntryExportPaths('/repo');
		const complete = meadowEntryExportPaths('/repo', 'complete');
		expect(legacy.controlsDirectory).toBe('/repo/artifacts/meadow-entry/painted-v2/controls');
		expect(legacy.generatedPath).toBe(
			'/repo/src/lib/game/content/generated/meadow-entry-painted-v2-art-control.ts'
		);
		expect(complete.controlsDirectory).toBe(
			'/repo/artifacts/meadow-entry/painted-v2/complete/controls'
		);
		expect(complete.generatedPath).toBe(
			'/repo/src/lib/game/content/generated/meadow-entry-painted-v2-complete-art-control.ts'
		);
		expect(() => assertAllowedMeadowEntryDestination(complete, legacy.controlsDirectory)).toThrow(
			/Refusing unexpected/
		);
		expect(() => assertAllowedMeadowEntryDestination(legacy, complete.controlsDirectory)).toThrow(
			/Refusing unexpected/
		);
	});

	it('rejects unknown package arguments before any control export can run', () => {
		expect(() => runMeadowEntryArtControlsExporter(['--package', 'unknown'])).toThrow(/Usage:/);
	});

	it('routes complete validation through the complete approval checker', () => {
		const packageJson = JSON.parse(
			readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8')
		) as {
			scripts: Record<string, string>;
		};
		expect(packageJson.scripts['art:validate:meadow-entry-complete-controls']).toContain(
			'bun tools/approve-meadow-entry-controls.ts --package complete --check'
		);
	});
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
	meadowEntryPaintedV2CompleteControlsApproval,
	meadowEntryPaintedV2CompleteControlsApprovalReview
} from '$lib/game/content/approvals/meadow-entry-painted-v2-complete-controls';

import {
	assertAllowedMeadowEntryDestination,
	meadowEntryExportPaths,
	runMeadowEntryArtControlsExporter
} from '../../../../../tools/export-meadow-entry-art-controls';
import {
	buildMeadowEntryControlInputs,
	computeMeadowEntryCombinedControlFingerprint
} from './meadow-entry-controls';
import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_OVERLAPS,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_COVERAGE
} from './meadow-entry-painted-v2-crop-manifest';

const EVIDENCE_PATH = 'docs/superpowers/reports/2026-08-19-complete-world-layout-foundation.md';
const repositoryRoot = resolve(import.meta.dirname, '../../../../../');

describe('painted-v2 complete controls approval', () => {
	it('binds the complete approval to the complete crop contract and Package 1 evidence', () => {
		const input = buildMeadowEntryControlInputs(undefined, 'complete');
		expect(input.crops).toBe(MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS);
		expect(input.overlaps).toBe(MEADOW_ENTRY_PAINTED_V2_COMPLETE_OVERLAPS);
		expect(input.runtimeCoverage).toBe(MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_COVERAGE);
		expect(meadowEntryPaintedV2CompleteControlsApproval.combinedControlFingerprint).toBe(
			computeMeadowEntryCombinedControlFingerprint(input)
		);
		expect(meadowEntryPaintedV2CompleteControlsApproval.evidencePath).toBe(EVIDENCE_PATH);
		expect(meadowEntryPaintedV2CompleteControlsApproval.storageMode).toBe('git-lfs');
		expect(meadowEntryPaintedV2CompleteControlsApprovalReview.reviewedBy).toBe('chanwaichan');
		expect(meadowEntryPaintedV2CompleteControlsApprovalReview.reviewedAt).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
		);
	});

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

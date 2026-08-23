import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
	meadowEntryControlsApproval,
	meadowEntryControlsApprovalReview
} from '$lib/game/content/approvals/meadow-entry-painted-v2-controls';
import { MEADOW_ENTRY_PAINTED_V2_ART_STORAGE } from './meadow-entry-storage';
import {
	buildMeadowEntryControlInputs,
	computeMeadowEntryCombinedControlFingerprint
} from './meadow-entry-controls';
import { MEADOW_ENTRY_REVIEWED_PAINTED_V2_BAKE_OWNERSHIP_SHA256 } from './meadow-entry-bake-ownership';
import { MEADOW_ENTRY_PAINTED_V2_LEGACY_BAKE_OWNERSHIP } from './meadow-entry-painted-v2-legacy-snapshot';
import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE
} from './meadow-entry-painted-v2-crop-manifest';
import { parseCheckedInMeadowEntryControlsApproval } from '../../../../../tools/approve-meadow-entry-controls';

const SHA256 = /^[0-9a-f]{64}$/;
const EVIDENCE_PATH =
	'docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-controls.md' as const;

describe('painted-v2 meadow-entry controls approval', () => {
	it('binds active controls to the painted-v2 storage, crop, coverage, and ownership seals', () => {
		const input = buildMeadowEntryControlInputs();
		expect(input.storage).toEqual(MEADOW_ENTRY_PAINTED_V2_ART_STORAGE);
		expect(input.crops).toEqual(MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS);
		expect(input.overlaps).toEqual(MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS);
		expect(input.runtimeCoverage).toEqual(MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE);
		expect(input.bakeOwnership).toEqual(MEADOW_ENTRY_PAINTED_V2_LEGACY_BAKE_OWNERSHIP);
		expect(MEADOW_ENTRY_REVIEWED_PAINTED_V2_BAKE_OWNERSHIP_SHA256).toMatch(SHA256);
	});

	it('matches the checked-in painted-v2 approval fingerprint and evidence path', () => {
		const currentFingerprint = computeMeadowEntryCombinedControlFingerprint(
			buildMeadowEntryControlInputs()
		);
		expect(meadowEntryControlsApproval.combinedControlFingerprint).toBe(currentFingerprint);
		expect(meadowEntryControlsApproval.cropManifestSha256).toMatch(SHA256);
		expect(meadowEntryControlsApproval.bakeOwnershipSha256).toBe(
			'4978e4284862c8ce87c7193dadf23abca2033c36f5878035b01ca5951be85972'
		);
		expect(meadowEntryControlsApproval.storageMode).toBe('git-lfs');
		expect(meadowEntryControlsApproval.evidencePath).toBe(EVIDENCE_PATH);
		expect(meadowEntryControlsApprovalReview.reviewedBy).toBe('chanwaichan');
		expect(meadowEntryControlsApprovalReview.reviewedAt).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
		);
	});

	it('seals the active Git LFS source and runtime rows independently', () => {
		const source = `${MEADOW_ENTRY_PAINTED_V2_ART_STORAGE.sourcePattern} filter=lfs diff=lfs merge=lfs -text`;
		const runtime = `${MEADOW_ENTRY_PAINTED_V2_ART_STORAGE.runtimePattern} filter=lfs diff=lfs merge=lfs -text`;
		expect(createHash('sha256').update(`${source}\n${runtime}\n`).digest('hex')).toMatch(SHA256);
		expect(meadowEntryControlsApproval.storageConfigurationSha256).toBe(
			'42455c6bab7889dd99cc194683ccaa6f2a19b0a067aede17fe34faf6282fd1ab'
		);
	});

	it('rejects stale evidence and storage values from the exported approval object', () => {
		const approvalSource = (overrides: { storageMode: string; evidencePath: string }) => `
export interface MeadowEntryControlsApproval {
	storageMode: 'git-lfs';
	evidencePath: '${EVIDENCE_PATH}';
}
export const meadowEntryControlsApproval: MeadowEntryControlsApproval = {
	combinedControlFingerprint: '${'1'.repeat(64)}',
	cropManifestSha256: '${'2'.repeat(64)}',
	bakeOwnershipSha256: '${'3'.repeat(64)}',
	storageMode: '${overrides.storageMode}',
	storageConfigurationSha256: '${'4'.repeat(64)}',
	evidencePath: '${overrides.evidencePath}'
};
`;

		expect(() =>
			parseCheckedInMeadowEntryControlsApproval(
				approvalSource({
					storageMode: 'git-lfs',
					evidencePath:
						'docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md'
				})
			)
		).toThrow(/evidence path drifted/i);
		expect(() =>
			parseCheckedInMeadowEntryControlsApproval(
				approvalSource({
					storageMode: 'local',
					evidencePath: EVIDENCE_PATH
				})
			)
		).toThrow(/storage mode drifted/i);
	});
});

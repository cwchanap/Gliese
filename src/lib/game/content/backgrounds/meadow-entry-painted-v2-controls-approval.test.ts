import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { meadowEntryControlsApproval } from '$lib/game/content/approvals/meadow-entry-painted-v2-controls';
import { MEADOW_ENTRY_PAINTED_V2_ART_STORAGE } from './meadow-entry-storage';
import { parseCheckedInMeadowEntryControlsApproval } from '../../../../../tools/approve-meadow-entry-controls';

const SHA256 = /^[0-9a-f]{64}$/;
const EVIDENCE_PATH =
	'docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-controls.md' as const;

describe('painted-v2 meadow-entry controls approval', () => {
	it('seals the active Git LFS source and runtime rows independently', () => {
		const source = `${MEADOW_ENTRY_PAINTED_V2_ART_STORAGE.sourcePattern} filter=lfs diff=lfs merge=lfs -text`;
		const runtime = `${MEADOW_ENTRY_PAINTED_V2_ART_STORAGE.runtimePattern} filter=lfs diff=lfs merge=lfs -text`;
		expect(createHash('sha256').update(`${source}\n${runtime}\n`).digest('hex')).toMatch(SHA256);
		expect(meadowEntryControlsApproval.storageConfigurationSha256).toBe(
			'46eb41c75bcc1d058c820f59098df48abccbaea1e081214d106d9d8ca6dd4f40'
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

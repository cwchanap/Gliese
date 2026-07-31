import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
	meadowEntryControlsApproval,
	meadowEntryControlsApprovalReview
} from '$lib/game/content/approvals/meadow-entry-controls';
import { MEADOW_ENTRY_ART_STORAGE } from '$lib/game/content/backgrounds/meadow-entry-storage';
import {
	buildMeadowEntryControlInputs,
	computeMeadowEntryCombinedControlFingerprint,
	renderMeadowEntryControls
} from '$lib/game/content/backgrounds/meadow-entry-controls';
import { MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT } from '$lib/game/content/generated/meadow-entry-art-control';

import {
	parseMeadowEntryControlsApprovalArguments,
	renderMeadowEntryControlsApprovalModule
} from '../../../../tools/approve-meadow-entry-controls';

const SHA256 = /^[0-9a-f]{64}$/;
const EVIDENCE_PATH =
	'docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md';
const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, '../../../..');
const controlsDirectory = resolve(repositoryRoot, 'docs/superpowers/reports/img/hpa-399/controls');

function sha256(value: string | Uint8Array): string {
	return createHash('sha256').update(value).digest('hex');
}

describe('meadow-entry reviewed control approval', () => {
	it('seals current generated controls and independently rendered Task 5/6 manifests', () => {
		const inputs = buildMeadowEntryControlInputs();
		const currentCombinedFingerprint = computeMeadowEntryCombinedControlFingerprint(inputs);
		const rendered = renderMeadowEntryControls(inputs);
		const checkedInCropManifest = readFileSync(
			resolve(controlsDirectory, 'meadow-entry-crop-manifest.json')
		);
		const checkedInBakeOwnership = readFileSync(
			resolve(controlsDirectory, 'meadow-entry-bake-ownership.json')
		);

		expect(currentCombinedFingerprint).toBe(MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT);
		expect(currentCombinedFingerprint).toBe(meadowEntryControlsApproval.combinedControlFingerprint);
		expect(Buffer.from(rendered['meadow-entry-crop-manifest.json']!)).toEqual(
			checkedInCropManifest
		);
		expect(Buffer.from(rendered['meadow-entry-bake-ownership.json']!)).toEqual(
			checkedInBakeOwnership
		);
		expect(meadowEntryControlsApproval.cropManifestSha256).toBe(sha256(checkedInCropManifest));
		expect(meadowEntryControlsApproval.bakeOwnershipSha256).toBe(sha256(checkedInBakeOwnership));
		expect(meadowEntryControlsApproval.cropManifestSha256).toMatch(SHA256);
		expect(meadowEntryControlsApproval.bakeOwnershipSha256).toMatch(SHA256);
		expect(meadowEntryControlsApproval.evidencePath).toBe(EVIDENCE_PATH);
	});

	it('seals the exact Git LFS storage configuration independently of the approval tool', () => {
		const storageConfiguration = readFileSync(resolve(repositoryRoot, '.gitattributes'));
		const storageText = storageConfiguration.toString('utf8');
		const requiredLines = [
			`${MEADOW_ENTRY_ART_STORAGE.assetPattern} filter=lfs diff=lfs merge=lfs -text`,
			`${MEADOW_ENTRY_ART_STORAGE.proofPattern} filter=lfs diff=lfs merge=lfs -text`
		];
		const actualLines = storageText.slice(0, -1).split('\n');

		expect(MEADOW_ENTRY_ART_STORAGE.mode).toBe('git-lfs');
		expect(storageText).not.toContain('\r');
		expect(storageText.endsWith('\n')).toBe(true);
		for (const requiredLine of requiredLines) {
			expect(
				actualLines.filter((line) => line === requiredLine),
				requiredLine
			).toHaveLength(1);
		}
		expect(meadowEntryControlsApproval.storageMode).toBe('git-lfs');
		expect(meadowEntryControlsApproval.storageConfigurationSha256).toBe(
			sha256(storageConfiguration)
		);
		expect(meadowEntryControlsApproval.storageConfigurationSha256).toMatch(SHA256);
	});

	it('records a validated reviewer and UTC approval instant', () => {
		expect(meadowEntryControlsApprovalReview.reviewedBy).toMatch(/\S/);
		expect(meadowEntryControlsApprovalReview.reviewedAt).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
		);
	});
});

describe('meadow-entry approval tool', () => {
	it('rejects missing, duplicate, malformed, and unknown review arguments', () => {
		expect(() => parseMeadowEntryControlsApprovalArguments([])).toThrow(/reviewed-by/i);
		expect(() =>
			parseMeadowEntryControlsApprovalArguments([
				'--reviewed-by',
				'',
				'--reviewed-at',
				'2026-07-31T12:34:56Z'
			])
		).toThrow(/reviewed-by/i);
		expect(() =>
			parseMeadowEntryControlsApprovalArguments([
				'--reviewed-by',
				'reviewer',
				'--reviewed-at',
				'2026-02-30T12:34:56Z'
			])
		).toThrow(/reviewed-at/i);
		expect(() =>
			parseMeadowEntryControlsApprovalArguments([
				'--reviewed-by',
				'reviewer',
				'--reviewed-by',
				'other',
				'--reviewed-at',
				'2026-07-31T12:34:56Z'
			])
		).toThrow(/duplicate/i);
		expect(() =>
			parseMeadowEntryControlsApprovalArguments([
				'--reviewed-by',
				'reviewer',
				'--reviewed-at',
				'2026-07-31T12:34:56Z',
				'--force'
			])
		).toThrow(/unknown/i);
		for (const reviewedBy of [' reviewer', 'reviewer ']) {
			expect(() =>
				parseMeadowEntryControlsApprovalArguments([
					'--reviewed-by',
					reviewedBy,
					'--reviewed-at',
					'2026-07-31T12:34:56Z'
				])
			).toThrow(/surrounding whitespace/i);
		}
	});

	it.each([' reviewer', 'reviewer '])(
		'rejects direct approval rendering for a reviewer with surrounding whitespace: %j',
		(reviewedBy) => {
			expect(() =>
				renderMeadowEntryControlsApprovalModule(
					{ reviewedBy, reviewedAt: '2026-07-31T12:34:56Z' },
					{
						combinedControlFingerprint: '1'.repeat(64),
						cropManifestSha256: '2'.repeat(64),
						bakeOwnershipSha256: '3'.repeat(64),
						storageMode: 'git-lfs',
						storageConfigurationSha256: '4'.repeat(64),
						evidencePath: EVIDENCE_PATH
					}
				)
			).toThrow(/reviewedBy/i);
		}
	);

	it('renders byte-identical, reviewable approval source for identical inputs', () => {
		const review = parseMeadowEntryControlsApprovalArguments([
			'--reviewed-by',
			'reviewer.example',
			'--reviewed-at',
			'2026-07-31T12:34:56Z'
		]);
		const values = {
			combinedControlFingerprint: '1'.repeat(64),
			cropManifestSha256: '2'.repeat(64),
			bakeOwnershipSha256: '3'.repeat(64),
			storageMode: 'git-lfs' as const,
			storageConfigurationSha256: '4'.repeat(64),
			evidencePath: EVIDENCE_PATH
		} as const;
		const first = renderMeadowEntryControlsApprovalModule(review, values);
		const second = renderMeadowEntryControlsApprovalModule(review, values);

		expect(first).toBe(second);
		expect(first).toContain("reviewedBy: 'reviewer.example'");
		expect(first).toContain("reviewedAt: '2026-07-31T12:34:56Z'");
		expect(first).toContain("combinedControlFingerprint: '" + '1'.repeat(64) + "'");
	});
});

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

import {
	parseMeadowEntryControlsApprovalArguments,
	renderMeadowEntryControlsApprovalModule
} from '../../../../tools/approve-meadow-entry-controls';

const SHA256 = /^[0-9a-f]{64}$/;
const EVIDENCE_PATH =
	'docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md';
const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, '../../../..');

function sha256(value: string | Uint8Array): string {
	return createHash('sha256').update(value).digest('hex');
}

describe('meadow-entry reviewed control approval', () => {
	it('keeps the retired V1 approvals separate from current V2 controls', () => {
		const inputs = buildMeadowEntryControlInputs();
		const currentCombinedFingerprint = computeMeadowEntryCombinedControlFingerprint(inputs);
		const rendered = renderMeadowEntryControls(inputs);

		expect(currentCombinedFingerprint).toMatch(SHA256);
		expect(currentCombinedFingerprint).not.toBe(
			meadowEntryControlsApproval.combinedControlFingerprint
		);
		expect(Object.keys(rendered)).toContain('meadow-entry-crop-manifest.json');
		expect(Object.keys(rendered)).toContain('meadow-entry-bake-ownership.json');
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

	it('accepts a leading -- separator and rejects missing values, missing --reviewed-at, and non-UTC-second timestamps', () => {
		const review = parseMeadowEntryControlsApprovalArguments([
			'--',
			'--reviewed-by',
			'reviewer.example',
			'--reviewed-at',
			'2026-07-31T12:34:56Z'
		]);
		expect(review).toEqual({ reviewedBy: 'reviewer.example', reviewedAt: '2026-07-31T12:34:56Z' });

		expect(() =>
			parseMeadowEntryControlsApprovalArguments(['--reviewed-by', 'reviewer', '--reviewed-at'])
		).toThrow(/Missing value for meadow-entry approval argument: --reviewed-at/);
		expect(() =>
			parseMeadowEntryControlsApprovalArguments([
				'--reviewed-by',
				'reviewer',
				'--reviewed-at',
				'--reviewed-by'
			])
		).toThrow(/Missing value for meadow-entry approval argument: --reviewed-at/);
		expect(() => parseMeadowEntryControlsApprovalArguments(['--reviewed-by', 'reviewer'])).toThrow(
			/Missing required --reviewed-at argument/
		);
		expect(() =>
			parseMeadowEntryControlsApprovalArguments([
				'--reviewed-by',
				'reviewer',
				'--reviewed-at',
				'2026-07-31T12:34Z'
			])
		).toThrow(/UTC seconds in YYYY-MM-DDTHH:mm:ssZ/);
	});

	it('rejects approval values with invalid SHA-256 fingerprints, storage mode, and evidence path', () => {
		const review = { reviewedBy: 'reviewer.example', reviewedAt: '2026-07-31T12:34:56Z' };
		const baseValues = {
			combinedControlFingerprint: '1'.repeat(64),
			cropManifestSha256: '2'.repeat(64),
			bakeOwnershipSha256: '3'.repeat(64),
			storageMode: 'git-lfs' as const,
			storageConfigurationSha256: '4'.repeat(64),
			evidencePath: EVIDENCE_PATH
		} as const;

		expect(() =>
			renderMeadowEntryControlsApprovalModule(review, {
				...baseValues,
				combinedControlFingerprint: 'not-a-sha256'
			})
		).toThrow(/Invalid approval SHA-256 value for combinedControlFingerprint/);
		expect(() =>
			renderMeadowEntryControlsApprovalModule(review, {
				...baseValues,
				storageMode: 'local' as 'git-lfs'
			})
		).toThrow(/Invalid fixed meadow-entry approval contract value/);
		expect(() =>
			renderMeadowEntryControlsApprovalModule(review, {
				...baseValues,
				evidencePath: 'docs/other.md' as typeof EVIDENCE_PATH
			})
		).toThrow(/Invalid fixed meadow-entry approval contract value/);
	});
});

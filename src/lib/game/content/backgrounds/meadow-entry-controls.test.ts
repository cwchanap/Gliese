import { sundropVillageBackgroundsApproval } from '$lib/game/content/approvals/sundrop-village-backgrounds';
import { describe, expect, it } from 'vitest';

import {
	buildMeadowEntryControlInputs,
	buildMeadowEntryForegroundEligibleRasterMask,
	buildMeadowEntryProtectedForegroundRasterMask,
	computeMeadowEntryAuthoringContractFingerprint,
	computeMeadowEntryCombinedControlFingerprint,
	computeMeadowEntryGameplaySourceFingerprint,
	MEADOW_ENTRY_CONTROL_FILENAMES,
	renderMeadowEntryControls
} from './meadow-entry-controls';

const EXPECTED_CONTROL_FILENAMES = [
	'meadow-entry-control-manifest.json',
	'meadow-entry-composite-control.svg',
	'meadow-entry-terrain-path-mask.svg',
	'meadow-entry-region-mask.svg',
	'meadow-entry-collision-mask.svg',
	'meadow-entry-building-footprint-mask.svg',
	'meadow-entry-entrance-transition-mask.svg',
	'meadow-entry-encounter-combat-mask.svg',
	'meadow-entry-reward-discovery-mask.svg',
	'meadow-entry-semantic-anchor-mask.svg',
	'meadow-entry-protected-live-mask.svg',
	'meadow-entry-forbidden-tall-mask.svg',
	'meadow-entry-foreground-eligible-mask.svg',
	'meadow-entry-handoff-mask.svg',
	'meadow-entry-runtime-base-coverage-mask.svg',
	'meadow-entry-runtime-fallback-coverage-mask.svg',
	'meadow-entry-bake-ownership.json',
	'meadow-entry-crop-manifest.json'
] as const;

const SHA256 = /^[0-9a-f]{64}$/;

describe('meadow-entry deterministic authoring controls', () => {
	it('renders the reviewed fixed inventory byte-identically on repeated builds', () => {
		const input = buildMeadowEntryControlInputs();
		const first = renderMeadowEntryControls(input);
		const second = renderMeadowEntryControls(input);

		expect(MEADOW_ENTRY_CONTROL_FILENAMES).toEqual(EXPECTED_CONTROL_FILENAMES);
		expect(Object.keys(first)).toEqual(EXPECTED_CONTROL_FILENAMES);
		expect(second).toEqual(first);
		for (const filename of EXPECTED_CONTROL_FILENAMES) {
			expect(first[filename]?.endsWith('\n'), filename).toBe(true);
		}
	});

	it('separates gameplay, authoring, and combined lowercase SHA-256 domains', () => {
		const input = buildMeadowEntryControlInputs();
		const gameplay = computeMeadowEntryGameplaySourceFingerprint(input);
		const authoring = computeMeadowEntryAuthoringContractFingerprint(input);
		const combined = computeMeadowEntryCombinedControlFingerprint(input);

		expect(gameplay).toMatch(SHA256);
		expect(authoring).toMatch(SHA256);
		expect(combined).toMatch(SHA256);
		expect(new Set([gameplay, authoring, combined]).size).toBe(3);
		expect(input.predecessor.hpa398ControlFingerprint).toBe(
			sundropVillageBackgroundsApproval.approvedControlFingerprint
		);
		expect(input.predecessor.hpa398BaseSha256).toBe(
			sundropVillageBackgroundsApproval.base.approvedPngSha256
		);
		expect(input.predecessor.hpa398ForegroundSha256).toBe(
			sundropVillageBackgroundsApproval.foreground.approvedPngSha256
		);
		expect(Object.keys(input.predecessor.hpa307ArtifactHashes)).toHaveLength(9);
		for (const hash of Object.values(input.predecessor.hpa307ArtifactHashes)) {
			expect(hash).toMatch(SHA256);
		}
	});

	it('builds 6400px masks and removes every protected pixel from foreground eligibility', () => {
		const input = buildMeadowEntryControlInputs();
		const protectedMask = buildMeadowEntryProtectedForegroundRasterMask(input);
		const eligibleMask = buildMeadowEntryForegroundEligibleRasterMask(input);

		expect(protectedMask.width).toBe(6_400);
		expect(protectedMask.height).toBe(6_400);
		expect(protectedMask.alpha).toHaveLength(6_400 * 6_400);
		expect(eligibleMask.width).toBe(6_400);
		expect(eligibleMask.height).toBe(6_400);
		expect(eligibleMask.alpha).toHaveLength(6_400 * 6_400);
		expect(protectedMask.alpha.includes(255)).toBe(true);
		expect(eligibleMask.alpha.includes(255)).toBe(true);

		let overlappingPixel = -1;
		for (let index = 0; index < protectedMask.alpha.length; index += 1) {
			if (protectedMask.alpha[index] !== 0 && eligibleMask.alpha[index] !== 0) {
				overlappingPixel = index;
				break;
			}
		}
		expect(overlappingPixel).toBe(-1);
	});
});

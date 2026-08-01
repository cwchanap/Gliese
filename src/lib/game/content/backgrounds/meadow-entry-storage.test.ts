import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_ART_STORAGE,
	validateMeadowEntryStorageContract
} from '$lib/game/content/backgrounds/meadow-entry-storage';

describe('Meadow Entry art storage', () => {
	it('declares the Git LFS storage contract for production art', () => {
		expect(() => validateMeadowEntryStorageContract(MEADOW_ENTRY_ART_STORAGE)).not.toThrow();
		expect(MEADOW_ENTRY_ART_STORAGE.mode).toBe('git-lfs');
		expect(MEADOW_ENTRY_ART_STORAGE.canaryPath).toBe(
			'artifacts/meadow-entry/hpa-399/lfs-canary.png'
		);
	});

	it('rejects a storage contract that drifts from the HPA-399 Git LFS configuration', () => {
		const base = { ...MEADOW_ENTRY_ART_STORAGE };
		expect(() =>
			validateMeadowEntryStorageContract({ ...base, mode: 'local' as 'git-lfs' })
		).toThrow(/Git LFS contract/);
		expect(() =>
			validateMeadowEntryStorageContract({
				...base,
				assetPattern: 'artifacts/other/**/*.png' as typeof base.assetPattern
			})
		).toThrow(/Git LFS contract/);
		expect(() =>
			validateMeadowEntryStorageContract({
				...base,
				proofPattern: 'docs/other/**/*.png' as typeof base.proofPattern
			})
		).toThrow(/Git LFS contract/);
		expect(() =>
			validateMeadowEntryStorageContract({
				...base,
				canaryPath: 'other/canary.png' as typeof base.canaryPath
			})
		).toThrow(/Git LFS contract/);
	});
});

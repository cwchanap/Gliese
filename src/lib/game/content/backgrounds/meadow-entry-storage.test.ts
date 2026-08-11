import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_ART_STORAGE,
	MEADOW_ENTRY_PAINTED_V2_ART_STORAGE,
	validateMeadowEntryPaintedV2StorageContract,
	validateMeadowEntryStorageContract
} from '$lib/game/content/backgrounds/meadow-entry-storage';

describe('Meadow Entry art storage', () => {
	it('declares the Git LFS storage contract for production art', () => {
		expect(() => validateMeadowEntryStorageContract(MEADOW_ENTRY_ART_STORAGE)).not.toThrow();
		expect(MEADOW_ENTRY_ART_STORAGE).toEqual({
			mode: 'git-lfs',
			assetPattern: 'artifacts/meadow-entry/hpa-399/**/*.png',
			proofPattern: 'docs/superpowers/reports/img/hpa-399/proofs/**/*.png',
			canaryPath: 'artifacts/meadow-entry/hpa-399/lfs-canary.png'
		});
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

	it('declares the painted-v2 Git LFS contract separately from the historical record', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_ART_STORAGE).toEqual({
			mode: 'git-lfs',
			sourcePattern: 'artifacts/meadow-entry/painted-v2/**/*.png',
			runtimePattern: 'public/game/assets/regions/meadow-entry-painted-v2/**/*.png',
			canaryPath: 'artifacts/meadow-entry/painted-v2/lfs-canary.png'
		});
		expect(() =>
			validateMeadowEntryPaintedV2StorageContract(MEADOW_ENTRY_PAINTED_V2_ART_STORAGE)
		).not.toThrow();
		expect(() =>
			validateMeadowEntryStorageContract(MEADOW_ENTRY_PAINTED_V2_ART_STORAGE as never)
		).toThrow(/HPA-399 Git LFS contract/);
		expect(() =>
			validateMeadowEntryPaintedV2StorageContract(MEADOW_ENTRY_ART_STORAGE as never)
		).toThrow(/painted-v2 Git LFS contract/);
	});

	it('rejects painted-v2 storage records that drift from their fixed paths', () => {
		const base = { ...MEADOW_ENTRY_PAINTED_V2_ART_STORAGE };
		expect(() =>
			validateMeadowEntryPaintedV2StorageContract({ ...base, mode: 'local' as 'git-lfs' })
		).toThrow(/painted-v2 Git LFS contract/);
		expect(() =>
			validateMeadowEntryPaintedV2StorageContract({
				...base,
				sourcePattern: 'artifacts/other/**/*.png' as typeof base.sourcePattern
			})
		).toThrow(/painted-v2 Git LFS contract/);
		expect(() =>
			validateMeadowEntryPaintedV2StorageContract({
				...base,
				runtimePattern: 'public/other/**/*.png' as typeof base.runtimePattern
			})
		).toThrow(/painted-v2 Git LFS contract/);
		expect(() =>
			validateMeadowEntryPaintedV2StorageContract({
				...base,
				canaryPath: 'other/canary.png' as typeof base.canaryPath
			})
		).toThrow(/painted-v2 Git LFS contract/);
	});
});

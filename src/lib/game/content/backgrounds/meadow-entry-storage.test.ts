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
});

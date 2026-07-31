export const MEADOW_ENTRY_ART_STORAGE = {
	mode: 'git-lfs',
	assetPattern: 'artifacts/meadow-entry/hpa-399/**/*.png',
	proofPattern: 'docs/superpowers/reports/img/hpa-399/proofs/**/*.png',
	canaryPath: 'artifacts/meadow-entry/hpa-399/lfs-canary.png'
} as const;

export function validateMeadowEntryStorageContract(value: typeof MEADOW_ENTRY_ART_STORAGE): void {
	if (
		value.mode !== 'git-lfs' ||
		value.assetPattern !== 'artifacts/meadow-entry/hpa-399/**/*.png' ||
		value.proofPattern !== 'docs/superpowers/reports/img/hpa-399/proofs/**/*.png' ||
		value.canaryPath !== 'artifacts/meadow-entry/hpa-399/lfs-canary.png'
	) {
		throw new Error('Meadow Entry art storage must use the HPA-399 Git LFS contract.');
	}
}

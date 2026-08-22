export const MEADOW_ENTRY_CONTROLS_TEST_FILES = [
	'src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-storage.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-controls.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-controls-exporter.test.ts',
	'src/lib/game/content/meadow-entry-controls.asset.test.ts',
	'src/lib/game/content/meadow-entry-controls-approval-tool.test.ts'
] as const;

export const MEADOW_ENTRY_TEST_FILES = [
	...MEADOW_ENTRY_CONTROLS_TEST_FILES,
	'src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-png.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-master-finalizer.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-master-finalizer-cli.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-master-refinement.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-art-source-snapshot.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-art-package-validator.test.ts'
] as const;

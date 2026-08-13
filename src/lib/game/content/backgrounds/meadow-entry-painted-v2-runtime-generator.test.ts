import { writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it, afterEach } from 'vitest';

import { meadowEntryPaintedV2ArtPackageApproval } from '$lib/game/content/approvals/meadow-entry-painted-v2-art-package';
import { MEADOW_ENTRY_PAINTED_V2_BAKE_OWNERSHIP } from '$lib/game/content/backgrounds/meadow-entry-bake-ownership';
import { MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS } from '$lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest';

import {
	collectMeadowEntryRuntimeData,
	MEADOW_ENTRY_PAINTED_V2_RUNTIME_GENERATION_INPUT,
	parseCheckMode,
	renderMeadowEntryRuntimeData,
	runMeadowEntryRuntimeGenerator
} from '../../../../../tools/generate-meadow-entry-runtime';

const temporaryRoots: string[] = [];

afterEach(() => {
	for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('painted-v2 runtime data generation', () => {
	it('emits the two fixed opaque runtime descriptors from the approved export inventory', () => {
		const data = collectMeadowEntryRuntimeData(MEADOW_ENTRY_PAINTED_V2_RUNTIME_GENERATION_INPUT);

		expect(data.backgrounds).toHaveLength(2);
		expect(data.backgrounds).toEqual([
			{
				cropId: 'painted-v2-sundrop-camera-base',
				id: 'meadow-entry-painted-v2-sundrop-camera-base-image',
				textureKey: 'meadow-entry-painted-v2-sundrop-camera-base',
				path: '/game/assets/regions/meadow-entry-painted-v2/painted-v2-sundrop-camera-base.png',
				x: 1600,
				y: 4800,
				width: 3200,
				height: 3200,
				plane: 'base',
				drawOrder: 0
			},
			{
				cropId: 'painted-v2-crossroads-camera-base',
				id: 'meadow-entry-painted-v2-crossroads-camera-base-image',
				textureKey: 'meadow-entry-painted-v2-crossroads-camera-base',
				path: '/game/assets/regions/meadow-entry-painted-v2/painted-v2-crossroads-camera-base.png',
				x: 3968,
				y: 3840,
				width: 3200,
				height: 3200,
				plane: 'base',
				drawOrder: 10
			}
		]);
		for (const row of data.backgrounds) {
			const approved = meadowEntryPaintedV2ArtPackageApproval.exports.find(
				({ cropId, plane }) => cropId === row.cropId && plane === row.plane
			);
			expect(approved).toBeDefined();
			expect(approved?.width).toBe(row.width);
			expect(approved?.height).toBe(row.height);
			expect(approved?.sha256).toMatch(/^[a-f0-9]{64}$/);
		}
	});

	it('retains exactly the conservative painted-v2 owner boundary', () => {
		const data = collectMeadowEntryRuntimeData(MEADOW_ENTRY_PAINTED_V2_RUNTIME_GENERATION_INPUT);

		expect(data.visualOwners).toEqual([
			{
				sourceType: 'blocker',
				sourceId: 'silverpine-wall-B-south',
				ownerCrops: [
					{
						cropId: 'painted-v2-crossroads-camera-base',
						requiredBackgroundIds: ['meadow-entry-painted-v2-crossroads-camera-base-image']
					}
				]
			},
			{
				sourceType: 'decor',
				sourceId: 'village-decor-22-77',
				ownerCrops: [
					{
						cropId: 'painted-v2-sundrop-camera-base',
						requiredBackgroundIds: ['meadow-entry-painted-v2-sundrop-camera-base-image']
					},
					{
						cropId: 'painted-v2-crossroads-camera-base',
						requiredBackgroundIds: ['meadow-entry-painted-v2-crossroads-camera-base-image']
					}
				]
			},
			{
				sourceType: 'decor',
				sourceId: 'village-decor-28-25',
				ownerCrops: [
					{
						cropId: 'painted-v2-sundrop-camera-base',
						requiredBackgroundIds: ['meadow-entry-painted-v2-sundrop-camera-base-image']
					}
				]
			},
			{
				sourceType: 'decor',
				sourceId: 'village-decor-28-53',
				ownerCrops: [
					{
						cropId: 'painted-v2-sundrop-camera-base',
						requiredBackgroundIds: ['meadow-entry-painted-v2-sundrop-camera-base-image']
					}
				]
			},
			{
				sourceType: 'decor',
				sourceId: 'village-decor-53-22',
				ownerCrops: [
					{
						cropId: 'painted-v2-sundrop-camera-base',
						requiredBackgroundIds: ['meadow-entry-painted-v2-sundrop-camera-base-image']
					}
				]
			}
		]);
		expect(MEADOW_ENTRY_PAINTED_V2_BAKE_OWNERSHIP).toHaveLength(374);
		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS).toHaveLength(2);
	});

	it('renders deterministic generated source without historical runtime imports', () => {
		const data = collectMeadowEntryRuntimeData(MEADOW_ENTRY_PAINTED_V2_RUNTIME_GENERATION_INPUT);
		const first = renderMeadowEntryRuntimeData(data);
		const second = renderMeadowEntryRuntimeData(data);
		expect(first).toBe(second);
		expect(first).toContain('MEADOW_ENTRY_PAINTED_V2_APPROVED_RUNTIME_BACKGROUNDS');
		expect(first).not.toContain('meadow-entry-art-package');
		expect(first).not.toContain('generated/meadow-entry-runtime');
	});
});

describe('painted-v2 runtime generator CLI', () => {
	it('writes only the painted-v2 generated destination and supports stale/missing checks', () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-painted-v2-runtime-generator-'));
		temporaryRoots.push(root);

		runMeadowEntryRuntimeGenerator([], root);
		const destination = join(
			root,
			'src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts'
		);
		const historical = join(root, 'src/lib/game/content/generated/meadow-entry-runtime.ts');
		expect(existsSync(destination)).toBe(true);
		expect(existsSync(historical)).toBe(false);
		expect(() => runMeadowEntryRuntimeGenerator(['--check'], root)).not.toThrow();
		writeFileSync(destination, 'stale');
		expect(() => runMeadowEntryRuntimeGenerator(['--check'], root)).toThrow(/stale/);
		rmSync(destination);
		expect(() => runMeadowEntryRuntimeGenerator(['--check'], root)).toThrow(/missing/);
	});

	it('keeps --check as the only supported generator flag', () => {
		expect(parseCheckMode([])).toBe(false);
		expect(parseCheckMode(['--check'])).toBe(true);
		expect(() => parseCheckMode(['--package', 'painted-v2'])).toThrow(/Usage/);
	});
});

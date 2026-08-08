import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { meadowEntryArtPackageApproval } from '$lib/game/content/approvals/meadow-entry-art-package';
import {
	meadowEntryRuntimeBackgroundAssets,
	meadowEntryRuntimeBackgrounds
} from '$lib/game/content/backgrounds/meadow-entry-runtime';

const root = process.cwd();
const approvedExportsDirectory = join(root, 'artifacts/meadow-entry/hpa-399/exports');
const runtimeAssetsDirectory = join(root, 'public/game/assets/regions/meadow-entry');

const EXPECTED_ACTIVE_RUNTIME_ASSETS = [
	{
		textureKey: 'meadow-entry-sundrop-village-underlay-base',
		filename: 'sundrop-village-underlay-base.png',
		width: 1792,
		height: 1536,
		sha256: '8367ce51ee8c216e66048eb8279e750962a4ba79a36a1136738ef40867c95115'
	},
	{
		textureKey: 'meadow-entry-outer-boundary-east-forest-lane-base',
		filename: 'outer-boundary-east-forest-lane-base.png',
		width: 1440,
		height: 4608,
		sha256: 'ddbc722719d67ee2e1101c7ebbccb3ab8a78e5374114a23067a99e498e74e2cc'
	},
	{
		textureKey: 'meadow-entry-village-crossroads-connector-base',
		filename: 'village-crossroads-connector-base.png',
		width: 1920,
		height: 1376,
		sha256: '1875020048ae66971061ea5e1c4d69f8682c82a6e35c5ef75af1aed8a671dd6b'
	},
	{
		textureKey: 'meadow-entry-village-crossroads-connector-foreground',
		filename: 'village-crossroads-connector-foreground.png',
		width: 1920,
		height: 1376,
		sha256: '21a1ee9d6c354d00782eb0583917dc92b07733ab3e2502da0b9e80934ed352ea'
	},
	{
		textureKey: 'meadow-entry-crossroads-coast-connector-base',
		filename: 'crossroads-coast-connector-base.png',
		width: 1184,
		height: 1280,
		sha256: '7d7b5ccbd98c928eea4c5c464d849780db59b7b1e6902fd2b0e3ceea8453faac'
	},
	{
		textureKey: 'meadow-entry-crossroads-coast-connector-foreground',
		filename: 'crossroads-coast-connector-foreground.png',
		width: 1184,
		height: 1280,
		sha256: '75743509b8120ee767c27723b8dfc04cd868c8050c09efab020100c65ffa3727'
	},
	{
		textureKey: 'meadow-entry-crossroads-mistfen-connector-base',
		filename: 'crossroads-mistfen-connector-base.png',
		width: 1088,
		height: 1280,
		sha256: '564036dc1bf04b3af970664d114f8bb0f32072588f90ada73c9835aca608e9ab'
	},
	{
		textureKey: 'meadow-entry-crossroads-mistfen-connector-foreground',
		filename: 'crossroads-mistfen-connector-foreground.png',
		width: 1088,
		height: 1280,
		sha256: '16a0775fc314561d6a99e1e8eff69f555ff415d2e7878fa4d7a793c894401c52'
	},
	{
		textureKey: 'meadow-entry-crossroads-silverpine-connector-base',
		filename: 'crossroads-silverpine-connector-base.png',
		width: 800,
		height: 480,
		sha256: '71cb8b34953b34f57c099c26b1a45961dbeff3ec60b7d07b795672d12f48702d'
	},
	{
		textureKey: 'meadow-entry-crossroads-silverpine-connector-foreground',
		filename: 'crossroads-silverpine-connector-foreground.png',
		width: 800,
		height: 480,
		sha256: '2cf1cd7763691c40abc007801ea82f49969f87c504733002bc2469d496ef8542'
	},
	{
		textureKey: 'meadow-entry-crossroads-wildwood-connector-base',
		filename: 'crossroads-wildwood-connector-base.png',
		width: 640,
		height: 1472,
		sha256: 'c5be6d9e8ea6c9acefa82cac34caac5995aff51117d572ba0e95f94f068991c0'
	},
	{
		textureKey: 'meadow-entry-crossroads-wildwood-connector-foreground',
		filename: 'crossroads-wildwood-connector-foreground.png',
		width: 640,
		height: 1472,
		sha256: '3549f849229c20c892ac66f4f8247cf6d247f64a319d825923d2008e55572fa6'
	},
	{
		textureKey: 'meadow-entry-crossroads-base',
		filename: 'crossroads-base.png',
		width: 1600,
		height: 2208,
		sha256: '241671fd530810cc95ec20665eacd3f7080501691e912694f68f2a20963d0949'
	},
	{
		textureKey: 'meadow-entry-crossroads-foreground',
		filename: 'crossroads-foreground.png',
		width: 1600,
		height: 2208,
		sha256: 'ce5656cd0a5b426b7d35742fc02a79f72aa83b262f5bee8a6264fe05f710a26d'
	},
	{
		textureKey: 'meadow-entry-tidewatch-coast-base',
		filename: 'tidewatch-coast-base.png',
		width: 3744,
		height: 2080,
		sha256: '9016d3a934da81a97e5fd61d9316ca0d93810d41990e7681d6ae17299f2e52c1'
	},
	{
		textureKey: 'meadow-entry-tidewatch-coast-foreground',
		filename: 'tidewatch-coast-foreground.png',
		width: 3744,
		height: 2080,
		sha256: 'ea98407147254ccaeaa9a2a07449788f02a81bc19b95478373f4be8630445d82'
	},
	{
		textureKey: 'meadow-entry-mistfen-base',
		filename: 'mistfen-base.png',
		width: 2592,
		height: 2944,
		sha256: 'a8e0e7fc1c7d00d7a60f66a010de45e7f1808c0a2e7f2609687d5d5a6b96e8cd'
	},
	{
		textureKey: 'meadow-entry-mistfen-foreground',
		filename: 'mistfen-foreground.png',
		width: 2592,
		height: 2944,
		sha256: 'f5db7ba6e9e7963a89b5557dc2d44233f28062849af694a5eee8aa55a6803280'
	},
	{
		textureKey: 'meadow-entry-silverpine-base',
		filename: 'silverpine-base.png',
		width: 1888,
		height: 3008,
		sha256: '41f94f45f999b2ee3dd575ae9386f63434c1b52d0491300bb47484133fcba92f'
	},
	{
		textureKey: 'meadow-entry-silverpine-foreground',
		filename: 'silverpine-foreground.png',
		width: 1888,
		height: 3008,
		sha256: '0fbcb5d2e0dafc78b7f83e984079ddfdfcbcf77d85d4c37f2d9174a1fd2e3ca6'
	},
	{
		textureKey: 'meadow-entry-wildwood-base',
		filename: 'wildwood-base.png',
		width: 2688,
		height: 4928,
		sha256: '012c88fb4ceea5f06ffcc3b95901c48854449ca3b14223bc916fc2d1e07df08f'
	},
	{
		textureKey: 'meadow-entry-wildwood-foreground',
		filename: 'wildwood-foreground.png',
		width: 2688,
		height: 4928,
		sha256: 'd1c24a3fbf99ce13aeeb280157dbb95661c545c3f9fd77b86d809ea490609932'
	}
] as const;

function sha256(contents: Uint8Array): string {
	return createHash('sha256').update(contents).digest('hex');
}

describe('Meadow Entry PR-1 runtime PNG assets', () => {
	it('copies every active approved export byte-for-byte with its approved dimensions and hash', async () => {
		expect(meadowEntryRuntimeBackgrounds).toHaveLength(EXPECTED_ACTIVE_RUNTIME_ASSETS.length);
		expect(meadowEntryRuntimeBackgroundAssets.map(({ key }) => key)).toEqual(
			EXPECTED_ACTIVE_RUNTIME_ASSETS.map(({ textureKey }) => textureKey)
		);

		for (const background of meadowEntryRuntimeBackgrounds) {
			const expected = EXPECTED_ACTIVE_RUNTIME_ASSETS.find(
				({ textureKey }) => textureKey === background.textureKey
			);
			expect(
				expected,
				`missing independent expectation for ${background.textureKey}`
			).toBeDefined();
			if (!expected)
				throw new Error(`Missing independent expectation for ${background.textureKey}`);

			const approved = meadowEntryArtPackageApproval.exports.find(
				({ textureKey }) => textureKey === background.textureKey
			);
			expect(approved, `missing HPA-496 approval for ${background.textureKey}`).toMatchObject({
				path: `artifacts/meadow-entry/hpa-399/exports/${expected.filename}`,
				sha256: expected.sha256,
				width: expected.width,
				height: expected.height
			});

			const approvedPath = join(approvedExportsDirectory, expected.filename);
			const runtimePath = join(runtimeAssetsDirectory, expected.filename);
			expect(existsSync(approvedPath), `missing approved export ${expected.filename}`).toBe(true);
			expect(existsSync(runtimePath), `missing runtime asset ${expected.filename}`).toBe(true);

			const approvedPng = readFileSync(approvedPath);
			const runtimePng = readFileSync(runtimePath);
			expect(sha256(approvedPng)).toBe(expected.sha256);
			expect(sha256(runtimePng)).toBe(expected.sha256);
			expect(runtimePng.equals(approvedPng)).toBe(true);

			const metadata = await sharp(runtimePng).metadata();
			expect(metadata.width).toBe(expected.width);
			expect(metadata.height).toBe(expected.height);
		}
	});
});

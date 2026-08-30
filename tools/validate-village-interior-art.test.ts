import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import type { VillageInteriorPackageManifest } from '$lib/game/content/backgrounds/village-interior-package';
import {
	collectRegisteredVillageInteriorManifests,
	parseVillageInteriorArtArguments,
	validateVillageInteriorManifest
} from './validate-village-interior-art';

const temporaryRoots: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
	);
});

async function fixtureRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), 'gliese-interior-art-'));
	temporaryRoots.push(root);
	await mkdir(join(root, 'public/game/assets/interiors/hero-house'), { recursive: true });
	return root;
}

function sha256(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex');
}

function manifest(
	overrides: Partial<VillageInteriorPackageManifest> = {}
): VillageInteriorPackageManifest {
	return {
		version: 1,
		mapId: 'hero-house',
		dimensionsPx: { width: 2, height: 2 },
		base: {
			id: 'base',
			textureKey: 'base',
			path: '/game/assets/interiors/hero-house/base.png',
			sha256: ''
		},
		navigation: {
			gridId: 'hero-house-navigation',
			cellSizePx: 16,
			widthCells: 1,
			heightCells: 1,
			clearancePx: 12,
			source: 'layout'
		},
		...overrides
	};
}

describe('village interior art validator', () => {
	it('requires the Shrine of Aurora opaque base with exact manifest hash and navigation parity', async () => {
		const manifest = (await collectRegisteredVillageInteriorManifests()).find(
			({ mapId }) => mapId === 'shrine-of-aurora-interior'
		);
		expect(manifest).toBeDefined();
		if (!manifest) return;

		expect(manifest).toMatchObject({
			version: 1,
			mapId: 'shrine-of-aurora-interior',
			dimensionsPx: { width: 1024, height: 896 },
			base: {
				id: 'shrine-of-aurora-interior-painted-base-image',
				textureKey: 'shrine-of-aurora-interior-painted-base',
				path: '/game/assets/interiors/shrine-of-aurora-interior/base.png',
				sha256: '0bfbdf826d745a80b06a54a57c42089e9f80d00a43800a32d6d332a20a79b914'
			},
			navigation: {
				gridId: 'shrine-of-aurora-interior-navigation',
				cellSizePx: 16,
				widthCells: 64,
				heightCells: 56,
				clearancePx: 12,
				source: 'layout'
			}
		});
		expect(manifest.foreground).toBeUndefined();
		await expect(validateVillageInteriorManifest(manifest)).resolves.toBeUndefined();
	});

	it('requires the Villager House 3 opaque base with exact manifest hash and navigation parity', async () => {
		const manifest = (await collectRegisteredVillageInteriorManifests()).find(
			({ mapId }) => mapId === 'villager-house-3'
		);
		expect(manifest).toBeDefined();
		if (!manifest) return;

		expect(manifest).toMatchObject({
			version: 1,
			mapId: 'villager-house-3',
			dimensionsPx: { width: 1024, height: 704 },
			base: {
				id: 'villager-house-3-painted-base-image',
				textureKey: 'villager-house-3-painted-base',
				path: '/game/assets/interiors/villager-house-3/base.png',
				sha256: '9b021c433565b0fe68c7699a2b7bd646de3273511b144efb34d9e10aba93567f'
			},
			navigation: {
				gridId: 'villager-house-3-navigation',
				cellSizePx: 16,
				widthCells: 64,
				heightCells: 44,
				clearancePx: 12,
				source: 'layout'
			}
		});
		expect(manifest.foreground).toBeUndefined();
		await expect(validateVillageInteriorManifest(manifest)).resolves.toBeUndefined();
	});

	it('accepts an opaque base and a foreground with mixed alpha', async () => {
		const root = await fixtureRoot();
		const baseBytes = await sharp({
			create: { width: 2, height: 2, channels: 4, background: '#fff' }
		})
			.png()
			.toBuffer();
		const foregroundBytes = await sharp(
			Buffer.from([1, 2, 3, 0, 1, 2, 3, 255, 1, 2, 3, 0, 1, 2, 3, 255]),
			{ raw: { width: 2, height: 2, channels: 4 } }
		)
			.png()
			.toBuffer();
		await writeFile(join(root, 'public/game/assets/interiors/hero-house/base.png'), baseBytes);
		await writeFile(
			join(root, 'public/game/assets/interiors/hero-house/foreground.png'),
			foregroundBytes
		);
		const value: VillageInteriorPackageManifest = {
			...manifest(),
			base: { ...manifest().base, sha256: sha256(baseBytes) },
			foreground: {
				id: 'foreground',
				textureKey: 'foreground',
				path: '/game/assets/interiors/hero-house/foreground.png',
				sha256: sha256(foregroundBytes)
			}
		};
		await expect(validateVillageInteriorManifest(value, root)).resolves.toBeUndefined();
	});

	it('fails closed for dimensions, base opacity, foreground alpha, and hash drift', async () => {
		const root = await fixtureRoot();
		const translucentBaseBytes = await sharp({
			create: { width: 2, height: 2, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 0.5 } }
		})
			.png()
			.toBuffer();
		await writeFile(
			join(root, 'public/game/assets/interiors/hero-house/base.png'),
			translucentBaseBytes
		);
		await expect(
			validateVillageInteriorManifest(
				manifest({ base: { ...manifest().base, sha256: sha256(translucentBaseBytes) } }),
				root
			)
		).rejects.toThrow(/opaque/i);

		const opaqueBaseBytes = await sharp({
			create: { width: 2, height: 2, channels: 4, background: '#fff' }
		})
			.png()
			.toBuffer();
		await writeFile(
			join(root, 'public/game/assets/interiors/hero-house/base.png'),
			opaqueBaseBytes
		);
		const opaqueForegroundBytes = await sharp({
			create: { width: 2, height: 2, channels: 4, background: '#000' }
		})
			.png()
			.toBuffer();
		await writeFile(
			join(root, 'public/game/assets/interiors/hero-house/foreground.png'),
			opaqueForegroundBytes
		);
		await expect(
			validateVillageInteriorManifest(
				manifest({
					base: { ...manifest().base, sha256: sha256(opaqueBaseBytes) },
					foreground: {
						id: 'foreground',
						textureKey: 'foreground',
						path: '/game/assets/interiors/hero-house/foreground.png',
						sha256: sha256(opaqueForegroundBytes)
					}
				}),
				root
			)
		).rejects.toThrow(/transparent and non-transparent/i);

		await expect(
			validateVillageInteriorManifest(
				manifest({
					base: { ...manifest().base, sha256: 'a'.repeat(64) },
					dimensionsPx: { width: 4, height: 4 }
				}),
				root
			)
		).rejects.toThrow(/SHA|dimensions/i);
	});

	it('refuses paths outside public/game/assets/interiors/<mapId>', async () => {
		const root = await fixtureRoot();
		const baseBytes = await sharp({
			create: { width: 2, height: 2, channels: 4, background: '#fff' }
		})
			.png()
			.toBuffer();
		await writeFile(join(root, 'public/game/assets/interiors/hero-house/base.png'), baseBytes);
		const value = manifest({
			base: { ...manifest().base, path: '../outside.png', sha256: sha256(baseBytes) }
		});
		await expect(validateVillageInteriorManifest(value, root)).rejects.toThrow(/outside|interior/i);
	});

	it('rejects bare game asset paths unsupported by the proof renderer', async () => {
		const root = await fixtureRoot();
		const baseBytes = await sharp({
			create: { width: 2, height: 2, channels: 4, background: '#fff' }
		})
			.png()
			.toBuffer();
		await writeFile(join(root, 'public/game/assets/interiors/hero-house/base.png'), baseBytes);
		const value = manifest({
			base: {
				...manifest().base,
				path: 'game/assets/interiors/hero-house/base.png',
				sha256: sha256(baseBytes)
			}
		});

		await expect(validateVillageInteriorManifest(value, root)).rejects.toThrow(
			/outside.*interior asset root/i
		);
	});

	it('parses mutually exclusive per-map and all modes with optional check', () => {
		expect(parseVillageInteriorArtArguments(['--all'])).toEqual({ all: true, check: false });
		expect(parseVillageInteriorArtArguments(['--all', '--check'])).toEqual({
			all: true,
			check: true
		});
		expect(parseVillageInteriorArtArguments(['--map', 'hero-house', '--check'])).toEqual({
			all: false,
			mapId: 'hero-house',
			check: true
		});
		expect(() => parseVillageInteriorArtArguments(['--all', '--map', 'hero-house'])).toThrow(
			/mutually exclusive|Usage/i
		);
		expect(() => parseVillageInteriorArtArguments([])).toThrow(/--map|--all|Usage/i);
	});
});

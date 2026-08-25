import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

import sharp from 'sharp';

import type {
	VillageInteriorImageManifest,
	VillageInteriorMapId,
	VillageInteriorPackageManifest
} from '$lib/game/content/backgrounds/village-interior-package';

export const VILLAGE_INTERIOR_MANIFEST_ROOT = 'src/lib/game/content/backgrounds/manifests';
export const VILLAGE_INTERIOR_ASSET_ROOT = 'public/game/assets/interiors';

const MAP_IDS: readonly VillageInteriorMapId[] = [
	'hero-house',
	'guild-hall',
	'item-shop',
	'villager-house-1',
	'villager-house-2',
	'villager-house-3',
	'shrine-of-aurora-interior'
];
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export interface VillageInteriorArtArguments {
	readonly all: boolean;
	readonly mapId?: VillageInteriorMapId;
	readonly check: boolean;
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function isVillageInteriorMapId(value: string): value is VillageInteriorMapId {
	return (MAP_IDS as readonly string[]).includes(value);
}

function imagePathFromManifest(
	image: VillageInteriorImageManifest,
	mapId: VillageInteriorMapId,
	repositoryRoot: string
): string {
	const path = image.path.replaceAll('\\', '/');
	const prefixes = [
		'/game/assets/interiors/',
		'game/assets/interiors/',
		'public/game/assets/interiors/'
	];
	const prefix = prefixes.find((candidate) => path.startsWith(candidate));
	assert(
		prefix,
		`${mapId} ${image.id} image path is outside the interior asset root: ${image.path}`
	);
	const suffix = path.slice(prefix.length);
	assert(
		suffix.startsWith(`${mapId}/`) && !suffix.includes('..') && !suffix.includes('\0'),
		`${mapId} ${image.id} image path is outside its map asset root: ${image.path}`
	);
	const allowedRoot = resolve(repositoryRoot, VILLAGE_INTERIOR_ASSET_ROOT, mapId);
	const resolvedPath = resolve(allowedRoot, suffix.slice(mapId.length + 1));
	assert(
		relative(allowedRoot, resolvedPath) === suffix.slice(mapId.length + 1),
		`${mapId} ${image.id} image path escapes its map asset root: ${image.path}`
	);
	return resolvedPath;
}

async function readRgba(
	path: string
): Promise<{ readonly data: Buffer; readonly width: number; readonly height: number }> {
	const { data, info } = await sharp(await readFile(path))
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	assert(info.channels === 4, `${path} did not decode as RGBA`);
	return { data, width: info.width, height: info.height };
}

function validateImageManifest(image: VillageInteriorImageManifest, label: string): void {
	assert(image.id.length > 0, `${label} image ID is required`);
	assert(image.textureKey.length > 0, `${label} texture key is required`);
	assert(image.path.length > 0, `${label} image path is required`);
	assert(SHA256_PATTERN.test(image.sha256), `${label} image SHA-256 is invalid`);
}

async function validateImage(
	image: VillageInteriorImageManifest,
	label: 'base' | 'foreground',
	mapId: VillageInteriorMapId,
	dimensions: { readonly width: number; readonly height: number },
	repositoryRoot: string
): Promise<void> {
	validateImageManifest(image, `${mapId} ${label}`);
	const path = imagePathFromManifest(image, mapId, repositoryRoot);
	const bytes = await readFile(path);
	assert(
		createHash('sha256').update(bytes).digest('hex') === image.sha256,
		`${mapId} ${label} image SHA-256 drifted: ${image.path}`
	);
	const decoded = await readRgba(path);
	assert(
		decoded.width === dimensions.width && decoded.height === dimensions.height,
		`${mapId} ${label} image dimensions must be ${dimensions.width}x${dimensions.height}`
	);

	let hasTransparent = false;
	let hasVisible = false;
	for (let index = 3; index < decoded.data.length; index += 4) {
		const alpha = decoded.data[index]!;
		if (alpha === 0) hasTransparent = true;
		else hasVisible = true;
		if (label === 'base') {
			assert(alpha === 255, `${mapId} base image must be fully opaque`);
		}
	}
	if (label === 'foreground') {
		assert(
			hasTransparent && hasVisible,
			`${mapId} foreground image must contain both transparent and non-transparent pixels`
		);
	}
}

export async function validateVillageInteriorManifest(
	manifest: VillageInteriorPackageManifest,
	repositoryRoot = process.cwd()
): Promise<void> {
	assert(manifest.version === 1, 'Village interior manifest version is unsupported');
	assert(
		isVillageInteriorMapId(manifest.mapId),
		`Unknown village interior map ID: ${manifest.mapId}`
	);
	assert(
		Number.isSafeInteger(manifest.dimensionsPx.width) && manifest.dimensionsPx.width > 0,
		`${manifest.mapId} manifest width is invalid`
	);
	assert(
		Number.isSafeInteger(manifest.dimensionsPx.height) && manifest.dimensionsPx.height > 0,
		`${manifest.mapId} manifest height is invalid`
	);
	await validateImage(manifest.base, 'base', manifest.mapId, manifest.dimensionsPx, repositoryRoot);
	if (manifest.foreground) {
		assert(
			manifest.foreground.id !== manifest.base.id &&
				manifest.foreground.textureKey !== manifest.base.textureKey,
			`${manifest.mapId} base and foreground image descriptors must be unique`
		);
		await validateImage(
			manifest.foreground,
			'foreground',
			manifest.mapId,
			manifest.dimensionsPx,
			repositoryRoot
		);
	}
}

async function readManifest(path: string): Promise<VillageInteriorPackageManifest> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(await readFile(path, 'utf8'));
	} catch (error) {
		throw new Error(`Village interior manifest is not valid JSON: ${path}`, { cause: error });
	}
	assert(
		parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed),
		`${path} is not an object`
	);
	return parsed as VillageInteriorPackageManifest;
}

export async function collectRegisteredVillageInteriorManifests(
	repositoryRoot = process.cwd()
): Promise<readonly VillageInteriorPackageManifest[]> {
	const root = resolve(repositoryRoot, VILLAGE_INTERIOR_MANIFEST_ROOT);
	let entries;
	try {
		entries = await readdir(root, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw error;
	}
	const paths = entries
		.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
		.map((entry) => entry.name)
		.sort()
		.map((name) => join(root, name));
	const manifests = await Promise.all(paths.map(readManifest));
	const mapIds = new Set<string>();
	for (const manifest of manifests) {
		assert(
			!mapIds.has(manifest.mapId),
			`Village interior manifest map ID is duplicated: ${manifest.mapId}`
		);
		mapIds.add(manifest.mapId);
	}
	return manifests;
}

export function parseVillageInteriorArtArguments(
	args: readonly string[]
): VillageInteriorArtArguments {
	let all = false;
	let mapId: VillageInteriorMapId | undefined;
	let check = false;
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (argument === '--all' && !all && mapId === undefined) {
			all = true;
			continue;
		}
		if (argument === '--map' && !all && mapId === undefined) {
			const value = args[index + 1];
			assert(
				value !== undefined && isVillageInteriorMapId(value),
				'Usage: --map <VillageInteriorMapId> [--check]'
			);
			mapId = value;
			index += 1;
			continue;
		}
		if (argument === '--check' && !check) {
			check = true;
			continue;
		}
		throw new Error(
			'Usage: bun tools/validate-village-interior-art.ts --map <id> [--check] | --all [--check]'
		);
	}
	assert(all || mapId !== undefined, 'Usage requires --map <id> or --all');
	return all ? { all: true, check } : { all: false, mapId, check };
}

export async function validateVillageInteriorArt(
	args: readonly string[],
	repositoryRoot = process.cwd()
): Promise<readonly VillageInteriorPackageManifest[]> {
	const parsed = parseVillageInteriorArtArguments(args);
	const manifests = parsed.all
		? await collectRegisteredVillageInteriorManifests(repositoryRoot)
		: (await collectRegisteredVillageInteriorManifests(repositoryRoot)).filter(
				(manifest) => manifest.mapId === parsed.mapId
			);
	if (!parsed.all)
		assert(
			manifests.length === 1,
			`Registered village interior manifest is missing: ${parsed.mapId}`
		);
	for (const manifest of manifests) await validateVillageInteriorManifest(manifest, repositoryRoot);
	return manifests;
}

if (import.meta.main) {
	await validateVillageInteriorArt(process.argv.slice(2))
		.then((manifests) => console.log(`Validated ${manifests.length} village interior manifest(s)`))
		.catch((error: unknown) => {
			console.error(error instanceof Error ? error.message : error);
			process.exitCode = 1;
		});
}

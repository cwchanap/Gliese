import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { meadowEntryArtPackageApproval } from '$lib/game/content/approvals/meadow-entry-art-package';
import {
	clampBoundsToWorld,
	containsBounds,
	rasterizeCoverageBounds
} from '$lib/game/content/backgrounds/meadow-entry-authoring-geometry';
import type {
	Insets,
	PixelBounds,
	RawPixelBounds
} from '$lib/game/content/backgrounds/meadow-entry-authoring-types';
import {
	MEADOW_ENTRY_BAKE_OWNERSHIP,
	type MeadowEntryBakeOwnershipEntry
} from '$lib/game/content/backgrounds/meadow-entry-bake-ownership';
import {
	MEADOW_ENTRY_APPROVED_CROPS,
	type MeadowEntryApprovedCrop
} from '$lib/game/content/backgrounds/meadow-entry-crop-manifest';
import {
	collectMeadowEntrySourceCatalog,
	meadowEntrySourceKey
} from '$lib/game/content/backgrounds/meadow-entry-source-catalog';
import { SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP } from '$lib/game/content/backgrounds/sundrop-village-obstacle-ownership';
import type { MapBackgroundImage, MapVisualOwnerCrop } from '$lib/game/content/maps/types';

export interface MeadowEntryRuntimeBackground extends MapBackgroundImage {
	readonly cropId: string;
	readonly path: string;
}

export interface MeadowEntryRuntimeVisualOwner {
	readonly sourceType: 'blocker' | 'decor' | 'fence';
	readonly sourceId: string;
	readonly ownerCrops: readonly MapVisualOwnerCrop[];
}

export interface MeadowEntryRuntimeData {
	readonly backgrounds: readonly MeadowEntryRuntimeBackground[];
	readonly visualOwners: readonly MeadowEntryRuntimeVisualOwner[];
}

const RUNTIME_REQUIREMENTS = new Set([
	'existing-blocker-fallback',
	'extend-decor-fallback',
	'extend-fence-fallback'
]);

const SUNDROP_BLOCKER_IDS = new Set(
	SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.map(({ blockerId }) => blockerId)
);

function compareStrings(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

function compareCrops(left: MeadowEntryApprovedCrop, right: MeadowEntryApprovedCrop): number {
	return left.drawOrder - right.drawOrder || compareStrings(left.id, right.id);
}

function compareVisualOwners(
	left: MeadowEntryRuntimeVisualOwner,
	right: MeadowEntryRuntimeVisualOwner
): number {
	return (
		compareStrings(left.sourceType, right.sourceType) ||
		compareStrings(left.sourceId, right.sourceId)
	);
}

function compareBackgrounds(
	left: MeadowEntryRuntimeBackground,
	right: MeadowEntryRuntimeBackground
): number {
	if (left.drawOrder !== right.drawOrder) return left.drawOrder - right.drawOrder;
	if (left.plane !== right.plane) return left.plane === 'base' ? -1 : 1;
	return compareStrings(left.id, right.id);
}

function expandRequiredBounds(bounds: RawPixelBounds, margins: Insets): PixelBounds {
	const raster = rasterizeCoverageBounds(bounds);
	return clampBoundsToWorld({
		left: raster.left - margins.left,
		top: raster.top - margins.top,
		right: raster.right + margins.right,
		bottom: raster.bottom + margins.bottom
	}).bounds;
}

function sourceLabel(entry: MeadowEntryBakeOwnershipEntry): string {
	return `${entry.ref.sourceType}:${entry.ref.sourceId} (primaryRegionId ${entry.primaryRegionId})`;
}

function requireCompleteCrops(
	entry: MeadowEntryBakeOwnershipEntry,
	crops: readonly MeadowEntryApprovedCrop[]
): readonly MeadowEntryApprovedCrop[] {
	if (crops.length === 0) {
		throw new Error(`No complete Meadow Entry owner crop for ${sourceLabel(entry)}`);
	}
	return [...crops].sort(compareCrops);
}

function collectOwnerCrops(
	entry: MeadowEntryBakeOwnershipEntry,
	bounds: RawPixelBounds
): readonly MapVisualOwnerCrop[] {
	if (entry.disposition.mode === 'base-static') {
		const baseRequiredBounds = expandRequiredBounds(bounds, entry.disposition.margins);
		return requireCompleteCrops(
			entry,
			MEADOW_ENTRY_APPROVED_CROPS.filter((crop) => containsBounds(crop.bounds, baseRequiredBounds))
		).map((crop) => ({
			cropId: crop.id,
			requiredBackgroundIds: [`${crop.textureKeys.base}-image`]
		}));
	}

	if (entry.disposition.mode === 'base-and-foreground') {
		const baseRequiredBounds = expandRequiredBounds(bounds, entry.disposition.baseMargins);
		const foregroundRequiredBounds = expandRequiredBounds(
			bounds,
			entry.disposition.foregroundMargins
		);
		return requireCompleteCrops(
			entry,
			MEADOW_ENTRY_APPROVED_CROPS.filter(
				(crop) =>
					crop.textureKeys.foreground !== null &&
					containsBounds(crop.bounds, baseRequiredBounds) &&
					containsBounds(crop.bounds, foregroundRequiredBounds)
			)
		).map((crop) => {
			const foregroundTextureKey = crop.textureKeys.foreground;
			if (foregroundTextureKey === null) {
				throw new Error(`Missing foreground texture key for ${crop.id}`);
			}
			return {
				cropId: crop.id,
				requiredBackgroundIds: [`${crop.textureKeys.base}-image`, `${foregroundTextureKey}-image`]
			};
		});
	}

	throw new Error(`Unsupported runtime ownership disposition for ${sourceLabel(entry)}`);
}

function collectRuntimeBackgrounds(): readonly MeadowEntryRuntimeBackground[] {
	const cropsById = new Map(MEADOW_ENTRY_APPROVED_CROPS.map((crop) => [crop.id, crop]));
	return meadowEntryArtPackageApproval.exports
		.map((approved) => {
			const crop = cropsById.get(approved.cropId);
			if (!crop) throw new Error(`Approved export references unknown crop ${approved.cropId}`);
			const filename = approved.path.split('/').at(-1);
			if (!filename) throw new Error(`Approved export has no filename ${approved.path}`);
			return {
				cropId: approved.cropId,
				id: `${approved.textureKey}-image`,
				textureKey: approved.textureKey,
				path: `/game/assets/regions/meadow-entry/${filename}`,
				x: (crop.bounds.left + crop.bounds.right) / 2,
				y: (crop.bounds.top + crop.bounds.bottom) / 2,
				width: approved.width,
				height: approved.height,
				plane: approved.plane,
				drawOrder: approved.drawOrder
			};
		})
		.sort(compareBackgrounds);
}

function collectRuntimeVisualOwners(): readonly MeadowEntryRuntimeVisualOwner[] {
	const sourcesByKey = new Map(
		collectMeadowEntrySourceCatalog().map((source) => [meadowEntrySourceKey(source.ref), source])
	);

	return MEADOW_ENTRY_BAKE_OWNERSHIP.filter(({ runtimeRequirement }) =>
		RUNTIME_REQUIREMENTS.has(runtimeRequirement)
	)
		.filter(({ ref }) => ref.sourceType !== 'blocker' || !SUNDROP_BLOCKER_IDS.has(ref.sourceId))
		.map((entry) => {
			const { sourceType, sourceId } = entry.ref;
			if (sourceType !== 'blocker' && sourceType !== 'decor' && sourceType !== 'fence') {
				throw new Error(`Unsupported runtime ownership source ${sourceLabel(entry)}`);
			}
			const source = sourcesByKey.get(meadowEntrySourceKey(entry.ref));
			if (!source || source.bounds === null) {
				throw new Error(`Missing bounds for Meadow Entry runtime owner ${sourceLabel(entry)}`);
			}
			return {
				sourceType,
				sourceId,
				ownerCrops: collectOwnerCrops(entry, source.bounds)
			};
		})
		.sort(compareVisualOwners);
}

export function collectMeadowEntryRuntimeData(): MeadowEntryRuntimeData {
	return {
		backgrounds: collectRuntimeBackgrounds(),
		visualOwners: collectRuntimeVisualOwners()
	};
}

function renderString(value: string): string {
	return `'${value
		.replaceAll('\\', '\\\\')
		.replaceAll("'", "\\'")
		.replaceAll('\n', '\\n')
		.replaceAll('\r', '\\r')
		.replaceAll('\t', '\\t')}'`;
}

function renderBackground(background: MeadowEntryRuntimeBackground): string {
	return [
		'\t{',
		`\t\tcropId: ${renderString(background.cropId)},`,
		`\t\tid: ${renderString(background.id)},`,
		`\t\ttextureKey: ${renderString(background.textureKey)},`,
		`\t\tpath: ${renderString(background.path)},`,
		`\t\tx: ${background.x},`,
		`\t\ty: ${background.y},`,
		`\t\twidth: ${background.width},`,
		`\t\theight: ${background.height},`,
		`\t\tplane: ${renderString(background.plane)},`,
		`\t\tdrawOrder: ${background.drawOrder}`,
		'\t}'
	].join('\n');
}

function renderedLineLength(line: string): number {
	return line.replaceAll('\t', '  ').length;
}

function renderStringArray(
	property: string,
	values: readonly string[],
	indent: string
): readonly string[] {
	const inline = `[${values.map(renderString).join(', ')}]`;
	const inlineLine = `${indent}${property}: ${inline}`;
	if (renderedLineLength(inlineLine) <= 100) return [inlineLine];
	return [
		`${indent}${property}: [`,
		...values.map(
			(value, index) => `${indent}\t${renderString(value)}${index === values.length - 1 ? '' : ','}`
		),
		`${indent}]`
	];
}

function renderOwnerCrop(ownerCrop: MapVisualOwnerCrop): string {
	const indent = '\t\t\t';
	return [
		`${indent}{`,
		`${indent}\tcropId: ${renderString(ownerCrop.cropId)},`,
		...renderStringArray('requiredBackgroundIds', ownerCrop.requiredBackgroundIds, `${indent}\t`),
		`${indent}}`
	].join('\n');
}

function renderVisualOwner(owner: MeadowEntryRuntimeVisualOwner): string {
	return [
		'\t{',
		`\t\tsourceType: ${renderString(owner.sourceType)},`,
		`\t\tsourceId: ${renderString(owner.sourceId)},`,
		'\t\townerCrops: [',
		owner.ownerCrops.map(renderOwnerCrop).join(',\n'),
		'\t\t]',
		'\t}'
	].join('\n');
}

export function renderMeadowEntryRuntimeData(data: MeadowEntryRuntimeData): string {
	return [
		'// @generated by tools/generate-meadow-entry-runtime.ts. Do not edit by hand.',
		'',
		"import type { MapBackgroundImage, MapVisualOwnerCrop } from '$lib/game/content/maps/types';",
		'',
		'export interface GeneratedMeadowEntryBackground extends MapBackgroundImage {',
		'\treadonly cropId: string;',
		'\treadonly path: string;',
		'}',
		'',
		'export interface GeneratedMeadowEntryVisualOwner {',
		"\treadonly sourceType: 'blocker' | 'decor' | 'fence';",
		'\treadonly sourceId: string;',
		'\treadonly ownerCrops: readonly MapVisualOwnerCrop[];',
		'}',
		'',
		'export const MEADOW_ENTRY_APPROVED_RUNTIME_BACKGROUNDS = [',
		data.backgrounds.map(renderBackground).join(',\n'),
		'] as const satisfies readonly GeneratedMeadowEntryBackground[];',
		'',
		'export const MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS = [',
		data.visualOwners.map(renderVisualOwner).join(',\n'),
		'] as const satisfies readonly GeneratedMeadowEntryVisualOwner[];',
		''
	].join('\n');
}

export function syncGeneratedMeadowEntryRuntimeData(
	source: string,
	destinationPath: string,
	check: boolean
): void {
	if (check) {
		if (!existsSync(destinationPath)) {
			throw new Error(`generated meadow-entry runtime data is missing: ${destinationPath}`);
		}
		if (!readFileSync(destinationPath).equals(Buffer.from(source, 'utf8'))) {
			throw new Error(`generated meadow-entry runtime data is stale: ${destinationPath}`);
		}
		return;
	}

	mkdirSync(dirname(destinationPath), { recursive: true });
	const temporaryPath = `${destinationPath}.${process.pid}.${randomUUID()}.tmp`;
	try {
		writeFileSync(temporaryPath, source, { encoding: 'utf8', flag: 'wx' });
		renameSync(temporaryPath, destinationPath);
	} finally {
		if (existsSync(temporaryPath)) rmSync(temporaryPath);
	}
}

function parseCheckMode(args: readonly string[]): boolean {
	if (args.length === 0) return false;
	if (args.length === 1 && args[0] === '--check') return true;
	throw new Error('Usage: bun tools/generate-meadow-entry-runtime.ts [--check]');
}

export function runMeadowEntryRuntimeGenerator(
	args: readonly string[],
	repositoryRoot = process.cwd()
): void {
	const check = parseCheckMode(args);
	const destination = resolve(
		repositoryRoot,
		'src/lib/game/content/generated/meadow-entry-runtime.ts'
	);
	const source = renderMeadowEntryRuntimeData(collectMeadowEntryRuntimeData());
	syncGeneratedMeadowEntryRuntimeData(source, destination, check);
	console.log(check ? 'meadow-entry runtime data is current' : 'wrote meadow-entry runtime data');
}

if (import.meta.main) runMeadowEntryRuntimeGenerator(process.argv.slice(2));

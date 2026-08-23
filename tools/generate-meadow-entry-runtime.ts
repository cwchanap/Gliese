import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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
	MEADOW_ENTRY_PAINTED_V2_BAKE_OWNERSHIP,
	type MeadowEntryBakeOwnershipEntry
} from '$lib/game/content/backgrounds/meadow-entry-bake-ownership';
import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest';
import { meadowEntryPaintedV2CompleteArtPackageApproval } from '$lib/game/content/approvals/meadow-entry-painted-v2-complete-art-package';
import type { MeadowEntryApprovedCrop } from '$lib/game/content/backgrounds/meadow-entry-crop-manifest';
import {
	collectMeadowEntrySourceCatalog,
	meadowEntrySourceKey
} from '$lib/game/content/backgrounds/meadow-entry-source-catalog';
import { meadowEntryPaintedV2ArtPackageApproval } from '$lib/game/content/approvals/meadow-entry-painted-v2-art-package';
import type {
	MapBackgroundImage,
	MapBackgroundPlane,
	MapVisualOwnerCrop
} from '$lib/game/content/maps/types';

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

export interface MeadowEntryRuntimeGenerationInput {
	readonly crops: readonly MeadowEntryApprovedCrop[];
	readonly bakeOwnership: readonly MeadowEntryBakeOwnershipEntry[];
	readonly approvedExports: readonly {
		readonly cropId: string;
		readonly path: string;
		readonly width: number;
		readonly height: number;
		readonly plane: MapBackgroundPlane;
		readonly textureKey: string;
		readonly drawOrder: number;
	}[];
	readonly runtimeRoot: string;
}

function asApprovedExports(
	approval: typeof meadowEntryPaintedV2ArtPackageApproval
): MeadowEntryRuntimeGenerationInput['approvedExports'] {
	return approval.exports.map((approved) => {
		const textureKey = approved.textureKey as string | null;
		if (textureKey === null) {
			throw new Error(`Painted-v2 runtime export has no texture key: ${approved.cropId}`);
		}
		return {
			cropId: approved.cropId,
			path: approved.path,
			width: approved.width,
			height: approved.height,
			plane: approved.plane,
			textureKey,
			drawOrder: approved.drawOrder
		};
	});
}

export const MEADOW_ENTRY_PAINTED_V2_RUNTIME_GENERATION_INPUT: MeadowEntryRuntimeGenerationInput =
	Object.freeze({
		crops: MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
		bakeOwnership: MEADOW_ENTRY_PAINTED_V2_BAKE_OWNERSHIP,
		approvedExports: Object.freeze(asApprovedExports(meadowEntryPaintedV2ArtPackageApproval)),
		runtimeRoot: 'public/game/assets/regions/meadow-entry-painted-v2'
	});

export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_GENERATION_INPUT: MeadowEntryRuntimeGenerationInput =
	Object.freeze({
		crops: MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS,
		bakeOwnership: Object.freeze([]),
		approvedExports: Object.freeze(completeApprovedExports()),
		runtimeRoot: 'public/game/assets/regions/meadow-entry-painted-v2'
	});

function completeApprovedExports(): MeadowEntryRuntimeGenerationInput['approvedExports'] {
	if (
		meadowEntryPaintedV2CompleteArtPackageApproval.packageId !==
			'meadow-entry-painted-v2-complete' ||
		meadowEntryPaintedV2CompleteArtPackageApproval.coverage !== 'full-map'
	) {
		throw new Error('Complete Meadow Entry runtime approval package or coverage is stale');
	}
	if (meadowEntryPaintedV2CompleteArtPackageApproval.exports.length !== 4) {
		throw new Error('Complete Meadow Entry runtime approval must contain four exports');
	}
	return meadowEntryPaintedV2CompleteArtPackageApproval.exports.map((approved) => {
		const crop = MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS.find(({ id }) => id === approved.cropId);
		if (!crop)
			throw new Error(
				`Complete Meadow Entry runtime approval references unknown crop ${approved.cropId}`
			);
		if (
			approved.plane !== 'base' ||
			approved.width !== crop.expectedDimensions.width ||
			approved.height !== crop.expectedDimensions.height ||
			approved.textureKey !== crop.textureKeys.base ||
			approved.drawOrder !== crop.drawOrder ||
			approved.path !== `public/game/assets/regions/meadow-entry-painted-v2/${crop.baseFilename}`
		) {
			throw new Error(`Complete Meadow Entry runtime approval export is stale: ${approved.cropId}`);
		}
		return {
			cropId: approved.cropId,
			path: approved.path,
			width: approved.width,
			height: approved.height,
			plane: approved.plane,
			textureKey: approved.textureKey,
			drawOrder: approved.drawOrder
		};
	});
}

const RUNTIME_REQUIREMENTS = new Set([
	'existing-blocker-fallback',
	'extend-decor-fallback',
	'extend-fence-fallback'
]);

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
	bounds: RawPixelBounds,
	crops: readonly MeadowEntryApprovedCrop[]
): readonly MapVisualOwnerCrop[] {
	if (entry.disposition.mode === 'base-static') {
		const baseRequiredBounds = expandRequiredBounds(bounds, entry.disposition.margins);
		return requireCompleteCrops(
			entry,
			crops.filter((crop) => containsBounds(crop.bounds, baseRequiredBounds))
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
			crops.filter(
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

function runtimeAssetPath(runtimeRoot: string, filename: string): string {
	const normalizedRoot = runtimeRoot.replaceAll('\\', '/').replace(/\/+$/, '');
	if (normalizedRoot.length === 0 || normalizedRoot.split('/').includes('..')) {
		throw new Error(`Invalid Meadow Entry runtime root: ${runtimeRoot}`);
	}
	const browserRoot = normalizedRoot.startsWith('public/')
		? normalizedRoot.slice('public'.length)
		: normalizedRoot.startsWith('/')
			? normalizedRoot
			: `/${normalizedRoot}`;
	return `${browserRoot}/${filename}`;
}

function collectRuntimeBackgrounds(
	input: MeadowEntryRuntimeGenerationInput
): readonly MeadowEntryRuntimeBackground[] {
	const cropsById = new Map(input.crops.map((crop) => [crop.id, crop]));
	return input.approvedExports
		.map((approved) => {
			const crop = cropsById.get(approved.cropId);
			if (!crop) throw new Error(`Approved export references unknown crop ${approved.cropId}`);
			const filename = approved.path.split('/').at(-1);
			if (!filename) throw new Error(`Approved export has no filename ${approved.path}`);
			return {
				cropId: approved.cropId,
				id: `${approved.textureKey}-image`,
				textureKey: approved.textureKey,
				path: runtimeAssetPath(input.runtimeRoot, filename),
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

function collectRuntimeVisualOwners(
	input: MeadowEntryRuntimeGenerationInput
): readonly MeadowEntryRuntimeVisualOwner[] {
	const sourcesByKey = new Map(
		collectMeadowEntrySourceCatalog().map((source) => [meadowEntrySourceKey(source.ref), source])
	);

	return input.bakeOwnership
		.filter(({ runtimeRequirement }) => RUNTIME_REQUIREMENTS.has(runtimeRequirement))
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
				ownerCrops: collectOwnerCrops(entry, source.bounds, input.crops)
			};
		})
		.sort(compareVisualOwners);
}

export function collectMeadowEntryRuntimeData(
	input: MeadowEntryRuntimeGenerationInput
): MeadowEntryRuntimeData {
	return {
		backgrounds: collectRuntimeBackgrounds(input),
		visualOwners: collectRuntimeVisualOwners(input)
	};
}

export function collectMeadowEntryCompleteRuntimeData(
	input: MeadowEntryRuntimeGenerationInput
): MeadowEntryRuntimeData {
	if (input.bakeOwnership.length !== 0) {
		throw new Error('Complete Meadow Entry runtime generation must suppress visual owners');
	}
	const data = collectMeadowEntryRuntimeData(input);
	if (data.visualOwners.length !== 0) {
		throw new Error('Complete Meadow Entry runtime generation emitted visual owners');
	}
	if (
		data.backgrounds.length !== 4 ||
		data.backgrounds.some(
			(background) =>
				background.plane !== 'base' || background.width !== 3200 || background.height !== 3200
		)
	) {
		throw new Error(
			'Complete Meadow Entry runtime generation requires four 3200x3200 base exports'
		);
	}
	return data;
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

function renderMeadowEntryRuntimeDataWithNames(
	data: MeadowEntryRuntimeData,
	backgroundConstant: string,
	visualOwnersConstant: string
): string {
	const visualOwnerLines =
		data.visualOwners.length === 0
			? [
					`export const ${visualOwnersConstant} =`,
					'\t[] as const satisfies readonly GeneratedMeadowEntryVisualOwner[];'
				]
			: [
					`export const ${visualOwnersConstant} = [`,
					data.visualOwners.map(renderVisualOwner).join(',\n'),
					'] as const satisfies readonly GeneratedMeadowEntryVisualOwner[];'
				];
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
		`export const ${backgroundConstant} = [`,
		data.backgrounds.map(renderBackground).join(',\n'),
		'] as const satisfies readonly GeneratedMeadowEntryBackground[];',
		'',
		...visualOwnerLines,
		''
	].join('\n');
}

export function renderMeadowEntryRuntimeData(data: MeadowEntryRuntimeData): string {
	return renderMeadowEntryRuntimeDataWithNames(
		data,
		'MEADOW_ENTRY_PAINTED_V2_APPROVED_RUNTIME_BACKGROUNDS',
		'MEADOW_ENTRY_PAINTED_V2_RUNTIME_VISUAL_OWNERS'
	);
}

export function renderMeadowEntryCompleteRuntimeData(data: MeadowEntryRuntimeData): string {
	return renderMeadowEntryRuntimeDataWithNames(
		data,
		'MEADOW_ENTRY_PAINTED_V2_COMPLETE_APPROVED_RUNTIME_BACKGROUNDS',
		'MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_VISUAL_OWNERS'
	);
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

export function parseCheckMode(args: readonly string[]): boolean {
	const parsed = parseMeadowEntryRuntimeArguments(args);
	if (parsed.packageName !== 'legacy') {
		throw new Error('Usage: bun tools/generate-meadow-entry-runtime.ts [--check]');
	}
	return parsed.check;
}

export function parseMeadowEntryRuntimeArguments(args: readonly string[]): {
	readonly packageName: 'legacy' | 'complete';
	readonly check: boolean;
} {
	let packageName: 'legacy' | 'complete' = 'legacy';
	let check = false;
	for (let index = 0; index < args.length; index += 1) {
		const flag = args[index];
		if (flag === '--check' && !check) {
			check = true;
			continue;
		}
		if (flag === '--package' && packageName === 'legacy') {
			const value = args[index + 1];
			if (value !== 'complete') {
				throw new Error(
					'Usage: bun tools/generate-meadow-entry-runtime.ts [--package complete] [--check]'
				);
			}
			packageName = 'complete';
			index += 1;
			continue;
		}
		throw new Error(
			'Usage: bun tools/generate-meadow-entry-runtime.ts [--package complete] [--check]'
		);
	}
	return { packageName, check };
}

export function runMeadowEntryRuntimeGenerator(
	args: readonly string[],
	repositoryRoot = process.cwd()
): void {
	const { packageName, check } = parseMeadowEntryRuntimeArguments(args);
	const destination = resolve(
		repositoryRoot,
		packageName === 'complete'
			? 'src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete.generated.ts'
			: 'src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts'
	);
	const source =
		packageName === 'complete'
			? renderMeadowEntryCompleteRuntimeData(
					collectMeadowEntryCompleteRuntimeData(
						MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_GENERATION_INPUT
					)
				)
			: renderMeadowEntryRuntimeData(
					collectMeadowEntryRuntimeData(MEADOW_ENTRY_PAINTED_V2_RUNTIME_GENERATION_INPUT)
				);
	syncGeneratedMeadowEntryRuntimeData(source, destination, check);
	console.log(check ? 'meadow-entry runtime data is current' : 'wrote meadow-entry runtime data');
}

if (import.meta.main) runMeadowEntryRuntimeGenerator(process.argv.slice(2));

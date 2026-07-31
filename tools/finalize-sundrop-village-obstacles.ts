import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import sharp from 'sharp';

import { sundropVillageBackgroundAlpha } from '$lib/game/content/backgrounds/sundrop-village-background';
import {
	buildSundropVillageObstacleControlInputs,
	computeSundropVillageObstacleControlFingerprint,
	SUNDROP_VILLAGE_OBSTACLE_CONTROL_FILENAMES
} from '$lib/game/content/backgrounds/sundrop-village-obstacle-controls';
import {
	CANDIDATE_ALIGNMENT_INSET_PX,
	compositeSundropVillageObstacles,
	type SundropVillageObstacleNormalizationTransform
} from '$lib/game/content/backgrounds/sundrop-village-obstacle-composite';
import {
	SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
	SUNDROP_VILLAGE_BACKGROUND_WIDTH,
	SUNDROP_VILLAGE_BASE_BACKGROUND_HARD_LIMIT_BYTES,
	SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_HARD_LIMIT_BYTES,
	SUNDROP_VILLAGE_BACKGROUND_COMBINED_HARD_LIMIT_BYTES
} from '$lib/game/content/backgrounds/sundrop-village-backgrounds';
import { SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP } from '$lib/game/content/backgrounds/sundrop-village-obstacle-ownership';
import { SUNDROP_VILLAGE_OBSTACLE_CONTROL_FINGERPRINT } from '$lib/game/content/generated/sundrop-village-obstacle-control';

const repositoryRoot = process.cwd();
const artifactDirectory = join(repositoryRoot, 'docs/superpowers/reports/img/hpa-398');
const sourcePath = join(artifactDirectory, 'sundrop-village-hpa-307-ground-input.png');
const chromaSourcePath = join(artifactDirectory, 'village-obstacle-chroma-source.png');
const obstacleLayerPath = join(artifactDirectory, 'village-obstacle-layer.png');
const candidatePath = join(artifactDirectory, 'village-obstacle-candidate.png');
const promptPath = join(artifactDirectory, 'village-obstacle-generation-prompt.txt');
const transformPath = join(artifactDirectory, 'village-obstacle-candidate-transform.json');
const provenancePath = join(artifactDirectory, 'village-obstacle-provenance.json');
const baseOutputPath = join(repositoryRoot, 'public/game/assets/regions/sundrop-village-base.png');
const foregroundOutputPath = join(
	repositoryRoot,
	'public/game/assets/regions/sundrop-village-foreground.png'
);

function greatestCommonDivisor(left: number, right: number): number {
	return right === 0 ? left : greatestCommonDivisor(right, left % right);
}

function maskInputFromControlArtifact(
	controlArtifacts: Record<string, { readonly path: string; readonly bytes: Buffer }>,
	filename: string
): { readonly path: string; readonly png: Buffer } {
	const artifact = controlArtifacts[filename];
	if (!artifact) {
		throw new Error(`Missing Sundrop obstacle control artifact: ${filename}`);
	}
	return { path: artifact.path, png: artifact.bytes };
}

function centeredUniformTransform(
	nativeWidth: number,
	nativeHeight: number
): SundropVillageObstacleNormalizationTransform {
	// Derive the shared aspect unit from the background dimensions so the
	// 7:6 normalization stays correct if the constants ever change. For the
	// committed 1792x1536 crop this is gcd(1792, 1536) = 256.
	const aspectUnit = greatestCommonDivisor(
		SUNDROP_VILLAGE_BACKGROUND_WIDTH,
		SUNDROP_VILLAGE_BACKGROUND_HEIGHT
	);
	const commonWidth = SUNDROP_VILLAGE_BACKGROUND_WIDTH / aspectUnit;
	const commonHeight = SUNDROP_VILLAGE_BACKGROUND_HEIGHT / aspectUnit;
	const factor = Math.floor(Math.min(nativeWidth / commonWidth, nativeHeight / commonHeight));
	if (factor <= 0) {
		throw new Error('Sundrop Village obstacle candidate is too small to normalize');
	}
	const cropWidth = commonWidth * factor;
	const cropHeight = commonHeight * factor;
	const cropX = Math.floor((nativeWidth - cropWidth) / 2);
	const cropY = Math.floor((nativeHeight - cropHeight) / 2);
	const scale = SUNDROP_VILLAGE_BACKGROUND_WIDTH / cropWidth;
	return {
		native: { width: nativeWidth, height: nativeHeight },
		crop: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
		output: {
			width: SUNDROP_VILLAGE_BACKGROUND_WIDTH,
			height: SUNDROP_VILLAGE_BACKGROUND_HEIGHT
		},
		scaleX: scale,
		scaleY: scale
	};
}

function assertBudget(label: string, bytes: number, limit: number): void {
	if (bytes > limit) {
		throw new Error(`${label} exceeds its hard limit: ${bytes} > ${limit}`);
	}
}

async function main(): Promise<void> {
	const source = readFileSync(sourcePath);
	const chromaSource = readFileSync(chromaSourcePath);
	const obstacleLayer = readFileSync(obstacleLayerPath);
	const prompt = readFileSync(promptPath, 'utf8');
	const obstacleLayerMetadata = await sharp(obstacleLayer).metadata();
	if (!obstacleLayerMetadata.width || !obstacleLayerMetadata.height) {
		throw new Error('Sundrop Village obstacle layer dimensions are unavailable');
	}
	const normalizationTransform = centeredUniformTransform(
		obstacleLayerMetadata.width,
		obstacleLayerMetadata.height
	);
	const controlInputs = buildSundropVillageObstacleControlInputs(repositoryRoot);
	const controlFingerprint = computeSundropVillageObstacleControlFingerprint(controlInputs);
	if (
		controlFingerprint !== SUNDROP_VILLAGE_OBSTACLE_CONTROL_FINGERPRINT ||
		controlFingerprint !==
			JSON.parse(
				readFileSync(join(artifactDirectory, 'village-obstacle-control-manifest.json'), 'utf8')
			).computedControlFingerprint
	) {
		throw new Error('Sundrop Village obstacle controls are stale');
	}
	const controlArtifacts = Object.fromEntries(
		SUNDROP_VILLAGE_OBSTACLE_CONTROL_FILENAMES.map((filename) => [
			filename,
			{
				path: relative(repositoryRoot, join(artifactDirectory, filename)),
				bytes: readFileSync(join(artifactDirectory, filename))
			}
		])
	);
	const foregroundCutoffs = controlInputs.foregroundRects.map((rect) => {
		if (rect.bottom === undefined) {
			throw new Error(`Missing foreground cutoff for ${rect.id}`);
		}
		return {
			id: rect.id,
			left: rect.x - rect.width / 2,
			right: rect.x + rect.width / 2,
			cutoffY: rect.bottom
		};
	});
	const baseOnlyIds = new Set(
		SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.filter((entry) => !entry.foregroundMargins).map(
			(entry) => entry.blockerId
		)
	);
	const foregroundExclusions = controlInputs.baseRects.filter((rect) => baseOnlyIds.has(rect.id));
	const result = await compositeSundropVillageObstacles({
		width: SUNDROP_VILLAGE_BACKGROUND_WIDTH,
		height: SUNDROP_VILLAGE_BACKGROUND_HEIGHT,
		source: { path: relative(repositoryRoot, sourcePath), png: source },
		chromaSource: { path: relative(repositoryRoot, chromaSourcePath), png: chromaSource },
		obstacleLayer: { path: relative(repositoryRoot, obstacleLayerPath), png: obstacleLayer },
		candidateOutputPath: relative(repositoryRoot, candidatePath),
		masks: {
			base: maskInputFromControlArtifact(controlArtifacts, 'village-obstacle-base-mask.svg'),
			foreground: maskInputFromControlArtifact(
				controlArtifacts,
				'village-obstacle-foreground-mask.svg'
			),
			protected: maskInputFromControlArtifact(
				controlArtifacts,
				'village-obstacle-protected-mask.svg'
			)
		},
		candidateAlignmentInsetPx: CANDIDATE_ALIGNMENT_INSET_PX,
		normalizationTransform,
		controlFingerprint,
		controlArtifacts,
		prompt,
		baseAlpha: sundropVillageBackgroundAlpha,
		foregroundCutoffs,
		foregroundExclusions
	});
	assertBudget(
		'Sundrop Village obstacle base',
		result.basePng.byteLength,
		SUNDROP_VILLAGE_BASE_BACKGROUND_HARD_LIMIT_BYTES
	);
	assertBudget(
		'Sundrop Village obstacle foreground',
		result.foregroundPng.byteLength,
		SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_HARD_LIMIT_BYTES
	);
	assertBudget(
		'Sundrop Village obstacle planes',
		result.basePng.byteLength + result.foregroundPng.byteLength,
		SUNDROP_VILLAGE_BACKGROUND_COMBINED_HARD_LIMIT_BYTES
	);

	writeFileSync(baseOutputPath, result.basePng);
	writeFileSync(foregroundOutputPath, result.foregroundPng);
	writeFileSync(candidatePath, result.candidatePng);
	writeFileSync(transformPath, `${JSON.stringify(normalizationTransform, null, 2)}\n`);
	writeFileSync(provenancePath, result.provenanceJson);

	const provenance = JSON.parse(result.provenanceJson.toString('utf8'));
	console.log(`controlFingerprint=${controlFingerprint}`);
	console.log(`base.bytes=${result.basePng.byteLength}`);
	console.log(`base.sha256=${provenance.outputs.base.sha256}`);
	console.log(`foreground.bytes=${result.foregroundPng.byteLength}`);
	console.log(`foreground.sha256=${provenance.outputs.foreground.sha256}`);
	console.log(`combined.bytes=${result.basePng.byteLength + result.foregroundPng.byteLength}`);
	console.log(`transform=${relative(repositoryRoot, transformPath)}`);
	console.log(`provenance=${relative(repositoryRoot, provenancePath)}`);
}

await main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});

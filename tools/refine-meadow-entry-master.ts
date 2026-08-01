import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import { meadowEntryControlsApproval } from '$lib/game/content/approvals/meadow-entry-controls';
import { MEADOW_ENTRY_APPROVED_CROPS } from '$lib/game/content/backgrounds/meadow-entry-crop-manifest';
import { applyMeadowEntryRefinement } from '$lib/game/content/backgrounds/meadow-entry-master-refinement';
import type { MeadowEntryNormalizationTransform } from '$lib/game/content/backgrounds/meadow-entry-master-provenance';
import {
	buildMeadowEntryControlInputs,
	computeMeadowEntryCombinedControlFingerprint
} from '$lib/game/content/backgrounds/meadow-entry-controls';

type Plane = 'base' | 'foreground';

export interface RefineMeadowEntryMasterArguments {
	plane: Plane;
	currentMaster: string;
	replacement: string;
	editMask: string;
	protectedMask: string;
	nonTargetMask: string;
	transform: string;
	sourceRegionIds: readonly string[];
}

export interface MeadowEntryRefinementWorkPaths {
	candidate: string;
	sidecar: string;
}

const WORK_ROOT = 'artifacts/meadow-entry/hpa-399/work';

function requiredValue(values: ReadonlyMap<string, string>, flag: string): string {
	const value = values.get(flag);
	if (!value) throw new Error(`Missing required ${flag} argument.`);
	return value;
}

export function parseRefineMeadowEntryMasterArguments(
	args: readonly string[]
): RefineMeadowEntryMasterArguments {
	const values = new Map<string, string>();
	const sourceRegionIds: string[] = [];
	const flags = new Set([
		'--plane',
		'--current-master',
		'--replacement',
		'--edit-mask',
		'--protected-mask',
		'--non-target-mask',
		'--transform',
		'--source-region'
	]);
	for (let index = args[0] === '--' ? 1 : 0; index < args.length; index += 1) {
		const flag = args[index];
		if (flag === undefined || !flags.has(flag)) {
			throw new Error(`Unknown meadow-entry refinement argument: ${flag ?? '<missing>'}`);
		}
		const value = args[index + 1];
		if (value === undefined || value.startsWith('--')) {
			throw new Error(`Missing value for meadow-entry refinement argument: ${flag}`);
		}
		if (flag === '--source-region') {
			sourceRegionIds.push(value);
		} else {
			if (values.has(flag)) throw new Error(`Duplicate meadow-entry refinement argument: ${flag}`);
			values.set(flag, value);
		}
		index += 1;
	}
	const plane = requiredValue(values, '--plane');
	if (plane !== 'base' && plane !== 'foreground') {
		throw new Error('--plane must be base or foreground.');
	}
	if (sourceRegionIds.length === 0) {
		throw new Error('Missing required --source-region argument.');
	}
	return {
		plane,
		currentMaster: requiredValue(values, '--current-master'),
		replacement: requiredValue(values, '--replacement'),
		editMask: requiredValue(values, '--edit-mask'),
		protectedMask: requiredValue(values, '--protected-mask'),
		nonTargetMask: requiredValue(values, '--non-target-mask'),
		transform: requiredValue(values, '--transform'),
		sourceRegionIds
	};
}

export function meadowEntryRefinementWorkPaths(
	repositoryRoot: string,
	plane: Plane
): MeadowEntryRefinementWorkPaths {
	const work = resolve(repositoryRoot, WORK_ROOT);
	return {
		candidate: join(work, `meadow-entry-${plane}-refinement-candidate.png`),
		sidecar: join(work, `meadow-entry-${plane}-refinement.json`)
	};
}

function assertIgnoredWorkDestination(repositoryRoot: string, path: string): void {
	const relativePath = relative(resolve(repositoryRoot), path).replaceAll('\\', '/');
	assert(
		relativePath.startsWith(`${WORK_ROOT}/`) && !relativePath.includes('../'),
		`Refusing to write outside ignored Meadow Entry work directory: ${relativePath}`
	);
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

async function readTransform(path: string): Promise<MeadowEntryNormalizationTransform> {
	return JSON.parse(await readFile(path, 'utf8')) as MeadowEntryNormalizationTransform;
}

export async function runRefineMeadowEntryMaster(
	args: readonly string[],
	repositoryRoot = process.cwd()
): Promise<MeadowEntryRefinementWorkPaths> {
	const arguments_ = parseRefineMeadowEntryMasterArguments(args);
	const output = meadowEntryRefinementWorkPaths(repositoryRoot, arguments_.plane);
	assertIgnoredWorkDestination(repositoryRoot, output.candidate);
	assertIgnoredWorkDestination(repositoryRoot, output.sidecar);
	const [
		currentMasterPng,
		replacementPng,
		editMaskPng,
		protectedMaskPng,
		nonTargetMaskPng,
		transform
	] = await Promise.all([
		readFile(arguments_.currentMaster),
		readFile(arguments_.replacement),
		readFile(arguments_.editMask),
		readFile(arguments_.protectedMask),
		readFile(arguments_.nonTargetMask),
		readTransform(arguments_.transform)
	]);
	const controls = buildMeadowEntryControlInputs(repositoryRoot);
	const result = await applyMeadowEntryRefinement({
		plane: arguments_.plane,
		currentMasterPng,
		replacementPng,
		editMaskPng,
		protectedMaskPng,
		nonTargetMaskPng,
		transform,
		sourceRegionIds: arguments_.sourceRegionIds,
		controlFingerprint: computeMeadowEntryCombinedControlFingerprint(controls),
		approvedControlFingerprint: meadowEntryControlsApproval.combinedControlFingerprint,
		approvedCrops: MEADOW_ENTRY_APPROVED_CROPS
	});
	await mkdir(dirname(output.candidate), { recursive: true });
	await Promise.all([
		writeFile(output.candidate, result.masterPng),
		writeFile(output.sidecar, `${JSON.stringify(result.provenance, null, '\t')}\n`)
	]);
	console.log(`${arguments_.plane}-candidate ${output.candidate}`);
	console.log(`${arguments_.plane}-refinement ${output.sidecar}`);
	return output;
}

if (import.meta.main) {
	await runRefineMeadowEntryMaster(process.argv.slice(2)).catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}

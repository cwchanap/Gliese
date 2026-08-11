import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import {
	meadowEntryArtPackageApproval,
	meadowEntryArtPackageApprovalReview
} from '$lib/game/content/approvals/meadow-entry-art-package';
import { meadowEntryControlsApproval } from '$lib/game/content/approvals/meadow-entry-controls';
import { sundropVillageBackgroundsApproval } from '$lib/game/content/approvals/sundrop-village-backgrounds';
import {
	MEADOW_ENTRY_APPROVED_CROPS,
	MEADOW_ENTRY_APPROVED_OVERLAPS,
	MEADOW_ENTRY_CROP_BUDGET_SUMMARY,
	MEADOW_ENTRY_RUNTIME_COVERAGE
} from '$lib/game/content/backgrounds/meadow-entry-crop-manifest';
import {
	assertMeadowEntryRefinementChain,
	assertMeadowEntryRefinementChainTerminal,
	validateMeadowEntryGenerationProvenance,
	validateMeadowEntryRefinementProvenance
} from '$lib/game/content/backgrounds/meadow-entry-master-provenance';
import type { MeadowEntryRefinementProvenance } from '$lib/game/content/backgrounds/meadow-entry-master-provenance';
import {
	decodeMeadowEntryRgba,
	validateCanonicalPngChunks
} from '$lib/game/content/backgrounds/meadow-entry-png';
import { MEADOW_ENTRY_PROOF_FILENAMES } from '$lib/game/content/backgrounds/meadow-entry-proof-renderer';
import { MEADOW_ENTRY_TEST_FILES } from './meadow-entry-art-test-files';
import { verifyMeadowEntryArtStorage } from './verify-meadow-entry-art-storage';

const PACKAGE_ROOT = 'artifacts/meadow-entry/hpa-399';
const PROOF_ROOT = 'docs/superpowers/reports/img/hpa-399/proofs';
const BASE_MASTER = `${PACKAGE_ROOT}/masters/meadow-entry-base-master.png`;
const FOREGROUND_MASTER = `${PACKAGE_ROOT}/masters/meadow-entry-foreground-master.png`;
const MASTER_PROVENANCE = `${PACKAGE_ROOT}/provenance/meadow-entry-master-provenance.json`;
const EXPORT_PROVENANCE = `${PACKAGE_ROOT}/provenance/meadow-entry-export-provenance.json`;
const CROP_MANIFEST = `${PACKAGE_ROOT}/provenance/meadow-entry-crop-manifest.json`;
const LFS_CANARY = `${PACKAGE_ROOT}/lfs-canary.png`;

const PUBLICATION_SENTINELS = [
	{
		path: `${PACKAGE_ROOT}/.meadow-entry-publication.lock`,
		message: 'Meadow Entry approved package publication is in progress'
	},
	{
		path: `${PACKAGE_ROOT}/.meadow-entry-export-publication.lock`,
		message: 'Meadow Entry export publication is in progress'
	},
	{
		path: 'docs/superpowers/reports/img/hpa-399/.meadow-entry-proof-publication.lock',
		message: 'Meadow Entry proof publication is in progress'
	}
] as const;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
export interface ValidationStage {
	name: string;
	run(): Promise<void>;
}

export interface ValidationStageResult {
	name: string;
	durationMs: number;
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function sha256(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex');
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await lstat(path);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
		throw error;
	}
}

function command(
	repositoryRoot: string,
	program: string,
	args: readonly string[],
	options: { binary?: boolean; echo?: boolean } = {}
): Buffer {
	const result = spawnSync(program, [...args], {
		cwd: repositoryRoot,
		encoding: options.binary ? null : 'utf8',
		maxBuffer: 64 * 1024 * 1024
	});
	const stdout = Buffer.isBuffer(result.stdout)
		? result.stdout
		: Buffer.from(result.stdout ?? '', 'utf8');
	const stderr = Buffer.isBuffer(result.stderr)
		? result.stderr
		: Buffer.from(result.stderr ?? '', 'utf8');
	if (options.echo && stdout.byteLength > 0) process.stdout.write(stdout);
	if (result.status !== 0) {
		throw new Error(
			`${program} ${args.join(' ')} failed (${result.status ?? 'signal'}):\n${stderr.toString('utf8') || stdout.toString('utf8')}`
		);
	}
	return stdout;
}

export async function runValidationStages(
	stages: readonly ValidationStage[]
): Promise<readonly ValidationStageResult[]> {
	const results: ValidationStageResult[] = [];
	for (const stage of stages) {
		const started = performance.now();
		try {
			await stage.run();
		} catch (error) {
			throw new Error(`${stage.name}: ${error instanceof Error ? error.message : String(error)}`, {
				cause: error
			});
		}
		const result = { name: stage.name, durationMs: Math.round(performance.now() - started) };
		results.push(result);
		process.stdout.write(`validated\t${result.name}\t${result.durationMs}ms\n`);
	}
	return results;
}

export function parseLfsPointer(bytes: Buffer): { oid: string; size: number } {
	const match =
		/^version https:\/\/git-lfs\.github\.com\/spec\/v1\noid sha256:([0-9a-f]{64})\nsize ([0-9]+)\n$/.exec(
			bytes.toString('utf8')
		);
	assert(match, 'Expected a canonical Git LFS pointer');
	const size = Number(match[2]);
	assert(Number.isSafeInteger(size) && size >= 0, 'Git LFS pointer size is invalid');
	return { oid: match[1]!, size };
}

export function assertExactPathAllowlist(
	label: string,
	expected: readonly string[],
	actual: readonly string[]
): void {
	const expectedSet = new Set(expected);
	const actualSet = new Set(actual);
	const missing = [...expectedSet].filter((path) => !actualSet.has(path)).sort();
	const unexpected = [...actualSet].filter((path) => !expectedSet.has(path)).sort();
	assert(
		expectedSet.size === expected.length &&
			actualSet.size === actual.length &&
			missing.length === 0 &&
			unexpected.length === 0,
		`${label} path allowlist drifted: missing=${missing.join(',') || '(none)'} unexpected=${unexpected.join(',') || '(none)'}`
	);
}

export async function assertNoActivePublicationSentinels(repositoryRoot: string): Promise<void> {
	for (const sentinel of PUBLICATION_SENTINELS) {
		assert(!(await pathExists(join(repositoryRoot, sentinel.path))), sentinel.message);
	}
}

async function walkFiles(root: string, prefix = ''): Promise<string[]> {
	const entries = await readdir(join(root, prefix), { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const path = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) files.push(...(await walkFiles(root, path)));
		else {
			assert(entry.isFile(), `Unexpected non-file package entry: ${path}`);
			files.push(path);
		}
	}
	return files.sort();
}

export async function compareFileTrees(
	label: string,
	expectedRoot: string,
	actualRoot: string
): Promise<{ files: number; bytes: number }> {
	const [expected, actual] = await Promise.all([walkFiles(expectedRoot), walkFiles(actualRoot)]);
	assertExactPathAllowlist(label, expected, actual);
	let bytes = 0;
	for (const path of expected) {
		const [expectedBytes, actualBytes] = await Promise.all([
			readFile(join(expectedRoot, path)),
			readFile(join(actualRoot, path))
		]);
		assert(expectedBytes.equals(actualBytes), `${label} regenerated byte drift: ${path}`);
		bytes += actualBytes.byteLength;
	}
	return { files: expected.length, bytes };
}

export function expectedApprovedPngPaths(): string[] {
	return [
		LFS_CANARY,
		meadowEntryArtPackageApproval.baseMaster.path,
		meadowEntryArtPackageApproval.foregroundMaster.path,
		...meadowEntryArtPackageApproval.exports.map(({ path }) => path),
		...meadowEntryArtPackageApproval.proofs.map(({ path }) => path)
	].sort();
}

async function validateLfs(repositoryRoot: string): Promise<void> {
	await verifyMeadowEntryArtStorage(repositoryRoot);
	const version = command(repositoryRoot, 'git', ['lfs', 'version']).toString('utf8').trim();
	assert(/^git-lfs\/\d+\./.test(version), `Git LFS version is unavailable: ${version}`);
	command(repositoryRoot, 'git', ['lfs', 'fsck']);

	const expectedPaths = expectedApprovedPngPaths();
	const listed = command(repositoryRoot, 'git', ['lfs', 'ls-files', '--name-only'])
		.toString('utf8')
		.trim()
		.split('\n')
		.filter(
			(path) =>
				path.startsWith(`${PACKAGE_ROOT}/`) ||
				path.startsWith('docs/superpowers/reports/img/hpa-399/')
		)
		.sort();
	assertExactPathAllowlist('Git LFS Meadow Entry', expectedPaths, listed);

	const attributes = command(repositoryRoot, 'git', [
		'check-attr',
		'filter',
		'diff',
		'merge',
		'text',
		'--',
		...expectedPaths
	]).toString('utf8');
	for (const path of expectedPaths) {
		for (const [name, value] of [
			['filter', 'lfs'],
			['diff', 'lfs'],
			['merge', 'lfs'],
			['text', 'unset']
		] as const) {
			assert(
				attributes.includes(`${path}: ${name}: ${value}`),
				`Git LFS attribute drifted path=${path} attribute=${name}`
			);
		}
		const pointer = parseLfsPointer(
			command(repositoryRoot, 'git', ['show', `:${path}`], { binary: true })
		);
		const materialized = await readFile(join(repositoryRoot, path));
		assert(
			materialized.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE),
			`${path} is not a materialized PNG`
		);
		assert(materialized.byteLength === pointer.size, `Git LFS materialized size drifted: ${path}`);
		assert(sha256(materialized) === pointer.oid, `Git LFS materialized OID drifted: ${path}`);
	}
}

export function exactObjectKeys(
	label: string,
	value: Record<string, unknown>,
	expected: readonly string[]
) {
	assertExactPathAllowlist(`${label} schema`, [...expected].sort(), Object.keys(value).sort());
}

export async function parseJsonObject(
	repositoryRoot: string,
	path: string
): Promise<Record<string, unknown>> {
	let parsed: unknown;
	try {
		parsed = JSON.parse((await readFile(join(repositoryRoot, path))).toString('utf8'));
	} catch {
		throw new Error(`${path} is not valid JSON`);
	}
	assert(
		parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed),
		`${path} is not an object`
	);
	return parsed as Record<string, unknown>;
}

async function validateApprovedPackage(repositoryRoot: string): Promise<void> {
	// HPA-399 is immutable historical evidence. Task 5 retargeted the live
	// control builder to painted-v2, so this validator binds historical approval
	// rows directly instead of rebuilding a predecessor package from active V2
	// controls.
	const fingerprint = meadowEntryControlsApproval.combinedControlFingerprint;
	assert(
		fingerprint === meadowEntryArtPackageApproval.combinedControlFingerprint,
		'Art approval control fingerprint has drifted'
	);
	assert(
		meadowEntryArtPackageApprovalReview.reviewedBy.length > 0,
		'Art package reviewer identity is missing'
	);
	assert(
		!Number.isNaN(Date.parse(meadowEntryArtPackageApprovalReview.reviewedAt)),
		'Art package review time is invalid'
	);

	const [baseBytes, foregroundBytes, masterProvenance, exportProvenance, cropManifest] =
		await Promise.all([
			readFile(join(repositoryRoot, BASE_MASTER)),
			readFile(join(repositoryRoot, FOREGROUND_MASTER)),
			parseJsonObject(repositoryRoot, MASTER_PROVENANCE),
			parseJsonObject(repositoryRoot, EXPORT_PROVENANCE),
			parseJsonObject(repositoryRoot, CROP_MANIFEST)
		]);
	validateCanonicalPngChunks(baseBytes);
	validateCanonicalPngChunks(foregroundBytes);
	const [base, foreground] = await Promise.all([
		decodeMeadowEntryRgba(baseBytes),
		decodeMeadowEntryRgba(foregroundBytes)
	]);
	assert(base.width === 6400 && base.height === 6400, 'Base master dimensions have drifted');
	assert(
		foreground.width === 6400 && foreground.height === 6400,
		'Foreground master dimensions have drifted'
	);
	assert(baseBytes.byteLength <= 192 * 1024 * 1024, 'Base master exceeds its hard budget');
	assert(
		foregroundBytes.byteLength <= 96 * 1024 * 1024,
		'Foreground master exceeds its hard budget'
	);
	assert(
		sha256(baseBytes) === meadowEntryArtPackageApproval.baseMaster.sha256,
		'Base master approval hash has drifted'
	);
	assert(
		sha256(foregroundBytes) === meadowEntryArtPackageApproval.foregroundMaster.sha256,
		'Foreground master approval hash has drifted'
	);

	for (let pixel = 0; pixel < 6400 * 6400; pixel += 1) {
		if (base.data[pixel * 4 + 3] !== 255) {
			throw new Error(`Base master is not opaque at pixel ${pixel}`);
		}
		const alpha = foreground.data[pixel * 4 + 3]!;
		if (alpha === 0) {
			if (
				foreground.data[pixel * 4] !== 0 ||
				foreground.data[pixel * 4 + 1] !== 0 ||
				foreground.data[pixel * 4 + 2] !== 0
			) {
				throw new Error(`Foreground has hidden RGB at pixel ${pixel}`);
			}
		}
	}

	exactObjectKeys('master provenance', masterProvenance, [
		'version',
		'policy',
		'controls',
		'predecessor',
		'base',
		'foreground'
	]);
	const predecessor = masterProvenance.predecessor as Record<string, unknown>;
	assert(
		typeof predecessor.baseSha256 === 'string' &&
			predecessor.baseSha256 === sundropVillageBackgroundsApproval.base.approvedPngSha256 &&
			typeof predecessor.foregroundSha256 === 'string' &&
			predecessor.foregroundSha256 ===
				sundropVillageBackgroundsApproval.foreground.approvedPngSha256,
		'Immutable HPA-398 predecessor hashes have drifted'
	);
	const planeMasterBytes: Record<'base' | 'foreground', Buffer> = {
		base: baseBytes,
		foreground: foregroundBytes
	};
	for (const plane of ['base', 'foreground'] as const) {
		const record = masterProvenance[plane] as Record<string, unknown>;
		if (!Array.isArray(record.refinements)) {
			throw new Error(`Meadow Entry ${plane} provenance refinements must be an array`);
		}
		const expectedPlaneKeys = ['bytes', 'generation', 'refinements', 'sha256', 'transform'];
		if (record.refinements.length > 0) {
			expectedPlaneKeys.push('preRefinementCandidateSha256');
		}
		exactObjectKeys(`master provenance ${plane} plane`, record, expectedPlaneKeys);
		if (typeof record.sha256 !== 'string' || !SHA256_PATTERN.test(record.sha256)) {
			throw new Error(`Meadow Entry ${plane} provenance sha256 must be a lowercase SHA-256 hash`);
		}
		if (record.sha256 !== sha256(planeMasterBytes[plane])) {
			throw new Error(`Meadow Entry ${plane} provenance sha256 does not match the master PNG`);
		}
		if (typeof record.bytes !== 'number' || !Number.isInteger(record.bytes)) {
			throw new Error(`Meadow Entry ${plane} provenance bytes must be an integer`);
		}
		if (record.bytes !== planeMasterBytes[plane].byteLength) {
			throw new Error(`Meadow Entry ${plane} provenance bytes do not match the master PNG`);
		}
		validateMeadowEntryGenerationProvenance(record.generation);
		for (const refinement of record.refinements) {
			validateMeadowEntryRefinementProvenance(refinement);
		}
		assertMeadowEntryRefinementChain(
			record.refinements as MeadowEntryRefinementProvenance[],
			plane
		);
		if (record.refinements.length > 0) {
			const preRefinementHash = record.preRefinementCandidateSha256;
			if (typeof preRefinementHash !== 'string' || !SHA256_PATTERN.test(preRefinementHash)) {
				throw new Error(
					`Meadow Entry ${plane} preRefinementCandidateSha256 must be a lowercase SHA-256 hash when refinements are present`
				);
			}
			const firstRefinement = record.refinements[0] as MeadowEntryRefinementProvenance;
			if (preRefinementHash !== firstRefinement.beforeMasterSha256) {
				throw new Error(
					`Meadow Entry ${plane} preRefinementCandidateSha256 does not match the first refinement beforeMasterSha256`
				);
			}
			assertMeadowEntryRefinementChainTerminal(
				record.refinements as MeadowEntryRefinementProvenance[],
				plane,
				record.sha256 as string
			);
		}
	}

	exactObjectKeys('export provenance', exportProvenance, [
		'version',
		'controls',
		'masters',
		'policy',
		'budgets',
		'inventory',
		'overlaps',
		'cornerGroups',
		'approvedMasterProvenanceSha256'
	]);
	exactObjectKeys('crop manifest', cropManifest, [
		'version',
		'controlFingerprint',
		'masters',
		'crops',
		'overlaps',
		'runtimeCoverage',
		'budgetSummary'
	]);
	const exportBudgets = exportProvenance.budgets as Record<string, unknown>;
	assert(
		exportBudgets.exportAreaRatio === MEADOW_ENTRY_CROP_BUDGET_SUMMARY.exportAreaRatio,
		'Export area ratio has drifted'
	);
	assert(
		exportBudgets.aggregateBaseHardBytes ===
			MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateBaseHardBytes &&
			exportBudgets.aggregateForegroundHardBytes ===
				MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateForegroundHardBytes,
		'Aggregate export budgets have drifted'
	);
	assert(
		Number(exportBudgets.measuredBaseBytes) <=
			MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateBaseHardBytes &&
			Number(exportBudgets.measuredForegroundBytes) <=
				MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateForegroundHardBytes,
		'Measured export bytes exceed aggregate hard budgets'
	);
	assert(
		(exportProvenance.inventory as unknown[]).length === 22,
		'Export provenance must contain 22 planes'
	);
	assert(
		(exportProvenance.overlaps as unknown[]).length === 25,
		'Export provenance must contain 25 overlaps'
	);
	assert(
		(exportProvenance.cornerGroups as unknown[]).length === 1,
		'Export provenance must contain one corner group'
	);
	assert((cropManifest.crops as unknown[]).length === 12, 'Crop manifest must contain 12 crops');
	assert(
		JSON.stringify(cropManifest.crops) === JSON.stringify(MEADOW_ENTRY_APPROVED_CROPS),
		'Historical crop allowlist has drifted'
	);
	assert(
		(cropManifest.overlaps as unknown[]).length === 25,
		'Crop manifest must contain 25 overlaps'
	);
	assert(
		JSON.stringify(cropManifest.overlaps) === JSON.stringify(MEADOW_ENTRY_APPROVED_OVERLAPS),
		'Historical overlap allowlist has drifted'
	);
	assert(
		(cropManifest.runtimeCoverage as unknown[]).length === MEADOW_ENTRY_RUNTIME_COVERAGE.length,
		'Runtime coverage inventory has drifted'
	);
	assert(
		JSON.stringify(cropManifest.runtimeCoverage) === JSON.stringify(MEADOW_ENTRY_RUNTIME_COVERAGE),
		'Historical runtime coverage allowlist has drifted'
	);
	assert(
		MEADOW_ENTRY_APPROVED_CROPS.flatMap((crop) => crop.edgeClamp?.sides ?? []).length === 3,
		'Crop manifest must contain three clamp edges'
	);
	assert(
		MEADOW_ENTRY_RUNTIME_COVERAGE.filter(({ mode }) => mode === 'fallback-tile').length === 27,
		'Runtime coverage must contain 27 fallback boundaries'
	);
	assert(meadowEntryArtPackageApproval.exports.length === 22, 'Approval must contain 22 exports');
	assert(
		meadowEntryArtPackageApproval.proofs.length === MEADOW_ENTRY_PROOF_FILENAMES.length &&
			MEADOW_ENTRY_PROOF_FILENAMES.length === 81,
		'Approval must contain the fixed 81-proof inventory'
	);

	assertExactPathAllowlist(
		'master',
		['meadow-entry-base-master.png', 'meadow-entry-foreground-master.png'],
		await walkFiles(join(repositoryRoot, `${PACKAGE_ROOT}/masters`))
	);
	assertExactPathAllowlist(
		'export',
		meadowEntryArtPackageApproval.exports.map(({ path }) =>
			path.slice(`${PACKAGE_ROOT}/exports/`.length)
		),
		await walkFiles(join(repositoryRoot, `${PACKAGE_ROOT}/exports`))
	);
	assertExactPathAllowlist(
		'provenance',
		[
			'meadow-entry-crop-manifest.json',
			'meadow-entry-export-provenance.json',
			'meadow-entry-master-provenance.json'
		],
		await walkFiles(join(repositoryRoot, `${PACKAGE_ROOT}/provenance`))
	);
	assertExactPathAllowlist(
		'proof',
		MEADOW_ENTRY_PROOF_FILENAMES.flatMap((path) => [path, path.replace(/\.png$/, '.json')]),
		await walkFiles(join(repositoryRoot, PROOF_ROOT))
	);
}

async function validateDeterministicRegeneration(repositoryRoot: string): Promise<void> {
	// The live controls and active writers now target painted-v2. Historical
	// validation therefore compares the committed HPA-399 bytes and allowlists
	// directly; it must not ask a V2 writer to recreate a retired package.
	const committed = [
		...meadowEntryArtPackageApproval.exports,
		...meadowEntryArtPackageApproval.proofs,
		meadowEntryArtPackageApproval.baseMaster,
		meadowEntryArtPackageApproval.foregroundMaster
	];
	for (const artifact of committed) {
		const bytes = await readFile(join(repositoryRoot, artifact.path));
		assert(
			bytes.byteLength === artifact.bytes,
			`Committed artifact byte count drifted: ${artifact.path}`
		);
		assert(sha256(bytes) === artifact.sha256, `Committed artifact hash drifted: ${artifact.path}`);
	}
	for (const path of [MASTER_PROVENANCE, EXPORT_PROVENANCE, CROP_MANIFEST]) {
		assert(
			await pathExists(join(repositoryRoot, path)),
			`Committed historical provenance is missing: ${path}`
		);
	}
	assertExactPathAllowlist(
		'historical proof',
		MEADOW_ENTRY_PROOF_FILENAMES.flatMap((path) => [path, path.replace(/\.png$/, '.json')]),
		await walkFiles(join(repositoryRoot, PROOF_ROOT))
	);
}

async function validateControls(repositoryRoot: string): Promise<void> {
	command(repositoryRoot, 'bun', ['tools/export-meadow-entry-art-controls.ts', '--check'], {
		echo: true
	});
}

async function runFocusedTests(repositoryRoot: string): Promise<void> {
	command(repositoryRoot, 'bun', ['run', 'test:unit', '--', '--run', ...MEADOW_ENTRY_TEST_FILES], {
		echo: true
	});
}

function trackedStatus(repositoryRoot: string): string {
	return command(repositoryRoot, 'git', [
		'status',
		'--porcelain=v1',
		'--untracked-files=no'
	]).toString('utf8');
}

export async function validateMeadowEntryArtPackage(
	repositoryRoot = process.cwd()
): Promise<{ stages: readonly ValidationStageResult[]; durationMs: number }> {
	const root = resolve(repositoryRoot);
	const started = performance.now();
	const statusBefore = trackedStatus(root);
	const stages = await runValidationStages([
		{
			name: 'publication-sentinels',
			run: async () => await assertNoActivePublicationSentinels(root)
		},
		{ name: 'git-lfs', run: async () => await validateLfs(root) },
		{ name: 'controls-check', run: async () => await validateControls(root) },
		{ name: 'approved-package', run: async () => await validateApprovedPackage(root) },
		{
			name: 'deterministic-regeneration',
			run: async () => await validateDeterministicRegeneration(root)
		},
		{ name: 'focused-tests', run: async () => await runFocusedTests(root) },
		{
			name: 'tracked-status',
			run: async () => {
				const statusAfter = trackedStatus(root);
				assert(statusAfter === statusBefore, 'Validation changed tracked working-tree state');
			}
		}
	]);
	return { stages, durationMs: Math.round(performance.now() - started) };
}

if (import.meta.main) {
	try {
		const result = await validateMeadowEntryArtPackage();
		process.stdout.write(
			`${JSON.stringify({ status: 'ok', durationMs: result.durationMs, stages: result.stages })}\n`
		);
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
	}
}

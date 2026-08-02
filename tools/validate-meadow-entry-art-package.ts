import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import {
	meadowEntryArtPackageApproval,
	meadowEntryArtPackageApprovalReview
} from '$lib/game/content/approvals/meadow-entry-art-package';
import { meadowEntryControlsApproval } from '$lib/game/content/approvals/meadow-entry-controls';
import {
	MEADOW_ENTRY_APPROVED_CROPS,
	MEADOW_ENTRY_CROP_BUDGET_SUMMARY,
	MEADOW_ENTRY_RUNTIME_COVERAGE,
	validateMeadowEntryCropContract
} from '$lib/game/content/backgrounds/meadow-entry-crop-manifest';
import {
	buildMeadowEntryControlInputs,
	buildMeadowEntryForegroundEligibleRasterMask,
	buildMeadowEntryProtectedForegroundRasterMask,
	computeMeadowEntryCombinedControlFingerprint
} from '$lib/game/content/backgrounds/meadow-entry-controls';
import {
	type MeadowEntryGenerationProvenance,
	validateMeadowEntryGenerationProvenance
} from '$lib/game/content/backgrounds/meadow-entry-master-provenance';
import {
	decodeMeadowEntryRgba,
	validateCanonicalPngChunks
} from '$lib/game/content/backgrounds/meadow-entry-png';
import { MEADOW_ENTRY_PROOF_FILENAMES } from '$lib/game/content/backgrounds/meadow-entry-proof-renderer';
import { runExportMeadowEntryRegions } from './export-meadow-entry-regions';
import { renderMeadowEntryArtProofs } from './render-meadow-entry-art-proofs';
import { verifyMeadowEntryArtStorage } from './verify-meadow-entry-art-storage';

const PACKAGE_ROOT = 'artifacts/meadow-entry/hpa-399';
const PROOF_ROOT = 'docs/superpowers/reports/img/hpa-399/proofs';
const CONTROL_ROOT = 'docs/superpowers/reports/img/hpa-399/controls';
const BASE_MASTER = `${PACKAGE_ROOT}/masters/meadow-entry-base-master.png`;
const FOREGROUND_MASTER = `${PACKAGE_ROOT}/masters/meadow-entry-foreground-master.png`;
const MASTER_PROVENANCE = `${PACKAGE_ROOT}/provenance/meadow-entry-master-provenance.json`;
const EXPORT_PROVENANCE = `${PACKAGE_ROOT}/provenance/meadow-entry-export-provenance.json`;
const CROP_MANIFEST = `${PACKAGE_ROOT}/provenance/meadow-entry-crop-manifest.json`;
const LFS_CANARY = `${PACKAGE_ROOT}/lfs-canary.png`;
const SUNDROP_BASE = 'public/game/assets/regions/sundrop-village-base.png';
const SUNDROP_FOREGROUND = 'public/game/assets/regions/sundrop-village-foreground.png';

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

const FOCUSED_TEST_FILES = [
	'src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-storage.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-storage-verifier.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-controls.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-controls-exporter.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-png.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-master-finalizer.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-master-finalizer-cli.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-master-refinement.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-art-source-snapshot.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts',
	'src/lib/game/content/backgrounds/art-map-package-adapter.test.ts',
	'src/lib/game/content/backgrounds/meadow-entry-art-package-validator.test.ts',
	'src/lib/game/content/meadow-entry-controls.asset.test.ts',
	'src/lib/game/content/meadow-entry-controls-approval-tool.test.ts',
	'src/lib/game/content/meadow-entry-art-package.asset.test.ts'
] as const;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
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
	const inputs = buildMeadowEntryControlInputs(repositoryRoot);
	validateMeadowEntryCropContract(inputs);
	const fingerprint = computeMeadowEntryCombinedControlFingerprint(inputs);
	assert(
		fingerprint === meadowEntryControlsApproval.combinedControlFingerprint,
		'Approved control fingerprint has drifted'
	);
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

	const eligible = buildMeadowEntryForegroundEligibleRasterMask(inputs).alpha;
	const protectedMask = buildMeadowEntryProtectedForegroundRasterMask(inputs).alpha;
	for (let pixel = 0; pixel < 6400 * 6400; pixel += 1) {
		assert(base.data[pixel * 4 + 3] === 255, `Base master is not opaque at pixel ${pixel}`);
		const alpha = foreground.data[pixel * 4 + 3]!;
		if (alpha === 0) {
			assert(
				foreground.data[pixel * 4] === 0 &&
					foreground.data[pixel * 4 + 1] === 0 &&
					foreground.data[pixel * 4 + 2] === 0,
				`Foreground has hidden RGB at pixel ${pixel}`
			);
		} else {
			assert(eligible[pixel] !== 0, `Foreground is outside the eligibility mask at pixel ${pixel}`);
			assert(protectedMask[pixel] === 0, `Foreground overlaps a protected mask at pixel ${pixel}`);
		}
	}
	for (const clearance of inputs.controlClearanceRects) {
		for (let y = clearance.bounds.top; y < clearance.bounds.bottom; y += 1) {
			for (let x = clearance.bounds.left; x < clearance.bounds.right; x += 1) {
				assert(
					foreground.data[(y * 6400 + x) * 4 + 3] === 0,
					`Foreground overlaps interaction clearance ${clearance.id}`
				);
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
		predecessor.baseSha256 === inputs.predecessor.hpa398BaseSha256 &&
			predecessor.foregroundSha256 === inputs.predecessor.hpa398ForegroundSha256,
		'Immutable HPA-398 predecessor hashes have drifted'
	);
	for (const plane of ['base', 'foreground'] as const) {
		const record = masterProvenance[plane] as Record<string, unknown>;
		validateMeadowEntryGenerationProvenance(
			record.generation as unknown as MeadowEntryGenerationProvenance
		);
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
		(cropManifest.overlaps as unknown[]).length === 25,
		'Crop manifest must contain 25 overlaps'
	);
	assert(
		(cropManifest.runtimeCoverage as unknown[]).length === MEADOW_ENTRY_RUNTIME_COVERAGE.length,
		'Runtime coverage inventory has drifted'
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

async function copyFileIntoRoot(sourceRoot: string, destinationRoot: string, path: string) {
	const destination = join(destinationRoot, path);
	await mkdir(dirname(destination), { recursive: true });
	await cp(join(sourceRoot, path), destination, { force: false });
}

async function validateDeterministicRegeneration(repositoryRoot: string): Promise<void> {
	const temporaryRepository = await mkdtemp(join(tmpdir(), 'gliese-meadow-entry-regeneration-'));
	try {
		for (const path of [BASE_MASTER, FOREGROUND_MASTER, MASTER_PROVENANCE]) {
			await copyFileIntoRoot(repositoryRoot, temporaryRepository, path);
		}
		const temporaryPackageRoot = join(temporaryRepository, PACKAGE_ROOT);
		const exported = await runExportMeadowEntryRegions(temporaryPackageRoot, repositoryRoot);
		assert(
			exported.verification.overlapCount === 25,
			'Regenerated export overlap count has drifted'
		);
		assert(
			exported.verification.cornerGroupCount === 1,
			'Regenerated export corner count has drifted'
		);
		await compareFileTrees(
			'exports',
			join(repositoryRoot, `${PACKAGE_ROOT}/exports`),
			join(temporaryRepository, `${PACKAGE_ROOT}/exports`)
		);
		for (const path of [EXPORT_PROVENANCE, CROP_MANIFEST]) {
			const [approved, regenerated] = await Promise.all([
				readFile(join(repositoryRoot, path)),
				readFile(join(temporaryRepository, path))
			]);
			assert(approved.equals(regenerated), `Regenerated byte drift: ${path}`);
		}

		for (const path of [SUNDROP_BASE, SUNDROP_FOREGROUND]) {
			await copyFileIntoRoot(repositoryRoot, temporaryRepository, path);
		}
		await mkdir(join(temporaryRepository, dirname(CONTROL_ROOT)), { recursive: true });
		await cp(join(repositoryRoot, CONTROL_ROOT), join(temporaryRepository, CONTROL_ROOT), {
			recursive: true,
			force: false
		});
		await mkdir(join(temporaryRepository, dirname(PROOF_ROOT)), { recursive: true });
		const rendered = await renderMeadowEntryArtProofs(temporaryRepository);
		assert(rendered.proofCount === 81, 'Regenerated proof count has drifted');
		await compareFileTrees(
			'proofs',
			join(repositoryRoot, PROOF_ROOT),
			join(temporaryRepository, PROOF_ROOT)
		);
	} finally {
		await rm(temporaryRepository, { recursive: true, force: true });
	}
}

async function validateControls(repositoryRoot: string): Promise<void> {
	command(repositoryRoot, 'bun', ['tools/export-meadow-entry-art-controls.ts', '--check'], {
		echo: true
	});
}

async function runFocusedTests(repositoryRoot: string): Promise<void> {
	command(repositoryRoot, 'bun', ['run', 'test:unit', '--', '--run', ...FOCUSED_TEST_FILES], {
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

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	unlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import test from 'node:test';

const PRESENTATION_IDS = [
	'camera-underlay-sundrop-north',
	'camera-underlay-sundrop-south',
	'camera-underlay-crossroads-north',
	'camera-underlay-crossroads-south',
	'sundrop-north',
	'sundrop-south'
] as const;

const INSERT_IDS = [
	'camera-underlay-sundrop-south-blocked-hedge',
	'camera-underlay-crossroads-north-blocked-hedge',
	'camera-underlay-crossroads-south-blocked-hedge',
	'camera-underlay-crossroads-north-blocked-woodland',
	'camera-underlay-crossroads-south-blocked-woodland'
] as const;

type SyntheticSourceManifest = Readonly<{
	id: string;
	normalizationTransform: Readonly<{
		native: Readonly<{ width: number; height: number }>;
		resize: Readonly<{ width: number; height: number }>;
		crop: Readonly<{ left: number; top: number; width: number; height: number }>;
		scale: number;
		scaleX: number;
		scaleY: number;
	}>;
}>;

const northHedgeManifest: SyntheticSourceManifest = Object.freeze({
	id: 'camera-underlay-crossroads-north-blocked-hedge',
	normalizationTransform: Object.freeze({
		native: Object.freeze({ width: 1550, height: 1014 }),
		resize: Object.freeze({ width: 3200, height: 2094 }),
		crop: Object.freeze({ left: 0, top: 215, width: 3200, height: 1664 }),
		scale: 2.064516129032258,
		scaleX: 2.064516129032258,
		scaleY: 2.064516129032258
	})
});

const southWoodlandManifest: SyntheticSourceManifest = Object.freeze({
	id: 'camera-underlay-crossroads-south-blocked-woodland',
	normalizationTransform: Object.freeze({
		native: Object.freeze({ width: 1567, height: 1004 }),
		resize: Object.freeze({ width: 3200, height: 2051 }),
		crop: Object.freeze({ left: 0, top: 193, width: 3200, height: 1664 }),
		scale: 2.04211869814933,
		scaleX: 2.04211869814933,
		scaleY: 2.04211869814933
	})
});

const EXPECTED_CANDIDATE_INVENTORY = [
	'decoration-candidate.json',
	'evidence-manifest.json',
	'mask-inventory.json',
	'forest-overview.png',
	'masters/meadow-entry-painted-v2-pilot-base-master.png',
	'exports/painted-v2-sundrop-camera-base.png',
	'exports/painted-v2-crossroads-camera-base.png',
	'decoration-density-01.png',
	'decoration-density-02.png',
	'decoration-density-03.png',
	'decoration-density-04.png',
	'decoration-density-05.png',
	...PRESENTATION_IDS.map((id) => `panel-${id}-original.png`),
	...INSERT_IDS.flatMap((id) => [
		`insert-${id}-review.png`,
		...Array.from(
			{ length: 5 },
			(_, index) => `insert-${id}-crop-${(index + 1).toString().padStart(2, '0')}.png`
		)
	]),
	'enriched-owner-camera-underlay-sundrop-south.png',
	'enriched-owner-camera-underlay-crossroads-north.png',
	'enriched-owner-camera-underlay-crossroads-south.png',
	'enriched-owner-crossroads.png',
	'underlay-sundrop-north-south.png',
	'underlay-crossroads-north-south.png',
	'underlay-family-handoff.png',
	'detail-sundrop-intersection.png',
	'detail-sundrop-west.png',
	'detail-sundrop-center.png',
	'detail-sundrop-east.png',
	'detail-sundrop-sides-corners.png',
	'hero-house-edge-north.png',
	'hero-house-edge-east.png',
	'hero-house-edge-south.png',
	'hero-house-edge-west.png',
	'matched-sundrop-richness.png',
	'wildwood-forest-lane.png',
	...Array.from(
		{ length: 10 },
		(_, index) => `blocker-row-${(index + 1).toString().padStart(2, '0')}.png`
	)
] as const;

function stableJson(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? '';
	if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
	return `{${Object.entries(value as Record<string, unknown>)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
		.join(',')}}`;
}

function stableHash(value: unknown): string {
	return createHash('sha256').update(stableJson(value)).digest('hex');
}

test('candidate source review rejects the two recorded invalid-scale attempt-3 manifests', async () => {
	const review = (await import('./render-meadow-entry-painted-v2-enrichment-review')) as {
		assertReviewSourceTransform?: (manifest: SyntheticSourceManifest) => void;
	};
	assert.throws(
		() => review.assertReviewSourceTransform?.(northHedgeManifest),
		/camera-underlay-crossroads-north-blocked-hedge.*2\.064516129032258/
	);
	assert.throws(
		() => review.assertReviewSourceTransform?.(southWoodlandManifest),
		/camera-underlay-crossroads-south-blocked-woodland.*2\.04211869814933/
	);
});

function recursiveFiles(root: string): string[] {
	const entries = readdirSync(root, { withFileTypes: true });
	return entries.flatMap((entry) => {
		const path = join(root, entry.name);
		if (entry.isDirectory()) return recursiveFiles(path).map((nested) => join(entry.name, nested));
		return [relative(root, path)];
	});
}

async function writeCheckerMaster(path: string): Promise<void> {
	const checker = Buffer.alloc(512 * 512 * 4);
	for (let y = 0; y < 512; y += 1) {
		for (let x = 0; x < 512; x += 1) {
			const value = (x + y) % 2 === 0 ? 0 : 255;
			const offset = (y * 512 + x) * 4;
			checker[offset] = value;
			checker[offset + 1] = value;
			checker[offset + 2] = value;
			checker[offset + 3] = 255;
		}
	}
	await sharp(checker, { raw: { width: 512, height: 512, channels: 4 } })
		.resize(6_400, 6_400, { kernel: 'nearest' })
		.png()
		.toFile(path);
}

async function cellDigests(
	path: string,
	columns: number,
	rows: number
): Promise<readonly string[]> {
	const { data, info } = await sharp(path)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const cellSize = 512;
	assert.equal(info.width, columns * cellSize);
	assert.equal(info.height, rows * cellSize);
	return Array.from({ length: columns * rows }, (_, index) => {
		const cellX = (index % columns) * cellSize;
		const cellY = Math.floor(index / columns) * cellSize;
		const hash = createHash('sha256');
		for (let y = 0; y < cellSize; y += 1) {
			const start = ((cellY + y) * info.width + cellX) * info.channels;
			hash.update(data.subarray(start, start + cellSize * info.channels));
		}
		return hash.digest('hex');
	});
}

test(
	'candidate contact-sheet/source review inventory includes all five sheets and the final three tiles',
	{ timeout: 600_000 },
	async () => {
		const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
		const tempRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-review-'));
		const outputRoot = join(tempRoot, 'review');
		const masterPath = join(tempRoot, 'candidate-master.png');
		try {
			const candidateArgs = [
				join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
				'--mode',
				'candidate',
				'--master',
				masterPath,
				'--assemble-sources',
				'--contact-sheets',
				'--source-review',
				'--output-root',
				outputRoot
			];
			await writeCheckerMaster(masterPath);
			const result = spawnSync(process.execPath, candidateArgs, {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
			assert.equal(result.signal, null);
			const payload = JSON.parse(
				readFileSync(join(outputRoot, 'decoration-candidate.json'), 'utf8')
			) as {
				controls: { sourceHashes: Record<string, string> };
				energy: { qualifyingTileCount: number; sheetTileCounts: number[] };
				tiles: { index: number; id: string }[];
				evidence: Record<string, { sha256: string; bytes: number; width: number; height: number }>;
				blockedSceneryBake: {
					changedPixelCount: number;
					classChangedPixelCounts: Record<string, number>;
					enrichedSourceSha256: Record<string, string>;
					topologyRequests: {
						contributionIndex: number;
						blockerIds: string[];
						reasons: string[];
						insertId: string;
						worldIndex: number;
						rawWeight: number;
						shapedWeight: number;
					}[];
					topologyRequestSha256: string;
					intersections: {
						blockerId: string;
						insertId: string;
						q40: number;
						q80: number;
						sampleCount: number;
						rawWeightSha256: string;
						weightSha256: string;
					}[];
					rows: {
						blockerId: string;
						coverage: number;
						rawWeightSha256: string;
						weightSha256: string;
						metricKind: string;
						longestRunP95Ratio?: number;
						longestRunMaximumRatio?: number;
						longestConstantContourRunRatio?: number;
						contourProfileSha256?: string;
						topology: {
							kind: string;
							requestSha256: string;
							erosionCount?: number;
							missingSlicePromotionCount?: number;
							coveragePromotionCount?: number;
							promotedWorldPixelCount?: number;
						};
					}[];
					formulas: Record<string, string>;
				};
			};
			assert.equal(payload.blockedSceneryBake.intersections.length, 16);
			assert.equal(payload.blockedSceneryBake.rows.length, 10);
			assert.deepEqual(
				payload.blockedSceneryBake.rows.map(({ blockerId }) => blockerId).sort(),
				[
					'coast-crossroads-mouth-bank',
					'mistfen-entry-bank-east',
					'silverpine-wall-A-east',
					'silverpine-wall-A-west',
					'silverpine-wall-B-north',
					'silverpine-wall-B-south',
					'silverpine-wall-C-east',
					'silverpine-wall-C-west',
					'wildwood-forest-lane-west-bank',
					'wildwood-north-climb-west-bank'
				].sort()
			);
			assert.equal(payload.blockedSceneryBake.changedPixelCount > 0, true);
			assert.deepEqual(Object.keys(payload.blockedSceneryBake.classChangedPixelCounts).sort(), [
				'hedge',
				'woodland'
			]);
			assert.deepEqual(Object.keys(payload.blockedSceneryBake.enrichedSourceSha256).sort(), [
				'camera-underlay-crossroads-north',
				'camera-underlay-crossroads-south',
				'camera-underlay-sundrop-south',
				'crossroads'
			]);
			assert.equal(payload.blockedSceneryBake.topologyRequests.length > 0, true);
			assert.match(payload.blockedSceneryBake.topologyRequestSha256, /^[a-f0-9]{64}$/);
			assert.equal(
				payload.blockedSceneryBake.topologyRequestSha256,
				stableHash(payload.blockedSceneryBake.topologyRequests)
			);
			const requestIndexes = payload.blockedSceneryBake.topologyRequests.map(
				({ contributionIndex }) => contributionIndex
			);
			assert.deepEqual(
				requestIndexes,
				[...requestIndexes].sort((left, right) => left - right)
			);
			for (const request of payload.blockedSceneryBake.topologyRequests) {
				assert.equal(Number.isInteger(request.contributionIndex), true);
				assert.equal(request.blockerIds.length > 0, true);
				assert.equal(request.reasons.length > 0, true);
				assert.deepEqual(request.blockerIds, [...new Set(request.blockerIds)].sort());
				assert.deepEqual(request.reasons, [...new Set(request.reasons)].sort());
				assert.equal(Number.isInteger(request.worldIndex), true);
				assert.equal(
					request.shapedWeight >= request.rawWeight || request.shapedWeight === 191,
					true
				);
			}
			for (const intersection of payload.blockedSceneryBake.intersections) {
				assert.equal(intersection.sampleCount >= 64, true);
				assert.equal(intersection.q40 < intersection.q80, true);
				assert.match(intersection.rawWeightSha256, /^[a-f0-9]{64}$/);
				assert.match(intersection.weightSha256, /^[a-f0-9]{64}$/);
			}
			for (const row of payload.blockedSceneryBake.rows) {
				assert.equal(Number.isFinite(row.coverage), true);
				assert.equal(row.coverage >= 0 && row.coverage <= 1, true);
				assert.match(row.rawWeightSha256, /^[a-f0-9]{64}$/);
				assert.match(row.weightSha256, /^[a-f0-9]{64}$/);
				assert.match(row.topology.requestSha256, /^[a-f0-9]{64}$/);
				assert.equal(
					row.topology.requestSha256,
					stableHash(
						payload.blockedSceneryBake.topologyRequests.filter(({ blockerIds }) =>
							blockerIds.includes(row.blockerId)
						)
					)
				);
				if (row.metricKind === 'clump-runs') {
					assert.equal(row.topology.kind, 'sparse-core-cap');
					assert.equal(Number.isInteger(row.topology.erosionCount), true);
					assert.equal(Number.isFinite(row.longestRunP95Ratio), true);
					assert.equal(Number.isFinite(row.longestRunMaximumRatio), true);
					assert.equal((row.longestRunP95Ratio ?? -1) >= 0, true);
					assert.equal((row.longestRunMaximumRatio ?? -1) >= 0, true);
				} else {
					assert.equal(row.topology.kind, 'tree-continuity-floor');
					assert.equal(Number.isInteger(row.topology.missingSlicePromotionCount), true);
					assert.equal(Number.isInteger(row.topology.coveragePromotionCount), true);
					assert.equal(Number.isInteger(row.topology.promotedWorldPixelCount), true);
					assert.equal(Number.isFinite(row.longestConstantContourRunRatio), true);
					assert.equal((row.longestConstantContourRunRatio ?? -1) >= 0, true);
					assert.match(row.contourProfileSha256 ?? '', /^[a-f0-9]{64}$/);
				}
			}
			const bSouth = payload.blockedSceneryBake.rows.find(
				(row) => row.blockerId === 'silverpine-wall-B-south'
			);
			assert.ok(bSouth);
			assert.equal(bSouth.rawWeightSha256, bSouth.weightSha256);
			assert.equal(bSouth.topology.kind, 'tree-continuity-floor');
			assert.equal(bSouth.topology.missingSlicePromotionCount, 0);
			assert.equal(bSouth.topology.coveragePromotionCount, 0);
			assert.equal(bSouth.topology.promotedWorldPixelCount, 0);
			assert.equal(
				payload.blockedSceneryBake.topologyRequests.some(({ blockerIds }) =>
					blockerIds.includes('silverpine-wall-B-south')
				),
				false
			);
			const bSouthIntersections = payload.blockedSceneryBake.intersections.filter(
				({ blockerId }) => blockerId === 'silverpine-wall-B-south'
			);
			assert.ok(bSouthIntersections.length > 0);
			for (const intersection of bSouthIntersections)
				assert.equal(intersection.rawWeightSha256, intersection.weightSha256);
			assert.equal(
				payload.blockedSceneryBake.formulas.weightedCoverageThreshold,
				'finalWeight>=32'
			);
			const maskInventory = JSON.parse(
				readFileSync(join(outputRoot, 'mask-inventory.json'), 'utf8')
			) as {
				masks: Record<string, unknown>;
				sourceHashes: Record<string, string>;
			};
			assert.deepEqual(Object.keys(maskInventory.masks).sort(), [
				'groundAllowed',
				'hedgeAllowed',
				'otherProtected',
				'sceneryAllowed',
				'woodlandAllowed'
			]);
			assert.deepEqual(maskInventory.sourceHashes, payload.controls.sourceHashes);
			for (const key of [
				'derivation:inside-crop-union',
				'derivation:route-core',
				'derivation:mask-authority'
			])
				assert.match(maskInventory.sourceHashes[key] ?? '', /^[a-f0-9]{64}$/);
			assert.equal(payload.energy.qualifyingTileCount, 67);
			assert.deepEqual(payload.energy.sheetTileCounts, [16, 16, 16, 16, 3]);
			assert.deepEqual(
				Object.keys(payload.evidence).sort(),
				[...EXPECTED_CANDIDATE_INVENTORY].filter((path) => path.endsWith('.png')).sort()
			);
			for (const [relativePath, descriptor] of Object.entries(payload.evidence)) {
				const bytes = readFileSync(join(outputRoot, relativePath));
				assert.equal(descriptor.sha256, createHash('sha256').update(bytes).digest('hex'));
				assert.equal(descriptor.bytes, bytes.byteLength);
				const metadata = await sharp(bytes).metadata();
				assert.deepEqual(
					{ width: descriptor.width, height: descriptor.height },
					{ width: metadata.width, height: metadata.height }
				);
			}
			assert.deepEqual(
				payload.tiles.slice(-3).map(({ index, id }) => [index, id]),
				[
					[64, 'decoration-64'],
					[65, 'decoration-65'],
					[66, 'decoration-66']
				]
			);
			assert.deepEqual(recursiveFiles(outputRoot).sort(), [...EXPECTED_CANDIDATE_INVENTORY].sort());
			assert.equal(
				existsSync(join(repositoryRoot, 'public/game/assets/regions/meadow-entry-painted-v2')),
				true
			);
			const panelPath = join(outputRoot, 'panel-camera-underlay-sundrop-north-original.png');
			const panelMetadata = await sharp(panelPath).metadata();
			assert.deepEqual(
				{ width: panelMetadata.width, height: panelMetadata.height },
				{ width: 3200, height: 1664 }
			);
			const panelSample = await sharp(panelPath)
				.resize(3, 2, { fit: 'fill' })
				.ensureAlpha()
				.raw()
				.toBuffer();
			assert(
				new Set(
					Array.from({ length: 6 }, (_, index) =>
						panelSample.subarray(index * 4, index * 4 + 4).toString('hex')
					)
				).size >= 4
			);
			assert.equal(
				new Set(await cellDigests(join(outputRoot, 'detail-sundrop-sides-corners.png'), 4, 2))
					.size >= 3,
				true
			);
			assert.notDeepEqual(
				readFileSync(join(outputRoot, 'detail-sundrop-sides-corners.png')),
				readFileSync(join(outputRoot, 'detail-sundrop-intersection.png'))
			);

			const requiredInsertReview = join(outputRoot, `insert-${INSERT_IDS[0]}-review.png`);
			const requiredInsertReviewBytes = readFileSync(requiredInsertReview);
			unlinkSync(requiredInsertReview);
			const missingInsertCheck = spawnSync(process.execPath, [...candidateArgs, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.notEqual(missingInsertCheck.status, 0);
			assert.match(
				`${missingInsertCheck.stdout}\n${missingInsertCheck.stderr}`,
				/review artifact is missing/
			);
			writeFileSync(requiredInsertReview, requiredInsertReviewBytes);

			const candidateJsonPath = join(outputRoot, 'decoration-candidate.json');
			const candidateJsonBeforeBaseline = readFileSync(candidateJsonPath);
			const baselineResult = spawnSync(
				process.execPath,
				[
					join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
					'--mode',
					'baseline',
					'--master',
					'artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png',
					'--output-root',
					outputRoot
				],
				{ cwd: repositoryRoot, encoding: 'utf8' }
			);
			assert.equal(baselineResult.status, 0, `${baselineResult.stdout}\n${baselineResult.stderr}`);
			assert.equal(existsSync(join(outputRoot, 'decoration-baseline.json')), true);
			assert.deepEqual(readFileSync(candidateJsonPath), candidateJsonBeforeBaseline);
			const baselineCheck = spawnSync(
				process.execPath,
				[
					join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
					'--mode',
					'baseline',
					'--master',
					'artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png',
					'--output-root',
					outputRoot,
					'--check'
				],
				{ cwd: repositoryRoot, encoding: 'utf8' }
			);
			assert.equal(baselineCheck.status, 0, `${baselineCheck.stdout}\n${baselineCheck.stderr}`);

			const candidateCheck = spawnSync(process.execPath, [...candidateArgs, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.equal(candidateCheck.status, 0, `${candidateCheck.stdout}\n${candidateCheck.stderr}`);

			const densityPath = join(outputRoot, 'decoration-density-05.png');
			const densityBytes = readFileSync(densityPath);
			writeFileSync(densityPath, Buffer.from('stale density evidence\n'));
			const staleDensityCheck = spawnSync(process.execPath, [...candidateArgs, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.notEqual(staleDensityCheck.status, 0);
			assert.match(
				`${staleDensityCheck.stdout}\n${staleDensityCheck.stderr}`,
				/review artifact is stale/
			);
			assert.deepEqual(readFileSync(densityPath), Buffer.from('stale density evidence\n'));
			writeFileSync(densityPath, densityBytes);

			const sourceReviewPath = join(outputRoot, 'detail-sundrop-sides-corners.png');
			const sourceReviewBytes = readFileSync(sourceReviewPath);
			writeFileSync(sourceReviewPath, Buffer.from('stale source review evidence\n'));
			const staleSourceReviewCheck = spawnSync(process.execPath, [...candidateArgs, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.notEqual(staleSourceReviewCheck.status, 0);
			assert.match(
				`${staleSourceReviewCheck.stdout}\n${staleSourceReviewCheck.stderr}`,
				/review artifact is stale/
			);
			assert.deepEqual(
				readFileSync(sourceReviewPath),
				Buffer.from('stale source review evidence\n')
			);
			writeFileSync(sourceReviewPath, sourceReviewBytes);

			writeFileSync(candidateJsonPath, Buffer.from('stale review evidence\n'));
			const staleCheck = spawnSync(process.execPath, [...candidateArgs, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.notEqual(staleCheck.status, 0);
			assert.match(`${staleCheck.stdout}\n${staleCheck.stderr}`, /review artifact is stale/);
			assert.deepEqual(readFileSync(candidateJsonPath), Buffer.from('stale review evidence\n'));
		} finally {
			rmSync(tempRoot, { recursive: true, force: true });
		}
	}
);

test(
	'--assemble-sources writes only the review master and two exact crops',
	{ timeout: 60_000 },
	async () => {
		const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
		const outputRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-assembly-'));
		try {
			const result = spawnSync(
				process.execPath,
				[
					join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
					'--mode',
					'baseline',
					'--assemble-sources',
					'--output-root',
					outputRoot
				],
				{ cwd: repositoryRoot, encoding: 'utf8' }
			);
			assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
			assert.deepEqual(readdirSync(join(outputRoot, 'masters')), [
				'meadow-entry-painted-v2-pilot-base-master.png'
			]);
			assert.deepEqual(readdirSync(join(outputRoot, 'exports')).sort(), [
				'painted-v2-crossroads-camera-base.png',
				'painted-v2-sundrop-camera-base.png'
			]);
			assert.deepEqual(readdirSync(outputRoot).sort(), [
				'decoration-baseline.json',
				'exports',
				'masters'
			]);
			const masterMetadata = await sharp(
				join(outputRoot, 'masters/meadow-entry-painted-v2-pilot-base-master.png')
			).metadata();
			assert.deepEqual(
				{ width: masterMetadata.width, height: masterMetadata.height },
				{ width: 6_400, height: 6_400 }
			);
			for (const filename of [
				'painted-v2-sundrop-camera-base.png',
				'painted-v2-crossroads-camera-base.png'
			]) {
				const metadata = await sharp(join(outputRoot, 'exports', filename)).metadata();
				assert.deepEqual(
					{ width: metadata.width, height: metadata.height },
					{ width: 3_200, height: 3_200 }
				);
			}
		} finally {
			rmSync(outputRoot, { recursive: true, force: true });
		}
	}
);

test(
	'candidate assembly measures the newly assembled master and check never rewrites stale outputs',
	{ timeout: 180_000 },
	async () => {
		const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
		const outputRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-candidate-assembly-'));
		try {
			const args = [
				join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
				'--mode',
				'candidate',
				'--assemble-sources',
				'--output-root',
				outputRoot
			];
			const generate = spawnSync(process.execPath, args, {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.equal(generate.status, 0, `${generate.stdout}\n${generate.stderr}`);

			const masterPath = join(outputRoot, 'masters/meadow-entry-painted-v2-pilot-base-master.png');
			const candidateJsonPath = join(outputRoot, 'decoration-candidate.json');
			const assembledMaster = readFileSync(masterPath);
			const payload = JSON.parse(readFileSync(candidateJsonPath, 'utf8')) as {
				master: { sha256: string; path: string };
				energy: { qualifyingTileCount: number; sheetTileCounts: number[] };
			};
			assert.equal(
				payload.master.sha256,
				createHash('sha256').update(assembledMaster).digest('hex')
			);
			assert.equal(payload.master.path, relative(repositoryRoot, masterPath));
			assert.equal(payload.energy.qualifyingTileCount, 67);
			assert.deepEqual(payload.energy.sheetTileCounts, [16, 16, 16, 16, 3]);

			const candidateBeforeCheck = readFileSync(candidateJsonPath);
			const masterBeforeCheck = readFileSync(masterPath);
			const check = spawnSync(process.execPath, [...args, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`);
			assert.deepEqual(readFileSync(candidateJsonPath), candidateBeforeCheck);
			assert.deepEqual(readFileSync(masterPath), masterBeforeCheck);

			const staleMaster = Buffer.from('stale assembled master evidence\n');
			writeFileSync(masterPath, staleMaster);
			const staleCheck = spawnSync(process.execPath, [...args, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.notEqual(staleCheck.status, 0);
			assert.match(`${staleCheck.stdout}\n${staleCheck.stderr}`, /review artifact is stale/);
			assert.deepEqual(readFileSync(masterPath), staleMaster);
		} finally {
			rmSync(outputRoot, { recursive: true, force: true });
		}
	}
);

test('--check does not create a missing output root', () => {
	const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const tempRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-missing-'));
	const outputRoot = join(tempRoot, 'missing-review');
	try {
		assert.equal(existsSync(outputRoot), false);
		const result = spawnSync(
			process.execPath,
			[
				join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
				'--mode',
				'baseline',
				'--check',
				'--output-root',
				outputRoot
			],
			{ cwd: repositoryRoot, encoding: 'utf8' }
		);
		assert.notEqual(result.status, 0);
		assert.match(`${result.stdout}\n${result.stderr}`, /output root is missing/);
		assert.equal(existsSync(outputRoot), false);
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

test(
	'--check detects stale assembled outputs without rewriting them',
	{ timeout: 60_000 },
	async () => {
		const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
		const outputRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-assembly-check-'));
		try {
			const generate = spawnSync(
				process.execPath,
				[
					join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
					'--mode',
					'baseline',
					'--assemble-sources',
					'--output-root',
					outputRoot
				],
				{ cwd: repositoryRoot, encoding: 'utf8' }
			);
			assert.equal(generate.status, 0, `${generate.stdout}\n${generate.stderr}`);
			const masterPath = join(outputRoot, 'masters/meadow-entry-painted-v2-pilot-base-master.png');
			writeFileSync(masterPath, Buffer.from('stale assembly evidence\n'));
			const check = spawnSync(
				process.execPath,
				[
					join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
					'--mode',
					'baseline',
					'--assemble-sources',
					'--check',
					'--output-root',
					outputRoot
				],
				{ cwd: repositoryRoot, encoding: 'utf8' }
			);
			assert.notEqual(check.status, 0);
			assert.match(`${check.stdout}\n${check.stderr}`, /review artifact is stale/);
			assert.deepEqual(readFileSync(masterPath), Buffer.from('stale assembly evidence\n'));
		} finally {
			rmSync(outputRoot, { recursive: true, force: true });
		}
	}
);

test(
	'candidate JSON claims native inspection only when source review is requested',
	{ timeout: 60_000 },
	async () => {
		const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
		const tempRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-enrichment-claim-'));
		const outputRoot = join(tempRoot, 'review');
		const masterPath = join(tempRoot, 'candidate-master.png');
		try {
			await writeCheckerMaster(masterPath);
			const result = spawnSync(
				process.execPath,
				[
					join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
					'--mode',
					'candidate',
					'--master',
					masterPath,
					'--output-root',
					outputRoot
				],
				{ cwd: repositoryRoot, encoding: 'utf8' }
			);
			assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
			const payload = JSON.parse(
				readFileSync(join(outputRoot, 'decoration-candidate.json'), 'utf8')
			) as {
				fullPanelOriginalDetailInspection?: boolean;
				sourcePanels?: readonly unknown[];
			};
			assert.equal(payload.fullPanelOriginalDetailInspection, undefined);
			assert.equal(payload.sourcePanels, undefined);
		} finally {
			rmSync(tempRoot, { recursive: true, force: true });
		}
	}
);

test('review output rejects the public runtime directory', () => {
	const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const result = spawnSync(
		process.execPath,
		[
			join(repositoryRoot, 'tools/render-meadow-entry-painted-v2-enrichment-review.ts'),
			'--mode',
			'baseline',
			'--output-root',
			'public/game/assets/regions/meadow-entry-painted-v2'
		],
		{ cwd: repositoryRoot, encoding: 'utf8' }
	);
	assert.notEqual(result.status, 0);
	assert.match(
		`${result.stdout}\n${result.stderr}`,
		/must not target the public painted-v2 runtime directory/
	);
});

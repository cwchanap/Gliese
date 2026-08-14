import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import test from 'node:test';

const EXPECTED_CANDIDATE_INVENTORY = [
	'decoration-candidate.json',
	'decoration-density-01.png',
	'decoration-density-02.png',
	'decoration-density-03.png',
	'decoration-density-04.png',
	'decoration-density-05.png',
	'panel-camera-underlay-sundrop-north-quadrants-center.png',
	'panel-camera-underlay-sundrop-south-quadrants-center.png',
	'panel-camera-underlay-crossroads-north-quadrants-center.png',
	'panel-camera-underlay-crossroads-south-quadrants-center.png',
	'panel-sundrop-north-quadrants-center.png',
	'panel-sundrop-south-quadrants-center.png',
	'panel-village-crossroads-connector-quadrants-center.png',
	'panel-crossroads-quadrants-center.png',
	'underlay-sundrop-north-south.png',
	'underlay-crossroads-north-south.png',
	'underlay-family-handoff.png',
	'detail-sundrop-intersection.png',
	'detail-sundrop-west.png',
	'detail-sundrop-center.png',
	'detail-sundrop-east.png',
	'detail-sundrop-sides-corners.png',
	'detail-connector-crossroads-intersection.png',
	'detail-connector-crossroads-west.png',
	'detail-connector-crossroads-middle.png',
	'detail-connector-crossroads-east.png',
	'detail-connector-crossroads-sides-corners.png',
	'hero-house-edges.png',
	'protected-live-atlas.png',
	'region-material-overlay.png',
	'route-centerline-overlay.png'
] as const;

test(
	'candidate contact-sheet/source review inventory includes all five sheets and the final three tiles',
	{ timeout: 60_000 },
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
				'--contact-sheets',
				'--source-review',
				'--output-root',
				outputRoot
			];
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
				.toFile(masterPath);
			const result = spawnSync(process.execPath, candidateArgs, {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
			assert.equal(result.signal, null);
			const payload = JSON.parse(
				readFileSync(join(outputRoot, 'decoration-candidate.json'), 'utf8')
			) as {
				energy: { qualifyingTileCount: number; sheetTileCounts: number[] };
				tiles: { index: number; id: string }[];
			};
			assert.equal(payload.energy.qualifyingTileCount, 67);
			assert.deepEqual(payload.energy.sheetTileCounts, [16, 16, 16, 16, 3]);
			assert.deepEqual(
				payload.tiles.slice(-3).map(({ index, id }) => [index, id]),
				[
					[64, 'decoration-64'],
					[65, 'decoration-65'],
					[66, 'decoration-66']
				]
			);
			assert.deepEqual(
				readdirSync(outputRoot)
					.filter((name) => name !== 'candidate-master.png')
					.sort(),
				[...EXPECTED_CANDIDATE_INVENTORY].sort()
			);
			assert.equal(
				existsSync(join(repositoryRoot, 'public/game/assets/regions/meadow-entry-painted-v2')),
				true
			);

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

			const candidateCheck = spawnSync(process.execPath, [...candidateArgs, '--check'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});
			assert.equal(candidateCheck.status, 0, `${candidateCheck.stdout}\n${candidateCheck.stderr}`);

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

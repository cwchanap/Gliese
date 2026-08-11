import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('writes a painted-v2 proposal from the live HPA-586 path catalog', () => {
	const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const outputRoot = mkdtempSync(join(tmpdir(), 'gliese-meadow-proposal-'));
	try {
		const result = spawnSync(
			process.execPath,
			[join(repoRoot, 'tools/propose-meadow-entry-authoring-layout.ts')],
			{
				cwd: repoRoot,
				env: {
					...process.env,
					GLIESE_MEADOW_ENTRY_PROPOSAL_OUTPUT_ROOT: outputRoot
				},
				encoding: 'utf8'
			}
		);
		assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
		assert.equal(result.signal, null);
		assert.doesNotMatch(result.stdout, /hpa-399/i);

		const proposalPath = join(outputRoot, 'meadow-entry-authoring-layout-proposal.json');
		const svgPath = join(outputRoot, 'meadow-entry-authoring-layout-proposal.svg');
		assert.equal(existsSync(proposalPath), true);
		assert.equal(existsSync(svgPath), true);

		const proposal = JSON.parse(readFileSync(proposalPath, 'utf8')) as {
			format: string;
			candidateRegions: readonly {
				id: string;
				reviewBounds: { left: number; top: number; right: number; bottom: number };
			}[];
			mandatoryPathOwners: Readonly<Record<string, string>>;
		};
		assert.equal(proposal.format, 'meadow-entry-authoring-layout-proposal-painted-v2');
		assert.equal(proposal.candidateRegions.length, 12);
		assert.deepEqual(proposal.candidateRegions.find(({ id }) => id === 'mistfen')?.reviewBounds, {
			left: 384,
			top: 384,
			right: 3_200,
			bottom: 4_096
		});
		assert.deepEqual(
			proposal.candidateRegions.find(({ id }) => id === 'connector-crossroads-wildwood')
				?.reviewBounds,
			{ left: 4_160, top: 3_648, right: 5_120, bottom: 4_432 }
		);
		assert.deepEqual(Object.keys(proposal.mandatoryPathOwners).sort(), [
			'decor:village-corridor-waymarker',
			'ground-patch:crossroads-to-coast',
			'ground-patch:crossroads-to-mistfen',
			'ground-patch:crossroads-to-silverpine',
			'ground-patch:crossroads-to-wildwood',
			'ground-patch:village-to-crossroads'
		]);
		assert.match(readFileSync(svgPath, 'utf8'), /^<svg\s/);
	} finally {
		rmSync(outputRoot, { recursive: true, force: true });
	}
});

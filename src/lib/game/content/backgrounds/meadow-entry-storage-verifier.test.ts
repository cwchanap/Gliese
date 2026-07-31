import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const repositoryRoot = process.cwd();
const canaryPath = join(repositoryRoot, 'artifacts/meadow-entry/hpa-399/lfs-canary.png');

describe('Meadow Entry art storage verifier', () => {
	it('rejects an opaque one-pixel canary', async () => {
		const originalCanary = readFileSync(canaryPath);

		try {
			await sharp({
				create: {
					width: 1,
					height: 1,
					channels: 4,
					background: { r: 0, g: 0, b: 0, alpha: 1 }
				}
			})
				.png()
				.toFile(canaryPath);

			const result = spawnSync('bun', ['run', 'art:storage:meadow-entry'], {
				cwd: repositoryRoot,
				encoding: 'utf8'
			});

			expect(result.status).toBe(1);
			expect(result.stderr).toContain('transparent RGBA pixel');
		} finally {
			writeFileSync(canaryPath, originalCanary);
		}
	});
});

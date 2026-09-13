import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';

import { validateHeroicUiArt } from './validate-heroic-ui-art';

const temporaryRoots: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
	);
});

describe('validateHeroicUiArt', () => {
	it('accepts the committed Heroic UI art package and runtime captures', async () => {
		await expect(validateHeroicUiArt()).resolves.toBeUndefined();
	});

	it('rejects wrong-sized source art', async () => {
		const root = await mkdtemp(join(tmpdir(), 'gliese-heroic-art-'));
		temporaryRoots.push(root);
		const assetRoot = join(root, 'public/game/assets/heroic-ui');
		await mkdir(assetRoot, { recursive: true });
		await sharp({
			create: { width: 100, height: 100, channels: 3, background: 'black' }
		})
			.png()
			.toFile(join(assetRoot, 'title-key-art.png'));
		// The runtime captures are checked last; a stub keeps the fixture minimal
		// because the wrong-sized title art must fail first.
		await mkdir(join(root, 'docs/visual-references/heroic-ui/runtime'), { recursive: true });
		await writeFile(join(root, 'docs/visual-references/heroic-ui/runtime/01-title.png'), 'x');

		await expect(validateHeroicUiArt(root)).rejects.toThrow(/title-key-art/);
	});
});

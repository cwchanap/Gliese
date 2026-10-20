import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
	verifyMeadowEntryArtStorage,
	type MeadowEntryStorageGitRunner
} from './verify-meadow-entry-art-storage';

const runtimePatternProbePath =
	'public/game/assets/regions/meadow-entry-painted-v2/lfs-pattern-probe.png';
const runtimeProbePath =
	'public/game/assets/regions/meadow-entry-painted-v2/painted-v2-complete-northeast-base.png';
const lfsPointer = 'version https://git-lfs.github.com/spec/v1\noid sha256:probe\nsize 12\n';
const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const pngWorkingTreeBytes = Uint8Array.of(...pngSignature, 0, 0, 0, 0x0d);

const temporaryRoots: string[] = [];

afterEach(async () => {
	await Promise.all(
		temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
	);
});

function attributeLines(path: string, overrides: Partial<Record<string, string>> = {}): string {
	const expectations = [
		['filter', 'lfs'],
		['diff', 'lfs'],
		['merge', 'lfs'],
		['text', 'unset']
	] as const;
	return expectations
		.map(([attribute, expected]) => `${path}: ${attribute}: ${overrides[attribute] ?? expected}`)
		.join('\n');
}

function createGitRunner(
	overrides: { checkAttr?: string; lsFiles?: string; lfsLsFiles?: string; showIndex?: string } = {}
): MeadowEntryStorageGitRunner {
	return (...args) => {
		if (args[0] === 'lfs') {
			if (args[1] === 'version') return 'git-lfs/3.7.1 (GitHub; darwin arm64; go 1.25.3)\n';
			if (args[1] === 'ls-files')
				return overrides.lfsLsFiles ?? `8bb684549f * ${runtimeProbePath}\n`;
			if (args[1] === 'fsck') return '';
		}
		if (args[0] === 'check-attr') {
			return overrides.checkAttr ?? attributeLines(runtimePatternProbePath);
		}
		if (args[0] === 'ls-files') return overrides.lsFiles ?? `${runtimeProbePath}\n`;
		if (args[0] === 'show') return overrides.showIndex ?? lfsPointer;
		throw new Error(`unexpected git invocation: git ${args.join(' ')}`);
	};
}

async function createWorkingTree(bytes: Uint8Array): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), 'gliese-meadow-storage-'));
	temporaryRoots.push(root);
	await mkdir(join(root, 'public/game/assets/regions/meadow-entry-painted-v2'), {
		recursive: true
	});
	await writeFile(join(root, runtimeProbePath), bytes);
	return root;
}

describe('verifyMeadowEntryArtStorage', () => {
	it('resolves when the runtime-only de-LFS contract holds', async () => {
		const root = await createWorkingTree(pngWorkingTreeBytes);
		await expect(verifyMeadowEntryArtStorage(root, createGitRunner())).resolves.toBeUndefined();
	});

	it('rejects when the runtime pattern is missing an expected LFS attribute', async () => {
		const root = await createWorkingTree(pngWorkingTreeBytes);
		const runner = createGitRunner({
			checkAttr: attributeLines(runtimePatternProbePath, { text: 'unspecified' })
		});
		await expect(verifyMeadowEntryArtStorage(root, runner)).rejects.toThrow(
			/Git LFS text attribute/
		);
	});

	it('rejects when Git LFS does not track the runtime probe', async () => {
		const root = await createWorkingTree(pngWorkingTreeBytes);
		const runner = createGitRunner({ lfsLsFiles: '8bb684549f * public/other.png\n' });
		await expect(verifyMeadowEntryArtStorage(root, runner)).rejects.toThrow(
			/Git LFS does not track/
		);
	});

	it('rejects when the index entry is not an LFS pointer', async () => {
		const root = await createWorkingTree(pngWorkingTreeBytes);
		const runner = createGitRunner({ showIndex: 'PNG-not-a-pointer\n' });
		await expect(verifyMeadowEntryArtStorage(root, runner)).rejects.toThrow(
			/not stored as an LFS pointer/
		);
	});

	it('rejects when the working tree probe is not materialized as a PNG', async () => {
		const root = await createWorkingTree(Uint8Array.of(0x00, 0x01, 0x02));
		await expect(verifyMeadowEntryArtStorage(root, createGitRunner())).rejects.toThrow(
			/not materialized as a PNG/
		);
	});

	it('rejects when no painted-v2 runtime file is tracked', async () => {
		const root = await createWorkingTree(pngWorkingTreeBytes);
		const runner = createGitRunner({ lsFiles: '' });
		await expect(verifyMeadowEntryArtStorage(root, runner)).rejects.toThrow(
			/does not track any runtime file/
		);
	});
});

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface StorageVerifierApi {
	assertTransparentOnePixelCanary?: (
		metadata: { width?: number; height?: number },
		rgbaPixel: Uint8Array
	) => void;
	verifyMeadowEntryLfsAttributeCoverage?: (runGit?: (...args: string[]) => string) => void;
	verifyMeadowEntryArtStorage?: (repositoryRoot?: string) => Promise<void>;
}

async function verifierApi(): Promise<StorageVerifierApi> {
	return import('../../../../../tools/verify-meadow-entry-art-storage');
}

function checkedAttributes(path: string, override?: { name: string; value: string }): string {
	const values = {
		filter: 'lfs',
		diff: 'lfs',
		merge: 'lfs',
		text: 'unset',
		...(override ? { [override.name]: override.value } : {})
	};
	return Object.entries(values)
		.map(([name, value]) => `${path}: ${name}: ${value}`)
		.join('\n');
}

describe('Meadow Entry art storage verifier', () => {
	it('rejects an opaque one-pixel canary without mutating the checked-in canary', async () => {
		const api = await verifierApi();
		const validateCanary = api.assertTransparentOnePixelCanary;

		expect(validateCanary).toBeTypeOf('function');
		if (!validateCanary) return;
		expect(() => validateCanary({ width: 1, height: 1 }, new Uint8Array([0, 0, 0, 255]))).toThrow(
			/transparent RGBA pixel/
		);
	});

	it.each([
		['asset', 'artifacts/meadow-entry/hpa-399/lfs-canary.png'],
		['proof', 'docs/superpowers/reports/img/hpa-399/proofs/lfs-pattern-probe.png']
	])('rejects a changed %s Git LFS pattern', async (label, changedPath) => {
		const api = await verifierApi();

		expect(api.verifyMeadowEntryLfsAttributeCoverage).toBeTypeOf('function');
		if (!api.verifyMeadowEntryLfsAttributeCoverage) return;
		const runGit = (...args: string[]): string => {
			const path = args.at(-1)!;
			return checkedAttributes(
				path,
				path === changedPath ? { name: 'filter', value: 'unspecified' } : undefined
			);
		};

		expect(() => api.verifyMeadowEntryLfsAttributeCoverage!(runGit)).toThrow(
			new RegExp(`${label}.*filter`, 'i')
		);
	});

	it('executes attribute checks for both asset and proof namespaces', async () => {
		const api = await verifierApi();
		const checkedPaths: string[] = [];

		expect(api.verifyMeadowEntryLfsAttributeCoverage).toBeTypeOf('function');
		if (!api.verifyMeadowEntryLfsAttributeCoverage) return;
		api.verifyMeadowEntryLfsAttributeCoverage((...args) => {
			const path = args.at(-1)!;
			checkedPaths.push(path);
			return checkedAttributes(path);
		});

		expect(checkedPaths).toEqual([
			'artifacts/meadow-entry/hpa-399/lfs-canary.png',
			'docs/superpowers/reports/img/hpa-399/proofs/lfs-pattern-probe.png'
		]);
	});

	it('uses the real git runner to verify LFS attributes against the checked-in canary', async () => {
		const api = await verifierApi();
		expect(api.verifyMeadowEntryLfsAttributeCoverage).toBeTypeOf('function');
		if (!api.verifyMeadowEntryLfsAttributeCoverage) return;
		expect(() => api.verifyMeadowEntryLfsAttributeCoverage!()).not.toThrow();
	});

	it('verifies the full meadow-entry art storage contract end-to-end', async () => {
		const api = await verifierApi();
		expect(api.verifyMeadowEntryArtStorage).toBeTypeOf('function');
		if (!api.verifyMeadowEntryArtStorage) return;
		await expect(api.verifyMeadowEntryArtStorage()).resolves.toBeUndefined();
	});

	it('rejects a repository root that is not a Git LFS checkout', async () => {
		const api = await verifierApi();
		expect(api.verifyMeadowEntryArtStorage).toBeTypeOf('function');
		if (!api.verifyMeadowEntryArtStorage) return;

		const foreignRoot = mkdtempSync(join(tmpdir(), 'gliese-lfs-foreign-'));
		try {
			await expect(api.verifyMeadowEntryArtStorage(foreignRoot)).rejects.toThrow(/git .* failed/);
		} finally {
			rmSync(foreignRoot, { recursive: true, force: true });
		}
	});
});

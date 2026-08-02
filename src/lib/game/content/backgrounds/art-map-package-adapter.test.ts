import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ArtMapPackageCliApi {
	loadArtMapPackageAdapter(
		repositoryRoot: string,
		manifestPath: string
	): Promise<{ adapterId: string; implementation: string; mapId: string; version: 1 }>;
	runArtMapPackageCli(
		args: readonly string[],
		repositoryRoot?: string,
		options?: { onDispatch?: (operation: string) => void }
	): Promise<void>;
}

async function cliApi(): Promise<ArtMapPackageCliApi> {
	return (await import('../../../../../tools/art-map-package')) as unknown as ArtMapPackageCliApi;
}

describe('versioned art map package adapter', () => {
	it('loads the committed Meadow Entry adapter through a repository-relative path', async () => {
		const api = await cliApi();
		await expect(
			api.loadArtMapPackageAdapter(process.cwd(), 'art-map-adapters/meadow-entry.v1.json')
		).resolves.toMatchObject({
			version: 1,
			adapterId: 'meadow-entry-hpa-399',
			implementation: 'meadow-entry-package-v1',
			mapId: 'meadow-entry'
		});
	});

	it('fails closed for an unsupported future-map adapter without invoking a core script', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-future-map-adapter-'));
		const fixture = readFileSync(
			join(process.cwd(), 'src/lib/game/content/backgrounds/fixtures/future-map-adapter.v1.json')
		);
		const manifestPath = join(root, 'art-map-adapters/future-map.v1.json');
		mkdirSync(dirname(manifestPath), { recursive: true });
		writeFileSync(manifestPath, fixture);
		const marker = join(root, 'core-script-invoked');
		const api = await cliApi();

		await expect(
			api.runArtMapPackageCli(
				['--adapter', 'art-map-adapters/future-map.v1.json', '--operation', 'validate'],
				root,
				{ onDispatch: () => writeFileSync(marker, 'invoked') }
			)
		).rejects.toThrow(
			/Unsupported art map package adapter implementation "future-map-package-v1".*future-map-fixture/i
		);
		expect(() => readFileSync(marker)).toThrow();
	});

	it('rejects absolute and parent-traversing adapter paths', async () => {
		const api = await cliApi();
		await expect(api.loadArtMapPackageAdapter(process.cwd(), '/tmp/adapter.json')).rejects.toThrow(
			/repository-relative/i
		);
		await expect(api.loadArtMapPackageAdapter(process.cwd(), '../adapter.json')).rejects.toThrow(
			/repository-relative/i
		);
	});
});

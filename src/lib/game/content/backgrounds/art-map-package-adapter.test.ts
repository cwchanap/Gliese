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

interface MutableSupportedAdapter {
	paths: { proofRoot: string };
	versions: {
		normalizationTransform: number;
		cropContract: number;
		canonicalPngEncoder: number;
		dependencies: { sharp: string; runtime: string };
	};
	commands: { validate: string };
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

	it.each([
		[
			'normalization contract',
			(adapter: MutableSupportedAdapter) => (adapter.versions.normalizationTransform = 2)
		],
		['crop contract', (adapter: MutableSupportedAdapter) => (adapter.versions.cropContract = 2)],
		[
			'canonical encoder',
			(adapter: MutableSupportedAdapter) => (adapter.versions.canonicalPngEncoder = 2)
		],
		[
			'sharp dependency',
			(adapter: MutableSupportedAdapter) => (adapter.versions.dependencies.sharp = '0.35.4')
		],
		[
			'runtime dependency',
			(adapter: MutableSupportedAdapter) => (adapter.versions.dependencies.runtime = 'node')
		],
		[
			'validation command',
			(adapter: MutableSupportedAdapter) => (adapter.commands.validate = 'art:validate:other-map')
		],
		[
			'proof root',
			(adapter: MutableSupportedAdapter) =>
				(adapter.paths.proofRoot = 'docs/reports/other-map/proofs')
		]
	])('rejects a mutated supported adapter %s before dispatch', async (_label, mutate) => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-mutated-meadow-entry-adapter-'));
		const supported = JSON.parse(
			readFileSync(join(process.cwd(), 'art-map-adapters/meadow-entry.v1.json'), 'utf8')
		) as MutableSupportedAdapter;
		mutate(supported);
		const manifestPath = join(root, 'art-map-adapters/meadow-entry.v1.json');
		mkdirSync(dirname(manifestPath), { recursive: true });
		writeFileSync(manifestPath, JSON.stringify(supported));
		const marker = join(root, 'core-script-invoked');
		const api = await cliApi();

		await expect(
			api.runArtMapPackageCli(
				['--adapter', 'art-map-adapters/meadow-entry.v1.json', '--operation', 'validate'],
				root,
				{ onDispatch: () => writeFileSync(marker, 'invoked') }
			)
		).rejects.toThrow(/Unsupported.*capability contract.*meadow-entry-package-v1/i);
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

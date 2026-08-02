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

	it('rejects CLI invocation with the wrong number of flags', async () => {
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli(['--adapter', 'art-map-adapters/meadow-entry.v1.json'])
		).rejects.toThrow(/Usage: art:map-package/i);
	});

	it('rejects CLI invocation with an invalid flag', async () => {
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli(['--unknown', 'x', '--operation', 'validate'])
		).rejects.toThrow(/Invalid art map package CLI arguments/i);
	});

	it('rejects CLI invocation with a duplicate --adapter flag', async () => {
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli(['--adapter', 'a.json', '--adapter', 'b.json'])
		).rejects.toThrow(/Duplicate art map package CLI argument: --adapter/i);
	});

	it('rejects CLI invocation with an unsupported operation', async () => {
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli([
				'--adapter',
				'art-map-adapters/meadow-entry.v1.json',
				'--operation',
				'unknown'
			])
		).rejects.toThrow(/Unsupported art map package operation: unknown/i);
	});

	it('passes operation args after the -- separator through parseArguments', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-cli-separator-'));
		const supported = JSON.parse(
			readFileSync(join(process.cwd(), 'art-map-adapters/meadow-entry.v1.json'), 'utf8')
		);
		const manifestPath = join(root, 'art-map-adapters/meadow-entry.v1.json');
		mkdirSync(dirname(manifestPath), { recursive: true });
		writeFileSync(manifestPath, JSON.stringify(supported));
		const api = await cliApi();

		await expect(
			api.runArtMapPackageCli(
				[
					'--adapter',
					'art-map-adapters/meadow-entry.v1.json',
					'--operation',
					'validate',
					'--',
					'extra',
					'args'
				],
				root
			)
		).rejects.toThrow(/The validate operation accepts no operation arguments/i);
	});

	it('rejects an adapter manifest that is not valid JSON', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-invalid-json-adapter-'));
		const manifestPath = join(root, 'art-map-adapters/broken.v1.json');
		mkdirSync(dirname(manifestPath), { recursive: true });
		writeFileSync(manifestPath, '{ not valid json');
		const api = await cliApi();

		await expect(
			api.loadArtMapPackageAdapter(root, 'art-map-adapters/broken.v1.json')
		).rejects.toThrow(/is not valid JSON/i);
	});

	it('rejects a validateAdapter mutation: unsupported adapter version', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-adapter-version-'));
		const adapter = JSON.parse(
			readFileSync(join(process.cwd(), 'art-map-adapters/meadow-entry.v1.json'), 'utf8')
		) as Record<string, unknown>;
		adapter.version = 2;
		const manifestPath = join(root, 'art-map-adapters/meadow-entry.v1.json');
		mkdirSync(dirname(manifestPath), { recursive: true });
		writeFileSync(manifestPath, JSON.stringify(adapter));
		const api = await cliApi();

		await expect(
			api.loadArtMapPackageAdapter(root, 'art-map-adapters/meadow-entry.v1.json')
		).rejects.toThrow(/Unsupported art map package adapter version/i);
	});

	it('rejects a validateAdapter mutation: missing productionRecord key', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-missing-production-record-'));
		const adapter = JSON.parse(
			readFileSync(join(process.cwd(), 'art-map-adapters/meadow-entry.v1.json'), 'utf8')
		) as Record<string, unknown>;
		delete adapter.productionRecord;
		const manifestPath = join(root, 'art-map-adapters/meadow-entry.v1.json');
		mkdirSync(dirname(manifestPath), { recursive: true });
		writeFileSync(manifestPath, JSON.stringify(adapter));
		const api = await cliApi();

		await expect(
			api.loadArtMapPackageAdapter(root, 'art-map-adapters/meadow-entry.v1.json')
		).rejects.toThrow(/fields differ/i);
	});

	it('rejects a validateAdapter mutation: invalid adapterId', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-invalid-adapter-id-'));
		const adapter = JSON.parse(
			readFileSync(join(process.cwd(), 'art-map-adapters/meadow-entry.v1.json'), 'utf8')
		) as Record<string, unknown>;
		adapter.adapterId = 'UPPER';
		const manifestPath = join(root, 'art-map-adapters/meadow-entry.v1.json');
		mkdirSync(dirname(manifestPath), { recursive: true });
		writeFileSync(manifestPath, JSON.stringify(adapter));
		const api = await cliApi();

		await expect(
			api.loadArtMapPackageAdapter(root, 'art-map-adapters/meadow-entry.v1.json')
		).rejects.toThrow(/must be a stable lowercase identifier/i);
	});

	it('rejects a validateAdapter mutation: invalid input schema', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-invalid-schema-'));
		const adapter = JSON.parse(
			readFileSync(join(process.cwd(), 'art-map-adapters/meadow-entry.v1.json'), 'utf8')
		) as Record<string, unknown>;
		(adapter.schemas as Record<string, unknown>).input = 'wrong';
		const manifestPath = join(root, 'art-map-adapters/meadow-entry.v1.json');
		mkdirSync(dirname(manifestPath), { recursive: true });
		writeFileSync(manifestPath, JSON.stringify(adapter));
		const api = await cliApi();

		await expect(
			api.loadArtMapPackageAdapter(root, 'art-map-adapters/meadow-entry.v1.json')
		).rejects.toThrow(/Unsupported art package input schema/i);
	});

	it('rejects a validateAdapter mutation: absolute packageRoot path', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-absolute-path-'));
		const adapter = JSON.parse(
			readFileSync(join(process.cwd(), 'art-map-adapters/meadow-entry.v1.json'), 'utf8')
		) as Record<string, unknown>;
		(adapter.paths as Record<string, unknown>).packageRoot = '/abs/path';
		const manifestPath = join(root, 'art-map-adapters/meadow-entry.v1.json');
		mkdirSync(dirname(manifestPath), { recursive: true });
		writeFileSync(manifestPath, JSON.stringify(adapter));
		const api = await cliApi();

		await expect(
			api.loadArtMapPackageAdapter(root, 'art-map-adapters/meadow-entry.v1.json')
		).rejects.toThrow(/must be a normalized repository-relative path/i);
	});

	it('rejects a validateAdapter mutation: zero normalizationTransform version', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-zero-version-'));
		const adapter = JSON.parse(
			readFileSync(join(process.cwd(), 'art-map-adapters/meadow-entry.v1.json'), 'utf8')
		) as Record<string, unknown>;
		(adapter.versions as Record<string, unknown>).normalizationTransform = 0;
		const manifestPath = join(root, 'art-map-adapters/meadow-entry.v1.json');
		mkdirSync(dirname(manifestPath), { recursive: true });
		writeFileSync(manifestPath, JSON.stringify(adapter));
		const api = await cliApi();

		await expect(
			api.loadArtMapPackageAdapter(root, 'art-map-adapters/meadow-entry.v1.json')
		).rejects.toThrow(/must be a positive integer/i);
	});

	it('rejects a validateAdapter mutation: missing dependencies.sharp key', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-missing-sharp-'));
		const adapter = JSON.parse(
			readFileSync(join(process.cwd(), 'art-map-adapters/meadow-entry.v1.json'), 'utf8')
		) as Record<string, unknown>;
		delete (adapter.versions as Record<string, unknown>).dependencies.sharp;
		const manifestPath = join(root, 'art-map-adapters/meadow-entry.v1.json');
		mkdirSync(dirname(manifestPath), { recursive: true });
		writeFileSync(manifestPath, JSON.stringify(adapter));
		const api = await cliApi();

		await expect(
			api.loadArtMapPackageAdapter(root, 'art-map-adapters/meadow-entry.v1.json')
		).rejects.toThrow(/fields differ/i);
	});

	it('rejects operation args for the export operation before dispatch', async () => {
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli([
				'--adapter',
				'art-map-adapters/meadow-entry.v1.json',
				'--operation',
				'export',
				'--',
				'extra'
			])
		).rejects.toThrow(/The export operation accepts no operation arguments/i);
	});

	it('rejects operation args for the proof operation before dispatch', async () => {
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli([
				'--adapter',
				'art-map-adapters/meadow-entry.v1.json',
				'--operation',
				'proof',
				'--',
				'extra'
			])
		).rejects.toThrow(/The proof operation accepts no operation arguments/i);
	});

	it('rejects operation args for the validate operation before dispatch', async () => {
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli([
				'--adapter',
				'art-map-adapters/meadow-entry.v1.json',
				'--operation',
				'validate',
				'--',
				'extra'
			])
		).rejects.toThrow(/The validate operation accepts no operation arguments/i);
	});
});

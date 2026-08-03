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

	it('rejects a manifest that is not valid JSON', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-bad-json-adapter-'));
		const manifestPath = join(root, 'art-map-adapters/bad.json');
		mkdirSync(dirname(manifestPath), { recursive: true });
		writeFileSync(manifestPath, 'not valid json {{{');
		const api = await cliApi();
		await expect(api.loadArtMapPackageAdapter(root, 'art-map-adapters/bad.json')).rejects.toThrow(
			/not valid JSON/i
		);
	});

	it('rethrows non-SyntaxError errors from file reads', async () => {
		const api = await cliApi();
		await expect(
			api.loadArtMapPackageAdapter(process.cwd(), 'nonexistent/path/adapter.json')
		).rejects.toThrow();
	});
});

describe('art map package CLI argument parsing', () => {
	function copyAdapterToRoot(root: string): void {
		const manifestPath = join(root, 'art-map-adapters/meadow-entry.v1.json');
		mkdirSync(dirname(manifestPath), { recursive: true });
		writeFileSync(
			manifestPath,
			readFileSync(join(process.cwd(), 'art-map-adapters/meadow-entry.v1.json'))
		);
	}

	async function cliWithDispatch(
		args: readonly string[],
		repositoryRoot: string
	): Promise<{ operation: string; dispatched: boolean }> {
		const api = await cliApi();
		let dispatched = false;
		let operation = '';
		try {
			await api.runArtMapPackageCli(args, repositoryRoot, {
				onDispatch: (op) => {
					dispatched = true;
					operation = op;
				}
			});
		} catch {
			// Expected to fail after dispatch
		}
		return { operation, dispatched };
	}

	it('rejects arguments with no flags', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-art-map-no-flags-'));
		const api = await cliApi();
		await expect(api.runArtMapPackageCli([], root)).rejects.toThrow(/Usage/i);
	});

	it('rejects arguments with too few flags', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-art-map-few-flags-'));
		const api = await cliApi();
		await expect(api.runArtMapPackageCli(['--adapter', 'a.json'], root)).rejects.toThrow(/Usage/i);
	});

	it('rejects arguments with too many flags', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-art-map-many-flags-'));
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli(
				['--adapter', 'a.json', '--operation', 'validate', '--extra', 'flag'],
				root
			)
		).rejects.toThrow(/Usage/i);
	});

	it('rejects an unknown flag', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-art-map-unknown-flag-'));
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli(['--adapter', 'a.json', '--unknown', 'validate'], root)
		).rejects.toThrow(/Invalid art map package CLI arguments/i);
	});

	it('rejects a duplicate --adapter flag', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-art-map-dup-adapter-'));
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli(['--adapter', 'a.json', '--adapter', 'b.json'], root)
		).rejects.toThrow(/Duplicate.*--adapter/i);
	});

	it('rejects an unsupported operation', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-art-map-bad-op-'));
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli(['--adapter', 'a.json', '--operation', 'unknown'], root)
		).rejects.toThrow(/Unsupported art map package operation/i);
	});

	it('dispatches to the finalize operation before the operation runs', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-art-map-finalize-'));
		copyAdapterToRoot(root);
		const result = await cliWithDispatch(
			[
				'--adapter',
				'art-map-adapters/meadow-entry.v1.json',
				'--operation',
				'finalize',
				'--',
				'--plane',
				'base'
			],
			root
		);
		expect(result.dispatched).toBe(true);
		expect(result.operation).toBe('finalize');
	});

	it('dispatches to the export operation and rejects extra operation args', async () => {
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli(
				[
					'--adapter',
					'art-map-adapters/meadow-entry.v1.json',
					'--operation',
					'export',
					'--',
					'extra'
				],
				process.cwd()
			)
		).rejects.toThrow(/export operation accepts no operation arguments/i);
	});

	it('dispatches to the proof operation and rejects extra operation args', async () => {
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli(
				[
					'--adapter',
					'art-map-adapters/meadow-entry.v1.json',
					'--operation',
					'proof',
					'--',
					'extra'
				],
				process.cwd()
			)
		).rejects.toThrow(/proof operation accepts no operation arguments/i);
	});

	it('dispatches to the validate operation and rejects extra operation args', async () => {
		const api = await cliApi();
		await expect(
			api.runArtMapPackageCli(
				[
					'--adapter',
					'art-map-adapters/meadow-entry.v1.json',
					'--operation',
					'validate',
					'--',
					'extra'
				],
				process.cwd()
			)
		).rejects.toThrow(/validate operation accepts no operation arguments/i);
	});

	it('dispatches to the approve operation before the operation runs', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-art-map-approve-'));
		copyAdapterToRoot(root);
		const result = await cliWithDispatch(
			[
				'--adapter',
				'art-map-adapters/meadow-entry.v1.json',
				'--operation',
				'approve',
				'--',
				'extra'
			],
			root
		);
		expect(result.dispatched).toBe(true);
		expect(result.operation).toBe('approve');
	});

	it('strips a leading -- separator before parsing flags', async () => {
		const root = mkdtempSync(join(tmpdir(), 'gliese-art-map-leading-sep-'));
		copyAdapterToRoot(root);
		const result = await cliWithDispatch(
			[
				'--',
				'--adapter',
				'art-map-adapters/meadow-entry.v1.json',
				'--operation',
				'validate',
				'--',
				'extra'
			],
			root
		);
		expect(result.dispatched).toBe(true);
		expect(result.operation).toBe('validate');
	});
});

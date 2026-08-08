import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	launch: vi.fn(),
	close: vi.fn(),
	evaluate: vi.fn()
}));

vi.mock('playwright', () => ({
	chromium: {
		launch: mocks.launch
	}
}));

import {
	EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
	runMeadowEntryTextureSafetyProbe
} from '../../../../tools/probe-meadow-entry-texture-safety';
import type { TextureSafetyProbeReport } from '../../../../tools/probe-meadow-entry-texture-safety';

type BunServe = (options: {
	hostname: string;
	port: number;
	fetch: (request: Request) => Response | Promise<Response>;
}) => { port: number; stop: (closeActiveConnections?: boolean) => void };

interface BunGlobal {
	serve: BunServe;
}

const originalBun = (globalThis as { Bun?: BunGlobal }).Bun;

function installFakeBunServe(): void {
	(globalThis as { Bun?: BunGlobal }).Bun = {
		serve: (() => ({
			port: 12345,
			stop: vi.fn()
		})) as BunServe
	};
}

function restoreBun(): void {
	const g = globalThis as { Bun?: BunGlobal };
	if (originalBun) {
		g.Bun = originalBun;
	} else {
		delete g.Bun;
	}
}

function setBrowserResult(overrides: Partial<TextureSafetyProbeReport> = {}): void {
	const base = {
		webglAvailable: true,
		maxTextureSize: 16384,
		contextLost: false as boolean | null,
		renderer: 'Mock WebGL Renderer',
		userAgent: 'MockAgent/1.0',
		assets: [] as TextureSafetyProbeReport['assets'],
		retainedTextures: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT
	};
	mocks.evaluate.mockResolvedValue({ ...base, ...overrides });
}

function installBrowserMock(): void {
	mocks.launch.mockResolvedValue({
		version: () => 'MockBrowser/1.0',
		newPage: async () => ({
			evaluate: mocks.evaluate
		}),
		close: mocks.close
	});
}

beforeEach(() => {
	installFakeBunServe();
	mocks.launch.mockReset();
	mocks.close.mockReset();
	mocks.evaluate.mockReset();
	installBrowserMock();
});

afterEach(() => {
	restoreBun();
});

function makeSuccessfulAssets(count: number) {
	return Array.from({ length: count }, (_, i) => ({
		id: `asset-${i}:base`,
		path: `asset-${i}.png`,
		width: 256,
		height: 256,
		durationMs: 5,
		success: true,
		failure: null
	}));
}

describe('runMeadowEntryTextureSafetyProbe orchestration', () => {
	it('builds a proceed report when all assets upload and retain without context loss', async () => {
		setBrowserResult({
			assets: makeSuccessfulAssets(EXPECTED_MEADOW_ENTRY_EXPORT_COUNT),
			retainedTextures: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
			contextLost: false
		});

		const report = await runMeadowEntryTextureSafetyProbe();

		expect(report.decision).toBe('proceed');
		expect(report.failureScope).toBeNull();
		expect(report.probeFailure).toBeNull();
		expect(report.assetCount).toBe(EXPECTED_MEADOW_ENTRY_EXPORT_COUNT);
		expect(report.successfulUploads).toBe(EXPECTED_MEADOW_ENTRY_EXPORT_COUNT);
		expect(report.retainedTextures).toBe(EXPECTED_MEADOW_ENTRY_EXPORT_COUNT);
		expect(report.contextLost).toBe(false);
		expect(report.webglAvailable).toBe(true);
		expect(report.maxTextureSize).toBe(16384);
		expect(report.browser.engine).toBe('chromium');
		expect(report.browser.version).toBe('MockBrowser/1.0');
		expect(report.browser.userAgent).toBe('MockAgent/1.0');
		expect(report.browser.renderer).toBe('Mock WebGL Renderer');
		expect(report.assets).toHaveLength(EXPECTED_MEADOW_ENTRY_EXPORT_COUNT);
		expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
		expect(mocks.close).toHaveBeenCalled();
	});

	it('builds a stop report with individual-asset scope when some assets fail', async () => {
		setBrowserResult({
			assets: [
				{
					id: 'asset-0:base',
					path: 'asset-0.png',
					width: 256,
					height: 256,
					durationMs: 5,
					success: true,
					failure: null
				},
				{
					id: 'asset-1:base',
					path: 'asset-1.png',
					width: 256,
					height: 256,
					durationMs: 3,
					success: false,
					failure: 'texImage2D failed'
				}
			],
			retainedTextures: 1,
			contextLost: false
		});

		const report = await runMeadowEntryTextureSafetyProbe();

		expect(report.decision).toBe('stop');
		expect(report.failureScope).toBe('individual-asset');
		expect(report.successfulUploads).toBe(1);
		expect(report.retainedTextures).toBe(1);
	});

	it('builds a stop report with aggregate-only scope when context is lost', async () => {
		setBrowserResult({
			assets: makeSuccessfulAssets(EXPECTED_MEADOW_ENTRY_EXPORT_COUNT),
			retainedTextures: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
			contextLost: true
		});

		const report = await runMeadowEntryTextureSafetyProbe();

		expect(report.decision).toBe('stop');
		expect(report.failureScope).toBe('aggregate-only');
		expect(report.contextLost).toBe(true);
		expect(report.successfulUploads).toBe(EXPECTED_MEADOW_ENTRY_EXPORT_COUNT);
	});

	it('builds a stop report with probe-setup scope when browser launch throws', async () => {
		mocks.launch.mockRejectedValue(new Error('browser launch failed'));

		const report = await runMeadowEntryTextureSafetyProbe();

		expect(report.decision).toBe('stop');
		expect(report.failureScope).toBe('probe-setup');
		expect(report.probeFailure).toBe('browser launch failed');
		expect(report.webglAvailable).toBe(false);
		expect(report.successfulUploads).toBe(0);
		expect(report.retainedTextures).toBe(0);
		expect(report.assets).toEqual([]);
		expect(report.assetCount).toBe(EXPECTED_MEADOW_ENTRY_EXPORT_COUNT);
	});

	it('builds a stop report with probe-setup scope when Bun.serve throws', async () => {
		const bun = (globalThis as { Bun?: BunGlobal }).Bun!;
		const originalServe = bun.serve;
		bun.serve = (() => {
			throw new Error('serve failed');
		}) as BunServe;

		try {
			const report = await runMeadowEntryTextureSafetyProbe();

			expect(report.decision).toBe('stop');
			expect(report.failureScope).toBe('probe-setup');
			expect(report.probeFailure).toBe('serve failed');
			expect(report.webglAvailable).toBe(false);
			expect(report.assets).toEqual([]);
		} finally {
			bun.serve = originalServe;
		}
	});

	it('includes platform and scope metadata in the report', async () => {
		setBrowserResult();

		const report = await runMeadowEntryTextureSafetyProbe();

		expect(report.scope).toBe('chromium-webgl-only');
		expect(report.platform).toBe(process.platform);
	});
});

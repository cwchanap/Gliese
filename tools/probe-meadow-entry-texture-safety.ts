import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium } from 'playwright';

declare const Bun: {
	serve(options: {
		hostname: string;
		port: number;
		fetch(request: Request): Response | Promise<Response>;
	}): {
		port: number;
		stop(closeActiveConnections?: boolean): void;
	};
};

export interface TextureSafetyAsset {
	readonly id: string;
	readonly path: string;
	readonly width: number;
	readonly height: number;
}

export interface TextureSafetyProbeInput {
	readonly label: string;
	readonly assets: readonly TextureSafetyAsset[];
	readonly expectedRetainedTextures: number;
}

export interface TextureSafetyAssetResult extends TextureSafetyAsset {
	durationMs: number;
	success: boolean;
	failure: string | null;
}

export interface TextureSafetyProbeReport {
	label: string;
	expectedRetainedTextures: number;
	scope: 'chromium-webgl-only';
	assetCount: number;
	successfulUploads: number;
	retainedTextures: number;
	maxTextureSize: number | null;
	contextLost: boolean | null;
	webglAvailable: boolean;
	assets: readonly TextureSafetyAssetResult[];
	totalDurationMs: number;
	browser: {
		engine: 'chromium';
		version: string | null;
		userAgent: string | null;
		renderer: string | null;
	};
	platform: string;
	probeFailure: string | null;
	failureScope: 'individual-asset' | 'aggregate-only' | 'probe-setup' | null;
	decision: 'proceed' | 'stop';
}

interface BrowserProbeResult {
	webglAvailable: boolean;
	maxTextureSize: number | null;
	contextLost: boolean | null;
	renderer: string | null;
	userAgent: string;
	browserVersion: string;
	assets: TextureSafetyAssetResult[];
	retainedTextures: number;
}

export const paintedV2CleanBaselineTextureSafetyInput: TextureSafetyProbeInput = {
	label: 'painted-v2-clean-baseline',
	assets: [],
	expectedRetainedTextures: 0
};

export function decideTextureSafety(
	input: Pick<TextureSafetyProbeInput, 'label' | 'assets' | 'expectedRetainedTextures'>,
	report: Pick<
		TextureSafetyProbeReport,
		'assetCount' | 'successfulUploads' | 'retainedTextures' | 'contextLost'
	>
): 'proceed' | 'stop' {
	const expectedAssetCount = input.assets.length;
	const ids = new Set(input.assets.map((asset) => asset.id));
	const zeroAssetBaseline =
		expectedAssetCount === 0 &&
		input.label === 'painted-v2-clean-baseline' &&
		input.expectedRetainedTextures === 0;
	const candidateInput = expectedAssetCount > 0;

	return (zeroAssetBaseline || candidateInput) &&
		ids.size === expectedAssetCount &&
		report.assetCount === expectedAssetCount &&
		report.successfulUploads === expectedAssetCount &&
		report.retainedTextures === input.expectedRetainedTextures &&
		report.contextLost === false
		? 'proceed'
		: 'stop';
}

export function classifyFailureScope(
	report: Pick<TextureSafetyProbeReport, 'assets' | 'contextLost' | 'probeFailure'>
): TextureSafetyProbeReport['failureScope'] {
	if (report.probeFailure) return 'probe-setup';
	if (report.assets.some((asset) => !asset.success)) return 'individual-asset';
	if (report.contextLost !== false) return 'aggregate-only';
	return null;
}

export function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function createAssetServer(repositoryRoot: string, assets: readonly TextureSafetyAsset[]) {
	const paths = new Map(
		assets.map((asset) => [`/${asset.path}`, resolve(repositoryRoot, asset.path)])
	);

	return Bun.serve({
		hostname: '127.0.0.1',
		port: 0,
		async fetch(request) {
			const path = new URL(request.url).pathname;
			const filePath = paths.get(path);
			if (!filePath) return new Response('Not found', { status: 404 });

			try {
				return new Response(await readFile(filePath), {
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Cache-Control': 'no-store',
						'Content-Type': 'image/png'
					}
				});
			} catch {
				return new Response('Not found', { status: 404 });
			}
		}
	});
}

async function uploadAssetsInOneContext(
	origin: string,
	assets: readonly TextureSafetyAsset[]
): Promise<BrowserProbeResult> {
	const browser = await chromium.launch({ headless: true });
	try {
		const page = await browser.newPage();
		const browserVersion = browser.version();
		const result = await page.evaluate(
			async ({ origin, assets }) => {
				const canvas = document.createElement('canvas');
				const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
				const userAgent = navigator.userAgent;
				if (!gl) {
					return {
						webglAvailable: false,
						maxTextureSize: null,
						contextLost: null,
						renderer: null,
						userAgent,
						assets: assets.map((asset) => ({
							...asset,
							durationMs: 0,
							success: false,
							failure: 'WebGL unavailable'
						})),
						retainedTextures: 0
					};
				}

				const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
				const renderer = gl.getParameter(gl.RENDERER) as string;
				const retainedTextures: WebGLTexture[] = [];
				let contextLost = false;
				canvas.addEventListener('webglcontextlost', (event) => {
					event.preventDefault();
					contextLost = true;
				});

				const results: TextureSafetyAssetResult[] = [];
				for (const asset of assets) {
					const started = performance.now();
					try {
						const response = await fetch(`${origin}/${asset.path}`);
						if (!response.ok) {
							throw new Error(`Fetch failed with HTTP ${response.status}`);
						}
						const bitmap = await createImageBitmap(await response.blob());
						try {
							if (bitmap.width !== asset.width || bitmap.height !== asset.height) {
								throw new Error(
									`Decoded ${bitmap.width}x${bitmap.height}, expected ${asset.width}x${asset.height}`
								);
							}
							const texture = gl.createTexture();
							if (!texture) throw new Error('WebGL could not create a texture');
							gl.bindTexture(gl.TEXTURE_2D, texture);
							gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
							const error = gl.getError();
							if (error !== gl.NO_ERROR) {
								gl.deleteTexture(texture);
								throw new Error(`texImage2D failed with WebGL error ${error}`);
							}
							retainedTextures.push(texture);
							results.push({
								...asset,
								durationMs: Math.round(performance.now() - started),
								success: true,
								failure: null
							});
						} finally {
							bitmap.close();
						}
					} catch (error) {
						results.push({
							...asset,
							durationMs: Math.round(performance.now() - started),
							success: false,
							failure: error instanceof Error ? error.message : String(error)
						});
					}
				}

				await new Promise<void>((resolve) => {
					let settled = false;
					const settle = () => {
						if (settled) return;
						settled = true;
						resolve();
					};
					requestAnimationFrame(settle);
					setTimeout(settle, 500);
				});
				return {
					webglAvailable: true,
					maxTextureSize,
					contextLost: contextLost || gl.isContextLost(),
					renderer,
					userAgent,
					assets: results,
					retainedTextures: retainedTextures.length
				};
			},
			{ origin, assets }
		);

		return { ...result, browserVersion };
	} finally {
		await browser.close();
	}
}

/**
 * Runs the Meadow Entry WebGL texture-safety preflight: uploads every injected
 * asset into a single Chromium WebGL context and reports whether the expected
 * textures were retained without context loss.
 *
 * @param input - Label, assets, and expected retention count for this probe.
 * @param repositoryRoot - Repository root used to resolve asset paths; defaults
 *   to the current working directory.
 * @returns A {@link TextureSafetyProbeReport}. The probe never throws: any
 *   setup or browser failure is captured as a structured `stop` report with a
 *   `probeFailure`/`failureScope` diagnosis.
 */
export async function runMeadowEntryTextureSafetyProbe(
	input: TextureSafetyProbeInput,
	repositoryRoot = process.cwd()
): Promise<TextureSafetyProbeReport> {
	const started = performance.now();
	let server: ReturnType<typeof createAssetServer> | undefined;
	try {
		server = createAssetServer(repositoryRoot, input.assets);
		const result = await uploadAssetsInOneContext(`http://127.0.0.1:${server.port}`, input.assets);
		const successfulUploads = result.assets.filter((asset) => asset.success).length;
		const report: TextureSafetyProbeReport = {
			label: input.label,
			expectedRetainedTextures: input.expectedRetainedTextures,
			scope: 'chromium-webgl-only',
			assetCount: input.assets.length,
			successfulUploads,
			retainedTextures: result.retainedTextures,
			maxTextureSize: result.maxTextureSize,
			contextLost: result.contextLost,
			webglAvailable: result.webglAvailable,
			assets: result.assets,
			totalDurationMs: Math.round(performance.now() - started),
			browser: {
				engine: 'chromium',
				version: result.browserVersion,
				userAgent: result.userAgent,
				renderer: result.renderer
			},
			platform: process.platform,
			probeFailure: null,
			failureScope: null,
			decision: 'stop'
		};
		report.failureScope = classifyFailureScope(report);
		report.decision = decideTextureSafety(input, report);
		return report;
	} catch (error) {
		const report: TextureSafetyProbeReport = {
			label: input.label,
			expectedRetainedTextures: input.expectedRetainedTextures,
			scope: 'chromium-webgl-only',
			assetCount: input.assets.length,
			successfulUploads: 0,
			retainedTextures: 0,
			maxTextureSize: null,
			contextLost: null,
			webglAvailable: false,
			assets: [],
			totalDurationMs: Math.round(performance.now() - started),
			browser: {
				engine: 'chromium',
				version: null,
				userAgent: null,
				renderer: null
			},
			platform: process.platform,
			probeFailure: message(error),
			failureScope: 'probe-setup',
			decision: 'stop'
		};
		return report;
	} finally {
		server?.stop(true);
	}
}

if (import.meta.main) {
	const report = await runMeadowEntryTextureSafetyProbe(paintedV2CleanBaselineTextureSafetyInput);
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	if (report.decision === 'stop') process.exitCode = 1;
}

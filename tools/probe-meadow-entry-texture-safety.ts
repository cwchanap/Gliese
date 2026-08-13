import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { chromium } from 'playwright';

import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	validateCanonicalPngChunks
} from '$lib/game/content/backgrounds/meadow-entry-png';

const TEXTURE_PROBE_ROOT = 'artifacts/meadow-entry/painted-v2/proofs/texture-probe';
const TEXTURE_PROBE_SOURCE_PATH =
	'artifacts/meadow-entry/painted-v2/exports/painted-v2-sundrop-village-base.png';

export const paintedV2TextureProbeRepresentativePaths = Object.freeze({
	'3200': `${TEXTURE_PROBE_ROOT}/representative-3200.png`,
	'1600': `${TEXTURE_PROBE_ROOT}/representative-1600.png`
} as const);

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
	/** Expected canonical encoded size, when the candidate is a checked-in proof asset. */
	readonly encodedBytes?: number;
	/** Expected canonical encoded SHA-256, when the candidate is a checked-in proof asset. */
	readonly encodedSha256?: string;
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
	encodedBytesTotal: number;
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

export interface MeadowEntryTextureProbeRepresentative {
	readonly size: 1600 | 3200;
	readonly path: string;
	readonly width: number;
	readonly height: number;
	readonly encodedBytes: number;
	readonly encodedSha256: string;
	readonly sourcePath: string;
	readonly sourceWidth: number;
	readonly sourceHeight: number;
	readonly cropOffsetX: number;
	readonly cropOffsetY: number;
	readonly tiling: 'mirrored';
}

type TextureProbeCandidate = 'painted-v2-2x2' | 'painted-v2-4x4' | 'painted-v2-camera-safe-pilot';

const REPRESENTATIVE_METADATA: Readonly<
	Record<1600 | 3200, MeadowEntryTextureProbeRepresentative>
> = {
	1600: {
		size: 1600,
		path: paintedV2TextureProbeRepresentativePaths['1600'],
		width: 1600,
		height: 1600,
		encodedBytes: 6_479_247,
		encodedSha256: '2d6decfe86bf6df706e5fbf2390236a40fab70fe776af73c8e6cfb42531a50f5',
		sourcePath: TEXTURE_PROBE_SOURCE_PATH,
		sourceWidth: 2624,
		sourceHeight: 2176,
		cropOffsetX: 512,
		cropOffsetY: 288,
		tiling: 'mirrored'
	},
	3200: {
		size: 3200,
		path: paintedV2TextureProbeRepresentativePaths['3200'],
		width: 3200,
		height: 3200,
		encodedBytes: 25_311_015,
		encodedSha256: '6e5cf00e3c1e8eb161faf3e4c44cc762d1934e4a35578188d3f00ae354fffa3c',
		sourcePath: TEXTURE_PROBE_SOURCE_PATH,
		sourceWidth: 2624,
		sourceHeight: 2176,
		cropOffsetX: -288,
		cropOffsetY: -512,
		tiling: 'mirrored'
	}
} as const;

function candidateAssets(
	label: TextureProbeCandidate,
	count: number,
	metadata: MeadowEntryTextureProbeRepresentative
): readonly TextureSafetyAsset[] {
	return Object.freeze(
		Array.from({ length: count }, (_, index) =>
			Object.freeze({
				id: `${label}:tile-${String(index).padStart(2, '0')}`,
				path: metadata.path,
				width: metadata.width,
				height: metadata.height,
				encodedBytes: metadata.encodedBytes,
				encodedSha256: metadata.encodedSha256
			})
		)
	);
}

export const PAINTED_V2_TEXTURE_PROBE_INPUTS: Readonly<
	Record<TextureProbeCandidate, TextureSafetyProbeInput>
> = Object.freeze({
	'painted-v2-2x2': Object.freeze({
		label: 'painted-v2-2x2',
		assets: candidateAssets('painted-v2-2x2', 4, REPRESENTATIVE_METADATA[3200]),
		expectedRetainedTextures: 4
	}),
	'painted-v2-4x4': Object.freeze({
		label: 'painted-v2-4x4',
		assets: candidateAssets('painted-v2-4x4', 16, REPRESENTATIVE_METADATA[1600]),
		expectedRetainedTextures: 16
	}),
	'painted-v2-camera-safe-pilot': Object.freeze({
		label: 'painted-v2-camera-safe-pilot',
		assets: Object.freeze([
			Object.freeze({
				id: 'sundrop-camera-base',
				path: 'artifacts/meadow-entry/painted-v2/exports/painted-v2-sundrop-camera-base.png',
				width: 3200,
				height: 3200,
				encodedBytes: 26_114_768,
				encodedSha256: 'fbf564358f64a486979c3c5ffbed9bbc8784ec4b106f9f72341b46dda720aa5e'
			}),
			Object.freeze({
				id: 'crossroads-camera-base',
				path: 'artifacts/meadow-entry/painted-v2/exports/painted-v2-crossroads-camera-base.png',
				width: 3200,
				height: 3200,
				encodedBytes: 27_604_984,
				encodedSha256: 'ab819e538f41ea30a0cb8b0a310a6d6211ca553d8e4d9ef3f8d8094475243d4b'
			})
		]),
		expectedRetainedTextures: 2
	})
});

export function paintedV2TextureProbeInput(
	candidate: TextureProbeCandidate
): TextureSafetyProbeInput {
	return PAINTED_V2_TEXTURE_PROBE_INPUTS[candidate];
}

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

function mirrorCoordinate(index: number, length: number): number {
	const cycle = length * 2;
	const wrapped = ((index % cycle) + cycle) % cycle;
	return wrapped < length ? wrapped : cycle - wrapped - 1;
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

/**
 * Creates the two non-runtime proof textures from the approved Sundrop base crop.
 * The source is repeated with mirrored edges and sampled from a centered crop so
 * that both candidates retain natural pixels without inventing a new runtime asset.
 */
export async function generateMeadowEntryTextureProbeRepresentatives(
	repositoryRoot = process.cwd()
): Promise<readonly MeadowEntryTextureProbeRepresentative[]> {
	const sourcePath = resolve(repositoryRoot, TEXTURE_PROBE_SOURCE_PATH);
	const sourcePng = await readFile(sourcePath);
	const source = await decodeMeadowEntryRgba(sourcePng);
	assert(
		source.width === 2624 && source.height === 2176,
		'Texture probe source dimensions drifted'
	);
	const generated: MeadowEntryTextureProbeRepresentative[] = [];
	for (const metadata of Object.values(REPRESENTATIVE_METADATA)) {
		const raw = Buffer.alloc(metadata.width * metadata.height * 4);
		for (let y = 0; y < metadata.height; y += 1) {
			const sourceY = mirrorCoordinate(y + metadata.cropOffsetY, source.height);
			for (let x = 0; x < metadata.width; x += 1) {
				const sourceX = mirrorCoordinate(x + metadata.cropOffsetX, source.width);
				const sourceOffset = (sourceY * source.width + sourceX) * 4;
				const outputOffset = (y * metadata.width + x) * 4;
				source.data.copy(raw, outputOffset, sourceOffset, sourceOffset + 4);
			}
		}
		const encoded = await encodeCanonicalMeadowEntryPng(raw, metadata.width, metadata.height);
		validateCanonicalPngChunks(encoded);
		const decoded = await decodeMeadowEntryRgba(encoded);
		assert(
			decoded.width === metadata.width && decoded.height === metadata.height,
			`Texture probe representative dimensions drifted: ${metadata.size}`
		);
		for (let offset = 3; offset < decoded.data.length; offset += 4) {
			assert(
				decoded.data[offset] !== 0,
				`Texture probe representative contains transparent pixels: ${metadata.size}`
			);
		}
		const outputPath = resolve(repositoryRoot, metadata.path);
		await mkdir(dirname(outputPath), { recursive: true });
		await writeFile(outputPath, encoded);
		generated.push({
			...metadata,
			encodedBytes: encoded.byteLength,
			encodedSha256: sha256(encoded)
		});
	}
	return Object.freeze(generated);
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
	let lastError: unknown;
	for (let attempt = 0; attempt < 32; attempt += 1) {
		// Bun 1.3 on macOS rejects port 0, so choose a bounded loopback port and
		// retry only on a bind collision. The probe owns and closes this listener.
		const port = 45_000 + ((process.pid + attempt) % 1_000);
		try {
			return Bun.serve({
				hostname: '127.0.0.1',
				port,
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
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function validateExpectedAssetBytes(
	input: TextureSafetyProbeInput,
	repositoryRoot: string
): Promise<void> {
	for (const asset of input.assets) {
		if (asset.encodedBytes === undefined && asset.encodedSha256 === undefined) continue;
		const bytes = await readFile(resolve(repositoryRoot, asset.path));
		if (asset.encodedBytes !== undefined && bytes.byteLength !== asset.encodedBytes) {
			throw new Error(
				`Encoded byte count drifted for ${asset.id}: ${bytes.byteLength}/${asset.encodedBytes}`
			);
		}
		if (asset.encodedSha256 !== undefined && sha256(bytes) !== asset.encodedSha256) {
			throw new Error(
				`Encoded SHA-256 drifted for ${asset.id}: ${sha256(bytes)}/${asset.encodedSha256}`
			);
		}
	}
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
		await validateExpectedAssetBytes(input, repositoryRoot);
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
			encodedBytesTotal: result.assets.reduce(
				(total, asset) => total + (asset.encodedBytes ?? 0),
				0
			),
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
			encodedBytesTotal: 0,
			decision: 'stop'
		};
		return report;
	} finally {
		server?.stop(true);
	}
}

function parseCandidateArgument(args: readonly string[]): TextureProbeCandidate | null {
	if (args.length === 0) return null;
	if (args.length !== 2 || args[0] !== '--candidate') {
		throw new Error(
			'Usage: bun tools/probe-meadow-entry-texture-safety.ts [--candidate painted-v2-2x2|painted-v2-4x4|painted-v2-camera-safe-pilot]'
		);
	}
	const candidate = args[1];
	if (
		candidate !== 'painted-v2-2x2' &&
		candidate !== 'painted-v2-4x4' &&
		candidate !== 'painted-v2-camera-safe-pilot'
	) {
		throw new Error(`Unknown Meadow Entry texture probe candidate: ${candidate}`);
	}
	return candidate;
}

function reportFilename(candidate: TextureProbeCandidate): string {
	if (candidate === 'painted-v2-2x2') return 'browser-3200.json';
	if (candidate === 'painted-v2-4x4') return 'browser-1600.json';
	return 'browser-camera-safe-pilot.json';
}

if (import.meta.main) {
	try {
		const candidate = parseCandidateArgument(process.argv.slice(2));
		const input = candidate
			? paintedV2TextureProbeInput(candidate)
			: paintedV2CleanBaselineTextureSafetyInput;
		const report = await runMeadowEntryTextureSafetyProbe(input);
		if (candidate) {
			const outputPath = resolve(TEXTURE_PROBE_ROOT, reportFilename(candidate));
			await mkdir(dirname(outputPath), { recursive: true });
			await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
		}
		process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
		if (report.decision === 'stop') process.exitCode = 1;
	} catch (error) {
		console.error(message(error));
		process.exitCode = 1;
	}
}

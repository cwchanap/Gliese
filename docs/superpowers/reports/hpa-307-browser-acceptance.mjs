import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO = resolve(dirname(SCRIPT_PATH), '../../..');
let BASE_URL;
const ASSET_PATH = '/game/assets/regions/sundrop-village-background.png';
const ASSET_FILE = join(REPO, 'public/game/assets/regions/sundrop-village-background.png');
const SAVE_KEY = 'gliese.save.v8';
const OUTPUT_DIR = join(REPO, 'docs/superpowers/reports/img/hpa-307');
const TEMP_RESULT = '/private/tmp/hpa-307-route-result.json';
const PHASE = process.argv[2] ?? 'route';
const VIEWPORT = { width: 1280, height: 720 };
const WARMUP_FRAMES = 120;
const WARMUP_TIMEOUT_MS = 10_000;
const EVIDENCE_PATH_PREFIX = 'docs/superpowers/reports/';
const EXPECTED_PRODUCTION_SHA256 =
	'3933829f19e7eab4b26ba2d31c7a0cfac25d4fae0a16196893fac6dbf02187c1';
const COMMIT = execFileSync('rtk', ['git', 'rev-parse', 'HEAD'], {
	cwd: REPO,
	encoding: 'utf8'
}).trim();
const WORKTREE_PATHS = execFileSync(
	'rtk',
	['git', 'status', '--porcelain=v1', '--untracked-files=all'],
	{
		cwd: REPO,
		encoding: 'utf8'
	}
)
	.trim()
	.split('\n')
	.filter(Boolean)
	.map((line) => {
		const match = /^(?:[ MADRCU?!]{2}|[MADRCU?!])\s+(.+)$/.exec(line);
		if (!match) throw new Error(`unexpected git status line: ${line}`);
		return match[1].split(' -> ').at(-1);
	});
const PRODUCT_DIRTY_PATHS = [...new Set(WORKTREE_PATHS)].filter(
	(path) => !path.startsWith(EVIDENCE_PATH_PREFIX)
);
if (PRODUCT_DIRTY_PATHS.length > 0) {
	throw new Error(
		`refusing to label evidence with ${COMMIT} while product paths are dirty: ${PRODUCT_DIRTY_PATHS.join(', ')}`
	);
}
const PRODUCTION_ASSET = await readFile(ASSET_FILE);
const PRODUCTION_SHA256 = createHash('sha256').update(PRODUCTION_ASSET).digest('hex');
if (PRODUCTION_SHA256 !== EXPECTED_PRODUCTION_SHA256) {
	throw new Error(
		`production asset drift: expected ${EXPECTED_PRODUCTION_SHA256}, received ${PRODUCTION_SHA256}`
	);
}
const EXPECTED_INTERIORS = [
	'item-shop',
	'hero-house',
	'shrine-of-aurora-interior',
	'villager-house-2',
	'villager-house-3',
	'villager-house-1',
	'guild-hall'
];
const RENDERER_SIDECARS = [
	{
		mode: 'enabled',
		query: '',
		expectedCompletions: 1,
		screenshotName: 'runtime-background-enabled.png',
		sidecarName: 'runtime-background-enabled.renderer.json'
	},
	{
		mode: 'background-off',
		query: '?regionalBackground=off',
		expectedCompletions: 0,
		screenshotName: 'runtime-background-off.png',
		sidecarName: 'runtime-background-off.renderer.json'
	},
	{
		mode: 'collision-overlay',
		query: '?mapDebug=collision',
		expectedCompletions: 1,
		screenshotName: 'runtime-background-collision.png',
		sidecarName: 'runtime-background-collision.renderer.json'
	},
	{
		mode: 'background-off-plus-collision',
		query: '?regionalBackground=off&mapDebug=collision',
		expectedCompletions: 0,
		screenshotName: 'runtime-background-off-collision.png',
		sidecarName: 'runtime-background-off-collision.renderer.json'
	},
	{
		mode: 'intercepted-load-failure',
		query: '',
		expectedCompletions: 0,
		abortAsset: true,
		screenshotName: 'runtime-background-load-failure.png',
		sidecarName: 'runtime-background-load-failure.renderer.json'
	}
];

async function reservePreviewPort() {
	const server = createServer();
	await new Promise((resolvePromise, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolvePromise);
	});
	const address = server.address();
	if (!address || typeof address === 'string') {
		server.close();
		throw new Error('could not reserve a local preview port');
	}
	await new Promise((resolvePromise, reject) => {
		server.close((error) => (error ? reject(error) : resolvePromise()));
	});
	return address.port;
}

function captureBoundedOutput(stream, limit = 16_384) {
	let output = '';
	stream.setEncoding('utf8');
	stream.on('data', (chunk) => {
		output = `${output}${chunk}`.slice(-limit);
	});
	return () => output;
}

async function settlesWithin(promise, timeoutMs) {
	let timeout;
	try {
		return await Promise.race([
			promise.then(() => true),
			new Promise((resolvePromise) => {
				timeout = setTimeout(() => resolvePromise(false), timeoutMs);
			})
		]);
	} finally {
		clearTimeout(timeout);
	}
}

function signalOwnedProcessGroup(child, signal) {
	if (process.platform !== 'win32' && child.pid) {
		try {
			process.kill(-child.pid, signal);
			return;
		} catch (error) {
			if (error?.code !== 'ESRCH') throw error;
			return;
		}
	}
	child.kill(signal);
}

async function stopOwnedPreview(preview) {
	const child = preview?.child ?? preview;
	if (!child) return;
	if (child.exitCode === null) {
		signalOwnedProcessGroup(child, 'SIGTERM');
		const exitedGracefully = await settlesWithin(once(child, 'exit'), 5_000);
		if (!exitedGracefully && child.exitCode === null) {
			signalOwnedProcessGroup(child, 'SIGKILL');
			await settlesWithin(once(child, 'exit'), 2_000);
		}
	}
	child.stdout?.destroy();
	child.stderr?.destroy();
}

async function startOwnedPreview() {
	const buildStartedAtIso = new Date().toISOString();
	execFileSync('rtk', ['bun', 'run', 'build'], {
		cwd: REPO,
		stdio: 'inherit'
	});
	const buildCompletedAtIso = new Date().toISOString();
	const port = await reservePreviewPort();
	BASE_URL = `http://127.0.0.1:${port}/`;
	const previewArguments = [
		'bun',
		'run',
		'preview',
		'--',
		'--host',
		'127.0.0.1',
		'--port',
		String(port),
		'--strictPort'
	];
	const previewStartedAtIso = new Date().toISOString();
	const child = spawn('rtk', previewArguments, {
		cwd: REPO,
		detached: process.platform !== 'win32',
		stdio: ['ignore', 'pipe', 'pipe']
	});
	const stdout = captureBoundedOutput(child.stdout);
	const stderr = captureBoundedOutput(child.stderr);
	const markerName = `.hpa-307-preview-binding-${process.pid}-${Date.now()}.txt`;
	const markerPath = join(REPO, 'dist', markerName);
	const markerContents = `${COMMIT}:${PRODUCTION_SHA256}\n`;
	try {
		const readyDeadline = Date.now() + 30_000;
		let readyAtIso = null;
		while (Date.now() < readyDeadline) {
			if (child.exitCode !== null) {
				throw new Error(`owned preview exited before readiness with code ${child.exitCode}`);
			}
			try {
				const response = await fetch(BASE_URL, {
					cache: 'no-store',
					signal: AbortSignal.timeout(1_000)
				});
				if (response.ok) {
					readyAtIso = new Date().toISOString();
					break;
				}
			} catch {
				// The owned server is still starting. The loop is bounded by readyDeadline.
			}
			await delay(100);
		}
		if (readyAtIso === null) {
			throw new Error('owned preview did not become ready within 30000 ms');
		}

		await writeFile(markerPath, markerContents);
		const markerResponse = await fetch(new URL(markerName, BASE_URL), {
			cache: 'no-store',
			signal: AbortSignal.timeout(10_000)
		});
		if (!markerResponse.ok) {
			throw new Error(`preview binding probe returned HTTP ${markerResponse.status}`);
		}
		const servedContents = await markerResponse.text();
		if (servedContents !== markerContents) {
			throw new Error('preview binding probe did not return the current dist marker');
		}

		const assetUrl = new URL(ASSET_PATH, BASE_URL);
		const assetResponse = await fetch(assetUrl, {
			cache: 'no-store',
			signal: AbortSignal.timeout(30_000)
		});
		if (!assetResponse.ok) {
			throw new Error(`served production asset returned HTTP ${assetResponse.status}`);
		}
		const servedAsset = Buffer.from(await assetResponse.arrayBuffer());
		const servedAssetSha256 = createHash('sha256').update(servedAsset).digest('hex');
		if (
			servedAsset.byteLength !== PRODUCTION_ASSET.byteLength ||
			servedAssetSha256 !== PRODUCTION_SHA256
		) {
			throw new Error(
				`served production asset drift: ${servedAsset.byteLength} bytes, SHA-256 ${servedAssetSha256}`
			);
		}

		return {
			child,
			provenance: {
				sourceCommit: COMMIT,
				productTreeCleanOutsideEvidence: true,
				build: {
					command: 'rtk bun run build',
					startedAtIso: buildStartedAtIso,
					completedAtIso: buildCompletedAtIso,
					exitCode: 0
				},
				preview: {
					command: `rtk ${previewArguments.join(' ')}`,
					ownedByRunner: true,
					pid: child.pid,
					baseUrl: BASE_URL,
					startedAtIso: previewStartedAtIso,
					readyAtIso,
					markerVerified: true
				},
				servedProductionAsset: {
					url: assetUrl.href,
					bytes: servedAsset.byteLength,
					sha256: servedAssetSha256,
					matchesLocalProductionAsset: true
				}
			}
		};
	} catch (error) {
		await stopOwnedPreview(child);
		throw new Error(
			`${error instanceof Error ? error.message : error}\nowned preview stdout:\n${stdout()}\nowned preview stderr:\n${stderr()}`,
			{ cause: error }
		);
	} finally {
		await unlink(markerPath).catch(() => {});
	}
}

function point(state) {
	return {
		mapId: state.mapId,
		x: state.x,
		y: state.y,
		facing: state.facing
	};
}

function pointsEqual(left, right) {
	return (
		left.mapId === right.mapId &&
		left.x === right.x &&
		left.y === right.y &&
		left.facing === right.facing
	);
}

function summarizeFrames(samples) {
	const sorted = [...samples].sort((left, right) => left - right);
	if (sorted.length === 0) {
		throw new Error('requestAnimationFrame sampler produced no route samples');
	}
	const middle = Math.floor(sorted.length / 2);
	const median =
		sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
	const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
	return {
		count: sorted.length,
		medianMs: median,
		p95Ms: p95,
		minMs: sorted[0],
		maxMs: sorted.at(-1)
	};
}

async function installProbe(context) {
	await context.addInitScript(
		({ diagnosticEvent, width, height }) => {
			const probe = {
				diagnostics: [],
				contextLossCount: 0,
				texImage2DCalls: [],
				raf: {
					active: false,
					lastTimestamp: null,
					samples: []
				}
			};
			window.__hpa307Probe = probe;

			window.addEventListener(diagnosticEvent, (event) => {
				probe.diagnostics.push({
					receivedAtMs: performance.now(),
					detail: event.detail
				});
			});
			document.addEventListener(
				'webglcontextlost',
				() => {
					probe.contextLossCount += 1;
				},
				true
			);

			const prototypes = [
				globalThis.WebGLRenderingContext?.prototype,
				globalThis.WebGL2RenderingContext?.prototype
			].filter(Boolean);
			const originals = prototypes.map((prototype) => prototype.texImage2D);
			for (let index = 0; index < prototypes.length; index += 1) {
				const prototype = prototypes[index];
				const original = originals[index];
				if (typeof original !== 'function') continue;
				prototype.texImage2D = function (...args) {
					let sourceWidth = null;
					let sourceHeight = null;
					for (let argIndex = args.length - 1; argIndex >= 0; argIndex -= 1) {
						const candidate = args[argIndex];
						if (
							candidate &&
							typeof candidate === 'object' &&
							typeof candidate.width === 'number' &&
							typeof candidate.height === 'number'
						) {
							sourceWidth = candidate.width;
							sourceHeight = candidate.height;
							break;
						}
					}
					if (
						sourceWidth === null &&
						args.length >= 9 &&
						typeof args[3] === 'number' &&
						typeof args[4] === 'number'
					) {
						sourceWidth = args[3];
						sourceHeight = args[4];
					}
					if (sourceWidth === width && sourceHeight === height) {
						probe.texImage2DCalls.push({
							atMs: performance.now(),
							context: this instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl',
							argumentCount: args.length,
							width: sourceWidth,
							height: sourceHeight
						});
					}
					return Reflect.apply(original, this, args);
				};
			}

			function sample(timestamp) {
				if (probe.raf.active) {
					if (probe.raf.lastTimestamp !== null) {
						probe.raf.samples.push(timestamp - probe.raf.lastTimestamp);
					}
					probe.raf.lastTimestamp = timestamp;
				} else {
					probe.raf.lastTimestamp = null;
				}
				requestAnimationFrame(sample);
			}
			requestAnimationFrame(sample);
		},
		{
			diagnosticEvent: 'gliese:regional-background-renderer-diagnostic',
			width: 1792,
			height: 1536
		}
	);
}

async function waitForReady(page) {
	await page.locator('canvas').waitFor({ state: 'visible', timeout: 30_000 });
	await page.getByRole('button', { name: 'Menu' }).waitFor({ state: 'visible', timeout: 30_000 });
	await page.locator('canvas').click({ position: { x: 320, y: 180 } });
	await page.waitForTimeout(150);
}

async function createSession(browser, name, query = '', { abortRegionalAsset = false } = {}) {
	const context = await browser.newContext({
		viewport: VIEWPORT,
		deviceScaleFactor: 1
	});
	await installProbe(context);
	const page = await context.newPage();
	const requests = [];
	const pageErrors = [];
	const consoleErrors = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.pathname === ASSET_PATH) {
			requests.push({
				url: request.url(),
				method: request.method(),
				resourceType: request.resourceType(),
				atIso: new Date().toISOString()
			});
		}
	});
	page.on('pageerror', (error) => pageErrors.push(error.message));
	page.on('console', (message) => {
		if (message.type() === 'error' || message.type() === 'warning') {
			consoleErrors.push({
				type: message.type(),
				text: message.text()
			});
		}
	});
	if (abortRegionalAsset) {
		await page.route(`**${ASSET_PATH}`, (route) => route.abort('failed'));
	}
	await page.goto(`${BASE_URL}${query}`, { waitUntil: 'domcontentloaded' });
	await waitForReady(page);
	await page.bringToFront();
	return {
		name,
		context,
		page,
		requests,
		pageErrors,
		consoleErrors
	};
}

function createRun(session) {
	return {
		name: session.name,
		session,
		startedAtIso: new Date().toISOString(),
		states: [],
		bursts: [],
		legs: [],
		snags: [],
		checkpoints: [],
		interiorRoundTrips: [],
		captureInteriors: false,
		last: null
	};
}

async function captureScreenshot(run, name) {
	const screenshotPath = join(OUTPUT_DIR, name);
	await run.session.page.screenshot({ path: screenshotPath });
	return `${EVIDENCE_PATH_PREFIX}img/hpa-307/${name}`;
}

async function readSave(run, label) {
	const state = await run.session.page.evaluate(({ saveKey }) => {
		window.dispatchEvent(
			new CustomEvent('gliese:hud-command', {
				detail: { type: 'save' }
			})
		);
		const encoded = localStorage.getItem(saveKey);
		if (!encoded) {
			throw new Error(`${saveKey} was not written after the save command`);
		}
		const save = JSON.parse(encoded);
		return {
			mapId: save.mapId,
			x: save.player.x,
			y: save.player.y,
			facing: save.player.facing,
			collectedPickupIds: [...save.flags.collectedPickups]
		};
	}, { saveKey: SAVE_KEY });
	const entry = {
		index: run.states.length,
		label,
		atIso: new Date().toISOString(),
		...state
	};
	run.states.push(entry);
	run.last = entry;
	return entry;
}

async function performBurst(run, key, durationMs, label) {
	const page = run.session.page;
	const before = run.last ?? (await readSave(run, `${label}:before`));
	await page.keyboard.down(key);
	try {
		await page.waitForTimeout(durationMs);
	} finally {
		await page.keyboard.up(key);
	}
	await page.waitForTimeout(50);
	const after = await readSave(run, `${label}:after`);
	const noProgress =
		before.mapId === after.mapId && before.x === after.x && before.y === after.y;
	const burst = {
		index: run.bursts.length,
		label,
		key,
		durationMs,
		before: point(before),
		after: point(after),
		delta: {
			x: after.x - before.x,
			y: after.y - before.y
		},
		mapChanged: before.mapId !== after.mapId,
		noProgress
	};
	run.bursts.push(burst);
	if (noProgress) {
		const snag = {
			burstIndex: burst.index,
			label,
			key,
			durationMs,
			state: point(after)
		};
		run.snags.push(snag);
		console.log(`SNAG ${JSON.stringify(snag)}`);
	}
	return burst;
}

async function moveTo(
	run,
	label,
	target,
	{ axes = ['x', 'y'], tolerance = 9, expectedMap = 'meadow-entry' } = {}
) {
	const start = run.last ?? (await readSave(run, `${label}:start`));
	const leg = {
		label,
		target: { ...target, mapId: expectedMap },
		start: point(start),
		firstBurstIndex: run.bursts.length,
		end: null,
		lastBurstIndex: null
	};
	for (const axis of axes) {
		let noProgressRecoveryUsed = false;
		let lastDirection = 0;
		let alternatingCount = 0;
		for (let attempt = 0; attempt < 120; attempt += 1) {
			const current = run.last;
			if (current.mapId !== expectedMap) {
				throw new Error(
					`${label}: expected map ${expectedMap}, found ${current.mapId} at ${current.x},${current.y}`
				);
			}
			const difference = target[axis] - current[axis];
			if (Math.abs(difference) <= tolerance) break;
			const key =
				axis === 'x'
					? difference > 0
						? 'ArrowRight'
						: 'ArrowLeft'
					: difference > 0
						? 'ArrowDown'
						: 'ArrowUp';
			const durationMs = Math.min(
				160,
				Math.max(60, Math.ceil((Math.max(0, Math.abs(difference) - tolerance) / 240) * 1000))
			);
			const direction = difference > 0 ? 1 : -1;
			const burst = await performBurst(run, key, durationMs, label);
			if (burst.mapChanged) {
				throw new Error(
					`${label}: unexpected transition ${burst.before.mapId} -> ${burst.after.mapId} at ${burst.after.x},${burst.after.y}`
				);
			}
			if (burst.noProgress) {
				if (!noProgressRecoveryUsed) {
					noProgressRecoveryUsed = true;
					await run.session.page.locator('canvas').click({ position: { x: 320, y: 180 } });
					await run.session.page.waitForTimeout(100);
					continue;
				}
				throw new Error(
					`${label}: no progress at ${burst.after.mapId} ${burst.after.x},${burst.after.y}`
				);
			}
			const postDifference = target[axis] - (run.last?.[axis] ?? current[axis]);
			if (Math.abs(postDifference) <= tolerance) break;
			if (lastDirection !== 0 && direction !== lastDirection) {
				alternatingCount += 1;
				if (alternatingCount >= 3) {
					const snag = {
						burstIndex: burst.index,
						label,
						key,
						durationMs,
						state: point(burst.after),
						kind: 'thrashing',
						axis,
						alternatingCount
					};
					run.snags.push(snag);
					console.log(`SNAG ${JSON.stringify(snag)}`);
					break;
				}
			} else {
				alternatingCount = 0;
			}
			lastDirection = direction;
		}
	}
	const end = run.last;
	if (
		end.mapId !== expectedMap ||
		axes.some((axis) => Math.abs(end[axis] - target[axis]) > tolerance)
	) {
		throw new Error(
			`${label}: ended at ${end.mapId} ${end.x},${end.y}; target ${expectedMap} ${target.x},${target.y}`
		);
	}
	leg.end = point(end);
	leg.lastBurstIndex = run.bursts.length - 1;
	run.legs.push(leg);
	console.log(`LEG ${label} -> ${end.mapId} (${end.x.toFixed(2)}, ${end.y.toFixed(2)})`);
	return end;
}

async function moveUntilMap(run, label, key, fromMap, toMap) {
	const start = run.last ?? (await readSave(run, `${label}:start`));
	if (start.mapId !== fromMap) {
		throw new Error(`${label}: expected to start in ${fromMap}, found ${start.mapId}`);
	}
	for (let attempt = 0; attempt < 30; attempt += 1) {
		const burst = await performBurst(run, key, 60, label);
		if (burst.after.mapId === toMap) {
			console.log(
				`TRANSITION ${label}: ${fromMap} -> ${toMap} at (${burst.after.x.toFixed(2)}, ${burst.after.y.toFixed(2)})`
			);
			return run.last;
		}
		if (burst.after.mapId !== fromMap) {
			throw new Error(`${label}: transitioned to unexpected map ${burst.after.mapId}`);
		}
		if (burst.noProgress) {
			if (attempt === 0) {
				await run.session.page.locator('canvas').click({ position: { x: 320, y: 180 } });
				await run.session.page.waitForTimeout(100);
				continue;
			}
			throw new Error(
				`${label}: no progress at ${burst.after.mapId} ${burst.after.x},${burst.after.y}`
			);
		}
	}
	throw new Error(`${label}: did not transition ${fromMap} -> ${toMap} within bounded bursts`);
}

async function roundTrip(run, interiorMapId, entryDirection) {
	const before = point(run.last);
	const keyByDirection = {
		up: 'ArrowUp',
		down: 'ArrowDown',
		left: 'ArrowLeft',
		right: 'ArrowRight'
	};
	const entered = await moveUntilMap(
		run,
		`${interiorMapId}:enter`,
		keyByDirection[entryDirection],
		'meadow-entry',
		interiorMapId
	);
	let screenshotPath = null;
	if (run.captureInteriors) {
		screenshotPath = await captureScreenshot(run, `runtime-interior-${interiorMapId}.png`);
	}
	const exited = await moveUntilMap(
		run,
		`${interiorMapId}:exit`,
		'ArrowDown',
		interiorMapId,
		'meadow-entry'
	);
	run.interiorRoundTrips.push({
		interiorMapId,
		before,
		entered: point(entered),
		exited: point(exited),
		screenshotPath
	});
}

async function checkpoint(run, name) {
	const page = run.session.page;
	const before = await readSave(run, `checkpoint:${name}:pre`);
	const screenshotPath = await captureScreenshot(run, `runtime-save-reload-${name}.png`);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForReady(page);
	await page.getByRole('button', { name: 'Menu' }).click();
	await page
		.getByRole('region', { name: 'Command' })
		.getByRole('button', { name: 'Resume Save' })
		.click();
	await page.waitForTimeout(200);
	await page.locator('canvas').click({ position: { x: 320, y: 180 } });
	const after = await readSave(run, `checkpoint:${name}:post`);
	const exact = pointsEqual(before, after);
	const result = {
		name,
		screenshotPath,
		before: point(before),
		after: point(after),
		exact
	};
	run.checkpoints.push(result);
	console.log(`CHECKPOINT ${name}: exact=${exact} ${JSON.stringify(point(after))}`);
	if (!exact) {
		throw new Error(`checkpoint ${name} changed state across Menu -> Resume Save`);
	}
}

async function runAuthoredRoute(run, { checkpoints = false, captures = false } = {}) {
	run.captureInteriors = captures;
	const initial = await readSave(run, 'route:spawn');
	if (
		initial.mapId !== 'meadow-entry' ||
		Math.abs(initial.x - 624) > 0.001 ||
		Math.abs(initial.y - 5776) > 0.001
	) {
		throw new Error(`route did not start at meadow-entry 624,5776: ${JSON.stringify(point(initial))}`);
	}
	if (captures) await captureScreenshot(run, 'runtime-district-home-yard.png');
	if (checkpoints) await checkpoint(run, 'home');

	await moveTo(run, 'Home Yard east lane', { x: 960, y: 5776 }, { axes: ['x'] });
	await moveTo(run, 'H-P gate south', { x: 960, y: 5435 }, { axes: ['y'] });
	await moveTo(run, 'Well Plaza checkpoint', { x: 942, y: 5300 }, { axes: ['y', 'x'] });
	if (captures) await captureScreenshot(run, 'runtime-district-well-plaza.png');
	if (checkpoints) await checkpoint(run, 'plaza');

	await moveTo(run, 'M-P gate plaza side', { x: 912, y: 5115 }, { axes: ['y', 'x'] });
	await moveTo(run, 'Market reward', { x: 784, y: 5040 }, { axes: ['x', 'y'] });
	if (captures) {
		await captureScreenshot(run, 'runtime-district-market-blacksmith.png');
		await captureScreenshot(run, 'runtime-reward-market.png');
	}
	await moveTo(run, 'Item shop east aisle', { x: 680, y: 5040 }, { axes: ['x'] });
	await moveTo(run, 'Item shop south-east', { x: 680, y: 5338 }, { axes: ['y'] });
	await moveTo(run, 'Item shop doorstep', { x: 496, y: 5338 }, { axes: ['x'] });
	await roundTrip(run, 'item-shop', 'up');

	await moveTo(run, 'H-M gate west', { x: 460, y: 5450 }, { axes: ['x', 'y'] });
	await moveTo(run, 'Hero house west bypass', { x: 460, y: 5752 }, { axes: ['y'] });
	await moveTo(run, 'Hero house doorstep', { x: 624, y: 5752 }, { axes: ['x'] });
	await roundTrip(run, 'hero-house', 'up');

	await moveTo(run, 'H-S west approach', { x: 900, y: 5752 }, { axes: ['x'] });
	await moveTo(run, 'H-S west gate', { x: 900, y: 5600 }, { axes: ['y'] });
	await moveTo(run, 'H-S east gate', { x: 1100, y: 5600 }, { axes: ['x'] });
	await moveTo(run, 'Shrine south-west lane', { x: 1100, y: 5788 }, { axes: ['y'] });
	await moveTo(run, 'Shrine reward', { x: 1584, y: 5776 }, { axes: ['x', 'y'] });
	if (captures) await captureScreenshot(run, 'runtime-reward-shrine.png');
	await moveTo(run, 'Shrine Garden checkpoint', { x: 1464, y: 5788 }, { axes: ['x', 'y'] });
	if (captures) await captureScreenshot(run, 'runtime-district-shrine-garden.png');
	if (checkpoints) await checkpoint(run, 'shrine');
	await moveTo(run, 'Shrine doorstep', { x: 1424, y: 5788 }, { axes: ['x'] });
	await roundTrip(run, 'shrine-of-aurora-interior', 'up');

	await moveTo(run, 'Shrine west bypass', { x: 1248, y: 5788 }, { axes: ['x'] });
	await moveTo(run, 'P-S gate south', { x: 1248, y: 5435 }, { axes: ['y'] });
	await moveTo(run, 'P-S gate north', { x: 1248, y: 5320 }, { axes: ['y'] });
	await moveTo(run, 'Well west south', { x: 1000, y: 5320 }, { axes: ['x'] });
	await moveTo(run, 'Well west north', { x: 1000, y: 5050 }, { axes: ['y'] });
	await moveTo(run, 'N-P gate south', { x: 1120, y: 5050 }, { axes: ['x'] });
	await moveTo(run, 'North Residences lane', { x: 1120, y: 4920 }, { axes: ['y'] });

	await moveTo(run, 'Villager house 2 doorstep', { x: 1168, y: 4920 }, { axes: ['x'] });
	await roundTrip(run, 'villager-house-2', 'up');
	await moveTo(run, 'Villager house 3 east return', { x: 856, y: 4920 }, { axes: ['x'] });
	await roundTrip(run, 'villager-house-3', 'left');
	// The house-3 return is east of its door in a narrow lane. Dip to the lane's
	// south edge before crossing west so the 18px doorway trigger is not re-entered.
	await moveTo(
		run,
		'Villager house 3 south bypass',
		{ x: 856, y: 4946 },
		{ axes: ['y'], tolerance: 1 }
	);
	await moveTo(run, 'Villager house 3 west bypass', { x: 760, y: 4946 }, { axes: ['x'] });
	await moveTo(run, 'Villager house 1 lane', { x: 528, y: 4920 }, { axes: ['y', 'x'] });
	await moveTo(run, 'Villager house 1 doorstep', { x: 528, y: 4888 }, { axes: ['y'] });
	await roundTrip(run, 'villager-house-1', 'up');

	await moveTo(
		run,
		'North lane after house 1',
		{ x: 528, y: 4946 },
		{ axes: ['y'], tolerance: 1 }
	);
	await moveTo(run, 'Villager house 3 east bypass', { x: 880, y: 4946 }, { axes: ['x'] });
	await moveTo(
		run,
		'G-N gate lane',
		{ x: 880, y: 4920 },
		{ axes: ['y'], tolerance: 1 }
	);
	await moveTo(
		run,
		'G-N gate east',
		{ x: 1440, y: 4920 },
		// A 1 px horizontal tolerance is narrower than the minimum 60 ms
		// movement burst, so frame-aligned runs can oscillate around x=1440.
		// The ordinary 9 px waypoint tolerance remains well inside this
		// source-authored gate and makes the bounded controller convergent.
		{ axes: ['x'], tolerance: 9 }
	);
	if (captures) await captureScreenshot(run, 'runtime-district-north-guild.png');
	await moveTo(run, 'Guild west approach', { x: 1440, y: 5040 }, { axes: ['y'] });
	await roundTrip(run, 'guild-hall', 'right');

	await moveTo(run, 'Guild ward east lane', { x: 1840, y: 5040 }, { axes: ['x'] });
	await moveTo(run, 'East Gate checkpoint', { x: 1840, y: 4600 }, { axes: ['y'] });
	if (captures) await captureScreenshot(run, 'runtime-district-east-gate.png');
	if (checkpoints) await checkpoint(run, 'east-gate');
	// corridor-wall-2b spans padded x=1678..1872, y=4466..4554. Take the
	// source-authored C throat to its west, which also stays west of wall-3a.
	await moveTo(run, 'East Gate to C throat', { x: 1600, y: 4600 }, { axes: ['x'] });
	await moveTo(run, 'Crossroads north handoff', { x: 1600, y: 4320 }, { axes: ['y'] });
	if (captures) await captureScreenshot(run, 'runtime-handoff-north-crossroads.png');
	await moveTo(run, 'Return to village E room', { x: 1600, y: 4480 }, { axes: ['y'] });
	await moveTo(run, 'Return below corridor wall', { x: 1600, y: 4600 }, { axes: ['y'] });
	await moveTo(run, 'Return to East Gate', { x: 1840, y: 4600 }, { axes: ['x'] });

	const final = await readSave(run, 'route:complete');
	const visited = run.interiorRoundTrips.map((entry) => entry.interiorMapId);
	if (JSON.stringify(visited) !== JSON.stringify(EXPECTED_INTERIORS)) {
		throw new Error(`interior sequence mismatch: ${JSON.stringify(visited)}`);
	}
	for (const pickup of ['village-market-cache', 'village-shrine-cache']) {
		if (!final.collectedPickupIds.includes(pickup)) {
			throw new Error(`route did not collect ${pickup}`);
		}
	}
	return final;
}

async function resumeAt(session, target) {
	const page = session.page;
	await page.evaluate(
		({ saveKey, next }) => {
			window.dispatchEvent(
				new CustomEvent('gliese:hud-command', {
					detail: { type: 'save' }
				})
			);
			const encoded = localStorage.getItem(saveKey);
			if (!encoded) throw new Error(`${saveKey} missing before handoff inspection`);
			const save = JSON.parse(encoded);
			save.mapId = 'meadow-entry';
			save.player.x = next.x;
			save.player.y = next.y;
			save.player.facing = next.facing;
			localStorage.setItem(saveKey, JSON.stringify(save));
		},
		{ saveKey: SAVE_KEY, next: target }
	);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await waitForReady(page);
	await page.getByRole('button', { name: 'Menu' }).click();
	await page
		.getByRole('region', { name: 'Command' })
		.getByRole('button', { name: 'Resume Save' })
		.click();
	await page.waitForTimeout(200);
	await page.locator('canvas').click({ position: { x: 320, y: 180 } });
	const run = createRun(session);
	const state = await readSave(run, `handoff:${target.name}`);
	await captureScreenshot(run, `runtime-handoff-${target.name}.png`);
	return {
		name: target.name,
		requested: { mapId: 'meadow-entry', x: target.x, y: target.y, facing: target.facing },
		observed: point(state),
		screenshot: `runtime-handoff-${target.name}.png`,
		method: 'save-position injection for live seam inspection; not traversal evidence'
	};
}

async function captureCanvasEdgeHandoffs(browser) {
	const session = await createSession(browser, 'canvas-edge-handoffs');
	try {
		const targets = [
			{ name: 'north', x: 1680, y: 4376, facing: 'up' },
			{ name: 'south', x: 960, y: 5864, facing: 'down' },
			{ name: 'west', x: 280, y: 5200, facing: 'left' },
			{ name: 'east', x: 2024, y: 5200, facing: 'right' }
		];
		const inspections = [];
		for (const target of targets) inspections.push(await resumeAt(session, target));
		const evidence = {
			capturedAtIso: new Date().toISOString(),
			commit: COMMIT,
			productionSha256: PRODUCTION_SHA256,
			viewport: VIEWPORT,
			inspections
		};
		await writeFile(
			join(OUTPUT_DIR, 'runtime-handoff-inspection.json'),
			`${JSON.stringify(evidence, null, 2)}\n`
		);
		return evidence;
	} finally {
		await session.context.close();
	}
}

async function beginRouteSampling(page) {
	let timeout;
	try {
		await Promise.race([
			page.evaluate(async ({ warmupFrames }) => {
				window.__hpa307Probe.raf.active = false;
				window.__hpa307Probe.raf.samples = [];
				window.__hpa307Probe.raf.lastTimestamp = null;
				await new Promise((resolve) => {
					let frames = 0;
					function warm() {
						frames += 1;
						if (frames >= warmupFrames) {
							resolve();
							return;
						}
						requestAnimationFrame(warm);
					}
					requestAnimationFrame(warm);
				});
				window.__hpa307Probe.raf.samples = [];
				window.__hpa307Probe.raf.lastTimestamp = null;
				window.__hpa307Probe.raf.active = true;
			}, { warmupFrames: WARMUP_FRAMES }),
			new Promise((_, reject) => {
				timeout = setTimeout(
					() => reject(new Error(`requestAnimationFrame warm-up exceeded ${WARMUP_TIMEOUT_MS} ms`)),
					WARMUP_TIMEOUT_MS
				);
			})
		]);
	} finally {
		clearTimeout(timeout);
	}
}

async function stopRouteSampling(page) {
	return page.evaluate(() => {
		window.__hpa307Probe.raf.active = false;
		return [...window.__hpa307Probe.raf.samples];
	});
}

async function collectProbe(session) {
	const probe = await session.page.evaluate(() => ({
		diagnostics: window.__hpa307Probe.diagnostics,
		contextLossCount: window.__hpa307Probe.contextLossCount,
		texImage2DCalls: window.__hpa307Probe.texImage2DCalls
	}));
	return {
		exactRegionalRequests: session.requests,
		exactRegionalRequestCount: session.requests.length,
		...probe,
		pageErrors: session.pageErrors,
		consoleErrors: session.consoleErrors
	};
}

async function captureRendererModes(browser) {
	const records = [];
	for (const descriptor of RENDERER_SIDECARS) {
		const session = await createSession(browser, `mode-${descriptor.mode}`, descriptor.query, {
			abortRegionalAsset: descriptor.abortAsset === true
		});
		try {
			await session.page.waitForFunction(
				() => window.__hpa307Probe.diagnostics.length > 0,
				undefined,
				{ timeout: 10_000 }
			);
			const run = createRun(session);
			const screenshotPath = await captureScreenshot(run, descriptor.screenshotName);
			const screenshot = await readFile(join(OUTPUT_DIR, descriptor.screenshotName));
			const probe = await collectProbe(session);
			if (probe.diagnostics.length !== 1) {
				throw new Error(
					`${descriptor.mode} retained ${probe.diagnostics.length} renderer diagnostics; expected 1`
				);
			}
			const diagnostic = probe.diagnostics[0].detail;
			if (
				!['webgl', 'canvas'].includes(diagnostic.renderer) ||
				!(
					diagnostic.maxTextureSize === null ||
					(Number.isFinite(diagnostic.maxTextureSize) && diagnostic.maxTextureSize > 0)
				) ||
				!(
					diagnostic.regionalBackgroundLoadMs === null ||
					(Number.isFinite(diagnostic.regionalBackgroundLoadMs) &&
						diagnostic.regionalBackgroundLoadMs >= 0)
				) ||
				diagnostic.regionalBackgroundLoadCompletions !== descriptor.expectedCompletions
			) {
				throw new Error(`invalid renderer diagnostic in ${descriptor.sidecarName}`);
			}
			const requestCountIsValid =
				descriptor.abortAsset === true
					? probe.exactRegionalRequestCount >= 1
					: probe.exactRegionalRequestCount === 1;
			if (!requestCountIsValid || probe.pageErrors.length > 0) {
				throw new Error(
					`${descriptor.mode} observed ${probe.exactRegionalRequestCount} exact requests and ${probe.pageErrors.length} page errors`
				);
			}
			const record = {
				schemaVersion: 1,
				capturedAtIso: new Date().toISOString(),
				commit: COMMIT,
				sourceBinding: SOURCE_BINDING,
				environment: {
					browser: `Chromium ${browser.version()}`,
					headed: true,
					viewport: VIEWPORT
				},
				mode: descriptor.mode,
				query: descriptor.query,
				url: `${BASE_URL}${descriptor.query}`,
				productionAsset: {
					path: 'public/game/assets/regions/sundrop-village-background.png',
					bytes: PRODUCTION_ASSET.byteLength,
					sha256: PRODUCTION_SHA256
				},
				screenshot: {
					path: screenshotPath,
					bytes: screenshot.byteLength,
					sha256: createHash('sha256').update(screenshot).digest('hex')
				},
				assetInterception:
					descriptor.abortAsset === true
						? { exactPath: ASSET_PATH, action: "route.abort('failed')" }
						: null,
				probe
			};
			const sidecarContents = Buffer.from(`${JSON.stringify(record, null, 2)}\n`);
			await writeFile(join(OUTPUT_DIR, descriptor.sidecarName), sidecarContents);
			records.push({
				mode: descriptor.mode,
				query: descriptor.query,
				capturedAtIso: record.capturedAtIso,
				sidecar: {
					path: `${EVIDENCE_PATH_PREFIX}img/hpa-307/${descriptor.sidecarName}`,
					bytes: sidecarContents.byteLength,
					sha256: createHash('sha256').update(sidecarContents).digest('hex')
				},
				screenshot: record.screenshot
			});
		} finally {
			await session.context.close();
		}
	}
	return records;
}

function serializableRun(run) {
	return {
		name: run.name,
		startedAtIso: run.startedAtIso,
		completedAtIso: new Date().toISOString(),
		states: run.states,
		bursts: run.bursts,
		legs: run.legs,
		snags: run.snags,
		checkpoints: run.checkpoints,
		interiorRoundTrips: run.interiorRoundTrips,
		final: point(run.last)
	};
}

async function runRouteOnly(browser) {
	const session = await createSession(browser, 'route-smoke');
	const run = createRun(session);
	try {
		await runAuthoredRoute(run);
		const result = {
			sourceBinding: SOURCE_BINDING,
			environment: {
				browser: `Chromium ${browser.version()}`,
				headed: true,
				viewport: VIEWPORT
			},
			route: serializableRun(run),
			probe: await collectProbe(session)
		};
		await writeFile(TEMP_RESULT, `${JSON.stringify(result, null, 2)}\n`);
		console.log(`ROUTE COMPLETE ${TEMP_RESULT}`);
		return result;
	} finally {
		await session.context.close();
	}
}

async function runFull(browser) {
	await mkdir(OUTPUT_DIR, { recursive: true });
	const rendererModeSidecars = await captureRendererModes(browser);

	const acceptanceSession = await createSession(browser, 'acceptance-enabled');
	const acceptanceRun = createRun(acceptanceSession);
	let acceptance;
	try {
		await runAuthoredRoute(acceptanceRun, { checkpoints: true, captures: true });
		acceptance = {
			route: serializableRun(acceptanceRun),
			probeAcrossReloads: await collectProbe(acceptanceSession)
		};
	} finally {
		await acceptanceSession.context.close();
	}
	const handoffs = await captureCanvasEdgeHandoffs(browser);

	const enabledSession = await createSession(browser, 'timing-enabled');
	const enabledRun = createRun(enabledSession);
	let enabled;
	try {
		await beginRouteSampling(enabledSession.page);
		await runAuthoredRoute(enabledRun);
		const samples = await stopRouteSampling(enabledSession.page);
		enabled = {
			mode: 'enabled',
			url: BASE_URL,
			warmupFrames: WARMUP_FRAMES,
			route: serializableRun(enabledRun),
			samples,
			stats: summarizeFrames(samples),
			probe: await collectProbe(enabledSession)
		};
	} finally {
		await enabledSession.context.close();
	}

	const offSession = await createSession(browser, 'timing-off', '?regionalBackground=off');
	const offRun = createRun(offSession);
	let off;
	try {
		await beginRouteSampling(offSession.page);
		await runAuthoredRoute(offRun);
		const samples = await stopRouteSampling(offSession.page);
		const enabledLegLabels = enabledRun.legs.map((leg) => leg.label);
		const offLegLabels = offRun.legs.map((leg) => leg.label);
		if (JSON.stringify(offLegLabels) !== JSON.stringify(enabledLegLabels)) {
			throw new Error('off route did not execute the identical ordered waypoint schedule');
		}
		off = {
			mode: 'off',
			url: `${BASE_URL}?regionalBackground=off`,
			warmupFrames: WARMUP_FRAMES,
			scheduleSource:
				'identical ordered source-derived waypoint schedule and bounded save-readback controller; burst durations adapt deterministically to each authoritative saved position',
			route: serializableRun(offRun),
			samples,
			stats: summarizeFrames(samples),
			probe: await collectProbe(offSession)
		};
	} finally {
		await offSession.context.close();
	}

	const summary = {
		capturedAtIso: new Date().toISOString(),
		commit: COMMIT,
		sourceBinding: SOURCE_BINDING,
		productionAsset: {
			path: 'public/game/assets/regions/sundrop-village-background.png',
			sha256: PRODUCTION_SHA256,
			bytes: PRODUCTION_ASSET.byteLength
		},
		environment: {
			os: 'macOS reference device',
			browser: `Chromium ${browser.version()}`,
			headed: true,
			viewport: VIEWPORT
		},
		controller: {
			path: 'docs/superpowers/reports/hpa-307-browser-acceptance.mjs',
			input: 'bounded held-arrow-key bursts',
			readback: `${SAVE_KEY} after gliese:hud-command {type: "save"}`,
			crossroadsTarget: 'north Crossroads throat through E-C at x=1600 to y=4320, then return'
		},
		rendererModeSidecars,
		acceptance,
		handoffs,
		timing: {
			enabled: {
				stats: enabled.stats,
				rawArtifact: 'runtime-timing-enabled.json'
			},
			off: {
				stats: off.stats,
				rawArtifact: 'runtime-timing-off.json'
			},
			p95DeltaMs: enabled.stats.p95Ms - off.stats.p95Ms,
			gateMs: 2,
			passes: enabled.stats.p95Ms - off.stats.p95Ms <= 2
		},
		continuousRouteLoadUploadEvidence: enabled.probe
	};

	await writeFile(
		join(OUTPUT_DIR, 'runtime-route-acceptance.json'),
		`${JSON.stringify(acceptance, null, 2)}\n`
	);
	await writeFile(
		join(OUTPUT_DIR, 'runtime-timing-enabled.json'),
		`${JSON.stringify(enabled, null, 2)}\n`
	);
	await writeFile(
		join(OUTPUT_DIR, 'runtime-timing-off.json'),
		`${JSON.stringify(off, null, 2)}\n`
	);
	await writeFile(
		join(OUTPUT_DIR, 'runtime-browser-acceptance-summary.json'),
		`${JSON.stringify(summary, null, 2)}\n`
	);
	console.log(`FULL COMPLETE ${join(OUTPUT_DIR, 'runtime-browser-acceptance-summary.json')}`);
	return summary;
}

const OWNED_PREVIEW = await startOwnedPreview();
const SOURCE_BINDING = OWNED_PREVIEW.provenance;
let browser;
try {
	browser = await chromium.launch({
		headless: false,
		args: [
			'--disable-background-timer-throttling',
			'--disable-backgrounding-occluded-windows',
			'--disable-renderer-backgrounding'
		]
	});
	if (PHASE === 'route') {
		await runRouteOnly(browser);
	} else if (PHASE === 'full') {
		await runFull(browser);
	} else {
		throw new Error(`unknown phase ${PHASE}; expected route or full`);
	}
} finally {
	await browser?.close();
	await stopOwnedPreview(OWNED_PREVIEW);
}

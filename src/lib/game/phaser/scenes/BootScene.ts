import * as Phaser from 'phaser';
import {
	animationPackAsset,
	battleBackgroundAssets,
	coastDressingAsset,
	crossroadsDressingAsset,
	environmentDressingAsset,
	fenceDressingAsset,
	forestDressingAsset,
	interiorPropAsset,
	marshDressingAsset,
	npcPackAsset,
	regionalBackgroundAssets,
	shrineDressingAsset,
	starterPackAsset,
	terrainTilesAsset,
	villageBuildingAsset,
	villageDressingAsset,
	villageHedgeAsset
} from '$lib/game/content/assets';
import { openingMapId } from '$lib/game/content/maps';
import {
	buildRegionalBackgroundRendererDiagnostic,
	emitRegionalBackgroundRendererDiagnostic
} from '$lib/game/phaser/renderer-diagnostics';
import { resolveWorldRenderOptions } from '$lib/game/phaser/world-render-options';
import { WorldScene } from './WorldScene';

export class BootScene extends Phaser.Scene {
	static readonly key = 'boot';

	constructor() {
		super(BootScene.key);
	}

	preload() {
		// Phaser returns a `__MISSING` placeholder texture for failed loads rather
		// than rejecting, so a bad path silently renders the missing-texture box.
		// Log the offending key so production asset failures are diagnosable.
		this.load.on('loaderror', (file: { key?: string; src?: string }) => {
			console.error(
				`[BootScene] asset load failed: key="${file.key ?? 'unknown'}" src="${file.src ?? ''}"`
			);
		});
		// Regional-background diagnostic tracking: collects timing and
		// completion data for regional background image loads during preload.
		// The timing window is bounded by `regionalBackgroundLoadStartedAtMs`
		// (intended to mark when loading began) and the Phaser loader's
		// `complete` event, which records `regionalBackgroundLoadCompletedAtMs`
		// via `performance.now()`. When the start timestamp is unavailable
		// (null), the load duration is reported as null.
		// `completedRegionalBackgroundKeys` counts how many regional background
		// images finished loading. The assembled diagnostic is emitted via
		// `emitRegionalBackgroundRendererDiagnostic` and consumed by the
		// Playwright e2e suite (`installRegionalBackgroundDiagnosticListener`
		// in `tests/e2e/game.e2e.ts`).
		const regionalBackgroundKeys = new Set(
			regionalBackgroundAssets.map((asset) => asset.key as string)
		);
		const completedRegionalBackgroundKeys = new Set<string>();
		let regionalBackgroundLoadStartedAtMs: number | null = null;
		const onFileComplete = (key: string, type: string) => {
			if (type === 'image' && regionalBackgroundKeys.has(key)) {
				completedRegionalBackgroundKeys.add(key);
			}
		};
		this.load.on('filecomplete', onFileComplete);
		this.load.once('complete', () => {
			this.load.off('filecomplete', onFileComplete);
			const regionalBackgroundLoadCompletedAtMs =
				regionalBackgroundLoadStartedAtMs === null ? null : performance.now();
			const renderer = this.game.renderer.type === Phaser.WEBGL ? 'webgl' : 'canvas';
			let maxTextureSize: number | null = null;

			if (renderer === 'webgl') {
				try {
					const gl = (
						this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer & {
							gl: WebGLRenderingContext;
						}
					).gl;
					const queriedLimit = gl.getParameter(gl.MAX_TEXTURE_SIZE);
					maxTextureSize = typeof queriedLimit === 'number' ? queriedLimit : null;
				} catch {
					maxTextureSize = null;
				}
			}

			emitRegionalBackgroundRendererDiagnostic(
				buildRegionalBackgroundRendererDiagnostic({
					renderer,
					maxTextureSize,
					loadStartedAtMs: regionalBackgroundLoadStartedAtMs,
					loadCompletedAtMs: regionalBackgroundLoadCompletedAtMs,
					regionalBackgroundLoadCompletions: completedRegionalBackgroundKeys.size
				})
			);
		});
		this.load.image(starterPackAsset.key, starterPackAsset.path);
		this.load.image(terrainTilesAsset.key, terrainTilesAsset.path);
		this.load.image(animationPackAsset.key, animationPackAsset.path);
		this.load.image(npcPackAsset.key, npcPackAsset.path);
		this.load.image(villageBuildingAsset.key, villageBuildingAsset.path);
		this.load.image(forestDressingAsset.key, forestDressingAsset.path);
		this.load.image(fenceDressingAsset.key, fenceDressingAsset.path);
		this.load.image(interiorPropAsset.key, interiorPropAsset.path);
		this.load.image(environmentDressingAsset.key, environmentDressingAsset.path);
		this.load.image(coastDressingAsset.key, coastDressingAsset.path);
		this.load.image(shrineDressingAsset.key, shrineDressingAsset.path);
		this.load.image(marshDressingAsset.key, marshDressingAsset.path);
		this.load.image(crossroadsDressingAsset.key, crossroadsDressingAsset.path);
		this.load.image(villageDressingAsset.key, villageDressingAsset.path);
		this.load.image(villageHedgeAsset.key, villageHedgeAsset.path);
		for (const asset of Object.values(battleBackgroundAssets)) {
			this.load.image(asset.key, asset.path);
		}
		// Resolve the URL option before queueing so `?regionalBackground=off` skips the
		// 7.6 MB download/decode entirely, not just the draw. The diagnostic completion
		// count then reflects zero regional loads in off-mode.
		const renderOptions = resolveWorldRenderOptions();
		if (renderOptions.regionalBackgrounds) {
			for (const asset of regionalBackgroundAssets) {
				if (regionalBackgroundLoadStartedAtMs === null) {
					// This duration spans from the first regional queue operation through the
					// loader's overall completion callback. It is not isolated network latency
					// and the completion count is loader/decode bookkeeping, not GPU uploads.
					regionalBackgroundLoadStartedAtMs = performance.now();
				}
				this.load.image(asset.key, asset.path);
			}
		}
	}

	create() {
		this.scene.start(WorldScene.key, { mapId: openingMapId });
	}
}

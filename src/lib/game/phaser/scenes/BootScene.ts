import * as Phaser from 'phaser';
import type { GameStartRequest } from '$lib/game/phaser/createGame';
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
	shrineDressingAsset,
	starterPackAsset,
	terrainTilesAsset,
	villageBuildingAsset,
	villageDressingAsset,
	villageHedgeAsset
} from '$lib/game/content/assets';
import { findMap, maps } from '$lib/game/content/maps';
import { GRID_TILESET } from '$lib/game/content/maps/grid/tileset';
import { createNewSaveState } from '$lib/game/save/save-state';
import {
	MAP_BACKGROUND_DEFAULT_SELECTIONS,
	MAP_BACKGROUND_PACKAGE_REGISTRY
} from '$lib/game/content/backgrounds/map-background-registry';
import { selectedMapBackgroundPackagesForPreload } from '$lib/game/content/backgrounds/map-background-package';
import {
	buildRegionalBackgroundRendererDiagnostic,
	emitRegionalBackgroundRendererDiagnostic
} from '$lib/game/phaser/renderer-diagnostics';
import { preloadAudio } from '$lib/game/phaser/audio';
import { resolveWorldRenderOptions } from '$lib/game/phaser/world-render-options';
import { WorldScene } from './WorldScene';

export class BootScene extends Phaser.Scene {
	static readonly key = 'boot';

	private startRequest: GameStartRequest = { reason: 'new', saveState: null };

	constructor() {
		super(BootScene.key);
	}

	init() {
		// createGame passes the start request through the game registry (BootScene
		// auto-starts as the config's first scene, so it cannot receive scene data).
		const request = this.registry?.get('startRequest') as GameStartRequest | undefined;
		if (request?.reason === 'new' || request?.reason === 'resume') {
			this.startRequest = request;
		}
		// `?startMap=<id>` (dev only) drops a fresh run at that map's spawn.
		const startMap = findMap(resolveWorldRenderOptions().startMapId);
		if (startMap) {
			const saveState = createNewSaveState();
			this.startRequest = {
				reason: 'resume',
				saveState: {
					...saveState,
					mapId: startMap.id,
					player: {
						...saveState.player,
						x: startMap.spawn.x,
						y: startMap.spawn.y,
						facing: startMap.spawnDirection
					}
				}
			};
		}
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
		// completion data for selected package image loads during preload.
		// The timing window is bounded by `regionalBackgroundLoadStartedAtMs`
		// (intended to mark when loading began) and the Phaser loader's
		// `complete` event, which records `regionalBackgroundLoadCompletedAtMs`
		// via `performance.now()`. When the start timestamp is unavailable
		// (null), the load duration is reported as null.
		// `completedRegionalBackgroundKeys` records which selected package
		// images finished loading. The assembled diagnostic is emitted via
		// `emitRegionalBackgroundRendererDiagnostic` and consumed by the
		// Playwright e2e suite (`installRegionalBackgroundDiagnosticListener`
		// in `tests/e2e/game.e2e.ts`).
		const renderOptions = resolveWorldRenderOptions();
		const selectedPackages = selectedMapBackgroundPackagesForPreload(
			MAP_BACKGROUND_PACKAGE_REGISTRY,
			Object.values(maps).map((map) => ({
				mapId: map.id,
				regionalBackgrounds: renderOptions.regionalBackgrounds,
				reviewPackageIds: renderOptions.mapBackgroundReviewIds,
				defaultSelection: MAP_BACKGROUND_DEFAULT_SELECTIONS[map.id] ?? null
			}))
		);
		const selectedPackageIds = selectedPackages.map(({ id }) => id);
		const regionalBackgroundAssets = [
			...new Map(
				selectedPackages.flatMap(({ assets }) => assets.map((asset) => [asset.key, asset]))
			).values()
		];
		const regionalBackgroundKeys = new Set(regionalBackgroundAssets.map(({ key }) => key));
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
					packageIds: selectedPackageIds,
					requiredAssetKeys: regionalBackgroundAssets.map(({ key }) => key),
					completedAssetKeys: [...completedRegionalBackgroundKeys],
					maxTextureSize,
					loadStartedAtMs: regionalBackgroundLoadStartedAtMs,
					loadCompletedAtMs: regionalBackgroundLoadCompletedAtMs
				})
			);
		});
		this.load.image(starterPackAsset.key, starterPackAsset.path);
		this.load.image(terrainTilesAsset.key, terrainTilesAsset.path);
		this.load.image(GRID_TILESET.key, GRID_TILESET.path);
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
		preloadAudio(this.load);
		for (const asset of Object.values(battleBackgroundAssets)) {
			this.load.image(asset.key, asset.path);
		}
		if (regionalBackgroundAssets.length > 0) {
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
		this.scene.start(WorldScene.key, this.startRequest);
	}
}

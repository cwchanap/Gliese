import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import {
	actorAnimationAssets,
	actorAnimationIds,
	animationPackAsset,
	battleBackgroundAssets,
	environmentDressingAsset,
	getActorAnimationAsset,
	getBattleBackgroundAsset,
	getBattleEnvironmentId,
	getEnemyActorId,
	getEnemyPlateArtPath,
	interiorPropAsset,
	isNpcPackFrameName,
	npcPackAsset,
	regionalBackgroundAssets,
	starterPackAsset,
	terrainFrameOrder,
	terrainTilesAsset,
	type ActorAnimationId,
	type ActorAnimationKey,
	type InteriorPropFrameName
} from '$lib/game/content/assets';

const requiredActors: ActorAnimationId[] = [...actorAnimationIds];
const requiredClips: ActorAnimationKey[] = ['idle', 'walk', 'attack', 'dead'];
const requiredInteriorPropFrames: InteriorPropFrameName[] = [
	'bed',
	'table',
	'bench',
	'bookshelf',
	'shopCounter',
	'noticeBoard',
	'rug',
	'crateStack',
	'barrel',
	'displayShelf',
	'papers',
	'weaponRack',
	'hearthLamp',
	'plant'
];

function assertFramesInsideSheetBounds(asset: {
	cellWidth: number;
	cellHeight: number;
	columns: number;
	rows: number;
	frames: Record<string, { x: number; y: number; w: number; h: number }>;
}) {
	const sheetWidth = asset.columns * asset.cellWidth;
	const sheetHeight = asset.rows * asset.cellHeight;
	for (const frame of Object.values(asset.frames)) {
		expect(frame.x).toBeGreaterThanOrEqual(0);
		expect(frame.y).toBeGreaterThanOrEqual(0);
		expect(frame.x + frame.w).toBeLessThanOrEqual(sheetWidth);
		expect(frame.y + frame.h).toBeLessThanOrEqual(sheetHeight);
	}
}

describe('starter pack asset frames', () => {
	it('keeps hero and potion frames large enough to avoid visible cropping', () => {
		expect(starterPackAsset.frames.hero).toEqual({ x: 90, y: 80, w: 235, h: 280 });
		expect(starterPackAsset.frames.healFlask).toEqual({ x: 1210, y: 145, w: 150, h: 215 });
	});
});

describe('battle background asset metadata', () => {
	it('defines map-aware battle background assets', () => {
		expect(battleBackgroundAssets).toEqual({
			meadow: {
				key: 'battle-background-meadow',
				path: '/game/assets/heroic-ui/battle-backdrop.png'
			},
			ruins: {
				key: 'battle-background-ruins',
				path: '/game/assets/battle-ruins.png'
			},
			neutral: {
				key: 'battle-background-neutral',
				path: '/game/assets/battle-neutral.png'
			}
		});
	});

	it('maps source maps to battle environments with a neutral fallback', () => {
		expect(getBattleEnvironmentId('overworld')).toBe('meadow');
		expect(getBattleEnvironmentId('ruins-threshold')).toBe('ruins');
		expect(getBattleEnvironmentId('ruins-core')).toBe('ruins');
		expect(getBattleEnvironmentId('hero-house')).toBe('neutral');
		expect(getBattleEnvironmentId('unknown-map')).toBe('neutral');
	});

	it('returns the background asset for the resolved environment', () => {
		expect(getBattleBackgroundAsset('ruins-core')).toBe(battleBackgroundAssets.ruins);
		expect(getBattleBackgroundAsset('villager-house-1')).toBe(battleBackgroundAssets.neutral);
	});
});

describe('regional background asset metadata', () => {
	it('keeps the generic regional preload seam empty', () => {
		expect(regionalBackgroundAssets).toEqual([]);
	});
});

describe('environment dressing asset metadata', () => {
	it('keeps only the live blocker and stair frames on the original sheet', () => {
		expect(environmentDressingAsset).toEqual({
			key: 'environment-dressing',
			path: '/game/assets/environment-dressing.png',
			cellWidth: 96,
			cellHeight: 96,
			columns: 4,
			frames: {
				ruinWall: { x: 0, y: 96, w: 96, h: 96 },
				futureGate: { x: 96, y: 96, w: 96, h: 96 },
				stoneStair: { x: 192, y: 96, w: 96, h: 96 }
			}
		});
	});
});

describe('interior prop asset metadata', () => {
	it('loads reusable interior props from a 4-column sprite sheet with 14 prop frames', () => {
		expect(interiorPropAsset).toMatchObject({
			key: 'interior-props',
			path: '/game/assets/interior-props.png',
			cellWidth: 128,
			cellHeight: 128,
			columns: 4,
			rows: 4
		});
		expect(interiorPropAsset.frames).toEqual({
			bed: { x: 0, y: 0, w: 128, h: 128 },
			table: { x: 128, y: 0, w: 128, h: 128 },
			bench: { x: 256, y: 0, w: 128, h: 128 },
			bookshelf: { x: 384, y: 0, w: 128, h: 128 },
			shopCounter: { x: 0, y: 128, w: 128, h: 128 },
			noticeBoard: { x: 128, y: 128, w: 128, h: 128 },
			rug: { x: 256, y: 128, w: 128, h: 128 },
			crateStack: { x: 384, y: 128, w: 128, h: 128 },
			barrel: { x: 0, y: 256, w: 128, h: 128 },
			displayShelf: { x: 128, y: 256, w: 128, h: 128 },
			papers: { x: 256, y: 256, w: 128, h: 128 },
			weaponRack: { x: 384, y: 256, w: 128, h: 128 },
			hearthLamp: { x: 0, y: 384, w: 128, h: 128 },
			plant: { x: 128, y: 384, w: 128, h: 128 }
		});
		expect(Object.keys(interiorPropAsset.frames)).toEqual(requiredInteriorPropFrames);
	});

	it('keeps every frame inside the sheet bounds', () => {
		assertFramesInsideSheetBounds(interiorPropAsset);
	});
});

describe('npc pack metadata', () => {
	it('defines fixed-cell family and villager sprites separate from the starter sheet', () => {
		expect(npcPackAsset).toMatchObject({
			key: 'npc-pack',
			path: '/game/assets/npc-pack.png',
			cellWidth: 96,
			cellHeight: 96,
			columns: 13,
			rows: 1
		});
		expect(npcPackAsset.frames).toEqual({
			borakNpc: { x: 0, y: 0, w: 96, h: 96 },
			droggNpc: { x: 96, y: 0, w: 96, h: 96 },
			mottNpc: { x: 192, y: 0, w: 96, h: 96 },
			tikkaNpc: { x: 288, y: 0, w: 96, h: 96 },
			lirraNpc: { x: 384, y: 0, w: 96, h: 96 },
			miraItemShopNpc: { x: 480, y: 0, w: 96, h: 96 },
			quartermasterNpc: { x: 576, y: 0, w: 96, h: 96 },
			guildMasterNpc: { x: 672, y: 0, w: 96, h: 96 },
			fisherNpc: { x: 768, y: 0, w: 96, h: 96 },
			travelerNpc: { x: 864, y: 0, w: 96, h: 96 },
			pilgrimNpc: { x: 960, y: 0, w: 96, h: 96 },
			woodcutterNpc: { x: 1_056, y: 0, w: 96, h: 96 },
			crierNpc: { x: 1_152, y: 0, w: 96, h: 96 }
		});
		expect(isNpcPackFrameName('miraItemShopNpc')).toBe(true);
		expect(isNpcPackFrameName('quartermasterNpc')).toBe(true);
		expect(isNpcPackFrameName('guildMasterNpc')).toBe(true);
		expect(isNpcPackFrameName('titleBadge')).toBe(false);
	});

	it('includes ambient NPC frames to the right of the shopkeeper sprites', () => {
		expect(isNpcPackFrameName('fisherNpc')).toBe(true);
		expect(isNpcPackFrameName('travelerNpc')).toBe(true);
		expect(isNpcPackFrameName('pilgrimNpc')).toBe(true);
		expect(isNpcPackFrameName('woodcutterNpc')).toBe(true);
		expect(isNpcPackFrameName('crierNpc')).toBe(true);
	});

	it('keeps every frame inside the sheet bounds', () => {
		assertFramesInsideSheetBounds(npcPackAsset);
	});
});

describe('animation pack metadata', () => {
	it('loads actor animation art from a companion sheet', () => {
		expect(animationPackAsset).toMatchObject({
			key: 'animation-pack',
			path: '/game/assets/animation-pack.png',
			cellWidth: 192,
			cellHeight: 192,
			columns: 4
		});
	});

	it('tiles actor blocks four to a row so the sheet stays within 4096px', () => {
		expect(animationPackAsset.frames.heroIdle0).toMatchObject({ x: 0, y: 0 });
		expect(animationPackAsset.frames.forestWolfIdle0).toMatchObject({ x: 768, y: 0 });
		expect(animationPackAsset.frames.boarKingIdle0).toMatchObject({ x: 0, y: 768 });
		expect(animationPackAsset.frames.sunCrestCaptainDead3).toMatchObject({ x: 2_880, y: 1_344 });
	});

	it('defines all required actor clips with valid frame references', () => {
		for (const actorId of requiredActors) {
			const actor = actorAnimationAssets[actorId];
			expect(actor.displaySize.width).toBeGreaterThan(0);
			expect(actor.displaySize.height).toBeGreaterThan(0);

			for (const clipName of requiredClips) {
				const clip = actor.clips[clipName];
				expect(clip.key).toBe(`${actorId}-${clipName}`);
				expect(clip.frameRate).toBeGreaterThan(0);
				expect(clip.frames).toHaveLength(4);

				for (const frameName of clip.frames) {
					expect(animationPackAsset.frames[frameName]).toEqual(
						expect.objectContaining({
							x: expect.any(Number),
							y: expect.any(Number),
							w: 192,
							h: 192
						})
					);
					expect(actor.groundContactY[frameName]).toBeGreaterThan(0);
					expect(actor.groundContactY[frameName]).toBeLessThanOrEqual(
						animationPackAsset.cellHeight
					);
				}
			}
		}
	});

	it('keeps dust, weapons, and mandibles below the contact anchor out of actor depth', () => {
		expect(actorAnimationAssets.forestWolf.groundContactY.forestWolfAttack2).toBe(159);
		expect(actorAnimationAssets.boarKing.groundContactY.boarKingAttack2).toBe(183);
		expect(actorAnimationAssets.hero.groundContactY.heroDead2).toBe(163);
		expect(actorAnimationAssets.tunnelCrawler.groundContactY.tunnelCrawlerIdle0).toBe(176);
		expect(actorAnimationAssets.tunnelCrawler.groundContactY.tunnelCrawlerAttack0).toBe(172);
	});

	it('places every ground-contact line on visible artwork in its frame', async () => {
		const { data, info } = await sharp(`public${animationPackAsset.path}`)
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });

		for (const actorId of requiredActors) {
			const actor = actorAnimationAssets[actorId];
			expect(Object.keys(actor.groundContactY)).toHaveLength(16);
			for (const clipName of requiredClips) {
				for (const frameName of actor.clips[clipName].frames) {
					const frame = animationPackAsset.frames[frameName];
					const y = frame.y + actor.groundContactY[frameName]! - 1;
					const alphaAtContact = Array.from(
						{ length: frame.w },
						(_, x) => data[(y * info.width + frame.x + x) * info.channels + 3]
					);
					expect(alphaAtContact.some((alpha) => alpha !== undefined && alpha > 128)).toBe(true);
				}
			}
		}
	});

	it('maps each prologue enemy to its own actor', () => {
		expect(getEnemyActorId('forest-wolf')).toBe('forestWolf');
		expect(getEnemyActorId('boar-king')).toBe('boarKing');
		expect(getEnemyActorId('sun-crest-captain')).toBe('sunCrestCaptain');
		expect(getActorAnimationAsset('hero')).toBe(actorAnimationAssets.hero);
	});

	it('gives every prologue enemy its own battle plate', () => {
		expect(getEnemyPlateArtPath('mist-toad')).toBe('/game/assets/heroic-ui/enemies/mist-toad.png');
	});
});

describe('terrainTilesAsset', () => {
	const required = [
		'grassTile',
		'pathTile',
		'ruinsFloorTile',
		'stoneWallTile',
		'seaTile',
		'sandTile',
		'marshMudTile',
		'autumnLeafTile',
		'cobblestoneTile'
	] as const;

	it('declares every required ground tile', () => {
		for (const name of required) {
			expect(terrainTilesAsset.frames).toHaveProperty(name);
		}
	});

	it('keeps every frame inside the sheet bounds', () => {
		assertFramesInsideSheetBounds(terrainTilesAsset);
	});

	it('mirrors terrainFrameOrder so indices stay stable', () => {
		expect(terrainFrameOrder).toEqual(Object.keys(terrainTilesAsset.frames));
		for (const name of terrainFrameOrder) {
			expect(terrainTilesAsset.frames[name]).toBeDefined();
		}
	});
});

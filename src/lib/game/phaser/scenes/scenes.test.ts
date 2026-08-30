import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	battleBackgroundAssets,
	environmentDressingAsset,
	fenceDressingAsset,
	forestDressingAsset
} from '$lib/game/content/assets';
import {
	heroHouseMap,
	guildHallMap,
	maps,
	itemShopMap,
	shrineOfAuroraInteriorMap,
	villagerHouse1Map,
	villagerHouse2Map,
	villagerHouse3Map
} from '$lib/game/content/maps';
import type { MapBackgroundImage } from '$lib/game/content/maps/types';
import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import { compileNavigationGrid } from '$lib/game/core/navigation';
import {
	PLAYER_MOVEMENT_DIAGNOSTIC_EVENT,
	type PlayerMovementDiagnostic
} from '$lib/game/phaser/player-movement-diagnostics';
import type { RegionalBackgroundRendererDiagnostic } from '$lib/game/phaser/renderer-diagnostics';
import type { RegionalBackgroundPlaneRenderDiagnostic } from '$lib/game/phaser/regional-background-plane-render-diagnostics';
import type {
	MapBackgroundPackageDefinition,
	MapBackgroundPackageSelection
} from '$lib/game/content/backgrounds/map-background-package';
import { MAP_BACKGROUND_DEFAULT_SELECTIONS } from '$lib/game/content/backgrounds/map-background-registry';
import {
	collectLandmarkRects,
	collectStrictCollisionRects,
	isInsideAnyCollisionRect
} from '$lib/game/save/save-state';
import { HUD_COMMAND_EVENT, type HudCommand } from '$lib/game/ui-bridge/events';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';

const guildMasterApproach = { x: 800, y: 184 };
const quartermasterApproach = { x: 816, y: 568 };

const itemShopCollisionIds = [
	...(itemShopMap.blockers ?? []).map(({ id }) => id),
	...(itemShopMap.fences ?? []).map(({ id }) => id),
	...(itemShopMap.mapDecor ?? []).flatMap(({ collision }) => (collision ? [collision.id] : [])),
	...(itemShopMap.interiorProps ?? []).flatMap(({ collision }) =>
		collision ? [collision.id] : []
	),
	...(itemShopMap.landmarks ?? []).map(({ id }) => id)
].sort();
const itemShopStatefulObjectIds = [
	...itemShopMap.transitions.map(({ id }) => id),
	...(itemShopMap.pickups ?? []).map(({ id }) => id),
	...(itemShopMap.encounters ?? []).map(({ id }) => id),
	...(itemShopMap.npcs ?? []).map(({ id }) => id),
	...(itemShopMap.landmarks ?? []).map(({ id }) => id),
	...(itemShopMap.ambientNpcs ?? []).map(({ id }) => id),
	...(itemShopMap.discoveries ?? []).map(({ id }) => id),
	...(itemShopMap.combatBounds ?? []).map(({ id }) => id)
].sort();

const heroHouseCollisionIds = [
	...(heroHouseMap.blockers ?? []).map(({ id }) => id),
	...(heroHouseMap.fences ?? []).map(({ id }) => id),
	...(heroHouseMap.mapDecor ?? []).flatMap(({ collision }) => (collision ? [collision.id] : [])),
	...(heroHouseMap.interiorProps ?? []).flatMap(({ collision }) =>
		collision ? [collision.id] : []
	),
	...(heroHouseMap.landmarks ?? []).map(({ id }) => id)
].sort();
const heroHouseStatefulObjectIds = [
	...heroHouseMap.transitions.map(({ id }) => id),
	...(heroHouseMap.pickups ?? []).map(({ id }) => id),
	...(heroHouseMap.encounters ?? []).map(({ id }) => id),
	...(heroHouseMap.npcs ?? []).map(({ id }) => id),
	...(heroHouseMap.landmarks ?? []).map(({ id }) => id),
	...(heroHouseMap.ambientNpcs ?? []).map(({ id }) => id),
	...(heroHouseMap.discoveries ?? []).map(({ id }) => id),
	...(heroHouseMap.combatBounds ?? []).map(({ id }) => id)
].sort();

const villagerHouse1CollisionIds = [
	...(villagerHouse1Map.blockers ?? []).map(({ id }) => id),
	...(villagerHouse1Map.fences ?? []).map(({ id }) => id),
	...(villagerHouse1Map.mapDecor ?? []).flatMap(({ collision }) =>
		collision ? [collision.id] : []
	),
	...(villagerHouse1Map.interiorProps ?? []).flatMap(({ collision }) =>
		collision ? [collision.id] : []
	),
	...(villagerHouse1Map.landmarks ?? []).map(({ id }) => id)
].sort();
const villagerHouse1StatefulObjectIds = [
	...villagerHouse1Map.transitions.map(({ id }) => id),
	...(villagerHouse1Map.pickups ?? []).map(({ id }) => id),
	...(villagerHouse1Map.encounters ?? []).map(({ id }) => id),
	...(villagerHouse1Map.npcs ?? []).map(({ id }) => id),
	...(villagerHouse1Map.landmarks ?? []).map(({ id }) => id),
	...(villagerHouse1Map.ambientNpcs ?? []).map(({ id }) => id),
	...(villagerHouse1Map.discoveries ?? []).map(({ id }) => id),
	...(villagerHouse1Map.combatBounds ?? []).map(({ id }) => id)
].sort();
const villagerHouse2CollisionIds = [
	...(villagerHouse2Map.blockers ?? []).map(({ id }) => id),
	...(villagerHouse2Map.fences ?? []).map(({ id }) => id),
	...(villagerHouse2Map.mapDecor ?? []).flatMap(({ collision }) =>
		collision ? [collision.id] : []
	),
	...(villagerHouse2Map.interiorProps ?? []).flatMap(({ collision }) =>
		collision ? [collision.id] : []
	),
	...(villagerHouse2Map.landmarks ?? []).map(({ id }) => id)
].sort();
const villagerHouse2StatefulObjectIds = [
	...villagerHouse2Map.transitions.map(({ id }) => id),
	...(villagerHouse2Map.pickups ?? []).map(({ id }) => id),
	...(villagerHouse2Map.encounters ?? []).map(({ id }) => id),
	...(villagerHouse2Map.npcs ?? []).map(({ id }) => id),
	...(villagerHouse2Map.landmarks ?? []).map(({ id }) => id),
	...(villagerHouse2Map.ambientNpcs ?? []).map(({ id }) => id),
	...(villagerHouse2Map.discoveries ?? []).map(({ id }) => id),
	...(villagerHouse2Map.combatBounds ?? []).map(({ id }) => id)
].sort();
const villagerHouse3CollisionIds = [
	...(villagerHouse3Map.blockers ?? []).map(({ id }) => id),
	...(villagerHouse3Map.fences ?? []).map(({ id }) => id),
	...(villagerHouse3Map.mapDecor ?? []).flatMap(({ collision }) =>
		collision ? [collision.id] : []
	),
	...(villagerHouse3Map.interiorProps ?? []).flatMap(({ collision }) =>
		collision ? [collision.id] : []
	),
	...(villagerHouse3Map.landmarks ?? []).map(({ id }) => id)
].sort();
const villagerHouse3StatefulObjectIds = [
	...villagerHouse3Map.transitions.map(({ id }) => id),
	...(villagerHouse3Map.pickups ?? []).map(({ id }) => id),
	...(villagerHouse3Map.encounters ?? []).map(({ id }) => id),
	...(villagerHouse3Map.npcs ?? []).map(({ id }) => id),
	...(villagerHouse3Map.landmarks ?? []).map(({ id }) => id),
	...(villagerHouse3Map.ambientNpcs ?? []).map(({ id }) => id),
	...(villagerHouse3Map.discoveries ?? []).map(({ id }) => id),
	...(villagerHouse3Map.combatBounds ?? []).map(({ id }) => id)
].sort();

const expectedOrganicBlockerOwners = [
	'coast-crossroads-mouth-bank',
	'mistfen-entry-bank-east',
	'silverpine-wall-A-east',
	'silverpine-wall-A-west',
	'silverpine-wall-B-north',
	'silverpine-wall-B-south',
	'silverpine-wall-C-east',
	'silverpine-wall-C-west',
	'wildwood-forest-lane-west-bank'
] as const;

const expectedOrganicBlockerBounds = {
	'coast-crossroads-mouth-bank': { x: 3_200, y: 5_100, width: 64, height: 400 },
	'mistfen-entry-bank-east': { x: 3_100, y: 2_850, width: 64, height: 500 },
	'silverpine-wall-A-east': { x: 3_660, y: 2_850, width: 64, height: 300 },
	'silverpine-wall-A-west': { x: 3_340, y: 2_850, width: 64, height: 300 },
	'silverpine-wall-B-north': { x: 3_340, y: 2_590, width: 384, height: 64 },
	'silverpine-wall-B-south': { x: 3_340, y: 2_910, width: 384, height: 64 },
	'silverpine-wall-C-east': { x: 3_340, y: 2_660, width: 64, height: 240 },
	'silverpine-wall-C-west': { x: 3_020, y: 2_660, width: 64, height: 240 },
	'wildwood-forest-lane-west-bank': { x: 5_040, y: 4_250, width: 64, height: 2_100 }
} as const;

function expectedOrganicBlockerMarkerCount(id: keyof typeof expectedOrganicBlockerBounds) {
	const bounds = expectedOrganicBlockerBounds[id];
	return Math.ceil(Math.max(bounds.width, bounds.height) / 48);
}

const localeState = vi.hoisted(() => ({
	activeLocale: 'en' as 'en' | 'ja' | 'zh-Hant'
}));

const registryDrivenBackgroundRegistryMock = vi.hoisted(() => ({
	packageDefinition: {
		id: 'scene-support-registry-default',
		mapId: 'scene-registry-default-test',
		coverage: 'full-map' as const,
		assets: [
			{
				key: 'two-plane-base',
				path: '/game/assets/scene-support-registry/base.png'
			},
			{
				key: 'two-plane-foreground',
				path: '/game/assets/scene-support-registry/foreground.png'
			}
		],
		backgrounds: [
			{
				id: 'two-plane-base-image',
				x: 320,
				y: 160,
				width: 640,
				height: 320,
				textureKey: 'two-plane-base',
				plane: 'base' as const,
				drawOrder: 10
			},
			{
				id: 'two-plane-foreground-image',
				x: 352,
				y: 192,
				width: 640,
				height: 320,
				textureKey: 'two-plane-foreground',
				plane: 'foreground' as const,
				drawOrder: 20
			}
		],
		visualOwners: []
	},
	defaultSelection: {
		packageId: 'scene-support-registry-default',
		mode: 'production' as const
	}
}));

const storyClientMock = vi.hoisted(() => {
	type StoryRequest = {
		npcId: string;
		mapId: string;
		locale: 'en' | 'ja' | 'zh-Hant';
		quest: {
			mainQuestNeedsGuildBriefing: boolean;
			guildBriefingComplete: boolean;
			hasActiveSideQuest: boolean;
			hasCompletedQuest: boolean;
		};
	};

	function createStorySession({
		id,
		speaker,
		lines,
		choices,
		completionIntent
	}: {
		id: string;
		speaker: string;
		lines: string[];
		choices: Array<{ id: string; label: string; intent: Record<string, string> }>;
		completionIntent: Record<string, string> | null;
	}) {
		return {
			id,
			npcId: null,
			speaker,
			lines,
			line: lines[0] ?? '',
			lineIndex: 0,
			lineCount: lines.length,
			mode: lines.length <= 1 && choices.length > 0 ? 'choice' : 'conversation',
			choices,
			completionIntent,
			canClose: true
		};
	}

	return {
		getNpcStoryDialogue: vi.fn(async (request: StoryRequest) => {
			if (request.npcId === 'guild-master') {
				const lines = request.quest.mainQuestNeedsGuildBriefing
					? [
							'You made it. The eastern ruins are stirring again, and the village road is no longer safe.',
							'Go through the forest path, reach the old core, and defeat the warden before it wakes the rest.'
						]
					: ['The ruins route is open. Steel yourself before you enter the core.'];

				return createStorySession({
					id: 'npc:guild-master:prologue.guild-master',
					speaker: 'Guild Master Arlen',
					lines,
					choices: [
						{
							id: 'quest',
							label: 'Quest',
							intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
						}
					],
					completionIntent: request.quest.mainQuestNeedsGuildBriefing
						? { type: 'recordNpcTalk', npcId: 'guild-master' }
						: null
				});
			}

			if (request.npcId === 'guild-quartermaster') {
				return createStorySession({
					id: 'npc:guild-quartermaster:always',
					speaker: 'Quartermaster Vale',
					lines: ['Need field gear before the ruins? Guild stock is limited, but sturdy.'],
					choices: [
						{
							id: 'shop',
							label: 'Shop',
							intent: { type: 'openShop', shopId: 'guild-quartermaster' }
						}
					],
					completionIntent: null
				});
			}

			if (request.npcId === 'blacksmith-oren') {
				return createStorySession({
					id: 'npc:blacksmith-oren:always',
					speaker: 'Blacksmith Oren',
					lines: ['Steel holds when the hand behind it does. Take what fits, and keep it dry.'],
					choices: [
						{
							id: 'shop',
							label: 'Shop',
							intent: { type: 'openShop', shopId: 'sundrop-forge' }
						}
					],
					completionIntent: null
				});
			}

			if (request.npcId === 'villager-lynn') {
				return createStorySession({
					id: 'npc:villager-lynn:always',
					speaker: 'Lynn',
					lines: ['The kettle is warm if you need a quiet minute before the road.'],
					choices: [{ id: 'close', label: 'Close', intent: { type: 'close' } }],
					completionIntent: null
				});
			}

			return createStorySession({
				id: 'npc:shopkeeper-mira:always',
				speaker: 'Mira',
				lines: ['Fresh tonics are on the shelf.'],
				choices: [
					{
						id: 'shop',
						label: 'Shop',
						intent: { type: 'openShop', shopId: 'miras-item-shop' }
					}
				],
				completionIntent: null
			});
		})
	};
});

vi.mock('$lib/game/story/client', () => ({
	getNpcStoryDialogue: storyClientMock.getNpcStoryDialogue
}));

vi.mock('$lib/game/i18n/store', () => ({
	getActiveLocale: () => localeState.activeLocale
}));

vi.mock('$lib/game/i18n/translate', async () => {
	const actual = await vi.importActual<typeof import('$lib/game/i18n/translate')>(
		'$lib/game/i18n/translate'
	);

	return {
		...actual,
		t: vi.fn((locale, key, params) => {
			if (locale === 'ja' && key === 'content.dialogue.speakers.traveler') {
				return 'JP Traveler';
			}

			return actual.t(locale, key, params);
		})
	};
});

vi.mock('$lib/game/i18n/content', async () => {
	const actual =
		await vi.importActual<typeof import('$lib/game/i18n/content')>('$lib/game/i18n/content');

	return {
		...actual,
		getItemText: vi.fn((locale: 'en' | 'ja' | 'zh-Hant', itemId: string) => {
			if (locale === 'ja') {
				if (itemId === 'sunleaf-salve') {
					return { name: 'JP Sunleaf Salve', description: 'JP salve description.' };
				}

				if (itemId === 'field-potion') {
					return { name: 'Field Potion', description: 'Restores 8 HP.' };
				}
			}

			return actual.getItemText(locale, itemId);
		}),
		getShopText: vi.fn((locale: 'en' | 'ja' | 'zh-Hant', shopId: string) => {
			if (locale === 'ja' && shopId === 'miras-item-shop') {
				return {
					name: 'JP Mira Shop',
					merchantName: 'JP Mira',
					description: 'JP reliable field supplies.'
				};
			}

			return actual.getShopText(locale, shopId);
		}),
		getQuestText: vi.fn((locale: 'en' | 'ja' | 'zh-Hant', questId: string) => {
			if (locale === 'ja' && questId === 'investigate-the-ruins') {
				return {
					title: 'JP Investigate the Ruins',
					description: 'JP Report to the Guild Master, then defeat the ruins warden.'
				};
			}

			return actual.getQuestText(locale, questId);
		}),
		getQuestObjectiveText: vi.fn(
			(locale: 'en' | 'ja' | 'zh-Hant', questId: string, objectiveId: string) => {
				if (
					locale === 'ja' &&
					questId === 'investigate-the-ruins' &&
					objectiveId === 'talk-to-guild-master'
				) {
					return {
						description: 'JP Talk to the Guild Master in the Guild Hall.',
						progressLabel: 'JP Guild Master spoken to'
					};
				}

				return actual.getQuestObjectiveText(locale, questId, objectiveId);
			}
		),
		getNpcText: vi.fn((locale: 'en' | 'ja' | 'zh-Hant', npcId: string) => {
			if (locale === 'ja') {
				if (npcId === 'shopkeeper-mira') return { name: 'JP Mira' };
				if (npcId === 'guild-master') return { name: 'JP Guild Master' };
			}

			return actual.getNpcText(locale, npcId);
		})
	};
});

const phaserState = vi.hoisted(() => {
	const regionalBackgroundTextureKey = 'sundrop-village-base';
	const gl = {
		MAX_TEXTURE_SIZE: 0x0d33,
		getParameter: vi.fn(() => 4096)
	};
	const renderer = {
		type: 2,
		gl
	};
	const cursorKeys = {
		left: { isDown: false },
		right: { isDown: false },
		up: { isDown: false },
		down: { isDown: false }
	};
	const wasdKeys = {
		left: { isDown: false },
		right: { isDown: false },
		up: { isDown: false },
		down: { isDown: false }
	};
	const interactKeys = {
		e: { isDown: false, justDown: false },
		space: { isDown: false, justDown: false },
		enter: { isDown: false, justDown: false }
	};

	function getInteractKey(code: string) {
		if (code === 'E') return interactKeys.e;
		if (code === 'SPACE') return interactKeys.space;
		if (code === 'ENTER') return interactKeys.enter;

		throw new Error(`Unexpected key code ${code}`);
	}

	function createAnimatedMarker() {
		const marker: {
			x: number;
			y: number;
			frame: string | undefined;
			visible: boolean;
			clearTint: ReturnType<typeof vi.fn>;
			setDisplaySize: ReturnType<typeof vi.fn>;
			setTint: ReturnType<typeof vi.fn>;
			setVisible: ReturnType<typeof vi.fn>;
			play: ReturnType<typeof vi.fn>;
			once: ReturnType<typeof vi.fn>;
		} = {
			x: 0,
			y: 0,
			frame: undefined as string | undefined,
			visible: true,
			clearTint: vi.fn(() => marker),
			setDisplaySize: vi.fn(() => marker),
			setTint: vi.fn(() => marker),
			setVisible: vi.fn((visible: boolean) => {
				marker.visible = visible;
				return marker;
			}),
			play: vi.fn(() => marker),
			once: vi.fn((_event: string, _callback: () => void) => {
				void _event;
				void _callback;
				return marker;
			})
		};

		return marker;
	}

	const playerMarker = createAnimatedMarker();
	const enemyMarker = createAnimatedMarker();
	const enemyMarkers: ReturnType<typeof createAnimatedMarker>[] = [];
	const victoryText = { setOrigin: vi.fn() };
	const textureMock = {
		has: vi.fn(() => false),
		add: vi.fn()
	};
	const regionalBackgroundTextureMock = {
		key: regionalBackgroundTextureKey,
		source: [{ width: 1792, height: 1536 }],
		get: vi.fn(() => ({ cutWidth: 1792, cutHeight: 1536 }))
	};
	const regionalBackgroundTextureMocks = new Map<string, typeof regionalBackgroundTextureMock>();
	const imageCreationFailureKeys = new Set<string>();
	const postCreationFailureKeys = new Set<string>();
	const missingTextureKeys = new Set<string>();
	const tilemapLayer = {
		setDepth: vi.fn(() => tilemapLayer)
	};
	const tilemap = {
		addTilesetImage: vi.fn(() => ({ name: 'starter-ground-tiles' })),
		createLayer: vi.fn((layerId: number | string) => (layerId === 0 ? tilemapLayer : null))
	};
	const mainCamera = {
		width: 640,
		height: 360,
		scrollX: 0,
		scrollY: 0,
		zoom: 1,
		shake: vi.fn(),
		setBackgroundColor: vi.fn(),
		setBounds: vi.fn(),
		setZoom: vi.fn(function (this: typeof mainCamera, value: number) {
			this.zoom = value;
		}),
		startFollow: vi.fn()
	};
	const imageMarkers: Array<{
		x: number;
		y: number;
		texture: string;
		frame?: string;
		visible: boolean;
		setDepth: ReturnType<typeof vi.fn>;
		setDisplaySize: ReturnType<typeof vi.fn>;
		setOrigin: ReturnType<typeof vi.fn>;
		setVisible: ReturnType<typeof vi.fn>;
		destroy: ReturnType<typeof vi.fn>;
	}> = [];
	const tileSpriteMarkers: Array<{
		x: number;
		y: number;
		width: number;
		height: number;
		frame?: string;
		alpha?: number;
		setAlpha?: ReturnType<typeof vi.fn>;
	}> = [];
	type RecordedGraphicsCommand =
		| {
				kind: 'fillRect';
				x: number;
				y: number;
				width: number;
				height: number;
				color: number;
				alpha: number;
		  }
		| {
				kind: 'strokeCircle';
				x: number;
				y: number;
				radius: number;
				color: number;
				alpha: number;
				lineWidth: number;
		  }
		| {
				kind: 'strokeRect';
				x: number;
				y: number;
				width: number;
				height: number;
				color: number;
				alpha: number;
				lineWidth: number;
		  };
	const graphicsMarkers: Array<{
		commands: RecordedGraphicsCommand[];
		clear: ReturnType<typeof vi.fn>;
		destroy: ReturnType<typeof vi.fn>;
		fillRect: ReturnType<typeof vi.fn>;
		fillStyle: ReturnType<typeof vi.fn>;
		lineStyle: ReturnType<typeof vi.fn>;
		setDepth: ReturnType<typeof vi.fn>;
		strokeCircle: ReturnType<typeof vi.fn>;
		strokeRect: ReturnType<typeof vi.fn>;
	}> = [];

	function createGraphics() {
		let fillColor = 0;
		let fillAlpha = 1;
		let lineColor = 0;
		let lineAlpha = 1;
		let lineWidth = 1;
		const commands: RecordedGraphicsCommand[] = [];
		const marker = {
			commands,
			clear: vi.fn(() => marker),
			destroy: vi.fn(() => marker),
			fillStyle: vi.fn((color: number, alpha = 1) => {
				fillColor = color;
				fillAlpha = alpha;
				return marker;
			}),
			fillRect: vi.fn((x: number, y: number, width: number, height: number) => {
				commands.push({
					kind: 'fillRect',
					x,
					y,
					width,
					height,
					color: fillColor,
					alpha: fillAlpha
				});
				return marker;
			}),
			lineStyle: vi.fn((width: number, color: number, alpha = 1) => {
				lineWidth = width;
				lineColor = color;
				lineAlpha = alpha;
				return marker;
			}),
			setDepth: vi.fn(() => marker),
			strokeCircle: vi.fn((x: number, y: number, radius: number) => {
				commands.push({
					kind: 'strokeCircle',
					x,
					y,
					radius,
					color: lineColor,
					alpha: lineAlpha,
					lineWidth
				});
				return marker;
			}),
			strokeRect: vi.fn((x: number, y: number, width: number, height: number) => {
				commands.push({
					kind: 'strokeRect',
					x,
					y,
					width,
					height,
					color: lineColor,
					alpha: lineAlpha,
					lineWidth
				});
				return marker;
			})
		};
		graphicsMarkers.push(marker);
		return marker;
	}

	function createOverlayMarker() {
		const marker = {
			x: 0,
			y: 0,
			alpha: 1,
			scaleX: 1,
			scaleY: 1,
			visible: true,
			setPosition: vi.fn((x: number, y: number) => {
				marker.x = x;
				marker.y = y;
				return marker;
			}),
			setScale: vi.fn((x: number, y?: number) => {
				marker.scaleX = x;
				marker.scaleY = y ?? x;
				return marker;
			}),
			setOrigin: vi.fn((_x: number, _y?: number) => {
				void _x;
				void _y;
				return marker;
			}),
			setAlpha: vi.fn((alpha: number) => {
				marker.alpha = alpha;
				return marker;
			}),
			setVisible: vi.fn((visible: boolean) => {
				marker.visible = visible;
				return marker;
			}),
			destroy: vi.fn(() => marker)
		};

		return marker;
	}

	const hitImpactMarkers = [
		createOverlayMarker(),
		createOverlayMarker(),
		createOverlayMarker(),
		createOverlayMarker()
	];
	let nextHitImpactMarkerIndex = 0;
	const enemyHealthBarBg = createOverlayMarker();
	const enemyHealthBarFill = createOverlayMarker();
	const enemyHealthBarBgs: ReturnType<typeof createOverlayMarker>[] = [];
	const enemyHealthBarFills: ReturnType<typeof createOverlayMarker>[] = [];
	const attackFlash = createOverlayMarker();
	const victoryOverlay = createOverlayMarker();

	function createImage(x: number, y: number, texture: string, frame?: string) {
		if (imageCreationFailureKeys.has(texture)) {
			throw new Error(`Image creation failed for ${texture}`);
		}
		if (
			frame === 'hero' ||
			frame?.startsWith('heroIdle') ||
			frame?.startsWith('heroWalk') ||
			frame?.startsWith('heroAttack') ||
			frame?.startsWith('heroDead')
		) {
			playerMarker.x = x;
			playerMarker.y = y;
			playerMarker.frame = frame;
			return playerMarker;
		}

		if (
			frame === 'slimeScout' ||
			frame === 'ruinsWarden' ||
			frame?.startsWith('slimeScout') ||
			frame?.startsWith('ruinsWarden')
		) {
			const marker = enemyMarkers.length === 0 ? enemyMarker : createAnimatedMarker();
			marker.x = x;
			marker.y = y;
			marker.frame = frame;
			marker.visible = true;
			enemyMarkers.push(marker);
			return marker;
		}

		const marker = {
			x,
			y,
			texture,
			frame,
			visible: true,
			setDepth: vi.fn(() => {
				if (postCreationFailureKeys.has(texture)) {
					throw new Error(`Post-creation failure for ${texture}`);
				}
				return marker;
			}),
			setDisplaySize: vi.fn(() => marker),
			setOrigin: vi.fn(() => marker),
			setVisible: vi.fn((visible: boolean) => {
				marker.visible = visible;
				return marker;
			}),
			destroy: vi.fn(() => marker)
		};
		imageMarkers.push(marker);
		return marker;
	}

	function createTileSprite(
		x: number,
		y: number,
		width: number,
		height: number,
		_texture: string,
		frame?: string
	) {
		const marker = {
			x,
			y,
			width,
			height,
			frame,
			alpha: 1,
			setAlpha: vi.fn((alpha: number) => {
				marker.alpha = alpha;
				return marker;
			})
		};
		tileSpriteMarkers.push(marker);
		return marker;
	}

	function createRectangle(
		x: number,
		y: number,
		width: number,
		height: number,
		color?: number,
		_alpha?: number
	) {
		void _alpha;

		if (width === 34 && height === 4) {
			const marker = enemyHealthBarBgs.length === 0 ? enemyHealthBarBg : createOverlayMarker();
			Object.assign(marker, { x, y, scaleX: 1, scaleY: 1, visible: true });
			enemyHealthBarBgs.push(marker);
			return marker;
		}

		if (width === 30 && height === 2) {
			const marker = enemyHealthBarFills.length === 0 ? enemyHealthBarFill : createOverlayMarker();
			Object.assign(marker, { x, y, scaleX: 1, scaleY: 1, visible: true });
			enemyHealthBarFills.push(marker);
			return marker;
		}

		if (width === 18 && height === 18 && color === 0xfff0a8) {
			Object.assign(attackFlash, { x, y, scaleX: 1, scaleY: 1, visible: true });
			return attackFlash;
		}

		Object.assign(victoryOverlay, { x, y, scaleX: 1, scaleY: 1, visible: true });
		return victoryOverlay;
	}

	class SceneMock {
		scene = { start: vi.fn(), restart: vi.fn() };
		private sceneEventListeners = new Map<
			string,
			Set<{ callback: (...args: unknown[]) => void; once: boolean }>
		>();
		private loadListeners = new Map<
			string,
			Set<{ callback: (...args: unknown[]) => void; once: boolean }>
		>();
		load = {
			image: vi.fn(),
			on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
				const listeners = this.loadListeners.get(event) ?? new Set();
				listeners.add({ callback, once: false });
				this.loadListeners.set(event, listeners);
			}),
			once: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
				const listeners = this.loadListeners.get(event) ?? new Set();
				listeners.add({ callback, once: true });
				this.loadListeners.set(event, listeners);
			}),
			off: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
				const listeners = this.loadListeners.get(event);
				for (const listener of listeners ?? []) {
					if (listener.callback === callback) {
						listeners!.delete(listener);
					}
				}
			}),
			emit: (event: string, ...args: unknown[]) => {
				const listeners = this.loadListeners.get(event);
				for (const listener of [...(listeners ?? [])]) {
					listener.callback(...args);
					if (listener.once) {
						listeners!.delete(listener);
					}
				}
			},
			listenerCount: (event: string) => this.loadListeners.get(event)?.size ?? 0
		};
		game = { renderer };
		events = {
			once: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
				const listeners = this.sceneEventListeners.get(event) ?? new Set();
				listeners.add({ callback, once: true });
				this.sceneEventListeners.set(event, listeners);
			}),
			emit: (event: string, ...args: unknown[]) => {
				const listeners = this.sceneEventListeners.get(event);
				for (const listener of [...(listeners ?? [])]) {
					listener.callback(...args);
					if (listener.once) {
						listeners!.delete(listener);
					}
				}
			},
			listenerCount: (event: string) => this.sceneEventListeners.get(event)?.size ?? 0
		};
		anims = {
			exists: vi.fn(() => false),
			create: vi.fn(),
			generateFrameNames: vi.fn((_key: string, config: { frames: string[] }) => config.frames)
		};
		scale = {
			width: 640,
			height: 360,
			on: vi.fn(),
			off: vi.fn()
		};
		add = {
			arc: vi.fn((x: number, y: number) => {
				const marker = hitImpactMarkers[nextHitImpactMarkerIndex] ?? createOverlayMarker();
				if (!hitImpactMarkers[nextHitImpactMarkerIndex]) {
					hitImpactMarkers.push(marker);
				}
				nextHitImpactMarkerIndex += 1;
				Object.assign(marker, { x, y, alpha: 1, scaleX: 1, scaleY: 1, visible: true });
				return marker;
			}),
			circle: vi.fn((x: number, y: number) => {
				const marker = createOverlayMarker();
				Object.assign(marker, { x, y, alpha: 1, scaleX: 1, scaleY: 1, visible: true });
				(marker as unknown as { setStrokeStyle: ReturnType<typeof vi.fn> }).setStrokeStyle = vi.fn(
					() => marker
				);
				(marker as unknown as { setDepth: ReturnType<typeof vi.fn> }).setDepth = vi.fn(
					() => marker
				);
				return marker;
			}),
			graphics: vi.fn(createGraphics),
			image: vi.fn(createImage),
			tileSprite: vi.fn(createTileSprite),
			sprite: vi.fn(createImage),
			rectangle: vi.fn(createRectangle),
			text: vi.fn(() => victoryText)
		};
		tweens = {
			add: vi.fn((config: { onComplete?: () => void }) => {
				config.onComplete?.();
				// Return a Tween-like stub with pause/resume so discovery-marker pulse tweens
				// can be paused/resumed alongside visibility in updateDiscoveryMarkers().
				return { pause: vi.fn(), resume: vi.fn() };
			})
		};
		cameras = {
			main: mainCamera
		};
		make = {
			tilemap: vi.fn(() => tilemap)
		};
		input = {
			keyboard: {
				createCursorKeys: vi.fn(() => cursorKeys),
				addKeys: vi.fn(() => wasdKeys),
				addKey: vi.fn((code: string) => getInteractKey(code))
			}
		};
		textures = {
			exists: vi.fn((key: string) => !missingTextureKeys.has(key)),
			get: vi.fn(
				(key: string) =>
					regionalBackgroundTextureMocks.get(key) ??
					(key === regionalBackgroundTextureKey ? regionalBackgroundTextureMock : textureMock)
			)
		};

		constructor(...args: unknown[]) {
			void args;
		}
	}

	return {
		SceneMock,
		gl,
		renderer,
		cursorKeys,
		wasdKeys,
		interactKeys,
		playerMarker,
		enemyMarker,
		enemyMarkers,
		enemyHealthBarBg,
		enemyHealthBarFill,
		hitImpactArc: hitImpactMarkers[0],
		hitImpactSpark: hitImpactMarkers[1],
		hitImpactRing: hitImpactMarkers[2],
		hitImpactCore: hitImpactMarkers[3],
		hitImpactMarkers,
		enemyHealthBarBgs,
		enemyHealthBarFills,
		attackFlash,
		victoryText,
		textureMock,
		regionalBackgroundTextureMock,
		regionalBackgroundTextureMocks,
		imageCreationFailureKeys,
		postCreationFailureKeys,
		missingTextureKeys,
		tilemap,
		tilemapLayer,
		mainCamera,
		graphicsMarkers,
		imageMarkers,
		tileSpriteMarkers,
		reset() {
			Object.assign(mainCamera, { width: 640, height: 360, scrollX: 0, scrollY: 0, zoom: 1 });
			mainCamera.shake.mockClear();
			mainCamera.setBackgroundColor.mockClear();
			mainCamera.setBounds.mockClear();
			mainCamera.setZoom.mockClear();
			mainCamera.startFollow.mockClear();
			Object.assign(playerMarker, { x: 0, y: 0, frame: undefined, visible: true });
			Object.assign(enemyMarker, { x: 0, y: 0, frame: undefined, visible: true });
			enemyMarkers.splice(0, enemyMarkers.length);
			enemyHealthBarBgs.splice(0, enemyHealthBarBgs.length);
			enemyHealthBarFills.splice(0, enemyHealthBarFills.length);
			imageMarkers.splice(0, imageMarkers.length);
			tileSpriteMarkers.splice(0, tileSpriteMarkers.length);
			graphicsMarkers.splice(0, graphicsMarkers.length);
			nextHitImpactMarkerIndex = 0;
			playerMarker.setDisplaySize.mockClear();
			playerMarker.clearTint.mockClear();
			playerMarker.setTint.mockClear();
			playerMarker.setVisible.mockReset();
			playerMarker.play.mockReset();
			playerMarker.once.mockReset();
			enemyMarker.setDisplaySize.mockClear();
			enemyMarker.clearTint.mockClear();
			enemyMarker.setVisible.mockReset();
			enemyMarker.setTint.mockReset();
			enemyMarker.play.mockReset();
			enemyMarker.once.mockReset();
			Object.assign(enemyHealthBarBg, { x: 0, y: 0, scaleX: 1, scaleY: 1, visible: true });
			Object.assign(enemyHealthBarFill, { x: 0, y: 0, scaleX: 1, scaleY: 1, visible: true });
			Object.assign(attackFlash, { x: 0, y: 0, scaleX: 1, scaleY: 1, visible: true });
			for (const marker of hitImpactMarkers) {
				Object.assign(marker, { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, visible: true });
				marker.setPosition.mockReset();
				marker.setScale.mockReset();
				marker.setOrigin.mockReset();
				marker.setAlpha.mockReset();
				marker.setVisible.mockReset();
				marker.destroy.mockReset();
			}
			enemyHealthBarBg.setPosition.mockReset();
			enemyHealthBarBg.setScale.mockReset();
			enemyHealthBarBg.setOrigin.mockReset();
			enemyHealthBarBg.setVisible.mockReset();
			enemyHealthBarFill.setPosition.mockReset();
			enemyHealthBarFill.setScale.mockReset();
			enemyHealthBarFill.setOrigin.mockReset();
			enemyHealthBarFill.setVisible.mockReset();
			attackFlash.setPosition.mockReset();
			attackFlash.setScale.mockReset();
			attackFlash.setOrigin.mockReset();
			attackFlash.setVisible.mockReset();
			textureMock.has.mockClear();
			textureMock.add.mockClear();
			regionalBackgroundTextureMock.key = regionalBackgroundTextureKey;
			regionalBackgroundTextureMock.source[0] = { width: 1792, height: 1536 };
			regionalBackgroundTextureMock.get.mockClear();
			regionalBackgroundTextureMocks.clear();
			regionalBackgroundTextureMocks.set('sundrop-village-foreground', {
				key: 'sundrop-village-foreground',
				source: [{ width: 1792, height: 1536 }],
				get: vi.fn(() => ({ cutWidth: 1792, cutHeight: 1536 }))
			});
			imageCreationFailureKeys.clear();
			postCreationFailureKeys.clear();
			missingTextureKeys.clear();
			tilemap.addTilesetImage.mockClear();
			tilemap.createLayer.mockClear();
			tilemapLayer.setDepth.mockClear();
			victoryText.setOrigin.mockReset();
			renderer.type = 2;
			gl.getParameter.mockReset();
			gl.getParameter.mockReturnValue(4096);
		}
	};
});

vi.mock('phaser', () => {
	const runtime = {
		Scene: phaserState.SceneMock,
		AUTO: 0,
		CANVAS: 1,
		WEBGL: 2,
		Math: {
			Distance: {
				Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1)
			}
		},
		Input: {
			Keyboard: {
				KeyCodes: {
					A: 'A',
					D: 'D',
					W: 'W',
					S: 'S',
					E: 'E',
					SPACE: 'SPACE',
					ENTER: 'ENTER'
				},
				JustDown: vi.fn((key: { justDown?: boolean }) => {
					const result = Boolean(key.justDown);
					key.justDown = false;
					return result;
				})
			}
		}
	};

	return {
		...runtime,
		default: runtime
	};
});

vi.mock('$lib/game/content/backgrounds/map-background-registry', async () => {
	const actual = await vi.importActual<
		typeof import('$lib/game/content/backgrounds/map-background-registry')
	>('$lib/game/content/backgrounds/map-background-registry');

	return {
		...actual,
		MAP_BACKGROUND_PACKAGE_REGISTRY: Object.freeze([
			...actual.MAP_BACKGROUND_PACKAGE_REGISTRY,
			registryDrivenBackgroundRegistryMock.packageDefinition
		]),
		MAP_BACKGROUND_DEFAULT_SELECTIONS: Object.freeze({
			...actual.MAP_BACKGROUND_DEFAULT_SELECTIONS,
			'scene-registry-default-test': registryDrivenBackgroundRegistryMock.defaultSelection
		})
	};
});

function installHudCommandTarget() {
	const globalWithWindow = globalThis as typeof globalThis & { window?: EventTarget };
	const hadWindow = Object.prototype.hasOwnProperty.call(globalWithWindow, 'window');
	const previousWindow = globalWithWindow.window;
	const target = new EventTarget();

	Object.defineProperty(globalWithWindow, 'window', {
		configurable: true,
		value: target
	});

	return {
		target,
		dispatch(command: HudCommand) {
			target.dispatchEvent(new CustomEvent(HUD_COMMAND_EVENT, { detail: command }));
		},
		restore() {
			if (hadWindow) {
				Object.defineProperty(globalWithWindow, 'window', {
					configurable: true,
					value: previousWindow
				});
				return;
			}

			Reflect.deleteProperty(globalWithWindow, 'window');
		}
	};
}

function installLocationSearch(search: string) {
	const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
	Object.defineProperty(globalThis, 'location', {
		configurable: true,
		value: { search }
	});

	return () => {
		if (previousLocation) {
			Object.defineProperty(globalThis, 'location', previousLocation);
		} else {
			Reflect.deleteProperty(globalThis, 'location');
		}
	};
}

const COMPLETE_PAINTED_BACKGROUND_TARGETS = [
	['northwest', 'meadow-entry-painted-v2-complete-northwest-base-image'] as const,
	['northeast', 'meadow-entry-painted-v2-complete-northeast-base-image'] as const,
	['southwest', 'meadow-entry-painted-v2-complete-southwest-base-image'] as const,
	['southeast', 'meadow-entry-painted-v2-complete-southeast-base-image'] as const
];

const COMPLETE_PAINTED_FAULT_CASES = [
	[
		'missing texture',
		(key: string) => phaserState.missingTextureKeys.add(key),
		'missing-texture',
		false
	] as const,
	[
		'wrong dimensions',
		(key: string) => {
			phaserState.regionalBackgroundTextureMocks.get(key)!.source[0] = {
				width: 1,
				height: 1
			};
		},
		'invalid-dimensions',
		false
	] as const,
	['injected render failure', () => {}, 'render-failed', true] as const
];

const COMPLETE_PAINTED_FAULT_MATRIX = COMPLETE_PAINTED_BACKGROUND_TARGETS.flatMap(
	([targetLabel, targetId]) =>
		COMPLETE_PAINTED_FAULT_CASES.map(
			([faultLabel, arrange, status, fault]) =>
				[targetLabel, targetId, faultLabel, arrange, status, fault] as const
		)
);

describe('BootScene', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('uses the generic map-keyed default registry for approved maps', () => {
		expect(MAP_BACKGROUND_DEFAULT_SELECTIONS['meadow-entry']).toEqual({
			packageId: 'meadow-entry-painted-v2-complete',
			mode: 'production'
		});
		expect(MAP_BACKGROUND_DEFAULT_SELECTIONS['hero-house']).toEqual({
			packageId: 'hero-house-painted',
			mode: 'production'
		});
	});

	it('starts the world scene on the opening map', async () => {
		const { BootScene } = await import('./BootScene');
		const { WorldScene } = await import('./WorldScene');
		const { openingMapId } = await import('$lib/game/content/maps');
		const scene = new BootScene();

		scene.create();

		expect(scene.scene.start).toHaveBeenCalledWith(WorldScene.key, { mapId: openingMapId });
	});

	it('preloads the static and animation sheets', async () => {
		const {
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
		} = await import('$lib/game/content/assets');
		const { BootScene } = await import('./BootScene');
		const scene = new BootScene();

		scene.preload();

		expect(scene.load.on).toHaveBeenCalledWith('loaderror', expect.any(Function));
		expect(scene.load.image).toHaveBeenCalledWith(starterPackAsset.key, starterPackAsset.path);
		expect(scene.load.image).toHaveBeenCalledWith(animationPackAsset.key, animationPackAsset.path);
		expect(scene.load.image).toHaveBeenCalledWith(npcPackAsset.key, npcPackAsset.path);
		expect(scene.load.image).toHaveBeenCalledWith(
			villageBuildingAsset.key,
			villageBuildingAsset.path
		);
		expect(scene.load.image).toHaveBeenCalledWith(
			forestDressingAsset.key,
			forestDressingAsset.path
		);
		expect(scene.load.image).toHaveBeenCalledWith(fenceDressingAsset.key, fenceDressingAsset.path);
		expect(scene.load.image).toHaveBeenCalledWith(interiorPropAsset.key, interiorPropAsset.path);
		expect(scene.load.image).toHaveBeenCalledWith(
			environmentDressingAsset.key,
			environmentDressingAsset.path
		);
		expect(scene.load.image).toHaveBeenCalledWith(terrainTilesAsset.key, terrainTilesAsset.path);
		expect(scene.load.image).toHaveBeenCalledWith(coastDressingAsset.key, coastDressingAsset.path);
		expect(scene.load.image).toHaveBeenCalledWith(
			shrineDressingAsset.key,
			shrineDressingAsset.path
		);
		expect(scene.load.image).toHaveBeenCalledWith(marshDressingAsset.key, marshDressingAsset.path);
		expect(scene.load.image).toHaveBeenCalledWith(
			crossroadsDressingAsset.key,
			crossroadsDressingAsset.path
		);
		expect(scene.load.image).toHaveBeenCalledWith(
			villageDressingAsset.key,
			villageDressingAsset.path
		);
		expect(scene.load.image).toHaveBeenCalledWith(villageHedgeAsset.key, villageHedgeAsset.path);
		for (const asset of Object.values(battleBackgroundAssets)) {
			expect(scene.load.image).toHaveBeenCalledWith(asset.key, asset.path);
		}
	});

	it('does not preload regional backgrounds when the painted default is explicitly off', async () => {
		const restoreLocation = installLocationSearch('?meadowPaintedPilot=off');
		const { BootScene } = await import('./BootScene');
		const scene = new BootScene();

		try {
			scene.preload();

			expect(scene.load.image).not.toHaveBeenCalledWith(
				expect.anything(),
				expect.stringContaining('/game/assets/regions/')
			);
		} finally {
			restoreLocation();
		}
	});

	it('preloads the complete Meadow package by default and emits exact renderer evidence', async () => {
		const restoreLocation = installLocationSearch('');
		const target = installHudCommandTarget();
		const diagnostics: RegionalBackgroundRendererDiagnostic[] = [];
		const { MEADOW_ENTRY_PAINTED_MODE_COMPLETE } =
			await import('$lib/game/content/backgrounds/meadow-entry-painted-v2-runtime');
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const interiorPackages = VILLAGE_INTERIOR_PACKAGES;
		const interiorAssets = interiorPackages.flatMap(({ assets }) => assets);
		const interiorPackageIds = interiorPackages.map(({ id }) => id);
		const { REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT } =
			await import('$lib/game/phaser/renderer-diagnostics');
		target.target.addEventListener(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT, (event) => {
			diagnostics.push((event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail);
		});
		const scene = new (await import('./BootScene')).BootScene();

		try {
			scene.preload();

			const regionalCalls = vi
				.mocked(scene.load.image)
				.mock.calls.filter(([, path]) => String(path).includes('/game/assets/regions/'));
			expect(regionalCalls).toEqual(
				MEADOW_ENTRY_PAINTED_MODE_COMPLETE.assets.map(({ key, path }) => [key, path])
			);
			const interiorCalls = vi
				.mocked(scene.load.image)
				.mock.calls.filter(([, path]) => String(path).includes('/game/assets/interiors/'));
			expect(interiorCalls).toEqual(interiorAssets.map(({ key, path }) => [key, path]));
			for (const asset of MEADOW_ENTRY_PAINTED_MODE_COMPLETE.assets) {
				scene.load.emit('filecomplete', asset.key, 'image', {});
			}
			for (const asset of interiorAssets) {
				scene.load.emit('filecomplete', asset.key, 'image', {});
			}
			scene.load.emit('complete');

			expect(diagnostics).toEqual([
				{
					renderer: 'webgl',
					packageIds: [...interiorPackageIds, 'meadow-entry-painted-v2-complete'].sort(),
					requiredAssetKeys: [
						...MEADOW_ENTRY_PAINTED_MODE_COMPLETE.assets.map(({ key }) => key),
						...interiorAssets.map(({ key }) => key)
					].sort(),
					completedAssetKeys: [
						...MEADOW_ENTRY_PAINTED_MODE_COMPLETE.assets.map(({ key }) => key),
						...interiorAssets.map(({ key }) => key)
					].sort(),
					maxTextureSize: 4096,
					regionalBackgroundLoadMs: expect.any(Number)
				}
			]);
		} finally {
			target.restore();
			restoreLocation();
		}
	});

	it('preloads each complete Meadow texture exactly once for the exact review query', async () => {
		const restoreLocation = installLocationSearch(
			'?mapBackgroundReview=meadow-entry-painted-v2-complete'
		);
		const { MEADOW_ENTRY_PAINTED_MODE_COMPLETE } =
			await import('$lib/game/content/backgrounds/meadow-entry-painted-v2-runtime');
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const interiorPackages = VILLAGE_INTERIOR_PACKAGES;
		const interiorAssets = interiorPackages.flatMap(({ assets }) => assets);
		const interiorPackageIds = interiorPackages.map(({ id }) => id);
		const { REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT } =
			await import('$lib/game/phaser/renderer-diagnostics');
		const target = installHudCommandTarget();
		const diagnostics: RegionalBackgroundRendererDiagnostic[] = [];
		target.target.addEventListener(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT, (event) => {
			diagnostics.push((event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail);
		});
		const { BootScene } = await import('./BootScene');
		const scene = new BootScene();

		try {
			scene.preload();

			const regionalCalls = vi
				.mocked(scene.load.image)
				.mock.calls.filter(([, path]) => String(path).includes('/game/assets/regions/'));
			expect(regionalCalls).toEqual(
				MEADOW_ENTRY_PAINTED_MODE_COMPLETE.assets.map(({ key, path }) => [key, path])
			);
			expect(new Set(regionalCalls.map(([key]) => key)).size).toBe(4);
			const interiorCalls = vi
				.mocked(scene.load.image)
				.mock.calls.filter(([, path]) => String(path).includes('/game/assets/interiors/'));
			expect(interiorCalls).toEqual(interiorAssets.map(({ key, path }) => [key, path]));
			expect(new Set(interiorCalls.map(([key]) => key)).size).toBe(interiorAssets.length);

			for (const asset of MEADOW_ENTRY_PAINTED_MODE_COMPLETE.assets) {
				scene.load.emit('filecomplete', asset.key, 'image', {});
			}
			for (const asset of interiorAssets) {
				scene.load.emit('filecomplete', asset.key, 'image', {});
			}
			scene.load.emit('complete');

			expect(diagnostics[0]).toMatchObject({
				packageIds: [...interiorPackageIds, 'meadow-entry-painted-v2-complete'].sort(),
				requiredAssetKeys: [
					...MEADOW_ENTRY_PAINTED_MODE_COMPLETE.assets.map(({ key }) => key),
					...interiorAssets.map(({ key }) => key)
				].sort(),
				completedAssetKeys: [
					...MEADOW_ENTRY_PAINTED_MODE_COMPLETE.assets.map(({ key }) => key),
					...interiorAssets.map(({ key }) => key)
				].sort()
			});
		} finally {
			target.restore();
			restoreLocation();
		}
	});

	it('gives regional-background off priority over pilot preload and emits a deliberate zero completion', async () => {
		const restoreLocation = installLocationSearch('?meadowPaintedPilot=on&regionalBackground=off');
		const target = installHudCommandTarget();
		const diagnostics: RegionalBackgroundRendererDiagnostic[] = [];
		const { REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT } =
			await import('$lib/game/phaser/renderer-diagnostics');
		target.target.addEventListener(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT, (event) => {
			diagnostics.push((event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail);
		});
		const scene = new (await import('./BootScene')).BootScene();

		try {
			scene.preload();
			scene.load.emit(
				'filecomplete',
				'meadow-entry-painted-v2-crossroads-camera-base',
				'image',
				{}
			);
			scene.load.emit('complete');

			expect(scene.load.image).not.toHaveBeenCalledWith(
				expect.anything(),
				expect.stringContaining('/game/assets/regions/')
			);
			expect(diagnostics[0]).toMatchObject({
				packageIds: [],
				requiredAssetKeys: [],
				completedAssetKeys: [],
				regionalBackgroundLoadMs: null
			});
		} finally {
			target.restore();
			restoreLocation();
		}
	});

	it('emits WebGL renderer evidence with one maximum-texture-size query', async () => {
		const restoreLocation = installLocationSearch('?meadowPaintedPilot=off');
		const { REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT } =
			await import('$lib/game/phaser/renderer-diagnostics');
		const { BootScene } = await import('./BootScene');
		const target = installHudCommandTarget();
		const now = vi.spyOn(performance, 'now');
		now.mockReturnValueOnce(10).mockReturnValueOnce(25);
		const diagnostics: RegionalBackgroundRendererDiagnostic[] = [];
		target.target.addEventListener(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT, (event) => {
			diagnostics.push((event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail);
		});
		const scene = new BootScene();

		try {
			scene.preload();
			scene.load.emit('complete');

			expect(phaserState.gl.getParameter).toHaveBeenCalledOnce();
			expect(phaserState.gl.getParameter).toHaveBeenCalledWith(phaserState.gl.MAX_TEXTURE_SIZE);
			expect(diagnostics).toEqual([
				{
					renderer: 'webgl',
					packageIds: [],
					requiredAssetKeys: [],
					completedAssetKeys: [],
					maxTextureSize: 4096,
					regionalBackgroundLoadMs: null
				}
			]);
		} finally {
			restoreLocation();
			now.mockRestore();
			target.restore();
		}
	});

	it('reports null maxTextureSize when the WebGL query throws', async () => {
		const restoreLocation = installLocationSearch('?meadowPaintedPilot=off');
		const { REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT } =
			await import('$lib/game/phaser/renderer-diagnostics');
		const { BootScene } = await import('./BootScene');
		const target = installHudCommandTarget();
		const now = vi.spyOn(performance, 'now');
		now.mockReturnValueOnce(10).mockReturnValueOnce(25);
		const diagnostics: RegionalBackgroundRendererDiagnostic[] = [];
		target.target.addEventListener(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT, (event) => {
			diagnostics.push((event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail);
		});
		const scene = new BootScene();
		phaserState.gl.getParameter = vi.fn(() => {
			throw new Error('WebGL context lost');
		});

		try {
			scene.preload();
			scene.load.emit('complete');

			expect(diagnostics).toEqual([
				{
					renderer: 'webgl',
					packageIds: [],
					requiredAssetKeys: [],
					completedAssetKeys: [],
					maxTextureSize: null,
					regionalBackgroundLoadMs: null
				}
			]);
		} finally {
			restoreLocation();
			phaserState.gl.getParameter = vi.fn(() => 4096);
			now.mockRestore();
			target.restore();
		}
	});

	it('reports Canvas with no texture limit without touching WebGL', async () => {
		const restoreLocation = installLocationSearch('?meadowPaintedPilot=off');
		const { REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT } =
			await import('$lib/game/phaser/renderer-diagnostics');
		const { BootScene } = await import('./BootScene');
		const target = installHudCommandTarget();
		const now = vi.spyOn(performance, 'now');
		now.mockReturnValueOnce(5).mockReturnValueOnce(9);
		const diagnostics: RegionalBackgroundRendererDiagnostic[] = [];
		target.target.addEventListener(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT, (event) => {
			diagnostics.push((event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail);
		});
		phaserState.renderer.type = 1;
		const scene = new BootScene();

		try {
			scene.preload();
			scene.load.emit('complete');

			expect(phaserState.gl.getParameter).not.toHaveBeenCalled();
			expect(diagnostics).toEqual([
				{
					renderer: 'canvas',
					packageIds: [],
					requiredAssetKeys: [],
					completedAssetKeys: [],
					maxTextureSize: null,
					regionalBackgroundLoadMs: null
				}
			]);
		} finally {
			restoreLocation();
			phaserState.renderer.type = 2;
			now.mockRestore();
			target.restore();
		}
	});

	it('reports zero regional completions when the catalog is empty', async () => {
		const restoreLocation = installLocationSearch('?meadowPaintedPilot=off');
		const { REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT } =
			await import('$lib/game/phaser/renderer-diagnostics');
		const { BootScene } = await import('./BootScene');
		const target = installHudCommandTarget();
		const now = vi.spyOn(performance, 'now');
		const diagnostics: RegionalBackgroundRendererDiagnostic[] = [];
		target.target.addEventListener(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT, (event) => {
			diagnostics.push((event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail);
		});
		phaserState.renderer.type = 2;
		const scene = new BootScene();

		try {
			scene.preload();
			scene.load.emit('filecomplete', 'unrelated-image', 'image', {});
			scene.load.emit('complete');

			expect(diagnostics).toEqual([
				{
					renderer: 'webgl',
					packageIds: [],
					requiredAssetKeys: [],
					completedAssetKeys: [],
					maxTextureSize: 4096,
					regionalBackgroundLoadMs: null
				}
			]);
		} finally {
			restoreLocation();
			now.mockRestore();
			target.restore();
		}
	});

	it('emits once per loader completion lifecycle and removes regional completion bookkeeping', async () => {
		const { REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT } =
			await import('$lib/game/phaser/renderer-diagnostics');
		const { BootScene } = await import('./BootScene');
		const target = installHudCommandTarget();
		const now = vi.spyOn(performance, 'now');
		now.mockReturnValueOnce(3).mockReturnValueOnce(7);
		const diagnostics: RegionalBackgroundRendererDiagnostic[] = [];
		target.target.addEventListener(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT, (event) => {
			diagnostics.push((event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail);
		});
		const scene = new BootScene();

		try {
			scene.preload();
			scene.load.emit('complete');
			scene.load.emit('complete');

			expect(diagnostics).toHaveLength(1);
			expect(scene.load.listenerCount('complete')).toBe(0);
			expect(scene.load.listenerCount('filecomplete')).toBe(0);
		} finally {
			now.mockRestore();
			target.restore();
		}
	});

	it('keeps regional timing null when no active background fails', async () => {
		const restoreLocation = installLocationSearch('?meadowPaintedPilot=off');
		const { REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT } =
			await import('$lib/game/phaser/renderer-diagnostics');
		const { BootScene } = await import('./BootScene');
		const target = installHudCommandTarget();
		const now = vi.spyOn(performance, 'now');
		now.mockReturnValueOnce(10).mockReturnValueOnce(30);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const diagnostics: RegionalBackgroundRendererDiagnostic[] = [];
		target.target.addEventListener(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT, (event) => {
			diagnostics.push((event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail);
		});
		const scene = new BootScene();

		try {
			scene.preload();
			scene.load.emit('complete');

			expect(diagnostics[0]?.regionalBackgroundLoadMs).toBeNull();
			expect(diagnostics[0]?.completedAssetKeys).toEqual([]);
		} finally {
			restoreLocation();
			error.mockRestore();
			now.mockRestore();
			target.restore();
		}
	});

	it('reports null timing and zero completions when no regional background is registered', async () => {
		const restoreLocation = installLocationSearch('?meadowPaintedPilot=off');
		const assetsModule = await import('$lib/game/content/assets');
		const { REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT } =
			await import('$lib/game/phaser/renderer-diagnostics');
		const { BootScene } = await import('./BootScene');
		const mutableAssets = assetsModule.regionalBackgroundAssets as unknown as Array<{
			key: string;
			path: string;
		}>;
		const savedAssets = [...mutableAssets];
		mutableAssets.splice(0, mutableAssets.length);
		const target = installHudCommandTarget();
		const now = vi.spyOn(performance, 'now');
		const diagnostics: RegionalBackgroundRendererDiagnostic[] = [];
		target.target.addEventListener(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT, (event) => {
			diagnostics.push((event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail);
		});
		const scene = new BootScene();

		try {
			scene.preload();
			scene.load.emit('complete');

			expect(now).not.toHaveBeenCalled();
			expect(diagnostics[0]?.regionalBackgroundLoadMs).toBeNull();
			expect(diagnostics[0]?.completedAssetKeys).toEqual([]);
		} finally {
			restoreLocation();
			mutableAssets.push(...savedAssets);
			now.mockRestore();
			target.restore();
		}
	});

	it('skips queueing regional backgrounds when the URL disables them', async () => {
		const { BootScene } = await import('./BootScene');
		const previousLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
		Object.defineProperty(globalThis, 'location', {
			configurable: true,
			value: { search: '?regionalBackground=off' }
		});

		try {
			const scene = new BootScene();

			scene.preload();

			expect(scene.load.image).not.toHaveBeenCalledWith(
				expect.anything(),
				expect.stringContaining('/game/assets/regions/')
			);
		} finally {
			if (previousLocation) {
				Object.defineProperty(globalThis, 'location', previousLocation);
			} else {
				Reflect.deleteProperty(globalThis, 'location');
			}
		}
	});
});

describe('BattleScene', () => {
	beforeEach(() => {
		localeState.activeLocale = 'en';
		vi.clearAllMocks();
		phaserState.reset();
		Object.assign(phaserState.cursorKeys.left, { isDown: false });
		Object.assign(phaserState.cursorKeys.right, { isDown: false });
		Object.assign(phaserState.cursorKeys.up, { isDown: false });
		Object.assign(phaserState.cursorKeys.down, { isDown: false });
		Object.assign(phaserState.wasdKeys.left, { isDown: false });
		Object.assign(phaserState.wasdKeys.right, { isDown: false });
		Object.assign(phaserState.wasdKeys.up, { isDown: false });
		Object.assign(phaserState.wasdKeys.down, { isDown: false });
	});

	it('spawns real generated enemies around the larger battle arena', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		const saveState = createNewSaveState();

		scene.create({
			saveState,
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 4,
			hero: { hp: 20, maxHp: 20, attack: 4, defense: 0 }
		});

		const state = scene as unknown as {
			enemies: Array<{ unitId: string; hp: number; defeated: boolean; x: number; y: number }>;
		};

		expect(state.enemies).toHaveLength(4);
		expect(state.enemies.map((enemy) => enemy.unitId)).toEqual([
			'meadow-slime-west:unit:0',
			'meadow-slime-west:unit:1',
			'meadow-slime-west:unit:2',
			'meadow-slime-west:unit:3'
		]);
		expect(state.enemies.every((enemy) => enemy.hp === 8 && !enemy.defeated)).toBe(true);
		expect(state.enemies.map((enemy) => ({ x: enemy.x, y: enemy.y }))).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ x: 448 }),
				expect.objectContaining({ y: 74 }),
				expect.objectContaining({ x: 790 }),
				expect.objectContaining({ x: 106 })
			])
		);
		expect(phaserState.enemyMarkers).toHaveLength(4);
		expect(phaserState.enemyHealthBarBgs).toHaveLength(4);
		expect(phaserState.enemyHealthBarFills).toHaveLength(4);
	});

	it('centers the larger arena when the canvas matches the arena size', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		Object.assign(scene.scale, { width: 896, height: 504 });

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 4, defense: 0 }
		});

		expect(phaserState.mainCamera.setZoom).toHaveBeenCalledWith(1);
		expect(phaserState.mainCamera.scrollX).toBe(0);
		expect(phaserState.mainCamera.scrollY).toBe(0);
	});

	it('offsets the camera to center the larger arena on a larger canvas', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		Object.assign(scene.scale, { width: 1280, height: 720 });

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 4, defense: 0 }
		});

		expect(phaserState.mainCamera.setZoom).toHaveBeenCalledWith(1);
		expect(phaserState.mainCamera.scrollX).toBe(-192);
		expect(phaserState.mainCamera.scrollY).toBe(-108);
	});

	it('renders a ruins battle backdrop before actors', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'ruins-core',
			sourceEncounterId: 'ruins-warden',
			sourceEnemyId: 'ruins-warden',
			returnPosition: { mapId: 'ruins-core', x: 4_992, y: 3_200, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 4, defense: 0 }
		});

		expect(scene.add.image).toHaveBeenCalledWith(448, 252, battleBackgroundAssets.ruins.key);
		expect(phaserState.imageMarkers[0]?.setDisplaySize).toHaveBeenCalledWith(896, 504);
		expect(vi.mocked(scene.add.image).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(scene.add.sprite).mock.invocationCallOrder[0]!
		);
	});

	it('registers a resize listener that re-centers the arena', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 4, defense: 0 }
		});

		expect(scene.scale.on).toHaveBeenCalledWith('resize', expect.any(Function));
		const scaleOnMock = scene.scale.on as unknown as import('vitest').Mock;
		const resizeCalls = scaleOnMock.mock.calls as Array<[string, () => void]>;
		const resizeHandler = resizeCalls.find((call) => call[0] === 'resize')?.[1];
		expect(resizeHandler).toBeTypeOf('function');

		Object.assign(scene.scale, { width: 960, height: 540 });
		resizeHandler!();

		expect(phaserState.mainCamera.scrollX).toBe(-32);
		expect(phaserState.mainCamera.scrollY).toBe(-18);
	});

	it('zooms out to fit the full arena on a canvas smaller than the arena', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		Object.assign(scene.scale, { width: 640, height: 360 });

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 4,
			hero: { hp: 20, maxHp: 20, attack: 4, defense: 0 }
		});

		expect(phaserState.mainCamera.setZoom).toHaveBeenCalled();
		const zoomArg = vi.mocked(phaserState.mainCamera.setZoom).mock.calls[0]![0];
		expect(zoomArg).toBeCloseTo(640 / 896, 5);
		expect(zoomArg).toBeCloseTo(360 / 504, 5);
		expect(phaserState.mainCamera.scrollX).toBe(0);
		expect(phaserState.mainCamera.scrollY).toBe(0);
	});

	it('produces a victory result after all generated enemies are defeated', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		const saveState = createNewSaveState();

		scene.create({
			saveState,
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 2,
			hero: { hp: 20, maxHp: 20, attack: 8, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number; hp: number }>;
			pendingResult: unknown;
		};
		state.enemies[0]!.x = 330;
		state.enemies[0]!.y = 180;
		state.enemies[1]!.x = 330;
		state.enemies[1]!.y = 190;

		scene.update(0, 16);
		scene.update(200, 16);
		scene.update(500, 16);

		expect(state.pendingResult).toMatchObject({
			outcome: 'victory',
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			finalHeroHp: 18,
			inventory: saveState.inventory,
			defeatedUnits: [
				expect.objectContaining({
					unitId: 'meadow-slime-west:unit:0',
					unitIndex: 0,
					enemyId: 'slime-scout',
					xpReward: 4,
					coinReward: 4
				}),
				expect.objectContaining({
					unitId: 'meadow-slime-west:unit:1',
					unitIndex: 1,
					enemyId: 'slime-scout',
					xpReward: 4,
					coinReward: 4
				})
			]
		});
	});

	it('publishes the applied victory save state in the battle summary HUD', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		const saveState = createNewSaveState();
		saveState.mapId = 'ruins-core';
		saveState.player = {
			...saveState.player,
			level: 1,
			xp: 0,
			hp: 20,
			attack: 9,
			x: 4_992,
			y: 3_200,
			facing: 'down'
		};
		saveState.inventory.equipment = ['training-sword', 'iron-cap', 'traveler-vest'];
		saveState.equipment = { ...saveState.equipment, head: 'iron-cap', body: 'traveler-vest' };
		saveState.wallet = { coins: 30 };
		saveState.quests = {
			entries: {
				'investigate-the-ruins': {
					status: 'active',
					currentObjectiveId: 'defeat-ruins-warden',
					progress: 0,
					rewardApplied: false,
					countedSourceIds: []
				}
			},
			completedObjectives: {
				'investigate-the-ruins': ['talk-to-guild-master']
			}
		};
		localeState.activeLocale = 'ja';

		try {
			scene.create({
				saveState,
				sourceMapId: 'ruins-core',
				sourceEncounterId: 'ruins-warden',
				sourceEnemyId: 'ruins-warden',
				completion: 'victory',
				returnPosition: { mapId: 'ruins-core', x: 4_992, y: 3_200, facing: 'down' },
				enemyCount: 1,
				hero: { hp: 20, maxHp: 20, attack: 50, defense: 0 }
			});
			emitHudStateSpy.mockClear();
			Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
			const state = scene as unknown as {
				enemies: Array<{ x: number; y: number }>;
			};
			state.enemies[0]!.x = 330;
			state.enemies[0]!.y = 180;

			scene.update(0, 16);

			expect(emitHudStateSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({
					hp: 24,
					maxHp: 28,
					level: 2,
					xp: 33,
					attack: 11,
					defense: 1,
					wallet: { coins: 90 },
					heals: 2,
					battle: {
						phase: 'summary',
						summary: expect.objectContaining({
							outcome: 'victory',
							xpGained: 33,
							coinsGained: 60,
							completedQuestTitles: ['JP Investigate the Ruins'],
							drops: expect.arrayContaining([
								expect.objectContaining({ itemId: 'warden-sigil', quantity: 1 }),
								expect.objectContaining({ itemId: 'warden-crown', quantity: 1 }),
								expect.objectContaining({ itemId: 'greater-field-potion', quantity: 1 })
							])
						})
					},
					quests: expect.objectContaining({
						completed: expect.arrayContaining([
							expect.objectContaining({
								questId: 'investigate-the-ruins',
								title: 'JP Investigate the Ruins',
								status: 'completed'
							})
						])
					}),
					inventory: expect.objectContaining({
						consumables: expect.arrayContaining([
							expect.objectContaining({ itemId: 'greater-field-potion', quantity: 1 })
						]),
						equipment: expect.arrayContaining([
							expect.objectContaining({ itemId: 'warden-crown', equipped: false })
						]),
						keyItems: expect.arrayContaining([
							expect.objectContaining({ itemId: 'warden-sigil', quantity: 1 })
						]),
						equipped: expect.objectContaining({ weapon: 'training-sword' })
					})
				})
			);
			expect(saveState.player.level).toBe(1);
			expect(saveState.wallet.coins).toBe(30);
			expect(saveState.inventory.stacks).toEqual([{ itemId: 'field-potion', quantity: 1 }]);
			expect(saveState.quests.entries['investigate-the-ruins']).toMatchObject({
				status: 'active',
				currentObjectiveId: 'defeat-ruins-warden'
			});
		} finally {
			randomSpy.mockRestore();
		}
	});

	it('produces a defeat result when hero HP reaches zero', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		const saveState = createNewSaveState();

		scene.create({
			saveState,
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 1, maxHp: 20, attack: 1, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number; attackCooldownUntil: number }>;
			pendingResult: unknown;
		};
		state.enemies[0]!.x = 320;
		state.enemies[0]!.y = 180;
		state.enemies[0]!.attackCooldownUntil = 0;

		scene.update(0, 16);
		scene.update(120, 16);

		expect(state.pendingResult).toMatchObject({
			outcome: 'defeat',
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			finalHeroHp: 0,
			inventory: saveState.inventory,
			defeatedUnits: []
		});
	});

	it('keeps the hero attack animation locked briefly after striking', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 1, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number }>;
		};
		state.enemies[0]!.x = 330;
		state.enemies[0]!.y = 180;
		phaserState.playerMarker.play.mockClear();

		scene.update(0, 16);
		const callCountAfterStrike = phaserState.playerMarker.play.mock.calls.length;
		phaserState.cursorKeys.right.isDown = true;
		scene.update(16, 16);

		expect(phaserState.playerMarker.play).toHaveBeenCalledWith('hero-attack', false);
		expect(phaserState.playerMarker.play).toHaveBeenCalledTimes(callCountAfterStrike);
	});

	it('plays slash and impact presentation when the hero attacks', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 1, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 448, y: 252 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number }>;
			hitStopUntil: number;
		};
		state.enemies[0]!.x = 458;
		state.enemies[0]!.y = 252;

		scene.update(0, 16);

		expect(scene.add.arc).toHaveBeenCalledWith(453, 252, 24, -55, 55, false, 0xffd166, 0.88);
		expect(scene.add.arc).toHaveBeenCalledWith(458, 252, 16, 0, 360, false, 0xffffff, 0.72);
		expect(phaserState.hitImpactMarkers[0]!.destroy).toHaveBeenCalled();
		expect(phaserState.hitImpactMarkers[1]!.destroy).toHaveBeenCalled();
		expect(phaserState.mainCamera.shake).toHaveBeenCalledWith(80, 0.004);
		expect(scene.tweens.add).toHaveBeenCalled();
		expect(state.hitStopUntil).toBe(110);
	});

	it('skips movement updates during hit-stop but keeps time advancing afterward', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 1, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 448, y: 252 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number }>;
			hitStopUntil: number;
		};
		state.enemies[0]!.x = 458;
		state.enemies[0]!.y = 252;
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 16);
		const xDuringStrike = phaserState.playerMarker.x;
		scene.update(20, 16);

		expect(phaserState.playerMarker.x).toBe(xDuringStrike);
		// Hit-stop now spans the full 110 ms hero lunge (out + yoyo return),
		// so input is still frozen at t=80 — the frame where the lunge tween
		// used to resume overwriting player.x mid-return.
		scene.update(80, 16);
		expect(phaserState.playerMarker.x).toBe(xDuringStrike);
		scene.update(130, 16);
		expect(phaserState.playerMarker.x).toBeGreaterThan(xDuringStrike);
	});

	it('freezes enemy movement on the frame the hero triggers hit-stop', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 1, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 448, y: 252 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number }>;
			hitStopUntil: number;
		};
		// Place enemy within hero attack reach (distance 50 <= 62) but outside enemy
		// chase threshold (50 > 40) so it would normally move on the hit frame.
		state.enemies[0]!.x = 498;
		state.enemies[0]!.y = 252;

		scene.update(0, 16);

		expect(state.hitStopUntil).toBe(110);
		expect(state.enemies[0]!.x).toBe(498);
	});

	it('keeps enemy AI frozen for the full hero lunge return so the lunged sprite cannot trigger a false counterattack', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 1, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 448, y: 252 });
		// Enemy at distance 50 px: inside hero attack reach (50 <= 62) but
		// outside enemy attack reach (50 > 40). With the lunge tween pushing
		// the sprite ~18 px toward the enemy, AI that read the lunged
		// sprite position would see distance ~32 px and counter-attack.
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number; attackCooldownUntil: number }>;
			hero: { hp: number };
			hitStopUntil: number;
		};
		state.enemies[0]!.x = 498;
		state.enemies[0]!.y = 252;
		state.enemies[0]!.attackCooldownUntil = 0;

		scene.update(0, 16);
		expect(state.hitStopUntil).toBe(110);

		const hpAtStrike = state.hero.hp;
		const enemyXAtStrike = state.enemies[0]!.x;

		// t=80 is past the legacy 70 ms hit-stop but still inside the
		// lunge+yoyo window (55 ms out + 55 ms back = 110 ms). AI and the
		// hero's logical position must remain frozen here.
		scene.update(80, 16);

		expect(state.enemies[0]!.x).toBe(enemyXAtStrike);
		expect(state.hero.hp).toBe(hpAtStrike);

		// After the full lunge returns, gameplay resumes.
		scene.update(130, 16);
		// Enemy is still outside its 40 px chase threshold from the hero's
		// logical position, so it should now close in but not yet attack.
		expect(state.enemies[0]!.x).toBeLessThan(enemyXAtStrike);
		expect(state.hero.hp).toBe(hpAtStrike);
	});

	it('keeps enemy attack animation locked briefly after striking the hero', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 1, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number; attackCooldownUntil: number }>;
		};
		state.enemies[0]!.x = 330;
		state.enemies[0]!.y = 180;
		state.enemies[0]!.attackCooldownUntil = 0;
		phaserState.enemyMarker.play.mockClear();

		scene.update(0, 16);
		scene.update(120, 16);
		const callCountAfterStrike = phaserState.enemyMarker.play.mock.calls.length;
		scene.update(136, 16);

		expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('slimeScout-attack', false);
		expect(phaserState.enemyMarker.play).toHaveBeenCalledTimes(callCountAfterStrike);
	});

	it('plays a compact impact pulse when an enemy attacks the hero', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 1, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 448, y: 252 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number; attackCooldownUntil: number }>;
		};
		state.enemies[0]!.x = 448;
		state.enemies[0]!.y = 252;
		state.enemies[0]!.attackCooldownUntil = 0;
		vi.mocked(scene.add.arc).mockClear();

		scene.update(0, 16);
		vi.mocked(scene.add.arc).mockClear();
		scene.update(120, 16);

		expect(scene.add.arc).toHaveBeenCalledWith(448, 252, 12, 0, 360, false, 0xff6b6b, 0.65);
		expect(phaserState.hitImpactMarkers[2]!.destroy).toHaveBeenCalled();
		expect(phaserState.mainCamera.shake).toHaveBeenCalledWith(60, 0.003);
	});

	it('waits for the enemy death animation before hiding the marker and health bars', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 8, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number }>;
		};
		state.enemies[0]!.x = 330;
		state.enemies[0]!.y = 180;

		scene.update(0, 16);

		expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('slimeScout-dead', false);
		expect(phaserState.enemyMarker.once).toHaveBeenCalledWith(
			'animationcomplete-slimeScout-dead',
			expect.any(Function)
		);
		expect(phaserState.enemyMarker.setVisible).not.toHaveBeenCalledWith(false);
		expect(phaserState.enemyHealthBarBg.setVisible).not.toHaveBeenCalledWith(false);
		expect(phaserState.enemyHealthBarFill.setVisible).not.toHaveBeenCalledWith(false);

		const [, completeDeathAnimation] = phaserState.enemyMarker.once.mock.calls[0]!;
		completeDeathAnimation();

		expect(phaserState.enemyMarker.setVisible).toHaveBeenCalledWith(false);
		expect(phaserState.enemyHealthBarBg.setVisible).toHaveBeenCalledWith(false);
		expect(phaserState.enemyHealthBarFill.setVisible).toHaveBeenCalledWith(false);
	});

	it('clears the enemy hit tint after the hit reaction window', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 1, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number }>;
		};
		state.enemies[0]!.x = 330;
		state.enemies[0]!.y = 180;

		scene.update(0, 16);
		state.enemies[0]!.x = 600;
		state.enemies[0]!.y = 180;
		scene.update(451, 16);

		expect(phaserState.enemyMarker.setTint).toHaveBeenCalledWith(0xfff0a8);
		expect(phaserState.enemyMarker.clearTint).toHaveBeenCalled();
	});

	it('registers BattleScene actor animations from the asset registry', async () => {
		const { actorAnimationAssets } = await import('$lib/game/content/assets');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const mutableAssets = actorAnimationAssets as unknown as Record<
			string,
			{
				clips: Record<
					'idle' | 'walk' | 'attack' | 'dead',
					{ key: string; frames: string[]; frameRate: number; repeat: number }
				>;
				displaySize: { width: number; height: number };
				id: string;
			}
		>;

		mutableAssets.sentinelActor = {
			id: 'sentinelActor',
			displaySize: { width: 1, height: 1 },
			clips: {
				idle: { key: 'sentinel-idle', frames: ['heroIdle0'], frameRate: 1, repeat: -1 },
				walk: { key: 'sentinel-walk', frames: ['heroWalk0'], frameRate: 1, repeat: -1 },
				attack: { key: 'sentinel-attack', frames: ['heroAttack0'], frameRate: 1, repeat: 0 },
				dead: { key: 'sentinel-dead', frames: ['heroDead0'], frameRate: 1, repeat: 0 }
			}
		};

		try {
			const scene = new BattleScene();
			scene.create({
				saveState: createNewSaveState(),
				sourceMapId: 'meadow-entry',
				sourceEncounterId: 'meadow-slime-west',
				sourceEnemyId: 'slime-scout',
				returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
				enemyCount: 1,
				hero: { hp: 20, maxHp: 20, attack: 1, defense: 0 }
			});

			expect(scene.anims.create).toHaveBeenCalledWith(
				expect.objectContaining({ key: 'sentinel-idle' })
			);
		} finally {
			delete mutableAssets.sentinelActor;
		}
	});

	it('accepts healing commands and returns the consumed inventory', async () => {
		const hud = installHudCommandTarget();
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		const saveState = {
			...createNewSaveState(),
			inventory: {
				stacks: [{ itemId: 'field-potion', quantity: 1 }],
				equipment: []
			}
		};

		try {
			scene.create({
				saveState,
				sourceMapId: 'meadow-entry',
				sourceEncounterId: 'meadow-slime-west',
				sourceEnemyId: 'slime-scout',
				returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
				enemyCount: 1,
				hero: { hp: 4, maxHp: 20, attack: 8, defense: 0 }
			});
			emitHudStateSpy.mockClear();

			hud.dispatch({ type: 'heal' });

			const state = scene as unknown as {
				hero: { hp: number };
				inventory: { stacks: Array<{ itemId: string; quantity: number }> };
			};
			expect(state.hero.hp).toBe(12);
			expect(state.inventory.stacks).toEqual([]);
			expect(emitHudStateSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({
					hp: 12,
					heals: 0,
					status: 'Recovered HP',
					battle: { phase: 'active', summary: null },
					inventory: expect.objectContaining({ consumables: [] })
				})
			);
		} finally {
			hud.restore();
		}
	});

	it('locks non-battle commands during active battle', async () => {
		const hud = installHudCommandTarget();
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		try {
			scene.create({
				saveState: createNewSaveState(),
				sourceMapId: 'meadow-entry',
				sourceEncounterId: 'meadow-slime-west',
				sourceEnemyId: 'slime-scout',
				returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
				enemyCount: 1,
				hero: { hp: 20, maxHp: 20, attack: 8, defense: 0 }
			});
			emitHudStateSpy.mockClear();

			hud.dispatch({ type: 'save' });

			expect(scene.scene.start).not.toHaveBeenCalled();
			expect(emitHudStateSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({
					status: 'Cannot do that during battle',
					battle: { phase: 'active', summary: null }
				})
			);
		} finally {
			hud.restore();
		}
	});

	it('transitions to WorldScene with pre-battle state and battle result after summary dismissal', async () => {
		const hud = installHudCommandTarget();
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const { WorldScene } = await import('./WorldScene');
		const scene = new BattleScene();
		const saveState = createNewSaveState();

		try {
			scene.create({
				saveState,
				sourceMapId: 'meadow-entry',
				sourceEncounterId: 'meadow-slime-west',
				sourceEnemyId: 'slime-scout',
				returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
				enemyCount: 1,
				hero: { hp: 20, maxHp: 20, attack: 8, defense: 0 }
			});
			Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
			const state = scene as unknown as {
				enemies: Array<{ x: number; y: number }>;
				pendingResult: unknown;
			};
			state.enemies[0]!.x = 330;
			state.enemies[0]!.y = 180;
			scene.update(0, 16);

			expect(state.pendingResult).not.toBeNull();

			hud.dispatch({ type: 'dismiss-battle-summary' });

			expect(scene.scene.start).toHaveBeenCalledWith(WorldScene.key, {
				saveState,
				reason: 'battle-result',
				battleResult: state.pendingResult,
				persistExplorationChanges: undefined
			});
		} finally {
			hud.restore();
		}
	});

	it('propagates persistExplorationChanges back to WorldScene on dismiss', async () => {
		const hud = installHudCommandTarget();
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const { WorldScene } = await import('./WorldScene');
		const scene = new BattleScene();
		const saveState = createNewSaveState();

		try {
			scene.create({
				saveState,
				sourceMapId: 'meadow-entry',
				sourceEncounterId: 'meadow-slime-west',
				sourceEnemyId: 'slime-scout',
				returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
				enemyCount: 1,
				hero: { hp: 20, maxHp: 20, attack: 8, defense: 0 },
				persistExplorationChanges: false
			});
			Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
			const state = scene as unknown as {
				enemies: Array<{ x: number; y: number }>;
				pendingResult: unknown;
			};
			state.enemies[0]!.x = 330;
			state.enemies[0]!.y = 180;
			scene.update(0, 16);

			expect(state.pendingResult).not.toBeNull();

			hud.dispatch({ type: 'dismiss-battle-summary' });

			expect(scene.scene.start).toHaveBeenCalledWith(WorldScene.key, {
				saveState,
				reason: 'battle-result',
				battleResult: state.pendingResult,
				persistExplorationChanges: false
			});
		} finally {
			hud.restore();
		}
	});

	it('ignores non-dismiss commands while the battle summary is showing', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		const saveState = createNewSaveState();

		scene.create({
			saveState,
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 8, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number }>;
			pendingResult: unknown;
		};
		state.enemies[0]!.x = 330;
		state.enemies[0]!.y = 180;

		scene.update(0, 16);

		expect(state.pendingResult).toBeTruthy();
		emitHudStateSpy.mockClear();

		const hud = installHudCommandTarget();
		try {
			hud.dispatch({ type: 'heal' });

			expect(emitHudStateSpy).not.toHaveBeenCalled();
		} finally {
			hud.restore();
		}
	});

	it('does not persist battle results in BattleScene (deferred to WorldScene)', async () => {
		const storage = await import('$lib/game/save/storage');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		const saveState = createNewSaveState();
		const setItemSpy = vi.fn();
		const memoryStorage = {
			getItem: vi.fn(() => null),
			removeItem: vi.fn(),
			setItem: setItemSpy
		};

		storage.setSaveStorage(memoryStorage);
		try {
			scene.create({
				saveState,
				sourceMapId: 'meadow-entry',
				sourceEncounterId: 'meadow-slime-west',
				sourceEnemyId: 'slime-scout',
				returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
				enemyCount: 1,
				hero: { hp: 20, maxHp: 20, attack: 8, defense: 0 }
			});
			Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
			const state = scene as unknown as {
				enemies: Array<{ x: number; y: number }>;
			};
			state.enemies[0]!.x = 330;
			state.enemies[0]!.y = 180;

			scene.update(0, 16);

			expect(setItemSpy).not.toHaveBeenCalled();
		} finally {
			storage.setSaveStorage(undefined);
		}
	});

	it('does not persist battle results when persistExplorationChanges is false', async () => {
		const storage = await import('$lib/game/save/storage');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		const saveState = createNewSaveState();
		const setItemSpy = vi.fn();
		const memoryStorage = {
			getItem: vi.fn(() => null),
			removeItem: vi.fn(),
			setItem: setItemSpy
		};

		storage.setSaveStorage(memoryStorage);
		try {
			scene.create({
				saveState,
				sourceMapId: 'meadow-entry',
				sourceEncounterId: 'meadow-slime-west',
				sourceEnemyId: 'slime-scout',
				returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
				enemyCount: 1,
				hero: { hp: 20, maxHp: 20, attack: 8, defense: 0 },
				persistExplorationChanges: false
			});
			Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
			const state = scene as unknown as {
				enemies: Array<{ x: number; y: number }>;
			};
			state.enemies[0]!.x = 330;
			state.enemies[0]!.y = 180;

			scene.update(0, 16);

			expect(setItemSpy).not.toHaveBeenCalled();
		} finally {
			storage.setSaveStorage(undefined);
		}
	});

	it('applies 1.5x speed multiplier for phase-2 boss enemies', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		const saveState = createNewSaveState();

		scene.create({
			saveState,
			sourceMapId: 'ruins-core',
			sourceEncounterId: 'ruins-warden',
			sourceEnemyId: 'ruins-warden',
			returnPosition: { mapId: 'ruins-core', x: 4_992, y: 3_200, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 23, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
		const state = scene as unknown as {
			enemies: Array<{
				x: number;
				y: number;
				hp: number;
				maxHp: number;
				phase: 1 | 2;
				moveSpeed: number;
			}>;
		};

		// Phase 1: position enemy close enough for the hero to hit
		state.enemies[0]!.x = 330;
		state.enemies[0]!.y = 180;

		scene.update(0, 16);

		// Hit should trigger enrage (45 HP → 22, below 50%)
		expect(state.enemies[0]!.phase).toBe(2);

		// Now measure speed in phase 2: move hero far away, boss chases
		Object.assign(phaserState.playerMarker, { x: 60, y: 60 });
		const xBeforeChase = state.enemies[0]!.x;

		scene.update(500, 200);

		const phase2Delta = Math.abs(state.enemies[0]!.x - xBeforeChase);
		// Phase-2 boss (75 * 1.5 = 112.5 speed) * 0.2s = 22.5 units
		// Phase-1 boss (75 speed) * 0.2s = 15 units
		expect(phase2Delta).toBeGreaterThan(18);
	});

	it('restores phase-2 boss tint after hit reaction expires', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		const saveState = createNewSaveState();

		scene.create({
			saveState,
			sourceMapId: 'ruins-core',
			sourceEncounterId: 'ruins-warden',
			sourceEnemyId: 'ruins-warden',
			returnPosition: { mapId: 'ruins-core', x: 4_992, y: 3_200, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 23, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
		const state = scene as unknown as {
			enemies: Array<{
				x: number;
				y: number;
				hp: number;
				maxHp: number;
				phase: 1 | 2;
				hitReactionUntil: number;
			}>;
		};
		state.enemies[0]!.x = 330;
		state.enemies[0]!.y = 180;

		// First hit: trigger enrage
		scene.update(0, 16);
		expect(state.enemies[0]!.phase).toBe(2);
		expect(phaserState.enemyMarker.setTint).toHaveBeenCalledWith(0xff8a3d);

		// Reset setTint/clearTint mock tracking but keep phase state
		phaserState.enemyMarker.setTint.mockClear();
		phaserState.enemyMarker.clearTint.mockClear();

		// Wait for first hit reaction to clear
		const hitReactionEnd = state.enemies[0]!.hitReactionUntil;
		scene.update(hitReactionEnd + 1, 16);

		// Phase-2 tint should be restored, not clearTint
		expect(phaserState.enemyMarker.setTint).toHaveBeenCalledWith(0xff8a3d);
		expect(phaserState.enemyMarker.clearTint).not.toHaveBeenCalled();
	});
});

describe('WorldScene', () => {
	const twoPlaneBaseTextureKey = 'two-plane-base';
	const twoPlaneForegroundTextureKey = 'two-plane-foreground';
	const twoPlaneBackgrounds = [
		{
			id: 'two-plane-base-image',
			x: 320,
			y: 160,
			width: 640,
			height: 320,
			textureKey: twoPlaneBaseTextureKey,
			plane: 'base' as const,
			drawOrder: 10
		},
		{
			id: 'two-plane-foreground-image',
			x: 352,
			y: 192,
			width: 640,
			height: 320,
			textureKey: twoPlaneForegroundTextureKey,
			plane: 'foreground' as const,
			drawOrder: 20
		}
	] satisfies readonly MapBackgroundImage[];

	async function flushStoryDialogue() {
		await Promise.resolve();
		await Promise.resolve();
	}

	function registerSceneSupportTestMap() {
		maps['scene-support-test'] = {
			id: 'scene-support-test',
			width: 20,
			height: 20,
			spawnDirection: 'right',
			spawn: { x: 96, y: 96 },
			transitions: [
				{
					id: 'scene-support-stair',
					x: 320,
					y: 96,
					toMapId: 'hero-house',
					marker: 'stair',
					arrival: { x: 352, y: 480, facing: 'up' }
				}
			],
			groundPatches: [
				{ id: 'scene-support-path', x: 96, y: 96, width: 160, height: 96, tile: 'pathTile' },
				{ id: 'scene-support-stone', x: 320, y: 96, width: 96, height: 96, tile: 'stoneWallTile' }
			],
			blockers: [
				{ id: 'scene-support-blocker', x: 160, y: 96, width: 32, height: 160, kind: 'city-wall' },
				{
					id: 'scene-support-hedge',
					x: 288,
					y: 224,
					width: 128,
					height: 32,
					kind: 'town-hedge'
				},
				{
					id: 'scene-support-gate',
					x: 224,
					y: 224,
					width: 96,
					height: 32,
					kind: 'future-gate',
					label: 'Future gate'
				}
			],
			combatBounds: [
				{
					id: 'scene-support-combat',
					x: 320,
					y: 320,
					width: 320,
					height: 320,
					encounterIds: ['scene-support-slime'],
					aggroRadius: 120,
					leashRadius: 180
				}
			],
			encounters: [{ id: 'scene-support-slime', x: 320, y: 320, enemyId: 'slime-scout' }]
		};
	}

	function registerSceneCollisionTestMap() {
		maps['scene-collision-test'] = {
			id: 'scene-collision-test',
			width: 20,
			height: 20,
			spawnDirection: 'right',
			spawn: { x: 64, y: 64 },
			transitions: [],
			blockers: [],
			fences: [],
			mapDecor: [],
			interiorProps: [],
			npcs: [],
			landmarks: []
		};
	}

	function registerSceneNavigationGridTestMap() {
		maps['scene-navigation-grid-test'] = {
			id: 'scene-navigation-grid-test',
			width: 8,
			height: 4,
			spawnDirection: 'right',
			spawn: { x: 80, y: 48 },
			transitions: [],
			navigationGrid: compileNavigationGrid({
				id: 'scene-navigation-grid-test-authored',
				mapId: 'scene-navigation-grid-test',
				cellSizePx: 32,
				widthCells: 8,
				heightCells: 4,
				clearancePx: 0,
				rows: ['........', '...#....', '........', '........']
			})
		};
	}

	function registerTwoPlaneBackgroundTestMap() {
		maps['scene-support-test'] = {
			id: 'scene-support-test',
			width: 20,
			height: 20,
			spawnDirection: 'right',
			spawn: { x: 96, y: 96 },
			transitions: [],
			blockers: [
				{
					id: 'two-plane-base-only',
					x: 96,
					y: 160,
					width: 32,
					height: 64,
					kind: 'city-wall',
					visual: {
						mode: 'fallback-only',
						ownerCrops: [
							{
								cropId: 'two-plane-base',
								requiredBackgroundIds: ['two-plane-base-image']
							}
						]
					}
				},
				{
					id: 'two-plane-multi-owner',
					x: 128,
					y: 160,
					width: 32,
					height: 64,
					kind: 'city-wall',
					visual: {
						mode: 'fallback-only',
						ownerCrops: [
							{
								cropId: 'two-plane-complete',
								requiredBackgroundIds: ['two-plane-base-image', 'two-plane-foreground-image']
							}
						]
					}
				},
				{
					id: 'two-plane-implicit-always',
					x: 160,
					y: 160,
					width: 32,
					height: 64,
					kind: 'city-wall'
				},
				{
					id: 'two-plane-explicit-always',
					x: 192,
					y: 160,
					width: 32,
					height: 64,
					kind: 'city-wall',
					visual: { mode: 'always' }
				}
			],
			mapDecor: [
				{
					id: 'two-plane-base-only-decor',
					x: 224,
					y: 160,
					width: 32,
					height: 32,
					textureKey: forestDressingAsset.key,
					frameName: 'brush',
					visual: {
						mode: 'fallback-only',
						ownerCrops: [
							{
								cropId: 'two-plane-base',
								requiredBackgroundIds: ['two-plane-base-image']
							}
						]
					}
				},
				{
					id: 'two-plane-complete-decor',
					x: 256,
					y: 160,
					width: 32,
					height: 32,
					textureKey: forestDressingAsset.key,
					frameName: 'brush',
					visual: {
						mode: 'fallback-only',
						ownerCrops: [
							{
								cropId: 'two-plane-complete',
								requiredBackgroundIds: ['two-plane-base-image', 'two-plane-foreground-image']
							}
						]
					}
				}
			],
			fences: [
				{
					id: 'two-plane-base-only-fence',
					x: 288,
					y: 160,
					width: 32,
					height: 32,
					visual: {
						mode: 'fallback-only',
						ownerCrops: [
							{
								cropId: 'two-plane-base',
								requiredBackgroundIds: ['two-plane-base-image']
							}
						]
					}
				},
				{
					id: 'two-plane-complete-fence',
					x: 320,
					y: 160,
					width: 32,
					height: 32,
					visual: {
						mode: 'fallback-only',
						ownerCrops: [
							{
								cropId: 'two-plane-complete',
								requiredBackgroundIds: ['two-plane-base-image', 'two-plane-foreground-image']
							}
						]
					}
				}
			]
		};
		for (const textureKey of [twoPlaneBaseTextureKey, twoPlaneForegroundTextureKey]) {
			phaserState.regionalBackgroundTextureMocks.set(textureKey, {
				key: textureKey,
				source: [{ width: 640, height: 320 }],
				get: vi.fn(() => ({ cutWidth: 640, cutHeight: 320 }))
			});
		}
	}

	function registerRegistryDrivenDefaultTestMap() {
		maps['scene-registry-default-test'] = {
			id: 'scene-registry-default-test',
			width: 20,
			height: 20,
			spawnDirection: 'right',
			spawn: { x: 96, y: 96 },
			transitions: []
		};
		for (const textureKey of [twoPlaneBaseTextureKey, twoPlaneForegroundTextureKey]) {
			phaserState.regionalBackgroundTextureMocks.set(textureKey, {
				key: textureKey,
				source: [{ width: 640, height: 320 }],
				get: vi.fn(() => ({ cutWidth: 640, cutHeight: 320 }))
			});
		}
	}

	function selectedSceneSupportPackage(
		id: string,
		backgrounds: readonly MapBackgroundImage[]
	): MapBackgroundPackageSelection {
		const definition: MapBackgroundPackageDefinition = {
			id,
			mapId: 'scene-support-test',
			coverage: 'full-map',
			assets: backgrounds.map(({ textureKey }) => ({
				key: textureKey,
				path: `/game/assets/${textureKey}.png`
			})),
			backgrounds,
			visualOwners: []
		};
		return { mode: 'review', definition };
	}

	function selectedTwoPlanePackage(): MapBackgroundPackageSelection {
		return selectedSceneSupportPackage('scene-support-two-plane-review', twoPlaneBackgrounds);
	}

	function createSelectedTwoPlaneScene(scene: { create(data: unknown): void }) {
		scene.create({
			mapId: 'scene-support-test',
			mapBackgroundPackageSelection: selectedTwoPlanePackage()
		});
	}

	const twoPlaneBackgroundMarkers = () =>
		phaserState.imageMarkers.filter(
			(marker) =>
				(marker.texture === twoPlaneBaseTextureKey ||
					marker.texture === twoPlaneForegroundTextureKey) &&
				marker.destroy.mock.calls.length === 0
		);
	const twoPlaneBlockerMarkers = () =>
		phaserState.imageMarkers.filter(
			(marker) => marker.texture === 'environment-dressing' && marker.frame === 'townWallVertical'
		);
	const twoPlaneOwnedDecorMarkers = () =>
		phaserState.imageMarkers.filter(
			(marker) =>
				marker.texture === forestDressingAsset.key &&
				marker.frame === 'brush' &&
				[224, 256].includes(marker.x)
		);
	const twoPlaneOwnedFenceMarkers = () =>
		phaserState.imageMarkers.filter(
			(marker) => marker.texture === fenceDressingAsset.key && [288, 320].includes(marker.x)
		);
	const alternativeEastBoundaryTextureKey = 'alternative-east-boundary';
	const alternativeWildwoodBaseTextureKey = 'alternative-wildwood-base';
	const alternativeWildwoodForegroundTextureKey = 'alternative-wildwood-foreground';
	const alternativeBackgrounds = [
		{
			id: 'alternative-east-boundary-base-image',
			x: 320,
			y: 160,
			width: 640,
			height: 320,
			textureKey: alternativeEastBoundaryTextureKey,
			plane: 'base' as const,
			drawOrder: 10
		},
		{
			id: 'alternative-wildwood-base-image',
			x: 352,
			y: 192,
			width: 640,
			height: 320,
			textureKey: alternativeWildwoodBaseTextureKey,
			plane: 'base' as const,
			drawOrder: 20
		},
		{
			id: 'alternative-wildwood-foreground-image',
			x: 384,
			y: 224,
			width: 640,
			height: 320,
			textureKey: alternativeWildwoodForegroundTextureKey,
			plane: 'foreground' as const,
			drawOrder: 20
		}
	] satisfies readonly MapBackgroundImage[];

	function registerAlternativeOwnerBackgroundTestMap() {
		const eastBoundaryBackgroundId = 'alternative-east-boundary-base-image';
		const wildwoodBaseBackgroundId = 'alternative-wildwood-base-image';
		const wildwoodForegroundBackgroundId = 'alternative-wildwood-foreground-image';
		const alternativeVisual = {
			mode: 'fallback-only' as const,
			ownerCrops: [
				{
					cropId: 'outer-boundary-east-forest-lane',
					requiredBackgroundIds: [eastBoundaryBackgroundId]
				},
				{
					cropId: 'wildwood',
					requiredBackgroundIds: [wildwoodBaseBackgroundId, wildwoodForegroundBackgroundId]
				}
			]
		};

		maps['scene-support-test'] = {
			id: 'scene-support-test',
			width: 20,
			height: 20,
			spawnDirection: 'right',
			spawn: { x: 96, y: 96 },
			transitions: [],
			blockers: [
				{
					id: 'alternative-owner-blocker',
					x: 96,
					y: 160,
					width: 32,
					height: 64,
					kind: 'city-wall',
					visual: alternativeVisual
				}
			],
			mapDecor: [
				{
					id: 'alternative-owner-decor',
					x: 160,
					y: 160,
					width: 32,
					height: 32,
					textureKey: forestDressingAsset.key,
					frameName: 'brush',
					visual: alternativeVisual
				}
			],
			fences: [
				{
					id: 'alternative-owner-fence',
					x: 224,
					y: 160,
					width: 32,
					height: 32,
					visual: alternativeVisual
				}
			]
		};

		for (const textureKey of [
			alternativeEastBoundaryTextureKey,
			alternativeWildwoodBaseTextureKey,
			alternativeWildwoodForegroundTextureKey
		]) {
			phaserState.regionalBackgroundTextureMocks.set(textureKey, {
				key: textureKey,
				source: [{ width: 640, height: 320 }],
				get: vi.fn(() => ({ cutWidth: 640, cutHeight: 320 }))
			});
		}
	}

	function selectedAlternativePackage(): MapBackgroundPackageSelection {
		return selectedSceneSupportPackage('scene-support-alternative-review', alternativeBackgrounds);
	}

	function createSelectedAlternativeScene(scene: { create(data: unknown): void }) {
		scene.create({
			mapId: 'scene-support-test',
			mapBackgroundPackageSelection: selectedAlternativePackage()
		});
	}

	const alternativeOwnedBlockerMarkers = () =>
		phaserState.imageMarkers.filter(
			(marker) =>
				marker.texture === environmentDressingAsset.key &&
				marker.frame === 'townWallVertical' &&
				marker.x === 96
		);
	const alternativeOwnedDecorMarkers = () =>
		phaserState.imageMarkers.filter(
			(marker) =>
				marker.texture === forestDressingAsset.key && marker.frame === 'brush' && marker.x === 160
		);
	const alternativeOwnedFenceMarkers = () =>
		phaserState.imageMarkers.filter(
			(marker) => marker.texture === fenceDressingAsset.key && marker.x === 224
		);
	const alternativeBackgroundMarkers = () =>
		phaserState.imageMarkers.filter((marker) =>
			[
				alternativeEastBoundaryTextureKey,
				alternativeWildwoodBaseTextureKey,
				alternativeWildwoodForegroundTextureKey
			].includes(marker.texture)
		);

	function installPlaneDiagnosticListener() {
		const target = installHudCommandTarget();
		const diagnostics: RegionalBackgroundPlaneRenderDiagnostic[] = [];
		target.target.addEventListener(
			'gliese:regional-background-plane-render-diagnostic',
			(event) => {
				diagnostics.push((event as CustomEvent<RegionalBackgroundPlaneRenderDiagnostic>).detail);
			}
		);
		return { ...target, diagnostics };
	}

	async function registerPaintedPilotBackgroundMocks() {
		const { MEADOW_ENTRY_PAINTED_MODE_PILOT } =
			await import('$lib/game/content/backgrounds/meadow-entry-painted-v2-runtime');
		for (const background of MEADOW_ENTRY_PAINTED_MODE_PILOT.backgrounds) {
			phaserState.regionalBackgroundTextureMocks.set(background.textureKey, {
				key: background.textureKey,
				source: [{ width: background.width, height: background.height }],
				get: vi.fn(() => ({ cutWidth: background.width, cutHeight: background.height }))
			});
		}
		return MEADOW_ENTRY_PAINTED_MODE_PILOT;
	}

	async function registerCompletePaintedBackgroundMocks() {
		const { MEADOW_ENTRY_PAINTED_MODE_COMPLETE } =
			await import('$lib/game/content/backgrounds/meadow-entry-painted-v2-runtime');
		for (const background of MEADOW_ENTRY_PAINTED_MODE_COMPLETE.backgrounds) {
			phaserState.regionalBackgroundTextureMocks.set(background.textureKey, {
				key: background.textureKey,
				source: [{ width: background.width, height: background.height }],
				get: vi.fn(() => ({ cutWidth: background.width, cutHeight: background.height }))
			});
		}
		return MEADOW_ENTRY_PAINTED_MODE_COMPLETE;
	}

	function findPaintedFallbackMarkers(id: string) {
		if (id in expectedOrganicBlockerBounds) {
			const bounds = expectedOrganicBlockerBounds[id as keyof typeof expectedOrganicBlockerBounds];
			const isHorizontal = bounds.width >= bounds.height;
			const tileCount = expectedOrganicBlockerMarkerCount(
				id as keyof typeof expectedOrganicBlockerBounds
			);
			const firstOffset = -((tileCount - 1) * 48) / 2;
			const expectedCenters = Array.from({ length: tileCount }, (_, index) => {
				const offset = firstOffset + index * 48;
				return {
					x: bounds.x + (isHorizontal ? offset : 0),
					y: bounds.y + (isHorizontal ? 0 : offset)
				};
			});

			return phaserState.imageMarkers.filter(
				(marker) =>
					marker.texture === forestDressingAsset.key &&
					marker.frame === 'treeCluster' &&
					expectedCenters.some(({ x, y }) => marker.x === x && marker.y === y)
			);
		}

		const markerBounds: Record<string, { x: number; y: number; texture: string; frame: string }> = {
			'village-decor-28-25': {
				x: 1_072,
				y: 4_880,
				texture: 'village-dressing',
				frame: 'poleLantern'
			},
			'village-decor-22-77': {
				x: 2_736,
				y: 4_688,
				texture: 'village-dressing',
				frame: 'gateArch'
			}
		};
		const bounds = markerBounds[id];
		if (!bounds) throw new Error(`Unknown painted fallback marker: ${id}`);
		return phaserState.imageMarkers.filter(
			(marker) =>
				marker.texture === bounds.texture &&
				marker.frame === bounds.frame &&
				marker.y === bounds.y &&
				marker.x === bounds.x
		);
	}

	function registerAreaMapRevealTestMap() {
		maps['area-map-reveal-test'] = {
			id: 'area-map-reveal-test',
			width: 30,
			height: 12,
			spawnDirection: 'right',
			spawn: { x: 340, y: 320 },
			transitions: []
		};
	}

	afterEach(() => {
		delete maps['scene-support-test'];
		delete maps['scene-registry-default-test'];
		delete maps['scene-collision-test'];
		delete maps['scene-navigation-grid-test'];
		delete maps['area-map-reveal-test'];
	});

	beforeEach(() => {
		localeState.activeLocale = 'en';
		vi.clearAllMocks();
		phaserState.reset();
		Object.assign(phaserState.cursorKeys.left, { isDown: false });
		Object.assign(phaserState.cursorKeys.right, { isDown: false });
		Object.assign(phaserState.cursorKeys.up, { isDown: false });
		Object.assign(phaserState.cursorKeys.down, { isDown: false });
		Object.assign(phaserState.wasdKeys.left, { isDown: false });
		Object.assign(phaserState.wasdKeys.right, { isDown: false });
		Object.assign(phaserState.wasdKeys.up, { isDown: false });
		Object.assign(phaserState.wasdKeys.down, { isDown: false });
		Object.assign(phaserState.interactKeys.e, { isDown: false, justDown: false });
		Object.assign(phaserState.interactKeys.space, { isDown: false, justDown: false });
		Object.assign(phaserState.interactKeys.enter, { isDown: false, justDown: false });
		Object.assign(phaserState.playerMarker, { x: 0, y: 0 });
	});

	it('preloads a selected non-Meadow package from the map-keyed registry default', async () => {
		registerRegistryDrivenDefaultTestMap();
		const restoreLocation = installLocationSearch('');
		const target = installHudCommandTarget();
		const diagnostics: RegionalBackgroundRendererDiagnostic[] = [];
		const { REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT } =
			await import('$lib/game/phaser/renderer-diagnostics');
		target.target.addEventListener(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT, (event) => {
			diagnostics.push((event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail);
		});
		const { BootScene } = await import('./BootScene');
		const scene = new BootScene();

		try {
			scene.preload();

			expect(scene.load.image).toHaveBeenCalledWith(
				'two-plane-base',
				'/game/assets/scene-support-registry/base.png'
			);
			expect(scene.load.image).toHaveBeenCalledWith(
				'two-plane-foreground',
				'/game/assets/scene-support-registry/foreground.png'
			);
			scene.load.emit('filecomplete', 'two-plane-base', 'image', {});
			scene.load.emit('filecomplete', 'two-plane-foreground', 'image', {});
			scene.load.emit('complete');

			expect(diagnostics[0]?.packageIds).toContain('scene-support-registry-default');
		} finally {
			target.restore();
			restoreLocation();
		}
	});

	it('resolves the registry default for a non-Meadow map through transactional rendering', async () => {
		registerRegistryDrivenDefaultTestMap();
		const target = installPlaneDiagnosticListener();
		const restoreLocation = installLocationSearch('');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'scene-registry-default-test' });

			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'scene-registry-default-test',
				packageId: 'scene-support-registry-default',
				presentationMode: 'painted',
				selectedBackgroundIds: ['two-plane-base-image', 'two-plane-foreground-image']
			});
			expect(twoPlaneBackgroundMarkers()).toHaveLength(2);
			expect(scene.make.tilemap).not.toHaveBeenCalled();
		} finally {
			target.restore();
			restoreLocation();
		}
	});

	it('renders the painted Hero House package with its exact transform and runtime IDs', async () => {
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const heroHousePackage = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'hero-house-painted'
		);
		if (!heroHousePackage) throw new Error('Hero House painted package is not registered');
		const base = heroHousePackage.backgrounds.find(({ plane }) => plane === 'base');
		if (!base) throw new Error('Hero House painted base is not registered');
		phaserState.regionalBackgroundTextureMocks.set(base.textureKey, {
			key: base.textureKey,
			source: [{ width: base.width, height: base.height }],
			get: vi.fn(() => ({ cutWidth: base.width, cutHeight: base.height }))
		});
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'hero-house' });

			expect(scene.make.tilemap).not.toHaveBeenCalled();
			expect(phaserState.tileSpriteMarkers).toHaveLength(0);
			expect(
				phaserState.imageMarkers.filter((marker) => marker.texture === 'interior-props')
			).toHaveLength(0);
			expect(phaserState.imageMarkers).toContainEqual(
				expect.objectContaining({
					x: 352,
					y: 288,
					texture: base.textureKey
				})
			);
			const backgroundMarker = phaserState.imageMarkers.find(
				(marker) => marker.texture === base.textureKey
			);
			expect(backgroundMarker?.setOrigin).toHaveBeenCalledWith(0.5, 0.5);
			expect(backgroundMarker?.setDisplaySize).toHaveBeenCalledWith(704, 576);
			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'hero-house',
				packageId: 'hero-house-painted',
				presentationMode: 'painted',
				requiredBackgroundIds: ['hero-house-painted-base-image'],
				selectedBackgroundIds: ['hero-house-painted-base-image'],
				successfulBackgroundIds: ['hero-house-painted-base-image'],
				collisionIds: heroHouseCollisionIds,
				statefulObjectIds: heroHouseStatefulObjectIds
			});
			expect(target.diagnostics[0]?.entries[0]).toMatchObject({
				id: 'hero-house-painted-base-image',
				textureKey: 'hero-house-painted-base',
				status: 'rendered',
				expectedDimensions: { width: 704, height: 576 },
				observedDimensions: { width: 704, height: 576 },
				renderTransform: {
					x: 352,
					y: 288
				}
			});
		} finally {
			target.restore();
		}
	});

	it('falls back to the complete Hero House legacy package when its base is missing', async () => {
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const heroHousePackage = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'hero-house-painted'
		);
		if (!heroHousePackage) throw new Error('Hero House painted package is not registered');
		const base = heroHousePackage.backgrounds.find(({ plane }) => plane === 'base');
		if (!base) throw new Error('Hero House painted base is not registered');
		phaserState.regionalBackgroundTextureMocks.set(base.textureKey, {
			key: base.textureKey,
			source: [{ width: base.width, height: base.height }],
			get: vi.fn(() => ({ cutWidth: base.width, cutHeight: base.height }))
		});
		phaserState.missingTextureKeys.add(base.textureKey);
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'hero-house' });

			expect(scene.make.tilemap).toHaveBeenCalledOnce();
			expect(phaserState.imageMarkers.some(({ texture }) => texture === base.textureKey)).toBe(
				false
			);
			expect(phaserState.tileSpriteMarkers).toHaveLength(heroHouseMap.blockers?.length ?? 0);
			expect(
				phaserState.imageMarkers.filter((marker) => marker.texture === 'interior-props')
			).toHaveLength(heroHouseMap.interiorProps?.length ?? 0);
			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'hero-house',
				packageId: null,
				presentationMode: 'fallback',
				requiredBackgroundIds: ['hero-house-painted-base-image'],
				selectedBackgroundIds: [],
				successfulBackgroundIds: [],
				collisionIds: heroHouseCollisionIds,
				statefulObjectIds: heroHouseStatefulObjectIds
			});
			expect(target.diagnostics[0]?.entries[0]).toMatchObject({
				id: 'hero-house-painted-base-image',
				status: 'missing-texture',
				observedDimensions: null
			});
		} finally {
			target.restore();
		}
	});

	it('renders the painted Guild Hall base and foreground at the exact map transform', async () => {
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const guildHallPackage = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'guild-hall-painted'
		);
		if (!guildHallPackage) throw new Error('Guild Hall painted package is not registered');
		for (const background of guildHallPackage.backgrounds) {
			phaserState.regionalBackgroundTextureMocks.set(background.textureKey, {
				key: background.textureKey,
				source: [{ width: background.width, height: background.height }],
				get: vi.fn(() => ({ cutWidth: background.width, cutHeight: background.height }))
			});
		}
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'guild-hall' });

			const backgroundMarkers = phaserState.imageMarkers.filter((marker) =>
				guildHallPackage.backgrounds.some(({ textureKey }) => textureKey === marker.texture)
			);
			expect(backgroundMarkers).toHaveLength(2);
			for (const background of guildHallPackage.backgrounds) {
				const marker = backgroundMarkers.find(({ texture }) => texture === background.textureKey);
				expect(marker).toMatchObject({
					x: 512,
					y: 416,
					texture: background.textureKey
				});
				expect(marker?.setOrigin).toHaveBeenCalledWith(0.5, 0.5);
				expect(marker?.setDisplaySize).toHaveBeenCalledWith(1024, 832);
			}
			const baseMarker = backgroundMarkers.find(
				({ texture }) => texture === 'guild-hall-painted-base'
			);
			const foregroundMarker = backgroundMarkers.find(
				({ texture }) => texture === 'guild-hall-painted-foreground'
			);
			expect(baseMarker?.setDepth).toHaveBeenCalledWith(-9);
			expect(foregroundMarker?.setDepth).toHaveBeenCalledWith(100.0001);
			expect(phaserState.imageMarkers.indexOf(baseMarker!)).toBeLessThan(
				phaserState.imageMarkers.indexOf(foregroundMarker!)
			);

			expect(scene.make.tilemap).not.toHaveBeenCalled();
			expect(phaserState.tileSpriteMarkers).toHaveLength(0);
			expect(
				phaserState.imageMarkers.filter(({ texture }) => texture === 'interior-props')
			).toHaveLength(0);
			expect(
				phaserState.imageMarkers.filter(({ texture }) => texture === 'environment-dressing')
			).toHaveLength(0);
			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'guild-hall',
				packageId: 'guild-hall-painted',
				presentationMode: 'painted',
				requiredBackgroundIds: guildHallPackage.backgrounds.map(({ id }) => id),
				selectedBackgroundIds: guildHallPackage.backgrounds.map(({ id }) => id),
				successfulBackgroundIds: guildHallPackage.backgrounds.map(({ id }) => id)
			});
		} finally {
			target.restore();
		}
	});

	it('falls back to every Guild Hall legacy overlay when its foreground is missing', async () => {
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const guildHallPackage = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'guild-hall-painted'
		);
		if (!guildHallPackage) throw new Error('Guild Hall painted package is not registered');
		const base = guildHallPackage.backgrounds.find(({ plane }) => plane === 'base');
		const foreground = guildHallPackage.backgrounds.find(({ plane }) => plane === 'foreground');
		if (!base || !foreground) throw new Error('Guild Hall painted planes are incomplete');
		for (const background of [base, foreground]) {
			phaserState.regionalBackgroundTextureMocks.set(background.textureKey, {
				key: background.textureKey,
				source: [{ width: background.width, height: background.height }],
				get: vi.fn(() => ({ cutWidth: background.width, cutHeight: background.height }))
			});
		}
		phaserState.missingTextureKeys.add(foreground.textureKey);
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'guild-hall' });

			const baseMarker = phaserState.imageMarkers.find(
				({ texture }) => texture === base.textureKey
			);
			expect(baseMarker?.destroy).toHaveBeenCalledOnce();
			expect(
				phaserState.imageMarkers.filter(
					({ texture, destroy }) =>
						(texture === base.textureKey || texture === foreground.textureKey) &&
						destroy.mock.calls.length === 0
				)
			).toHaveLength(0);
			expect(scene.make.tilemap).toHaveBeenCalledOnce();
			expect(phaserState.tileSpriteMarkers).toHaveLength(guildHallMap.blockers?.length ?? 0);
			expect(
				phaserState.imageMarkers.filter(({ texture }) => texture === 'interior-props')
			).toHaveLength(guildHallMap.interiorProps?.length ?? 0);
			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'guild-hall',
				packageId: null,
				presentationMode: 'fallback',
				requiredBackgroundIds: guildHallPackage.backgrounds.map(({ id }) => id),
				selectedBackgroundIds: [],
				successfulBackgroundIds: [],
				selectedFallbackBlockerIds: guildHallMap.blockers?.map(({ id }) => id)
			});
			expect(target.diagnostics[0]?.entries.map(({ status }) => status)).toEqual([
				'rendered',
				'missing-texture'
			]);
		} finally {
			target.restore();
		}
	});

	it('renders the painted Item Shop base while keeping live actors and collisions', async () => {
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const itemShopPackage = VILLAGE_INTERIOR_PACKAGES.find(({ id }) => id === 'item-shop-painted');
		if (!itemShopPackage) throw new Error('Item Shop painted package is not registered');
		const base = itemShopPackage.backgrounds.find(({ plane }) => plane === 'base');
		if (!base) throw new Error('Item Shop painted base is not registered');
		phaserState.regionalBackgroundTextureMocks.set(base.textureKey, {
			key: base.textureKey,
			source: [{ width: base.width, height: base.height }],
			get: vi.fn(() => ({ cutWidth: base.width, cutHeight: base.height }))
		});
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'item-shop' });

			expect(itemShopPackage.backgrounds.map(({ plane }) => plane)).toEqual(['base']);
			expect(scene.make.tilemap).not.toHaveBeenCalled();
			expect(phaserState.tileSpriteMarkers).toHaveLength(0);
			expect(
				phaserState.imageMarkers.filter(({ texture }) => texture === 'interior-props')
			).toHaveLength(0);
			expect(
				phaserState.imageMarkers.filter(({ texture }) => texture === 'environment-dressing')
			).toHaveLength(0);

			expect(phaserState.playerMarker).toMatchObject({
				x: itemShopMap.spawn.x,
				y: itemShopMap.spawn.y,
				frame: 'heroIdle0'
			});
			expect(phaserState.playerMarker.setDisplaySize).toHaveBeenCalledWith(88, 90);
			expect(phaserState.imageMarkers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						x: 416,
						y: 320,
						texture: 'npc-pack',
						frame: 'miraItemShopNpc'
					}),
					expect.objectContaining({
						x: 256,
						y: 512,
						texture: 'npc-pack',
						frame: 'guildMasterNpc'
					})
				])
			);

			const backgroundMarker = phaserState.imageMarkers.find(
				({ texture }) => texture === base.textureKey
			);
			expect(backgroundMarker).toBeDefined();
			expect(backgroundMarker).toMatchObject({ x: 416, y: 320, texture: base.textureKey });
			expect(backgroundMarker?.setOrigin).toHaveBeenCalledWith(0.5, 0.5);
			expect(backgroundMarker?.setDisplaySize).toHaveBeenCalledWith(832, 640);
			expect(backgroundMarker?.setDepth).toHaveBeenCalledWith(-9);
			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'item-shop',
				packageId: 'item-shop-painted',
				presentationMode: 'painted',
				requiredBackgroundIds: ['item-shop-painted-base-image'],
				selectedBackgroundIds: ['item-shop-painted-base-image'],
				successfulBackgroundIds: ['item-shop-painted-base-image'],
				selectedFallbackBlockerIds: [],
				selectedFallbackDecorIds: [],
				selectedFallbackFenceIds: [],
				collisionIds: itemShopCollisionIds,
				statefulObjectIds: itemShopStatefulObjectIds
			});
			expect(target.diagnostics[0]?.entries).toEqual([
				expect.objectContaining({
					id: 'item-shop-painted-base-image',
					textureKey: 'item-shop-painted-base',
					plane: 'base',
					status: 'rendered',
					expectedDimensions: { width: 832, height: 640 },
					observedDimensions: { width: 832, height: 640 },
					renderTransform: {
						x: 416,
						y: 320
					}
				})
			]);
		} finally {
			target.restore();
		}
	});

	it('restores all Item Shop legacy visuals when its painted base fails', async () => {
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const itemShopPackage = VILLAGE_INTERIOR_PACKAGES.find(({ id }) => id === 'item-shop-painted');
		if (!itemShopPackage) throw new Error('Item Shop painted package is not registered');
		const base = itemShopPackage.backgrounds.find(({ plane }) => plane === 'base');
		if (!base) throw new Error('Item Shop painted base is not registered');
		phaserState.regionalBackgroundTextureMocks.set(base.textureKey, {
			key: base.textureKey,
			source: [{ width: base.width, height: base.height }],
			get: vi.fn(() => ({ cutWidth: base.width, cutHeight: base.height }))
		});
		phaserState.missingTextureKeys.add(base.textureKey);
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'item-shop' });

			expect(scene.make.tilemap).toHaveBeenCalledOnce();
			expect(phaserState.imageMarkers.some(({ texture }) => texture === base.textureKey)).toBe(
				false
			);
			expect(phaserState.tileSpriteMarkers).toHaveLength(itemShopMap.blockers?.length ?? 0);
			expect(
				phaserState.imageMarkers.filter(({ texture }) => texture === 'interior-props')
			).toHaveLength(itemShopMap.interiorProps?.length ?? 0);
			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'item-shop',
				packageId: null,
				presentationMode: 'fallback',
				requiredBackgroundIds: ['item-shop-painted-base-image'],
				selectedBackgroundIds: [],
				successfulBackgroundIds: [],
				selectedFallbackBlockerIds: itemShopMap.blockers?.map(({ id }) => id),
				selectedFallbackDecorIds: [],
				selectedFallbackFenceIds: [],
				collisionIds: itemShopCollisionIds,
				statefulObjectIds: itemShopStatefulObjectIds
			});
			expect(target.diagnostics[0]?.entries).toEqual([
				expect.objectContaining({
					id: 'item-shop-painted-base-image',
					textureKey: 'item-shop-painted-base',
					plane: 'base',
					status: 'missing-texture',
					expectedDimensions: { width: 832, height: 640 },
					observedDimensions: null
				})
			]);
		} finally {
			target.restore();
		}
	});

	it('renders the painted Villager House 1 base while keeping live actors and collisions', async () => {
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const villagerHouse1Package = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'villager-house-1-painted'
		);
		if (!villagerHouse1Package)
			throw new Error('Villager House 1 painted package is not registered');
		const base = villagerHouse1Package.backgrounds.find(({ plane }) => plane === 'base');
		if (!base) throw new Error('Villager House 1 painted base is not registered');
		phaserState.regionalBackgroundTextureMocks.set(base.textureKey, {
			key: base.textureKey,
			source: [{ width: base.width, height: base.height }],
			get: vi.fn(() => ({ cutWidth: base.width, cutHeight: base.height }))
		});
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const lynn = villagerHouse1Map.npcs?.find(({ id }) => id === 'villager-lynn');
		const family = villagerHouse1Map.ambientNpcs?.find(
			({ id }) => id === 'villager-house-1-family'
		);

		try {
			scene.create({ mapId: villagerHouse1Map.id });

			expect(villagerHouse1Package.backgrounds.map(({ plane }) => plane)).toEqual(['base']);
			expect(scene.make.tilemap).not.toHaveBeenCalled();
			expect(phaserState.tileSpriteMarkers).toHaveLength(0);
			expect(
				phaserState.imageMarkers.filter(({ texture }) => texture === base.textureKey)
			).toHaveLength(1);
			expect(
				phaserState.imageMarkers.filter(({ texture }) => texture === 'interior-props')
			).toHaveLength(0);
			expect(
				phaserState.imageMarkers.filter(({ texture }) => texture === 'environment-dressing')
			).toHaveLength(0);
			expect(phaserState.playerMarker).toMatchObject({
				x: villagerHouse1Map.spawn.x,
				y: villagerHouse1Map.spawn.y,
				frame: 'heroIdle0'
			});
			expect(phaserState.playerMarker.setDisplaySize).toHaveBeenCalledWith(88, 90);
			expect(lynn).toBeDefined();
			expect(family).toBeDefined();
			if (!lynn || !family) return;
			expect(phaserState.imageMarkers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						x: lynn.x,
						y: lynn.y,
						texture: 'npc-pack',
						frame: lynn.frameName
					}),
					expect.objectContaining({
						x: family.x,
						y: family.y,
						texture: 'npc-pack',
						frame: family.frameName
					}),
					expect.objectContaining({
						x: villagerHouse1Map.transitions[0]!.x,
						y: villagerHouse1Map.transitions[0]!.y,
						texture: 'starter-pack',
						frame: 'doorwayTile'
					})
				])
			);
			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'villager-house-1',
				packageId: 'villager-house-1-painted',
				presentationMode: 'painted',
				requiredBackgroundIds: ['villager-house-1-painted-base-image'],
				selectedBackgroundIds: ['villager-house-1-painted-base-image'],
				successfulBackgroundIds: ['villager-house-1-painted-base-image'],
				selectedFallbackBlockerIds: [],
				selectedFallbackDecorIds: [],
				selectedFallbackFenceIds: [],
				collisionIds: villagerHouse1CollisionIds,
				statefulObjectIds: villagerHouse1StatefulObjectIds
			});
			expect(target.diagnostics[0]?.entries).toEqual([
				expect.objectContaining({
					id: 'villager-house-1-painted-base-image',
					textureKey: base.textureKey,
					plane: 'base',
					status: 'rendered',
					expectedDimensions: { width: 1280, height: 832 },
					observedDimensions: { width: 1280, height: 832 },
					renderTransform: {
						x: 640,
						y: 416
					}
				})
			]);
		} finally {
			target.restore();
		}
	});

	it('restores every Villager House 1 legacy visual when its painted base is missing', async () => {
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const villagerHouse1Package = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'villager-house-1-painted'
		);
		if (!villagerHouse1Package)
			throw new Error('Villager House 1 painted package is not registered');
		const base = villagerHouse1Package.backgrounds.find(({ plane }) => plane === 'base');
		if (!base) throw new Error('Villager House 1 painted base is not registered');
		phaserState.regionalBackgroundTextureMocks.set(base.textureKey, {
			key: base.textureKey,
			source: [{ width: base.width, height: base.height }],
			get: vi.fn(() => ({ cutWidth: base.width, cutHeight: base.height }))
		});
		phaserState.missingTextureKeys.add(base.textureKey);
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: villagerHouse1Map.id });

			expect(scene.make.tilemap).toHaveBeenCalledOnce();
			expect(
				phaserState.imageMarkers.some(
					({ texture, destroy }) => texture === base.textureKey && destroy.mock.calls.length === 0
				)
			).toBe(false);
			expect(phaserState.tileSpriteMarkers).toHaveLength(villagerHouse1Map.blockers?.length ?? 0);
			expect(
				phaserState.imageMarkers.filter(({ texture }) => texture === 'interior-props')
			).toHaveLength(villagerHouse1Map.interiorProps?.length ?? 0);
			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'villager-house-1',
				packageId: null,
				presentationMode: 'fallback',
				requiredBackgroundIds: ['villager-house-1-painted-base-image'],
				selectedBackgroundIds: [],
				successfulBackgroundIds: [],
				selectedFallbackBlockerIds: villagerHouse1Map.blockers?.map(({ id }) => id),
				selectedFallbackDecorIds: [],
				selectedFallbackFenceIds: [],
				collisionIds: villagerHouse1CollisionIds,
				statefulObjectIds: villagerHouse1StatefulObjectIds
			});
			expect(target.diagnostics[0]?.entries).toEqual([
				expect.objectContaining({
					id: 'villager-house-1-painted-base-image',
					textureKey: base.textureKey,
					plane: 'base',
					status: 'missing-texture',
					expectedDimensions: { width: 1280, height: 832 },
					observedDimensions: null
				})
			]);
		} finally {
			target.restore();
		}
	});

	it('renders the painted Villager House 2 base while keeping live actors and collisions', async () => {
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const villagerHouse2Package = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'villager-house-2-painted'
		);
		if (!villagerHouse2Package)
			throw new Error('Villager House 2 painted package is not registered');
		const base = villagerHouse2Package.backgrounds.find(({ plane }) => plane === 'base');
		if (!base) throw new Error('Villager House 2 painted base is not registered');
		phaserState.regionalBackgroundTextureMocks.set(base.textureKey, {
			key: base.textureKey,
			source: [{ width: base.width, height: base.height }],
			get: vi.fn(() => ({ cutWidth: base.width, cutHeight: base.height }))
		});
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const toma = villagerHouse2Map.npcs?.find(({ id }) => id === 'villager-toma');
		const neighbor = villagerHouse2Map.ambientNpcs?.find(
			({ id }) => id === 'villager-house-2-neighbor'
		);

		try {
			scene.create({ mapId: villagerHouse2Map.id });

			expect(villagerHouse2Package.backgrounds.map(({ plane }) => plane)).toEqual(['base']);
			expect(scene.make.tilemap).not.toHaveBeenCalled();
			expect(phaserState.tileSpriteMarkers).toHaveLength(0);
			expect(
				phaserState.imageMarkers.filter(
					({ texture }) => texture === 'interior-props' || texture === 'environment-dressing'
				)
			).toHaveLength(0);
			expect(phaserState.playerMarker).toMatchObject({
				x: villagerHouse2Map.spawn.x,
				y: villagerHouse2Map.spawn.y,
				frame: 'heroIdle0'
			});
			expect(phaserState.playerMarker.setDisplaySize).toHaveBeenCalledWith(88, 90);
			expect(toma).toBeDefined();
			expect(neighbor).toBeDefined();
			if (!toma || !neighbor) return;
			const liveMarkers = phaserState.imageMarkers.filter(
				({ texture, frame }) =>
					texture === 'npc-pack' && (frame === toma.frameName || frame === neighbor.frameName)
			);
			expect(liveMarkers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						x: toma.x,
						y: toma.y,
						texture: 'npc-pack',
						frame: toma.frameName
					}),
					expect.objectContaining({
						x: neighbor.x,
						y: neighbor.y,
						texture: 'npc-pack',
						frame: neighbor.frameName
					})
				])
			);
			const transition = villagerHouse2Map.transitions[0];
			expect(phaserState.imageMarkers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						x: transition?.x,
						y: transition?.y,
						texture: 'starter-pack',
						frame: 'doorwayTile'
					})
				])
			);

			const backgroundMarker = phaserState.imageMarkers.find(
				({ texture }) => texture === base.textureKey
			);
			expect(backgroundMarker).toBeDefined();
			expect(backgroundMarker?.setOrigin).toHaveBeenCalledWith(0.5, 0.5);
			expect(backgroundMarker?.setDisplaySize).toHaveBeenCalledWith(1280, 768);
			expect(backgroundMarker?.setDepth).toHaveBeenCalledWith(-9);
			expect(phaserState.imageMarkers.indexOf(backgroundMarker!)).toBeLessThan(
				phaserState.imageMarkers.indexOf(liveMarkers[0]!)
			);
			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'villager-house-2',
				packageId: 'villager-house-2-painted',
				presentationMode: 'painted',
				requiredBackgroundIds: ['villager-house-2-painted-base-image'],
				selectedBackgroundIds: ['villager-house-2-painted-base-image'],
				successfulBackgroundIds: ['villager-house-2-painted-base-image'],
				selectedFallbackBlockerIds: [],
				selectedFallbackDecorIds: [],
				selectedFallbackFenceIds: [],
				collisionIds: villagerHouse2CollisionIds,
				statefulObjectIds: villagerHouse2StatefulObjectIds
			});
			expect(target.diagnostics[0]?.entries).toEqual([
				expect.objectContaining({
					id: 'villager-house-2-painted-base-image',
					textureKey: base.textureKey,
					plane: 'base',
					status: 'rendered',
					expectedDimensions: { width: 1280, height: 768 },
					observedDimensions: { width: 1280, height: 768 },
					renderTransform: {
						x: 640,
						y: 384
					}
				})
			]);
		} finally {
			target.restore();
		}
	});

	it('restores every Villager House 2 legacy visual when its painted base is missing', async () => {
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const villagerHouse2Package = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'villager-house-2-painted'
		);
		if (!villagerHouse2Package)
			throw new Error('Villager House 2 painted package is not registered');
		const base = villagerHouse2Package.backgrounds.find(({ plane }) => plane === 'base');
		if (!base) throw new Error('Villager House 2 painted base is not registered');
		phaserState.regionalBackgroundTextureMocks.set(base.textureKey, {
			key: base.textureKey,
			source: [{ width: base.width, height: base.height }],
			get: vi.fn(() => ({ cutWidth: base.width, cutHeight: base.height }))
		});
		phaserState.missingTextureKeys.add(base.textureKey);
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const toma = villagerHouse2Map.npcs?.find(({ id }) => id === 'villager-toma');
		const neighbor = villagerHouse2Map.ambientNpcs?.find(
			({ id }) => id === 'villager-house-2-neighbor'
		);

		try {
			scene.create({ mapId: villagerHouse2Map.id });

			expect(scene.make.tilemap).toHaveBeenCalledOnce();
			expect(
				phaserState.imageMarkers.some(
					({ texture, destroy }) => texture === base.textureKey && destroy.mock.calls.length === 0
				)
			).toBe(false);
			expect(phaserState.tileSpriteMarkers).toHaveLength(villagerHouse2Map.blockers?.length ?? 0);
			expect(
				phaserState.imageMarkers.filter(({ texture }) => texture === 'interior-props')
			).toHaveLength(villagerHouse2Map.interiorProps?.length ?? 0);
			expect(phaserState.playerMarker).toMatchObject({
				x: villagerHouse2Map.spawn.x,
				y: villagerHouse2Map.spawn.y,
				frame: 'heroIdle0'
			});
			expect(toma).toBeDefined();
			expect(neighbor).toBeDefined();
			if (!toma || !neighbor) return;
			expect(phaserState.imageMarkers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						x: toma.x,
						y: toma.y,
						texture: 'npc-pack',
						frame: toma.frameName
					}),
					expect.objectContaining({
						x: neighbor.x,
						y: neighbor.y,
						texture: 'npc-pack',
						frame: neighbor.frameName
					}),
					expect.objectContaining({
						x: villagerHouse2Map.transitions[0]?.x,
						y: villagerHouse2Map.transitions[0]?.y,
						texture: 'starter-pack',
						frame: 'doorwayTile'
					})
				])
			);
			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'villager-house-2',
				packageId: null,
				presentationMode: 'fallback',
				requiredBackgroundIds: ['villager-house-2-painted-base-image'],
				selectedBackgroundIds: [],
				successfulBackgroundIds: [],
				selectedFallbackBlockerIds: villagerHouse2Map.blockers?.map(({ id }) => id),
				selectedFallbackDecorIds: [],
				selectedFallbackFenceIds: [],
				collisionIds: villagerHouse2CollisionIds,
				statefulObjectIds: villagerHouse2StatefulObjectIds
			});
			expect(target.diagnostics[0]?.entries).toEqual([
				expect.objectContaining({
					id: 'villager-house-2-painted-base-image',
					textureKey: base.textureKey,
					plane: 'base',
					status: 'missing-texture',
					expectedDimensions: { width: 1280, height: 768 },
					observedDimensions: null
				})
			]);
		} finally {
			target.restore();
		}
	});

	it('renders the painted Villager House 3 base with live actors and legacy collisions', async () => {
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const villagerHouse3Package = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'villager-house-3-painted'
		);
		if (!villagerHouse3Package)
			throw new Error('Villager House 3 painted package is not registered');
		const base = villagerHouse3Package.backgrounds.find(({ plane }) => plane === 'base');
		if (!base) throw new Error('Villager House 3 painted base is not registered');
		phaserState.regionalBackgroundTextureMocks.set(base.textureKey, {
			key: base.textureKey,
			source: [{ width: base.width, height: base.height }],
			get: vi.fn(() => ({ cutWidth: base.width, cutHeight: base.height }))
		});
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const io = villagerHouse3Map.npcs?.find(({ id }) => id === 'villager-io');
		const neighbor = villagerHouse3Map.ambientNpcs?.find(
			({ id }) => id === 'villager-house-3-neighbor'
		);

		try {
			scene.create({ mapId: villagerHouse3Map.id });

			expect(villagerHouse3Package.backgrounds.map(({ plane }) => plane)).toEqual(['base']);
			expect(scene.make.tilemap).not.toHaveBeenCalled();
			expect(phaserState.tileSpriteMarkers).toHaveLength(0);
			expect(
				phaserState.imageMarkers.filter(
					({ texture }) => texture === 'interior-props' || texture === 'environment-dressing'
				)
			).toHaveLength(0);
			expect(phaserState.playerMarker).toMatchObject({
				x: villagerHouse3Map.spawn.x,
				y: villagerHouse3Map.spawn.y,
				frame: 'heroIdle0'
			});
			expect(phaserState.playerMarker.setDisplaySize).toHaveBeenCalledWith(88, 90);
			expect(io).toBeDefined();
			expect(neighbor).toBeDefined();
			if (!io || !neighbor) return;
			const liveMarkers = phaserState.imageMarkers.filter(
				({ texture, frame }) =>
					texture === 'npc-pack' && (frame === io.frameName || frame === neighbor.frameName)
			);
			expect(liveMarkers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ x: io.x, y: io.y, texture: 'npc-pack', frame: io.frameName }),
					expect.objectContaining({
						x: neighbor.x,
						y: neighbor.y,
						texture: 'npc-pack',
						frame: neighbor.frameName
					})
				])
			);
			const transition = villagerHouse3Map.transitions[0];
			expect(phaserState.imageMarkers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						x: transition?.x,
						y: transition?.y,
						texture: 'starter-pack',
						frame: 'doorwayTile'
					})
				])
			);

			const backgroundMarker = phaserState.imageMarkers.find(
				({ texture }) => texture === base.textureKey
			);
			expect(backgroundMarker).toBeDefined();
			expect(backgroundMarker?.setOrigin).toHaveBeenCalledWith(0.5, 0.5);
			expect(backgroundMarker?.setDisplaySize).toHaveBeenCalledWith(1024, 704);
			expect(backgroundMarker?.setDepth).toHaveBeenCalledWith(-9);
			expect(phaserState.imageMarkers.indexOf(backgroundMarker!)).toBeLessThan(
				phaserState.imageMarkers.indexOf(liveMarkers[0]!)
			);
			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'villager-house-3',
				packageId: 'villager-house-3-painted',
				presentationMode: 'painted',
				requiredBackgroundIds: ['villager-house-3-painted-base-image'],
				selectedBackgroundIds: ['villager-house-3-painted-base-image'],
				successfulBackgroundIds: ['villager-house-3-painted-base-image'],
				selectedFallbackBlockerIds: [],
				selectedFallbackDecorIds: [],
				selectedFallbackFenceIds: [],
				collisionIds: villagerHouse3CollisionIds,
				statefulObjectIds: villagerHouse3StatefulObjectIds
			});
			expect(target.diagnostics[0]?.entries).toEqual([
				expect.objectContaining({
					id: 'villager-house-3-painted-base-image',
					textureKey: base.textureKey,
					plane: 'base',
					status: 'rendered',
					expectedDimensions: { width: 1024, height: 704 },
					observedDimensions: { width: 1024, height: 704 },
					renderTransform: { x: 512, y: 352 }
				})
			]);
		} finally {
			target.restore();
		}
	});

	it('restores every Villager House 3 legacy visual atomically when its painted base is missing', async () => {
		const { VILLAGE_INTERIOR_PACKAGES } =
			await import('$lib/game/content/backgrounds/village-interior-packages');
		const villagerHouse3Package = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'villager-house-3-painted'
		);
		if (!villagerHouse3Package)
			throw new Error('Villager House 3 painted package is not registered');
		const base = villagerHouse3Package.backgrounds.find(({ plane }) => plane === 'base');
		if (!base) throw new Error('Villager House 3 painted base is not registered');
		phaserState.regionalBackgroundTextureMocks.set(base.textureKey, {
			key: base.textureKey,
			source: [{ width: base.width, height: base.height }],
			get: vi.fn(() => ({ cutWidth: base.width, cutHeight: base.height }))
		});
		phaserState.missingTextureKeys.add(base.textureKey);
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const io = villagerHouse3Map.npcs?.find(({ id }) => id === 'villager-io');
		const neighbor = villagerHouse3Map.ambientNpcs?.find(
			({ id }) => id === 'villager-house-3-neighbor'
		);

		try {
			scene.create({ mapId: villagerHouse3Map.id });

			expect(scene.make.tilemap).toHaveBeenCalledOnce();
			expect(
				phaserState.imageMarkers.some(
					({ texture, destroy }) => texture === base.textureKey && destroy.mock.calls.length === 0
				)
			).toBe(false);
			expect(phaserState.tileSpriteMarkers).toHaveLength(villagerHouse3Map.blockers?.length ?? 0);
			expect(
				phaserState.imageMarkers.filter(({ texture }) => texture === 'interior-props')
			).toHaveLength(villagerHouse3Map.interiorProps?.length ?? 0);
			expect(phaserState.playerMarker).toMatchObject({
				x: villagerHouse3Map.spawn.x,
				y: villagerHouse3Map.spawn.y,
				frame: 'heroIdle0'
			});
			expect(io).toBeDefined();
			expect(neighbor).toBeDefined();
			if (!io || !neighbor) return;
			expect(phaserState.imageMarkers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ x: io.x, y: io.y, texture: 'npc-pack', frame: io.frameName }),
					expect.objectContaining({
						x: neighbor.x,
						y: neighbor.y,
						texture: 'npc-pack',
						frame: neighbor.frameName
					}),
					expect.objectContaining({
						x: villagerHouse3Map.transitions[0]?.x,
						y: villagerHouse3Map.transitions[0]?.y,
						texture: 'starter-pack',
						frame: 'doorwayTile'
					})
				])
			);
			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'villager-house-3',
				packageId: null,
				presentationMode: 'fallback',
				requiredBackgroundIds: ['villager-house-3-painted-base-image'],
				selectedBackgroundIds: [],
				successfulBackgroundIds: [],
				selectedFallbackBlockerIds: villagerHouse3Map.blockers?.map(({ id }) => id),
				selectedFallbackDecorIds: [],
				selectedFallbackFenceIds: [],
				collisionIds: villagerHouse3CollisionIds,
				statefulObjectIds: villagerHouse3StatefulObjectIds
			});
			expect(target.diagnostics[0]?.entries).toEqual([
				expect.objectContaining({
					id: 'villager-house-3-painted-base-image',
					textureKey: base.textureKey,
					plane: 'base',
					status: 'missing-texture',
					expectedDimensions: { width: 1024, height: 704 },
					observedDimensions: null
				})
			]);
		} finally {
			target.restore();
		}
	});

	it('renders tilemap ground, a hero sprite, and encounter art for the resolved map', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		expect(scene.make.tilemap).toHaveBeenCalledWith({
			data: expect.any(Array),
			tileWidth: 32,
			tileHeight: 32
		});
		const tilemapCall = vi.mocked(scene.make.tilemap).mock.calls[0]![0]!;
		const tilemapData = tilemapCall.data as number[][];
		expect(tilemapData).toHaveLength(meadowEntryMap.height);
		expect(tilemapData[0]).toHaveLength(meadowEntryMap.width);
		expect(phaserState.tilemap.addTilesetImage).toHaveBeenCalledWith(
			'starter-ground-tiles',
			'starter-ground-tiles',
			32,
			32
		);
		expect(phaserState.tilemap.createLayer).toHaveBeenCalledWith(0, expect.anything(), 0, 0);
		expect(phaserState.tilemapLayer.setDepth).toHaveBeenCalledWith(-10);
		expect(tilemapData[0][0]).toBe(0);
		const tileAt = (x: number, y: number) => tilemapData[Math.floor(y / 32)]?.[Math.floor(x / 32)];
		expect(tileAt(3_040, 4_688)).toBeGreaterThan(0);
		expect(tileAt(3_776, 4_224)).toBeGreaterThan(0);
		expect(scene.add.sprite).toHaveBeenCalledWith(
			meadowEntryMap.spawn.x,
			meadowEntryMap.spawn.y,
			'animation-pack',
			'heroIdle0'
		);
		expect(scene.add.sprite).toHaveBeenCalledWith(4_928, 960, 'animation-pack', 'slimeScoutIdle0');
		expect(phaserState.enemyMarkers).toHaveLength(3);
		expect(scene.add.image).not.toHaveBeenCalledWith(5_960, 1_868, 'starter-pack', 'doorwayTile');
		expect(scene.add.image).toHaveBeenCalledWith(
			5_960,
			1_868,
			'environment-dressing',
			'stoneStair'
		);
		expect(scene.cameras.main.setBackgroundColor).toHaveBeenCalledWith('#1a1f2b');
	});

	it('renders the rebuilt Shrine and villager house contracts in the live scene', async () => {
		const restoreLocation = installLocationSearch('?mapDebug=collision');
		const { WorldScene } = await import('./WorldScene');

		try {
			for (const map of [
				shrineOfAuroraInteriorMap,
				villagerHouse1Map,
				villagerHouse2Map,
				villagerHouse3Map
			]) {
				vi.clearAllMocks();
				phaserState.reset();
				const scene = new WorldScene();
				scene.create({ mapId: map.id });
				expect(phaserState.playerMarker.x).toBe(map.spawn.x);
				expect(phaserState.playerMarker.y).toBe(map.spawn.y);

				const tilemapCall = vi.mocked(scene.make.tilemap).mock.calls[0]![0]!;
				const tilemapData = tilemapCall.data as number[][];
				expect(tilemapData).toHaveLength(map.height);
				expect(tilemapData[0]).toHaveLength(map.width);
				for (const patch of map.groundPatches ?? []) {
					const row = Math.floor(patch.y / 32);
					const column = Math.floor(patch.x / 32);
					expect(tilemapData[row]?.[column], `${map.id}:${patch.id}`).toBeGreaterThan(0);
				}

				for (const blocker of map.blockers ?? []) {
					expect(scene.add.tileSprite).toHaveBeenCalledWith(
						blocker.x,
						blocker.y,
						blocker.width,
						blocker.height,
						'environment-dressing',
						'ruinWall'
					);
				}
				for (const prop of map.interiorProps ?? []) {
					expect(scene.add.image).toHaveBeenCalledWith(
						prop.x,
						prop.y,
						'interior-props',
						prop.frameName
					);
				}
				for (const npc of [...(map.npcs ?? []), ...(map.ambientNpcs ?? [])]) {
					expect(scene.add.image).toHaveBeenCalledWith(npc.x, npc.y, 'npc-pack', npc.frameName);
				}
				expect(scene.add.image).toHaveBeenCalledWith(
					map.transitions[0]!.x,
					map.transitions[0]!.y,
					'starter-pack',
					'doorwayTile'
				);

				const commands = phaserState.graphicsMarkers[0]?.commands ?? [];
				for (const collision of (map.interiorProps ?? []).flatMap((prop) =>
					prop.collision ? [prop.collision] : []
				)) {
					expect(commands).toContainEqual(
						expect.objectContaining({
							kind: 'fillRect',
							x: collision.x - collision.width / 2 - PLAYER_COLLISION_RADIUS,
							y: collision.y - collision.height / 2 - PLAYER_COLLISION_RADIUS,
							width: collision.width + PLAYER_COLLISION_RADIUS * 2,
							height: collision.height + PLAYER_COLLISION_RADIUS * 2
						})
					);
				}
			}
		} finally {
			restoreLocation();
		}
	});

	it('renders independent base and foreground planes at their semantic depths', async () => {
		registerTwoPlaneBackgroundTestMap();
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			createSelectedTwoPlaneScene(scene);

			expect(twoPlaneBackgroundMarkers()).toHaveLength(2);
			expect(twoPlaneBackgroundMarkers()[0]).toMatchObject({
				x: 320,
				y: 160,
				texture: twoPlaneBaseTextureKey
			});
			expect(twoPlaneBackgroundMarkers()[0]?.setDisplaySize).toHaveBeenCalledWith(640, 320);
			expect(twoPlaneBackgroundMarkers()[0]?.setDepth).toHaveBeenCalledWith(-8.999);
			expect(twoPlaneBackgroundMarkers()[1]).toMatchObject({
				x: 352,
				y: 192,
				texture: twoPlaneForegroundTextureKey
			});
			expect(twoPlaneBackgroundMarkers()[1]?.setDisplaySize).toHaveBeenCalledWith(640, 320);
			expect(twoPlaneBackgroundMarkers()[1]?.setDepth).toHaveBeenCalledWith(100.002);
			expect(twoPlaneBlockerMarkers()).toHaveLength(0);
			expect(twoPlaneOwnedDecorMarkers()).toHaveLength(0);
			expect(twoPlaneOwnedFenceMarkers()).toHaveLength(0);
			expect(target.diagnostics).toHaveLength(1);
			expect(target.diagnostics[0]?.entries.map((entry) => entry.status)).toEqual([
				'rendered',
				'rendered'
			]);
			expect(target.diagnostics[0]?.successfulBackgroundIds).toEqual([
				'two-plane-base-image',
				'two-plane-foreground-image'
			]);
			expect(target.diagnostics[0]).toMatchObject({
				packageId: 'scene-support-two-plane-review',
				selectedBackgroundIds: ['two-plane-base-image', 'two-plane-foreground-image'],
				presentationMode: 'painted'
			});
		} finally {
			target.restore();
		}
	});

	it('renders a selected full-map package instead of bypassing through raw map backgrounds', async () => {
		registerTwoPlaneBackgroundTestMap();
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			createSelectedTwoPlaneScene(scene);

			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'scene-support-test',
				packageId: 'scene-support-two-plane-review',
				presentationMode: 'painted',
				selectedBackgroundIds: ['two-plane-base-image', 'two-plane-foreground-image']
			});
			expect(twoPlaneBackgroundMarkers()).toHaveLength(2);
			expect(scene.make.tilemap).not.toHaveBeenCalled();
		} finally {
			target.restore();
		}
	});

	it('uses package draw order and suppresses owned blockers, decor, and fences', async () => {
		registerTwoPlaneBackgroundTestMap();
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			createSelectedTwoPlaneScene(scene);

			expect(twoPlaneBackgroundMarkers()[0]?.setDepth).toHaveBeenCalledWith(-8.999);
			expect(twoPlaneBackgroundMarkers()[1]?.setDepth).toHaveBeenCalledWith(100.002);
			expect(twoPlaneBlockerMarkers()).toHaveLength(0);
			expect(twoPlaneOwnedDecorMarkers()).toHaveLength(0);
			expect(twoPlaneOwnedFenceMarkers()).toHaveLength(0);
			expect(target.diagnostics[0]?.successfulBackgroundIds).toEqual([
				'two-plane-base-image',
				'two-plane-foreground-image'
			]);
			expect(target.diagnostics[0]?.selectedFallbackBlockerIds).toEqual([]);
			expect(target.diagnostics[0]?.selectedFallbackDecorIds).toEqual([]);
			expect(target.diagnostics[0]?.selectedFallbackFenceIds).toEqual([]);
		} finally {
			target.restore();
		}
	});

	it('disabling regional backgrounds restores every owned visual', async () => {
		registerTwoPlaneBackgroundTestMap();
		const target = installPlaneDiagnosticListener();
		const restoreLocation = installLocationSearch('?regionalBackground=off');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			createSelectedTwoPlaneScene(scene);

			expect(twoPlaneBackgroundMarkers()).toHaveLength(0);
			expect(twoPlaneBlockerMarkers()).toHaveLength(8);
			expect(twoPlaneOwnedDecorMarkers()).toHaveLength(2);
			expect(twoPlaneOwnedFenceMarkers()).toHaveLength(2);
			expect(target.diagnostics[0]?.entries.map((entry) => entry.status)).toEqual([
				'disabled',
				'disabled'
			]);
			expect(target.diagnostics[0]?.successfulBackgroundIds).toEqual([]);
			expect(target.diagnostics[0]).toMatchObject({
				packageId: null,
				selectedBackgroundIds: [],
				presentationMode: 'fallback'
			});
			expect(target.diagnostics[0]?.selectedFallbackBlockerIds).toEqual([
				'two-plane-base-only',
				'two-plane-multi-owner',
				'two-plane-implicit-always',
				'two-plane-explicit-always'
			]);
			expect(target.diagnostics[0]?.selectedFallbackDecorIds).toEqual([
				'two-plane-base-only-decor',
				'two-plane-complete-decor'
			]);
			expect(target.diagnostics[0]?.selectedFallbackFenceIds).toEqual([
				'two-plane-base-only-fence',
				'two-plane-complete-fence'
			]);
		} finally {
			restoreLocation();
			target.restore();
		}
	});

	it.each([
		[
			'missing texture',
			(key: string): void => {
				phaserState.missingTextureKeys.add(key);
			},
			'missing-texture'
		],
		[
			'missing placeholder',
			(key: string): void => {
				phaserState.regionalBackgroundTextureMocks.get(key)!.key = '__MISSING';
			},
			'missing-texture'
		],
		[
			'wrong dimensions',
			(key: string): void => {
				phaserState.regionalBackgroundTextureMocks.get(key)!.source[0] = {
					width: 639,
					height: 320
				};
			},
			'invalid-dimensions'
		],
		[
			'image creation exception',
			(key: string): void => {
				phaserState.imageCreationFailureKeys.add(key);
			},
			'render-failed'
		],
		[
			'post-creation exception',
			(key: string): void => {
				phaserState.postCreationFailureKeys.add(key);
			},
			'render-failed'
		]
	] as const)(
		'falls back atomically for a %s in any package descriptor',
		async (_label, arrange, status) => {
			registerTwoPlaneBackgroundTestMap();
			const target = installPlaneDiagnosticListener();
			arrange(twoPlaneForegroundTextureKey);
			const { WorldScene } = await import('./WorldScene');
			const scene = new WorldScene();

			try {
				createSelectedTwoPlaneScene(scene);

				expect(twoPlaneBackgroundMarkers()).toHaveLength(0);
				expect(twoPlaneBlockerMarkers()).toHaveLength(8);
				expect(twoPlaneOwnedDecorMarkers()).toHaveLength(2);
				expect(twoPlaneOwnedFenceMarkers()).toHaveLength(2);
				expect(scene.make.tilemap).toHaveBeenCalledOnce();
				expect(target.diagnostics[0]?.entries.map((entry) => entry.status)).toEqual([
					'rendered',
					status
				]);
				expect(target.diagnostics[0]?.successfulBackgroundIds).toEqual([]);
				expect(target.diagnostics[0]).toMatchObject({
					packageId: null,
					selectedBackgroundIds: [],
					presentationMode: 'fallback'
				});
				if (status === 'render-failed' && _label === 'post-creation exception') {
					expect(
						phaserState.imageMarkers.find(
							(marker) => marker.texture === twoPlaneForegroundTextureKey
						)?.destroy
					).toHaveBeenCalledOnce();
				}
			} finally {
				target.restore();
			}
		}
	);

	it('rolls back a rendered base when the full-map package later fails', async () => {
		registerTwoPlaneBackgroundTestMap();
		const target = installPlaneDiagnosticListener();
		phaserState.missingTextureKeys.add(twoPlaneForegroundTextureKey);
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			createSelectedTwoPlaneScene(scene);

			expect(twoPlaneBackgroundMarkers()).toHaveLength(0);
			expect(twoPlaneBlockerMarkers()).toHaveLength(8);
			expect(twoPlaneOwnedDecorMarkers()).toHaveLength(2);
			expect(twoPlaneOwnedFenceMarkers()).toHaveLength(2);
			expect(scene.make.tilemap).toHaveBeenCalledOnce();
			expect(target.diagnostics[0]?.entries.map((entry) => entry.status)).toEqual([
				'rendered',
				'missing-texture'
			]);
			expect(target.diagnostics[0]?.successfulBackgroundIds).toEqual([]);
			expect(target.diagnostics[0]).toMatchObject({
				packageId: null,
				selectedBackgroundIds: [],
				presentationMode: 'fallback'
			});
		} finally {
			target.restore();
		}
	});

	it('rolls back every two-plane image when the base descriptor fails', async () => {
		registerTwoPlaneBackgroundTestMap();
		const target = installPlaneDiagnosticListener();
		phaserState.missingTextureKeys.add(twoPlaneBaseTextureKey);
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			createSelectedTwoPlaneScene(scene);

			expect(twoPlaneBackgroundMarkers()).toHaveLength(0);
			expect(twoPlaneBlockerMarkers()).toHaveLength(8);
			expect(twoPlaneOwnedDecorMarkers()).toHaveLength(2);
			expect(twoPlaneOwnedFenceMarkers()).toHaveLength(2);
			expect(scene.make.tilemap).toHaveBeenCalledOnce();
			expect(target.diagnostics[0]?.successfulBackgroundIds).toEqual([]);
			expect(target.diagnostics[0]).toMatchObject({
				packageId: null,
				selectedBackgroundIds: [],
				presentationMode: 'fallback'
			});
			expect(target.diagnostics[0]?.selectedFallbackBlockerIds).toEqual([
				'two-plane-base-only',
				'two-plane-multi-owner',
				'two-plane-implicit-always',
				'two-plane-explicit-always'
			]);
			expect(target.diagnostics[0]?.selectedFallbackDecorIds).toEqual([
				'two-plane-base-only-decor',
				'two-plane-complete-decor'
			]);
			expect(target.diagnostics[0]?.selectedFallbackFenceIds).toEqual([
				'two-plane-base-only-fence',
				'two-plane-complete-fence'
			]);
		} finally {
			target.restore();
		}
	});

	it('rolls back the whole full-map package when its first alternative plane fails', async () => {
		registerAlternativeOwnerBackgroundTestMap();
		const target = installPlaneDiagnosticListener();
		phaserState.missingTextureKeys.add(alternativeEastBoundaryTextureKey);
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			createSelectedAlternativeScene(scene);

			expect(
				alternativeBackgroundMarkers().filter((marker) => marker.destroy.mock.calls.length === 0)
			).toHaveLength(0);
			expect(alternativeOwnedBlockerMarkers()).toHaveLength(2);
			expect(alternativeOwnedDecorMarkers()).toHaveLength(1);
			expect(alternativeOwnedFenceMarkers()).toHaveLength(1);
			expect(scene.make.tilemap).toHaveBeenCalledOnce();
			expect(target.diagnostics[0]?.successfulBackgroundIds).toEqual([]);
			expect(target.diagnostics[0]).toMatchObject({
				packageId: null,
				selectedBackgroundIds: [],
				presentationMode: 'fallback'
			});
		} finally {
			target.restore();
		}
	});

	it('rolls back the whole full-map package when its last two alternative planes fail', async () => {
		registerAlternativeOwnerBackgroundTestMap();
		const target = installPlaneDiagnosticListener();
		phaserState.missingTextureKeys.add(alternativeWildwoodBaseTextureKey);
		phaserState.missingTextureKeys.add(alternativeWildwoodForegroundTextureKey);
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			createSelectedAlternativeScene(scene);

			expect(
				alternativeBackgroundMarkers().filter((marker) => marker.destroy.mock.calls.length === 0)
			).toHaveLength(0);
			expect(alternativeOwnedBlockerMarkers()).toHaveLength(2);
			expect(alternativeOwnedDecorMarkers()).toHaveLength(1);
			expect(alternativeOwnedFenceMarkers()).toHaveLength(1);
			expect(scene.make.tilemap).toHaveBeenCalledOnce();
			expect(target.diagnostics[0]?.successfulBackgroundIds).toEqual([]);
			expect(target.diagnostics[0]).toMatchObject({
				packageId: null,
				selectedBackgroundIds: [],
				presentationMode: 'fallback'
			});
		} finally {
			target.restore();
		}
	});

	it('falls back atomically when an alternative package has a middle-plane failure', async () => {
		registerAlternativeOwnerBackgroundTestMap();
		const target = installPlaneDiagnosticListener();
		phaserState.missingTextureKeys.add(alternativeEastBoundaryTextureKey);
		phaserState.missingTextureKeys.add(alternativeWildwoodForegroundTextureKey);
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			createSelectedAlternativeScene(scene);

			expect(
				alternativeBackgroundMarkers().filter((marker) => marker.destroy.mock.calls.length === 0)
			).toHaveLength(0);
			expect(alternativeOwnedBlockerMarkers()).toHaveLength(2);
			expect(alternativeOwnedDecorMarkers()).toHaveLength(1);
			expect(alternativeOwnedFenceMarkers()).toHaveLength(1);
			expect(scene.make.tilemap).toHaveBeenCalledOnce();
			expect(target.diagnostics[0]?.successfulBackgroundIds).toEqual([]);
			expect(target.diagnostics[0]).toMatchObject({
				packageId: null,
				selectedBackgroundIds: [],
				presentationMode: 'fallback'
			});
			expect(target.diagnostics[0]?.selectedFallbackBlockerIds).toEqual([
				'alternative-owner-blocker'
			]);
			expect(target.diagnostics[0]?.selectedFallbackDecorIds).toEqual(['alternative-owner-decor']);
			expect(target.diagnostics[0]?.selectedFallbackFenceIds).toEqual(['alternative-owner-fence']);
		} finally {
			target.restore();
		}
	});

	it('does not retain a partial package after a foreground render fault', async () => {
		registerTwoPlaneBackgroundTestMap();
		const restoreLocation = installLocationSearch(
			'?regionalBackgroundFault=two-plane-foreground-image:render'
		);
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			createSelectedTwoPlaneScene(scene);

			expect(twoPlaneBackgroundMarkers()).toHaveLength(0);
			expect(twoPlaneBlockerMarkers()).toHaveLength(8);
			expect(twoPlaneOwnedDecorMarkers()).toHaveLength(2);
			expect(twoPlaneOwnedFenceMarkers()).toHaveLength(2);
		} finally {
			restoreLocation();
		}
	});

	it('does not retain a partial package after a base render fault', async () => {
		registerTwoPlaneBackgroundTestMap();
		const restoreLocation = installLocationSearch(
			'?regionalBackgroundFault=two-plane-base-image:render'
		);
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			createSelectedTwoPlaneScene(scene);

			expect(twoPlaneBackgroundMarkers()).toHaveLength(0);
			expect(twoPlaneBlockerMarkers()).toHaveLength(8);
			expect(twoPlaneOwnedDecorMarkers()).toHaveLength(2);
			expect(twoPlaneOwnedFenceMarkers()).toHaveLength(2);
		} finally {
			restoreLocation();
		}
	});

	it('keeps visually suppressed fallback-only blockers in movement and collision-debug geometry', async () => {
		registerTwoPlaneBackgroundTestMap();
		const restoreLocation = installLocationSearch('?mapDebug=collision');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			createSelectedTwoPlaneScene(scene);

			// A full-map package suppresses every static blocker visual while preserving collision geometry.
			expect(twoPlaneBlockerMarkers()).toHaveLength(0);
			expect(phaserState.graphicsMarkers[0]?.commands).toContainEqual({
				kind: 'fillRect',
				x: 68,
				y: 116,
				width: 56,
				height: 88,
				color: 0xff3355,
				alpha: 0.18
			});

			Object.assign(phaserState.playerMarker, { x: 96, y: 96 });
			phaserState.cursorKeys.down.isDown = true;
			scene.update(0, 250);

			expect(phaserState.playerMarker).toMatchObject({ x: 96, y: 96 });
		} finally {
			restoreLocation();
		}
	});

	it('resets successful background IDs when the same scene creates a second map instance', async () => {
		registerTwoPlaneBackgroundTestMap();
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			createSelectedTwoPlaneScene(scene);
			phaserState.missingTextureKeys.add(twoPlaneForegroundTextureKey);
			createSelectedTwoPlaneScene(scene);

			expect(target.diagnostics).toHaveLength(2);
			expect(target.diagnostics[0]?.successfulBackgroundIds).toEqual([
				'two-plane-base-image',
				'two-plane-foreground-image'
			]);
			expect(target.diagnostics[1]?.entries.map((entry) => entry.status)).toEqual([
				'rendered',
				'missing-texture'
			]);
			expect(target.diagnostics[1]?.successfulBackgroundIds).toEqual([]);
			expect(target.diagnostics[1]).toMatchObject({
				packageId: null,
				selectedBackgroundIds: [],
				presentationMode: 'fallback'
			});
		} finally {
			target.restore();
		}
	});

	it('uses the complete package by default for the active Meadow Entry map', async () => {
		const restoreLocation = installLocationSearch('');
		const target = installPlaneDiagnosticListener();
		const selection = await registerCompletePaintedBackgroundMocks();
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: meadowEntryMap.id });

			expect(meadowEntryMap.backgroundImages ?? []).toEqual([]);
			expect(target.diagnostics).toHaveLength(1);
			expect(target.diagnostics[0]?.entries.map((entry) => entry.status)).toEqual([
				'rendered',
				'rendered',
				'rendered',
				'rendered'
			]);
			expect(target.diagnostics[0]).toMatchObject({
				paintedMode: 'complete',
				packageId: 'meadow-entry-painted-v2-complete',
				requiredBackgroundIds: selection.backgrounds.map(({ id }) => id),
				selectedBackgroundIds: selection.backgrounds.map(({ id }) => id),
				successfulBackgroundIds: selection.backgrounds.map(({ id }) => id).sort(),
				presentationMode: 'painted'
			});
			expect(target.diagnostics[0]?.selectedFallbackBlockerIds).toEqual([]);
			expect(target.diagnostics[0]?.selectedFallbackDecorIds).toEqual([]);
			expect(target.diagnostics[0]?.selectedFallbackFenceIds).toEqual([]);
		} finally {
			restoreLocation();
			target.restore();
		}
	});

	it('resolves explicit painted opt-in descriptors while preserving historical partial ownership', async () => {
		const restoreLocation = installLocationSearch('?meadowPaintedPilot=on');
		const target = installPlaneDiagnosticListener();
		const selection = await registerPaintedPilotBackgroundMocks();
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: meadowEntryMap.id });

			expect(
				phaserState.imageMarkers
					.filter((marker) =>
						selection.backgrounds.some(({ textureKey }) => textureKey === marker.texture)
					)
					.map((marker) => marker.texture)
			).toEqual(selection.backgrounds.map(({ textureKey }) => textureKey));
			expect(target.diagnostics[0]?.paintedMode).toBe('pilot');
			expect(target.diagnostics[0]?.entries.map((entry) => entry.status)).toEqual([
				'rendered',
				'rendered'
			]);
			expect(target.diagnostics[0]?.successfulBackgroundIds).toEqual(
				selection.backgrounds.map(({ id }) => id).sort()
			);
			expect(target.diagnostics[0]).toMatchObject({
				packageId: 'meadow-entry-painted-v2-legacy',
				requiredBackgroundIds: selection.backgrounds.map(({ id }) => id),
				selectedBackgroundIds: selection.backgrounds.map(({ id }) => id),
				presentationMode: 'painted'
			});
			for (const sourceId of expectedOrganicBlockerOwners) {
				expect(findPaintedFallbackMarkers(sourceId)).toHaveLength(0);
			}
			expect(target.diagnostics[0]?.selectedFallbackBlockerIds).toEqual([]);
			expect(target.diagnostics[0]?.selectedFallbackDecorIds).toEqual([]);
			expect(target.diagnostics[0]?.selectedFallbackFenceIds).toEqual([]);
			expect(findPaintedFallbackMarkers('village-decor-28-25')).toHaveLength(0);
			expect(findPaintedFallbackMarkers('village-decor-22-77')).toHaveLength(0);
			expect(phaserState.imageMarkers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						x: 704,
						y: 5_712,
						texture: 'village-buildings',
						frame: 'heroHouse'
					})
				])
			);
			expect(
				phaserState.imageMarkers.filter(
					({ x, y, texture, frame }) =>
						x === 3_040 && y === 4_544 && texture === 'village-dressing' && frame === 'poleLantern'
				)
			).toHaveLength(1);
			expect(
				phaserState.imageMarkers.filter(
					({ x, y, texture, frame }) =>
						x === 5_280 &&
						y === 4_420 &&
						texture === forestDressingAsset.key &&
						frame === 'treeCluster'
				)
			).toHaveLength(1);
			expect(
				phaserState.tileSpriteMarkers.filter(
					({ x, y, width, height, frame }) =>
						x === 5_520 && y === 4_420 && width === 520 && height === 360 && frame === 'forestFloor'
				)
			).toHaveLength(1);
			expect(
				phaserState.imageMarkers.filter(
					({ texture, frame }) => texture === fenceDressingAsset.key && frame === 'verticalFence'
				)
			).not.toHaveLength(0);
			const strictCollisionRects = collectStrictCollisionRects(meadowEntryMap);
			for (const sourceId of expectedOrganicBlockerOwners) {
				expect(strictCollisionRects).toEqual(
					expect.arrayContaining([expect.objectContaining(expectedOrganicBlockerBounds[sourceId])])
				);
			}
		} finally {
			target.restore();
			restoreLocation();
		}
	});

	it('renders the complete package with no legacy static presentation overlays', async () => {
		const restoreLocation = installLocationSearch(
			'?mapBackgroundReview=meadow-entry-painted-v2-complete'
		);
		const target = installPlaneDiagnosticListener();
		const selection = await registerCompletePaintedBackgroundMocks();
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: meadowEntryMap.id });

			expect(
				phaserState.imageMarkers.filter(
					(marker) =>
						selection.backgrounds.some(({ textureKey }) => textureKey === marker.texture) &&
						marker.destroy.mock.calls.length === 0
				)
			).toHaveLength(4);
			expect(scene.make.tilemap).not.toHaveBeenCalled();
			expect(
				phaserState.imageMarkers.filter((marker) =>
					[
						forestDressingAsset.key,
						fenceDressingAsset.key,
						'interior-props',
						'village-dressing',
						'village-hedge'
					].includes(marker.texture)
				)
			).toEqual([]);
			expect(phaserState.tileSpriteMarkers).toEqual([]);
			expect(phaserState.playerMarker).toMatchObject({
				x: meadowEntryMap.spawn.x,
				y: meadowEntryMap.spawn.y
			});
			expect(phaserState.enemyMarkers).toHaveLength(3);
			expect(target.diagnostics[0]).toMatchObject({
				paintedMode: 'complete',
				packageId: 'meadow-entry-painted-v2-complete',
				presentationMode: 'painted',
				requiredBackgroundIds: selection.backgrounds.map(({ id }) => id),
				selectedBackgroundIds: selection.backgrounds.map(({ id }) => id),
				successfulBackgroundIds: selection.backgrounds.map(({ id }) => id).sort(),
				selectedFallbackBlockerIds: [],
				selectedFallbackDecorIds: [],
				selectedFallbackFenceIds: []
			});
		} finally {
			target.restore();
			restoreLocation();
		}
	});

	it.each(COMPLETE_PAINTED_FAULT_MATRIX)(
		'restores every complete static collection when the %s texture has a %s',
		async (_targetLabel, targetId, _faultLabel, arrange, status, fault) => {
			const restoreLocation = installLocationSearch(
				fault
					? `?mapBackgroundReview=meadow-entry-painted-v2-complete&regionalBackgroundFault=${targetId}:render`
					: '?mapBackgroundReview=meadow-entry-painted-v2-complete'
			);
			const selection = await registerCompletePaintedBackgroundMocks();
			const targetTexture = selection.backgrounds.find(({ id }) => id === targetId)!.textureKey;
			arrange(targetTexture);
			const target = installPlaneDiagnosticListener();
			const { meadowEntryMap } = await import('$lib/game/content/maps');
			const { WorldScene } = await import('./WorldScene');
			const scene = new WorldScene();

			try {
				scene.create({ mapId: meadowEntryMap.id });

				expect(
					phaserState.imageMarkers.filter(
						(marker) =>
							selection.backgrounds.some(({ textureKey }) => textureKey === marker.texture) &&
							marker.destroy.mock.calls.length === 0
					)
				).toHaveLength(0);
				expect(scene.make.tilemap).toHaveBeenCalledOnce();
				expect(findPaintedFallbackMarkers('village-decor-28-25')).toHaveLength(1);
				for (const sourceId of expectedOrganicBlockerOwners) {
					expect(findPaintedFallbackMarkers(sourceId), sourceId).toHaveLength(
						expectedOrganicBlockerMarkerCount(sourceId)
					);
				}
				expect(phaserState.enemyMarkers).toHaveLength(3);
				expect(target.diagnostics[0]?.paintedMode).toBe('complete');
				expect(target.diagnostics[0]?.entries.find(({ id }) => id === targetId)?.status).toBe(
					status
				);
				expect(
					target.diagnostics[0]?.entries.filter(({ status: entryStatus }) => entryStatus === status)
				).toHaveLength(1);
				expect(target.diagnostics[0]).toMatchObject({
					packageId: null,
					selectedBackgroundIds: [],
					presentationMode: 'fallback',
					successfulBackgroundIds: []
				});
				expect(target.diagnostics[0]?.selectedFallbackBlockerIds).toEqual(
					expect.arrayContaining([...expectedOrganicBlockerOwners])
				);
				expect(target.diagnostics[0]?.selectedFallbackDecorIds).toEqual(
					expect.arrayContaining(['village-decor-28-25'])
				);
				expect(target.diagnostics[0]?.selectedFallbackFenceIds.length).toBeGreaterThan(0);
			} finally {
				target.restore();
				restoreLocation();
			}
		}
	);

	it('keeps non-Meadow maps on the registry source while pilot mode is enabled', async () => {
		registerSceneSupportTestMap();
		const restoreLocation = installLocationSearch('?meadowPaintedPilot=on');
		const target = installPlaneDiagnosticListener();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'scene-support-test' });

			expect(target.diagnostics[0]).toMatchObject({
				mapId: 'scene-support-test',
				paintedMode: 'pilot',
				entries: [],
				successfulBackgroundIds: []
			});
		} finally {
			target.restore();
			restoreLocation();
		}
	});

	it.each([
		[
			'missing texture',
			(key: string) => phaserState.missingTextureKeys.add(key),
			'missing-texture',
			false
		],
		[
			'wrong dimensions',
			(key: string) => {
				phaserState.regionalBackgroundTextureMocks.get(key)!.source[0] = {
					width: 1,
					height: 1
				};
			},
			'invalid-dimensions',
			false
		],
		['injected render failure', () => {}, 'render-failed', true]
	] as const)(
		'restores the complete static overlay when the Crossroads plane has a pilot %s',
		async (_label, arrange, status, fault) => {
			const selection = await registerPaintedPilotBackgroundMocks();
			const crossroads = selection.backgrounds.find((background) =>
				background.id.includes('crossroads-camera-base-image')
			)!;
			const search = fault
				? `?meadowPaintedPilot=on&mapDebug=collision&regionalBackgroundFault=${crossroads.id}:render`
				: '?meadowPaintedPilot=on&mapDebug=collision';
			const restoreLocation = installLocationSearch(search);
			arrange(crossroads.textureKey);
			const target = installPlaneDiagnosticListener();
			const { meadowEntryMap } = await import('$lib/game/content/maps');
			const { WorldScene } = await import('./WorldScene');
			const scene = new WorldScene();

			try {
				scene.create({ mapId: meadowEntryMap.id });

				for (const sourceId of expectedOrganicBlockerOwners) {
					expect(findPaintedFallbackMarkers(sourceId), sourceId).toHaveLength(
						expectedOrganicBlockerMarkerCount(sourceId)
					);
				}
				expect(target.diagnostics[0]?.paintedMode).toBe('pilot');
				expect(target.diagnostics[0]?.entries.find(({ id }) => id === crossroads.id)?.status).toBe(
					status
				);
				expect(target.diagnostics[0]?.entries.map((entry) => entry.status)).toEqual([
					'rendered',
					status
				]);
				expect(target.diagnostics[0]).toMatchObject({
					packageId: null,
					selectedBackgroundIds: [],
					presentationMode: 'fallback',
					successfulBackgroundIds: []
				});
				const packageMarkers = phaserState.imageMarkers.filter((marker) =>
					selection.backgrounds.some(({ textureKey }) => textureKey === marker.texture)
				);
				expect(packageMarkers.length).toBeGreaterThan(0);
				expect(packageMarkers.every((marker) => marker.destroy.mock.calls.length > 0)).toBe(true);
				expect(target.diagnostics[0]?.selectedFallbackBlockerIds).toEqual(
					expect.arrayContaining([...expectedOrganicBlockerOwners])
				);
				expect(target.diagnostics[0]?.selectedFallbackDecorIds).toEqual(
					expect.arrayContaining([
						'village-decor-28-25',
						'wildwood-threshold-floor',
						'wildwood-threshold-tree-wall-west'
					])
				);
				expect(target.diagnostics[0]?.selectedFallbackFenceIds).toEqual(
					expect.arrayContaining([
						'coast-approach-west-fence',
						'coast-approach-east-fence',
						'coast-fork-east-field-fence'
					])
				);
				expect(phaserState.imageMarkers).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							x: 3_040,
							y: 4_544,
							texture: 'village-dressing',
							frame: 'poleLantern'
						}),
						expect.objectContaining({
							x: 5_280,
							y: 4_420,
							texture: forestDressingAsset.key,
							frame: 'treeCluster'
						})
					])
				);
				expect(phaserState.tileSpriteMarkers).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							x: 5_520,
							y: 4_420,
							width: 520,
							height: 360,
							frame: 'forestFloor'
						})
					])
				);
				expect(phaserState.graphicsMarkers[0]?.commands).toContainEqual({
					kind: 'fillRect',
					x: 3_136,
					y: 2_866,
					width: 408,
					height: 88,
					color: 0xff3355,
					alpha: 0.18
				});
				const playerLeftOfBlocker = meadowEntryMap.blockers?.find(
					({ id }) => id === 'silverpine-wall-B-south'
				);
				expect(playerLeftOfBlocker).toBeDefined();
				Object.assign(phaserState.playerMarker, {
					x: playerLeftOfBlocker!.x - playerLeftOfBlocker!.width / 2 - PLAYER_COLLISION_RADIUS - 1,
					y: playerLeftOfBlocker!.y
				});
				phaserState.cursorKeys.right.isDown = true;
				scene.update(0, 1_000);
				expect(phaserState.playerMarker.x).toBe(
					playerLeftOfBlocker!.x - playerLeftOfBlocker!.width / 2 - PLAYER_COLLISION_RADIUS - 1
				);
			} finally {
				target.restore();
				restoreLocation();
			}
		}
	);

	it.each([
		[
			'missing texture',
			(key: string) => phaserState.missingTextureKeys.add(key),
			'missing-texture',
			false
		],
		[
			'wrong dimensions',
			(key: string) => {
				phaserState.regionalBackgroundTextureMocks.get(key)!.source[0] = {
					width: 1,
					height: 1
				};
			},
			'invalid-dimensions',
			false
		],
		['injected render failure', () => {}, 'render-failed', true]
	] as const)(
		'restores the complete static overlay when the Sundrop plane has a pilot %s',
		async (_label, arrange, status, fault) => {
			const selection = await registerPaintedPilotBackgroundMocks();
			const sundrop = selection.backgrounds.find((background) =>
				background.id.includes('sundrop-camera-base-image')
			)!;
			const search = fault
				? `?meadowPaintedPilot=on&regionalBackgroundFault=${sundrop.id}:render`
				: '?meadowPaintedPilot=on';
			const restoreLocation = installLocationSearch(search);
			arrange(sundrop.textureKey);
			const target = installPlaneDiagnosticListener();
			const { meadowEntryMap } = await import('$lib/game/content/maps');
			const { WorldScene } = await import('./WorldScene');
			const scene = new WorldScene();

			try {
				scene.create({ mapId: meadowEntryMap.id });

				expect(findPaintedFallbackMarkers('village-decor-28-25')).toHaveLength(1);
				for (const sourceId of expectedOrganicBlockerOwners) {
					expect(findPaintedFallbackMarkers(sourceId), sourceId).toHaveLength(
						expectedOrganicBlockerMarkerCount(sourceId)
					);
				}
				expect(target.diagnostics[0]?.selectedFallbackBlockerIds).toEqual(
					expect.arrayContaining([...expectedOrganicBlockerOwners])
				);
				expect(target.diagnostics[0]?.paintedMode).toBe('pilot');
				expect(target.diagnostics[0]?.entries.find(({ id }) => id === sundrop.id)?.status).toBe(
					status
				);
				expect(target.diagnostics[0]?.entries.map((entry) => entry.status)).toEqual([
					status,
					'rendered'
				]);
				expect(target.diagnostics[0]).toMatchObject({
					packageId: null,
					selectedBackgroundIds: [],
					presentationMode: 'fallback',
					successfulBackgroundIds: []
				});
				const packageMarkers = phaserState.imageMarkers.filter((marker) =>
					selection.backgrounds.some(({ textureKey }) => textureKey === marker.texture)
				);
				expect(packageMarkers.length).toBeGreaterThan(0);
				expect(packageMarkers.every((marker) => marker.destroy.mock.calls.length > 0)).toBe(true);
				expect(target.diagnostics[0]?.selectedFallbackDecorIds).toContain('village-decor-28-25');
				expect(target.diagnostics[0]?.selectedFallbackDecorIds).toEqual(
					expect.arrayContaining(['wildwood-threshold-floor', 'wildwood-threshold-tree-wall-west'])
				);
				expect(target.diagnostics[0]?.selectedFallbackFenceIds).toEqual(
					expect.arrayContaining([
						'coast-approach-west-fence',
						'coast-approach-east-fence',
						'coast-fork-east-field-fence'
					])
				);
			} finally {
				target.restore();
				restoreLocation();
			}
		}
	);

	it.each([
		['Crossroads crop succeeds', ['meadow-entry-painted-v2-sundrop-camera-base'], 1],
		['Sundrop crop succeeds', ['meadow-entry-painted-v2-crossroads-camera-base'], 1],
		[
			'both overlap crops fail',
			[
				'meadow-entry-painted-v2-sundrop-camera-base',
				'meadow-entry-painted-v2-crossroads-camera-base'
			],
			1
		]
	] as const)(
		'restores all static overlays when any pilot crop is unavailable: %s',
		async (_label, missingKeys, expectedCount) => {
			await registerPaintedPilotBackgroundMocks();
			for (const key of missingKeys) phaserState.missingTextureKeys.add(key);
			const restoreLocation = installLocationSearch('?meadowPaintedPilot=on');
			const target = installPlaneDiagnosticListener();
			const { meadowEntryMap } = await import('$lib/game/content/maps');
			const { WorldScene } = await import('./WorldScene');
			const scene = new WorldScene();

			try {
				scene.create({ mapId: meadowEntryMap.id });

				expect(findPaintedFallbackMarkers('village-decor-22-77')).toHaveLength(expectedCount);
				expect(target.diagnostics[0]?.paintedMode).toBe('pilot');
				if (expectedCount === 1) {
					expect(target.diagnostics[0]?.selectedFallbackDecorIds).toContain('village-decor-22-77');
				} else {
					expect(target.diagnostics[0]?.selectedFallbackDecorIds).not.toContain(
						'village-decor-22-77'
					);
				}
			} finally {
				target.restore();
				restoreLocation();
			}
		}
	);

	it('suppresses static foreground decor for a selected full-map package', async () => {
		registerSceneSupportTestMap();
		const backgroundTextureKey = 'scene-support-background-texture';
		phaserState.regionalBackgroundTextureMocks.set(backgroundTextureKey, {
			key: backgroundTextureKey,
			source: [{ width: 1_792, height: 1_536 }],
			get: vi.fn(() => ({ cutWidth: 1_792, cutHeight: 1_536 }))
		});
		const background = {
			id: 'scene-support-background',
			x: 320,
			y: 320,
			width: 1792,
			height: 1536,
			textureKey: backgroundTextureKey,
			plane: 'base' as const,
			drawOrder: 1_000
		} satisfies MapBackgroundImage;
		maps['scene-support-test']!.mapDecor = [
			{
				id: 'scene-support-floor-decor',
				x: 128,
				y: 128,
				width: 64,
				height: 64,
				textureKey: 'forest-dressing',
				frameName: 'brush',
				depth: 'floor',
				visual: { mode: 'always' }
			}
		];
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			mapId: 'scene-support-test',
			mapBackgroundPackageSelection: selectedSceneSupportPackage(
				'scene-support-background-review',
				[background]
			)
		});

		const imageCalls = vi.mocked(scene.add.image).mock.calls;
		const backgroundCallIndex = imageCalls.findIndex(
			([, , texture]) => texture === backgroundTextureKey
		);
		const floorDecorCallIndex = imageCalls.findIndex(
			([, , texture, frame]) => texture === 'forest-dressing' && frame === 'brush'
		);
		expect(backgroundCallIndex).toBeGreaterThanOrEqual(0);
		expect(floorDecorCallIndex).toBe(-1);
		expect(scene.make.tilemap).not.toHaveBeenCalled();
	});

	it('creates no collision-debug Graphics object by default', async () => {
		registerSceneSupportTestMap();
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'scene-support-test' });

		expect(scene.add.graphics).not.toHaveBeenCalled();
		expect(phaserState.graphicsMarkers).toHaveLength(0);
	});

	it('creates one high-depth collision overlay with the map perimeter and player-center inset', async () => {
		registerSceneSupportTestMap();
		const restoreLocation = installLocationSearch('?mapDebug=collision');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'scene-support-test' });

			expect(scene.add.graphics).toHaveBeenCalledOnce();
			expect(phaserState.graphicsMarkers).toHaveLength(1);
			const graphics = phaserState.graphicsMarkers[0]!;
			expect(graphics.setDepth).toHaveBeenCalledWith(10_000);
			expect(graphics.commands).toContainEqual(
				expect.objectContaining({
					kind: 'strokeRect',
					x: 0,
					y: 0,
					width: 640,
					height: 640
				})
			);
			expect(graphics.commands).toContainEqual(
				expect.objectContaining({
					kind: 'strokeRect',
					x: 12,
					y: 12,
					width: 616,
					height: 616
				})
			);
		} finally {
			restoreLocation();
		}
	});

	it('builds the static collision command buffer after foreground world content', async () => {
		registerSceneSupportTestMap();
		maps['scene-support-test']!.mapDecor = [
			{
				id: 'scene-support-foreground',
				x: 320,
				y: 320,
				width: 64,
				height: 64,
				textureKey: 'forest-dressing',
				frameName: 'brush',
				depth: 'foreground'
			}
		];
		const restoreLocation = installLocationSearch('?mapDebug=collision');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'scene-support-test' });

			const foregroundCallIndex = vi
				.mocked(scene.add.image)
				.mock.calls.findIndex(
					([, , texture, frame]) => texture === 'forest-dressing' && frame === 'brush'
				);
			const foregroundOrder = vi.mocked(scene.add.image).mock.invocationCallOrder[
				foregroundCallIndex
			]!;
			const debugOrder = vi.mocked(scene.add.graphics).mock.invocationCallOrder[0]!;
			expect(foregroundOrder).toBeLessThan(debugOrder);
		} finally {
			restoreLocation();
		}
	});

	it('draws player-radius-expanded blocker, fence, and colliding decor envelopes', async () => {
		registerSceneSupportTestMap();
		maps['scene-support-test']!.fences = [
			{ id: 'scene-support-fence', x: 400, y: 400, width: 64, height: 32 }
		];
		maps['scene-support-test']!.mapDecor = [
			{
				id: 'scene-support-colliding-decor',
				x: 500,
				y: 500,
				width: 48,
				height: 32,
				textureKey: 'forest-dressing',
				frameName: 'brush',
				collision: {
					id: 'scene-support-colliding-decor-bounds',
					x: 500,
					y: 500,
					width: 40,
					height: 20
				}
			}
		];
		const restoreLocation = installLocationSearch('?mapDebug=collision');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'scene-support-test' });

			const commands = phaserState.graphicsMarkers[0]!.commands;
			expect(commands).toContainEqual({
				kind: 'fillRect',
				x: 132,
				y: 4,
				width: 56,
				height: 184,
				color: 0xff3355,
				alpha: 0.18
			});
			expect(commands).toContainEqual({
				kind: 'fillRect',
				x: 356,
				y: 372,
				width: 88,
				height: 56,
				color: 0xff3355,
				alpha: 0.18
			});
			expect(commands).toContainEqual({
				kind: 'fillRect',
				x: 468,
				y: 478,
				width: 64,
				height: 44,
				color: 0xff3355,
				alpha: 0.18
			});
		} finally {
			restoreLocation();
		}
	});

	it('draws a landmark raw footprint and its doorway-carved collision pieces with player padding', async () => {
		registerSceneSupportTestMap();
		maps['scene-support-test']!.landmarks = [
			{
				id: 'scene-support-house-exterior',
				x: 320,
				y: 320,
				width: 96,
				height: 96,
				labelKey: 'content.maps.landmarks.hero-house-exterior.label',
				label: 'Test house'
			}
		];
		maps['scene-support-test']!.transitions.push({
			id: 'scene-support-house-door',
			x: 320,
			y: 350,
			toMapId: 'hero-house'
		});
		const restoreLocation = installLocationSearch('?mapDebug=collision');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'scene-support-test' });

			const commands = phaserState.graphicsMarkers[0]!.commands;
			expect(commands).toContainEqual({
				kind: 'strokeRect',
				x: 272,
				y: 272,
				width: 96,
				height: 96,
				color: 0xffc857,
				alpha: 0.95,
				lineWidth: 2
			});
			expect(commands).toContainEqual(
				expect.objectContaining({
					kind: 'fillRect',
					x: 260,
					y: 260,
					width: 120,
					height: 84,
					color: 0xff8c42
				})
			);
			expect(commands).toContainEqual(
				expect.objectContaining({
					kind: 'fillRect',
					x: 260,
					y: 320,
					width: 44,
					height: 60,
					color: 0xff8c42
				})
			);
			expect(commands).toContainEqual(
				expect.objectContaining({
					kind: 'fillRect',
					x: 336,
					y: 320,
					width: 44,
					height: 60,
					color: 0xff8c42
				})
			);
		} finally {
			restoreLocation();
		}
	});

	it('draws the rebuilt item-shop counter player-center exclusion envelope at (212, 324, 408, 32)', async () => {
		const restoreLocation = installLocationSearch('?mapDebug=collision');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'item-shop' });

			expect(phaserState.graphicsMarkers[0]!.commands).toContainEqual({
				kind: 'fillRect',
				x: 212,
				y: 324,
				width: 408,
				height: 32,
				color: 0xff3355,
				alpha: 0.18
			});
		} finally {
			restoreLocation();
		}
	});

	it('draws shopkeeper Mira at collision radius 29 without treating the ambient customer as a blocker', async () => {
		const restoreLocation = installLocationSearch('?mapDebug=collision');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'item-shop' });

			const circles = phaserState.graphicsMarkers[0]!.commands.filter(
				(command) => command.kind === 'strokeCircle'
			);
			expect(circles).toContainEqual({
				kind: 'strokeCircle',
				x: 416,
				y: 320,
				radius: 29,
				color: 0xc084fc,
				alpha: 0.95,
				lineWidth: 2
			});
			expect(circles).not.toContainEqual(
				expect.objectContaining({
					kind: 'strokeCircle',
					x: 224,
					y: 480
				})
			);
		} finally {
			restoreLocation();
		}
	});

	it('draws transition, pickup, and discovery alignment rings with runtime-effective radii', async () => {
		registerSceneSupportTestMap();
		maps['scene-support-test']!.pickups = [
			{
				id: 'scene-support-pickup',
				x: 200,
				y: 300,
				itemId: 'field-potion',
				quantity: 1
			}
		];
		maps['scene-support-test']!.discoveries = [
			{
				id: 'scene-support-discovery',
				x: 100,
				y: 300,
				labelKey: 'content.maps.discoveries.ferry-shrine-lore.label',
				descriptionKey: 'content.maps.discoveries.ferry-shrine-lore.description'
			}
		];
		const restoreLocation = installLocationSearch('?mapDebug=collision');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'scene-support-test' });

			const circles = phaserState.graphicsMarkers[0]!.commands.filter(
				(command) => command.kind === 'strokeCircle'
			);
			expect(circles).toContainEqual(
				expect.objectContaining({
					kind: 'strokeCircle',
					x: 320,
					y: 96,
					radius: 30,
					color: 0x22d3ee
				})
			);
			expect(circles).toContainEqual(
				expect.objectContaining({
					kind: 'strokeCircle',
					x: 200,
					y: 300,
					radius: 30,
					color: 0x4ade80
				})
			);
			expect(circles).toContainEqual(
				expect.objectContaining({
					kind: 'strokeCircle',
					x: 100,
					y: 300,
					radius: 76,
					color: 0xfacc15
				})
			);
		} finally {
			restoreLocation();
		}
	});

	it('clears and destroys the scene-owned collision overlay exactly once on shutdown', async () => {
		registerSceneSupportTestMap();
		const restoreLocation = installLocationSearch('?mapDebug=collision');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'scene-support-test' });
			const graphics = phaserState.graphicsMarkers[0]!;

			expect(scene.events.listenerCount('shutdown')).toBeGreaterThanOrEqual(2);
			scene.events.emit('shutdown');
			scene.events.emit('shutdown');

			expect(graphics.clear).toHaveBeenCalledOnce();
			expect(graphics.destroy).toHaveBeenCalledOnce();
			expect(scene.events.listenerCount('shutdown')).toBe(0);
		} finally {
			restoreLocation();
		}
	});

	it('rebuilds a fresh collision overlay from the newly active interior map', async () => {
		registerSceneSupportTestMap();
		const restoreLocation = installLocationSearch('?mapDebug=collision');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		try {
			scene.create({ mapId: 'scene-support-test' });
			const firstGraphics = phaserState.graphicsMarkers[0]!;
			scene.events.emit('shutdown');

			scene.create({ mapId: 'item-shop' });

			expect(phaserState.graphicsMarkers).toHaveLength(2);
			const interiorGraphics = phaserState.graphicsMarkers[1]!;
			expect(interiorGraphics).not.toBe(firstGraphics);
			expect(firstGraphics.destroy).toHaveBeenCalledOnce();
			expect(interiorGraphics.commands).toContainEqual(
				expect.objectContaining({
					kind: 'strokeRect',
					x: 0,
					y: 0,
					width: 832,
					height: 640
				})
			);
			expect(interiorGraphics.commands).toContainEqual(
				expect.objectContaining({
					kind: 'strokeRect',
					x: 12,
					y: 12,
					width: 808,
					height: 616
				})
			);
		} finally {
			restoreLocation();
		}
	});

	it('reveals a discovery marker only when the hero is within range', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		const discovery = (meadowEntryMap.discoveries ?? []).find((d) => d.id === 'ferry-shrine-lore');
		expect(discovery).toBeDefined();
		const state = scene as unknown as {
			discoveryMarkers: Map<string, { visible: boolean }>;
			discoveryTweens: Map<
				string,
				{ pause: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn> }
			>;
		};
		const marker = state.discoveryMarkers.get(discovery!.id);
		expect(marker).toBeDefined();
		const tween = state.discoveryTweens.get(discovery!.id);
		expect(tween).toBeDefined();
		// The pulse tween starts paused because the marker is hidden at render time.
		expect(tween!.pause).toHaveBeenCalled();
		expect(tween!.resume).not.toHaveBeenCalled();

		// Out of range: the marker stays hidden so the camera view is not littered with pulses.
		Object.assign(phaserState.playerMarker, { x: discovery!.x, y: discovery!.y - 1_500 });
		scene.update(0, 16);
		expect(marker!.visible).toBe(false);
		expect(tween!.resume).not.toHaveBeenCalled();

		// Within range: the marker reveals so the discovery is still findable.
		Object.assign(phaserState.playerMarker, { x: discovery!.x, y: discovery!.y });
		scene.update(16, 16);
		expect(marker!.visible).toBe(true);
		expect(tween!.resume).toHaveBeenCalledTimes(1);
	});

	it('renders authored ground patches and stair markers from map metadata', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		registerSceneSupportTestMap();

		scene.create({ mapId: 'scene-support-test' });

		const tilemapCall = vi.mocked(scene.make.tilemap).mock.calls[0]![0]!;
		const tilemapData = tilemapCall.data as number[][];
		expect(tilemapData[3][3]).toBe(1);
		expect(tilemapData[3][10]).toBe(3);
		expect(scene.add.image).toHaveBeenCalledWith(320, 96, 'environment-dressing', 'stoneStair');
	});

	it('renders and blocks authored map blockers', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		registerSceneSupportTestMap();
		const { spawn } = maps['scene-support-test'];

		scene.create({ mapId: 'scene-support-test' });
		Object.assign(phaserState.playerMarker, { x: spawn.x, y: spawn.y });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(scene.add.image).toHaveBeenCalledWith(
			160,
			24,
			'environment-dressing',
			'townWallVertical'
		);
		expect(scene.add.image).toHaveBeenCalledWith(288, 224, 'forest-dressing', 'treeCluster');
		expect(scene.add.tileSprite).toHaveBeenCalledWith(
			224,
			224,
			96,
			32,
			'environment-dressing',
			'futureGate'
		);
		const verticalWall = phaserState.imageMarkers.find(
			(marker) => marker.x === 160 && marker.y === 24 && marker.frame === 'townWallVertical'
		);
		const horizontalHedge = phaserState.imageMarkers.find(
			(marker) => marker.x === 288 && marker.y === 224 && marker.frame === 'treeCluster'
		);
		expect(verticalWall?.setDisplaySize).toHaveBeenCalledWith(32, 48);
		expect(horizontalHedge?.setDisplaySize).toHaveBeenCalledWith(48, 32);
		expect(phaserState.playerMarker.x).toBe(spawn.x);
		expect(phaserState.playerMarker.y).toBe(spawn.y);
	});

	it('blocks the bottom-left meadow ocean patch without rendering a visual blocker', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 114, y: 6_260 });
		phaserState.cursorKeys.down.isDown = true;

		scene.update(0, 250);

		expect(scene.add.rectangle).not.toHaveBeenCalledWith(114, 6_311, 100, 50, 0x1d5f9f, 0.92);
		expect(phaserState.playerMarker.x).toBe(114);
		expect(phaserState.playerMarker.y).toBe(6_260);
	});

	it('blocks ocean from the west (lateral approach)', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 51, y: 6_311 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(51);
		expect(phaserState.playerMarker.y).toBe(6_311);
	});

	it('registers and renders environment blocker and stair art', async () => {
		const { environmentDressingAsset, forestDressingAsset } =
			await import('$lib/game/content/assets');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		registerSceneSupportTestMap();

		scene.create({ mapId: 'scene-support-test' });

		expect(scene.textures.get).toHaveBeenCalledWith(environmentDressingAsset.key);
		for (const [frameName, frame] of Object.entries(environmentDressingAsset.frames)) {
			expect(phaserState.textureMock.add).toHaveBeenCalledWith(
				frameName,
				0,
				frame.x,
				frame.y,
				frame.w,
				frame.h
			);
		}
		expect(scene.add.image).toHaveBeenCalledWith(
			160,
			24,
			environmentDressingAsset.key,
			'townWallVertical'
		);
		expect(scene.add.image).toHaveBeenCalledWith(288, 224, forestDressingAsset.key, 'treeCluster');
		expect(scene.add.tileSprite).toHaveBeenCalledWith(
			224,
			224,
			96,
			32,
			environmentDressingAsset.key,
			'futureGate'
		);
		expect(scene.add.image).toHaveBeenCalledWith(
			320,
			96,
			environmentDressingAsset.key,
			'stoneStair'
		);
	});

	it('leashes enemies with route combat bounds instead of a single forest zone', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		registerSceneSupportTestMap();

		scene.create({ mapId: 'scene-support-test' });
		Object.assign(phaserState.playerMarker, { x: 640, y: 640 });

		scene.update(0, 250);

		expect(phaserState.enemyMarker.x).toBe(320);
		expect(phaserState.enemyMarker.y).toBe(320);
	});

	it('keeps the authored outer west map-boundary tree wall', async () => {
		const { forestDressingAsset } = await import('$lib/game/content/assets');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		const westBoundaryTrees = phaserState.imageMarkers
			.filter(
				(marker) =>
					marker.x === 32 &&
					marker.texture === forestDressingAsset.key &&
					marker.frame === 'treeCluster'
			)
			.sort((a, b) => a.y - b.y);

		expect(westBoundaryTrees).toHaveLength(134);
		expect(westBoundaryTrees[0]?.y).toBe(8);
		expect(westBoundaryTrees.at(-1)?.y).toBe(6_392);
		for (const tree of westBoundaryTrees) {
			expect(tree.setDisplaySize).toHaveBeenCalledWith(64, 48);
		}
	});

	it('renders village building landmarks without doorway markers for compact interiors', async () => {
		const { villageBuildingAsset } = await import('$lib/game/content/assets');
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		expect(scene.textures.get).toHaveBeenCalledWith(villageBuildingAsset.key);
		for (const [frameName, frame] of Object.entries(villageBuildingAsset.frames)) {
			expect(phaserState.textureMock.add).toHaveBeenCalledWith(
				frameName,
				0,
				frame.x,
				frame.y,
				frame.w,
				frame.h
			);
		}

		expect(scene.add.image).toHaveBeenCalledWith(704, 5_712, 'village-buildings', 'heroHouse');
		expect(scene.add.image).toHaveBeenCalledWith(2_272, 4_224, 'village-buildings', 'guildHall');
		expect(scene.add.image).toHaveBeenCalledWith(704, 5_024, 'village-buildings', 'itemShop');
		expect(scene.add.image).toHaveBeenCalledWith(672, 4_240, 'village-buildings', 'villagerHouse');
		expect(scene.add.image).toHaveBeenCalledWith(
			1_376,
			4_240,
			'village-buildings',
			'villagerHouse'
		);
		expect(scene.add.image).toHaveBeenCalledWith(
			1_472,
			5_712,
			'village-buildings',
			'villagerHouse'
		);
		expect(scene.add.image).toHaveBeenCalledWith(2_272, 5_024, 'village-buildings', 'blacksmith');
		expect(scene.add.image).toHaveBeenCalledWith(
			2_272,
			5_696,
			'village-buildings',
			'shrineOfAurora'
		);
		expect(scene.add.image).toHaveBeenCalledWith(
			5_960,
			1_800,
			'village-buildings',
			'whisperingCave'
		);
		expect(scene.add.rectangle).not.toHaveBeenCalledWith(704, 5_712, 235, 246, 0x5b4636, 0.9);
		expect(scene.add.rectangle).not.toHaveBeenCalledWith(2_272, 5_024, 235, 226, 0x5b4636, 0.9);
		expect(scene.add.rectangle).not.toHaveBeenCalledWith(2_272, 5_696, 246, 333, 0x5b4636, 0.9);
		expect(scene.add.rectangle).not.toHaveBeenCalledWith(5_960, 1_800, 256, 224, 0x5b4636, 0.9);
		expect(scene.add.text).toHaveBeenCalledWith(704, 5_572, "Hero's House", {
			color: '#f8fafc',
			fontSize: '12px'
		});
		expect(
			phaserState.imageMarkers.filter((marker) => marker.frame === 'doorwayTile')
		).toHaveLength(0);

		const heroHouseMarker = phaserState.imageMarkers.find(
			(marker) => marker.x === 704 && marker.y === 5_712 && marker.frame === 'heroHouse'
		);
		const guildHallMarker = phaserState.imageMarkers.find(
			(marker) => marker.x === 2_272 && marker.y === 4_224 && marker.frame === 'guildHall'
		);
		const itemShopMarker = phaserState.imageMarkers.find(
			(marker) => marker.x === 704 && marker.y === 5_024 && marker.frame === 'itemShop'
		);
		const villagerHouseMarkers = phaserState.imageMarkers.filter(
			(marker) => marker.frame === 'villagerHouse'
		);
		expect(heroHouseMarker?.setDisplaySize).toHaveBeenCalledWith(256, 288);
		expect(guildHallMarker?.setDisplaySize).toHaveBeenCalledWith(448, 384);
		expect(itemShopMarker?.setDisplaySize).toHaveBeenCalledWith(320, 320);
		expect(villagerHouseMarkers).toHaveLength(3);
		expect(
			villagerHouseMarkers.every((marker) =>
				[256].includes(marker.setDisplaySize.mock.calls[0]![0] as number)
			)
		).toBe(true);
		expect(
			villagerHouseMarkers.every((marker) =>
				[288].includes(marker.setDisplaySize.mock.calls[0]![1] as number)
			)
		).toBe(true);

		const imageCalls = vi.mocked(scene.add.image).mock.calls;
		const firstLandmarkCallIndex = imageCalls.findIndex(
			([x, y, texture, frame]) =>
				x === 704 && y === 5_712 && texture === 'village-buildings' && frame === 'heroHouse'
		);
		const firstLandmarkCallOrder = vi.mocked(scene.add.image).mock.invocationCallOrder[
			firstLandmarkCallIndex
		];
		const firstEnemyCallOrder = vi.mocked(scene.add.sprite).mock.invocationCallOrder[1];
		expect(firstLandmarkCallOrder).toBeLessThan(firstEnemyCallOrder);
	});

	it('skips the opaque fallback for landmarks backed by a co-located mapDecor sprite', async () => {
		const { crossroadsDressingAsset } = await import('$lib/game/content/assets');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		// Decor-backed landmarks (no village building frame, but a paired sprite
		// at the same anchor) must not draw the opaque placeholder rectangle…
		expect(scene.add.rectangle).not.toHaveBeenCalledWith(4_176, 2_976, 480, 320, 0x5b4636, 0.9);
		expect(scene.add.rectangle).not.toHaveBeenCalledWith(1_200, 620, 360, 300, 0x5b4636, 0.9);
		expect(scene.add.rectangle).not.toHaveBeenCalledWith(3_000, 480, 420, 320, 0x5b4636, 0.9);
		expect(scene.add.rectangle).not.toHaveBeenCalledWith(3_600, 5_720, 360, 320, 0x5b4636, 0.9);

		// …while their artwork is still emitted by renderMapDecor.
		expect(scene.add.image).toHaveBeenCalledWith(
			4_176,
			2_976,
			crossroadsDressingAsset.key,
			'castleGate'
		);
		// The label is still rendered for every landmark.
		expect(scene.add.text).toHaveBeenCalledWith(4_176, 2_976 - 320 / 2 + 4, expect.any(String), {
			color: '#f8fafc',
			fontSize: '12px'
		});
	});

	it('registers animation pack frames and creates animated hero and enemy sprites', async () => {
		const { animationPackAsset } = await import('$lib/game/content/assets');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });

		expect(scene.add.sprite).toHaveBeenCalledWith(
			meadowEntryMap.spawn.x,
			meadowEntryMap.spawn.y,
			'animation-pack',
			'heroIdle0'
		);
		expect(scene.add.sprite).toHaveBeenCalledWith(4_928, 960, 'animation-pack', 'slimeScoutIdle0');
		expect(phaserState.enemyMarkers).toHaveLength(3);
		expect(phaserState.textureMock.add).toHaveBeenCalledWith(
			'heroIdle0',
			0,
			animationPackAsset.frames.heroIdle0.x,
			animationPackAsset.frames.heroIdle0.y,
			192,
			192
		);
		expect(scene.anims.create).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'hero-idle', frameRate: 3, repeat: -1 })
		);
		expect(scene.anims.create).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'slimeScout-idle', frameRate: 3, repeat: -1 })
		);
		expect(phaserState.playerMarker.play).toHaveBeenCalledWith('hero-idle', true);
		expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('slimeScout-idle', true);
	});

	it('renders ruins tilemap data with stone borders and floor interior', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { ruinsThresholdMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: ruinsThresholdMap.id });

		const tilemapCall = vi.mocked(scene.make.tilemap).mock.calls[0]![0]!;
		const tilemapData = tilemapCall.data as number[][];
		expect(tilemapData[0][0]).toBe(3);
		expect(tilemapData[0][1]).toBe(3);
		expect(tilemapData[1][0]).toBe(3);
		expect(tilemapData[1][1]).toBe(2);
		expect(phaserState.tilemap.createLayer).toHaveBeenCalledWith(0, expect.anything(), 0, 0);
		expect(phaserState.tilemapLayer.setDepth).toHaveBeenCalledWith(-10);
	});

	it('sets up camera follow and keyboard controls for the player marker', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		expect(meadowEntryMap.width).toBe(200);
		expect(meadowEntryMap.height).toBe(200);
		expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(0, 0, 6_400, 6_400);
		expect(scene.cameras.main.startFollow).toHaveBeenCalledWith(
			phaserState.playerMarker,
			true,
			0.14,
			0.14
		);
		expect(scene.input.keyboard?.createCursorKeys).toHaveBeenCalledOnce();
		expect(scene.input.keyboard?.addKeys).toHaveBeenCalledWith({
			left: 'A',
			right: 'D',
			up: 'W',
			down: 'S'
		});
		expect(scene.input.keyboard?.addKey).toHaveBeenCalledWith('E');
		expect(scene.input.keyboard?.addKey).toHaveBeenCalledWith('SPACE');
		expect(scene.input.keyboard?.addKey).toHaveBeenCalledWith('ENTER');
	});

	it('sets camera bounds for the ruins core map dimensions', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { ruinsCoreMap, ruinsThresholdMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: ruinsCoreMap.id });

		expect(ruinsCoreMap.width).toBe(200);
		expect(ruinsCoreMap.height).toBe(200);
		expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(0, 0, 6_400, 6_400);
		expect(ruinsThresholdMap.transitions).toEqual([
			expect.objectContaining({
				id: 'threshold-to-meadow',
				x: 256,
				y: 3_200,
				toMapId: 'meadow-entry',
				requiresClear: true,
				marker: 'stair',
				arrival: { x: 5_760, y: 1_868, facing: 'left' }
			}),
			expect.objectContaining({
				id: 'threshold-to-core',
				x: 5_888,
				y: 3_200,
				toMapId: 'ruins-core',
				requiresClear: true,
				marker: 'stair',
				arrival: { x: 512, y: 3_200, facing: 'right' }
			})
		]);
	});

	it('centers rebuilt interior maps inside larger camera viewports', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { heroHouseMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		Object.assign(phaserState.mainCamera, { width: 800, height: 600 });

		scene.create({ mapId: heroHouseMap.id });

		expect(heroHouseMap.width).toBe(22);
		expect(heroHouseMap.height).toBe(18);
		expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(-48, -12, 800, 600);
	});

	it('moves the player marker using the current input state', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });
		Object.assign(phaserState.playerMarker, {
			x: 880,
			y: 5_520
		});
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 1000);

		expect(phaserState.playerMarker.x).toBe(940);
		expect(phaserState.playerMarker.y).toBe(5_520);
	});

	it('reveals explored cells, persists changes, and republishes the map without changing status', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const storage = await import('$lib/game/save/storage');
		const { createNewSaveState, parseSaveState } = await import('$lib/game/save/save-state');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const save = createNewSaveState();
		const storedSaves: string[] = [];
		const memoryStorage = {
			getItem: vi.fn(() => null),
			removeItem: vi.fn(),
			setItem: vi.fn((_key: string, value: string) => {
				storedSaves.push(value);
			})
		};
		registerAreaMapRevealTestMap();

		storage.setSaveStorage(memoryStorage);
		try {
			scene.create({
				saveState: {
					...save,
					mapId: 'area-map-reveal-test',
					player: { ...save.player, x: 340, y: 320 },
					mapExploration: {}
				}
			});

			expect(memoryStorage.setItem).toHaveBeenCalledOnce();
			expect(memoryStorage.setItem).toHaveBeenLastCalledWith(
				storage.SAVE_STORAGE_KEY,
				expect.any(String)
			);
			expect(parseSaveState(storedSaves.at(-1)!)).toMatchObject({
				mapExploration: {
					'area-map-reveal-test': expect.arrayContaining(['2,2'])
				}
			});
			expect(emitHudStateSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({
					status: 'Save resumed',
					areaMap: expect.objectContaining({
						mapId: 'area-map-reveal-test',
						player: { x: 340, y: 320 },
						revealedCells: expect.arrayContaining(['2,2'])
					})
				})
			);

			memoryStorage.setItem.mockClear();
			storedSaves.splice(0, storedSaves.length);
			emitHudStateSpy.mockClear();
			phaserState.cursorKeys.right.isDown = true;

			scene.update(0, 1_000);

			expect(memoryStorage.setItem).toHaveBeenCalledOnce();
			expect(parseSaveState(storedSaves.at(-1)!)).toMatchObject({
				mapExploration: {
					'area-map-reveal-test': expect.arrayContaining(['5,2'])
				}
			});
			expect(emitHudStateSpy).toHaveBeenCalledOnce();
			expect(emitHudStateSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({
					status: 'Save resumed',
					areaMap: expect.objectContaining({
						mapId: 'area-map-reveal-test',
						player: { x: 400, y: 320 },
						revealedCells: expect.arrayContaining(['5,2'])
					})
				})
			);

			memoryStorage.setItem.mockClear();
			emitHudStateSpy.mockClear();
			phaserState.cursorKeys.right.isDown = false;

			scene.update(1_000, 1_000);

			expect(memoryStorage.setItem).not.toHaveBeenCalled();
			expect(emitHudStateSpy).not.toHaveBeenCalled();
		} finally {
			storage.setSaveStorage(undefined);
		}
	});

	it('does not overwrite an existing stored save with initial exploration before resume', async () => {
		const storage = await import('$lib/game/save/storage');
		const { createNewSaveState, serializeSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const storedSave = createNewSaveState();
		const memoryStorage = {
			getItem: vi.fn(() => serializeSaveState(storedSave)),
			removeItem: vi.fn(),
			setItem: vi.fn()
		};
		registerAreaMapRevealTestMap();

		storage.setSaveStorage(memoryStorage);
		try {
			scene.create({ mapId: 'area-map-reveal-test' });

			expect(memoryStorage.setItem).not.toHaveBeenCalled();
		} finally {
			storage.setSaveStorage(undefined);
		}
	});

	it('does not auto-persist exploration when the stored save is invalid', async () => {
		const storage = await import('$lib/game/save/storage');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const memoryStorage = {
			getItem: vi.fn(() => '{invalid json that fails parsing'),
			removeItem: vi.fn(),
			setItem: vi.fn()
		};
		registerAreaMapRevealTestMap();

		storage.setSaveStorage(memoryStorage);
		try {
			scene.create({ mapId: 'area-map-reveal-test' });

			expect(memoryStorage.setItem).not.toHaveBeenCalled();
		} finally {
			storage.setSaveStorage(undefined);
		}
	});

	it('keeps exploration persistence disabled across new-run transitions when a stored save exists', async () => {
		const storage = await import('$lib/game/save/storage');
		const { createNewSaveState, serializeSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const storedSave = createNewSaveState();
		const memoryStorage = {
			getItem: vi.fn(() => serializeSaveState(storedSave)),
			removeItem: vi.fn(),
			setItem: vi.fn()
		};
		registerSceneSupportTestMap();

		storage.setSaveStorage(memoryStorage);
		try {
			scene.create({ mapId: 'scene-support-test' });
			Object.assign(phaserState.playerMarker, { x: 320, y: 96 });
			scene.update(0, 16);

			expect(scene.scene.restart).toHaveBeenCalledWith({
				saveState: expect.objectContaining({ mapId: 'hero-house' }),
				reason: 'transition',
				persistExplorationChanges: false
			});

			const restartPayload = vi.mocked(scene.scene.restart).mock.calls.at(-1)?.[0];
			if (!restartPayload) throw new Error('Expected transition restart payload');
			const transitionSaveState = (
				restartPayload as unknown as {
					saveState: {
						mapId: string;
						player: { x: number; y: number; facing: string };
					};
				}
			).saveState;
			expect(transitionSaveState.mapId).toBe('hero-house');
			const heroHouseArrival = transitionSaveState.player;
			expect(heroHouseArrival.x).toBe(352);
			expect(heroHouseArrival.y).toBe(480);
			expect(heroHouseArrival.facing).toBe('up');
			expect(
				isInsideAnyCollisionRect(
					heroHouseArrival.x,
					heroHouseArrival.y,
					[...collectStrictCollisionRects(heroHouseMap), ...collectLandmarkRects(heroHouseMap)],
					PLAYER_COLLISION_RADIUS
				)
			).toBe(false);
			memoryStorage.setItem.mockClear();
			phaserState.reset();

			const arrivalScene = new WorldScene();
			arrivalScene.create(restartPayload);
			expect(phaserState.playerMarker).toMatchObject({ x: 352, y: 480 });

			expect(memoryStorage.setItem).not.toHaveBeenCalled();
		} finally {
			storage.setSaveStorage(undefined);
		}
	});

	it('moves the player marker using WASD input state', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });
		Object.assign(phaserState.playerMarker, {
			x: 880,
			y: 5_520
		});
		phaserState.wasdKeys.down.isDown = true;

		scene.update(0, 1000);

		expect(phaserState.playerMarker.x).toBe(880);
		expect(phaserState.playerMarker.y).toBe(5_580);
	});

	it('clamps the player marker within the world bounds during movement', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		registerSceneSupportTestMap();
		scene.create({ mapId: 'scene-support-test' });
		Object.assign(phaserState.playerMarker, { x: 13, y: 13 });
		phaserState.cursorKeys.left.isDown = true;
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 1000);

		expect(phaserState.playerMarker.x).toBe(12);
		expect(phaserState.playerMarker.y).toBe(12);
	});

	it('blocks movement through a map blocker in the scene harness', async () => {
		const { WorldScene } = await import('./WorldScene');
		registerSceneCollisionTestMap();
		maps['scene-collision-test']!.blockers = [
			{ id: 'scene-collision-blocker', x: 160, y: 64, width: 32, height: 32, kind: 'city-wall' }
		];
		const scene = new WorldScene();

		scene.create({ mapId: 'scene-collision-test' });
		Object.assign(phaserState.playerMarker, { x: 128, y: 64 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker).toMatchObject({ x: 128, y: 64 });
	});

	it('blocks movement through a fence in the scene harness', async () => {
		const { WorldScene } = await import('./WorldScene');
		registerSceneCollisionTestMap();
		maps['scene-collision-test']!.fences = [
			{ id: 'scene-collision-fence', x: 160, y: 64, width: 32, height: 32 }
		];
		const scene = new WorldScene();

		scene.create({ mapId: 'scene-collision-test' });
		Object.assign(phaserState.playerMarker, { x: 128, y: 64 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker).toMatchObject({ x: 128, y: 64 });
	});

	it('blocks movement through collidable map decor in the scene harness', async () => {
		const { WorldScene } = await import('./WorldScene');
		registerSceneCollisionTestMap();
		maps['scene-collision-test']!.mapDecor = [
			{
				id: 'scene-collision-decor',
				x: 160,
				y: 64,
				width: 32,
				height: 32,
				textureKey: forestDressingAsset.key,
				frameName: 'brush',
				collision: {
					id: 'scene-collision-decor-bounds',
					x: 160,
					y: 64,
					width: 32,
					height: 32
				}
			}
		];
		const scene = new WorldScene();

		scene.create({ mapId: 'scene-collision-test' });
		Object.assign(phaserState.playerMarker, { x: 128, y: 64 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker).toMatchObject({ x: 128, y: 64 });
	});

	it('blocks entry into and allows an embedded player to escape an interior prop', async () => {
		const { WorldScene } = await import('./WorldScene');
		registerSceneCollisionTestMap();
		maps['scene-collision-test']!.interiorProps = [
			{
				id: 'scene-collision-prop',
				x: 160,
				y: 64,
				width: 64,
				height: 64,
				frameName: 'table',
				collision: {
					id: 'scene-collision-prop-bounds',
					x: 160,
					y: 64,
					width: 64,
					height: 64
				}
			}
		];
		const scene = new WorldScene();

		scene.create({ mapId: 'scene-collision-test' });
		Object.assign(phaserState.playerMarker, { x: 100, y: 64 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker).toMatchObject({ x: 100, y: 64 });

		Object.assign(phaserState.playerMarker, { x: 160, y: 64 });
		phaserState.cursorKeys.right.isDown = false;
		phaserState.cursorKeys.left.isDown = true;

		scene.update(250, 250);

		expect(phaserState.playerMarker).toMatchObject({ x: 100, y: 64 });
	});

	it('blocks entry into an interactable NPC in the scene harness', async () => {
		const { WorldScene } = await import('./WorldScene');
		registerSceneCollisionTestMap();
		maps['scene-collision-test']!.npcs = [{ ...guildHallMap.npcs![0]!, x: 160, y: 64 }];
		const scene = new WorldScene();

		scene.create({ mapId: 'scene-collision-test' });
		Object.assign(phaserState.playerMarker, { x: 128, y: 64 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker).toMatchObject({ x: 128, y: 64 });
	});

	it('keeps landmark doorway movement open while blocking its body', async () => {
		const { WorldScene } = await import('./WorldScene');
		registerSceneCollisionTestMap();
		maps['scene-collision-test']!.landmarks = [
			{
				id: 'scene-house-exterior',
				x: 320,
				y: 320,
				width: 96,
				height: 96,
				labelKey: 'content.maps.landmarks.hero-house-exterior.label',
				label: 'Test house'
			}
		];
		maps['scene-collision-test']!.transitions = [
			{ id: 'scene-house-exterior-door', x: 320, y: 350, toMapId: 'hero-house' }
		];
		const doorScene = new WorldScene();

		doorScene.create({ mapId: 'scene-collision-test' });
		Object.assign(phaserState.playerMarker, { x: 320, y: 410 });
		phaserState.cursorKeys.up.isDown = true;
		doorScene.update(0, 250);

		expect(phaserState.playerMarker).toMatchObject({ x: 320, y: 350 });
		expect(doorScene.scene.restart).toHaveBeenCalled();

		const bodyScene = new WorldScene();
		bodyScene.create({ mapId: 'scene-collision-test' });
		Object.assign(phaserState.playerMarker, { x: 280, y: 410 });
		phaserState.cursorKeys.up.isDown = true;
		vi.mocked(bodyScene.scene.restart).mockClear();

		bodyScene.update(0, 250);

		expect(phaserState.playerMarker).toMatchObject({ x: 280, y: 410 });
		expect(bodyScene.scene.restart).not.toHaveBeenCalled();
	});

	it('resolves diagonal movement X-then-Y around a scene obstacle', async () => {
		const { WorldScene } = await import('./WorldScene');
		registerSceneCollisionTestMap();
		maps['scene-collision-test']!.blockers = [
			{ id: 'scene-diagonal-blocker', x: 160, y: 96, width: 32, height: 32, kind: 'city-wall' }
		];
		const scene = new WorldScene();

		scene.create({ mapId: 'scene-collision-test' });
		Object.assign(phaserState.playerMarker, { x: 128, y: 100 });
		phaserState.cursorKeys.right.isDown = true;
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(128);
		expect(phaserState.playerMarker.y).toBeCloseTo(57.573593128807154);
	});

	it('consumes an authored map grid and prevents a large step through one blocked cell', async () => {
		const { WorldScene } = await import('./WorldScene');
		registerSceneNavigationGridTestMap();
		const scene = new WorldScene();

		scene.create({ mapId: 'scene-navigation-grid-test' });
		Object.assign(phaserState.playerMarker, { x: 80, y: 48 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker).toMatchObject({ x: 80, y: 48 });
	});

	it('emits exact movement diagnostic coordinates and blocked state', async () => {
		const restoreLocation = installLocationSearch('?movementDiagnostics=on');
		const target = installHudCommandTarget();
		const diagnostics: PlayerMovementDiagnostic[] = [];
		target.target.addEventListener(PLAYER_MOVEMENT_DIAGNOSTIC_EVENT, (event) => {
			diagnostics.push((event as CustomEvent<PlayerMovementDiagnostic>).detail);
		});
		try {
			const { WorldScene } = await import('./WorldScene');
			registerSceneCollisionTestMap();
			maps['scene-collision-test']!.blockers = [
				{ id: 'scene-diagnostic-blocker', x: 160, y: 64, width: 32, height: 32, kind: 'city-wall' }
			];
			const scene = new WorldScene();

			scene.create({ mapId: 'scene-collision-test' });
			Object.assign(phaserState.playerMarker, { x: 128, y: 64 });
			phaserState.cursorKeys.right.isDown = true;
			scene.update(0, 250);

			Object.assign(phaserState.playerMarker, { x: 128, y: 200 });
			scene.update(250, 250);

			expect(diagnostics).toEqual([
				{
					mapId: 'scene-collision-test',
					previousPosition: { x: 128, y: 64 },
					requestedPosition: { x: 188, y: 64 },
					resolvedPosition: { x: 128, y: 64 },
					blocked: true
				},
				{
					mapId: 'scene-collision-test',
					previousPosition: { x: 128, y: 200 },
					requestedPosition: { x: 188, y: 200 },
					resolvedPosition: { x: 188, y: 200 },
					blocked: false
				}
			]);
		} finally {
			target.restore();
			restoreLocation();
		}
	});

	it('blocks player movement through NPC bodies', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 816, y: 569 });
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(816);
		expect(phaserState.playerMarker.y).toBe(569);
	});

	it('slides along an NPC when only one movement axis is blocked', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 776, y: 184 });
		phaserState.cursorKeys.right.isDown = true;
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBeGreaterThan(776);
		expect(phaserState.playerMarker.y).toBe(184);
	});

	it('allows player movement away from an existing NPC collision overlap', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 816, y: 550 });
		phaserState.cursorKeys.down.isDown = true;

		scene.update(0, 50);

		expect(phaserState.playerMarker.x).toBe(816);
		expect(phaserState.playerMarker.y).toBeGreaterThan(550);
	});

	it('blocks fast movement from tunneling through an NPC collision body', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 816, y: 550 });
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(816);
		expect(phaserState.playerMarker.y).toBe(550);
	});

	it('blocks player movement through village building bodies', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 520, y: 4_240 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(520);
		expect(phaserState.playerMarker.y).toBe(4_240);
	});

	it('blocks player movement through village building side windows', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 560, y: 5_740 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 50);

		expect(phaserState.playerMarker.x).toBe(560);
		expect(phaserState.playerMarker.y).toBe(5_740);
	});

	it('blocks player movement through coast approach fence segments', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 3_990, y: 5_250 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(3_990);
		expect(phaserState.playerMarker.y).toBe(5_250);
	});

	it('blocks player movement through outskirts tree clusters', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 5_360, y: 452 });
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(5_360);
		expect(phaserState.playerMarker.y).toBe(452);
	});

	it('keeps the plaza road passable between combat pockets', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		// Just east of the village outer boundary (x≈1912) in the open field — the
		// village room-and-lane layout now occupies the old (1700,5347) road point.
		Object.assign(phaserState.playerMarker, { x: 1_940, y: 5_347 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBeGreaterThan(1_940);
		expect(phaserState.playerMarker.y).toBe(5_347);
	});

	it('keeps the forest road open toward the Whispering Cave road', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 5_600, y: 3_200 });
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(5_600);
		expect(phaserState.playerMarker.y).toBeLessThan(3_200);
	});

	it('blocks map edge tree lines while leaving the village lanes usable', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 6_320, y: 1_024 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(6_320);
		expect(phaserState.playerMarker.y).toBe(1_024);

		// Village-lane-usability check remains in the open south lane, away from
		// authored building footprints and route seams.
		Object.assign(phaserState.playerMarker, { x: 1_250, y: 5_250 });
		phaserState.cursorKeys.right.isDown = false;
		phaserState.cursorKeys.up.isDown = true;

		scene.update(250, 250);

		expect(phaserState.playerMarker.x).toBe(1_250);
		expect(phaserState.playerMarker.y).toBeLessThan(5_250);
	});

	it('blocks movement through ruin walls and future gates', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 900, y: 2_080 });
		phaserState.cursorKeys.left.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(900);
		expect(phaserState.playerMarker.y).toBe(2_080);

		Object.assign(phaserState.playerMarker, { x: 4_520, y: 2_816 });
		phaserState.cursorKeys.left.isDown = false;
		phaserState.cursorKeys.right.isDown = true;

		scene.update(250, 250);

		expect(phaserState.playerMarker.x).toBe(4_520);
		expect(phaserState.playerMarker.y).toBe(2_816);
	});

	it('keeps the hero house exterior doorway reachable in the plaza village', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		// Approach the authored hero-house doorway from the south-west within
		// playerRadius (12) + transitionRadius (18) = 30px of the door.
		Object.assign(phaserState.playerMarker, { x: 684, y: 5_877 });

		scene.update(0, 80);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'hero-house',
				player: expect.objectContaining({
					x: 352,
					y: 480,
					facing: 'up'
				})
			})
		});
	});

	it('limits large frame deltas before applying movement distance', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });
		Object.assign(phaserState.playerMarker, {
			x: 880,
			y: 5_520
		});
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 10_000);

		expect(phaserState.playerMarker.x).toBe(940);
		expect(phaserState.playerMarker.y).toBe(5_520);
	});

	it('plays hero walk while moving and idle after stopping', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		phaserState.playerMarker.play.mockClear();
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 100);

		expect(phaserState.playerMarker.play).toHaveBeenLastCalledWith('hero-walk', true);

		phaserState.playerMarker.play.mockClear();
		phaserState.cursorKeys.right.isDown = false;
		scene.update(100, 100);

		expect(phaserState.playerMarker.play).toHaveBeenLastCalledWith('hero-idle', true);
	});

	it('starts BattleScene when the hero engages an uncleared field encounter', async () => {
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const save = createNewSaveState();

		try {
			scene.create({
				saveState: {
					...save,
					mapId: 'meadow-entry',
					player: { ...save.player, hp: 12, facing: 'down' },
					inventory: {
						stacks: save.inventory.stacks,
						equipment: ['ruin-blade', 'stone-mail']
					},
					equipment: {
						...save.equipment,
						weapon: 'ruin-blade',
						body: 'stone-mail'
					}
				}
			});
			Object.assign(phaserState.playerMarker, { x: 4_960, y: 960 });

			scene.update(0, 16);

			expect(scene.scene.start).toHaveBeenCalledWith(
				BattleScene.key,
				expect.objectContaining({
					saveState: expect.objectContaining({
						mapId: 'meadow-entry',
						flags: expect.objectContaining({ clearedEncounters: [] })
					}),
					sourceMapId: 'meadow-entry',
					sourceEncounterId: 'meadow-slime-west',
					sourceEnemyId: 'slime-scout',
					completion: undefined,
					returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
					enemyCount: 6,
					hero: { hp: 12, maxHp: 26, attack: 5, defense: 1 }
				})
			);
		} finally {
			randomSpy.mockRestore();
		}
	});

	it('does not start BattleScene for cleared or already defeated encounters', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const save = createNewSaveState();
		const clearedScene = new WorldScene();
		clearedScene.create({
			saveState: {
				...save,
				mapId: 'meadow-entry',
				flags: {
					...save.flags,
					clearedEncounters: ['meadow-slime-west']
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 4_960, y: 960 });

		clearedScene.update(0, 16);

		expect(clearedScene.scene.start).not.toHaveBeenCalled();

		phaserState.reset();
		const defeatedScene = new WorldScene();
		const defeatedState = defeatedScene as unknown as {
			enemies: Array<{ defeated: boolean; hp: number }>;
		};
		defeatedScene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 4_960, y: 960 });
		Object.assign(defeatedState.enemies[0]!, { defeated: true, hp: 0 });

		defeatedScene.update(0, 16);

		expect(defeatedScene.scene.start).not.toHaveBeenCalled();
	});

	it('applies a returned battle victory before rendering the source encounter', async () => {
		const storage = await import('$lib/game/save/storage');
		const { createNewSaveState, parseSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const storedSaves: string[] = [];
		const memoryStorage = {
			getItem: vi.fn(() => null),
			removeItem: vi.fn(),
			setItem: vi.fn((_key: string, value: string) => {
				storedSaves.push(value);
			})
		};
		const saveState = { ...createNewSaveState(), wallet: { coins: 0 } };
		const scene = new WorldScene();

		storage.setSaveStorage(memoryStorage);
		try {
			scene.create({
				saveState,
				reason: 'battle-result',
				battleResult: {
					outcome: 'victory',
					sourceMapId: 'meadow-entry',
					sourceEncounterId: 'meadow-slime-west',
					sourceEnemyId: 'slime-scout',
					returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
					finalHeroHp: 16,
					inventory: saveState.inventory,
					defeatedUnits: [
						{
							unitId: 'meadow-slime-west:unit:0',
							unitIndex: 0,
							enemyId: 'slime-scout',
							xpReward: 4,
							coinReward: 4,
							drops: []
						},
						{
							unitId: 'meadow-slime-west:unit:1',
							unitIndex: 1,
							enemyId: 'slime-scout',
							xpReward: 4,
							coinReward: 4,
							drops: []
						}
					]
				}
			});

			const builtSave = (
				scene as unknown as { buildSaveState: () => ReturnType<typeof createNewSaveState> }
			).buildSaveState();
			expect(builtSave.flags.clearedEncounters).toEqual(['meadow-slime-west']);
			expect(builtSave.player).toMatchObject({ x: 4_928, y: 1_024, facing: 'down', hp: 20 });
			expect(builtSave.player.xp).toBe(8);
			expect(builtSave.wallet.coins).toBe(8);
			expect(phaserState.enemyMarker.setVisible).toHaveBeenCalledWith(false);
			expect(parseSaveState(storedSaves.at(-1)!)).toMatchObject({
				flags: expect.objectContaining({ clearedEncounters: ['meadow-slime-west'] }),
				player: expect.objectContaining({ x: 4_928, y: 1_024, hp: 20 }),
				mapExploration: expect.objectContaining({
					'meadow-entry': expect.arrayContaining(['38,7'])
				}),
				wallet: { coins: 8 }
			});
			expect(memoryStorage.setItem).toHaveBeenCalledTimes(1);
		} finally {
			storage.setSaveStorage(undefined);
		}
	});

	it('ignores battle summary dismissal commands when no battle is active', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({ mapId: 'meadow-entry' });
		emitHudStateSpy.mockClear();

		sceneState.handleHudCommand({ type: 'dismiss-battle-summary' });

		expect(scene.scene.restart).not.toHaveBeenCalled();
		expect(emitHudStateSpy).not.toHaveBeenCalled();
	});

	it('applies a returned battle defeat at the Shrine spawn without clearing the encounter', async () => {
		const storage = await import('$lib/game/save/storage');
		const { createNewSaveState, parseSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const storedSaves: string[] = [];
		const memoryStorage = {
			getItem: vi.fn(() => null),
			removeItem: vi.fn(),
			setItem: vi.fn((_key: string, value: string) => {
				storedSaves.push(value);
			})
		};
		const saveState = {
			...createNewSaveState(),
			mapId: 'ruins-threshold',
			wallet: { coins: 9 },
			player: {
				...createNewSaveState().player,
				x: 512,
				y: 3_200,
				facing: 'right' as const,
				hp: 6
			}
		};
		const scene = new WorldScene();

		storage.setSaveStorage(memoryStorage);
		try {
			scene.create({
				saveState,
				reason: 'battle-result',
				battleResult: {
					outcome: 'defeat',
					sourceMapId: 'ruins-threshold',
					sourceEncounterId: 'threshold-slime-west',
					sourceEnemyId: 'slime-scout',
					returnPosition: { mapId: 'ruins-threshold', x: 512, y: 3_200, facing: 'right' },
					finalHeroHp: 0,
					inventory: saveState.inventory,
					defeatedUnits: []
				}
			});

			const builtSave = (
				scene as unknown as { buildSaveState: () => ReturnType<typeof createNewSaveState> }
			).buildSaveState();
			expect(builtSave.mapId).toBe('shrine-of-aurora-interior');
			expect(builtSave.player).toMatchObject({ hp: 1, x: 384, y: 608, facing: 'up' });
			expect(builtSave.wallet.coins).toBe(9);
			expect(builtSave.flags.clearedEncounters).toEqual([]);
			expect(parseSaveState(storedSaves.at(-1)!)).toMatchObject({
				mapId: 'shrine-of-aurora-interior',
				flags: expect.objectContaining({ clearedEncounters: [] }),
				player: expect.objectContaining({ hp: 1, x: 384, y: 608, facing: 'up' }),
				wallet: { coins: 9 }
			});
		} finally {
			storage.setSaveStorage(undefined);
		}
	});

	it('does not auto-save after a battle result when persistExplorationChanges is false', async () => {
		const storage = await import('$lib/game/save/storage');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const setItemSpy = vi.fn();
		const memoryStorage = {
			getItem: vi.fn(() => null),
			removeItem: vi.fn(),
			setItem: setItemSpy
		};
		const saveState = {
			...createNewSaveState(),
			mapId: 'meadow-entry'
		};

		storage.setSaveStorage(memoryStorage);
		try {
			const scene = new WorldScene();
			scene.create({
				saveState,
				reason: 'battle-result',
				persistExplorationChanges: false,
				battleResult: {
					outcome: 'victory',
					sourceMapId: 'meadow-entry',
					sourceEncounterId: 'meadow-slime-west',
					sourceEnemyId: 'slime-scout',
					returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
					finalHeroHp: 18,
					inventory: saveState.inventory,
					defeatedUnits: []
				}
			});

			expect(setItemSpy).not.toHaveBeenCalled();
		} finally {
			storage.setSaveStorage(undefined);
		}
	});

	it('starts battle instead of resolving a lethal world contact hit', async () => {
		const { BattleScene } = await import('./BattleScene');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			playerProgress: { level: number; xp: number; hp: number; attack: number };
		};

		scene.create({ mapId: 'ruins-core' });
		sceneState.playerProgress = { level: 1, xp: 0, hp: 1, attack: 3 };
		Object.assign(phaserState.playerMarker, { x: 4_992, y: 3_200 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(500, 16);

		expect(scene.scene.start).toHaveBeenCalledWith(
			BattleScene.key,
			expect.objectContaining({
				sourceMapId: 'ruins-core',
				sourceEncounterId: 'ruins-warden',
				sourceEnemyId: 'ruins-warden'
			})
		);
		expect(phaserState.playerMarker.play).not.toHaveBeenCalledWith('hero-dead', false);
		expect(sceneState.playerProgress.hp).toBe(1);
	});

	it('resumes a zero HP save as dead and keeps movement stopped', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				player: {
					...createNewSaveState().player,
					hp: 0
				}
			}
		});
		const xAfterCreate = phaserState.playerMarker.x;
		phaserState.cursorKeys.right.isDown = true;

		scene.update(1_000, 1_000);

		expect(phaserState.playerMarker.play).toHaveBeenCalledWith('hero-dead', false);
		expect(phaserState.playerMarker.x).toBe(xAfterCreate);
	});

	it('does not draw a square placeholder for the hero attack', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 4_960, y: 960 });

		scene.update(0, 16);

		expect(scene.add.rectangle).not.toHaveBeenCalledWith(
			expect.any(Number),
			expect.any(Number),
			18,
			18,
			0xfff0a8,
			0.82
		);
	});

	it('does not play world hit impact when battle starts from a field encounter', async () => {
		const { BattleScene } = await import('./BattleScene');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 4_960, y: 960 });
		phaserState.enemyMarker.setTint.mockClear();
		phaserState.enemyMarker.clearTint.mockClear();

		scene.update(0, 16);

		expect(scene.scene.start).toHaveBeenCalledWith(
			BattleScene.key,
			expect.objectContaining({ sourceEncounterId: 'meadow-slime-west' })
		);
		expect(scene.add.arc).not.toHaveBeenCalled();
		expect(phaserState.enemyMarker.setTint).not.toHaveBeenCalledWith(0xfff0a8);
		expect(phaserState.enemyMarker.clearTint).not.toHaveBeenCalled();
	});

	it('stops world movement while the gameplay menu is open', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({ mapId: meadowEntryMap.id });
		Object.assign(phaserState.playerMarker, {
			x: 880,
			y: 5_520
		});
		phaserState.cursorKeys.right.isDown = true;
		sceneState.handleHudCommand({ type: 'pause-game' });

		scene.update(0, 1000);

		expect(phaserState.playerMarker.x).toBe(880);
		expect(phaserState.playerMarker.y).toBe(5_520);

		sceneState.handleHudCommand({ type: 'resume-game' });
		scene.update(1000, 1000);

		expect(phaserState.playerMarker.x).toBe(940);
	});

	it('uses a field potion command to heal and publish the updated inventory', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({
			saveState: {
				...createNewSaveState(),
				player: {
					...createNewSaveState().player,
					hp: 10
				},
				inventory: {
					stacks: [{ itemId: 'field-potion', quantity: 1 }],
					equipment: ['training-sword']
				}
			}
		});
		sceneState.handleHudCommand({ type: 'use-item', itemId: 'field-potion' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				hp: 18,
				heals: 0,
				status: 'Recovered HP',
				inventory: expect.objectContaining({
					consumables: [],
					equipment: expect.arrayContaining([
						expect.objectContaining({ itemId: 'training-sword', equipped: true })
					])
				})
			})
		);
	});

	it('publishes item icon paths in HUD inventory entries', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				inventory: {
					stacks: [
						{ itemId: 'field-potion', quantity: 1 },
						{ itemId: 'meadow-token', quantity: 1 }
					],
					equipment: ['training-sword']
				}
			}
		});

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				inventory: expect.objectContaining({
					consumables: expect.arrayContaining([
						expect.objectContaining({
							itemId: 'field-potion',
							iconPath: '/game/assets/items/field-potion.png'
						})
					]),
					equipment: expect.arrayContaining([
						expect.objectContaining({
							itemId: 'training-sword',
							iconPath: '/game/assets/items/training-sword.png'
						})
					]),
					keyItems: expect.arrayContaining([
						expect.objectContaining({
							itemId: 'meadow-token',
							iconPath: '/game/assets/items/meadow-token.png'
						})
					])
				})
			})
		);
	});

	it('renders uncollected pickups using flask art and skips pickups collected in a save', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { ruinsThresholdMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: ruinsThresholdMap.id,
				flags: {
					clearedEncounters: [],
					clearedEncounterUnitCounts: {},
					collectedPickups: ['ruins-threshold-cap'],
					resolvedEncounterDrops: {}
				}
			}
		});

		expect(scene.add.image).not.toHaveBeenCalledWith(1_728, 2_112, 'starter-pack', 'healFlask');
		expect(scene.add.image).toHaveBeenCalledWith(3_584, 4_384, 'starter-pack', 'healFlask');
		expect(scene.add.image).toHaveBeenCalledWith(2_048, 4_800, 'starter-pack', 'healFlask');
		const pickupMarkers = phaserState.imageMarkers.filter((marker) => marker.frame === 'healFlask');
		expect(pickupMarkers).toHaveLength(ruinsThresholdMap.pickups!.length - 1);
		expect(pickupMarkers.every((marker) => marker.setDisplaySize.mock.calls[0]![0] === 28)).toBe(
			true
		);
	});

	it('renders NPC markers for maps with NPC definitions', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });

		expect(scene.add.image).not.toHaveBeenCalledWith(256, 144, 'starter-pack', 'titleBadge');
		expect(scene.add.image).not.toHaveBeenCalledWith(256, 144, 'npc-pack', 'miraItemShopNpc');
		expect(scene.add.image).toHaveBeenCalledWith(800, 144, 'npc-pack', 'guildMasterNpc');
		expect(scene.add.image).toHaveBeenCalledWith(816, 528, 'npc-pack', 'quartermasterNpc');
		const npcMarkers = phaserState.imageMarkers.filter(
			(marker) => marker.x === 256 && marker.y === 144 && marker.frame === 'miraItemShopNpc'
		);
		expect(npcMarkers).toHaveLength(0);
		const guildMasterMarkers = phaserState.imageMarkers.filter(
			(marker) => marker.x === 800 && marker.y === 144 && marker.frame === 'guildMasterNpc'
		);
		expect(guildMasterMarkers).toHaveLength(1);
		expect(guildMasterMarkers[0]!.setDisplaySize).toHaveBeenCalledWith(96, 87);
		const quartermasterMarkers = phaserState.imageMarkers.filter(
			(marker) => marker.x === 816 && marker.y === 528 && marker.frame === 'quartermasterNpc'
		);
		expect(quartermasterMarkers).toHaveLength(1);
		expect(quartermasterMarkers[0]!.setDisplaySize).toHaveBeenCalledWith(96, 87);
	});

	it('registers and renders rebuilt interior props', async () => {
		const { interiorPropAsset } = await import('$lib/game/content/assets');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'hero-house' });

		expect(scene.textures.get).toHaveBeenCalledWith(interiorPropAsset.key);
		for (const [frameName, frame] of Object.entries(interiorPropAsset.frames)) {
			expect(phaserState.textureMock.add).toHaveBeenCalledWith(
				frameName,
				0,
				frame.x,
				frame.y,
				frame.w,
				frame.h
			);
		}

		expect(scene.add.image).toHaveBeenCalledWith(160, 144, 'interior-props', 'bed');
		expect(scene.add.image).toHaveBeenCalledWith(544, 160, 'interior-props', 'bookshelf');
		expect(scene.add.image).toHaveBeenCalledWith(304, 400, 'interior-props', 'table');
		expect(scene.add.image).toHaveBeenCalledWith(544, 416, 'interior-props', 'crateStack');
		const bedMarker = phaserState.imageMarkers.find(
			(marker) => marker.x === 160 && marker.y === 144 && marker.frame === 'bed'
		);
		expect(bedMarker?.setDisplaySize).toHaveBeenCalledWith(128, 96);
	});

	it('renders ambient NPCs without treating them as interactable NPCs', async () => {
		const storyClient = await import('$lib/game/story/client');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'item-shop' });

		const itemShopCustomer = maps['item-shop'].ambientNpcs?.find(
			({ id }) => id === 'item-shop-customer'
		);
		expect(itemShopCustomer).toBeDefined();
		if (!itemShopCustomer) return;
		expect(scene.add.image).toHaveBeenCalledWith(
			itemShopCustomer.x,
			itemShopCustomer.y,
			'npc-pack',
			'guildMasterNpc'
		);
		Object.assign(phaserState.playerMarker, {
			x: itemShopCustomer.x,
			y: itemShopCustomer.y
		});
		scene.update(0, 16);
		Object.assign(phaserState.interactKeys.e, { justDown: true });
		scene.update(16, 16);

		expect(storyClient.getNpcStoryDialogue).not.toHaveBeenCalledWith(
			expect.objectContaining({ npcId: 'item-shop-customer' })
		);
	});

	it('blocks movement into Hero House furniture cores', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const bedCollision = heroHouseMap.interiorProps?.find(
			(prop) => prop.id === 'hero-house-bed'
		)?.collision;
		expect(bedCollision).toBeDefined();
		if (!bedCollision) return;
		const startY = bedCollision.y + bedCollision.height / 2 + PLAYER_COLLISION_RADIUS + 1;

		scene.create({ mapId: 'hero-house' });
		Object.assign(phaserState.playerMarker, { x: bedCollision.x, y: startY });
		phaserState.cursorKeys.up.isDown = true;
		scene.update(0, 50);

		expect(phaserState.playerMarker.x).toBe(bedCollision.x);
		expect(phaserState.playerMarker.y).toBe(startY);
	});

	it('keeps Hero House furniture collisions attached to the rendered props', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'hero-house' });
		const renderedProps = phaserState.imageMarkers.filter(
			(marker) =>
				marker.frame !== undefined &&
				['bed', 'bookshelf', 'table', 'crateStack'].includes(marker.frame)
		);
		expect(renderedProps).toHaveLength(4);
		expect(heroHouseMap.interiorProps?.every((prop) => prop.collision)).toBe(true);
	});

	it('renders Mira with item shop NPC art', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'item-shop' });

		expect(scene.add.image).toHaveBeenCalledWith(416, 320, 'npc-pack', 'miraItemShopNpc');
		const miraMarkers = phaserState.imageMarkers.filter(
			(marker) => marker.x === 416 && marker.y === 320 && marker.frame === 'miraItemShopNpc'
		);
		expect(miraMarkers).toHaveLength(1);
		expect(miraMarkers[0]!.setDisplaySize).toHaveBeenCalledWith(96, 87);
	});

	it('does not render placeholder NPCs in villager houses', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const lynn = villagerHouse1Map.npcs?.find(({ id }) => id === 'villager-lynn');
		expect(lynn).toBeDefined();
		if (!lynn) return;

		scene.create({ mapId: villagerHouse1Map.id });

		expect(scene.add.image).not.toHaveBeenCalledWith(lynn.x, lynn.y, 'starter-pack', 'titleBadge');
		expect(scene.add.image).toHaveBeenCalledWith(lynn.x, lynn.y, 'npc-pack', lynn.frameName);
		expect(
			phaserState.imageMarkers.some(
				(marker) => marker.x === lynn.x && marker.y === lynn.y && marker.frame === 'titleBadge'
			)
		).toBe(false);
	});

	it('publishes nearby NPC status once while the hero remains in proximity', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const save = createNewSaveState();

		scene.create({
			saveState: {
				...save,
				mapId: 'guild-hall',
				player: { ...save.player, ...quartermasterApproach }
			}
		});
		emitHudStateSpy.mockClear();

		scene.update(0, 16);
		scene.update(16, 16);

		expect(emitHudStateSpy).toHaveBeenCalledOnce();
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				mapId: 'guild-hall',
				status: 'Quartermaster Vale nearby',
				dialogue: null
			})
		);
	});

	it('publishes the initial HUD state with English runtime text by default', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'New run',
				quests: expect.objectContaining({
					main: expect.objectContaining({
						title: 'Investigate the Ruins',
						objective: 'Talk to the Guild Master in the Guild Hall.',
						progress: expect.objectContaining({ label: 'Guild Master spoken to' })
					})
				})
			})
		);
	});

	it('publishes localized/fallback shop, inventory, dialogue, and buy text for Japanese', async () => {
		localeState.activeLocale = 'ja';
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const localizedContent = await import('$lib/game/i18n/content');
		const events = await import('$lib/game/ui-bridge/events');
		const storyClient = await import('$lib/game/story/client');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};
		const save = createNewSaveState();

		scene.create({
			saveState: {
				...save,
				mapId: 'item-shop',
				player: { ...save.player, x: 416, y: 320 },
				inventory: {
					stacks: [{ itemId: 'field-potion', quantity: 2 }],
					equipment: []
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 416, y: 320 });
		emitHudStateSpy.mockClear();

		scene.update(0, 16);

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'JP Miraが近くにいる',
				nearbyShop: {
					shopId: 'miras-item-shop',
					name: 'JP Mira Shop',
					merchantName: 'JP Mira'
				}
			})
		);
		expect(localizedContent.getNpcText).toHaveBeenCalledWith('ja', 'shopkeeper-mira');
		expect(localizedContent.getShopText).toHaveBeenCalledWith('ja', 'miras-item-shop');

		sceneState.handleHudCommand({ type: 'open-shop', shopId: 'miras-item-shop' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: '店を開いた',
				inventory: expect.objectContaining({
					consumables: expect.arrayContaining([
						expect.objectContaining({
							itemId: 'field-potion',
							name: 'Field Potion',
							description: 'Restores 8 HP.'
						})
					])
				}),
				shop: expect.objectContaining({
					shopId: 'miras-item-shop',
					name: 'JP Mira Shop',
					merchantName: 'JP Mira',
					buy: expect.arrayContaining([
						expect.objectContaining({
							itemId: 'field-potion',
							name: 'Field Potion',
							description: 'Restores 8 HP.'
						}),
						expect.objectContaining({
							itemId: 'sunleaf-salve',
							name: 'JP Sunleaf Salve',
							description: 'JP salve description.'
						})
					]),
					sell: expect.arrayContaining([
						expect.objectContaining({
							itemId: 'field-potion',
							name: 'Field Potion',
							description: 'Restores 8 HP.'
						})
					])
				})
			})
		);
		expect(localizedContent.getItemText).toHaveBeenCalledWith('ja', 'sunleaf-salve');

		sceneState.handleHudCommand({
			type: 'buy-shop-item',
			shopId: 'miras-item-shop',
			stockId: 'field-potion'
		});

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'Field Potionを購入した' })
		);

		emitHudStateSpy.mockClear();
		phaserState.interactKeys.space.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'JP Miraが近くにいる',
				dialogue: expect.objectContaining({
					speaker: 'Mira',
					line: 'Fresh tonics are on the shelf.',
					choices: expect.arrayContaining([expect.objectContaining({ id: 'shop', label: 'Shop' })])
				})
			})
		);
		expect(storyClient.getNpcStoryDialogue).toHaveBeenCalledWith(
			expect.objectContaining({
				npcId: 'shopkeeper-mira',
				mapId: 'item-shop',
				locale: 'ja'
			})
		);
	});

	it('publishes localized/fallback quest and Guild dialogue text for Japanese', async () => {
		localeState.activeLocale = 'ja';
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const localizedContent = await import('$lib/game/i18n/content');
		const events = await import('$lib/game/ui-bridge/events');
		const storyClient = await import('$lib/game/story/client');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const save = createNewSaveState();

		scene.create({
			saveState: {
				...save,
				mapId: 'guild-hall',
				player: { ...save.player, ...guildMasterApproach }
			}
		});
		Object.assign(phaserState.playerMarker, guildMasterApproach);
		emitHudStateSpy.mockClear();

		scene.update(0, 16);

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'JP Guild Masterが近くにいる',
				quests: expect.objectContaining({
					main: expect.objectContaining({
						title: 'JP Investigate the Ruins',
						description: 'JP Report to the Guild Master, then defeat the ruins warden.',
						objective: 'JP Talk to the Guild Master in the Guild Hall.',
						progress: expect.objectContaining({ label: 'JP Guild Master spoken to' })
					})
				})
			})
		);
		expect(localizedContent.getNpcText).toHaveBeenCalledWith('ja', 'guild-master');
		expect(localizedContent.getQuestText).toHaveBeenCalledWith('ja', 'investigate-the-ruins');
		expect(localizedContent.getQuestObjectiveText).toHaveBeenCalledWith(
			'ja',
			'investigate-the-ruins',
			'talk-to-guild-master'
		);

		emitHudStateSpy.mockClear();
		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'JP Guild Masterが近くにいる',
				dialogue: expect.objectContaining({
					speaker: 'Guild Master Arlen',
					line: expect.stringContaining('The eastern ruins are stirring again'),
					choices: expect.arrayContaining([
						expect.objectContaining({ id: 'quest', label: 'Quest' })
					])
				})
			})
		);
		expect(storyClient.getNpcStoryDialogue).toHaveBeenCalledWith(
			expect.objectContaining({
				npcId: 'guild-master',
				mapId: 'guild-hall',
				locale: 'ja'
			})
		);
	});

	it('publishes localized/fallback Traveler speaker for Japanese fallback dialogue', async () => {
		localeState.activeLocale = 'ja';
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(0, 16);

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: '近くに誰もいません',
				dialogue: expect.objectContaining({
					speaker: 'JP Traveler',
					line: '近くに誰もいません。'
				})
			})
		);
	});

	it('allows nearby NPC status to publish again after leaving and re-entering proximity', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'item-shop' });

		Object.assign(phaserState.playerMarker, { x: 416, y: 360 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();
		Object.assign(phaserState.playerMarker, { x: 64, y: 64 });
		scene.update(16, 16);
		Object.assign(phaserState.playerMarker, { x: 416, y: 360 });
		scene.update(32, 16);

		expect(emitHudStateSpy).toHaveBeenCalledTimes(3);
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Mira nearby',
				dialogue: null
			})
		);
	});

	it('starts Guild Master dialogue instead of status-only NPC text', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const storyClient = await import('$lib/game/story/client');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, guildMasterApproach);
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				dialogue: expect.objectContaining({
					speaker: 'Guild Master Arlen',
					line: expect.stringContaining('The eastern ruins are stirring again')
				})
			})
		);
		expect(storyClient.getNpcStoryDialogue).toHaveBeenCalledWith(
			expect.objectContaining({
				npcId: 'guild-master',
				mapId: 'guild-hall',
				locale: 'en'
			})
		);
	});

	it('falls back to noDialogueAvailable when story dialogue rejects', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const storyClient = await import('$lib/game/story/client');
		vi.mocked(storyClient.getNpcStoryDialogue).mockRejectedValueOnce(
			new Error('unknown story npc: missing-npc')
		);
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, guildMasterApproach);
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				dialogue: expect.objectContaining({
					speaker: 'Traveler',
					line: 'No dialogue is available.'
				})
			})
		);
	});

	it('discards story dialogue response when the player moves away before it resolves', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let resolveDialogue: ((session: any) => void) | undefined;
		const storyClient = await import('$lib/game/story/client');
		vi.mocked(storyClient.getNpcStoryDialogue).mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveDialogue = resolve;
				})
		);
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, guildMasterApproach);
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);

		// Move player away before dialogue resolves
		Object.assign(phaserState.playerMarker, { x: 64, y: 64 });
		scene.update(32, 16);

		// Resolve with a valid-looking session — the stale guard should discard it
		resolveDialogue!({
			id: 'npc:guild-master:stale',
			npcId: null,
			speaker: 'Guild Master Arlen',
			lines: ['Stale response'],
			line: 'Stale response',
			lineIndex: 0,
			lineCount: 1,
			mode: 'conversation' as const,
			choices: [],
			completionIntent: null,
			canClose: true
		});
		await flushStoryDialogue();

		expect(emitHudStateSpy).not.toHaveBeenLastCalledWith(
			expect.objectContaining({
				dialogue: expect.objectContaining({ line: 'Stale response' })
			})
		);
	});

	it('discards story dialogue response when shop opens while request is in flight', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let resolveDialogue: ((session: any) => void) | undefined;
		const storyClient = await import('$lib/game/story/client');
		vi.mocked(storyClient.getNpcStoryDialogue).mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveDialogue = resolve;
				})
		);
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({ mapId: 'item-shop' });
		Object.assign(phaserState.playerMarker, { x: 416, y: 320 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);

		// Open the shop before the story dialogue resolves
		sceneState.handleHudCommand({ type: 'open-shop', shopId: 'miras-item-shop' });
		emitHudStateSpy.mockClear();

		// Resolve with a valid-looking session — the stale guard should discard it
		resolveDialogue!({
			id: 'npc:shopkeeper-mira:stale',
			npcId: null,
			speaker: 'Mira',
			lines: ['Stale response'],
			line: 'Stale response',
			lineIndex: 0,
			lineCount: 1,
			mode: 'conversation' as const,
			choices: [],
			completionIntent: null,
			canClose: true
		});
		await flushStoryDialogue();

		// The shop state should not have been overwritten by the stale dialogue
		expect(emitHudStateSpy).not.toHaveBeenLastCalledWith(
			expect.objectContaining({
				dialogue: expect.objectContaining({ line: 'Stale response' })
			})
		);
	});

	it('starts Guild Master dialogue after a no-NPC fallback prompt', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(0, 16);

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'No one nearby',
				dialogue: expect.objectContaining({
					speaker: 'Traveler',
					line: 'No one is nearby.'
				})
			})
		);

		Object.assign(phaserState.playerMarker, guildMasterApproach);
		scene.update(16, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(32, 16);
		await flushStoryDialogue();

		expect(emitHudStateSpy).toHaveBeenCalledOnce();
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Guild Master Arlen nearby',
				dialogue: expect.objectContaining({
					speaker: 'Guild Master Arlen',
					line: expect.stringContaining('The eastern ruins are stirring again')
				})
			})
		);
	});

	it('closes terminal dialogue when advance is pressed at the final line', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({ mapId: 'guild-hall' });
		emitHudStateSpy.mockClear();
		phaserState.interactKeys.e.justDown = true;
		scene.update(0, 16);
		await flushStoryDialogue();
		emitHudStateSpy.mockClear();

		sceneState.handleHudCommand({ type: 'dialogue-advance' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Dialogue closed',
				dialogue: null
			})
		);
	});

	it('advances dialogue and records Guild Master quest progress at the end of briefing', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => {
				quests: {
					entries: Record<string, { currentObjectiveId: string }>;
					completedObjectives: Record<string, string[]>;
				};
			};
		};

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, guildMasterApproach);
		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();

		sceneState.handleHudCommand({ type: 'dialogue-advance' });
		sceneState.handleHudCommand({ type: 'dialogue-advance' });

		expect(sceneState.buildSaveState().quests.entries['investigate-the-ruins']).toMatchObject({
			currentObjectiveId: 'defeat-ruins-warden'
		});
		expect(
			sceneState.buildSaveState().quests.completedObjectives['investigate-the-ruins']
		).toContain('talk-to-guild-master');
	});

	it('does not complete Guild Master quest progress from stale out-of-range dialogue', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => {
				quests: {
					entries: Record<string, { currentObjectiveId: string }>;
					completedObjectives: Record<string, string[]>;
				};
			};
		};

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, guildMasterApproach);
		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();

		Object.assign(phaserState.playerMarker, { x: 64, y: 64 });
		scene.update(32, 16);
		sceneState.handleHudCommand({ type: 'dialogue-advance' });
		sceneState.handleHudCommand({ type: 'dialogue-advance' });

		expect(sceneState.buildSaveState().quests.entries['investigate-the-ruins']).toMatchObject({
			currentObjectiveId: 'talk-to-guild-master'
		});
		expect(
			sceneState.buildSaveState().quests.completedObjectives['investigate-the-ruins'] ?? []
		).not.toContain('talk-to-guild-master');
	});

	it('accepts a Guild side quest through dialogue choices', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => {
				quests: { entries: Record<string, { currentObjectiveId: string; progress: number }> };
			};
		};
		const unlockedSave = createNewSaveState();

		scene.create({
			saveState: {
				...unlockedSave,
				mapId: 'guild-hall',
				player: { ...unlockedSave.player, ...guildMasterApproach },
				quests: {
					entries: {
						'investigate-the-ruins': {
							status: 'active',
							currentObjectiveId: 'defeat-ruins-warden',
							progress: 0,
							rewardApplied: false,
							countedSourceIds: []
						}
					},
					completedObjectives: { 'investigate-the-ruins': ['talk-to-guild-master'] }
				}
			}
		});
		Object.assign(phaserState.playerMarker, guildMasterApproach);
		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();

		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'quest' });
		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'quest:thin-village-slimes' });
		sceneState.handleHudCommand({
			type: 'dialogue-choose',
			choiceId: 'accept:thin-village-slimes'
		});

		expect(sceneState.buildSaveState().quests.entries['thin-village-slimes']).toMatchObject({
			currentObjectiveId: 'defeat-village-slimes',
			progress: 0
		});
	});

	it('opens shops through dialogue choices', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, quartermasterApproach);
		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();
		emitHudStateSpy.mockClear();

		const sceneState = scene as unknown as { handleHudCommand: (command: HudCommand) => void };
		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'shop' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				shop: expect.objectContaining({ shopId: 'guild-quartermaster' })
			})
		);
	});

	it('talking through the Guild Master briefing unlocks ruins and publishes Guild quest offers', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => {
				quests: {
					entries: Record<string, { currentObjectiveId: string; progress: number }>;
					completedObjectives: Record<string, string[]>;
				};
			};
		};

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, guildMasterApproach);
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();
		sceneState.handleHudCommand({ type: 'dialogue-advance' });
		sceneState.handleHudCommand({ type: 'dialogue-advance' });

		expect(sceneState.buildSaveState().quests.entries['investigate-the-ruins']).toMatchObject({
			currentObjectiveId: 'defeat-ruins-warden',
			progress: 0
		});
		expect(
			sceneState.buildSaveState().quests.completedObjectives['investigate-the-ruins']
		).toContain('talk-to-guild-master');
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Ruins route unlocked',
				quests: expect.objectContaining({
					guildOffer: expect.objectContaining({
						quests: expect.arrayContaining([
							expect.objectContaining({ questId: 'thin-village-slimes' })
						])
					})
				})
			})
		);
	});

	it('accepts Guild side quests through HUD commands and seeds cleared village slime progress', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => {
				quests: { entries: Record<string, { currentObjectiveId: string; progress: number }> };
			};
		};

		const unlockedSave = createNewSaveState();
		scene.create({
			saveState: {
				...unlockedSave,
				mapId: 'guild-hall',
				player: { ...unlockedSave.player, ...guildMasterApproach },
				flags: {
					...unlockedSave.flags,
					clearedEncounters: ['meadow-slime-west', 'meadow-slime-center']
				},
				quests: {
					entries: {
						'investigate-the-ruins': {
							status: 'active',
							currentObjectiveId: 'defeat-ruins-warden',
							progress: 0,
							rewardApplied: false,
							countedSourceIds: []
						}
					},
					completedObjectives: { 'investigate-the-ruins': ['talk-to-guild-master'] }
				}
			}
		});

		sceneState.handleHudCommand({ type: 'accept-quest', questId: 'thin-village-slimes' });

		expect(sceneState.buildSaveState().quests.entries['thin-village-slimes']).toMatchObject({
			currentObjectiveId: 'defeat-village-slimes',
			progress: 2
		});
	});

	it('starts nearby guild shopkeeper dialogue when an interact key is pressed', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, quartermasterApproach);
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();

		expect(emitHudStateSpy).toHaveBeenCalledOnce();
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Quartermaster Vale nearby',
				dialogue: expect.objectContaining({
					speaker: 'Quartermaster Vale',
					choices: expect.arrayContaining([expect.objectContaining({ id: 'shop' })])
				})
			})
		);
	});

	it('starts villager flavor dialogue when an interact key is pressed', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const storyClient = await import('$lib/game/story/client');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const lynnApproach = VILLAGE_INTERIOR_LAYOUTS['villager-house-1'].npcApproaches.lynn.approach;

		scene.create({ mapId: villagerHouse1Map.id });
		Object.assign(phaserState.playerMarker, lynnApproach);
		scene.update(0, 16);
		emitHudStateSpy.mockClear();
		Object.assign(phaserState.interactKeys.e, { justDown: true });
		scene.update(16, 16);
		await flushStoryDialogue();

		expect(storyClient.getNpcStoryDialogue).toHaveBeenCalledWith(
			expect.objectContaining({
				npcId: 'villager-lynn',
				mapId: 'villager-house-1',
				locale: 'en'
			})
		);
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Lynn nearby',
				dialogue: expect.objectContaining({
					speaker: 'Lynn',
					line: 'The kettle is warm if you need a quiet minute before the road.',
					choices: [expect.objectContaining({ id: 'close', label: 'Close' })]
				})
			})
		);
	});

	it('shows shop out-of-reach feedback from stale out-of-range shopkeeper dialogue', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({ mapId: 'item-shop' });
		Object.assign(phaserState.playerMarker, { x: 416, y: 320 });
		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();

		Object.assign(phaserState.playerMarker, { x: 64, y: 64 });
		scene.update(32, 16);
		emitHudStateSpy.mockClear();

		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'shop' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'No shop nearby',
				nearbyShop: null,
				shop: null,
				dialogue: expect.objectContaining({
					speaker: 'Shop',
					line: 'Shop out of reach.'
				})
			})
		);
	});

	it('shows Guild quest feedback from stale out-of-range Guild Master dialogue', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};
		const unlockedSave = createNewSaveState();

		scene.create({
			saveState: {
				...unlockedSave,
				mapId: 'guild-hall',
				player: { ...unlockedSave.player, ...guildMasterApproach },
				quests: {
					entries: {
						'investigate-the-ruins': {
							status: 'active',
							currentObjectiveId: 'defeat-ruins-warden',
							progress: 0,
							rewardApplied: false,
							countedSourceIds: []
						}
					},
					completedObjectives: { 'investigate-the-ruins': ['talk-to-guild-master'] }
				}
			}
		});
		Object.assign(phaserState.playerMarker, guildMasterApproach);
		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();
		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'quest' });
		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'quest:thin-village-slimes' });

		Object.assign(phaserState.playerMarker, { x: 64, y: 64 });
		scene.update(32, 16);
		emitHudStateSpy.mockClear();

		sceneState.handleHudCommand({
			type: 'dialogue-choose',
			choiceId: 'accept:thin-village-slimes'
		});

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'No Guild quest available',
				dialogue: expect.objectContaining({
					speaker: 'Guild Master Arlen',
					line: 'No Guild quest is available here.'
				})
			})
		);
	});

	it('starts nearby shopkeeper dialogue when an interact key is pressed', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'item-shop' });
		Object.assign(phaserState.playerMarker, { x: 416, y: 320 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.space.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Mira nearby',
				dialogue: expect.objectContaining({
					speaker: 'Mira',
					choices: expect.arrayContaining([expect.objectContaining({ id: 'shop' })])
				})
			})
		);
	});

	it('starts Blacksmith Oren dialogue and opens the Sundrop Forge shop', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as { handleHudCommand: (command: HudCommand) => void };

		scene.create({ mapId: 'blacksmith-interior' });
		expect(scene.add.image).toHaveBeenCalledWith(448, 416, 'npc-pack', 'woodcutterNpc');
		Object.assign(phaserState.playerMarker, { x: 448, y: 480 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		await flushStoryDialogue();

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Blacksmith Oren nearby',
				dialogue: expect.objectContaining({
					speaker: 'Blacksmith Oren',
					line: 'Steel holds when the hand behind it does. Take what fits, and keep it dry.',
					choices: [expect.objectContaining({ id: 'shop', label: 'Shop' })]
				})
			})
		);

		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'shop' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				shop: expect.objectContaining({ shopId: 'sundrop-forge' })
			})
		);
	});

	it('consumes multiple interact key edges in the same frame as one interaction', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, quartermasterApproach);
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		phaserState.interactKeys.space.justDown = true;
		phaserState.interactKeys.enter.justDown = true;
		scene.update(16, 16);
		scene.update(32, 16);
		await flushStoryDialogue();

		expect(emitHudStateSpy).toHaveBeenCalledOnce();
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Quartermaster Vale nearby',
				dialogue: expect.objectContaining({
					speaker: 'Quartermaster Vale',
					choices: expect.arrayContaining([expect.objectContaining({ id: 'shop' })])
				})
			})
		);
	});

	it('publishes no one nearby when Enter is pressed away from NPCs', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.enter.justDown = true;
		scene.update(16, 16);

		expect(emitHudStateSpy).toHaveBeenCalledOnce();
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'No one nearby'
			})
		);
	});

	it.each([
		{
			mapId: 'item-shop',
			x: 416,
			y: 320,
			nearbyShop: {
				shopId: 'miras-item-shop',
				name: "Mira's Item Shop",
				merchantName: 'Mira'
			}
		},
		{
			mapId: 'guild-hall',
			...quartermasterApproach,
			nearbyShop: {
				shopId: 'guild-quartermaster',
				name: 'Guild Quartermaster',
				merchantName: 'Quartermaster Vale'
			}
		}
	])(
		'publishes nearby shop metadata for $nearbyShop.shopId',
		async ({ mapId, x, y, nearbyShop }) => {
			const events = await import('$lib/game/ui-bridge/events');
			const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
			const { WorldScene } = await import('./WorldScene');
			const scene = new WorldScene();

			scene.create({ mapId });
			emitHudStateSpy.mockClear();
			Object.assign(phaserState.playerMarker, { x, y });

			scene.update(0, 16);

			expect(emitHudStateSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({
					nearbyShop
				})
			);
		}
	);

	it('opens a nearby shop and publishes buy and sell views', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({ mapId: 'item-shop' });
		Object.assign(phaserState.playerMarker, { x: 416, y: 320 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		sceneState.handleHudCommand({ type: 'open-shop', shopId: 'miras-item-shop' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Shop opened',
				shop: expect.objectContaining({
					shopId: 'miras-item-shop',
					buy: expect.arrayContaining([
						expect.objectContaining({ stockId: 'field-potion', price: 10 })
					]),
					sell: expect.arrayContaining([
						expect.objectContaining({ itemId: 'field-potion', price: 5 })
					])
				})
			})
		);
	});

	it('buys shop items, updates wallet, and persists finite stock', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => ReturnType<typeof createNewSaveState>;
		};
		const save = createNewSaveState();

		scene.create({
			saveState: {
				...save,
				mapId: 'guild-hall',
				player: { ...save.player, ...quartermasterApproach },
				wallet: { coins: 40 }
			}
		});
		Object.assign(phaserState.playerMarker, quartermasterApproach);
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		sceneState.handleHudCommand({ type: 'open-shop', shopId: 'guild-quartermaster' });
		sceneState.handleHudCommand({
			type: 'buy-shop-item',
			shopId: 'guild-quartermaster',
			stockId: 'iron-cap'
		});

		const saveState = sceneState.buildSaveState();
		expect(saveState.wallet.coins).toBe(5);
		expect(saveState.inventory.equipment).toContain('iron-cap');
		expect(saveState.shops.stock['guild-quartermaster']?.['iron-cap']).toBe(0);
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Bought Iron Cap',
				wallet: { coins: 5 },
				inventory: expect.objectContaining({
					equipment: expect.arrayContaining([
						expect.objectContaining({ itemId: 'iron-cap', equipped: false })
					])
				}),
				shop: expect.objectContaining({
					sell: expect.arrayContaining([
						expect.objectContaining({ itemId: 'iron-cap', quantity: 1, price: 17 })
					])
				})
			})
		);
	});

	it('sells unequipped items through the active shop', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => ReturnType<typeof createNewSaveState>;
		};
		const save = createNewSaveState();

		scene.create({
			saveState: {
				...save,
				mapId: 'item-shop',
				player: { ...save.player, x: 416, y: 320 },
				inventory: {
					stacks: [{ itemId: 'field-potion', quantity: 2 }],
					equipment: ['training-sword', 'iron-cap']
				},
				equipment: { ...save.equipment, weapon: 'training-sword' },
				wallet: { coins: 0 }
			}
		});
		Object.assign(phaserState.playerMarker, { x: 416, y: 320 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		sceneState.handleHudCommand({ type: 'open-shop', shopId: 'miras-item-shop' });
		sceneState.handleHudCommand({ type: 'sell-inventory-item', itemId: 'iron-cap' });

		const saveState = sceneState.buildSaveState();
		expect(saveState.wallet.coins).toBe(17);
		expect(saveState.inventory.equipment).toEqual(['training-sword']);
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'Sold Iron Cap' })
		);
	});

	it('applies coins when a returned battle victory defeats one enemy', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			buildSaveState: () => ReturnType<typeof createNewSaveState>;
		};
		const save = createNewSaveState();

		scene.create({
			saveState: { ...save, wallet: { coins: 0 } },
			reason: 'battle-result',
			battleResult: {
				outcome: 'victory',
				sourceMapId: 'meadow-entry',
				sourceEncounterId: 'meadow-slime-west',
				sourceEnemyId: 'slime-scout',
				returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
				finalHeroHp: 20,
				inventory: save.inventory,
				defeatedUnits: [
					{
						unitId: 'meadow-slime-west:unit:0',
						unitIndex: 0,
						enemyId: 'slime-scout',
						xpReward: 4,
						coinReward: 4,
						drops: []
					}
				]
			}
		});

		expect(sceneState.buildSaveState().wallet.coins).toBe(4);
	});

	it('collects a nearby pickup, updates inventory and flags, hides the marker, and publishes status', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			buildSaveState: () => {
				inventory: { stacks: Array<{ itemId: string; quantity: number }> };
				flags: { collectedPickups: string[] };
			};
			collectedPickupIds: Set<string>;
		};

		scene.create({ mapId: 'ruins-threshold' });
		const marker = phaserState.imageMarkers.find(
			(imageMarker) => imageMarker.x === 2_048 && imageMarker.y === 4_800
		)!;
		Object.assign(phaserState.playerMarker, { x: 2_048, y: 4_800 });

		scene.update(0, 16);

		const saveState = sceneState.buildSaveState();
		expect(saveState.inventory.stacks).toContainEqual({ itemId: 'sunleaf-salve', quantity: 2 });
		expect(saveState.flags.collectedPickups).toContain('ruins-threshold-salve');
		expect(sceneState.collectedPickupIds.has('ruins-threshold-salve')).toBe(true);
		expect(marker.setVisible).toHaveBeenCalledWith(false);
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'Found Sunleaf Salve' })
		);
	});

	it('preserves loaded wallet and finite shop stock when building saves', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			buildSaveState: () => {
				wallet: { coins: number };
				shops: { stock: Record<string, Record<string, number>> };
			};
		};

		scene.create({
			saveState: {
				...createNewSaveState(),
				wallet: { coins: 12 },
				shops: {
					stock: {
						'guild-quartermaster': {
							'iron-cap': 0,
							'grip-wraps': 1,
							'traveler-vest': 0
						}
					}
				}
			}
		});

		expect(sceneState.buildSaveState()).toMatchObject({
			wallet: { coins: 12 },
			shops: {
				stock: {
					'guild-quartermaster': {
						'iron-cap': 0,
						'grip-wraps': 1,
						'traveler-vest': 0
					}
				}
			}
		});
	});

	it('equips owned equipment and publishes effective combat stats', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({
			saveState: {
				...createNewSaveState(),
				inventory: {
					stacks: [],
					equipment: ['ruin-blade', 'stone-mail']
				},
				equipment: {
					weapon: null,
					head: null,
					body: null,
					hands: null,
					accessory: null
				}
			}
		});
		sceneState.handleHudCommand({ type: 'equip-item', itemId: 'ruin-blade' });
		sceneState.handleHudCommand({ type: 'equip-item', itemId: 'stone-mail' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				attack: 5,
				defense: 1,
				maxHp: 26,
				inventory: expect.objectContaining({
					equipped: expect.objectContaining({
						weapon: 'ruin-blade',
						body: 'stone-mail'
					})
				})
			})
		);
	});

	it('unequips a max HP item and clamps current HP to the lower max', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({
			saveState: {
				...createNewSaveState(),
				player: {
					...createNewSaveState().player,
					hp: 26
				},
				inventory: {
					stacks: [],
					equipment: ['stone-mail']
				},
				equipment: {
					weapon: null,
					head: null,
					body: 'stone-mail',
					hands: null,
					accessory: null
				}
			}
		});
		sceneState.handleHudCommand({ type: 'unequip-slot', slot: 'body' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				hp: 20,
				maxHp: 20,
				defense: 0,
				inventory: expect.objectContaining({
					equipped: expect.objectContaining({ body: null })
				})
			})
		);
	});

	it('starts battle instead of applying melee XP in WorldScene', async () => {
		const progression = await import('$lib/game/core/progression');
		const applyExperienceGainSpy = vi.spyOn(progression, 'applyExperienceGain');
		const { BattleScene } = await import('./BattleScene');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ hp: number; x: number }>;
			playerProgress: { level: number; xp: number };
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 4_960, y: 960 });
		sceneState.enemies[0]!.hp = 3;

		scene.update(0, 16);

		expect(scene.scene.start).toHaveBeenCalledWith(
			BattleScene.key,
			expect.objectContaining({ sourceEncounterId: 'meadow-slime-west' })
		);
		expect(applyExperienceGainSpy).not.toHaveBeenCalled();
		expect(sceneState.enemies[0]!.hp).toBe(3);
		expect(sceneState.playerProgress).toMatchObject({ level: 1, xp: 0 });
		expect(phaserState.enemyMarker.play).not.toHaveBeenCalledWith('slimeScout-dead', false);
	});

	it('plays enemy walk while chasing and starts battle at contact', async () => {
		const { BattleScene } = await import('./BattleScene');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; y: number; attackCooldownUntil: number }>;
		};

		scene.create({ mapId: 'ruins-core' });
		phaserState.enemyMarker.play.mockClear();
		Object.assign(phaserState.playerMarker, { x: 4_912, y: 3_200 });

		scene.update(0, 1000);

		expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('ruinsWarden-walk', true);

		phaserState.enemyMarker.play.mockClear();
		Object.assign(phaserState.playerMarker, {
			x: sceneState.enemies[0]!.x,
			y: sceneState.enemies[0]!.y
		});
		sceneState.enemies[0]!.attackCooldownUntil = 0;
		scene.update(500, 16);

		expect(scene.scene.start).toHaveBeenCalledWith(
			BattleScene.key,
			expect.objectContaining({
				sourceEncounterId: 'ruins-warden',
				sourceEnemyId: 'ruins-warden'
			})
		);
		expect(phaserState.enemyMarker.play).not.toHaveBeenCalledWith('ruinsWarden-attack', false);
	});

	it('starts battle before enemy contact hit impact is resolved', async () => {
		const { BattleScene } = await import('./BattleScene');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ attackCooldownUntil: number }>;
		};

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 4_992, y: 3_200 });
		sceneState.enemies[0]!.attackCooldownUntil = 0;
		phaserState.playerMarker.setTint.mockClear();
		phaserState.playerMarker.clearTint.mockClear();

		scene.update(500, 16);

		expect(scene.scene.start).toHaveBeenCalledWith(
			BattleScene.key,
			expect.objectContaining({ sourceEncounterId: 'ruins-warden' })
		);
		expect(phaserState.playerMarker.setTint).not.toHaveBeenCalledWith(0xfff0a8);
		expect(phaserState.playerMarker.clearTint).not.toHaveBeenCalled();
	});

	it('starts battle when an enemy moves into encounter range during behavior update', async () => {
		registerSceneSupportTestMap();
		const { BattleScene } = await import('./BattleScene');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			playerProgress: { hp: number };
		};

		scene.create({ mapId: 'scene-support-test' });
		Object.assign(phaserState.playerMarker, { x: 240, y: 320 });

		scene.update(500, 10_000);

		expect(scene.scene.start).toHaveBeenCalledWith(
			BattleScene.key,
			expect.objectContaining({
				sourceMapId: 'scene-support-test',
				sourceEncounterId: 'scene-support-slime',
				sourceEnemyId: 'slime-scout'
			})
		);
		expect(sceneState.playerProgress.hp).toBe(20);
		expect(phaserState.enemyMarker.play).not.toHaveBeenCalledWith('slimeScout-attack', false);
	});

	it('moves enemies toward a readable melee distance before battle engagement', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; y: number }>;
			playerProgress: { hp: number };
		};

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 4_800, y: 3_200 });

		scene.update(0, 10_000);

		expect(sceneState.enemies[0]!.x).toBeLessThan(4_992);
		expect(sceneState.enemies[0]!.x).toBeGreaterThan(4_912);
		expect(sceneState.enemies[0]!.y).toBe(3_200);
		expect(sceneState.playerProgress.hp).toBe(20);
		expect(scene.scene.start).not.toHaveBeenCalled();
	});

	it('hides encounter art and health bars after a returned battle victory', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const save = createNewSaveState();

		scene.create({
			saveState: save,
			reason: 'battle-result',
			battleResult: {
				outcome: 'victory',
				sourceMapId: 'meadow-entry',
				sourceEncounterId: 'meadow-slime-west',
				sourceEnemyId: 'slime-scout',
				returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
				finalHeroHp: 20,
				inventory: save.inventory,
				defeatedUnits: [
					{
						unitId: 'meadow-slime-west:unit:0',
						unitIndex: 0,
						enemyId: 'slime-scout',
						xpReward: 4,
						coinReward: 4,
						drops: []
					}
				]
			}
		});

		expect(phaserState.enemyMarker.setVisible).toHaveBeenCalledWith(false);
		expect(phaserState.enemyHealthBarBg.setVisible).toHaveBeenCalledWith(false);
		expect(phaserState.enemyHealthBarFill.setVisible).toHaveBeenCalledWith(false);
	});

	it('applies returned battle drops and saves resolved drops', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			buildSaveState: () => {
				inventory: { stacks: Array<{ itemId: string; quantity: number }> };
				flags: {
					resolvedEncounterDrops: Record<string, Array<{ itemId: string; quantity: number }>>;
				};
			};
		};
		const save = createNewSaveState();

		scene.create({
			saveState: save,
			reason: 'battle-result',
			battleResult: {
				outcome: 'victory',
				sourceMapId: 'meadow-entry',
				sourceEncounterId: 'meadow-slime-west',
				sourceEnemyId: 'slime-scout',
				returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
				finalHeroHp: 20,
				inventory: save.inventory,
				defeatedUnits: [
					{
						unitId: 'meadow-slime-west:unit:0',
						unitIndex: 0,
						enemyId: 'slime-scout',
						xpReward: 4,
						coinReward: 4,
						drops: [{ itemId: 'field-potion', quantity: 1 }]
					}
				]
			}
		});

		expect(sceneState.buildSaveState()).toMatchObject({
			inventory: { stacks: [{ itemId: 'field-potion', quantity: 2 }] },
			flags: {
				resolvedEncounterDrops: { 'meadow-slime-west': [{ itemId: 'field-potion', quantity: 1 }] }
			}
		});
	});

	it('uses returned battle drops without rerolling loaded encounter drops', async () => {
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			buildSaveState: () => {
				inventory: { stacks: Array<{ itemId: string; quantity: number }> };
				flags: {
					resolvedEncounterDrops: Record<string, Array<{ itemId: string; quantity: number }>>;
				};
			};
		};

		try {
			const save = createNewSaveState();
			scene.create({
				saveState: {
					...save,
					mapId: 'meadow-entry',
					flags: {
						clearedEncounters: [],
						clearedEncounterUnitCounts: {},
						collectedPickups: [],
						resolvedEncounterDrops: {
							'meadow-slime-west': [{ itemId: 'greater-field-potion', quantity: 1 }]
						}
					},
					inventory: {
						stacks: [],
						equipment: ['training-sword']
					}
				},
				reason: 'battle-result',
				battleResult: {
					outcome: 'victory',
					sourceMapId: 'meadow-entry',
					sourceEncounterId: 'meadow-slime-west',
					sourceEnemyId: 'slime-scout',
					returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
					finalHeroHp: 20,
					inventory: { stacks: [], equipment: ['training-sword'] },
					defeatedUnits: [
						{
							unitId: 'meadow-slime-west:unit:0',
							unitIndex: 0,
							enemyId: 'slime-scout',
							xpReward: 4,
							coinReward: 4,
							drops: [{ itemId: 'field-potion', quantity: 1 }]
						}
					]
				}
			});

			expect(randomSpy).not.toHaveBeenCalled();
			expect(sceneState.buildSaveState()).toMatchObject({
				inventory: { stacks: [{ itemId: 'field-potion', quantity: 1 }] },
				flags: {
					resolvedEncounterDrops: {
						'meadow-slime-west': [{ itemId: 'field-potion', quantity: 1 }]
					}
				}
			});
		} finally {
			randomSpy.mockRestore();
		}
	});

	it('starts battle in range without manual input and leaves world enemy HP unchanged', async () => {
		const { BattleScene } = await import('./BattleScene');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ hp: number }>;
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 4_960, y: 960 });

		scene.update(0, 16);

		expect(scene.scene.start).toHaveBeenCalledWith(
			BattleScene.key,
			expect.objectContaining({ sourceEncounterId: 'meadow-slime-west' })
		);
		expect(sceneState.enemies[0]!.hp).toBe(8);
	});

	it('does not start battle before the engagement cooldown elapses', async () => {
		const { BattleScene } = await import('./BattleScene');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			playerAttackCooldownUntil: number;
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 4_960, y: 960 });
		sceneState.playerAttackCooldownUntil = 500;

		scene.update(0, 16);
		scene.update(200, 16);
		scene.update(400, 16);

		expect(scene.scene.start).not.toHaveBeenCalled();

		scene.update(500, 16);

		expect(scene.scene.start).toHaveBeenCalledWith(
			BattleScene.key,
			expect.objectContaining({ sourceEncounterId: 'meadow-slime-west' })
		);
	});

	it('applies returned battle XP after level 2 without throwing', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			buildSaveState: () => ReturnType<typeof createNewSaveState>;
		};
		const save = createNewSaveState();

		expect(() =>
			scene.create({
				saveState: {
					...save,
					player: { ...save.player, level: 2, xp: 5, hp: 24, attack: 4 }
				},
				reason: 'battle-result',
				battleResult: {
					outcome: 'victory',
					sourceMapId: 'meadow-entry',
					sourceEncounterId: 'meadow-slime-west',
					sourceEnemyId: 'slime-scout',
					returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
					finalHeroHp: 24,
					inventory: save.inventory,
					defeatedUnits: [
						{
							unitId: 'meadow-slime-west:unit:0',
							unitIndex: 0,
							enemyId: 'slime-scout',
							xpReward: 4,
							coinReward: 4,
							drops: []
						}
					]
				}
			})
		).not.toThrow();
		expect(sceneState.buildSaveState().player).toMatchObject({
			level: 2,
			xp: 9,
			hp: 24,
			attack: 4
		});
	});

	it('side quest completion from returned battle result grants rewards once', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			buildSaveState: () => {
				wallet: { coins: number };
				inventory: { stacks: Array<{ itemId: string; quantity: number }> };
				quests: {
					entries: Record<string, { status: string; progress: number; rewardApplied: boolean }>;
				};
			};
		};
		const save = createNewSaveState();

		scene.create({
			saveState: {
				...save,
				mapId: 'meadow-entry',
				wallet: { coins: 0 },
				flags: {
					...save.flags,
					clearedEncounters: ['meadow-slime-west', 'meadow-slime-center']
				},
				quests: {
					entries: {
						'investigate-the-ruins': {
							status: 'active',
							currentObjectiveId: 'defeat-ruins-warden',
							progress: 0,
							rewardApplied: false,
							countedSourceIds: []
						},
						'thin-village-slimes': {
							status: 'active',
							currentObjectiveId: 'defeat-village-slimes',
							progress: 2,
							rewardApplied: false,
							countedSourceIds: ['encounter:meadow-slime-west', 'encounter:meadow-slime-center']
						}
					},
					completedObjectives: { 'investigate-the-ruins': ['talk-to-guild-master'] }
				}
			},
			reason: 'battle-result',
			battleResult: {
				outcome: 'victory',
				sourceMapId: 'meadow-entry',
				sourceEncounterId: 'meadow-slime-east',
				sourceEnemyId: 'slime-scout',
				returnPosition: { mapId: 'meadow-entry', x: 5_952, y: 1_600, facing: 'down' },
				finalHeroHp: 20,
				inventory: save.inventory,
				defeatedUnits: [
					{
						unitId: 'meadow-slime-east:unit:0',
						unitIndex: 0,
						enemyId: 'slime-scout',
						xpReward: 4,
						coinReward: 4,
						drops: []
					}
				]
			}
		});

		const completedSave = sceneState.buildSaveState();
		expect(completedSave.quests.entries['thin-village-slimes']).toMatchObject({
			status: 'completed',
			progress: 3,
			rewardApplied: true
		});
		expect(completedSave.wallet.coins).toBe(16);
		expect(completedSave.inventory.stacks).toContainEqual({
			itemId: 'field-potion',
			quantity: 2
		});
	});

	it('blocks the ruins route until the Guild Master objective is complete', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'meadow-entry',
				flags: {
					clearedEncounters: ['meadow-slime-east', 'meadow-slime-center', 'meadow-slime-west'],
					clearedEncounterUnitCounts: {},
					collectedPickups: [],
					resolvedEncounterDrops: {}
				}
			}
		});
		emitHudStateSpy.mockClear();
		Object.assign(phaserState.playerMarker, { x: 5_960, y: 1_868 });

		scene.update(0, 16);

		expect(scene.scene.restart).not.toHaveBeenCalled();
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'Report to the Guild Master first' })
		);
	});

	it('moves into the ruins after the opening encounter is cleared and the exit is reached', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const save = createNewSaveState();

		scene.create({
			saveState: {
				...save,
				mapId: 'meadow-entry',
				flags: {
					clearedEncounters: ['meadow-slime-center', 'meadow-slime-east', 'meadow-slime-west'],
					clearedEncounterUnitCounts: {},
					collectedPickups: [],
					resolvedEncounterDrops: {}
				},
				quests: {
					entries: {
						'investigate-the-ruins': {
							status: 'active',
							currentObjectiveId: 'defeat-ruins-warden',
							progress: 0,
							rewardApplied: false,
							countedSourceIds: []
						}
					},
					completedObjectives: { 'investigate-the-ruins': ['talk-to-guild-master'] }
				}
			}
		});

		Object.assign(phaserState.playerMarker, { x: 5_960, y: 1_868 });
		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'ruins-threshold',
				player: expect.objectContaining({
					x: 512,
					y: 3_200,
					facing: 'right'
				})
			})
		});
	});

	it('allows peaceful village building transitions while road enemies are alive', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'meadow-entry',
				flags: {
					clearedEncounters: [],
					clearedEncounterUnitCounts: {},
					collectedPickups: [],
					resolvedEncounterDrops: {}
				}
			}
		});
		// Approach the authored hero-house doorway from the south-west within the
		// runtime transition radius while leaving the building footprint untouched.
		Object.assign(phaserState.playerMarker, { x: 684, y: 5_877 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'hero-house',
				player: expect.objectContaining({
					x: 352,
					y: 480,
					facing: 'up'
				})
			})
		});
	});

	it('returns from the hero house to a safe point below the exterior doorway', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'hero-house'
			}
		});
		Object.assign(phaserState.playerMarker, { x: 352, y: 560 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'meadow-entry',
				player: expect.objectContaining({
					x: 704,
					y: 5_920,
					facing: 'down'
				})
			})
		});
	});

	it('enters the Shrine of Aurora from the meadow and exits below the Shrine doorway', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'meadow-entry',
				flags: {
					clearedEncounters: [],
					clearedEncounterUnitCounts: {},
					collectedPickups: [],
					resolvedEncounterDrops: {}
				}
			}
		});
		// Approach the authored Shrine doorway from the south-west within the
		// runtime transition radius.
		Object.assign(phaserState.playerMarker, { x: 2_252, y: 5_872 });
		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'shrine-of-aurora-interior',
				player: expect.objectContaining({ x: 384, y: 608, facing: 'up' })
			})
		});

		const shrineScene = new WorldScene();
		phaserState.reset();
		shrineScene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'shrine-of-aurora-interior'
			}
		});
		Object.assign(phaserState.playerMarker, { x: 384, y: 688 });
		shrineScene.update(0, 16);

		expect(shrineScene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'meadow-entry',
				player: expect.objectContaining({ x: 2_272, y: 5_920, facing: 'down' })
			})
		});
	});

	it('returns from the ruins to a spawn point near the meadow entrance', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'ruins-threshold',
				flags: {
					clearedEncounters: ['threshold-slime-east', 'threshold-slime-west'],
					clearedEncounterUnitCounts: {},
					collectedPickups: [],
					resolvedEncounterDrops: {}
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 256, y: 3_200 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'meadow-entry',
				player: expect.objectContaining({
					x: 5_760,
					y: 1_868,
					facing: 'left'
				})
			})
		});
	});

	it('uses stair transitions without changing transition save behavior', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'ruins-threshold',
				flags: {
					clearedEncounters: ['threshold-slime-east', 'threshold-slime-west'],
					clearedEncounterUnitCounts: {},
					collectedPickups: [],
					resolvedEncounterDrops: {}
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 5_888, y: 3_200 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'ruins-core',
				player: expect.objectContaining({
					x: 512,
					y: 3_200,
					facing: 'right'
				})
			})
		});
	});

	it('blocks transitions while any map enemy is still alive', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'meadow-entry',
				flags: {
					clearedEncounters: ['meadow-slime-west', 'meadow-slime-center'],
					clearedEncounterUnitCounts: {},
					collectedPickups: [],
					resolvedEncounterDrops: {}
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 5_960, y: 1_868 });

		scene.update(0, 16);

		expect(scene.scene.restart).not.toHaveBeenCalled();
	});

	it('returns from the ruins core to the threshold after the boss encounter is cleared', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'ruins-core',
				flags: {
					clearedEncounters: ['ruins-warden'],
					clearedEncounterUnitCounts: {},
					collectedPickups: [],
					resolvedEncounterDrops: {}
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 256, y: 3_200 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'ruins-threshold',
				player: expect.objectContaining({
					x: 5_504,
					y: 3_200,
					facing: 'left'
				})
			})
		});
	});

	it('boots transitions with an area-entry status instead of save resumed', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			reason: 'transition',
			saveState: {
				...createNewSaveState(),
				mapId: 'ruins-threshold'
			}
		});

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'Entered area' })
		);
	});

	it('preserves loaded item flags when building transition saves', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'ruins-threshold',
				flags: {
					clearedEncounters: ['threshold-slime-east', 'threshold-slime-west'],
					clearedEncounterUnitCounts: {},
					collectedPickups: ['meadow-cache'],
					resolvedEncounterDrops: {
						'threshold-slime-east': [{ itemId: 'field-potion', quantity: 1 }]
					}
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 5_888, y: 3_200 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				flags: {
					clearedEncounters: ['threshold-slime-east', 'threshold-slime-west'],
					clearedEncounterUnitCounts: {},
					collectedPickups: ['meadow-cache'],
					resolvedEncounterDrops: {
						'threshold-slime-east': [{ itemId: 'field-potion', quantity: 1 }]
					}
				}
			})
		});
	});

	it('keeps meadow slimes inside their top-right forest combat pockets while chasing', async () => {
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ id: string; x: number; y: number; movementMode: string }>;
		};

		scene.create({ mapId: meadowEntryMap.id });
		Object.assign(phaserState.playerMarker, { x: 5_044, y: 960 });

		scene.update(0, 1_000);

		const boundsByEncounterId = new Map(
			(meadowEntryMap.combatBounds ?? []).flatMap((bounds) =>
				bounds.encounterIds.map((encounterId) => [encounterId, bounds])
			)
		);
		for (const enemy of sceneState.enemies) {
			const combatBounds = boundsByEncounterId.get(enemy.id)!;
			expect(enemy.x).toBeGreaterThanOrEqual(combatBounds.x - combatBounds.width / 2);
			expect(enemy.x).toBeLessThanOrEqual(combatBounds.x + combatBounds.width / 2);
			expect(enemy.y).toBeGreaterThanOrEqual(combatBounds.y - combatBounds.height / 2);
			expect(enemy.y).toBeLessThanOrEqual(combatBounds.y + combatBounds.height / 2);
		}
		expect(sceneState.enemies[0]!.movementMode).toBe('chase');
	});

	it('keeps an engaged meadow slime chasing inside the forest pocket leash beyond aggro range', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; y: number; movementMode: string }>;
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(sceneState.enemies[0]!, { x: 4_884, y: 960, movementMode: 'chase' });
		Object.assign(phaserState.playerMarker, { x: 5_240, y: 960 });
		const startX = sceneState.enemies[0]!.x;

		scene.update(0, 1_000);

		expect(sceneState.enemies[0]!.movementMode).toBe('chase');
		expect(sceneState.enemies[0]!.x).toBeGreaterThan(startX);
	});

	it('returns meadow slimes home after the hero leaves the forest combat pocket', async () => {
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; y: number; homeX: number; homeY: number; movementMode: string }>;
		};

		scene.create({ mapId: meadowEntryMap.id });
		Object.assign(phaserState.playerMarker, { x: 5_044, y: 960 });
		scene.update(0, 1_000);

		const chasedX = sceneState.enemies[0]!.x;
		Object.assign(phaserState.playerMarker, { x: 5_600, y: 960 });
		scene.update(1_000, 1_000);

		expect(sceneState.enemies[0]!.movementMode).toBe('return');
		expect(sceneState.enemies[0]!.x).toBeLessThan(chasedX);
		expect(sceneState.enemies[0]!.x).toBeGreaterThanOrEqual(sceneState.enemies[0]!.homeX);
		expect(sceneState.enemies[0]!.y).toBe(sceneState.enemies[0]!.homeY);
	});

	it('prevents returning meadow slimes from attacking after the hero leaves the forest pocket', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; y: number; movementMode: string }>;
			playerProgress: { hp: number };
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(sceneState.enemies[0]!, { x: 5_460, y: 960, movementMode: 'chase' });
		Object.assign(phaserState.playerMarker, { x: 5_600, y: 960 });
		const hpBeforeReturn = sceneState.playerProgress.hp;

		scene.update(1_000, 16);

		expect(sceneState.enemies[0]!.movementMode).toBe('return');
		expect(sceneState.playerProgress.hp).toBe(hpBeforeReturn);
	});

	it('keeps ruins slimes on the existing direct chase behavior', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; movementMode: string }>;
		};

		scene.create({ mapId: 'ruins-threshold' });
		Object.assign(phaserState.playerMarker, { x: 512, y: 3_200 });

		scene.update(0, 1_000);

		expect(sceneState.enemies[0]!.x).toBeLessThan(2_304);
		expect(sceneState.enemies[0]!.movementMode).toBe('chase');
	});

	it('bosses chase before battle and keep phase-2 enrage behavior', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; hp: number }>;
			updateBossPhase: (enemy: { x: number; hp: number }) => void;
			playerProgress: { hp: number };
		};

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 4_800, y: 3_200 });

		scene.update(0, 1000);

		expect(sceneState.enemies[0]!.x).toBeLessThan(4_992);
		expect(sceneState.playerProgress.hp).toBe(20);
		expect(scene.scene.start).not.toHaveBeenCalled();

		sceneState.enemies[0]!.hp = 22;
		sceneState.updateBossPhase(sceneState.enemies[0]!);

		expect(phaserState.enemyMarker.setTint).toHaveBeenCalledWith(0xff8a3d);
	});

	it('starts BattleScene instead of damaging the boss with one opening engagement', async () => {
		const { BattleScene } = await import('./BattleScene');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ hp: number; defeated: boolean }>;
		};

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 4_992, y: 3_200 });

		scene.update(0, 16);

		expect(scene.scene.start).toHaveBeenCalledWith(
			BattleScene.key,
			expect.objectContaining({
				sourceMapId: 'ruins-core',
				sourceEncounterId: 'ruins-warden',
				sourceEnemyId: 'ruins-warden',
				completion: 'victory'
			})
		);
		expect(sceneState.enemies[0]).toMatchObject({ hp: 45, defeated: false });
		expect(scene.add.text).not.toHaveBeenCalled();
	});

	it('shows a victory state after a returned boss battle victory', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const save = { ...createNewSaveState(), mapId: 'ruins-core' };

		scene.create({
			saveState: save,
			reason: 'battle-result',
			battleResult: {
				outcome: 'victory',
				sourceMapId: 'ruins-core',
				sourceEncounterId: 'ruins-warden',
				sourceEnemyId: 'ruins-warden',
				completion: 'victory',
				returnPosition: { mapId: 'ruins-core', x: 4_992, y: 3_264, facing: 'down' },
				finalHeroHp: 20,
				inventory: save.inventory,
				defeatedUnits: [
					{
						unitId: 'ruins-warden:unit:0',
						unitIndex: 0,
						enemyId: 'ruins-warden',
						xpReward: 15,
						coinReward: 30,
						drops: []
					}
				]
			}
		});

		expect(scene.add.text).toHaveBeenCalledWith(
			expect.any(Number),
			expect.any(Number),
			expect.stringMatching(/victory/i),
			expect.anything()
		);
	});

	it('passes enemyCount 1 for boss encounters instead of rolling a group', async () => {
		const { BattleScene } = await import('./BattleScene');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 4_992, y: 3_200 });

		scene.update(0, 16);

		expect(scene.scene.start).toHaveBeenCalledWith(
			BattleScene.key,
			expect.objectContaining({
				sourceEnemyId: 'ruins-warden',
				enemyCount: 1
			})
		);
	});

	it('publishes HUD state after a non-lethal enemy hit in BattleScene', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		const saveState = createNewSaveState();

		scene.create({
			saveState,
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 1, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number; attackCooldownUntil: number }>;
		};
		state.enemies[0]!.x = 330;
		state.enemies[0]!.y = 180;
		state.enemies[0]!.attackCooldownUntil = 0;
		emitHudStateSpy.mockClear();

		scene.update(0, 16);
		emitHudStateSpy.mockClear();
		scene.update(120, 16);

		const lastCall = emitHudStateSpy.mock.calls[emitHudStateSpy.mock.calls.length - 1];
		expect(lastCall?.[0]).toMatchObject({ hp: 18, maxHp: 20 });
	});

	it('applies boss enrage tint when enemy HP drops below 50% in BattleScene', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		const saveState = createNewSaveState();

		scene.create({
			saveState,
			sourceMapId: 'ruins-core',
			sourceEncounterId: 'ruins-warden',
			sourceEnemyId: 'ruins-warden',
			returnPosition: { mapId: 'ruins-core', x: 4_992, y: 3_200, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 23, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
		const state = scene as unknown as {
			enemies: Array<{
				x: number;
				y: number;
				hp: number;
				maxHp: number;
				phase: 1 | 2;
			}>;
		};
		state.enemies[0]!.x = 330;
		state.enemies[0]!.y = 180;

		expect(state.enemies[0]!.phase).toBe(1);

		scene.update(0, 16);

		expect(state.enemies[0]!.hp).toBe(22);
		expect(state.enemies[0]!.phase).toBe(2);
		expect(phaserState.enemyMarker.setTint).toHaveBeenCalledWith(0xff8a3d);
	});
});

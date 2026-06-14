import { crossroadsDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const crossroadsRegion: RegionFragment = {
	groundPatches: [
		{
			id: 'crossroads-plaza',
			x: 3_500,
			y: 4_000,
			width: 900,
			height: 900,
			tile: 'cobblestoneTile'
		},
		{
			id: 'crossroads-festival-road',
			x: 3_500,
			y: 3_350,
			width: 120,
			height: 1_400,
			tile: 'pathTile'
		},
		{
			id: 'crossroads-gate-terrace',
			x: 3_500,
			y: 3_020,
			width: 700,
			height: 300,
			tile: 'cobblestoneTile'
		}
	],
	landmarks: [
		{
			id: 'castle-gate',
			x: 3_500,
			y: 2_980,
			width: 480,
			height: 320,
			labelKey: 'content.maps.landmarks.castle-gate.label'
		},
		{
			id: 'crossroads-waystone',
			x: 3_500,
			y: 4_000,
			width: 120,
			height: 150,
			labelKey: 'content.maps.landmarks.crossroads-waystone.label'
		}
	],
	mapDecor: [
		{
			id: 'castle-gate-sprite',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'castleGate',
			x: 3_500,
			y: 2_980,
			width: 512,
			height: 420,
			mode: 'image'
		},
		{
			id: 'crossroads-waystone-sprite',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'waystone',
			x: 3_500,
			y: 4_000,
			width: 140,
			height: 180,
			mode: 'image',
			collision: { id: 'crossroads-waystone-collision', x: 3_500, y: 4_040, width: 90, height: 80 }
		},
		{
			id: 'crossroads-lantern-west',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'poleLantern',
			x: 3_360,
			y: 3_500,
			width: 110,
			height: 220,
			mode: 'image',
			collision: {
				id: 'crossroads-lantern-west-collision',
				x: 3_360,
				y: 3_580,
				width: 50,
				height: 60
			}
		},
		{
			id: 'crossroads-lantern-east',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'poleLantern',
			x: 3_640,
			y: 3_500,
			width: 110,
			height: 220,
			mode: 'image',
			collision: {
				id: 'crossroads-lantern-east-collision',
				x: 3_640,
				y: 3_580,
				width: 50,
				height: 60
			}
		},
		{
			id: 'crossroads-banner',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'festivalBanner',
			x: 3_200,
			y: 4_200,
			width: 150,
			height: 240,
			mode: 'image'
		},
		{
			id: 'crossroads-stall',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'marketStall',
			x: 3_820,
			y: 4_200,
			width: 260,
			height: 200,
			mode: 'image',
			collision: { id: 'crossroads-stall-collision', x: 3_820, y: 4_240, width: 220, height: 120 }
		},
		{
			id: 'crossroads-flowers',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'flowerBed',
			x: 3_200,
			y: 3_800,
			width: 180,
			height: 150,
			mode: 'image'
		},
		{
			id: 'crossroads-hanging-lantern',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'hangingLantern',
			x: 3_500,
			y: 3_700,
			width: 120,
			height: 140,
			mode: 'image',
			depth: 'foreground'
		}
	],
	ambientNpcs: [
		{ id: 'crossroads-crier', x: 3_400, y: 4_000, frameName: 'crierNpc' },
		{ id: 'crossroads-traveler', x: 3_700, y: 4_300, frameName: 'travelerNpc' }
	],
	blockers: [
		{ id: 'castle-gate-block', x: 3_500, y: 2_840, width: 480, height: 96, kind: 'future-gate' }
	]
};

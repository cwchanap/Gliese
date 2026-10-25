import { describe, expect, it } from 'vitest';
import {
	boarKing,
	enemies,
	enemyList,
	forestWolf,
	sunCrestCaptain
} from '$lib/game/content/enemies';

describe('enemy combat tuning', () => {
	it('keeps trail enemies durable enough to need multiple practice-spear hits', () => {
		expect(forestWolf.baseHp).toBe(10);
		expect(forestWolf.xpReward).toBe(2);
	});

	it('keeps the Boar King a boss with a phase-two colour', () => {
		expect(boarKing.baseHp).toBe(80);
		expect(boarKing.boss).toBeDefined();
	});

	it('builds the raid captain to be unbeatable and unrewarding', () => {
		expect(sunCrestCaptain.baseHp).toBeGreaterThanOrEqual(999);
		expect(sunCrestCaptain.xpReward).toBe(0);
		expect(sunCrestCaptain.coinReward).toBe(0);
	});

	it('registers every enemy by id with non-negative integer coin rewards', () => {
		expect(Object.keys(enemies)).toEqual(enemyList.map((enemy) => enemy.id));
		for (const enemy of enemyList) {
			expect(enemies[enemy.id]).toBe(enemy);
			expect(Number.isInteger(enemy.coinReward)).toBe(true);
			expect(enemy.coinReward).toBeGreaterThanOrEqual(0);
		}
	});
});

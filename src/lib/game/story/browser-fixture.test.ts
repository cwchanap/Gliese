import { describe, expect, it } from 'vitest';

import {
	browserStoryCatalog,
	getBrowserNpcDialogue,
	getBrowserStoryScene,
	type BrowserStoryCatalog
} from '$lib/game/story/browser-fixture';

const progress = (objectiveId: string | null, questId = 'prologue-proving-morning') => ({
	questId,
	objectiveId
});

describe('browser fixture', () => {
	it('throws for an unknown npc, a wrong map, and an unknown scene', () => {
		expect(() =>
			getBrowserNpcDialogue({
				npcId: 'unknown-npc',
				mapId: 'meadow-entry',
				locale: 'en',
				progress: progress(null)
			})
		).toThrow('unknown story npc: unknown-npc');
		expect(() =>
			getBrowserNpcDialogue({
				npcId: 'oren',
				mapId: 'guild-hall',
				locale: 'en',
				progress: progress(null)
			})
		).toThrow('story npc oren is not available on map guild-hall');
		expect(() => getBrowserStoryScene({ sceneId: 'missing', locale: 'en' })).toThrow(
			'unknown story scene: missing'
		);
	});

	it('serves Oren the forge shop when no story branch applies', () => {
		const dialogue = getBrowserNpcDialogue({
			npcId: 'oren',
			mapId: 'blacksmith-interior',
			locale: 'en',
			progress: progress(null, 'prologue-trial-tracks')
		});

		expect(dialogue.sessionId).toBe('npc:oren:always');
		expect(dialogue.lines[0]?.speaker).toBe('Oren');
		expect(dialogue.actions.map((action) => action.intent)).toEqual([
			{ type: 'openShop', shopId: 'sundrop-forge' },
			{ type: 'close' }
		]);
	});

	it('prefers the current objective, then the current quest, then always', () => {
		const catalog: BrowserStoryCatalog = {
			packageId: 'test',
			defaultLocale: 'en',
			npcDialogues: [
				{
					npcId: 'borak',
					mapId: 'guild-hall',
					branches: [
						{ beatId: 'b', condition: { type: 'always' }, lines: [], actions: [] },
						{
							beatId: 'b',
							condition: { type: 'quest', id: 'prologue-proving-morning' },
							lines: [],
							actions: []
						},
						{
							beatId: 'b',
							condition: { type: 'objective', id: 'report-to-borak' },
							lines: [],
							actions: []
						}
					]
				}
			],
			scenes: []
		};
		const branchFor = (objectiveId: string | null, questId?: string) =>
			getBrowserNpcDialogue(
				{
					npcId: 'borak',
					mapId: 'guild-hall',
					locale: 'en',
					progress: progress(objectiveId, questId)
				},
				catalog
			).sessionId;

		expect(branchFor('report-to-borak')).toBe('npc:borak:objective:report-to-borak');
		expect(branchFor('talk-to-mott')).toBe('npc:borak:quest:prologue-proving-morning');
		expect(branchFor(null, 'prologue-raid')).toBe('npc:borak:always');
	});

	it('serves scenes with per-line speakers and narration', () => {
		const scene = getBrowserStoryScene({ sceneId: 'prologue.opening', locale: 'en' });

		expect(scene.sessionId).toBe('scene:prologue.opening');
		expect(scene.lines[0]?.speaker).toBe('');
		expect(scene.lines.some((line) => line.speaker === 'Tikka')).toBe(true);
	});

	it('compiles an always branch for every story npc', () => {
		for (const dialogue of browserStoryCatalog.npcDialogues) {
			expect(
				dialogue.branches.some((branch) => branch.condition.type === 'always'),
				dialogue.npcId
			).toBe(true);
		}
	});
});

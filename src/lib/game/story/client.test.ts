import { describe, expect, it } from 'vitest';

import {
	createDialogueSessionFromStory,
	createSceneSessionFromStory,
	getNpcStoryDialogue,
	getNpcStoryDialogueWithRuntime,
	getStorySceneWithRuntime,
	type StoryDialogueResponse
} from '$lib/game/story/client';

const shopResponse: StoryDialogueResponse = {
	sessionId: 'npc:mira:always',
	lines: [{ speaker: 'Mira', text: 'Herbs, salves, and potions, all fresh.' }],
	actions: [
		{ id: 'shop', label: 'Shop', intent: { type: 'openShop', shopId: 'miras-item-shop' } },
		{ id: 'close', label: 'Close', intent: { type: 'close' } }
	]
};

describe('story client', () => {
	it('adapts story payloads into dialogue sessions with per-line speakers', () => {
		const session = createDialogueSessionFromStory(
			{
				sessionId: 'npc:borak:objective:report-to-borak',
				lines: [
					{ speaker: 'Borak', text: 'Grik. You came.' },
					{ speaker: 'Drogg', text: 'A very small boar.' }
				],
				actions: []
			},
			'borak',
			'en'
		);

		expect(session).toMatchObject({
			id: 'npc:borak:objective:report-to-borak',
			npcId: 'borak',
			speaker: 'Borak',
			line: 'Grik. You came.',
			lineCount: 2,
			mode: 'conversation',
			choices: []
		});
	});

	it('starts single-line action payloads in choice mode with localized labels', () => {
		const session = createDialogueSessionFromStory(shopResponse, 'mira', 'ja');

		expect(session.mode).toBe('choice');
		expect(session.choices).toEqual([
			{ id: 'shop', label: '店', intent: { type: 'openShop', shopId: 'miras-item-shop' } },
			{ id: 'close', label: '閉じる', intent: { type: 'close' } }
		]);
	});

	it('falls back to the payload label when an action id has no i18n key', () => {
		const session = createDialogueSessionFromStory(
			{
				sessionId: 'npc:test:custom',
				lines: [{ speaker: 'Test', text: 'Hello.' }],
				actions: [{ id: 'unknown-action', label: 'Custom Action', intent: { type: 'close' } }]
			},
			'test',
			'en'
		);

		expect(session.choices[0]?.label).toBe('Custom Action');
	});

	it('rejects dialogue and scene payloads without lines', () => {
		expect(() =>
			createDialogueSessionFromStory({ sessionId: 'x', lines: [], actions: [] }, 'x', 'en')
		).toThrow('Story dialogue response must include at least one line.');
		expect(() => createSceneSessionFromStory({ sessionId: 'x', lines: [] })).toThrow(
			'Story scene response must include at least one line.'
		);
	});

	it('loads browser fixture dialogue for the current objective with app locales', async () => {
		const session = await getNpcStoryDialogue({
			npcId: 'mira',
			mapId: 'item-shop',
			locale: 'zh-Hant',
			progress: { questId: 'prologue-proving-morning', objectiveId: 'collect-herb-pouch' }
		});

		expect(session).toMatchObject({
			id: 'npc:mira:objective:collect-herb-pouch',
			npcId: 'mira',
			speaker: 'Mira',
			mode: 'conversation',
			choices: []
		});
	});

	it('invokes the Tauri story commands with normalized request envelopes', async () => {
		const calls: Array<{ command: string; args: unknown }> = [];
		const invoke = async <T>(command: string, args: Record<string, unknown>): Promise<T> => {
			calls.push({ command, args });
			return (
				command === 'get_npc_dialogue'
					? shopResponse
					: { sessionId: 'scene:prologue.opening', lines: [{ speaker: '', text: 'Morning.' }] }
			) as T;
		};

		const session = await getNpcStoryDialogueWithRuntime(
			{
				npcId: 'mira',
				mapId: 'item-shop',
				locale: 'zh-Hant',
				progress: { questId: 'prologue-trial-tracks', objectiveId: 'read-boar-signs' }
			},
			{ mode: 'tauri', invoke }
		);
		const scene = await getStorySceneWithRuntime(
			{ sceneId: 'prologue.opening', locale: 'ja' },
			{ mode: 'tauri', invoke }
		);

		expect(calls).toEqual([
			{
				command: 'get_npc_dialogue',
				args: {
					request: {
						npcId: 'mira',
						mapId: 'item-shop',
						locale: 'en',
						progress: { questId: 'prologue-trial-tracks', objectiveId: 'read-boar-signs' }
					}
				}
			},
			{
				command: 'get_story_scene',
				args: { request: { sceneId: 'prologue.opening', locale: 'en' } }
			}
		]);
		expect(session.choices[0]?.label).toBe('商店');
		expect(scene).toMatchObject({ mode: 'system', npcId: null, line: 'Morning.' });
	});
});

import { describe, expect, it } from 'vitest';

import { getBrowserNpcDialogue } from '$lib/game/story/browser-fixture';
import {
	createDialogueSessionFromStory,
	getNpcStoryDialogue,
	getNpcStoryDialogueWithRuntime,
	type StoryDialogueCommandArgs,
	type StoryDialogueResponse
} from '$lib/game/story/client';

describe('story client', () => {
	it('adapts Rust story payloads into dialogue sessions', () => {
		const session = createDialogueSessionFromStory(
			{
				sessionId: 'npc:guild-master:mainQuestNeedsGuildBriefing',
				speaker: 'Guild Master Arlen',
				lines: ['You made it.', 'Go to the ruins.'],
				actions: [
					{
						id: 'quest',
						label: 'Quest',
						intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
					}
				],
				completionIntent: { type: 'recordNpcTalk', npcId: 'guild-master' }
			},
			'en'
		);

		expect(session).toMatchObject({
			id: 'npc:guild-master:mainQuestNeedsGuildBriefing',
			speaker: 'Guild Master Arlen',
			line: 'You made it.',
			lineCount: 2,
			mode: 'conversation'
		});
		expect(session.choices.map((choice) => choice.id)).toEqual(['quest']);
	});

	it('starts single-line action payloads in choice mode when no completion intent', () => {
		const session = createDialogueSessionFromStory(
			{
				sessionId: 'npc:shopkeeper-mira:always',
				speaker: 'Mira',
				lines: ['Fresh tonics are on the shelf.'],
				actions: [
					{
						id: 'shop',
						label: 'Shop',
						intent: { type: 'openShop', shopId: 'miras-item-shop' }
					}
				],
				completionIntent: null
			},
			'en'
		);

		expect(session.mode).toBe('choice');
		expect(session.choices).toEqual([
			{ id: 'shop', label: 'Shop', intent: { type: 'openShop', shopId: 'miras-item-shop' } }
		]);
	});

	it('keeps single-line action payloads in conversation mode when completion intent is present', () => {
		const session = createDialogueSessionFromStory(
			{
				sessionId: 'npc:guild-master:mainQuestNeedsGuildBriefing',
				speaker: 'Guild Master Arlen',
				lines: ['You made it.'],
				actions: [
					{
						id: 'quest',
						label: 'Quest',
						intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
					}
				],
				completionIntent: { type: 'recordNpcTalk', npcId: 'guild-master' }
			},
			'en'
		);

		expect(session.mode).toBe('conversation');
		expect(session.completionIntent).toEqual({
			type: 'recordNpcTalk',
			npcId: 'guild-master'
		});
		expect(session.choices.map((choice) => choice.id)).toEqual(['quest']);
	});

	it('rejects story payloads without dialogue lines', () => {
		expect(() =>
			createDialogueSessionFromStory(
				{
					sessionId: 'npc:guild-master:empty',
					speaker: 'Guild Master Arlen',
					lines: [],
					actions: [],
					completionIntent: null
				},
				'en'
			)
		).toThrow('Story dialogue response must include at least one line.');
	});

	it('uses browser fixture branch priority for current NPCs', () => {
		const response = getBrowserNpcDialogue({
			npcId: 'guild-master',
			mapId: 'guild-hall',
			locale: 'en',
			quest: {
				mainQuestNeedsGuildBriefing: true,
				guildBriefingComplete: false,
				hasActiveSideQuest: true,
				hasCompletedQuest: true
			}
		});

		expect(response).toMatchObject({
			sessionId: 'npc:guild-master:mainQuestNeedsGuildBriefing',
			speaker: 'Guild Master Arlen',
			completionIntent: { type: 'recordNpcTalk', npcId: 'guild-master' }
		});
		expect(response.actions.map((action) => action.id)).toEqual(['quest']);
	});

	it('loads browser fixture dialogue outside the Tauri story runtime with app locales', async () => {
		const session = await getNpcStoryDialogue({
			npcId: 'shopkeeper-mira',
			mapId: 'item-shop',
			locale: 'ja',
			quest: {
				mainQuestNeedsGuildBriefing: false,
				guildBriefingComplete: true,
				hasActiveSideQuest: false,
				hasCompletedQuest: false
			}
		});

		expect(session).toMatchObject({
			id: 'npc:shopkeeper-mira:guildBriefingComplete',
			speaker: 'Mira',
			mode: 'choice'
		});
		expect(session.choices).toEqual([
			{ id: 'shop', label: '店', intent: { type: 'openShop', shopId: 'miras-item-shop' } }
		]);
	});

	it('invokes the Tauri story command with a normalized request envelope', async () => {
		const response: StoryDialogueResponse = {
			sessionId: 'npc:guild-master:mainQuestNeedsGuildBriefing',
			speaker: 'Guild Master Arlen',
			lines: ['You made it.'],
			actions: [
				{
					id: 'quest',
					label: 'Quest',
					intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
				}
			],
			completionIntent: { type: 'recordNpcTalk', npcId: 'guild-master' }
		};
		const calls: Array<{ command: string; args: unknown }> = [];

		const session = await getNpcStoryDialogueWithRuntime(
			{
				npcId: 'guild-master',
				mapId: 'guild-hall',
				locale: 'zh-Hant',
				quest: {
					mainQuestNeedsGuildBriefing: true,
					guildBriefingComplete: false,
					hasActiveSideQuest: false,
					hasCompletedQuest: false
				}
			},
			{
				mode: 'tauri',
				invoke: async <T>(command: string, args: StoryDialogueCommandArgs): Promise<T> => {
					calls.push({ command, args });
					return response as T;
				}
			}
		);

		expect(calls).toEqual([
			{
				command: 'get_npc_dialogue',
				args: {
					request: {
						npcId: 'guild-master',
						mapId: 'guild-hall',
						locale: 'en',
						quest: {
							mainQuestNeedsGuildBriefing: true,
							guildBriefingComplete: false,
							hasActiveSideQuest: false,
							hasCompletedQuest: false
						}
					}
				}
			}
		]);
		expect(session.completionIntent).toEqual({ type: 'recordNpcTalk', npcId: 'guild-master' });
		expect(session.choices[0]?.label).toBe('任務');
	});

	it('localizes action labels to English when locale is en', () => {
		const session = createDialogueSessionFromStory(
			{
				sessionId: 'npc:shopkeeper-mira:always',
				speaker: 'Mira',
				lines: ['Fresh tonics.'],
				actions: [
					{
						id: 'shop',
						label: 'Shop',
						intent: { type: 'openShop', shopId: 'miras-item-shop' }
					}
				],
				completionIntent: null
			},
			'en'
		);

		expect(session.choices[0]?.label).toBe('Shop');
	});

	it('falls back to payload label when action id has no i18n key', () => {
		const session = createDialogueSessionFromStory(
			{
				sessionId: 'npc:test:unknown-action',
				speaker: 'Test',
				lines: ['Hello.'],
				actions: [
					{
						id: 'unknown-action',
						label: 'Custom Action',
						intent: { type: 'close' }
					}
				],
				completionIntent: null
			},
			'en'
		);

		expect(session.choices[0]?.label).toBe('Custom Action');
	});
});

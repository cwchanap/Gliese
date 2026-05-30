import type { DialogueIntent, DialogueSession } from '$lib/game/core/dialogue';
import type { Locale } from '$lib/game/i18n/locales';

export type StoryQuestSummary = {
	mainQuestNeedsGuildBriefing: boolean;
	guildBriefingComplete: boolean;
	hasActiveSideQuest: boolean;
	hasCompletedQuest: boolean;
};

export type StoryDialogueRequest = {
	npcId: string;
	mapId: string;
	locale: Locale;
	quest: StoryQuestSummary;
};

export type StoryDialogueResponse = {
	sessionId: string;
	speaker: string;
	lines: string[];
	actions: Array<{ id: string; label: string; intent: DialogueIntent }>;
	completionIntent: DialogueIntent | null;
};

export function createDialogueSessionFromStory(response: StoryDialogueResponse): DialogueSession {
	return {
		id: response.sessionId,
		npcId: null,
		speaker: response.speaker,
		lines: response.lines,
		line: response.lines[0] ?? '',
		lineIndex: 0,
		lineCount: response.lines.length,
		mode: response.lines.length <= 1 && response.actions.length > 0 ? 'choice' : 'conversation',
		choices: response.actions.map((action) => ({
			id: action.id,
			label: action.label,
			intent: action.intent
		})),
		completionIntent: response.completionIntent,
		canClose: true
	};
}

export async function getNpcStoryDialogue(request: StoryDialogueRequest): Promise<DialogueSession> {
	if (import.meta.env.VITE_STORY_RUNTIME === 'tauri') {
		const { invoke } = await import('@tauri-apps/api/core');
		return createDialogueSessionFromStory(
			await invoke<StoryDialogueResponse>('get_npc_dialogue', { request })
		);
	}

	const fixture = await import('$lib/game/story/browser-fixture');
	return createDialogueSessionFromStory(fixture.getBrowserNpcDialogue(request));
}

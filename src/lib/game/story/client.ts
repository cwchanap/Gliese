import type { DialogueIntent, DialogueSession } from '$lib/game/core/dialogue';
import type { Locale } from '$lib/game/i18n/locales';
import { t } from '$lib/game/i18n/translate';

export type StoryLocale = 'en';

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

export type StoryRuntimeDialogueRequest = Omit<StoryDialogueRequest, 'locale'> & {
	locale: StoryLocale;
};

export type StoryIntent =
	| { type: 'showQuestList'; giverNpcId: string }
	| { type: 'openShop'; shopId: string }
	| { type: 'recordNpcTalk'; npcId: string }
	| { type: 'close' };

export type StoryDialogueResponse = {
	sessionId: string;
	speaker: string;
	lines: string[];
	actions: Array<{ id: string; label: string; intent: StoryIntent }>;
	completionIntent: StoryIntent | null;
};

export type StoryDialogueCommandArgs = Record<string, unknown> & {
	request: StoryRuntimeDialogueRequest;
};

export type StoryRuntime =
	| {
			mode: 'tauri';
			invoke: <T>(command: string, args: StoryDialogueCommandArgs) => Promise<T>;
	  }
	| {
			mode: 'browser';
			fixture: {
				getBrowserNpcDialogue(request: StoryRuntimeDialogueRequest): StoryDialogueResponse;
			};
	  };

export function createDialogueSessionFromStory(
	response: StoryDialogueResponse,
	locale: Locale
): DialogueSession {
	if (response.lines.length === 0) {
		throw new Error('Story dialogue response must include at least one line.');
	}

	const hasCompletionIntent = response.completionIntent !== null;
	const shouldStartInChoice =
		response.lines.length <= 1 && response.actions.length > 0 && !hasCompletionIntent;

	return {
		id: response.sessionId,
		npcId: null,
		speaker: response.speaker,
		lines: response.lines,
		line: response.lines[0],
		lineIndex: 0,
		lineCount: response.lines.length,
		mode: shouldStartInChoice ? 'choice' : 'conversation',
		choices: response.actions.map((action) => ({
			id: action.id,
			label: localizeActionLabel(action.id, action.label, locale),
			intent: storyIntentToDialogueIntent(action.intent)
		})),
		completionIntent: response.completionIntent
			? storyIntentToDialogueIntent(response.completionIntent)
			: null,
		canClose: true
	};
}

export function storyIntentToDialogueIntent(intent: StoryIntent): DialogueIntent {
	switch (intent.type) {
		case 'showQuestList':
			return { type: 'showQuestList', giverNpcId: intent.giverNpcId };
		case 'openShop':
			return { type: 'openShop', shopId: intent.shopId };
		case 'recordNpcTalk':
			return { type: 'recordNpcTalk', npcId: intent.npcId };
		case 'close':
			return { type: 'close' };
	}
}

export function toStoryLocale(_locale: Locale): StoryLocale {
	return 'en';
}

function localizeActionLabel(actionId: string, fallback: string, locale: Locale): string {
	const key = `content.dialogue.actions.${actionId}` as Parameters<typeof t>[1];
	const localized = t(locale, key);
	return localized.startsWith('[') ? fallback : localized;
}

function normalizeStoryDialogueRequest(request: StoryDialogueRequest): StoryRuntimeDialogueRequest {
	return {
		...request,
		locale: toStoryLocale(request.locale)
	};
}

export async function getNpcStoryDialogue(request: StoryDialogueRequest): Promise<DialogueSession> {
	if (import.meta.env.VITE_STORY_RUNTIME === 'tauri') {
		const { invoke } = await import('@tauri-apps/api/core');
		return getNpcStoryDialogueWithRuntime(request, { mode: 'tauri', invoke });
	} else {
		const fixture = await import('$lib/game/story/browser-fixture');
		return getNpcStoryDialogueWithRuntime(request, { mode: 'browser', fixture });
	}
}

export async function getNpcStoryDialogueWithRuntime(
	request: StoryDialogueRequest,
	runtime: StoryRuntime
): Promise<DialogueSession> {
	const storyRequest = normalizeStoryDialogueRequest(request);
	const response =
		runtime.mode === 'tauri'
			? await runtime.invoke<StoryDialogueResponse>('get_npc_dialogue', {
					request: storyRequest
				})
			: runtime.fixture.getBrowserNpcDialogue(storyRequest);

	return createDialogueSessionFromStory(response, request.locale);
}

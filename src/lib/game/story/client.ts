import {
	createDialogueSession,
	type DialogueIntent,
	type DialogueSession
} from '$lib/game/core/dialogue';
import type { StoryProgress } from '$lib/game/core/quests';
import type { Locale } from '$lib/game/i18n/locales';
import { t } from '$lib/game/i18n/translate';

export type StoryLocale = 'en';

export type StoryLine = { speaker: string; text: string };

export type StoryIntent = { type: 'openShop'; shopId: string } | { type: 'close' };

export type StoryAction = { id: string; label: string; intent: StoryIntent };

/** The quest runtime's position, as the story pipeline matches branches on it. */
export type StoryProgressRequest = {
	questId: string | null;
	objectiveId: string | null;
};

export type StoryDialogueRequest = {
	npcId: string;
	mapId: string;
	locale: StoryLocale;
	progress: StoryProgressRequest;
};

export type StoryDialogueResponse = {
	sessionId: string;
	lines: StoryLine[];
	actions: StoryAction[];
};

export type StorySceneRequest = {
	sceneId: string;
	locale: StoryLocale;
};

export type StorySceneResponse = {
	sessionId: string;
	lines: StoryLine[];
};

export type StoryRuntime =
	| {
			mode: 'tauri';
			invoke: <T>(command: string, args: Record<string, unknown>) => Promise<T>;
	  }
	| {
			mode: 'browser';
			fixture: {
				getBrowserNpcDialogue(request: StoryDialogueRequest): StoryDialogueResponse;
				getBrowserStoryScene(request: StorySceneRequest): StorySceneResponse;
			};
	  };

export function toStoryLocale(_locale: Locale): StoryLocale {
	return 'en';
}

export function createDialogueSessionFromStory(
	response: StoryDialogueResponse,
	npcId: string,
	locale: Locale
): DialogueSession {
	if (response.lines.length === 0) {
		throw new Error('Story dialogue response must include at least one line.');
	}

	return createDialogueSession({
		id: response.sessionId,
		npcId,
		lines: response.lines,
		choices: response.actions.map((action) => ({
			id: action.id,
			label: localizeActionLabel(action.id, action.label, locale),
			intent: storyIntentToDialogueIntent(action.intent)
		}))
	});
}

export function createSceneSessionFromStory(response: StorySceneResponse): DialogueSession {
	if (response.lines.length === 0) {
		throw new Error('Story scene response must include at least one line.');
	}

	return createDialogueSession({ id: response.sessionId, lines: response.lines, mode: 'system' });
}

export function storyIntentToDialogueIntent(intent: StoryIntent): DialogueIntent {
	return intent.type === 'openShop' ? { type: 'openShop', shopId: intent.shopId } : intent;
}

function localizeActionLabel(actionId: string, fallback: string, locale: Locale): string {
	const key = `content.dialogue.actions.${actionId}` as Parameters<typeof t>[1];
	const localized = t(locale, key);
	return localized.startsWith('[') ? fallback : localized;
}

async function resolveStoryRuntime(): Promise<StoryRuntime> {
	if (import.meta.env.VITE_STORY_RUNTIME === 'tauri') {
		const { invoke } = await import('@tauri-apps/api/core');
		return { mode: 'tauri', invoke };
	}
	const fixture = await import('$lib/game/story/browser-fixture');
	return { mode: 'browser', fixture };
}

export async function getNpcStoryDialogue(request: {
	npcId: string;
	mapId: string;
	locale: Locale;
	progress: StoryProgress;
}): Promise<DialogueSession> {
	return getNpcStoryDialogueWithRuntime(request, await resolveStoryRuntime());
}

export async function getNpcStoryDialogueWithRuntime(
	request: { npcId: string; mapId: string; locale: Locale; progress: StoryProgress },
	runtime: StoryRuntime
): Promise<DialogueSession> {
	const storyRequest: StoryDialogueRequest = {
		npcId: request.npcId,
		mapId: request.mapId,
		locale: toStoryLocale(request.locale),
		progress: { questId: request.progress.questId, objectiveId: request.progress.objectiveId }
	};
	const response =
		runtime.mode === 'tauri'
			? await runtime.invoke<StoryDialogueResponse>('get_npc_dialogue', { request: storyRequest })
			: runtime.fixture.getBrowserNpcDialogue(storyRequest);

	return createDialogueSessionFromStory(response, request.npcId, request.locale);
}

export async function getStoryScene(request: {
	sceneId: string;
	locale: Locale;
}): Promise<DialogueSession> {
	return getStorySceneWithRuntime(request, await resolveStoryRuntime());
}

export async function getStorySceneWithRuntime(
	request: { sceneId: string; locale: Locale },
	runtime: StoryRuntime
): Promise<DialogueSession> {
	const storyRequest: StorySceneRequest = {
		sceneId: request.sceneId,
		locale: toStoryLocale(request.locale)
	};
	const response =
		runtime.mode === 'tauri'
			? await runtime.invoke<StorySceneResponse>('get_story_scene', { request: storyRequest })
			: runtime.fixture.getBrowserStoryScene(storyRequest);

	return createSceneSessionFromStory(response);
}

// Browser-only fixture for Vite dev and Playwright. Tauri release builds use
// VITE_STORY_RUNTIME=tauri and must tree-shake this module, because the catalog
// below is the compiled story prose (written by `bun run story:check`).
import catalogJson from '$lib/game/story/browser-catalog.generated.json';
import type {
	StoryAction,
	StoryDialogueRequest,
	StoryDialogueResponse,
	StoryLine,
	StorySceneRequest,
	StorySceneResponse
} from '$lib/game/story/client';

type StoryBranchCondition =
	| { type: 'always' }
	| { type: 'quest'; id: string }
	| { type: 'objective'; id: string };

export type BrowserStoryCatalog = {
	packageId: string;
	defaultLocale: string;
	npcDialogues: Array<{
		npcId: string;
		mapId: string;
		branches: Array<{
			beatId: string;
			condition: StoryBranchCondition;
			lines: StoryLine[];
			actions: StoryAction[];
		}>;
	}>;
	scenes: Array<{ id: string; beatId: string; lines: StoryLine[] }>;
};

export const browserStoryCatalog = catalogJson as BrowserStoryCatalog;

// Mirrors `select_branch` in src-tauri/src/story/commands.rs: the current
// objective wins over the current quest, which wins over `always`.
export function getBrowserNpcDialogue(
	request: StoryDialogueRequest,
	catalog: BrowserStoryCatalog = browserStoryCatalog
): StoryDialogueResponse {
	assertLocale(catalog, request.locale);
	const dialogue = catalog.npcDialogues.find((candidate) => candidate.npcId === request.npcId);
	if (!dialogue) throw new Error(`unknown story npc: ${request.npcId}`);
	if (dialogue.mapId !== request.mapId) {
		throw new Error(`story npc ${request.npcId} is not available on map ${request.mapId}`);
	}

	const { questId, objectiveId } = request.progress;
	const find = (matches: (condition: StoryBranchCondition) => boolean) =>
		dialogue.branches.find((branch) => matches(branch.condition));
	const branch =
		(objectiveId !== null
			? find((condition) => condition.type === 'objective' && condition.id === objectiveId)
			: undefined) ??
		(questId !== null
			? find((condition) => condition.type === 'quest' && condition.id === questId)
			: undefined) ??
		find((condition) => condition.type === 'always');
	if (!branch) throw new Error(`no story dialogue branch for npc: ${request.npcId}`);

	return {
		sessionId: `npc:${request.npcId}:${conditionKey(branch.condition)}`,
		lines: branch.lines,
		actions: branch.actions
	};
}

export function getBrowserStoryScene(
	request: StorySceneRequest,
	catalog: BrowserStoryCatalog = browserStoryCatalog
): StorySceneResponse {
	assertLocale(catalog, request.locale);
	const scene = catalog.scenes.find((candidate) => candidate.id === request.sceneId);
	if (!scene) throw new Error(`unknown story scene: ${request.sceneId}`);

	return { sessionId: `scene:${scene.id}`, lines: scene.lines };
}

function assertLocale(catalog: BrowserStoryCatalog, locale: string) {
	if (locale !== catalog.defaultLocale) throw new Error(`unsupported story locale: ${locale}`);
}

function conditionKey(condition: StoryBranchCondition): string {
	return condition.type === 'always' ? 'always' : `${condition.type}:${condition.id}`;
}

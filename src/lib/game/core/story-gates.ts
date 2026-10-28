import type { StoryGated, StoryWindow, WorldMapDefinition } from '$lib/game/content/maps/types';
import type { StoryProgress } from '$lib/game/core/quests';

// Map collections whose entries may carry `activeDuring` / `hiddenDuring`.
const gatedFields = [
	'npcs',
	'ambientNpcs',
	'encounters',
	'pickups',
	'discoveries',
	'transitions',
	'blockers',
	'mapDecor',
	'tileOverlays'
] as const satisfies readonly (keyof WorldMapDefinition)[];

type GatedEntry = StoryGated & { id: string };

const gatedMapCache = new WeakMap<WorldMapDefinition, Map<string, WorldMapDefinition>>();

export function isActiveInStory(entry: StoryGated, progress: StoryProgress): boolean {
	if (entry.activeDuring && !isInWindow(entry.activeDuring, progress)) return false;
	if (entry.hiddenDuring && isInWindow(entry.hiddenDuring, progress)) return false;
	return true;
}

/**
 * The map as it stands at this point of the story: gated NPCs, encounters,
 * blockers, and the rest drop out while their window is closed. Results are
 * cached per source map and story position, so per-frame callers stay cheap.
 *
 * Interiors with a generated navigation grid bake their blockers into the grid,
 * so story-gated blockers only take effect on maps without one (the ruins).
 * Text-grid maps change terrain through story-gated `tileOverlays` instead.
 */
export function applyStoryGates(
	map: WorldMapDefinition,
	progress: StoryProgress
): WorldMapDefinition {
	const key = progressKey(progress);
	let byProgress = gatedMapCache.get(map);
	if (!byProgress) {
		byProgress = new Map();
		gatedMapCache.set(map, byProgress);
	}
	const cached = byProgress.get(key);
	if (cached) return cached;

	const gated: WorldMapDefinition = { ...map };
	for (const field of gatedFields) {
		const entries = map[field] as GatedEntry[] | undefined;
		if (entries) {
			(gated as unknown as Record<string, unknown>)[field] = entries.filter((entry) =>
				isActiveInStory(entry, progress)
			);
		}
	}
	byProgress.set(key, gated);
	return gated;
}

/** Identifies which gated entries are live, so the world can tell when to re-render. */
export function storyGateSignature(map: WorldMapDefinition, progress: StoryProgress): string {
	return gatedFields
		.flatMap((field) =>
			((map[field] as GatedEntry[] | undefined) ?? [])
				.filter(
					(entry) => (entry.activeDuring || entry.hiddenDuring) && isActiveInStory(entry, progress)
				)
				.map((entry) => `${field}:${entry.id}`)
		)
		.join('|');
}

function isInWindow(window: StoryWindow, progress: StoryProgress): boolean {
	return (
		(window.quests?.includes(progress.questId) ?? false) ||
		(progress.objectiveId !== null && (window.objectives?.includes(progress.objectiveId) ?? false))
	);
}

function progressKey(progress: StoryProgress): string {
	return `${progress.questId}:${progress.objectiveId ?? ''}`;
}

import { storyWindows } from '$lib/game/content/quests';
import type { StoryProgress } from '$lib/game/core/quests';
import { isActiveInStory } from '$lib/game/core/story-gates';

/**
 * A colour grade for the whole field view: a 4×5 colour matrix, row by row
 * (r, g, b, a), each row `[r, g, b, a, offset]` with the offset in 0–255.
 */
export type LightGrade = readonly number[];

/** Dusk to night: darker, cooler, and less saturated, with the blues kept. */
export const eveningLight: LightGrade = [
	0.5, 0.08, 0.04, 0, 0, 0.04, 0.58, 0.1, 0, 0, 0.06, 0.14, 0.82, 0, 14, 0, 0, 0, 1, 0
];

/** The raid's burning morning: smoke over everything, a red-orange cast from the fires. */
export const raidLight: LightGrade = [
	0.98, 0.14, 0.02, 0, 8, 0.08, 0.7, 0.04, 0, 0, 0.04, 0.1, 0.52, 0, 0, 0, 0, 0, 1, 0
];

/**
 * The light over a map at this point of the story, or null for plain daylight.
 * Only the overworld changes: interiors and the tunnel are lit as painted.
 */
export function lightingFor(mapId: string, progress: StoryProgress): LightGrade | null {
	if (mapId !== 'overworld') return null;
	if (isActiveInStory({ activeDuring: storyWindows.afterRaid }, progress)) return raidLight;
	if (isActiveInStory({ activeDuring: storyWindows.evening }, progress)) return eveningLight;
	return null;
}

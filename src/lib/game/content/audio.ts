import { storyWindows } from '$lib/game/content/quests';
import type { StoryProgress } from '$lib/game/core/quests';
import { isActiveInStory } from '$lib/game/core/story-gates';

/** One-shot sound effects, generated with ElevenLabs (see `public/game/audio/`). */
export const sfxKeys = [
	'ui-select',
	'hero-swing',
	'hit',
	'hero-hurt',
	'enemy-defeat',
	'battle-start',
	'victory',
	'defeat',
	'pickup',
	'coins',
	'heal',
	'door',
	'save',
	'quest-complete',
	'boss-roar',
	'war-horn',
	'flee'
] as const;

/** Seamless background loops; at most one plays at a time. */
export const ambienceKeys = ['amb-village', 'amb-raid', 'amb-tunnel'] as const;

export type SfxKey = (typeof sfxKeys)[number];
export type AmbienceKey = (typeof ambienceKeys)[number];

export const audioAssetPath = (key: SfxKey | AmbienceKey) => `/game/audio/${key}.mp3`;

/** Story scenes that open with a sound cue. */
export const sceneSfx: Partial<Record<string, SfxKey>> = {
	'prologue.raid-wakes': 'war-horn'
};

/**
 * The loop for a map at this point of the story: the tunnel underground, the
 * burning village everywhere else once the raid starts (Grik wakes to it
 * indoors), and a calm day outdoors; quiet indoors before the raid and on the
 * evening of the proving day.
 */
export function ambienceFor(mapId: string, progress: StoryProgress): AmbienceKey | null {
	if (mapId.startsWith('ruins-')) return 'amb-tunnel';
	if (isActiveInStory({ activeDuring: storyWindows.afterRaid }, progress)) return 'amb-raid';
	const daytime = { activeDuring: storyWindows.dayOne, hiddenDuring: storyWindows.evening };
	if (mapId === 'meadow-entry' && isActiveInStory(daytime, progress)) return 'amb-village';
	return null;
}

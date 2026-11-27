import type { StoryGated } from '$lib/game/content/maps/types';
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

/**
 * Background music, generated with ElevenLabs Music (see `docs/audio/bgm-sources.md`).
 * Each file is one seamless loop; at most one track plays at a time.
 */
export const musicKeys = [
	'bgm-title',
	'bgm-day',
	'bgm-hearth',
	'bgm-raid',
	'bgm-tunnel',
	'bgm-battle',
	'bgm-boss'
] as const;

export type SfxKey = (typeof sfxKeys)[number];
export type AmbienceKey = (typeof ambienceKeys)[number];
export type MusicKey = (typeof musicKeys)[number];

export const audioAssetPath = (key: SfxKey | AmbienceKey | MusicKey) => `/game/audio/${key}.mp3`;

/** Story scenes that open with a sound cue. */
export const sceneSfx: Partial<Record<string, SfxKey>> = {
	'prologue.raid-wakes': 'war-horn'
};

/** Story scenes that change the music; it plays on until the next map or fight. */
export const sceneMusic: Partial<Record<string, MusicKey>> = {
	'prologue.chapter-one': 'bgm-title'
};

/** The escape once the tunnel seals behind Grik: the tunnel, the climb, and the vow. */
const escape: StoryGated = {
	activeDuring: { quests: ['prologue-escape'] },
	hiddenDuring: { objectives: ['wake-in-the-shrine'] }
};

/**
 * The field track for a map at this point of the story. The music follows the
 * story, indoors and out: the hunter's day, the hearth in the evening, the raid,
 * and the tunnel for the ruins and the escape that ends with the vow.
 */
export function musicFor(mapId: string, progress: StoryProgress): MusicKey {
	if (mapId.startsWith('ruins-') || isActiveInStory(escape, progress)) return 'bgm-tunnel';
	if (isActiveInStory({ activeDuring: storyWindows.afterRaid }, progress)) return 'bgm-raid';
	if (isActiveInStory({ activeDuring: storyWindows.evening }, progress)) return 'bgm-hearth';
	return 'bgm-day';
}

/**
 * The fight track: the boss theme for the boar king, the battle theme otherwise.
 * The Sun Crest captain is built like a boss but is the raid's scripted loss, so
 * it keeps the battle theme.
 */
export const battleMusicFor = (enemyId: string): MusicKey =>
	enemyId === 'boar-king' ? 'bgm-boss' : 'bgm-battle';

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
	if (mapId === 'overworld' && isActiveInStory(daytime, progress)) return 'amb-village';
	return null;
}

import type * as Phaser from 'phaser';
import {
	ambienceKeys,
	audioAssetPath,
	musicKeys,
	sfxKeys,
	type AmbienceKey,
	type MusicKey,
	type SfxKey
} from '$lib/game/content/audio';

const sfxVolume = 0.6;
// A quiet bed under the music: texture, not a second soundtrack.
const ambienceVolume = 0.25;
export const musicVolume = 0.45;
/** How long a track takes to fade in, and the old one to fade out, when the music changes. */
export const musicFadeMs = 1_200;

type Sound = ReturnType<Phaser.Sound.BaseSoundManager['add']> & { volume: number };

// The sound manager is game-wide, so the active loops outlive scene restarts.
let ambience: { key: AmbienceKey; sound: Sound } | null = null;
let music: { key: MusicKey; sound: Sound } | null = null;
/** Tracks fading out after a change; each is destroyed once silent. */
let fadingOut: Sound[] = [];
/**
 * The game whose step event drives the fades. Scene tweens would die with the
 * scene that started them (a fight or a map change restarts it mid-fade).
 */
let fadeClock: Phaser.Game | null = null;

export function preloadAudio(load: Phaser.Loader.LoaderPlugin) {
	for (const key of [...sfxKeys, ...ambienceKeys, ...musicKeys]) {
		load.audio(key, audioAssetPath(key));
	}
}

/** Plays a one-shot effect; a no-op when audio is unavailable or not loaded. */
export function playSfx(scene: Phaser.Scene, key: SfxKey) {
	if (!scene.sound || !scene.cache?.audio?.exists(key)) return;
	scene.sound.play(key, { volume: sfxVolume });
}

/** Switches the background loop, leaving it running when the key is unchanged. */
export function setAmbience(scene: Phaser.Scene, key: AmbienceKey | null) {
	if (ambience?.key === key) return;
	ambience?.sound.destroy();
	ambience = null;
	if (!key || !scene.sound || !scene.cache?.audio?.exists(key)) return;
	const sound = scene.sound.add(key, { loop: true, volume: ambienceVolume }) as Sound;
	sound.play();
	ambience = { key, sound };
}

/**
 * Crossfades to a music track, leaving it running when the key is unchanged.
 * The old track fades out while the new one fades in from the start.
 */
export function setMusic(scene: Phaser.Scene, key: MusicKey) {
	if (music?.key === key) return;
	if (music) fadingOut.push(music.sound);
	music = null;
	if (!scene.sound || !scene.cache?.audio?.exists(key)) return;
	const sound = scene.sound.add(key, { loop: true, volume: 0 }) as Sound;
	sound.play();
	music = { key, sound };
	if (fadeClock !== scene.game) {
		fadeClock?.events.off('step', stepFades);
		fadeClock = scene.game;
		fadeClock.events.on('step', stepFades);
	}
}

function stepFades(_time: number, delta: number) {
	const change = (musicVolume * delta) / musicFadeMs;
	if (music && music.sound.volume < musicVolume) {
		music.sound.volume = Math.min(musicVolume, music.sound.volume + change);
	}
	fadingOut = fadingOut.filter((sound) => {
		sound.volume = Math.max(0, sound.volume - change);
		if (sound.volume > 0) return true;
		sound.destroy();
		return false;
	});
}

/** Stops every loop when the game is torn down; Phaser destroys its sound manager a frame later. */
export function resetAudio() {
	ambience?.sound.destroy();
	ambience = null;
	music?.sound.destroy();
	music = null;
	for (const sound of fadingOut) sound.destroy();
	fadingOut = [];
	fadeClock?.events.off('step', stepFades);
	fadeClock = null;
}

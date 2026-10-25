import type * as Phaser from 'phaser';
import {
	ambienceKeys,
	audioAssetPath,
	sfxKeys,
	type AmbienceKey,
	type SfxKey
} from '$lib/game/content/audio';

const sfxVolume = 0.6;
const ambienceVolume = 0.35;

// The sound manager is game-wide, so the active loop outlives scene restarts.
let ambience: { key: AmbienceKey; sound: Phaser.Sound.BaseSound } | null = null;

export function preloadAudio(load: Phaser.Loader.LoaderPlugin) {
	for (const key of [...sfxKeys, ...ambienceKeys]) {
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
	const sound = scene.sound.add(key, { loop: true, volume: ambienceVolume });
	sound.play();
	ambience = { key, sound };
}

/** Stops the loop when the game is torn down; Phaser destroys its sound manager a frame later. */
export function resetAmbience() {
	ambience?.sound.destroy();
	ambience = null;
}

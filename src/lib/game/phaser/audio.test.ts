import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import { playSfx, preloadAudio, resetAmbience, setAmbience } from './audio';
import { ambienceKeys, sfxKeys } from '$lib/game/content/audio';

function createScene(loaded = true) {
	const sounds: Array<{
		key: string;
		play: ReturnType<typeof vi.fn>;
		destroy: ReturnType<typeof vi.fn>;
	}> = [];
	const scene = {
		cache: { audio: { exists: vi.fn(() => loaded) } },
		sound: {
			play: vi.fn(),
			add: vi.fn((key: string) => {
				const sound = { key, play: vi.fn(), destroy: vi.fn() };
				sounds.push(sound);
				return sound;
			})
		}
	};
	return { scene: scene as unknown as Phaser.Scene, raw: scene, sounds };
}

describe('phaser audio', () => {
	afterEach(() => resetAmbience());

	it('preloads every effect and loop', () => {
		const load = { audio: vi.fn() };
		preloadAudio(load as unknown as Phaser.Loader.LoaderPlugin);

		expect(load.audio).toHaveBeenCalledTimes(sfxKeys.length + ambienceKeys.length);
		expect(load.audio).toHaveBeenCalledWith('hit', '/game/audio/hit.mp3');
	});

	it('plays a loaded effect and skips one that is not loaded', () => {
		const loaded = createScene();
		playSfx(loaded.scene, 'hit');
		expect(loaded.raw.sound.play).toHaveBeenCalledWith('hit', { volume: 0.6 });

		const missing = createScene(false);
		playSfx(missing.scene, 'hit');
		expect(missing.raw.sound.play).not.toHaveBeenCalled();
	});

	it('keeps one ambience loop, swapping only when the key changes', () => {
		const { scene, sounds } = createScene();

		setAmbience(scene, 'amb-village');
		setAmbience(scene, 'amb-village');
		expect(sounds).toHaveLength(1);
		expect(sounds[0].play).toHaveBeenCalledOnce();

		setAmbience(scene, 'amb-raid');
		expect(sounds[0].destroy).toHaveBeenCalledOnce();
		expect(sounds.map(({ key }) => key)).toEqual(['amb-village', 'amb-raid']);

		setAmbience(scene, null);
		expect(sounds[1].destroy).toHaveBeenCalledOnce();
	});
});

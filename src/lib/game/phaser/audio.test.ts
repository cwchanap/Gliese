import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import {
	musicFadeMs,
	musicVolume,
	playSfx,
	preloadAudio,
	resetAudio,
	setAmbience,
	setMusic
} from './audio';
import { ambienceKeys, musicKeys, sfxKeys } from '$lib/game/content/audio';

type FakeSound = {
	key: string;
	volume: number;
	play: ReturnType<typeof vi.fn>;
	destroy: ReturnType<typeof vi.fn>;
};

function createScene(loaded = true) {
	const sounds: FakeSound[] = [];
	const stepListeners = new Set<(time: number, delta: number) => void>();
	const scene = {
		cache: { audio: { exists: vi.fn(() => loaded) } },
		game: {
			events: {
				on: vi.fn((_event: string, listener: (time: number, delta: number) => void) =>
					stepListeners.add(listener)
				),
				off: vi.fn((_event: string, listener: (time: number, delta: number) => void) =>
					stepListeners.delete(listener)
				)
			}
		},
		sound: {
			play: vi.fn(),
			add: vi.fn((key: string, config: { volume: number }) => {
				const sound = { key, volume: config.volume, play: vi.fn(), destroy: vi.fn() };
				sounds.push(sound);
				return sound;
			})
		}
	};
	const step = (delta: number) => {
		for (const listener of stepListeners) listener(0, delta);
	};
	return { scene: scene as unknown as Phaser.Scene, raw: scene, sounds, step, stepListeners };
}

describe('phaser audio', () => {
	afterEach(() => resetAudio());

	it('preloads every effect, loop, and music track', () => {
		const load = { audio: vi.fn() };
		preloadAudio(load as unknown as Phaser.Loader.LoaderPlugin);

		expect(load.audio).toHaveBeenCalledTimes(
			sfxKeys.length + ambienceKeys.length + musicKeys.length
		);
		expect(load.audio).toHaveBeenCalledWith('hit', '/game/audio/hit.mp3');
		expect(load.audio).toHaveBeenCalledWith('bgm-day', '/game/audio/bgm-day.mp3');
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

	it('fades a new track in and keeps it when the key is unchanged', () => {
		const { scene, sounds, step } = createScene();

		setMusic(scene, 'bgm-day');
		setMusic(scene, 'bgm-day');
		expect(sounds).toHaveLength(1);
		expect(sounds[0].play).toHaveBeenCalledOnce();
		expect(sounds[0].volume).toBe(0);

		step(musicFadeMs / 2);
		expect(sounds[0].volume).toBeCloseTo(musicVolume / 2);
		step(musicFadeMs);
		expect(sounds[0].volume).toBe(musicVolume);
	});

	it('crossfades between tracks and destroys the old one once silent', () => {
		const { scene, sounds, step } = createScene();
		setMusic(scene, 'bgm-day');
		step(musicFadeMs);

		setMusic(scene, 'bgm-battle');
		step(musicFadeMs / 2);
		expect(sounds[0].volume).toBeCloseTo(musicVolume / 2);
		expect(sounds[1].volume).toBeCloseTo(musicVolume / 2);
		expect(sounds[0].destroy).not.toHaveBeenCalled();

		step(musicFadeMs / 2);
		expect(sounds[0].destroy).toHaveBeenCalledOnce();
		expect(sounds[1].volume).toBe(musicVolume);
	});

	it('stops every loop and the fade clock on reset', () => {
		const { scene, sounds, stepListeners } = createScene();
		setAmbience(scene, 'amb-tunnel');
		setMusic(scene, 'bgm-tunnel');
		setMusic(scene, 'bgm-title');

		resetAudio();

		expect(sounds.every((sound) => sound.destroy.mock.calls.length === 1)).toBe(true);
		expect(stepListeners.size).toBe(0);
	});
});

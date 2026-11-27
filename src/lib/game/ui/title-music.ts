import { audioAssetPath } from '$lib/game/content/audio';
import { musicFadeMs, musicVolume } from '$lib/game/phaser/audio';
import { preferences } from '$lib/game/i18n/store';

const gestureEvents = ['pointerdown', 'keydown'] as const;

/**
 * Loops the title theme while the Title screen is up. Phaser is not loaded yet,
 * so this is its own small Web Audio graph (gapless, like the in-game loops).
 * Browsers only let audio start after a click or key press, so a fresh page
 * waits for the first one instead of creating a context the browser would block.
 * Returns the stop function, which fades the theme out.
 */
export function playTitleMusic(): () => void {
	if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return () => {};
	let context: AudioContext | null = null;
	let gain: GainNode | null = null;
	let muted = false;
	let stopped = false;

	const unsubscribe = preferences.subscribe(({ sound }) => {
		muted = sound === 'off';
		gain?.gain.setValueAtTime(muted ? 0 : musicVolume, gain.context.currentTime);
	});

	const start = () => {
		if (context || stopped) return;
		removeGestureListeners();
		context = new AudioContext();
		gain = context.createGain();
		gain.gain.value = muted ? 0 : musicVolume;
		gain.connect(context.destination);
		const audio = context;
		void fetch(audioAssetPath('bgm-title'))
			.then((response) => response.arrayBuffer())
			.then((bytes) => audio.decodeAudioData(bytes))
			.then((buffer) => {
				if (stopped || !gain) return;
				const source = audio.createBufferSource();
				source.buffer = buffer;
				source.loop = true;
				source.connect(gain);
				source.start();
			})
			// No title music is not worth an error: the game plays on without it.
			.catch(() => {});
	};
	const removeGestureListeners = () => {
		for (const type of gestureEvents) window.removeEventListener(type, start, true);
	};

	if (navigator.userActivation?.hasBeenActive) {
		start();
	} else {
		for (const type of gestureEvents) window.addEventListener(type, start, true);
	}

	return () => {
		stopped = true;
		removeGestureListeners();
		unsubscribe();
		if (!context || !gain) return;
		const closing = context;
		gain.gain.setTargetAtTime(0, closing.currentTime, musicFadeMs / 4_000);
		setTimeout(() => void closing.close().catch(() => {}), musicFadeMs);
	};
}

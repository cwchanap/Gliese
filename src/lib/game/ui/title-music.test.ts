import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playTitleMusic } from './title-music';

class FakeAudioContext extends EventTarget {
	static created: FakeAudioContext[] = [];
	state: AudioContextState;
	currentTime = 0;
	destination = {};
	resume = vi.fn(async () => {
		if (!activation.isActive) return;
		this.state = 'running';
		this.dispatchEvent(new Event('statechange'));
	});
	close = vi.fn(async () => {});
	constructor() {
		super();
		this.state = activation.isActive ? 'running' : 'suspended';
		FakeAudioContext.created.push(this);
	}
	createGain() {
		return {
			gain: { value: 1, setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
			connect: vi.fn(),
			context: this
		};
	}
	decodeAudioData = vi.fn(async () => ({ duration: 48 }));
	createBufferSource() {
		return { buffer: null, loop: false, connect: vi.fn(), start: vi.fn() };
	}
}

const activation = { isActive: false, hasBeenActive: false };
const page = new EventTarget();

function press(type: 'keydown' | 'pointerdown', activates: boolean) {
	activation.isActive = activates;
	activation.hasBeenActive ||= activates;
	page.dispatchEvent(new Event(type));
	activation.isActive = false;
}

describe('playTitleMusic', () => {
	beforeEach(() => {
		FakeAudioContext.created = [];
		activation.isActive = false;
		activation.hasBeenActive = false;
		vi.stubGlobal('window', page);
		vi.stubGlobal('navigator', { userActivation: activation });
		vi.stubGlobal('AudioContext', FakeAudioContext);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) }))
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('waits for an input that grants activation before creating the context', () => {
		const stop = playTitleMusic();
		expect(FakeAudioContext.created).toHaveLength(0);

		press('keydown', false);
		expect(FakeAudioContext.created).toHaveLength(0);

		press('pointerdown', true);
		expect(FakeAudioContext.created).toHaveLength(1);
		expect(FakeAudioContext.created[0].state).toBe('running');
		expect(fetch).toHaveBeenCalledWith('/game/audio/bgm-title.mp3');
		stop();
	});

	it('resumes a blocked context on a later activation without fetching again', () => {
		// An engine without the activation API: every input tries to start.
		vi.stubGlobal('navigator', {});
		const stop = playTitleMusic();

		press('keydown', false);
		const [context] = FakeAudioContext.created;
		expect(context.state).toBe('suspended');

		press('pointerdown', true);
		expect(context.resume).toHaveBeenCalledOnce();
		expect(context.state).toBe('running');
		expect(FakeAudioContext.created).toHaveLength(1);
		expect(fetch).toHaveBeenCalledTimes(1);
		stop();
	});

	it('starts at once after an earlier activation and closes the context when stopped', () => {
		vi.useFakeTimers();
		activation.hasBeenActive = true;
		const stop = playTitleMusic();
		const [context] = FakeAudioContext.created;
		expect(context).toBeDefined();

		stop();
		vi.runAllTimers();
		expect(context.close).toHaveBeenCalledOnce();
		vi.useRealTimers();
	});
});

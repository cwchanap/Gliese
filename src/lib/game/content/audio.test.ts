import { describe, expect, it } from 'vitest';
import { ambienceFor, battleMusicFor, musicFor } from '$lib/game/content/audio';

const morning = { questId: 'prologue-proving-morning', objectiveId: null } as const;
const evening = { questId: 'prologue-hunters-name', objectiveId: 'hear-motts-tale' } as const;
const raid = { questId: 'prologue-raid', objectiveId: null } as const;
const shrine = { questId: 'prologue-escape', objectiveId: 'wake-in-the-shrine' } as const;
const ridge = { questId: 'prologue-escape', objectiveId: 'climb-to-the-ridge' } as const;
const finished = { questId: 'prologue-escape', objectiveId: null } as const;

describe('ambienceFor', () => {
	it('plays the calm village by day, silence at night, the fire after the raid, and the tunnel underground', () => {
		expect(ambienceFor('overworld', morning)).toBe('amb-village');
		expect(ambienceFor('hero-house', morning)).toBeNull();
		expect(ambienceFor('overworld', evening)).toBeNull();
		expect(ambienceFor('overworld', raid)).toBe('amb-raid');
		expect(ambienceFor('ruins-threshold', raid)).toBe('amb-tunnel');
	});
});

describe('musicFor', () => {
	it('follows the story indoors and out: the day, the hearth, then the raid', () => {
		expect(musicFor('overworld', morning)).toBe('bgm-day');
		expect(musicFor('hero-house', morning)).toBe('bgm-day');
		expect(musicFor('hero-house', evening)).toBe('bgm-hearth');
		expect(musicFor('overworld', evening)).toBe('bgm-hearth');
		expect(musicFor('overworld', raid)).toBe('bgm-raid');
		expect(musicFor('shrine-of-aurora-interior', shrine)).toBe('bgm-raid');
	});

	it('plays the tunnel in the ruins and for the escape up to the vow', () => {
		expect(musicFor('ruins-threshold', morning)).toBe('bgm-tunnel');
		expect(musicFor('ruins-core', ridge)).toBe('bgm-tunnel');
		expect(musicFor('overworld', ridge)).toBe('bgm-tunnel');
		expect(musicFor('overworld', finished)).toBe('bgm-tunnel');
	});
});

describe('battleMusicFor', () => {
	it('plays the boss theme only for the boar king', () => {
		expect(battleMusicFor('forest-wolf')).toBe('bgm-battle');
		expect(battleMusicFor('human-soldier')).toBe('bgm-battle');
		expect(battleMusicFor('sun-crest-captain')).toBe('bgm-battle');
		expect(battleMusicFor('boar-king')).toBe('bgm-boss');
	});
});

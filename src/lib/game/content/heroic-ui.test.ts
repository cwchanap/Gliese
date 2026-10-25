import { describe, expect, it } from 'vitest';
import { getDialogueBustPath } from './heroic-ui';

describe('getDialogueBustPath', () => {
	it('maps every placement of a family member to that member’s bust', () => {
		for (const borak of ['borak', 'borak-home', 'borak-gate']) {
			expect(getDialogueBustPath(borak)).toBe('/game/assets/heroic-ui/busts/borak.png');
		}
		expect(getDialogueBustPath('drogg-well')).toBe('/game/assets/heroic-ui/busts/drogg.png');
		expect(getDialogueBustPath('mott-shrine')).toBe('/game/assets/heroic-ui/busts/mott.png');
		expect(getDialogueBustPath('tikka-home')).toBe('/game/assets/heroic-ui/busts/tikka.png');
		expect(getDialogueBustPath('lirra-forest')).toBe('/game/assets/heroic-ui/busts/lirra.png');
	});

	it('returns null for unsupported NPCs and null ids (never speaker-string matching)', () => {
		expect(getDialogueBustPath('villager-lynn')).toBeNull();
		expect(getDialogueBustPath('Borak')).toBeNull();
		expect(getDialogueBustPath(null)).toBeNull();
	});
});

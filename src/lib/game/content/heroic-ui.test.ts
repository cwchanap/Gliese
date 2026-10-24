import { describe, expect, it } from 'vitest';
import { getDialogueBustPath } from './heroic-ui';

describe('getDialogueBustPath', () => {
	it('maps each supported dialogue id to one neutral bust', () => {
		expect(getDialogueBustPath('mira')).toBe('/game/assets/heroic-ui/busts/mira.png');
		expect(getDialogueBustPath('lodge-keeper')).toBe(
			'/game/assets/heroic-ui/busts/quartermaster-vale.png'
		);
		expect(getDialogueBustPath('oren')).toBe('/game/assets/heroic-ui/busts/blacksmith-oren.png');
		for (const borak of ['borak', 'borak-home', 'borak-gate']) {
			expect(getDialogueBustPath(borak)).toBe(
				'/game/assets/heroic-ui/busts/guild-master-arlen.png'
			);
		}
	});

	it('returns null for unsupported NPCs and null ids (never speaker-string matching)', () => {
		expect(getDialogueBustPath('villager-lynn')).toBeNull();
		expect(getDialogueBustPath('Mira')).toBeNull();
		expect(getDialogueBustPath(null)).toBeNull();
	});
});

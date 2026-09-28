import { describe, expect, it } from 'vitest';
import { getDialogueBustPath } from './heroic-ui';

describe('getDialogueBustPath', () => {
	it('maps each supported stable NPC id to one neutral bust', () => {
		expect(getDialogueBustPath('shopkeeper-mira')).toBe('/game/assets/heroic-ui/busts/mira.png');
		expect(getDialogueBustPath('guild-quartermaster')).toBe(
			'/game/assets/heroic-ui/busts/quartermaster-vale.png'
		);
		expect(getDialogueBustPath('blacksmith-oren')).toBe(
			'/game/assets/heroic-ui/busts/blacksmith-oren.png'
		);
		expect(getDialogueBustPath('guild-master')).toBe(
			'/game/assets/heroic-ui/busts/guild-master-arlen.png'
		);
		expect(getDialogueBustPath('liam')).toBe('/game/assets/heroic-ui/busts/liam.png');
	});

	it('returns null for unsupported NPCs and null ids (never speaker-string matching)', () => {
		expect(getDialogueBustPath('villager-lynn')).toBeNull();
		expect(getDialogueBustPath('Mira')).toBeNull();
		expect(getDialogueBustPath(null)).toBeNull();
	});
});

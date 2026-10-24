import { describe, expect, it } from 'vitest';

import {
	advanceDialogue,
	buildDialogueFallback,
	chooseDialogueOption,
	createDialogueSession
} from '$lib/game/core/dialogue';

const shopChoice = {
	id: 'shop',
	label: 'Shop',
	intent: { type: 'openShop', shopId: 'miras-item-shop' }
} as const;

describe('dialogue core', () => {
	it('opens on the first line with that line speaker', () => {
		const session = createDialogueSession({
			id: 'npc:borak:objective:report-to-borak',
			npcId: 'borak',
			lines: [
				{ speaker: 'Borak', text: 'Grik. You came.' },
				{ speaker: 'Drogg', text: 'A very small boar.' }
			]
		});

		expect(session).toMatchObject({
			npcId: 'borak',
			speaker: 'Borak',
			line: 'Grik. You came.',
			lineIndex: 0,
			lineCount: 2,
			mode: 'conversation',
			choices: [],
			canClose: true
		});
	});

	it('advances line by line, switching speakers, and exposes choices at the end', () => {
		let session = createDialogueSession({
			id: 'npc:mira:always',
			npcId: 'mira',
			lines: [
				{ speaker: 'Mira', text: 'Herbs?' },
				{ speaker: 'Grik', text: 'Please.' }
			],
			choices: [shopChoice]
		});

		session = advanceDialogue(session);
		expect(session).toMatchObject({ speaker: 'Grik', line: 'Please.', mode: 'conversation' });

		session = advanceDialogue(session);
		expect(session).toMatchObject({ line: 'Please.', mode: 'choice' });
	});

	it('starts single-line dialogue with choices in choice mode', () => {
		const session = createDialogueSession({
			id: 'npc:mira:always',
			lines: [{ speaker: 'Mira', text: 'Herbs?' }],
			choices: [shopChoice]
		});

		expect(session.mode).toBe('choice');
	});

	it('keeps scenes in system mode while they advance', () => {
		let session = createDialogueSession({
			id: 'scene:prologue.opening',
			lines: [
				{ speaker: '', text: 'Morning light.' },
				{ speaker: 'Tikka', text: 'Get up!' }
			],
			mode: 'system'
		});

		session = advanceDialogue(session);
		expect(session).toMatchObject({ npcId: null, speaker: 'Tikka', mode: 'system' });
	});

	it('returns the chosen intent and closes the session', () => {
		const session = createDialogueSession({
			id: 'npc:mira:always',
			lines: [{ speaker: 'Mira', text: 'Herbs?' }],
			choices: [shopChoice]
		});

		expect(chooseDialogueOption({ session, choiceId: 'shop', fallbackLine: 'Gone.' })).toEqual({
			session: null,
			intent: shopChoice.intent
		});
	});

	it('falls back to a system line when the choice no longer exists', () => {
		const session = createDialogueSession({
			id: 'npc:mira:always',
			lines: [{ speaker: 'Mira', text: 'Herbs?' }],
			choices: [shopChoice]
		});

		const result = chooseDialogueOption({ session, choiceId: 'missing', fallbackLine: 'Gone.' });

		expect(result.intent).toBeNull();
		expect(result.session).toEqual(buildDialogueFallback('Mira', 'Gone.'));
		expect(result.session).toMatchObject({ speaker: 'Mira', line: 'Gone.', mode: 'system' });
	});
});

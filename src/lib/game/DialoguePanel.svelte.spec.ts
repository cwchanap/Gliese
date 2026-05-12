import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import DialoguePanel from '$lib/game/DialoguePanel.svelte';
import type { HudDialogueState } from '$lib/game/ui-bridge/events';

const dialogue: HudDialogueState = {
	id: 'npc:guild-master',
	speaker: 'Guild Master Arlen',
	line: 'Choose the Guild work you want to review.',
	lineIndex: 0,
	lineCount: 1,
	mode: 'choice',
	canClose: true,
	choices: [
		{ id: 'quest:thin-village-slimes', label: 'Thin Village Slimes' },
		{ id: 'close', label: 'Close' }
	]
};

const conversationDialogue: HudDialogueState = {
	...dialogue,
	line: 'The Guild has work for a steady blade.',
	mode: 'conversation',
	choices: []
};

function renderDialogue(overrides: Partial<HudDialogueState> = {}) {
	const onadvance = vi.fn();
	const onclose = vi.fn();
	const onchoose = vi.fn();
	render(DialoguePanel, {
		props: {
			dialogue: { ...dialogue, ...overrides },
			onadvance,
			onclose,
			onchoose
		}
	});

	return { onadvance, onclose, onchoose };
}

describe('DialoguePanel.svelte', () => {
	it('renders speaker text and choices', async () => {
		renderDialogue();

		await expect.element(page.getByRole('dialog', { name: 'Guild Master Arlen' })).toBeVisible();
		await expect.element(page.getByText('Choose the Guild work you want to review.')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Thin Village Slimes' })).toBeVisible();
	});

	it('emits choose and close callbacks', async () => {
		const { onchoose, onclose } = renderDialogue();

		await page.getByRole('button', { name: 'Thin Village Slimes' }).click();
		await page.getByRole('button', { name: 'Close' }).first().click();

		expect(onchoose).toHaveBeenCalledWith('quest:thin-village-slimes');
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('focuses the panel on render and advances conversation dialogue with Enter', async () => {
		const { onadvance, onclose, onchoose } = renderDialogue(conversationDialogue);
		const panel = page.getByRole('dialog', { name: 'Guild Master Arlen' });

		await expect.element(panel).toHaveFocus();
		await userEvent.keyboard('{Enter}');

		expect(onadvance).toHaveBeenCalledOnce();
		expect(onclose).not.toHaveBeenCalled();
		expect(onchoose).not.toHaveBeenCalled();
	});

	it('closes with Escape when the panel has focus', async () => {
		const { onclose } = renderDialogue();

		await expect.element(page.getByRole('dialog', { name: 'Guild Master Arlen' })).toHaveFocus();
		await userEvent.keyboard('{Escape}');

		expect(onclose).toHaveBeenCalledOnce();
	});

	it.each([
		['Enter', '{Enter}'],
		['Space', '{Space}']
	])('selects the focused second choice with %s without leaking keydown to the window', async (_label, key) => {
		const { onchoose } = renderDialogue();
		const onWindowKeydown = vi.fn();
		const secondChoice = page.getByRole('button', { name: 'Close' }).last();

		window.addEventListener('keydown', onWindowKeydown);
		try {
			secondChoice.element().focus();
			await expect.element(secondChoice).toHaveFocus();
			await userEvent.keyboard(key);

			expect(onchoose).toHaveBeenCalledOnce();
			expect(onchoose).toHaveBeenCalledWith('close');
			expect(onchoose).not.toHaveBeenCalledWith('quest:thin-village-slimes');
			expect(onWindowKeydown).not.toHaveBeenCalled();
		} finally {
			window.removeEventListener('keydown', onWindowKeydown);
		}
	});

	it('exposes the close choice by visible accessible name and emits its choice id', async () => {
		const { onchoose } = renderDialogue();
		const closeChoices = page.getByRole('button', { name: 'Close' });

		expect(closeChoices.elements()).toHaveLength(2);
		await closeChoices.last().click();

		expect(onchoose).toHaveBeenCalledOnce();
		expect(onchoose).toHaveBeenCalledWith('close');
	});
});

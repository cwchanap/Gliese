import { page } from 'vitest/browser';
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

describe('DialoguePanel.svelte', () => {
	it('renders speaker text and choices', async () => {
		render(DialoguePanel, {
			props: {
				dialogue,
				onadvance: vi.fn(),
				onclose: vi.fn(),
				onchoose: vi.fn()
			}
		});

		await expect.element(page.getByRole('dialog', { name: 'Guild Master Arlen' })).toBeVisible();
		await expect.element(page.getByText('Choose the Guild work you want to review.')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Thin Village Slimes' })).toBeVisible();
	});

	it('emits choose and close callbacks', async () => {
		const onchoose = vi.fn();
		const onclose = vi.fn();
		render(DialoguePanel, {
			props: {
				dialogue,
				onadvance: vi.fn(),
				onclose,
				onchoose
			}
		});

		await page.getByRole('button', { name: 'Thin Village Slimes' }).click();
		await page.getByRole('button', { name: 'Close' }).click();

		expect(onchoose).toHaveBeenCalledWith('quest:thin-village-slimes');
		expect(onclose).toHaveBeenCalledOnce();
	});
});

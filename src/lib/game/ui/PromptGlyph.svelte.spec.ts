import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../../app.css';
import PromptGlyph from '$lib/game/ui/PromptGlyph.svelte';

function renderGlyph(mode: 'auto' | 'pad' | 'keys') {
	return render(PromptGlyph, { props: { mode, keys: 'Enter', pad: 'Ⓐ' } });
}

describe('PromptGlyph', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('renders the keyboard glyph in keys mode', async () => {
		renderGlyph('keys');

		const glyph = page.getByText('Enter');
		await expect.element(glyph).toHaveAttribute('data-prompt', 'keys');
	});

	it('renders the gamepad glyph in pad mode', async () => {
		renderGlyph('pad');

		const glyph = page.getByText('Ⓐ');
		await expect.element(glyph).toHaveAttribute('data-prompt', 'pad');
	});

	it('auto resolves to the keyboard glyph when no gamepad is connected', async () => {
		renderGlyph('auto');

		const glyph = page.getByText('Enter');
		await expect.element(glyph).toHaveAttribute('data-prompt', 'keys');
	});

	it('auto resolves to the gamepad glyph when a gamepad is connected', async () => {
		const getGamepads = vi.fn(() => [{ id: 'test-pad' }] as unknown as Gamepad[]);
		vi.stubGlobal('navigator', { getGamepads });

		renderGlyph('auto');

		const glyph = page.getByText('Ⓐ');
		await expect.element(glyph).toHaveAttribute('data-prompt', 'pad');
	});
});

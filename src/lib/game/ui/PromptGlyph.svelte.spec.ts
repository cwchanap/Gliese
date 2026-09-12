import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../../app.css';
import PromptGlyph from '$lib/game/ui/PromptGlyph.svelte';
import { setLastInputModality } from '$lib/game/core/gamepad';

function renderGlyph(mode: 'auto' | 'pad' | 'keys') {
	return render(PromptGlyph, { props: { mode, keys: 'Enter', pad: 'Ⓐ' } });
}

describe('PromptGlyph', () => {
	afterEach(() => {
		setLastInputModality('keys');
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

	it('auto resolves to the keyboard glyph before any pad input', async () => {
		renderGlyph('auto');

		const glyph = page.getByText('Enter');
		await expect.element(glyph).toHaveAttribute('data-prompt', 'keys');
	});

	it('auto switches to the gamepad glyph after pad input', async () => {
		renderGlyph('auto');
		setLastInputModality('pad');

		const glyph = page.getByText('Ⓐ');
		await expect.element(glyph).toHaveAttribute('data-prompt', 'pad');
	});
});
